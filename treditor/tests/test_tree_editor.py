from __future__ import annotations

import pytest

import treditor.app as tree_editor


@pytest.fixture
def client():
    tree_editor.app.config.update(TESTING=True)
    tree_editor._documents.clear()
    tree_editor._search_index = None
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


def test_exact_poem_id_lookup_opens_its_document(client):
    response = client.get("/api/poems?q=mys.1.1")

    assert response.status_code == 200
    poem = response.get_json()
    assert poem["sentence_id"] == "MYS.1.1"
    assert poem["source"] == "trees"
    assert poem["document_id"] == "MYS_01"

    missing = client.get("/api/poems?q=NOT.A.POEM")
    assert missing.status_code == 404


def test_corpus_search_finds_text_across_all_documents(client):
    response = client.get("/api/search?q=ugonapar")

    assert response.status_code == 200
    payload = response.get_json()
    first = payload["results"][0]
    assert payload["total"] >= 1
    assert payload["page"] == 1
    assert payload["per_page"] == 25
    assert first["source"] == "text"
    assert first["document_id"] == "EN_01"
    assert first["sentence_id"] == "EN.1.1"
    assert "ugonapar" in first["preview"]
    assert "transcription" in first["matching_fields"]
    assert "_fields" not in first

    empty = client.get("/api/search").get_json()
    assert empty["results"] == []


def test_corpus_search_supports_scope_advanced_fields_and_pagination(client):
    scoped = client.get(
        "/api/search?q=ugonapar&sources=text&fields=transcription"
        "&match=whole&per_page=10&page=1"
    ).get_json()

    assert scoped["results"]
    assert all(result["source"] == "text" for result in scoped["results"])
    assert all(
        result["matching_fields"] == ["transcription"]
        for result in scoped["results"]
    )

    paged = client.get(
        "/api/search?q=no&fields=word_forms&match=exact&per_page=10&page=2"
    ).get_json()
    assert paged["total"] > 10
    assert paged["page"] == 2
    assert len(paged["results"]) <= 10


def test_tree_payload_uses_current_processing_text_and_script_tags(client):
    response = client.get("/api/utterances/text/EN_01/EN.1.1/tree")

    assert response.status_code == 200
    tree = response.get_json()
    assert tree["sentence_id"] == "EN.1.1"
    assert tree["raw_text"][0]["number"] == "1"
    assert tree["raw_text"][0]["kanji"]
    assert tree["raw_text"][0]["transcription"] == "ugonapar eru"
    assert [token["text"] for token in tree["raw_text"][0]["tokens"]] == [
        "ugonapar",
        "eru",
    ]
    assert tree["raw_text"][1]["tokens"][-1]["phon"] == "PHON"
    assert tree["stats"] == {"nodes": 21, "leaves": 11}
    kamu = next(node for node in walk(tree["roots"]) if node.get("form") == "kamu")
    assert kamu["tag"] == "N"
    assert kamu["phon"] == "LOG"
    assert "attributes" not in kamu
    assert "comments" not in tree


def test_uploaded_tree_source_is_available(client):
    documents = client.get("/api/documents").get_json()
    first_tree = documents[1]["documents"][0]

    response = client.get(
        f"/api/documents/trees/{first_tree['document_id']}"
    )

    assert response.status_code == 200
    assert len(response.get_json()) == first_tree["utterance_count"]


def test_text_tokens_expose_nlog_for_shared_text_and_tree_styling(client):
    tree = client.get("/api/utterances/text/EN_01/EN.1.3/tree").get_json()
    tokens = [
        token
        for sentence in tree["raw_text"]
        for token in sentence["tokens"]
    ]

    no = next(
        token
        for token in tokens
        if token["text"] == "no" and token["phon"] == "NLOG"
    )
    assert no["phon"] == "NLOG"


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

    advanced = client.get(
        f"/api/dictionary?q={results[0]['id'].lower()}"
        "&fields=lemma&match=exact"
    ).get_json()
    assert [entry["id"] for entry in advanced] == [results[0]["id"]]


def test_interface_exposes_activity_bar_search_tabs_and_new_defaults(client):
    html = client.get("/").get_data(as_text=True)
    css = client.get("/static/style.css").get_data(as_text=True)

    assert "<title>COJ Tree Editor</title>" in html
    assert "Current repository data" not in html
    assert "Browse current text and uploaded-tree XML" not in html
    assert 'id="data-summary"' in html
    assert 'id="toggle-navigation"' not in html
    assert 'id="activity-explorer"' in html
    assert 'id="activity-search"' in html
    assert 'id="activity-dictionary"' in html
    assert 'id="primary-sidebar"' in html
    assert 'id="global-search-form"' in html
    assert 'id="corpus-search-scope"' in html
    assert 'id="corpus-search-match"' in html
    assert 'id="search-pagination"' in html
    assert 'id="editor-tab-tree"' in html
    assert 'id="editor-tab-search"' in html
    assert 'id="editor-tab-dictionary"' in html
    assert 'id="toggle-text"' in html
    assert 'id="toggle-tree-panel"' in html
    assert "Tree diagram" not in html
    assert "Syntax tree" in html
    assert 'id="toggle-edit-mode"' in html
    assert 'data-text-layout="two-column"' in html
    assert 'placeholder="Filter or open MYS.1.1…"' in html
    assert 'id="tog-lemma">' in html
    assert 'id="tog-phon">' in html
    assert 'id="tog-tree-kanji" checked' in html
    assert 'id="tog-null" checked' in html
    assert 'id="tog-bottomup">' in html
    assert 'id="lemma-position"' in html
    assert 'id="slider-colw"' in html
    assert 'id="slider-scale"' in html
    assert 'id="expand-all"' in html
    assert 'id="toggle-fullscreen"' in html
    assert 'id="node-editor"' in html
    assert 'id="tab-dict"' not in html
    assert 'id="editor-page-dictionary"' in html
    assert 'id="dictionary-advanced"' in html
    assert 'id="dictionary-popup"' in html
    assert "CORPUS SOURCES" not in html
    assert "CURRENT CORPUS" not in html
    assert "--blue: #6f8ec9" in css.lower()


def test_interaction_script_supports_requested_workspace_behaviors(client):
    javascript = client.get("/static/app.js").get_data(as_text=True)
    css = client.get("/static/style.css").get_data(as_text=True)

    assert 'normalized.includes("PHON")' in javascript
    assert 'normalized === "NLOG"' in javascript
    assert "collapsedNodeIds" in javascript
    assert "/api/poems?q=" in javascript
    assert "/api/search?" in javascript
    assert "localStorage.setItem" in javascript
    assert "data-edit-node-id" in javascript
    assert "showEditorPage" in javascript
    assert "closeEditorPage" in javascript
    assert "setEditMode" in javascript
    assert "tree-node-controls" in javascript
    assert "interactive-form" in css
    assert "collection-node" in javascript
    assert "inline-passage-list" in javascript
    assert "position: sticky" in css
    assert "script-phon" in css
    assert "script-nlog" in css
    assert "sidebar-collapsed" in css
    assert ".activity-bar" in css
    assert ".editor-tabs" in css
    assert ".node-disclosure.expanded" in css
    assert ".tree-node-controls:hover" in css
    assert "appendHighlightedText" in javascript
    assert "corpusSearchParameters" in javascript
    assert "search-page-previous" in javascript
    assert "openDictionaryPopupEntry" in javascript
    assert ".dictionary-popup.collapsed" in css
    assert "#tab-tree.tree-collapsed" in css
