import copy
from concurrent.futures import ThreadPoolExecutor

import pytest

from coj.authoring import AuthoringStore, Conflict, dumps, loads, new_document, validate


def sample():
    doc = new_document()
    doc["text_id"] = "KK.67"
    doc["segments"]["segment-a"] = {"text": "多迦由久夜", "occurrences": ["occ-a", "occ-b"], "annotations": {}}
    doc["segment_order"] = ["segment-a"]
    for key in ("a", "b"):
        doc["occurrences"][f"occ-{key}"] = {"form": "taka", "lemma": "L007005", "script": "PHON", "parts": [], "annotations": {}}
        doc["syntax_nodes"][f"node-{key}"] = {"category": None, "occurrence": f"occ-{key}", "annotations": {}}
    doc["syntax_roots"] = ["node-a", "node-b"]
    doc["compatibility"] = {"legacy": {"comment": "retained", "phon_index": "2"}}
    return doc


def test_draft_roundtrip_and_deterministic_order():
    assert loads(dumps(new_document())) == new_document()
    doc = sample()
    content = dumps(doc)
    assert loads(content) == doc
    assert dumps(loads(content)) == content
    assert b"\\u" not in content and b"\r\n" not in content and content.endswith(b"\n")
    reversed_keys = dict(reversed(list(doc.items())))
    reversed_keys["occurrences"] = dict(reversed(list(doc["occurrences"].items())))
    assert dumps(reversed_keys) == content
    reversed_keys["syntax_roots"] = list(reversed(doc["syntax_roots"]))
    assert dumps(reversed_keys) != content


def test_identity_survives_lexical_edit_and_wrapping():
    doc = sample()
    doc["occurrences"]["occ-a"]["form"] = "edited"
    doc["syntax_nodes"]["branch"] = {"category": "VB-ADC", "children": ["node-a", "node-b"], "annotations": {}}
    doc["syntax_roots"] = ["branch"]
    restored = loads(dumps(doc))
    assert restored["segments"]["segment-a"]["occurrences"] == ["occ-a", "occ-b"]
    assert restored["syntax_nodes"]["node-a"]["occurrence"] == "occ-a"
    assert restored["occurrences"]["occ-a"]["form"] == "edited"
    assert restored["occurrences"]["occ-b"]["form"] == "taka"
    assert "form" not in restored["syntax_nodes"]["node-a"]


def test_unplaced_occurrence_and_source_only_draft():
    doc = sample()
    doc["syntax_nodes"] = {}
    doc["syntax_roots"] = []
    doc["occurrences"]["occ-a"].update(form="", lemma=None, script=None)
    assert loads(dumps(doc)) == doc


def test_recursive_composition_parts_and_coverage_preserved():
    doc = sample()
    doc["occurrences"]["occ-a"]["parts"] = [
        {"id": "part-a", "form": "ta", "script": "LOG", "annotations": {"phon_index": "2"}},
        {"id": "part-b", "form": "ka", "script": "PHON", "annotations": {}},
    ]
    doc["composition_groups"] = {
        "inner": {"children": [{"kind": "occurrence", "id": "occ-a"}], "lemma": None, "realization": {"rule": "concatenate"}, "annotations": {}},
        "outer": {"children": [{"kind": "group", "id": "inner"}, {"kind": "occurrence", "id": "occ-b"}], "lemma": None, "realization": {}, "annotations": {"review": "suggested"}},
    }
    doc["coverage"] = [{"segment": "segment-a", "occurrence": "occ-a", "part": "part-a", "source_start": 0, "source_end": 1, "annotations": {}}]
    assert loads(dumps(doc)) == doc


@pytest.mark.parametrize("damage", [
    lambda d: d.update(schema_version=2),
    lambda d: d.update(schema_version=True),
    lambda d: d["segment_order"].append("missing"),
    lambda d: d["segments"]["segment-a"]["occurrences"].append("occ-a"),
    lambda d: d["syntax_nodes"]["node-a"].update(occurrence="missing"),
    lambda d: d["syntax_nodes"]["node-b"].update(occurrence="occ-a"),
    lambda d: d["syntax_nodes"]["node-a"].update(form="duplicated"),
    lambda d: d["syntax_nodes"].update(cycle={"category": None, "children": ["cycle"], "annotations": {}}),
    lambda d: d["composition_groups"].update(cycle={"children": [{"kind": "group", "id": "cycle"}], "lemma": None, "realization": {}, "annotations": {}}),
    lambda d: d["annotations"].update(value=float("nan")),
])
def test_reject_invalid_structural_drafts(damage):
    doc = sample()
    damage(doc)
    with pytest.raises(ValueError):
        validate(doc)


