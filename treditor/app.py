from __future__ import annotations

import re
import sys
import threading
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

ROOT = Path(__file__).resolve().parents[1]
DATA_XML = ROOT / "data" / "xml"
DICT_PATH = DATA_XML / "dict" / "dictionary.xml"
sys.path.insert(0, str(ROOT / "src"))

from coj.core.corpus import CorpusDocument, _utterance_to_elem
from coj.core.dictionary import DictEntry, Dictionary
from coj.core.tags import MULTI_VALUE_FIELDS, REQUIRED_FIELDS

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
_search_index_signature: tuple | None = None
_lemma_frequency_cache: dict[str, int] = {}
_dictionary_write_lock = threading.Lock()

CORPUS_SEARCH_FIELDS = (
    "transcription",
    "kanji",
    "word_forms",
    "lemma_ids",
)
SEARCH_PAGE_SIZES = {10, 25, 50, 100}


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


def _corpus_signature() -> tuple:
    return tuple(
        (
            source,
            path.name,
            path.stat().st_mtime_ns,
            path.stat().st_size,
        )
        for source, config in DOCUMENT_SOURCES.items()
        for path in sorted(config["directory"].glob("*.xml"))
    )


def _searchable_passages() -> list[dict]:
    """Build a reusable index, refreshing when corpus XML changes."""
    global _search_index, _search_index_signature, _lemma_frequency_cache
    signature = _corpus_signature()
    if _search_index is not None and signature == _search_index_signature:
        return _search_index

    passages = []
    lemma_frequencies: dict[str, int] = {}
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
                field_values = {
                    "header": [header] if header else [],
                    "transcription": [],
                    "kanji": [],
                    "word_forms": [],
                    "lemma_ids": [],
                }
                text_segments = []
                raw_text = block.find("raw-text")
                if raw_text is not None:
                    for sentence in raw_text.findall("sentence"):
                        number = (
                            sentence.get("n")
                            or sentence.get("number")
                            or str(len(text_segments) + 1)
                        ).strip()
                        kanji = (sentence.findtext("kanji", "") or "").strip()
                        transcription = (
                            sentence.findtext("transcription", "") or ""
                        ).strip()
                        text_segments.append({
                            "number": number,
                            "transcription": transcription,
                            "kanji": kanji,
                        })
                        if kanji:
                            field_values["kanji"].append(kanji)
                        if transcription:
                            field_values["transcription"].append(transcription)
                field_values["word_forms"] = [
                    form
                    for elem in block.iter()
                    if (form := (elem.get("form") or "").strip())
                ]
                lemma_forms: dict[str, list[str]] = {}
                for elem in block.iter():
                    lemma = (elem.get("lemma") or "").strip()
                    form = (elem.get("form") or "").strip()
                    if not lemma:
                        continue
                    lemma_forms.setdefault(lemma, [])
                    if form:
                        lemma_forms[lemma].append(form)
                field_values["lemma_ids"] = list(lemma_forms)
                # TGrep2 reports one result per matching passage, even when a
                # lemma occurs on more than one node in that passage.  Build
                # dictionary frequencies with the same whole-corpus rule.
                for lemma in lemma_forms:
                    lemma_frequencies[lemma] = (
                        lemma_frequencies.get(lemma, 0) + 1
                    )
                passages.append({
                    **document,
                    "sentence_id": sentence_id,
                    "header": header,
                    "_fields": field_values,
                    "_text_segments": text_segments,
                    "_lemma_forms": lemma_forms,
                    "_roots": [
                        _elem_to_node(child)
                        for child in block
                        if child.tag not in {
                            "comment", "roundtrip-data", "raw-text"
                        }
                    ],
                })

    _search_index = passages
    _search_index_signature = signature
    _lemma_frequency_cache = lemma_frequencies
    return passages


def _lemma_frequency(lemma_id: str) -> int:
    """Return the whole-corpus TGrep2 result count for ``lemma=lemma_id``."""
    _searchable_passages()
    return _lemma_frequency_cache.get(lemma_id, 0)


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


def _search_values_match(
    values: list[str],
    query: str,
    match_mode: str,
    case_sensitive: bool,
    ignore_spaces: bool = False,
) -> bool:
    if ignore_spaces:
        values = ["".join(value.split()) for value in values]
        query = "".join(query.split())
        if not query:
            return False
    if not case_sensitive:
        values = [value.casefold() for value in values]
        query = query.casefold()
    if match_mode == "exact":
        return any(value.strip() == query for value in values)
    if match_mode == "whole":
        pattern = re.compile(rf"(?<!\w){re.escape(query)}(?!\w)")
        return any(pattern.search(value) for value in values)
    return any(query in value for value in values)


