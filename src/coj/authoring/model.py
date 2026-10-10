"""Version 1 authoring records. Lexical fields live only on occurrences.

Empty forms/categories and unplaced occurrences are valid drafts. References,
cycles and duplicate syntax yield are structural errors even in drafts.
Unknown scholarly/legacy information belongs in annotations/compatibility.
"""

import json


def new_document():
    return {"schema_version": 1, "text_id": "", "header": "",
            "segments": {}, "segment_order": [], "occurrences": {},
            "syntax_nodes": {}, "syntax_roots": [], "composition_groups": {},
            "coverage": [], "compatibility": {}, "annotations": {}}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fields(record, required, optional=()):
    require(isinstance(record, dict), "Records must be objects.")
    require(set(required) <= record.keys(), "Missing fields: " + ", ".join(sorted(set(required) - record.keys())))
    require(record.keys() <= set(required) | set(optional), "Unknown fields must be stored in annotations.")


def string(value, label, nullable=False):
    require(isinstance(value, str) or (nullable and value is None), f"{label} must be text{' or null' if nullable else ''}.")


def references(values, table, label):
    require(isinstance(values, list), f"{label} must be an ordered list.")
    require(all(isinstance(v, str) and v in table for v in values), f"Dangling {label} reference.")
    require(len(set(values)) == len(values), f"Duplicate {label} reference.")


def acyclic(table, edges, label):
    # Iterative DFS also accepts very deep legitimate trees without recursion.
    complete = set()
    for root in table:
        active = set()
        stack = [(root, False)]
        while stack:
            node, leaving = stack.pop()
            if leaving:
                active.remove(node)
                complete.add(node)
            elif node not in complete:
                require(node not in active, f"Cycle in {label}.")
                active.add(node)
                stack.append((node, True))
                stack.extend((child, False) for child in edges(node))


