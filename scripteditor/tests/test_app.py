from __future__ import annotations

import xml.etree.ElementTree as ET

import pytest

import scripteditor.app as editor_app
from coj.core.corpus import CorpusDocument
from coj.core.dictionary import Dictionary, DictEntry
from coj.core.kana import phonemic_to_kana


@pytest.fixture
def client():
    editor_app.app.config.update(TESTING=True)
    editor_app._manual_id_reservations.clear()
    return editor_app.app.test_client()


def make_run(tmp_path, run_id="testrun"):
    run_dir = tmp_path / run_id
    (run_dir / "data" / "text").mkdir(parents=True)
    (run_dir / "data" / "dict").mkdir(parents=True)
    (run_dir / "output").mkdir()
    Dictionary().to_file(str(run_dir / "data" / "dict" / "dictionary.xml"))
    return run_dir


def test_document_scope_is_layered(client):
    response = client.get("/api/documents")
    assert response.status_code == 200
    groups = response.get_json()
    assert [group["label"] for group in groups] == [
        "Texts under editing",
        "Uploaded trees",
    ]

    en = next(node for node in groups[0]["children"] if node["label"] == "EN")
    en_01 = next(node for node in en["children"] if node["label"] == "EN 01")
    assert en_01["value"] == "text/EN_01.xml"
    assert en_01["children"][0]["label"] == "EN.1.1"
    assert en_01["children"][0]["value"] == "text/EN_01.xml#EN.1.1"

    bs = next(node for node in groups[1]["children"] if node["label"] == "BS")
    assert bs["value"] == "trees/BS.xml"
    assert bs["children"][0]["label"] == "BS.1"


def test_partial_scope_writes_only_selected_passage(tmp_path):
    xml_root = tmp_path / "xml"
    source_dir = xml_root / "text"
    (xml_root / "trees").mkdir(parents=True)
    source_dir.mkdir()
    source = source_dir / "EN_01.xml"
    CorpusDocument.from_text(
        '=N(" kamu ")\nIP-MAT,N,LOG,kamu\nID,1_EN_01\n\n'
        '=N(" nusi ")\nIP-MAT,N,LOG,nusi\nID,2_EN_01\n',
        filename="EN_01.txt",
    ).to_file(str(source))
    destination = tmp_path / "selected"
    destination.mkdir()

    selected = editor_app._prepare_selected_documents(
        xml_root, destination, ["text/EN_01.xml#EN.1.2"]
    )

    assert selected == ["text/EN_01.xml#EN.1.2"]
    blocks = ET.parse(destination / "EN_01.xml").getroot().findall("block")
    assert [block.get("id") for block in blocks] == ["EN.1.2"]


def test_unconfirmed_new_entry_selection_is_excluded(client, tmp_path, monkeypatch):
    monkeypatch.setattr(editor_app, "RUNS", tmp_path)
    run_dir = tmp_path / "testrun"
    (run_dir / "data" / "text").mkdir(parents=True)
    (run_dir / "data" / "dict").mkdir(parents=True)
    source = run_dir / "data" / "text" / "EN_01.xml"
    CorpusDocument.from_text(
        '=N(" kamu ")\nIP-MAT,N,LOG,kamu\nID,1_EN_01\n',
        filename="EN_01.txt",
    ).to_file(str(source))
    Dictionary().to_file(str(run_dir / "data" / "dict" / "dictionary.xml"))

    response = client.post("/api/runs/testrun/finalize", json={
        "lines": [{
            "reviewId": "result-0",
            "file": "EN_01.xml",
            "utterance": "EN.1.1",
            "position": 1,
            "before": "IP-MAT,N,LOG,kamu",
            "lemma": "L090000",
            "confirmed": True,
        }],
        "dictionary": [{
            "id": "L090000",
            "category": "added",
            "fields": [{ "tag": ".FORM", "values": ["kamu"] }],
            "confirmed": False,
            "manual": True,
        }],
    })

    assert response.status_code == 200
    result = response.get_json()
    assert result["confirmed_lines"] == 0
    assert result["excluded_lines"] == 1
    assert result["issues"][0]["code"] == "unconfirmed-entry"
    final_doc = CorpusDocument.from_file(str(run_dir / "final" / "EN_01.xml"))
    assert final_doc[0].corpus_lines()[0].lemma_id is None


