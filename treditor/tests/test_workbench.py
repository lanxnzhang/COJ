from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

import treditor.app as editor
from treditor.workbench import original_txt, parse_text
from treditor.workbench_conversion import convert


ROOT = Path(__file__).resolve().parents[2]
TXT = "ID,BS.1\nCP,N,PHON,L000001,mi"


@pytest.fixture
def client():
    editor.app.config.update(TESTING=True)
    return editor.app.test_client()


def result(text, source, target):
    return convert(text, source, target)


def output(value):
    return "".join(segment["text"] for segment in value["segments"])


def test_txt_xml_single_text_roundtrip():
    parsed = parse_text(TXT)
    assert parsed["sentence_id"] == "BS.1"
    restored = parse_text(parsed["generated"])
    assert restored["sentence_id"] == "BS.1"
    assert "L000001" in restored["generated"]


@pytest.mark.parametrize("content,format_name", [
    ("", "auto"), ("<document/>", "xml"),
    ("<document><block/><block/></document>", "xml"),
    ('<!DOCTYPE block [<!ENTITY x "test">]><block>&x;</block>', "xml"),
    (TXT + "\n\nID,BS.2\nCP,N,PHON,L000002,no", "txt"),
    ("ID,BS.1", "txt"),
])
def test_reject_invalid_tree_input(content, format_name):
    with pytest.raises(ValueError):
        parse_text(content, format_name)


def test_original_source_is_not_reconstructed():
    path = ROOT / "data/txt/trees/MYS_01.txt"
    source = original_txt(path, "MYS.1.1")
    assert source and "ID,MYS.1.1" in source
    assert source in path.read_text(encoding="utf-8")


def test_corpus_loading_and_parse_are_read_only(client):
    paths = [ROOT / "data/txt/trees/MYS_01.txt", ROOT / "data/xml/trees/MYS_01.xml"]
    before = [path.read_bytes() for path in paths]
    response = client.get("/api/workbench/text?id=MYS.1.1")
    assert response.status_code == 200
    data = response.get_json()
    assert data["representations"][0]["origin"] == "Source TXT"
    assert data["representations"][1]["origin"] == "Stored XML"
    parsed = client.post("/api/workbench/parse", json={
        "content": data["representations"][0]["content"], "format": "txt",
    })
    assert parsed.status_code == 200
    assert parsed.get_json()["roots"]
    assert [path.read_bytes() for path in paths] == before


def test_fields_and_distinction_labels_are_preserved(client):
    xml = '<block id="BS.1"><N index="5" form="mi" lemma="L000035" phon="PHON" phon_index="2"/></block>'
    node = client.post("/api/workbench/parse", json={"content": xml}).get_json()["roots"][0]
    assert node["annotations"] == {"index": "5", "phon_index": "2"}
    assert node["form"] == "mi"


def test_api_rejects_malformed_payload(client):
    for endpoint in ("parse", "convert"):
        assert client.post(f"/api/workbench/{endpoint}", json=[1]).status_code == 400
    assert client.get("/api/workbench/text?id=NOT.A.TEXT").status_code == 404


def test_fw_and_whitespace_preservation():
    converted = result("kwi\tno\nmi　", "fw", "historical-katakana")
    assert output(converted) == "キ\tノ\nミ　"
    reverse = result("キエコ", "historical-katakana", "fw")
    assert output(reverse) == "kieko"
    assert all(segment["kind"] == "ambiguous" for segment in reverse["segments"])
    assert reverse["segments"][0]["alternatives"] == ["kwi", "ki"]
    assert reverse["segments"][0]["rule"] == "fw_defaults"


def test_modern_readings_and_uncertainty():
    assert output(result("shin'ya gakkō", "hepburn", "hiragana")) == "しんや がっ□"
    assert output(result("シンヤ ガッコー", "katakana", "hepburn")) == "shin'ya gakkō"
    ambiguous = result("ji o", "hepburn", "hiragana")
    assert output(ambiguous) == "□ □"
    assert ambiguous["segments"][0]["alternatives"] == ["じ", "ぢ"]
    long_vowel = result("こう", "hiragana", "hepburn")
    assert long_vowel["segments"][0]["alternatives"] == ["kō", "kou"]
    assert output(result("☃", "fw", "historical-katakana")) == "□"


def test_auto_detection_and_rule_authority(client):
    assert convert("み", "auto", "hepburn")["source"] == "kana"
    assert output(convert("キ", "auto", "fw")) == "ki"
    for text, target in [("mi", "kana"), ("miキ", "fw")]:
        with pytest.raises(ValueError):
            convert(text, "auto", target)
    catalog = client.get("/api/workbench/conversions").get_json()
    assert catalog["rule_sets"]["hepburn"]["approved"] is False
    assert catalog["rule_sets"]["fw_defaults"]["approved"] is True
    assert set(catalog["systems"]) == {"kana", "hepburn", "fw"}
    assert len(catalog["pairs"]) == 6
    assert client.post("/api/workbench/convert", json={"content": "mi", "source": "fw", "target": "hiragana"}).status_code == 400


