"""Restore syntax boundaries encoded by historical TXT kanji markers.

A marker such as ``CP-FINAL,5@... ,*`` ends the current child below
``CP-FINAL``.  If the next child has the same tag as the preceding child, that
boundary is otherwise lost when the marker is excluded from the XML syntax
tree.  This utility audits those cases and safely regenerates affected XML.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from coj.core.corpus import (
    CommentLine,
    CorpusDocument,
    CorpusLine,
    _canonical_sentence_id,
    _kanji_marker_parent_path,
    _node_key,
)


REPOSITORY = Path(__file__).resolve().parents[2]
DATA = REPOSITORY / "data"
DEFAULT_REPORT = REPOSITORY / "reports" / "kanji_marker_boundaries.md"


@dataclass(frozen=True)
class BoundaryCorrection:
    source: str
    document_id: str
    passage_id: str
    source_passage_id: str
    parent_path: tuple[str, ...]
    child_tag: str
    marker: str
    line_positions: tuple[int, ...]
    lines: tuple[str, ...]


def _utterance_boundaries(
    source: str,
    document_id: str,
    utterance,
) -> list[BoundaryCorrection]:
    corpus_lines: list[CorpusLine] = []
    boundaries: dict[int, list[tuple[tuple[str, ...], str]]] = {}
    pending: list[tuple[tuple[str, ...], str]] = []
    for line in utterance.lines:
        if isinstance(line, CommentLine):
            parent_path = _kanji_marker_parent_path(line.raw)
            if parent_path is not None:
                pending.append((parent_path, line.raw))
        elif isinstance(line, CorpusLine):
            if pending:
                boundaries[len(corpus_lines)] = list(pending)
                pending.clear()
            corpus_lines.append(line)

    source_id = utterance.sentence_id or "(missing ID)"
    passage_id = _canonical_sentence_id(source_id)
    corrections = []
    for position, markers in boundaries.items():
        if position == 0:
            continue
        current = corpus_lines[position]
        previous = corpus_lines[position - 1]
        current_path = tuple(current.synt_path)
        previous_path = tuple(previous.synt_path)
        for parent_path, marker in markers:
            depth = len(parent_path)
            if (
                len(current_path) <= depth
                or len(previous_path) <= depth
                or current_path[:depth] != parent_path
                or previous_path[:depth] != parent_path
                or _node_key(current, depth) != _node_key(previous, depth)
            ):
                continue

            child_key = _node_key(current, depth)
            end = position
            while end < len(corpus_lines):
                candidate = corpus_lines[end]
                candidate_path = tuple(candidate.synt_path)
                if end > position and any(
                    boundary_path == parent_path
                    for boundary_path, _ in boundaries.get(end, [])
                ):
                    break
                if (
                    len(candidate_path) <= depth
                    or candidate_path[:depth] != parent_path
                    or _node_key(candidate, depth) != child_key
                ):
                    break
                end += 1
            run = corpus_lines[position:end]
            corrections.append(BoundaryCorrection(
                source=source,
                document_id=document_id,
                passage_id=passage_id,
                source_passage_id=source_id,
                parent_path=parent_path,
                child_tag=child_key[0],
                marker=marker,
                line_positions=tuple(range(position, end)),
                lines=tuple(line.to_text() for line in run),
            ))
    return corrections


def discover() -> tuple[list[BoundaryCorrection], dict[Path, CorpusDocument]]:
    corrections = []
    affected_documents = {}
    for source in ("text", "trees"):
        for txt_path in sorted((DATA / "txt" / source).glob("*.txt")):
            document = CorpusDocument.from_file(str(txt_path))
            document_corrections = [
                correction
                for utterance in document.utterances
                for correction in _utterance_boundaries(
                    source, txt_path.stem, utterance
                )
            ]
            if document_corrections:
                corrections.extend(document_corrections)
                affected_documents[
                    DATA / "xml" / source / f"{txt_path.stem}.xml"
                ] = document
    return corrections, affected_documents


def write_report(
    corrections: list[BoundaryCorrection], report_path: Path
) -> None:
    modified_lines = {
        (
            correction.source,
            correction.document_id,
            correction.passage_id,
            position,
        )
        for correction in corrections
        for position in correction.line_positions
    }
    passages = {
        (item.source, item.document_id, item.passage_id)
        for item in corrections
    }
    documents = {
        (item.source, item.document_id) for item in corrections
    }
    lines = [
        "# Kanji-marker syntax-boundary migration report",
        "",
        "This report records repeated child constituents that were merged when "
        "kanji marker lines were removed from the XML syntax hierarchy.",
        "",
        f"- Restored constituent boundaries: **{len(corrections):,}**",
        f"- Modified original TXT annotation lines: **{len(modified_lines):,}**",
        f"- Text passages containing modifications: **{len(passages):,}**",
        f"- Documents containing modifications: **{len(documents):,}**",
        "",
        "The modified-line count is unique by source document, passage, and "
        "corpus-line position. Marker lines are shown for context but are not "
        "included in that count.",
        "",
        "## Original TXT content by text ID",
        "",
    ]
    current = None
    boundary_number = 0
    for correction in corrections:
        key = (
            correction.source,
            correction.document_id,
            correction.passage_id,
        )
        if key != current:
            boundary_number = 0
            if current is not None:
                lines.append("")
            lines.extend([
                f"### {correction.passage_id}",
                "",
                f"Source: `{correction.source}/{correction.document_id}.txt`; "
                f"historical ID: `{correction.source_passage_id}`",
                "",
            ])
            current = key
        boundary_number += 1
        parent = ",".join(correction.parent_path) or "(document root)"
        lines.extend([
            f"#### Boundary {boundary_number}: `{parent}` → "
            f"`{correction.child_tag}`",
            "",
            "```txt",
            correction.marker,
            *correction.lines,
            "```",
            "",
        ])
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def migrate(documents: dict[Path, CorpusDocument]) -> None:
    for xml_path, txt_document in documents.items():
        if not xml_path.exists():
            raise FileNotFoundError(f"Missing XML counterpart: {xml_path}")
        current_xml = CorpusDocument.from_file(str(xml_path))
        if current_xml.to_text() != txt_document.to_text():
            raise RuntimeError(
                f"Refusing to replace {xml_path}: its semantic TXT export "
                "differs from the historical TXT source"
            )
        temporary = xml_path.with_name(f".{xml_path.stem}.kanji-boundaries.xml")
        txt_document.to_file(str(temporary))
        migrated = CorpusDocument.from_file(str(temporary))
        if migrated.to_text() != txt_document.to_text():
            temporary.unlink(missing_ok=True)
            raise RuntimeError(f"Round-trip validation failed for {xml_path}")
        temporary.replace(xml_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply", action="store_true",
        help="replace semantically matching XML files after validation",
    )
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    corrections, documents = discover()
    if args.apply:
        migrate(documents)
    write_report(corrections, args.report)
    action = "Migrated" if args.apply else "Found"
    modified_lines = len({
        (item.source, item.document_id, item.passage_id, position)
        for item in corrections
        for position in item.line_positions
    })
    print(
        f"{action} {len(corrections):,} boundaries affecting "
        f"{modified_lines:,} TXT lines in {len(documents):,} documents; "
        f"report: {args.report}"
    )


if __name__ == "__main__":
    main()