def test_duplicate_json_keys_rejected():
    with pytest.raises(ValueError, match="Duplicate JSON key"):
        loads('{"schema_version": 1, "schema_version": 2}')


def test_atomic_store_noop_stale_write_and_new_file_conflict(tmp_path):
    store = AuthoringStore(tmp_path / "authoring")
    assert store.list_files() == [] and not store.root.exists()
    doc = sample()
    first = store.save("KK.67.syn.json", doc, None)
    opened = store.load("KK.67.syn.json")
    assert opened["document"] == doc and first["revision"] == opened["revision"]
    before = (store.root / first["filename"]).read_bytes()
    assert store.save(first["filename"], doc, first["revision"]) == first
    edited = copy.deepcopy(doc)
    edited["header"] = "new header"
    store.save(first["filename"], edited, first["revision"])
    with pytest.raises(Conflict):
        store.save(first["filename"], doc, first["revision"])
    with pytest.raises(Conflict):
        store.save(first["filename"], doc, None)
    assert store.load(first["filename"])["document"] == edited
    assert before != (store.root / first["filename"]).read_bytes()
    assert store.list_files() == ["KK.67.syn.json"]
    assert not list(store.root.glob(".authoring-*"))


def test_two_simultaneous_saves_only_one_wins(tmp_path):
    store = AuthoringStore(tmp_path)
    revision = store.save("draft.syn.json", sample(), None)["revision"]
    def save(header):
        doc = sample()
        doc["header"] = header
        try:
            store.save("draft.syn.json", doc, revision)
            return True
        except Conflict:
            return False
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(save, ["A", "B"])) == [False, True]


@pytest.mark.parametrize("filename", ["../escape.syn.json", "C:\\escape.syn.json", "draft.xml", "sub/file.syn.json", "CON", "CON.syn.json", "nul.syn.json", "COM1.syn.json", ""])
def test_confined_filenames(tmp_path, filename):
    with pytest.raises(ValueError):
        AuthoringStore(tmp_path).save(filename, new_document(), None)


def test_failed_replace_preserves_previous_file(tmp_path, monkeypatch):
    store = AuthoringStore(tmp_path)
    saved = store.save("draft.syn.json", sample(), None)
    before = (tmp_path / "draft.syn.json").read_bytes()
    def fail(*args):
        raise OSError("simulated failure")
    monkeypatch.setattr("coj.authoring.persistence.os.replace", fail)
    doc = sample()
    doc["header"] = "edit"
    with pytest.raises(OSError):
        store.save("draft.syn.json", doc, saved["revision"])
    assert (tmp_path / "draft.syn.json").read_bytes() == before
    assert not list(tmp_path.glob(".authoring-*"))


def test_group_realization_and_branch_link_do_not_duplicate_yield():
    doc = sample()
    doc["composition_groups"]["compound"] = {"children": [{"kind": "occurrence", "id": "occ-a"}, {"kind": "occurrence", "id": "occ-b"}], "lemma": None, "realization": {}, "annotations": {}}
    doc["syntax_nodes"] = {"composed": {"category": "N", "group": "compound", "annotations": {}}}
    doc["syntax_roots"] = ["composed"]
    assert loads(dumps(doc)) == doc
    doc["syntax_nodes"]["duplicate"] = {"category": None, "occurrence": "occ-a", "annotations": {}}
    doc["syntax_roots"].append("duplicate")
    with pytest.raises(ValueError, match="Duplicate lexical occurrence"):
        validate(doc)
    doc = sample()
    doc["composition_groups"]["compound"] = {"children": [{"kind": "occurrence", "id": "occ-a"}], "lemma": None, "realization": {}, "annotations": {}}
    doc["syntax_nodes"]["branch"] = {"category": "MK", "children": doc["syntax_roots"], "composition": "compound", "annotations": {}}
    doc["syntax_roots"] = ["branch"]
    assert loads(dumps(doc)) == doc
