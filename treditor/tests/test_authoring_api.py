import copy

from flask import Flask, jsonify
import pytest
from werkzeug.exceptions import HTTPException

from coj.authoring import dumps, new_document
from treditor.authoring import create_blueprint
import treditor.app as editor


@pytest.fixture
def client(tmp_path):
    app = Flask(__name__)
    app.config.update(TESTING=True)
    app.register_blueprint(create_blueprint(tmp_path / "authoring"))
    @app.errorhandler(HTTPException)
    def error_handler(error):
        return jsonify(error=error.description), error.code
    return app.test_client()


def test_create_close_reopen_and_revision_conflict(client):
    assert client.get("/api/authoring/files").json == []
    doc = new_document()
    response = client.put("/api/authoring/files/KK.67.syn.json", json={"document": doc, "expected_revision": None})
    assert response.status_code == 200
    opened = client.get("/api/authoring/files/KK.67.syn.json")
    assert opened.json["document"] == doc
    assert client.get("/api/authoring/files").json == ["KK.67.syn.json"]
    doc["name"] = "edited"
    assert client.put("/api/authoring/files/KK.67.syn.json", json={"document": doc, "expected_revision": opened.json["revision"]}).status_code == 200
    assert client.put("/api/authoring/files/KK.67.syn.json", json={"document": doc, "expected_revision": opened.json["revision"]}).status_code == 409


def test_validation_and_no_partial_writes(client):
    assert client.post("/api/authoring/validate", json={"content": dumps(new_document()).decode("utf-8")}).status_code == 200
    assert client.post("/api/authoring/validate", json={"content": "{not json"}).status_code == 400
    assert client.put("/api/authoring/files/bad.syn.json", json={"document": {}, "expected_revision": None}).status_code == 400
    assert client.put("/api/authoring/files/bad.xml", json={"document": new_document(), "expected_revision": None}).status_code == 400
    assert client.put("/api/authoring/files/draft.syn.json", json={"document": new_document()}).status_code == 400
    assert client.get("/api/authoring/files").json == []
    assert client.get("/api/authoring/files/missing.syn.json").status_code == 404


def test_existing_shell_includes_editing_after_workbench():
    html = editor.app.test_client().get("/").get_data(as_text=True)
    assert html.index('id="activity-workbench"') < html.index('id="activity-editing"') < html.index('</nav>')
    assert 'data-open-editor="editing"' in html
    for name in ("sidebar-editing", "editor-tab-editing"):
        assert f'id="{name}"' in html
    assert '/static/editing-state.js' in html and '/static/editing.js' in html
    assert 'id="editing-sidebar-controls"' in html
    assert 'Add source segments, enter transcription components' not in html



def test_corpus_open_draft_save_reopen_leaves_originals_unchanged(tmp_path):
    from pathlib import Path
    from coj.authoring.model import reconcile_links
    root = Path(__file__).resolve().parents[2] / "data"
    folder = tmp_path / "xml" / "trees"
    folder.mkdir(parents=True)
    original = (root / "xml" / "trees" / "BS.xml").read_bytes()
    (folder / "BS.xml").write_bytes(original)
    app = Flask(__name__)
    app.register_blueprint(create_blueprint(tmp_path / "authoring"))
    client = app.test_client()
    listed = client.get("/api/authoring/corpus").json
    assert listed[0]["name"] == "BS" and len(listed[0]["texts"]) > 1
    doc = client.get("/api/authoring/corpus/trees:BS").json["document"]
    text = doc["texts"][doc["text_order"][0]]
    old_nodes = copy.deepcopy(text["nodes"])
    passage = text["passage_order"].pop(0)
    del text["passages"][passage]
    reconcile_links(text)
    response = client.put("/api/authoring/files/BS.syn.json", json={"document": doc, "expected_revision": None})
    assert response.status_code == 200
    assert client.get("/api/authoring/files/BS.syn.json").json["document"] == doc
    assert text["nodes"] == old_nodes
    assert (folder / "BS.xml").read_bytes() == original
    assert client.get("/api/authoring/corpus/trees:missing").status_code == 404


def test_version_one_is_rejected_without_writing(client):
    assert client.post("/api/authoring/validate", json={"content": '{"schema_version": 1}'}).status_code == 400
    assert client.get("/api/authoring/files").json == []
