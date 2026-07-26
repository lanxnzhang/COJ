from __future__ import annotations

import pytest

import treditor.app as tree_editor


@pytest.fixture
def client():
    tree_editor.app.config.update(TESTING=True)
    tree_editor._documents.clear()
    return tree_editor.app.test_client()


def walk(nodes):
    for node in nodes:
        yield node
        yield from walk(node.get("children", []))


def test_documents_are_grouped_by_current_data_source(client):
    response = client.get("/api/documents")

    assert response.status_code == 200
    groups = response.get_json()
    assert [group["id"] for group in groups] == ["text", "trees"]
    assert [group["label"] for group in groups] == [
        "Texts under editing",
        "Uploaded trees",
    ]
    en = next(
        document
        for document in groups[0]["documents"]
        if document["document_id"] == "EN_01"
    )
    assert en["id"] == "text/EN_01"
    assert en["utterance_count"] > 0


def test_document_index_uses_canonical_passage_ids(client):
    response = client.get("/api/documents/text/EN_01")

    assert response.status_code == 200
    passages = response.get_json()
    assert passages[0]["sentence_id"] == "EN.1.1"
    assert passages[0]["token_count"] == 11
    assert passages[0]["raw_sentence_count"] == 3


def test_tree_payload_uses_current_processing_text_and_metadata(client):
    response = client.get(
        "/api/utterances/text/EN_01/EN.1.1/tree"
    )

    assert response.status_code == 200
    tree = response.get_json()
    assert tree["sentence_id"] == "EN.1.1"
    assert tree["raw_text"][0] == {
        "number": "1",
        "kanji": "侍",
        "transcription": "ugonapar eru",
    }
    assert tree["stats"] == {"nodes": 21, "leaves": 11}
    kamu = next(node for node in walk(tree["roots"]) if node.get("form") == "kamu")
    assert kamu["tag"] == "N"
    assert kamu["attributes"]["index"] == "1"
    assert kamu["attributes"]["inferred_index"] == "1"


def test_uploaded_tree_source_is_available(client):
    documents = client.get("/api/documents").get_json()
    first_tree = documents[1]["documents"][0]

    response = client.get(
        f"/api/documents/trees/{first_tree['document_id']}"
    )

    assert response.status_code == 200
    assert len(response.get_json()) == first_tree["utterance_count"]


def test_dictionary_uses_current_multi_value_shape(client):
    search = client.get("/api/dictionary?q=kamu")

    assert search.status_code == 200
    results = search.get_json()
    assert results
    assert isinstance(results[0]["pos"], list)

    entry = client.get(f"/api/dictionary/{results[0]['id']}")
    assert entry.status_code == 200
    fields = entry.get_json()["fields"]
    form = next(field for field in fields if field["tag"] == ".FORM")
    assert isinstance(form["values"], list)

    lowercase_id = client.get(
        f"/api/dictionary?q={results[0]['id'].lower()}"
    ).get_json()
    assert lowercase_id[0]["id"] == results[0]["id"]


def test_interface_uses_blue_theme_and_tree_editor_identity(client):
    html = client.get("/").get_data(as_text=True)
    css = client.get("/static/style.css").get_data(as_text=True)

    assert "<title>COJ Tree Editor</title>" in html
    assert "Current repository data" in html
    assert 'id="raw-text-lines"' in html
    assert 'id="tog-meta"' in html
    assert "--blue: #6f8ec9" in css.lower()