def _matching_text_ranges(
    text: str,
    query: str,
    match_mode: str,
    case_sensitive: bool,
    ignore_spaces: bool = False,
) -> list[tuple[int, int]]:
    """Return the exact character ranges responsible for a text match."""
    if not text or not query:
        return []
    positions = None
    if ignore_spaces:
        positions = [
            index for index, character in enumerate(text)
            if not character.isspace()
        ]
        text = "".join(text[index] for index in positions)
        query = "".join(query.split())
        if not text or not query:
            return []
    flags = 0 if case_sensitive else re.IGNORECASE
    if match_mode == "exact":
        start = len(text) - len(text.lstrip())
        end = len(text.rstrip())
        candidate = text[start:end]
        if case_sensitive:
            matches = candidate == query
        else:
            matches = candidate.casefold() == query.casefold()
        matches = [(start, end)] if matches and start < end else []
    else:
        pattern = re.escape(query)
        if match_mode == "whole":
            pattern = rf"(?<!\w){pattern}(?!\w)"
        matches = [
            (match.start(), match.end())
            for match in re.finditer(pattern, text, flags)
        ]
    if positions is None:
        return matches
    return [
        (positions[start], positions[end - 1] + 1)
        for start, end in matches
    ]


def _merge_highlight_ranges(ranges: list[dict]) -> list[dict]:
    merged = []
    for item in sorted(
        ranges,
        key=lambda value: (value["segment"], value["start"], value["end"]),
    ):
        if (
            merged
            and merged[-1]["segment"] == item["segment"]
            and item["start"] <= merged[-1]["end"]
        ):
            merged[-1]["end"] = max(merged[-1]["end"], item["end"])
        else:
            merged.append(dict(item))
    return merged


def _segment_highlights(
    passage: dict,
    field: str,
    query: str,
    match_mode: str,
    case_sensitive: bool,
    ignore_spaces: bool = False,
) -> list[dict]:
    return [
        {"segment": index, "start": start, "end": end}
        for index, segment in enumerate(passage["_text_segments"])
        for start, end in _matching_text_ranges(
            segment[field], query, match_mode, case_sensitive, ignore_spaces
        )
    ]


def _full_transcription_highlights(
    passage: dict, segment_indexes: set[int] | None = None
) -> list[dict]:
    return [
        {
            "segment": index,
            "start": 0,
            "end": len(segment["transcription"]),
        }
        for index, segment in enumerate(passage["_text_segments"])
        if segment["transcription"]
        and (segment_indexes is None or index in segment_indexes)
    ]


def _form_word_alignment(passage: dict, context: dict) -> tuple[list, list, dict]:
    form_nodes = [
        node for node in context["nodes"]
        if not node.get("children") and str(node.get("form", "")).strip()
    ]
    tree_forms = [str(node.get("form", "")).strip() for node in form_nodes]
    word_locations = []
    transcription_words = []
    for segment_index, segment in enumerate(passage["_text_segments"]):
        for match in re.finditer(r"\S+", segment["transcription"]):
            word_locations.append((segment_index, match.start(), match.end()))
            transcription_words.append(match.group())

    form_to_word = {}
    if len(tree_forms) == len(transcription_words):
        form_to_word = {index: index for index in range(len(tree_forms))}
    else:
        matcher = SequenceMatcher(
            None, tree_forms, transcription_words, autojunk=False
        )
        for tag, form_start, form_end, word_start, word_end in matcher.get_opcodes():
            form_count = form_end - form_start
            word_count = word_end - word_start
            if tag == "equal" or (tag == "replace" and form_count == word_count):
                form_to_word.update(
                    (form_start + offset, word_start + offset)
                    for offset in range(form_count)
                )
    return form_nodes, word_locations, form_to_word


def _word_span_highlights(
    passage: dict,
    word_spans: list[tuple[int, int]],
    context: dict | None = None,
) -> list[dict]:
    """Map tree leaf spans to continuous raw-transcription character ranges."""
    context = context or _tgrep_tree_context(passage["_roots"])
    _, word_locations, form_to_word = _form_word_alignment(passage, context)

    highlights = []
    for first_word, last_word in word_spans:
        mapped_words = [
            form_to_word[index]
            for index in range(first_word, last_word + 1)
            if index in form_to_word
        ]
        if not mapped_words:
            continue
        locations = word_locations[min(mapped_words):max(mapped_words) + 1]
        segment_indexes = sorted({location[0] for location in locations})
        for segment_index in segment_indexes:
            segment_locations = [
                location for location in locations
                if location[0] == segment_index
            ]
            highlights.append({
                "segment": segment_index,
                "start": segment_locations[0][1],
                "end": segment_locations[-1][2],
            })
    return _merge_highlight_ranges(highlights)


