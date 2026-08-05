from __future__ import annotations

from urllib.parse import urlencode

import pytest

import treditor.app as tree_editor
from coj.core.dictionary import DictEntry, Dictionary


@pytest.fixture
def client():
    tree_editor.app.config.update(TESTING=True)
    tree_editor._documents.clear()
    tree_editor._search_index = None
    tree_editor._search_index_signature = None
    tree_editor._lemma_frequency_cache = {}
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
    assert "ugonapar" in first["transcription"]
    assert first["kanji"]
    assert [segment["number"] for segment in first["text_segments"]] == [
        "1", "2", "3"
    ]
    assert first["text_segments"][0]["transcription"] == "ugonapar eru"
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


def test_corpus_search_indexes_lemma_ids_and_highlights_their_forms(client):
    response = client.get(
        "/api/search?q=l000530&fields=lemma_ids&match=exact"
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] > 0
    first = payload["results"][0]
    assert first["matching_fields"] == ["lemma_ids"]
    assert "to" in first["highlight_terms"]
    assert "to" in first["preview"].split()
    assert "_roots" not in first


def test_tgrep_search_supports_core_links_regex_negation_and_coj_fields(client):
    dominated = client.get(
        "/api/tgrep?q=IP-MAT%20%3C%3C%20NP&sources=text&per_page=10"
    )
    assert dominated.status_code == 200
    payload = dominated.get_json()
    assert payload["search_type"] == "tgrep2"
    assert payload["total"] > 0
    assert payload["results"][0]["matching_fields"] == ["syntax_tree"]
    assert payload["results"][0]["match_count"] >= 1
    assert payload["results"][0]["transcription"]
    assert "kanji" in payload["results"][0]
    assert payload["results"][0]["text_segments"]
    assert "_roots" not in payload["results"][0]

    multiple_links = client.get(
        "/api/tgrep?q=IP-MAT%20%3C%20IP-ARG%20%3C%20VB&sources=text"
    ).get_json()
    assert multiple_links["total"] > 0

    annotation = client.get(
        "/api/tgrep?q=lemma%3DL000530&sources=text"
    ).get_json()
    assert annotation["total"] > 0
    assert "to" in annotation["results"][0]["highlight_terms"]
    regex_negation = client.get(
        "/api/tgrep?q=%2FIP-.%2A%2F%20%21%3C%3C%20NP&sources=text"
    )
    assert regex_negation.status_code == 200
    assert regex_negation.get_json()["total"] > 0


def test_tgrep_search_supports_bracketed_same_node_predicates(client):
    simple_query = urlencode({
        "q": "[form=no & phon=PHON]",
        "sources": "text,trees",
    })
    simple = client.get(f"/api/tgrep?{simple_query}")
    assert simple.status_code == 200
    payload = simple.get_json()
    assert payload["total"] > 0
    assert all(
        result["highlight_terms"] == ["no"]
        for result in payload["results"]
    )

    nested_query = urlencode({
        "q": "NP << [form=no & phon=PHON]",
        "sources": "text,trees",
    })
    nested = client.get(f"/api/tgrep?{nested_query}")
    assert nested.status_code == 200
    assert nested.get_json()["total"] > 0

    description, clauses = tree_editor._parse_tgrep_query(
        "[form=no & phon=PHON]"
    )
    assert description == (("form", "no"), ("phon", "PHON"))
    assert clauses == []
    assert tree_editor._tgrep_node_matches(
        {"tag": "P", "form": "no", "phon": "PHON"}, description
    )
    assert not tree_editor._tgrep_node_matches(
        {"tag": "P", "form": "no", "phon": "NLOG"}, description
    )

    existing_query = urlencode({
        "q": "IP-MAT < IP-ARG & < VB",
        "sources": "text",
    })
    existing = client.get(f"/api/tgrep?{existing_query}")
    assert existing.status_code == 200
    assert existing.get_json()["total"] > 0


def test_tgrep_bracketed_predicates_return_clear_syntax_errors(client):
    missing_bracket = client.get(
        "/api/tgrep?" + urlencode({"q": "[form=no & phon=PHON"})
    )
    assert missing_bracket.status_code == 400
    assert "closing ']'" in missing_bracket.get_json()["error"]

    unbracketed = client.get(
        "/api/tgrep?" + urlencode({"q": "form=no & phon=PHON"})
    )
    assert unbracketed.status_code == 400
    assert "supported relationship" in unbracketed.get_json()["error"]


def test_tgrep_search_returns_clear_errors_for_unsupported_patterns(client):
    response = client.get("/api/tgrep?q=IP-MAT%20%3C%20%28NP%20%3C%20N%29")

    assert response.status_code == 400
    assert "node description" in response.get_json()["error"].lower()


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


