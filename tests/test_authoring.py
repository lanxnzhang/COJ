import copy
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

from coj.authoring import AuthoringStore, Conflict, dumps, loads, new_document, new_passage, new_text, validate
from coj.authoring.legacy import LegacyCorpus, make_link
from coj.authoring.model import reconcile_links


def sample():
    doc = new_document("KK", "document-a")
    text = new_text("KK.67")
    doc["texts"]["text-a"] = text
    doc["text_order"] = ["text-a"]
    text["passages"]["passage-a"] = new_passage("多迦由久夜", "taka yuku ya")
    text["passage_order"] = ["passage-a"]
    text["nodes"]["node-a"] = {"category": "VB-ADC", "lemma": "L030996a", "children": [],
        "form": "takayukuya", "script": None, "parts": [], "annotations": {}}
    text["roots"] = ["node-a"]
    text["links"]["link-a"] = make_link("passage-a", "node-a", None, text["passages"]["passage-a"], 0, 10)
    return doc


def test_ordered_multitext_deterministic_roundtrip():
    doc = sample()
    doc["texts"]["text-b"] = new_text("KK.67")  # Scholarly IDs may repeat.
    doc["text_order"].append("text-b")
    content = dumps(doc)
    assert loads(content) == doc
    assert dumps(loads(content)) == content
    assert b"\\u" not in content and b"\r\n" not in content and content.endswith(b"\n")
    reversed_keys = dict(reversed(list(doc.items())))
    reversed_keys["texts"] = dict(reversed(list(doc["texts"].items())))
    assert dumps(reversed_keys) == content
    reversed_keys["text_order"] = list(reversed(doc["text_order"]))
    assert dumps(reversed_keys) != content


def test_source_only_draft_and_refinement_keeps_identity():
    doc = sample()
    text = doc["texts"]["text-a"]
    text["nodes"]["child"] = {"category": None, "lemma": None, "children": [], "form": "takayukuya",
        "script": None, "parts": [], "annotations": {}}
    text["nodes"]["node-a"].update(children=["child"], form=None)
    assert loads(dumps(doc))["texts"]["text-a"]["roots"] == ["node-a"]
    text.update(nodes={}, roots=[], links={})
    assert loads(dumps(doc)) == doc


def test_source_edits_preserve_analysis_evidence_and_orphans():
    doc = sample()
    text = doc["texts"]["text-a"]
    nodes, evidence = copy.deepcopy(text["nodes"]), copy.deepcopy(text["links"]["link-a"]["evidence"])
    text["passages"]["passage-a"] = new_passage("多迦由久夜", "taka  yukuya")
    reconcile_links(text)
    assert text["links"]["link-a"]["status"] == "valid"
    text["passages"]["passage-a"] = new_passage("多迦由久夜", "taka changed ya")
    reconcile_links(text)
    assert text["links"]["link-a"]["status"] == "unresolved"
    assert loads(dumps(doc)) == doc
    del text["passages"]["passage-a"]
    text["passage_order"] = []
    reconcile_links(text)
    assert "removed" in text["links"]["link-a"]["reason"]
    assert text["nodes"] == nodes and text["links"]["link-a"]["evidence"] == evidence
    assert loads(dumps(doc)) == doc


@pytest.mark.parametrize("damage", [
    lambda d: d.update(schema_version=1),
    lambda d: d.update(schema_version=True),
    lambda d: d["text_order"].append("missing"),
    lambda d: d["texts"]["text-a"]["passage_order"].append("passage-a"),
    lambda d: d["texts"]["text-a"]["nodes"]["node-a"].update(children=["node-a"], form=None),
    lambda d: d["texts"]["text-a"]["links"]["link-a"].update(node="missing"),
    lambda d: d["texts"]["text-a"]["links"]["link-a"].update(end=999),
    lambda d: d["texts"]["text-a"]["passages"]["passage-a"].update(transcription="edited"),
    lambda d: d["annotations"].update(value=float("nan")),
])
def test_reject_invalid_drafts(damage):
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
    first = store.save("KK.syn.json", doc, None)
    opened = store.load("KK.syn.json")
    assert opened["document"] == doc and first["revision"] == opened["revision"]
    assert store.save(first["filename"], doc, first["revision"]) == first
    edited = copy.deepcopy(doc)
    edited["name"] = "new display name"
    store.save(first["filename"], edited, first["revision"])
    with pytest.raises(Conflict):
        store.save(first["filename"], doc, first["revision"])
    with pytest.raises(Conflict):
        store.save(first["filename"], doc, None)
    assert store.load(first["filename"])["document"] == edited
    assert not list(store.root.glob(".authoring-*"))


def test_two_simultaneous_saves_only_one_wins(tmp_path):
    store = AuthoringStore(tmp_path)
    revision = store.save("draft.syn.json", sample(), None)["revision"]
    def save(name):
        doc = sample()
        doc["name"] = name
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
    doc["name"] = "edit"
    with pytest.raises(OSError):
        store.save("draft.syn.json", doc, saved["revision"])
    assert (tmp_path / "draft.syn.json").read_bytes() == before
    assert not list(tmp_path.glob(".authoring-*"))


@pytest.mark.parametrize("key", ["trees:BS", "trees:KK", "trees:MYS_04", "text:SM_15"])
def test_real_corpus_complete_readonly_adapter(key):
    root = Path(__file__).resolve().parents[1] / "data"
    corpus = LegacyCorpus(root)
    before = {path: path.read_bytes() for path in corpus.paths().values() if path.stem == key.split(":")[1]}
    doc = corpus.open(key)
    assert doc == corpus.open(key)
    assert loads(dumps(doc)) == doc
    assert len(doc["texts"]) > 1
    for text in doc["texts"].values():
        assert text["compatibility"]["original_block_xml"]
        for link in text["links"].values():
            assert link["node"] in text["nodes"]
    assert all(path.read_bytes() == content for path, content in before.items())
    if key == "trees:MYS_04":
        text = next(t for t in doc["texts"].values() if t["text_id"] == "MYS.4.619")
        node = next(n for n in text["nodes"].values() if n["form"] == "ipaku")
        assert [(p["form"], p["script"]) for p in node["parts"]] == [("ipa", "LOG"), ("ku", "PHON")]
    if key == "text:SM_15":
        assert [t["text_id"] for t in doc["texts"].values()].count("SM.15.1") == 2