def test_review_ui_uses_global_controls(client):
    html = client.get("/").get_data(as_text=True)
    assert 'id="add-global-entry"' in html
    assert 'id="select-page"' in html
    assert 'id="select-dictionary-page"' in html
    assert 'id="dictionary-filter-source"' in html
    assert 'id="generate-entry-id"' in html
    assert 'id="generate-entry-kana"' in html
    assert "<h2>Dictionary</h2>" in html
    assert "Full revised entry" not in html
    assert "Dictionary reader</h2>" not in html
    assert "Manual review" not in html
    assert "Confirm selected category" not in html
    assert "Clear confirmations" not in html


def test_dictionary_tags_include_known_and_observed_tags(client):
    response = client.get("/api/dictionary/tags")
    assert response.status_code == 200
    tags = response.get_json()
    assert ".FORM" in tags
    assert ".KANA" in tags
    assert tags == sorted(set(tags))


def test_manual_id_generation_respects_start_and_machine_output(
    client, tmp_path, monkeypatch
):
    monkeypatch.setattr(editor_app, "RUNS", tmp_path)
    run_dir = make_run(tmp_path)
    machine_dictionary = Dictionary()
    machine_dictionary.add(DictEntry.blank("L090000", form="kamu"))
    machine_dictionary.to_file(
        str(run_dir / "output" / "dictionary_processed.xml")
    )

    response = client.post(
        "/api/runs/testrun/dictionary/suggest-id",
        json={"start": 90000},
    )

    assert response.status_code == 200
    assert response.get_json()["id"] == "L090001"


def test_check_id_warns_about_machine_generated_entry(
    client, tmp_path, monkeypatch
):
    monkeypatch.setattr(editor_app, "RUNS", tmp_path)
    run_dir = make_run(tmp_path)
    machine_dictionary = Dictionary()
    machine_dictionary.add(DictEntry.blank("L090000", form="kamu"))
    machine_dictionary.to_file(
        str(run_dir / "output" / "dictionary_processed.xml")
    )

    response = client.get(
        "/api/runs/testrun/dictionary/check-id/N090000"
    )

    assert response.status_code == 200
    result = response.get_json()
    assert result["conflict"] is True
    assert result["conflicts"] == ["L090000"]


def test_generate_kana_uses_each_submitted_form(client, tmp_path, monkeypatch):
    monkeypatch.setattr(editor_app, "RUNS", tmp_path)
    make_run(tmp_path)

    response = client.post(
        "/api/runs/testrun/dictionary/generate-kana",
        json={"forms": ["kamu", "nusi"]},
    )

    assert response.status_code == 200
    assert response.get_json()["values"] == [
        phonemic_to_kana("kamu"),
        phonemic_to_kana("nusi"),
    ]


def test_finalize_rejects_overlapping_reviewed_entry_numbers(
    client, tmp_path, monkeypatch
):
    monkeypatch.setattr(editor_app, "RUNS", tmp_path)
    make_run(tmp_path)

    response = client.post("/api/runs/testrun/finalize", json={
        "lines": [],
        "dictionary": [
            {
                "id": "L090000",
                "category": "added",
                "fields": [{"tag": ".FORM", "values": ["kamu"]}],
                "confirmed": True,
            },
            {
                "id": "N090000",
                "category": "added",
                "fields": [{"tag": ".FORM", "values": ["nusi"]}],
                "confirmed": True,
            },
        ],
    })

    assert response.status_code == 409
    assert "Numeric ID conflict" in response.get_json()["error"]
