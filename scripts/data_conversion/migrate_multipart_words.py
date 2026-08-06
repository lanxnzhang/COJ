"""Migrate historical multi-line words to one syntax node with form parts.

The historical comma-path convention represents a word written in multiple
scripts as consecutive lines with the exact same syntax path and lemma ID.
This script verifies that each existing XML document is semantically identical
to its TXT source before replacing only affected XML files.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from coj.core.corpus import CorpusDocument, CorpusLine, _canonical_sentence_id


REPOSITORY = Path(__file__).resolve().parents[2]
DATA = REPOSITORY / "data"
DEFAULT_REPORT = REPOSITORY / "reports" / "multipart_words.md"


@dataclass(frozen=True)
class MultipartWord:
    source: str
    document_id: str
    passage_id: str
    source_passage_id: str
    lemma: str
    form: str
    lines: tuple[str, ...]


def _groups(lines: list[CorpusLine]) -> list[list[CorpusLine]]:
    groups = []
    index = 0
    while index < len(lines):
        first = lines[index]
        lemma = str(first.lemma_id) if first.lemma_id else ""
        path = tuple(first.synt_path)
        run = []
        while index < len(lines):
            candidate = lines[index]
            candidate_lemma = (
                str(candidate.lemma_id) if candidate.lemma_id else ""
            )
            if tuple(candidate.synt_path) != path or candidate_lemma != lemma:
                break
            run.append(candidate)
            index += 1
        phon_tags = {line.phon_tag for line in run if line.phon_tag}
        if lemma and len(run) > 1 and len(phon_tags) > 1:
            groups.append(run)
    return groups


def discover() -> tuple[list[MultipartWord], dict[Path, CorpusDocument]]:
    words = []
    affected_documents = {}
    for source in ("text", "trees"):
        for txt_path in sorted((DATA / "txt" / source).glob("*.txt")):
            document = CorpusDocument.from_file(str(txt_path))
            document_words = []
            for utterance in document.utterances:
                source_id = utterance.sentence_id or "(missing ID)"
                passage_id = _canonical_sentence_id(source_id)
                for group in _groups(utterance.corpus_lines()):
                    document_words.append(MultipartWord(
                        source=source,
                        document_id=txt_path.stem,
                        passage_id=passage_id,
                        source_passage_id=source_id,
                        lemma=str(group[0].lemma_id),
                        form="".join(line.word_form or "" for line in group),
                        lines=tuple(line.to_text() for line in group),
                    ))
            if document_words:
                words.extend(document_words)
                affected_documents[
                    DATA / "xml" / source / f"{txt_path.stem}.xml"
                ] = document
    return words, affected_documents


def write_report(words: list[MultipartWord], report_path: Path) -> None:
    passages = {
        (word.source, word.document_id, word.passage_id) for word in words
    }
    documents = {(word.source, word.document_id) for word in words}
    component_lines = sum(len(word.lines) for word in words)
    lines = [
        "# Multipart-word migration report",
        "",
        "This report records every historical TXT word represented by consecutive "
        "identical syntax paths and lemma IDs with different script tags.",
        "",
        f"- Modified words: **{len(words):,}**",
        f"- Original component lines: **{component_lines:,}**",
        f"- Text passages containing modifications: **{len(passages):,}**",
        f"- Documents containing modifications: **{len(documents):,}**",
        "",
        "## Original TXT content by text ID",
        "",
    ]
    current = None
    for word in words:
        key = (word.source, word.document_id, word.passage_id)
        if key != current:
            if current is not None:
                lines.append("")
            lines.extend([
                f"### {word.passage_id}",
                "",
                f"Source: `{word.source}/{word.document_id}.txt`; "
                f"historical ID: `{word.source_passage_id}`",
                "",
            ])
            current = key
        lines.extend([
            f"- Combined word: `{word.form}`; lemma: `{word.lemma}`",
            "",
            "```txt",
            *word.lines,
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
        temporary = xml_path.with_name(f".{xml_path.stem}.multipart.xml")
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

    words, documents = discover()
    if args.apply:
        migrate(documents)
    write_report(words, args.report)
    action = "Migrated" if args.apply else "Found"
    print(
        f"{action} {len(words):,} multipart words in "
        f"{len(documents):,} documents; report: {args.report}"
    )


if __name__ == "__main__":
    main()