def validate(document):
    """Validate the complete model without normalizing or dropping information."""
    fields(document, new_document().keys())
    require(type(document["schema_version"]) is int and document["schema_version"] == 1,
            "Unsupported authoring schema version.")
    string(document["text_id"], "Text ID")
    string(document["header"], "Header")
    for name in ("segments", "occurrences", "syntax_nodes", "composition_groups"):
        table = document[name]
        require(isinstance(table, dict) and len(table) <= 10000, f"Invalid or oversized {name} table.")
        require(all(isinstance(key, str) and key and len(key) <= 100 for key in table), "Invalid persistent identity.")
    for name in ("annotations", "compatibility"):
        require(isinstance(document[name], dict), f"{name} must be an object.")
    occurrences, segments = document["occurrences"], document["segments"]
    for occurrence in occurrences.values():
        fields(occurrence, ("form", "lemma", "script", "parts", "annotations"))
        string(occurrence["form"], "Form")
        string(occurrence["lemma"], "Lemma", True)
        string(occurrence["script"], "Script", True)
        require(isinstance(occurrence["annotations"], dict), "Occurrence annotations must be an object.")
        require(isinstance(occurrence["parts"], list), "Parts must be an ordered list.")
        for part in occurrence["parts"]:
            fields(part, ("id", "form", "script", "annotations"))
            string(part["id"], "Part identity")
            require(bool(part["id"]), "Part identity is required.")
            string(part["form"], "Part form")
            string(part["script"], "Part script", True)
            require(isinstance(part["annotations"], dict), "Part annotations must be an object.")
        ids = [part["id"] for part in occurrence["parts"]]
        require(len(ids) == len(set(ids)), "Duplicate part identity.")
        if occurrence["parts"]:
            require(occurrence["form"] == "".join(p["form"] for p in occurrence["parts"]), "Multipart form disagrees with its parts.")
    for segment in segments.values():
        fields(segment, ("text", "occurrences", "annotations"))
        string(segment["text"], "Source text")
        references(segment["occurrences"], occurrences, "source occurrence")
        require(isinstance(segment["annotations"], dict), "Segment annotations must be an object.")
    references(document["segment_order"], segments, "segment")
    require(set(document["segment_order"]) == set(segments), "Every segment must be ordered.")
    nodes = document["syntax_nodes"]
    parents = {}
    for key, node in nodes.items():
        fields(node, ("category", "annotations"), ("occurrence", "group", "children", "composition"))
        string(node["category"], "Category", True)
        require(isinstance(node["annotations"], dict), "Syntax annotations must be an object.")
        require(sum(field in node for field in ("occurrence", "group", "children")) == 1,
                "Syntax nodes need an occurrence, group realization or ordered children.")
        if "occurrence" in node:
            ref = node["occurrence"]
            require(isinstance(ref, str) and ref in occurrences, "Dangling syntax occurrence reference.")
        elif "children" in node:
            references(node["children"], nodes, "syntax child")
            for child in node["children"]:
                require(child not in parents, "Syntax node has multiple parents.")
                parents[child] = key
    references(document["syntax_roots"], nodes, "syntax root")
    require(set(document["syntax_roots"]) == set(nodes) - set(parents), "Syntax roots must cover the draft forest exactly.")
    acyclic(nodes, lambda key: nodes[key].get("children", []), "syntax")
    groups = document["composition_groups"]
    for group in groups.values():
        fields(group, ("children", "lemma", "realization", "annotations"))
        string(group["lemma"], "Group lemma", True)
        require(isinstance(group["realization"], dict) and isinstance(group["annotations"], dict), "Group realization/annotations must be objects.")
        require(isinstance(group["children"], list), "Group children must be ordered.")
        seen = set()
        for child in group["children"]:
            fields(child, ("kind", "id"))
            require(child["kind"] in ("occurrence", "group") and isinstance(child["id"], str), "Invalid composition reference.")
            table = occurrences if child["kind"] == "occurrence" else groups
            require(child["id"] in table, "Dangling composition reference.")
            pair = (child["kind"], child["id"])
            require(pair not in seen, "Duplicate composition child.")
            seen.add(pair)
    acyclic(groups, lambda key: [c["id"] for c in groups[key]["children"] if c["kind"] == "group"], "composition")
    group_yields = {}
    for root in groups:
        stack = [(root, False)]
        while stack:
            key, leaving = stack.pop()
            if key in group_yields:
                continue
            if not leaving:
                stack.append((key, True))
                stack.extend((c["id"], False) for c in groups[key]["children"] if c["kind"] == "group")
            else:
                leaves = []
                for child in groups[key]["children"]:
                    leaves.extend([child["id"]] if child["kind"] == "occurrence" else group_yields[child["id"]])
                require(len(leaves) == len(set(leaves)), "Duplicate occurrence in composed realization.")
                group_yields[key] = leaves
    used_occurrences = set()
    for node in nodes.values():
        for field in ("group", "composition"):
            if field in node:
                require(isinstance(node[field], str) and node[field] in groups, "Dangling syntax composition reference.")
        leaves = [node["occurrence"]] if "occurrence" in node else group_yields.get(node.get("group"), [])
        require(not used_occurrences.intersection(leaves), "Duplicate lexical occurrence in syntax yield.")
        used_occurrences.update(leaves)
    require(isinstance(document["coverage"], list), "Coverage must be an ordered list.")
    for coverage in document["coverage"]:
        fields(coverage, ("segment", "occurrence", "source_start", "source_end", "annotations"), ("part",))
        require(isinstance(coverage["segment"], str) and coverage["segment"] in segments, "Dangling coverage segment.")
        require(isinstance(coverage["occurrence"], str) and coverage["occurrence"] in occurrences, "Dangling coverage occurrence.")
        require(coverage["occurrence"] in segments[coverage["segment"]]["occurrences"], "Coverage must agree with segment membership.")
        start, end = coverage["source_start"], coverage["source_end"]
        require(type(start) is int and type(end) is int and 0 <= start <= end <= len(segments[coverage["segment"]]["text"]), "Invalid source coverage range.")
        require(isinstance(coverage["annotations"], dict), "Coverage annotations must be an object.")
        if "part" in coverage:
            require(coverage["part"] in [p["id"] for p in occurrences[coverage["occurrence"]]["parts"]], "Dangling coverage part.")
    # Also checks extension data for non-JSON values and non-finite numbers.
    stack = [(document, 0)]
    while stack:
        value, depth = stack.pop()
        require(depth <= 100, "Annotation data is too deeply nested.")
        if isinstance(value, dict):
            require(all(isinstance(key, str) for key in value), "JSON object keys must be strings.")
            stack.extend((child, depth + 1) for child in value.values())
        elif isinstance(value, list):
            stack.extend((child, depth + 1) for child in value)
        else:
            require(value is None or type(value) in (str, int, float, bool), "Unsupported JSON value type.")
    try:
        json.dumps(document, allow_nan=False)
    except (TypeError, ValueError, RecursionError) as error:
        raise ValueError("Authoring data must contain finite JSON values.") from error
    return document
