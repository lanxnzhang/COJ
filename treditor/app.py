from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

ROOT = Path(__file__).resolve().parents[1]
DATA_XML = ROOT / "data" / "xml"
DICT_PATH = DATA_XML / "dict" / "dictionary.xml"
sys.path.insert(0, str(ROOT / "src"))

from coj.core.corpus import CorpusDocument, _utterance_to_elem
from coj.core.dictionary import Dictionary

app = Flask(__name__)

DOCUMENT_SOURCES = {
    "text": {
        "label": "Texts under editing",
        "description": "Current editable corpus documents",
        "directory": DATA_XML / "text",
    },
    "trees": {
        "label": "Uploaded trees",
        "description": "Current uploaded syntax-tree documents",
        "directory": DATA_XML / "trees",
    },
}

_dictionary: Dictionary | None = None
_documents: dict[tuple[str, str], CorpusDocument] = {}
_search_index: list[dict] | None = None


@app.errorhandler(HTTPException)
def json_http_error(error: HTTPException):
    return jsonify({"error": error.description}), error.code


def get_dictionary() -> Dictionary:
    global _dictionary
    if _dictionary is None:
        _dictionary = Dictionary.from_file(str(DICT_PATH))
    return _dictionary


def _document_path(source: str, doc_id: str) -> Path:
    config = DOCUMENT_SOURCES.get(source)
    if config is None or not re.fullmatch(r"[A-Za-z0-9_-]+", doc_id):
        abort(404, description="Document not found")
    path = config["directory"] / f"{doc_id}.xml"
    if not path.is_file():
        abort(404, description=f"Document '{source}/{doc_id}' not found")
    return path


def get_document(source: str, doc_id: str) -> CorpusDocument:
    key = (source, doc_id)
    if key not in _documents:
        _documents[key] = CorpusDocument.from_file(
            str(_document_path(source, doc_id))
        )
    return _documents[key]


def _sort_key(doc_id: str) -> tuple[str, int, str]:
    match = re.match(r"^([A-Z]+)_?(\d*)$", doc_id)
    if match:
        return (
            match.group(1),
            int(match.group(2)) if match.group(2) else 0,
            doc_id,
        )
    return (doc_id, 0, doc_id)


def _document_summary(
    source: str, path: Path, root: ET.Element | None = None
) -> dict:
    root = root if root is not None else ET.parse(path).getroot()
    blocks = root.findall("block")
    collection = path.stem.split("_", 1)[0]
    return {
        "id": f"{source}/{path.stem}",
        "source": source,
        "document_id": path.stem,
        "label": path.stem.replace("_", " "),
        "collection": collection,
        "utterance_count": len(blocks),
        "filename": root.get("filename", path.name),
    }


def find_poem_location(sentence_id: str) -> dict | None:
    """Find an exact poem ID using the repository's document naming scheme."""
    match = re.match(r"^([A-Za-z]+)\.(\d+)(?:\.|$)", sentence_id)
    if match is None:
        return None
    prefix = match.group(1).upper()
    number = int(match.group(2))
    document_ids = (f"{prefix}_{number:02d}", prefix)
    for source, config in DOCUMENT_SOURCES.items():
        for document_id in document_ids:
            path = config["directory"] / f"{document_id}.xml"
            if not path.is_file():
                continue
            root = ET.parse(path).getroot()
            for block in root.findall("block"):
                canonical_id = (block.get("id") or "").strip()
                if canonical_id.casefold() == match.string.casefold():
                    return {
                        **_document_summary(source, path, root),
                        "sentence_id": canonical_id,
                    }
    return None