def _tree_paths_for_text_ranges(
    passage: dict, ranges: list[dict], context: dict
) -> list[str]:
    form_nodes, word_locations, form_to_word = _form_word_alignment(
        passage, context
    )
    matching_words = {
        word_index
        for word_index, (segment, start, end) in enumerate(word_locations)
        for item in ranges
        if item["segment"] == segment
        and item["start"] < end
        and item["end"] > start
    }
    word_to_forms: dict[int, list[int]] = {}
    for form_index, word_index in form_to_word.items():
        word_to_forms.setdefault(word_index, []).append(form_index)
    node_ids = {
        id(form_nodes[form_index])
        for word_index in matching_words
        for form_index in word_to_forms.get(word_index, [])
    }
    return [
        context["paths"][id(node)]
        for node in context["nodes"]
        if id(node) in node_ids
    ]


def _ordinary_search_highlights(
    passage: dict,
    matching_fields: list[str],
    query: str,
    match_mode: str,
    case_sensitive: bool,
    lemma_id: str,
    ignore_spaces: bool = False,
) -> tuple[dict[str, list[dict]], dict]:
    transcription = []
    kanji = []
    kanji_fallback = []

    if "transcription" in matching_fields:
        transcription.extend(_segment_highlights(
            passage, "transcription", query, match_mode, case_sensitive,
            ignore_spaces,
        ))
    if "kanji" in matching_fields:
        kanji.extend(_segment_highlights(
            passage, "kanji", query, match_mode, case_sensitive,
            ignore_spaces,
        ))
        matched_segments = {item["segment"] for item in kanji}
        kanji_fallback.extend(
            _full_transcription_highlights(passage, matched_segments)
        )
    context = _tgrep_tree_context(passage["_roots"])
    matching_nodes = []
    if lemma_id:
        matching_nodes.extend(
            node for node in context["nodes"]
            if str(node.get("lemma", "")) == lemma_id
        )
    elif "lemma_ids" in matching_fields:
        matching_nodes.extend(
            node for node in context["nodes"]
            if _search_values_match(
                [str(node.get("lemma", ""))],
                query,
                match_mode,
                case_sensitive,
                ignore_spaces,
            )
        )
    if "word_forms" in matching_fields:
        matching_nodes.extend(
            node for node in context["nodes"]
            if _search_values_match(
                [str(node.get("form", ""))],
                query,
                match_mode,
                case_sensitive,
                ignore_spaces,
            )
        )
    word_spans = [
        span for node in matching_nodes
        if (span := context["form_spans"].get(id(node))) is not None
    ]
    transcription.extend(_word_span_highlights(passage, word_spans, context))
    highlights = {
        "transcription": _merge_highlight_ranges(transcription),
        "kanji": _merge_highlight_ranges(kanji),
        "transcription_when_kanji_hidden": _merge_highlight_ranges(
            kanji_fallback
        ),
    }
    node_paths = {
        context["paths"][id(node)] for node in matching_nodes
    }
    node_paths.update(_tree_paths_for_text_ranges(
        passage,
        highlights["transcription"],
        context,
    ))
    tree_context = {
        "node_ids": [
            context["paths"][id(node)]
            for node in context["nodes"]
            if context["paths"][id(node)] in node_paths
        ],
        "show_lemma": bool(lemma_id or "lemma_ids" in matching_fields),
        "show_phon": False,
        "show_kanji": bool(kanji),
        "show_null": any(
            not node.get("children")
            and not str(node.get("form", ""))
            and not str(node.get("phon", ""))
            for node in matching_nodes
        ),
        "kanji_ranges": [
            {
                "sentence_number": passage["_text_segments"]
                [item["segment"]]["number"],
                "start": item["start"],
                "end": item["end"],
            }
            for item in kanji
        ],
    }
    return highlights, tree_context


def _requested_values(name: str, allowed: tuple[str, ...]) -> list[str]:
    requested = {
        value.strip()
        for value in request.args.get(name, "").split(",")
        if value.strip()
    }
    selected = [value for value in allowed if value in requested]
    return selected or list(allowed)


def _dictionary_tag_ids() -> tuple[str, ...]:
    tags = {tag for entry in get_dictionary() for tag in entry.tags()}
    ordered = sorted(tags, key=lambda tag: (tag not in REQUIRED_FIELDS, tag))
    return ("lemma", *ordered)


