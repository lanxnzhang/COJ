"""Version 2 Documents, entered input and one annotated hierarchy per Text."""
import json
import re
from uuid import uuid4


def identity():
    return str(uuid4())


def new_document(name="", document_id=None):
    return {"schema_version": 2, "id": document_id or identity(), "name": name,
            "texts": {}, "text_order": [], "compatibility": {}, "annotations": {}}


def new_text(text_id=""):
    return {"text_id": text_id, "passages": {}, "passage_order": [], "nodes": {},
            "roots": [], "links": {}, "historical_header": None,
            "compatibility": {}, "annotations": {}}


def initial_units(transcription):
    return [{"start": m.start(), "end": m.end()} for m in re.finditer(r"\S+", transcription)]


def new_passage(original="", transcription=""):
    return {"original": original, "transcription": transcription,
            "units": initial_units(transcription), "annotations": {}}


def compact(value):
    return "".join(value.split())


def reconcile_links(text):
    """Only provable spacing-only changes retain validity; never edit nodes.

    Ranges address compacted transcription in immutable original evidence.
    Uncertain changes keep that evidence and become saveable unresolved links.
    """
    for link in text["links"].values():
        passage = text["passages"].get(link["passage"])
        evidence = link["evidence"]
        if passage is None:
            link.update(status="unresolved", reason="Source passage removed; analysis retained.")
        elif passage["original"] != evidence["original"]:
            link.update(status="unresolved", reason="Original text changed; alignment needs review.")
        elif compact(passage["transcription"]) != compact(evidence["transcription"]):
            link.update(status="unresolved", reason="Transcription changed; analysis needs review.")
        else:
            link.update(status=evidence["status"], reason=evidence["reason"])
    return text


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fields(record, required, optional=()):
    require(isinstance(record, dict), "Records must be objects.")
    require(set(required) <= record.keys(), "Missing fields: " + ", ".join(sorted(set(required) - record.keys())))
    require(record.keys() <= set(required) | set(optional), "Unknown fields belong in annotations/compatibility.")


def string(value, label, nullable=False):
    require(isinstance(value, str) or (nullable and value is None), f"{label} must be text.")


def table(value, label):
    require(isinstance(value, dict) and len(value) <= 100000, f"Invalid or oversized {label} table.")
    require(all(isinstance(k, str) and 0 < len(k) <= 150 for k in value), "Invalid persistent identity.")


def references(values, records, label):
    require(isinstance(values, list), f"{label} must be an ordered list.")
    require(all(isinstance(v, str) and v in records for v in values), f"Dangling {label} reference.")
    require(len(values) == len(set(values)), f"Duplicate {label} reference.")