def _searchable_passages() -> list[dict]:
    """Build a reusable index of the text exposed by every corpus passage."""
    global _search_index
    if _search_index is not None:
        return _search_index

    passages = []
    for source, config in DOCUMENT_SOURCES.items():
        paths = sorted(
            config["directory"].glob("*.xml"),
            key=lambda item: _sort_key(item.stem),
        )
        for path in paths:
            root = ET.parse(path).getroot()
            document = _document_summary(source, path, root)
            for block in root.findall("block"):
                sentence_id = (block.get("id") or "").strip()
                header = (block.get("header") or "").strip()
                text_parts = [header]
                preview_parts = []
                raw_text = block.find("raw-text")
                if raw_text is not None:
                    for sentence in raw_text.findall("sentence"):
                        kanji = (sentence.findtext("kanji", "") or "").strip()
                        transcription = (
                            sentence.findtext("transcription", "") or ""
                        ).strip()
                        text_parts.extend((kanji, transcription))
                        preview_parts.extend(
                            part for part in (kanji, transcription) if part
                        )
                text_parts.extend(
                    form
                    for elem in block.iter()
                    if (form := (elem.get("form") or "").strip())
                )
                searchable = " ".join(part for part in text_parts if part)
                passages.append({
                    **document,
                    "sentence_id": sentence_id,
                    "header": header,
                    "preview": " · ".join(preview_parts) or header,
                    "_searchable": searchable.casefold(),
                })

    _search_index = passages
    return passages