def _dictionary_tag_metadata() -> list[dict]:
    counts: dict[str, int] = {}
    for entry in get_dictionary():
        for tag in entry.tags():
            counts[tag] = counts.get(tag, 0) + 1
    return [
        {
            "id": tag,
            "label": (
                "Lemma ID"
                if tag == "lemma"
                else tag.lstrip(".").replace("_", " ").title()
            ),
            "entry_count": len(get_dictionary()) if tag == "lemma" else counts[tag],
            "multi_valued": tag in MULTI_VALUE_FIELDS,
        }
        for tag in _dictionary_tag_ids()
    ]


def _entry_values_by_tag(entry: DictEntry) -> dict[str, list[str]]:
    return {
        "lemma": [str(entry.eid)],
        **{tag: entry.get_all(tag) for tag in entry.tags()},
    }


def _dictionary_match_score(
    entry: DictEntry,
    query: str,
    fields: list[str],
    match_mode: str,
    case_sensitive: bool,
) -> int | None:
    values_by_tag = _entry_values_by_tag(entry)
    field_weights = {
        "lemma": 90,
        ".FORM": 80,
        ".KANA": 70,
        ".GLOSS": 35,
        ".MEANING": 30,
        ".POS": 25,
    }
    best_score: int | None = None
    comparison_query = query if case_sensitive else query.casefold()
    whole_pattern = re.compile(
        rf"(?<!\w){re.escape(comparison_query)}(?!\w)"
    )
    for field in fields:
        for raw_value in values_by_tag.get(field, []):
            value = raw_value if case_sensitive else raw_value.casefold()
            if not _search_values_match(
                [raw_value], query, match_mode, case_sensitive
            ):
                continue
            if value.strip() == comparison_query:
                quality = 1000
            elif value.startswith(comparison_query):
                quality = 700
            elif whole_pattern.search(value):
                quality = 500
            else:
                quality = 300
            score = quality + field_weights.get(field, 10)
            best_score = max(best_score or score, score)
    return best_score


def _dictionary_result_payload(
    entry: DictEntry,
    score: int = 0,
    frequencies: dict[str, int] | None = None,
) -> dict:
    if frequencies is None:
        _searchable_passages()
        frequencies = _lemma_frequency_cache
    return {
        "id": str(entry.eid),
        "gloss": entry.get_first(".GLOSS") or "",
        "forms": entry.get_all(".FORM"),
        "kana": entry.get_all(".KANA"),
        "pos": entry.get_all(".POS"),
        "frequency": frequencies.get(str(entry.eid), 0),
        "relevance": score,
    }


def _entry_from_request(entry_id: str) -> DictEntry:
    payload = request.get_json(silent=True) or {}
    fields = payload.get("fields")
    if not isinstance(fields, dict):
        abort(400, description="Dictionary fields must be an object")
    try:
        entry = DictEntry(entry_id)
    except (TypeError, ValueError) as error:
        abort(400, description=f"Invalid lemma ID: {error}")
    allowed = set(_dictionary_tag_ids()) - {"lemma"}
    for tag, raw_values in fields.items():
        if tag not in allowed:
            abort(400, description=f"Unknown dictionary tag '{tag}'")
        values = raw_values if isinstance(raw_values, list) else [raw_values]
        clean_values = [str(value).strip() for value in values]
        if tag in MULTI_VALUE_FIELDS:
            entry.set(tag, clean_values)
        else:
            entry.set(tag, clean_values[0] if clean_values else "")
    entry.normalise()
    return entry


def _save_dictionary(dictionary: Dictionary) -> None:
    global _dictionary
    temporary_path = DICT_PATH.with_name(f".{DICT_PATH.stem}.tmp.xml")
    dictionary.to_file(str(temporary_path))
    temporary_path.replace(DICT_PATH)
    _dictionary = dictionary


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


TGREP_LINKS = (
    "$..",
    "$,,",
    "<<",
    ">>",
    "..",
    ",,",
    "$.",
    "$,",
    "<",
    ">",
    ".",
    ",",
    "$",
)
TGREP_FIELDS = {"tag", "form", "lemma", "phon"}
TgrepConstraint = tuple[str, re.Pattern | str]
TgrepDescription = tuple[TgrepConstraint, ...]


