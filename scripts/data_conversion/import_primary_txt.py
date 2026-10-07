"""Explicit, one-way import of committed primary TXT with a pinned preview.

Never pulls, commits, pushes, deletes corpus files, or writes to source repos.
See docs/primary-txt-import.md for the workflow and validation limits.
"""

from __future__ import annotations

import argparse
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid
import xml.etree.ElementTree as ET

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / "src"))

from coj.core.corpus import CorpusDocument
from coj.core.dictionary import Dictionary
from coj.xml.corpus_xml import corpus_to_xml, corpus_from_xml
from coj.xml.dictionary_xml import dictionary_to_xml, dictionary_from_xml
from coj.xml_format import canonical_xml, FORMAT_VERSION

MANIFEST = "data/primary-txt-import.json"
CACHE = ".primary-txt-import"
SCHEMA = 2


class ImportFailure(RuntimeError):
    """A failed safety check; do not apply the preview."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_line_endings(data: bytes) -> bytes:
    """Compare bytes with CRLF/CR mapped to LF; change nothing else."""
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


def file_digest(path: Path) -> str | None:
    if path.is_symlink():
        raise ImportFailure(f"Symbolic link is not a supported import target: {path}")
    return digest(path.read_bytes()) if path.is_file() else None


def destination(root: Path, relative: str) -> Path:
    """Constrain all writes, including preview paths, to the COJ checkout."""
    candidate = (root / relative).resolve()
    if not candidate.is_relative_to(root.resolve()) or candidate == root.resolve():
        raise ImportFailure(f"Path escapes COJ: {relative}")
    # Reject links even when they resolve inside COJ (including parent links).
    raw = root / relative
    if any(part.is_symlink() for part in (raw, *raw.parents) if part != root.parent):
        raise ImportFailure(f"Linked paths are not supported: {relative}")
    return candidate


def git(repo: Path, *args: str) -> bytes:
    result = subprocess.run(
        ["git", "-c", f"safe.directory={repo.resolve().as_posix()}",
         "-C", str(repo), *args], capture_output=True, check=False,
    )
    if result.returncode:
        raise ImportFailure(result.stderr.decode("utf-8", errors="replace").strip())
    return result.stdout


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def read_json(path: Path) -> dict | None:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def conversion_fingerprint(root: Path) -> str:
    files = sorted((root / "src/coj").rglob("*.py"))
    files += [root / "scripts/data_conversion/txt2xml.py",
              root / "scripts/data_conversion/import_primary_txt.py"]
    values = [(path.relative_to(root).as_posix(), file_digest(path)) for path in files]
    values.append(("python", f"{sys.version_info.major}.{sys.version_info.minor}"))
    return digest(json.dumps(values).encode("utf-8"))


def source_snapshot(source_root: Path) -> tuple[dict, dict]:
    repositories = {name: source_root / name for name in ("oncoj_source", "senmyo_norito_project")}
    sources = {}
    for name, repo in repositories.items():
        top = Path(git(repo, "rev-parse", "--show-toplevel").decode().strip()).resolve()
        if top != repo.resolve():
            raise ImportFailure(f"Expected a repository at {repo}, found {top}")
        sources[name] = {"path": str(repo.resolve()), "commit": git(repo, "rev-parse", "HEAD").decode().strip()}
    mappings = [
        ("oncoj_source", "trees", "data/txt/trees", "corpus"),
        ("senmyo_norito_project", "EN_SM_trees_table", "data/txt/text", "corpus"),
        ("oncoj_source", "saywopimye.txt", "data/txt/dict/dictionary.txt", "dictionary"),
    ]
    records = {}
    for name, prefix, target, kind in mappings:
        commit = sources[name]["commit"]
        tree = git(repositories[name], "ls-tree", "-r", "-z", commit, "--", prefix)
        found = 0
        for entry in tree.split(b"\0"):
            if not entry:
                continue
            info, filename = entry.split(b"\t", 1)
            source_path = filename.decode("utf-8")
            path = Path(source_path)
            if kind == "corpus" and (path.parent.as_posix() != prefix or path.suffix != ".txt"):
                continue
            if kind == "dictionary" and source_path != prefix:
                continue
            if info.split()[0] not in (b"100644", b"100755"):
                raise ImportFailure(f"Source must be a regular file: {source_path}")
            relative = f"{target}/{path.name}" if kind == "corpus" else target
            content = git(repositories[name], "show", f"{commit}:{source_path}")
            records[relative] = {"repository": name, "source_path": source_path,
                                 "source_sha256": digest(content), "kind": kind, "content": content}
            found += 1
        if not found:
            raise ImportFailure(f"No committed input files found at {name}/{prefix}")
    return sources, records


def managed_path(relative: str) -> bool:
    path = Path(relative)
    return (relative in (MANIFEST, "data/txt/dict/dictionary.txt", "data/xml/dict/dictionary.xml")
            or (path.parent.as_posix() in ("data/txt/trees", "data/txt/text") and path.suffix == ".txt")
            or normalization_path(relative))


def normalization_path(relative: str) -> bool:
    path = Path(relative)
    return path.parts[:2] == ("data", "xml") and ".." not in path.parts and path.suffix == ".xml"


def xml_target(relative: str) -> str:
    return relative.replace("data/txt/", "data/xml/", 1)[:-4] + ".xml"


def local_conflicts(root: Path, targets: set[str], baseline: dict | None) -> list[str]:
    conflicts = []
    # Scope to data only. Unrelated worktree edits do not prevent importing.
    dirty = git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "data")
    for item in dirty.split(b"\0"):
        if not item:
            continue
        # Renames also include the original path as a separate NUL record.
        relative = item[3:].decode("utf-8") if len(item) > 2 and item[2:3] == b" " else item.decode("utf-8")
        if managed_path(relative):
            conflicts.append(f"Uncommitted managed file: {relative}")
    if baseline:
        for relative, record in baseline["files"].items():
            if not managed_path(relative) or not managed_path(record["xml_path"]):
                raise ImportFailure("Invalid managed path in import manifest")
            for target, expected in ((relative, record["txt_sha256"]),
                                     (record["xml_path"], record["xml_sha256"])):
                if file_digest(destination(root, target)) != expected:
                    conflicts.append(f"Local change since last import (even if committed): {target}")
    return sorted(set(conflicts))


def convert(relative: str, content: bytes, kind: str) -> tuple[bytes, dict, list[str]]:
    # Match from_file's universal-newline reading; preserve the original TXT bytes separately.
    text = content.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
    warnings = []
    if kind == "dictionary":
        model = Dictionary.from_text(text)
        xml = dictionary_to_xml(model)
        restored = dictionary_from_xml(xml)
        ids = re.findall(r"^===\s+(\S+)", text, flags=re.MULTILINE)
        duplicates = [identifier for identifier, count in Counter(ids).items() if count > 1]
        if duplicates:
            warnings.append(f"{relative}: duplicate dictionary IDs use existing parser behavior: {', '.join(duplicates)}")
        if len(ids) != len(model):
            warnings.append(f"{relative}: {len(ids)} source entry headings, {len(model)} parsed entries; inspect existing parser limitations")
        count = len(model)
        expected_root = "dictionary"
    else:
        model = CorpusDocument.from_text(text, filename=Path(relative).name)
        xml = corpus_to_xml(model)
        restored = corpus_from_xml(xml)
        count = len(model)
        expected_root = "document"
    if not count or len(restored) != count or ET.fromstring(xml).tag != expected_root:
        raise ImportFailure(f"Conversion validation failed: {relative}")
    return xml.encode("utf-8"), {"kind": kind, "parsed_units": count,
                                  "validation": "UTF-8, nonempty model, XML parsing, XML-model count"}, warnings


def ensure_no_interrupted_apply(root: Path) -> None:
    journal = read_json(destination(root, f"{CACHE}/transaction.json"))
    if journal and journal["status"] not in ("complete", "rolled_back"):
        raise ImportFailure(f"An interrupted/failed apply needs recovery. See {CACHE}/transaction.json and its backup files; do not retry blindly.")


@contextmanager
def exclusive_import(root: Path):
    lock = destination(root, f"{CACHE}/import.lock")
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = lock.open("x", encoding="utf-8")
    except FileExistsError as error:
        raise ImportFailure(f"Another import is running, or a stale lock needs inspection: {lock}") from error
    try:
        with handle:
            handle.write(f"pid={os.getpid()}\n")
        yield
    finally:
        lock.unlink(missing_ok=True)


def preview(root: Path, source_root: Path, *, normalize_xml=False) -> dict:
    with exclusive_import(root):
        # A failed new preview must not leave an older preview available to apply.
        destination(root, f"{CACHE}/preview.json").unlink(missing_ok=True)
        return _preview(root, source_root, normalize_xml=normalize_xml)


def _preview(root: Path, source_root: Path, *, normalize_xml=False) -> dict:
    root = root.resolve()
    ensure_no_interrupted_apply(root)
    sources, inputs = source_snapshot(source_root)
    baseline_path = destination(root, MANIFEST)
    baseline = read_json(baseline_path)
    if baseline and baseline.get("schema") not in (1, SCHEMA):
        raise ImportFailure("Unsupported import manifest schema")
    fingerprint = conversion_fingerprint(root)
    regenerated_all = baseline is None or baseline["converter_sha256"] != fingerprint
    targets = set(inputs) | {xml_target(relative) for relative in inputs}
    previous = set(baseline["files"]) if baseline else set()
    existing = set()
    for folder, suffix in (("txt/trees", ".txt"), ("txt/text", ".txt"),
                           ("xml/trees", ".xml"), ("xml/text", ".xml")):
        existing.update(path.relative_to(root).as_posix() for path in (root / "data" / folder).glob(f"*{suffix}"))
    removed = sorted((previous - set(inputs)) | (existing - targets))
    conflicts = local_conflicts(root, targets, baseline)
    blockers = conflicts + [f"Deletion decision required; no files will be deleted: {path}" for path in removed]
    preview_id = uuid.uuid4().hex
    stage = destination(root, f"{CACHE}/previews/{preview_id}")
    stage.mkdir(parents=True)
    plan = {"schema": SCHEMA, "id": preview_id, "created_at": timestamp(), "coj_root": str(root),
            "sources": sources, "converter_sha256": fingerprint,
            "baseline_sha256": file_digest(baseline_path), "full_xml_regeneration": regenerated_all,
            "blockers": blockers, "warnings": [], "files": {}, "writes": [], "expected": {},
            "removed": removed, "normalization": None}
    for relative in sorted(targets | previous | {MANIFEST}):
        plan["expected"][relative] = file_digest(destination(root, relative))
    for relative, source in sorted(inputs.items()):
        prior = baseline["files"].get(relative) if baseline else None
        changed = prior is None or prior["source_sha256"] != source["source_sha256"]
        xml_path = xml_target(relative)
        xml_bytes = None
        validation = prior.get("validation") if prior else None
        warnings = prior.get("warnings", []) if prior else []
        try:
            if changed or regenerated_all:
                xml_bytes, validation, warnings = convert(relative, source["content"], source["kind"])
        except (ValueError, UnicodeError, ET.ParseError, ImportFailure) as error:
            plan["blockers"].append(f"Conversion failed for {relative}: {error}")
        existing_xml = destination(root, xml_path)
        line_endings_only = False
        formatting_only = False
        if xml_bytes is not None and plan["expected"][xml_path] is not None:
            existing_bytes = existing_xml.read_bytes()
            line_endings_only = (existing_bytes != xml_bytes
                                and normalize_line_endings(existing_bytes) == normalize_line_endings(xml_bytes))
            if normalize_xml:
                try:
                    formatting_only = existing_bytes != xml_bytes and canonical_xml(existing_bytes) == xml_bytes
                except ValueError as error:
                    plan["blockers"].append(f"Existing XML cannot be safely compared: {xml_path}: {error}")
        retain_xml = line_endings_only or formatting_only
        record = {key: value for key, value in source.items() if key != "content"}
        record.update({"xml_path": xml_path, "txt_sha256": source["source_sha256"],
                       "xml_sha256": (digest(existing_bytes) if retain_xml else digest(xml_bytes))
                       if xml_bytes is not None else (prior["xml_sha256"] if prior else None),
                       "generated_xml_sha256": digest(xml_bytes) if xml_bytes is not None else (prior.get("generated_xml_sha256") if prior else None),
                       "xml_normalized_sha256": digest(normalize_line_endings(xml_bytes)) if xml_bytes is not None else (prior.get("xml_normalized_sha256") if prior else None),
                       "xml_line_endings_only": line_endings_only,
                       "xml_formatting_only": formatting_only,
                       "validation": validation, "warnings": warnings,
                       "action": "added" if prior is None else "changed" if changed else "unchanged",
                       "xml_regenerated": xml_bytes is not None})
        plan["warnings"].extend(warnings)
        plan["files"][relative] = record
        for target, content in ((relative, source["content"]), (xml_path, xml_bytes)):
            if target == xml_path and retain_xml:
                continue
            if content is not None and digest(content) != plan["expected"].get(target):
                payload = f"{CACHE}/previews/{preview_id}/{len(plan['writes'])}.payload"
                destination(root, payload).write_bytes(content)
                plan["writes"].append({"target": target, "payload": payload, "sha256": digest(content)})
    for record in plan["files"].values():
        record["xml_import_sha256"] = record["xml_sha256"]
    if normalize_xml:
        prepare_normalization(root, plan)
    write_json(destination(root, f"{CACHE}/preview.json"), plan)
    destination(root, f"{CACHE}/preview.txt").write_text(summary(plan) + "\n", encoding="utf-8")
    return plan


def prepare_normalization(root: Path, plan: dict) -> None:
    """Preview formatting on the virtual post-import state, never current data writes."""
    inventory = sorted(path.relative_to(root).as_posix() for path in (root / "data/xml").rglob("*.xml"))
    virtual = {record["target"]: record for record in plan["writes"] if record["target"].endswith(".xml")}
    scope = sorted(set(inventory) | {record["xml_path"] for record in plan["files"].values()})
    normalization = {"format": FORMAT_VERSION, "scope": "data/xml/**/*.xml", "inventory_before": inventory,
                     "files": {}, "writes": [], "semantics_verified": 0}
    plan["normalization"] = normalization
    by_xml = {record["xml_path"]: record for record in plan["files"].values()}
    for relative in scope:
        path = destination(root, relative)
        plan["expected"].setdefault(relative, file_digest(path))
        content = destination(root, virtual[relative]["payload"]).read_bytes() if relative in virtual else path.read_bytes()
        try:
            normalized = canonical_xml(content)
        except ValueError as error:
            plan["blockers"].append(f"Normalization failed: {relative}: {error}")
            continue
        normalization["semantics_verified"] += 1
        normalization["files"][relative] = {"before_sha256": digest(content), "sha256": digest(normalized),
                                               "changed": content != normalized}
        if relative in by_xml:
            by_xml[relative]["xml_sha256"] = digest(normalized)
            by_xml[relative]["xml_normalized_sha256"] = digest(normalized)
        if normalized != content:
            payload = f"{CACHE}/previews/{plan['id']}/normalization-{len(normalization['writes'])}.payload"
            destination(root, payload).write_bytes(normalized)
            normalization["writes"].append({"target": relative, "payload": payload, "sha256": digest(normalized)})


def summary(plan: dict) -> str:
    counts = Counter(record["action"] for record in plan["files"].values())
    lines = [f"Preview {plan['id']} ({plan['created_at']})", "No corpus/dictionary files have been replaced.",
             "STEP 1: Source TXT and genuine XML content import" if plan["normalization"] else "Source TXT/XML import"]
    lines += [f"Source {name}: {record['commit']}" for name, record in plan["sources"].items()]
    lines += [f"Source files: {dict(counts)}",
              f"XML conversions: {sum(record['xml_regenerated'] for record in plan['files'].values())}",
              f"Data files requiring replacement: {len(plan['writes'])}",
              f"  TXT: {sum(record['target'].endswith('.txt') for record in plan['writes'])}; XML: {sum(record['target'].endswith('.xml') for record in plan['writes'])}",
              f"XML retained (line endings only; otherwise byte-equivalent): {sum(record['xml_line_endings_only'] for record in plan['files'].values())}",
              f"XML formatting-only changes deferred to normalization: {sum(record['xml_formatting_only'] for record in plan['files'].values())}",
              "Full XML regeneration preview: " + str(plan["full_xml_regeneration"]),
              "Validation does NOT establish linguistic correctness or complete semantic losslessness."]
    lines += ["BLOCKED: " + message for message in plan["blockers"]]
    lines += ["WARNING: " + message for message in plan["warnings"]]
    lines += [f"{record['action']:9} {relative}" + (" [XML regenerated]" if record["xml_regenerated"] else "")
              for relative, record in plan["files"].items()]
    lines += ["Replace: " + record["target"] for record in plan["writes"]]
    lines += ["Retain XML (line endings only): " + record["xml_path"]
              for record in plan["files"].values() if record["xml_line_endings_only"]]
    if plan["normalization"]:
        normalization = plan["normalization"]
        lines += ["STEP 2: Full-corpus XML normalization after genuine content import",
                  f"Scope: {normalization['scope']}; XML files examined: {len(normalization['files'])}",
                  f"Additional normalization replacements: {len(normalization['writes'])}",
                  f"Parsed content/order preservation verified: {normalization['semantics_verified']}"]
        lines += ["Normalize: " + record["target"] for record in normalization["writes"]]
    lines += [f"Review {CACHE}/preview.txt and {CACHE}/preview.json before --apply."]
    return "\n".join(lines)


def apply(root: Path) -> dict:
    with exclusive_import(root):
        return _apply(root)


def _apply(root: Path) -> dict:
    root = root.resolve()
    ensure_no_interrupted_apply(root)
    plan = read_json(destination(root, f"{CACHE}/preview.json"))
    if not plan or plan.get("schema") != SCHEMA or plan.get("coj_root") != str(root):
        raise ImportFailure("No valid preview for this checkout; run --preview first")
    if plan["blockers"]:
        raise ImportFailure("Preview is blocked; resolve its reported issues and preview again")
    if plan["converter_sha256"] != conversion_fingerprint(root):
        raise ImportFailure("Conversion code changed; preview again (full XML regeneration required)")
    for record in plan["sources"].values():
        if git(Path(record["path"]), "rev-parse", "HEAD").decode().strip() != record["commit"]:
            raise ImportFailure("Source commit changed since preview; preview again")
    baseline = read_json(destination(root, MANIFEST))
    conflicts = local_conflicts(root, set(plan["expected"]), baseline)
    if conflicts:
        raise ImportFailure("\n".join(conflicts))
    # Detect additions/removals too, not only changes to files listed in the preview.
    sources, inputs = source_snapshot(Path(next(iter(plan["sources"].values()))["path"]).parent)
    if sources != plan["sources"] or set(inputs) != set(plan["files"]):
        raise ImportFailure("Source inventory changed; preview again")
    for relative, expected in plan["expected"].items():
        if not managed_path(relative) or file_digest(destination(root, relative)) != expected:
            raise ImportFailure(f"COJ changed since preview: {relative}; preview again")
    targets = set(inputs) | {xml_target(relative) for relative in inputs}
    for folder, suffix in (("txt/trees", ".txt"), ("txt/text", ".txt"),
                           ("xml/trees", ".xml"), ("xml/text", ".xml")):
        for path in (root / "data" / folder).glob(f"*{suffix}"):
            if path.relative_to(root).as_posix() not in targets:
                raise ImportFailure(f"New unmanaged corpus file since preview: {path}; preview again")
    normalization = plan["normalization"]
    if normalization:
        inventory = sorted(path.relative_to(root).as_posix() for path in (root / "data/xml").rglob("*.xml"))
        if inventory != normalization["inventory_before"]:
            raise ImportFailure("XML normalization inventory changed since preview; preview again")
    payloads = {}
    output_hashes = {relative: record["txt_sha256"] for relative, record in plan["files"].items()}
    output_hashes.update({record["xml_path"]: record["xml_import_sha256"] for record in plan["files"].values()})
    for record in plan["writes"]:
        if record["target"] not in output_hashes or not record["payload"].startswith(f"{CACHE}/previews/{plan['id']}/"):
            raise ImportFailure("Invalid preview payload/target path")
        content = destination(root, record["payload"]).read_bytes()
        if digest(content) != record["sha256"] or record["sha256"] != output_hashes[record["target"]]:
            raise ImportFailure("Staged content changed; preview again")
        payloads[record["target"]] = content
    operations = list(payloads.items())
    if normalization:
        for target, record in normalization["files"].items():
            if not normalization_path(target):
                raise ImportFailure("Normalization target outside data/xml")
            intermediate = digest(payloads[target]) if target in payloads else plan["expected"][target]
            if intermediate != record["before_sha256"]:
                raise ImportFailure("Normalization does not match post-import state; preview again")
        for record in normalization["writes"]:
            target = record["target"]
            if target not in normalization["files"] or not record["payload"].startswith(f"{CACHE}/previews/{plan['id']}/"):
                raise ImportFailure("Invalid normalization payload/target")
            content = destination(root, record["payload"]).read_bytes()
            if digest(content) != record["sha256"] or record["sha256"] != normalization["files"][target]["sha256"]:
                raise ImportFailure("Staged normalization changed; preview again")
            operations.append((target, content))
            payloads[target] = content
    manifest = {"schema": SCHEMA, "imported_at": timestamp(), "preview_id": plan["id"],
                "sources": plan["sources"], "converter_sha256": plan["converter_sha256"],
                "warnings": plan["warnings"], "files": plan["files"]}
    if normalization:
        manifest["normalization"] = normalization
    existing = read_json(destination(root, MANIFEST))
    if (existing and not payloads and existing["sources"] == manifest["sources"]
            and existing["converter_sha256"] == manifest["converter_sha256"]
            and (not normalization or existing.get("normalization", {}).get("format") == FORMAT_VERSION)):
        return {"replaced": 0, "manifest_updated": False}
    payloads[MANIFEST] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    operations.append((MANIFEST, payloads[MANIFEST]))
    backup_dir = destination(root, f"{CACHE}/backups/{uuid.uuid4().hex}")
    backup_dir.mkdir(parents=True)
    journal_path = destination(root, f"{CACHE}/transaction.json")
    journal = {"status": "preparing", "preview_id": plan["id"], "files": []}
    for index, target in enumerate(payloads):
        original = destination(root, target)
        backup = backup_dir / f"{index}.backup"
        content = original.read_bytes() if original.exists() else None
        if content is not None:
            backup.write_bytes(content)
        journal["files"].append({"target": target, "backup": backup.relative_to(root).as_posix() if content is not None else None})
    journal["status"] = "applying"
    write_json(journal_path, journal)
    attempted = []
    expected_runtime = dict(plan["expected"])
    try:
        for target, content in operations:
            path = destination(root, target)
            if file_digest(path) != expected_runtime[target]:
                raise ImportFailure(f"COJ changed during apply: {target}; application stopped")
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = backup_dir / "replacement.tmp"
            temporary.write_bytes(content)
            attempted.append(target)
            os.replace(temporary, path)
            expected_runtime[target] = digest(content)
        journal["status"] = "complete"
        write_json(journal_path, journal)
    except BaseException:
        try:
            for record in reversed(journal["files"]):
                if record["target"] not in attempted:
                    continue
                path = destination(root, record["target"])
                if record["backup"] is None:
                    path.unlink(missing_ok=True)
                else:
                    temporary = backup_dir / "restore.tmp"
                    temporary.write_bytes(destination(root, record["backup"]).read_bytes())
                    os.replace(temporary, path)
            journal["status"] = "rolled_back"
            write_json(journal_path, journal)
        except BaseException:
            # Keep the applying journal and backups for explicit manual recovery.
            pass
        raise
    return {"replaced": len(payloads) - 1, "manifest_updated": True}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--preview", action="store_true")
    operation.add_argument("--apply", action="store_true")
    parser.add_argument("--normalize-xml", action="store_true",
                        help="Preview step 2: canonicalize all data/xml files on the post-import state")
    parser.add_argument("--source-root", type=Path, default=Path("D:/Lanxin/Desktop/ONCOJ"))
    args = parser.parse_args()
    if args.normalize_xml and args.apply:
        parser.error("Use --normalize-xml with --preview; --apply follows the exact saved preview")
    try:
        if args.preview:
            plan = preview(PROJECT, args.source_root, normalize_xml=args.normalize_xml)
            print(summary(plan))
            return 2 if plan["blockers"] else 0
        print(json.dumps(apply(PROJECT), indent=2))
        return 0
    except (ImportFailure, OSError, ValueError) as error:
        print(f"Import stopped: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