def _search_preview(preview: str, query: str, limit: int = 220) -> str:
    """Return a compact passage preview centered around the first match."""
    if len(preview) <= limit:
        return preview
    position = preview.casefold().find(query.casefold())
    if position < 0:
        return preview[: limit - 1].rstrip() + "…"
    start = max(0, position - limit // 3)
    end = min(len(preview), start + limit)
    start = max(0, end - limit)
    return (
        ("…" if start else "")
        + preview[start:end].strip()
        + ("…" if end < len(preview) else "")
    )


def _block_raw_text(
    block: ET.Element, corpus_lines: list | None = None
) -> list[dict]:
    raw_text = block.find("raw-text")
    if raw_text is None:
        return []
    leaf_tokens = [
        {
            "text": line.word_form or "",
            "phon": line.phon_tag or "",
            "lemma": str(line.lemma_id) if line.lemma_id else "",
        }
        for line in (corpus_lines or [])
        if line.word_form
    ]
    token_index = 0
    sentences = []
    for index, sentence in enumerate(raw_text.findall("sentence"), 1):
        transcription = sentence.findtext("transcription", "")
        tokens = []
        for word in transcription.split():
            source = (
                leaf_tokens[token_index]
                if token_index < len(leaf_tokens) else {}
            )
            tokens.append({
                "text": word,
                "phon": source.get("phon", ""),
                "lemma": source.get("lemma", ""),
            })
            token_index += 1
        sentences.append({
            "number": sentence.get("n", str(index)),
            "kanji": sentence.findtext("kanji", ""),
            "transcription": transcription,
            "tokens": tokens,
        })
    return sentences


def _elem_to_node(elem: ET.Element) -> dict:
    """Convert a current corpus XML element to the tree renderer payload."""
    children = [
        child
        for child in elem
        if child.tag not in {"comment", "roundtrip-data", "raw-text"}
    ]
    node = {"tag": elem.get("raw_tag") or elem.tag}
    if elem.get("lemma"):
        node["lemma"] = elem.get("lemma")
    if children:
        node["children"] = [_elem_to_node(child) for child in children]
    else:
        node["form"] = elem.get("form", "")
        node["phon"] = elem.get("phon", "")
    return node


def _tree_stats(roots: list[dict]) -> dict[str, int]:
    nodes = leaves = 0

    def visit(node: dict) -> None:
        nonlocal nodes, leaves
        nodes += 1
        children = node.get("children", [])
        if children:
            for child in children:
                visit(child)
        else:
            leaves += 1

    for root in roots:
        visit(root)
    return {"nodes": nodes, "leaves": leaves}


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/documents")
def list_documents():
    groups = []
    for source, config in DOCUMENT_SOURCES.items():
        documents = [
            _document_summary(source, path)
            for path in sorted(
                config["directory"].glob("*.xml"),
                key=lambda item: _sort_key(item.stem),
            )
        ]
        groups.append({
            "id": source,
            "label": config["label"],
            "description": config["description"],
            "document_count": len(documents),
            "utterance_count": sum(
                document["utterance_count"] for document in documents
            ),
            "documents": documents,
        })
    return jsonify(groups)


@app.get("/api/poems")
def find_poem():
    sentence_id = request.args.get("q", "").strip()
    if not sentence_id:
        abort(400, description="Enter a poem ID, for example MYS.1.1")
    poem = find_poem_location(sentence_id)
    if poem is None:
        abort(404, description=f"Poem '{sentence_id}' was not found")
    return jsonify(poem)


@app.get("/api/search")
def search_corpus():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    folded = query.casefold()
    hits = []
    for passage in _searchable_passages():
        if folded not in passage["_searchable"]:
            continue
        hits.append({
            key: value
            for key, value in passage.items()
            if key != "_searchable"
        })
        hits[-1]["preview"] = _search_preview(
            hits[-1]["preview"], query
        )
        if len(hits) >= 200:
            break
    return jsonify(hits)


@app.get("/api/documents/<source>/<doc_id>")
def document_index(source: str, doc_id: str):
    document = get_document(source, doc_id)
    return jsonify([
        {
            "sentence_id": utterance.sentence_id or "",
            "header": utterance.header.raw if utterance.header else "",
            "token_count": len(utterance.corpus_lines()),
            "raw_sentence_count": len(
                _block_raw_text(utterance._block_elem)
                if utterance._block_elem is not None else []
            ),
        }
        for utterance in document.utterances
    ])


@app.get("/api/utterances/<source>/<doc_id>/<path:sentence_id>/tree")
def utterance_tree(
    source: str, doc_id: str, sentence_id: str
):
    document = get_document(source, doc_id)
    utterance = document.find_utterance(sentence_id)
    if utterance is None:
        abort(
            404,
            description=f"Passage '{sentence_id}' not found in '{source}/{doc_id}'",
        )

    block = (
        utterance._block_elem
        if utterance._block_elem is not None
        else _utterance_to_elem(utterance)
    )
    roots = [
        _elem_to_node(child)
        for child in block
        if child.tag not in {"comment", "roundtrip-data", "raw-text"}
    ]
    return jsonify({
        "source": source,
        "document_id": doc_id,
        "sentence_id": utterance.sentence_id or sentence_id,
        "header": block.get("header", ""),
        "raw_text": _block_raw_text(block, utterance.corpus_lines()),
        "roots": roots,
        "stats": _tree_stats(roots),
    })


@app.get("/api/dictionary")
def search_dictionary():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    dictionary = get_dictionary()
    hits = []
    id_match = re.fullmatch(r"([A-Za-z]+)(\d+)([A-Za-z]*)", query)
    if id_match:
        canonical_id = (
            id_match.group(1).upper()
            + id_match.group(2)
            + id_match.group(3).lower()
        )
        entry = dictionary.get(canonical_id)
        if entry is not None:
            hits = [entry]
    else:
        seen: set[str] = set()
        folded = query.casefold()
        for entry in dictionary:
            values = (
                entry.get_all(".FORM")
                + entry.get_all(".GLOSS")
                + entry.get_all(".MEANING")
            )
            if any(folded in value.casefold() for value in values):
                entry_id = str(entry.eid)
                if entry_id not in seen:
                    hits.append(entry)
                    seen.add(entry_id)
            if len(hits) >= 50:
                break

    return jsonify([
        {
            "id": str(entry.eid),
            "gloss": entry.get_first(".GLOSS") or "",
            "forms": entry.get_all(".FORM"),
            "pos": entry.get_all(".POS"),
        }
        for entry in hits[:50]
    ])


@app.get("/api/dictionary/<entry_id>")
def dictionary_entry(entry_id: str):
    entry = get_dictionary().get(entry_id)
    if entry is None:
        abort(404, description=f"Entry '{entry_id}' not found")
    return jsonify({
        "id": str(entry.eid),
        "fields": [
            {
                "tag": tag,
                "label": tag.lstrip(".").replace("_", " ").title(),
                "values": entry.get_all(tag),
            }
            for tag in entry.tags()
        ],
    })


if __name__ == "__main__":
    app.run(debug=True, port=5002)