def _read_tgrep_descriptor(query: str, position: int) -> tuple[str, int]:
    """Read one node description without treating regex punctuation as links."""
    start = position
    field_match = re.match(r"(?:tag|form|lemma|phon)=", query[position:])
    if field_match:
        position += field_match.end()
    if position >= len(query):
        raise ValueError("A node description is required after '='")
    if query[position] == "/":
        position += 1
        escaped = False
        while position < len(query):
            character = query[position]
            if character == "/" and not escaped:
                position += 1
                if position < len(query) and query[position] == "i":
                    position += 1
                return query[start:position], position
            escaped = character == "\\" and not escaped
            if character != "\\":
                escaped = False
            position += 1
        raise ValueError("The regular expression is missing its closing '/'")
    while position < len(query):
        if query[position].isspace() or query[position] in "&!<>$.,()[]":
            break
        position += 1
    if position == start or query[start:position].endswith("="):
        raise ValueError("A node description is required")
    return query[start:position], position


def _compile_tgrep_descriptor(description: str) -> tuple[str, re.Pattern | str]:
    field = "tag"
    value = description
    if "=" in description:
        candidate, value = description.split("=", 1)
        if candidate not in TGREP_FIELDS:
            raise ValueError(f"Unknown node field '{candidate}'")
        field = candidate
    if value in {"*", "__"}:
        return field, "*"
    regex_match = re.fullmatch(r"/(.*)/(i?)", value, flags=re.DOTALL)
    if regex_match:
        flags = re.IGNORECASE if regex_match.group(2) else 0
        try:
            return field, re.compile(regex_match.group(1), flags)
        except re.error as error:
            raise ValueError(f"Invalid regular expression: {error}") from error
    if not value:
        raise ValueError("A node description cannot be empty")
    return field, value


def _read_tgrep_description(
    query: str, position: int
) -> tuple[TgrepDescription, int]:
    """Read one node predicate, optionally grouped in square brackets."""
    if position >= len(query) or query[position] != "[":
        text, position = _read_tgrep_descriptor(query, position)
        return (_compile_tgrep_descriptor(text),), position

    position += 1
    constraints = []
    while True:
        while position < len(query) and query[position].isspace():
            position += 1
        if position >= len(query):
            raise ValueError(
                "The bracketed node predicate is missing its closing ']'"
            )
        if query[position] == "]":
            if not constraints:
                raise ValueError("A bracketed node predicate cannot be empty")
            return tuple(constraints), position + 1

        text, position = _read_tgrep_descriptor(query, position)
        constraints.append(_compile_tgrep_descriptor(text))

        while position < len(query) and query[position].isspace():
            position += 1
        if position >= len(query):
            raise ValueError(
                "The bracketed node predicate is missing its closing ']'"
            )
        if query[position] == "]":
            return tuple(constraints), position + 1
        if query[position] != "&":
            raise ValueError(
                "Expected '&' or ']' inside the bracketed node predicate"
            )
        position += 1


def _parse_tgrep_query(
    query: str,
) -> tuple[TgrepDescription, list[tuple[bool, str, TgrepDescription]]]:
    """Parse the flat, AND-linked core of TGrep2 query syntax."""
    position = 0

    def skip_space() -> None:
        nonlocal position
        while position < len(query) and query[position].isspace():
            position += 1

    skip_space()
    if not query:
        raise ValueError("Enter a TGrep2 pattern")
    anchor, position = _read_tgrep_description(query, position)
    clauses = []
    while True:
        skip_space()
        if position >= len(query):
            break
        if query[position] == "&":
            position += 1
            skip_space()
        negated = position < len(query) and query[position] == "!"
        if negated:
            position += 1
        link = next(
            (item for item in TGREP_LINKS if query.startswith(item, position)),
            None,
        )
        if link is None:
            raise ValueError(
                f"Expected a supported relationship near '{query[position:]}'"
            )
        position += len(link)
        skip_space()
        target, position = _read_tgrep_description(query, position)
        clauses.append((negated, link, target))
    return anchor, clauses


def _tgrep_tree_context(roots: list[dict]) -> dict:
    nodes = []
    parents: dict[int, dict | None] = {}
    spans: dict[int, tuple[int, int]] = {}
    form_spans: dict[int, tuple[int, int] | None] = {}
    paths: dict[int, str] = {}
    leaf_position = 0
    form_leaf_position = 0

    def visit(node: dict, parent: dict | None, path: str) -> None:
        nonlocal leaf_position, form_leaf_position
        nodes.append(node)
        parents[id(node)] = parent
        paths[id(node)] = path
        children = node.get("children", [])
        start = leaf_position
        form_start = form_leaf_position
        if children:
            for index, child in enumerate(children):
                visit(child, node, f"{path}.{index}")
        else:
            leaf_position += 1
            if str(node.get("form", "")).strip():
                form_leaf_position += 1
        spans[id(node)] = (start, max(start, leaf_position - 1))
        form_spans[id(node)] = (
            (form_start, form_leaf_position - 1)
            if form_leaf_position > form_start
            else None
        )

    for index, root in enumerate(roots):
        visit(root, None, str(index))
    return {
        "roots": roots,
        "nodes": nodes,
        "parents": parents,
        "spans": spans,
        "form_spans": form_spans,
        "paths": paths,
    }