def validate(document):
    require(isinstance(document, dict), "Supply a complete authoring Document.")
    require(type(document.get("schema_version")) is int and document["schema_version"] == 2,
            "Unsupported schema. Version-1 drafts require reviewed conversion; automatic conversion is not supported.")
    fields(document, ("schema_version", "id", "name", "texts", "text_order", "compatibility", "annotations"))
    string(document["id"], "Document identity")
    require(bool(document["id"]), "Document identity is required.")
    string(document["name"], "Document name")
    table(document["texts"], "Texts")
    references(document["text_order"], document["texts"], "Text")
    require(set(document["text_order"]) == set(document["texts"]), "Every Text must be ordered.")
    for text in document["texts"].values():
        fields(text, new_text().keys())
        string(text["text_id"], "Text ID")
        string(text["historical_header"], "Historical header", True)
        for name in ("passages", "nodes", "links"):
            table(text[name], name)
        references(text["passage_order"], text["passages"], "passage")
        require(set(text["passage_order"]) == set(text["passages"]), "Every passage must be ordered.")
        for passage in text["passages"].values():
            fields(passage, ("original", "transcription", "units", "annotations"))
            string(passage["original"], "Original text")
            string(passage["transcription"], "Transcription")
            require(isinstance(passage["units"], list) and all(isinstance(u, dict) and set(u) == {"start", "end"}
                    and type(u["start"]) is int and type(u["end"]) is int for u in passage["units"])
                    and passage["units"] == initial_units(passage["transcription"]), "Initial boundaries must match entered spaces.")
            require(isinstance(passage["annotations"], dict), "Passage annotations must be an object.")
        parents = {}
        part_ids = set()
        for node_id, node in text["nodes"].items():
            fields(node, ("category", "lemma", "children", "form", "script", "parts", "annotations"))
            for key in ("category", "lemma", "form", "script"):
                string(node[key], key, True)
            references(node["children"], text["nodes"], "child")
            require(not node["children"] or node["form"] is None, "Internal forms must be derived.")
            require(isinstance(node["annotations"], dict), "Node annotations must be an object.")
            require(isinstance(node["parts"], list), "Writing parts must be ordered.")
            for part in node["parts"]:
                fields(part, ("id", "form", "script", "annotations"))
                string(part["id"], "Part identity")
                require(part["id"] and part["id"] not in part_ids, "Duplicate part identity.")
                part_ids.add(part["id"])
                string(part["form"], "Part form")
                string(part["script"], "Part script", True)
                require(isinstance(part["annotations"], dict), "Part annotations must be an object.")
            if node["parts"] and not node["children"]:
                require(node["form"] == "".join(p["form"] for p in node["parts"]), "Multipart form differs from its parts.")
            for child in node["children"]:
                require(child not in parents, "An annotated node has multiple parents.")
                parents[child] = node_id
        references(text["roots"], text["nodes"], "root")
        require(set(text["roots"]) == set(text["nodes"]) - set(parents), "Roots must cover the hierarchy exactly.")
        visited = set()
        stack = list(text["roots"])
        while stack:
            node_id = stack.pop()
            require(node_id not in visited, "Repeated node in hierarchy.")
            visited.add(node_id)
            stack.extend(text["nodes"][node_id]["children"])
        require(len(visited) == len(text["nodes"]), "Cycle in annotated hierarchy.")
        for link in text["links"].values():
            fields(link, ("passage", "node", "part", "start", "end", "evidence", "status", "reason"))
            string(link["passage"], "Passage identity")
            require(isinstance(link["node"], str) and link["node"] in text["nodes"], "Dangling analysis link.")
            if link["part"] is not None:
                require(link["part"] in [p["id"] for p in text["nodes"][link["node"]]["parts"]], "Dangling writing-part link.")
            evidence = link["evidence"]
            fields(evidence, ("original", "transcription", "status", "reason"))
            for key in ("original", "transcription", "reason"):
                string(evidence[key], "Alignment evidence")
            require(evidence["status"] in ("valid", "unresolved"), "Invalid evidence status.")
            require(type(link["start"]) is int and type(link["end"]) is int
                    and 0 <= link["start"] <= link["end"] <= len(compact(evidence["transcription"])), "Invalid evidence range.")
            require(link["status"] in ("valid", "unresolved"), "Invalid alignment status.")
            string(link["reason"], "Alignment reason")
            require(link["passage"] in text["passages"] or link["status"] == "unresolved", "Removed passage links must be unresolved.")
        expected = json.loads(json.dumps(text))
        reconcile_links(expected)
        require(expected["links"] == text["links"], "Check alignment impact before Save.")
        for name in ("annotations", "compatibility"):
            require(isinstance(text[name], dict), "Text extensions must be objects.")
    for name in ("annotations", "compatibility"):
        require(isinstance(document[name], dict), "Document extensions must be objects.")
    stack = [(document, 0)]
    while stack:
        value, depth = stack.pop()
        require(depth <= 100, "Annotation data is too deeply nested.")
        if isinstance(value, dict):
            require(all(isinstance(k, str) for k in value), "JSON keys must be strings.")
            stack.extend((v, depth + 1) for v in value.values())
        elif isinstance(value, list):
            stack.extend((v, depth + 1) for v in value)
        else:
            require(value is None or type(value) in (str, int, float, bool), "Unsupported JSON value.")
    try:
        json.dumps(document, allow_nan=False)
    except (TypeError, ValueError, RecursionError) as error:
        raise ValueError("Authoring data must contain finite JSON values.") from error
    return document