@pytest.mark.parametrize("text,source,target,expected", [
    ("たらちし", "kana", "hepburn", "tarachishi"),
    ("タラちシ", "kana", "hepburn", "tarachishi"),
    ("tarachishi", "hepburn", "kana", "たらちし"),
    ("たらちし", "kana", "fw", "taratisi"),
    ("タラチシ", "kana", "fw", "taratisi"),
    ("taratisi", "fw", "kana", "たらちし"),
    ("tarachishi", "hepburn", "fw", "taratisi"),
    ("taratisi", "fw", "hepburn", "tarachishi"),
])
def test_six_representation_directions(client, text, source, target, expected):
    response = client.post("/api/workbench/convert", json={"content": text, "source": source, "target": target})
    assert response.status_code == 200
    assert output(response.get_json()) == expected


def test_kana_output_style_and_composed_ambiguity():
    assert output(convert("taratisi", "fw", "kana", "katakana")) == "タラチシ"
    reverse = convert("ki", "hepburn", "fw")
    assert output(reverse) == "ki"
    assert reverse["segments"][0]["alternatives"] == ["kwi", "ki"]
    assert set(reverse["segments"][0]["rules"]) == {"hepburn", "fw_defaults"}
    uncertain = convert("ji", "hepburn", "fw")
    assert output(uncertain) == "□"
    assert uncertain["segments"][0]["alternatives"] == ["zi", "di"]
    assert output(convert("☃", "fw", "hepburn")) == "□"
    assert output(convert("tara\tchi\nshi　", "hepburn", "fw")) == "tara\tti\nsi　"


def test_concurrent_passage_lookup_does_not_duplicate_records():
    with editor._passage_index_lock:
        editor._passage_location_index = None
        editor._passage_alias_index = None
        editor._passage_location_signature = None
        editor._passage_search_records.clear()
        editor._passage_indexed_documents.clear()
    with ThreadPoolExecutor(max_workers=2) as pool:
        locations = list(pool.map(editor._workbench_resolve, ["MYS.17.4000"] * 2))
    assert locations[0] == locations[1]
    matching = [record for record in editor._passage_search_records if record["sentence_id"] == "MYS.17.4000"]
    assert len(matching) == 1


def test_lexical_extraction_is_row_based_and_non_destructive(client):
    original = '\n'.join([
        'IP-MAT,0@春去者,*',
        'IP-MAT,PP,NP,IP-REL,IP-ADV,NP-SBJ,N,L051724,LOG,paru',
        'IP-MAT,PP,NP,IP-REL,IP-ADV,VB-CND,L030841a,LOG,saraba',
        'IP-MAT,PP,NP,IP-REL,1@挿頭爾將爲跡,*',
        'IP-MAT,PP,NP,IP-REL,IP-ARG,IP-ARG,NP-PRD,DVN,L030454b,LOG,kazasi',
        'IP-MAT,PP,NP,IP-REL,IP-ARG,IP-ARG,COP-INF,L031965,PHON,ni',
        'IP-MAT,PP,NP,IP-REL,IP-ARG,VB-ADC,VB-STM,L030919a,LOG,se',
        'IP-MAT,PP,NP,IP-REL,IP-ARG,VB-ADC,VAX-CJR-ADC,L000002,LOG,mu',
        'IP-MAT,PP,NP,IP-REL,IP-ARG,P-COMP,L000530,PHON,to',
        'ID,BS.1', 'NP,N', '=N("ignored header")',
    ])
    response = client.post('/api/workbench/extract', json={'content': original, 'mode': 'lexical'})
    assert response.status_code == 200
    assert response.get_json()['content'] == 'paru saraba kazasi ni se mu to'
    assert response.get_json()['rows'] == 7
    assert '0@春去者' in original


def test_lexical_extraction_preserves_special_final_fields(client):
    response = client.post('/api/workbench/extract', json={
        'content': 'CP,N,L000001,ILL,漢字\nCP,N,PHON;@2,ipa\nCP,N,LOG,ku', 'mode': 'lexical',
    })
    assert response.get_json()['content'] == '漢字 ipa ku'
    assert client.post('/api/workbench/extract', json={'content': 'x', 'mode': 'unknown'}).status_code == 400
    assert client.post('/api/workbench/extract', json=[]).status_code == 400