def _tgrep_is_ancestor(ancestor: dict, node: dict, context: dict) -> bool:
    parent = context["parents"].get(id(node))
    while parent is not None:
        if parent is ancestor:
            return True
        parent = context["parents"].get(id(parent))
    return False


def _tgrep_siblings(node: dict, context: dict) -> list[dict]:
    parent = context["parents"].get(id(node))
    return parent.get("children", []) if parent is not None else context["roots"]


def _tgrep_related_nodes(node: dict, link: str, context: dict) -> list[dict]:
    nodes = context["nodes"]
    parent = context["parents"].get(id(node))
    if link == "<":
        return node.get("children", [])
    if link == "<<":
        return [candidate for candidate in nodes if _tgrep_is_ancestor(node, candidate, context)]
    if link == ">":
        return [parent] if parent is not None else []
    if link == ">>":
        return [candidate for candidate in nodes if _tgrep_is_ancestor(candidate, node, context)]

    siblings = _tgrep_siblings(node, context)
    sibling_index = siblings.index(node)
    if link == "$":
        return [candidate for candidate in siblings if candidate is not node]
    if link == "$.":
        return siblings[sibling_index + 1:sibling_index + 2]
    if link == "$..":
        return siblings[sibling_index + 1:]
    if link == "$,":
        return siblings[max(0, sibling_index - 1):sibling_index]
    if link == "$,,":
        return siblings[:sibling_index]

    node_start, node_end = context["spans"][id(node)]
    if link == ".":
        return [
            candidate for candidate in nodes
            if context["spans"][id(candidate)][0] == node_end + 1
        ]
    if link == "..":
        return [
            candidate for candidate in nodes
            if context["spans"][id(candidate)][0] > node_end
        ]
    if link == ",":
        return [
            candidate for candidate in nodes
            if context["spans"][id(candidate)][1] + 1 == node_start
        ]
    if link == ",,":
        return [
            candidate for candidate in nodes
            if context["spans"][id(candidate)][1] < node_start
        ]
    return []


def _tgrep_node_matches(
    node: dict, description: TgrepDescription
) -> bool:
    for field, expected in description:
        value = str(node.get(field, ""))
        if expected == "*":
            continue
        if isinstance(expected, re.Pattern):
            if expected.search(value) is None:
                return False
        elif value != expected:
            return False
    return True


def _tgrep_query_matches(node: dict, parsed_query: tuple, context: dict) -> bool:
    return _tgrep_query_evidence(node, parsed_query, context) is not None


def _tgrep_query_evidence(
    node: dict, parsed_query: tuple, context: dict
) -> list[dict] | None:
    """Return the anchor and positive relationship nodes proving a match."""
    anchor, clauses = parsed_query
    if not _tgrep_node_matches(node, anchor):
        return None
    evidence = [node]
    for negated, link, target in clauses:
        related_matches = [
            candidate
            for candidate in _tgrep_related_nodes(node, link, context)
            if _tgrep_node_matches(candidate, target)
        ]
        if negated:
            if related_matches:
                return None
        elif not related_matches:
            return None
        else:
            evidence.extend(related_matches)
    return evidence
