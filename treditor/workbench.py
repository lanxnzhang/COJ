from __future__ import annotations

import copy
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from flask import Blueprint, abort, jsonify, request

from coj.core.corpus import CorpusDocument, _canonical_sentence_id
from coj.xml.corpus_xml import utterance_to_xml
from treditor.workbench_conversion import convert, conversion_catalog

MAX_INPUT = 250_000


def parse_text(content: str, format_name: str = "auto") -> dict:
    if not content.strip():
        raise ValueError("Enter one text/tree before parsing.")
    if len(content) > MAX_INPUT:
        raise ValueError("Tree input is limited to 250,000 characters per pane.")
    if format_name == "auto":
        format_name = "xml" if content.lstrip().startswith("<") else "txt"
    if format_name == "xml":
        if re.search(r"<!\s*(DOCTYPE|ENTITY)\b", content, re.I):
            raise ValueError("XML declarations of document types or entities are unsupported.")
        root = ET.fromstring(content)
        blocks = [root] if root.tag == "block" else root.findall("block")
        if len(blocks) != 1:
            raise ValueError("Supply exactly one text: a <block> or document containing one block.")
        block = blocks[0]
        model = CorpusDocument._from_elem(ET.Element("document"))
        model._doc_elem.append(copy.deepcopy(block))
        generated = model.to_text()
        alternate_format = "txt"
    elif format_name == "txt":
        model = CorpusDocument.from_text(content)
        if len(model) != 1:
            raise ValueError("Supply exactly one TXT text, separated from other texts by blank lines.")
        block = model._doc_elem.find("block")
        if not any(child.tag not in {"raw-text", "roundtrip-data", "comment"} for child in block):
            raise ValueError("No syntax tree was found in this TXT input.")
        generated = utterance_to_xml(model.utterances[0])
        alternate_format = "xml"
    else:
        raise ValueError("Tree input format must be TXT, XML, or Auto.")
    return {
        "format": format_name, "sentence_id": block.get("id", ""),
        "block": block, "generated": generated, "alternate_format": alternate_format,
    }


def original_txt(path: Path, canonical_id: str) -> str | None:
    if not path.is_file():
        return None
    contents = path.read_text(encoding="utf-8")
    blocks = re.split(r"(?:\r?\n)[ \t]*(?:\r?\n)", contents)
    matches = []
    for block in blocks:
        identifiers = re.findall(r"^ID,([^\r\n]+)", block, re.M)
        if any(_canonical_sentence_id(value.strip()) == canonical_id for value in identifiers):
            matches.append(block.strip("\r\n"))
    if len(matches) > 1:
        raise ValueError("This ID identifies several Source TXT blocks; choose a unique text first.")
    return matches[0] if matches else None


def comparable_xml(element: ET.Element):
    return (
        element.tag, tuple(sorted(element.attrib.items())),
        (element.text or "").strip(),
        tuple(comparable_xml(child) for child in element),
    )


def create_blueprint(resolve, tree_payload, data_root: Path) -> Blueprint:
    blueprint = Blueprint("workbench", __name__)

    def payload(parsed):
        return {
            "format": parsed["format"], "sentence_id": parsed["sentence_id"],
            "roots": tree_payload(parsed["block"]),
            "generated": {"format": parsed["alternate_format"],
                          "content": parsed["generated"], "origin": "Generated"},
        }

    @blueprint.post("/api/workbench/parse")
    def parse():
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            abort(400, description="Supply a JSON object.")
        try:
            return jsonify(payload(parse_text(str(body.get("content", "")), body.get("format", "auto"))))
        except (ValueError, ET.ParseError, RecursionError) as error:
            abort(400, description=str(error) or "This tree is too deeply nested.")

    @blueprint.get("/api/workbench/text")
    def load_text():
        location = resolve(request.args.get("id", "").strip())
        if location is None:
            abort(404, description="No corpus text matches this identifier.")
        source, document_id = location["source"], location["document_id"]
        canonical_id = location["sentence_id"]
        root = ET.parse(data_root / "xml" / source / f"{document_id}.xml").getroot()
        blocks = [block for block in root.findall("block") if block.get("id") == canonical_id]
        if len(blocks) != 1:
            abort(409, description="The identifier does not identify a unique Stored XML text.")
        stored = blocks[0]
        try:
            txt = original_txt(data_root / "txt" / source / f"{document_id}.txt", canonical_id)
            source_parsed = parse_text(txt, "txt") if txt is not None else None
        except (ValueError, ET.ParseError) as error:
            abort(409, description=str(error))
        representations = [{
            "format": "xml", "origin": "Stored XML",
            "content": ET.tostring(stored, encoding="unicode"),
        }]
        if txt is not None:
            representations.insert(0, {"format": "txt", "origin": "Source TXT", "content": txt})
        different = source_parsed is not None and (
            comparable_xml(source_parsed["block"]) != comparable_xml(stored)
        )
        return jsonify({"sentence_id": canonical_id, "representations": representations,
                        "different": different, "source_txt_available": txt is not None})

    @blueprint.get("/api/workbench/conversions")
    def catalog():
        return jsonify(conversion_catalog())

    @blueprint.post("/api/workbench/convert")
    def conversion():
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            abort(400, description="Supply a JSON object.")
        content = str(body.get("content", ""))
        if len(content) > MAX_INPUT:
            abort(400, description="Conversion input is limited to 250,000 characters.")
        try:
            return jsonify(convert(content, body.get("source", "auto"), body.get("target", "")))
        except ValueError as error:
            abort(400, description=str(error))

    return blueprint