def test_dictionary_search_exposes_all_tags_ranking_and_tgrep_frequency(client):
    tags = client.get("/api/dictionary/tags").get_json()
    tag_ids = {tag["id"] for tag in tags}
    assert {"lemma", ".FORM", ".KANA", ".NOTE", ".CORRESP"} <= tag_ids

    restricted = client.get(
        "/api/dictionary?q=negative&fields=lemma,.FORM,.KANA"
    ).get_json()
    assert restricted == []
    meanings = client.get(
        "/api/dictionary?q=negative&fields=.MEANING"
    ).get_json()
    assert meanings

    ranked = client.get(
        "/api/dictionary?q=kamu&fields=lemma,.FORM,.KANA"
    ).get_json()
    assert ranked
    assert ranked[0]["forms"][0] == "kamu"
    assert [entry["relevance"] for entry in ranked] == sorted(
        [entry["relevance"] for entry in ranked], reverse=True
    )
    assert isinstance(ranked[0]["kana"], list)
    assert isinstance(ranked[0]["frequency"], int)

    tgrep_results = client.get(
        f"/api/tgrep?q=lemma%3D{ranked[0]['id']}"
    ).get_json()
    assert ranked[0]["frequency"] == tgrep_results["total"]

    example = client.get(
        "/api/dictionary?q=L051650&fields=lemma&match=exact"
    ).get_json()
    assert len(example) == 1
    example_tgrep = client.get(
        "/api/tgrep?q=lemma%3DL051650"
    ).get_json()
    assert example[0]["frequency"] == example_tgrep["total"] == 266
    entry = client.get("/api/dictionary/L051650").get_json()
    assert entry["frequency"] == 266


def test_dictionary_entries_can_be_added_and_edited_safely(
    client, tmp_path, monkeypatch
):
    dictionary_path = tmp_path / "dictionary.xml"
    dictionary = Dictionary()
    seed = DictEntry("L900001")
    seed.set(".GLOSS", "SEED")
    seed.set(".MEANING", ["seed entry"])
    seed.set(".FORM", ["tane"])
    seed.set(".KANA", ["タネ"])
    seed.set(".POS", ["noun"])
    seed.set(".NOTE", ["test note"])
    dictionary.add(seed)
    dictionary.to_file(str(dictionary_path))
    monkeypatch.setattr(tree_editor, "DICT_PATH", dictionary_path)
    tree_editor._dictionary = None

    created = client.post("/api/dictionary", json={
        "id": "L900002",
        "fields": {
            ".GLOSS": ["NEW"],
            ".MEANING": ["new entry"],
            ".FORM": ["atarasi"],
            ".KANA": ["アタラシ"],
            ".POS": ["adjective"],
            ".NOTE": ["created in editor"],
        },
    })
    assert created.status_code == 201

    updated = client.put("/api/dictionary/L900002", json={
        "fields": {
            ".GLOSS": ["UPDATED"],
            ".MEANING": ["updated entry"],
            ".FORM": ["atarasi", "atarasiku"],
            ".KANA": ["アタラシ", "アタラシク"],
            ".POS": ["adjective"],
            ".NOTE": ["updated in editor"],
        },
    })
    assert updated.status_code == 200
    saved = Dictionary.from_file(str(dictionary_path)).get("L900002")
    assert saved is not None
    assert saved.get_first(".GLOSS") == "UPDATED"
    assert saved.get_all(".FORM") == ["atarasi", "atarasiku"]
    tree_editor._dictionary = None


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
    assert 'data-sidebar-view="dictionary"' in html
    assert 'id="primary-sidebar"' in html
    assert 'id="global-search-form"' in html
    assert 'id="corpus-search-scope"' in html
    assert 'id="corpus-search-match"' in html
    assert 'value="lemma_ids" checked' in html
    assert 'id="search-mode-text"' in html
    assert 'id="search-mode-tgrep"' in html
    assert 'id="tgrep-search-form"' in html
    assert 'id="tgrep-search-scope"' in html
    assert "TGrep2 pattern help" in html
    assert "[form=no &amp; phon=PHON]" in html
    assert "NP &lt;&lt; [form=no &amp; phon=PHON]" in html
    assert "lemma=L000530" in html
    assert 'id="search-pagination"' in html
    assert 'id="search-show-kanji"' in html
    assert 'id="search-show-sentence-numbers"' in html
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
    assert 'id="sidebar-dictionary"' in html
    assert 'id="new-dictionary-entry"' in html
    assert 'id="edit-dictionary-entry"' in html
    assert 'id="dictionary-entry-editor"' in html
    assert 'id="dictionary-field-options"' in html
    assert "Contains: query appears anywhere" in html
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
    assert "/api/tgrep?" in javascript
    assert 'setSearchMode("tgrep"' in javascript
    assert 'lemma_ids: "lemma IDs"' in javascript
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
    assert "updateSearchResultDisplay" in javascript
    assert "appendSearchResultText" in javascript
    assert "search-segment-number" in javascript
    assert "openDictionaryPopupEntry" in javascript
    assert '"lemma,.KANA,.FORM"' in javascript
    assert "openLemmaFrequency" in javascript
    assert "Frequency: ${entry.frequency.toLocaleString()}" in javascript
    assert '$("tgrep-search-scope").value = "text,trees"' in javascript
    assert "loadDictionaryTags" in javascript
    assert "dictionary-entry-form" in javascript
    assert ".dictionary-popup.collapsed" in css
    assert "#tab-tree.tree-collapsed" in css
    assert ".dictionary-result-pos" in css
    assert ".dictionary-result-gloss" in css
    assert ".dictionary-frequency" in css
    assert ".dictionary-result-kana" in css
    assert "color: #4d596f" in css
    assert ".corpus-search-kanji" in css