def _tgrep_forms(node: dict) -> list[str]:
    children = node.get("children", [])
    if children:
        return [form for child in children for form in _tgrep_forms(child)]
    form = str(node.get("form", "")).strip()
    return [form] if form else []


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
    lemma_id = request.args.get("lemma_id", "").strip()
    if not query:
        return jsonify({
            "query": "",
            "total": 0,
            "page": 1,
            "per_page": 25,
            "pages": 0,
            "results": [],
        })

    sources = _requested_values("sources", tuple(DOCUMENT_SOURCES))
    fields = _requested_values("fields", CORPUS_SEARCH_FIELDS)
    match_mode = request.args.get("match", "contains")
    if match_mode not in {"contains", "whole", "exact"}:
        match_mode = "contains"
    case_sensitive = request.args.get("case_sensitive") == "true"
    ignore_spaces = request.args.get("ignore_spaces") == "true"
    page = max(request.args.get("page", 1, type=int) or 1, 1)
    requested_page_size = request.args.get("per_page", 25, type=int) or 25
    per_page = (
        requested_page_size
        if requested_page_size in SEARCH_PAGE_SIZES
        else 25
    )

    hits = []
    for passage in _searchable_passages():
        if passage["source"] not in sources:
            continue
        if lemma_id:
            if passage["source"] != "text":
                continue
            lemma_forms = passage["_lemma_forms"].get(lemma_id, [])
            matching_fields = ["lemma"] if lemma_forms else []
        else:
            matching_fields = [
                field
                for field in fields
                if _search_values_match(
                    passage["_fields"][field],
                    query,
                    match_mode,
                    case_sensitive,
                    ignore_spaces,
                )
            ]
            lemma_forms = [
                form
                for candidate in passage["_fields"]["lemma_ids"]
                if "lemma_ids" in matching_fields
                and _search_values_match(
                    [candidate], query, match_mode, case_sensitive,
                    ignore_spaces,
                )
                for form in passage["_lemma_forms"].get(candidate, [])
            ]
        if not matching_fields:
            continue
        if lemma_id or lemma_forms:
            preview = next(
                (
                    value
                    for value in passage["_fields"]["transcription"]
                    if any(form in value.split() for form in lemma_forms)
                ),
                " ".join(lemma_forms) or query,
            )
        else:
            preview_values = passage["_fields"][matching_fields[0]]
            preview = next(
                (
                    value
                    for value in preview_values
                    if _search_values_match(
                        [value], query, match_mode, case_sensitive,
                        ignore_spaces,
                    )
                ),
                preview_values[0] if preview_values else passage["header"],
            )
        hit = {
            key: value
            for key, value in passage.items()
            if key not in {
                "_fields", "_text_segments", "_lemma_forms", "_roots"
            }
        }
        preview_query = lemma_forms[0] if lemma_forms else query
        hit["preview"] = _search_preview(preview, preview_query)
        hit["transcription"] = _search_preview(
            " ".join(passage["_fields"]["transcription"]),
            preview_query,
        )
        hit["kanji"] = _search_preview(
            "　".join(passage["_fields"]["kanji"]),
            query,
        )
        hit["text_segments"] = passage["_text_segments"]
        hit["highlights"], hit["tree_context"] = _ordinary_search_highlights(
            passage,
            matching_fields,
            query,
            match_mode,
            case_sensitive,
            lemma_id,
            ignore_spaces,
        )
        hit["matching_fields"] = matching_fields
        hit["highlight_terms"] = list(dict.fromkeys(lemma_forms)) or [query]
        hits.append(hit)

    total = len(hits)
    pages = (total + per_page - 1) // per_page
    page = min(page, pages) if pages else 1
    start = (page - 1) * per_page
    return jsonify({
        "query": query,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
        "lemma_id": lemma_id,
        "ignore_spaces": ignore_spaces,
        "occurrence_total": (
            sum(
                len(passage["_lemma_forms"].get(lemma_id, []))
                for passage in _searchable_passages()
                if passage["source"] == "text"
            )
            if lemma_id
            else None
        ),
        "results": hits[start:start + per_page],
    })


@app.get("/api/tgrep")
def search_syntax_trees():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({
            "query": "",
            "search_type": "tgrep2",
            "total": 0,
            "page": 1,
            "per_page": 25,
            "pages": 0,
            "results": [],
        })
    try:
        parsed_query = _parse_tgrep_query(query)
    except ValueError as error:
        abort(400, description=str(error))

    sources = _requested_values("sources", tuple(DOCUMENT_SOURCES))
    page = max(request.args.get("page", 1, type=int) or 1, 1)
    requested_page_size = request.args.get("per_page", 25, type=int) or 25
    per_page = (
        requested_page_size
        if requested_page_size in SEARCH_PAGE_SIZES
        else 25
    )
    anchor, clauses = parsed_query
    query_fields = {
        field
        for description in [anchor, *(target for _, _, target in clauses)]
        for field, _ in description
    }
    hits = []
    for passage in _searchable_passages():
        if passage["source"] not in sources:
            continue
        context = _tgrep_tree_context(passage["_roots"])
        matching_nodes = []
        evidence_nodes = []
        for node in context["nodes"]:
            evidence = _tgrep_query_evidence(node, parsed_query, context)
            if evidence is not None:
                matching_nodes.append(node)
                evidence_nodes.extend(evidence)
        if not matching_nodes:
            continue
        evidence_ids = {id(node) for node in evidence_nodes}
        evidence_nodes = [
            node for node in context["nodes"] if id(node) in evidence_ids
        ]
        highlight_terms = list(dict.fromkeys(
            form
            for node in matching_nodes
            for form in _tgrep_forms(node)
        ))[:50]
        transcription = " ".join(passage["_fields"]["transcription"])
        preview = (
            transcription
            or " ".join(highlight_terms)
            or passage["header"]
        )
        hit = {
            key: value
            for key, value in passage.items()
            if key not in {
                "_fields", "_text_segments", "_lemma_forms", "_roots"
            }
        }
        hit.update({
            "preview": _search_preview(
                preview, highlight_terms[0] if highlight_terms else query
            ),
            "transcription": _search_preview(
                transcription,
                highlight_terms[0] if highlight_terms else query,
            ),
            "kanji": _search_preview(
                "　".join(passage["_fields"]["kanji"]),
                query,
            ),
            "text_segments": passage["_text_segments"],
            "highlights": {
                "transcription": _word_span_highlights(
                    passage,
                    [
                        span for node in matching_nodes
                        if (
                            span := context["form_spans"].get(id(node))
                        ) is not None
                    ],
                    context,
                ),
                "kanji": [],
                "transcription_when_kanji_hidden": [],
            },
            "tree_context": {
                "node_ids": [
                    context["paths"][id(node)] for node in evidence_nodes
                ],
                "show_lemma": "lemma" in query_fields,
                "show_phon": "phon" in query_fields,
                "show_kanji": False,
                "show_null": any(
                    not node.get("children")
                    and not str(node.get("form", ""))
                    and not str(node.get("phon", ""))
                    for node in evidence_nodes
                ),
                "kanji_ranges": [],
            },
            "matching_fields": ["syntax_tree"],
            "highlight_terms": highlight_terms,
            "match_count": len(matching_nodes),
            "match_labels": list(dict.fromkeys(
                str(node.get("tag", "")) for node in matching_nodes
            )),
        })
        hits.append(hit)

    total = len(hits)
    pages = (total + per_page - 1) // per_page
    page = min(page, pages) if pages else 1
    start = (page - 1) * per_page
    return jsonify({
        "query": query,
        "search_type": "tgrep2",
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
        "results": hits[start:start + per_page],
    })


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

    fields = _requested_values("fields", _dictionary_tag_ids())
    match_mode = request.args.get("match", "contains")
    if match_mode not in {"contains", "whole", "exact"}:
        match_mode = "contains"
    case_sensitive = request.args.get("case_sensitive") == "true"
    dictionary = get_dictionary()
    scored_hits = []
    for entry in dictionary:
        score = _dictionary_match_score(
            entry, query, fields, match_mode, case_sensitive
        )
        if score is not None:
            scored_hits.append((score, entry))
    scored_hits.sort(key=lambda item: (-item[0], str(item[1].eid)))
    _searchable_passages()
    return jsonify([
        _dictionary_result_payload(entry, score, _lemma_frequency_cache)
        for score, entry in scored_hits[:100]
    ])


@app.get("/api/dictionary/tags")
def dictionary_tags():
    return jsonify(_dictionary_tag_metadata())


@app.post("/api/dictionary")
def create_dictionary_entry():
    payload = request.get_json(silent=True) or {}
    entry_id = str(payload.get("id") or "").strip()
    if not entry_id:
        abort(400, description="A lemma ID is required")
    with _dictionary_write_lock:
        dictionary = Dictionary.from_file(str(DICT_PATH))
        if dictionary.get(entry_id) is not None:
            abort(409, description=f"Entry '{entry_id}' already exists")
        entry = _entry_from_request(entry_id)
        dictionary.add(entry)
        _save_dictionary(dictionary)
    return jsonify(_dictionary_result_payload(entry)), 201


@app.get("/api/dictionary/<entry_id>")
def dictionary_entry(entry_id: str):
    entry = get_dictionary().get(entry_id)
    if entry is None:
        abort(404, description=f"Entry '{entry_id}' not found")
    return jsonify({
        "id": str(entry.eid),
        "frequency": _lemma_frequency(str(entry.eid)),
        "fields": [
            {
                "tag": tag,
                "label": tag.lstrip(".").replace("_", " ").title(),
                "values": entry.get_all(tag),
                "multi_valued": tag in MULTI_VALUE_FIELDS,
            }
            for tag in entry.tags()
        ],
    })


@app.put("/api/dictionary/<entry_id>")
def update_dictionary_entry(entry_id: str):
    with _dictionary_write_lock:
        dictionary = Dictionary.from_file(str(DICT_PATH))
        if dictionary.get(entry_id) is None:
            abort(404, description=f"Entry '{entry_id}' not found")
        entry = _entry_from_request(entry_id)
        dictionary.add(entry, allow_update=True)
        _save_dictionary(dictionary)
    return jsonify(_dictionary_result_payload(entry))


if __name__ == "__main__":
    app.run(debug=True, port=5002)
