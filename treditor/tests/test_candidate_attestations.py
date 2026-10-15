"""Live candidate evidence reuses Search context without changing authoring data."""
from copy import deepcopy
import hashlib
import xml.etree.ElementTree as ET

from flask import Flask
import pytest

from coj.authoring.evidence import EvidenceIndex
from coj.core.dictionary import Dictionary
import treditor.app as editor
from treditor.authoring import create_blueprint


@pytest.fixture
def corpus(tmp_path, monkeypatch):
    for name in ("trees", "text", "dict"):
        (tmp_path / "xml" / name).mkdir(parents=True)
    dictionary = tmp_path / "xml/dict/dictionary.xml"
    dictionary.write_text('<dictionary><entry id="L000001"><forms><form phonemic="a"/></forms></entry></dictionary>')
    path = tmp_path / "xml/trees/A.xml"
    path.write_text('<document>' + ''.join(
        '<block id="duplicate"><raw-text><sentence><kanji>source</kanji>'
        '<transcription>a a</transcription></sentence></raw-text><IP-MAT>'
        '<N lemma="L000001" form="a"/><N lemma="L000001" form="a"/>'
        '<VB lemma="L000001" form="a"/></IP-MAT></block>' for _ in range(12)) + '</document>')
    legacy = tmp_path / "xml/text/SM.xml"
    legacy.write_text('<document><block id="SM.1"><N lemma="L000001" form="a"/></block></document>')
    monkeypatch.setitem(editor.DOCUMENT_SOURCES["trees"], "directory", path.parent)
    monkeypatch.setitem(editor.DOCUMENT_SOURCES["text"], "directory", legacy.parent)
    monkeypatch.setattr(editor, "get_dictionary", Dictionary)
    app = Flask(__name__)
    app.register_blueprint(create_blueprint(tmp_path / "authoring", editor._candidate_attestations))
    evidence = EvidenceIndex(tmp_path)
    evidence.refresh()
    candidate = next(c for c in evidence.candidates("a") if c["pattern"]["category"] == "N")
    query = {"candidate_id": candidate["id"], "form": "a", "text_id": "", "per_page": 10}
    return app.test_client(), path, query, candidate


def test_exact_live_membership_domain_context_and_duplicate_ids(corpus):
    client, path, query, old = corpus
    before = path.read_bytes()
    result = client.post('/api/authoring/attestations', json=query).get_json()
    assert result['occurrence_total'] == 24 and result['text_total'] == 12
    assert result['candidate']['support'] == 24 / 36
    assert sum(hit['match_count'] for hit in result['results']) == 20
    assert result['results'][0]['tree_context']['node_ids'] == ['0.0', '0.1']
    assert result['results'][0]['highlights']['transcription']
    assert result['results'][0]['display_roots']
    assert [hit['block_ordinal'] for hit in result['results']] == list(range(10))
    page2 = client.post('/api/authoring/attestations', json={**query, 'page': 2}).get_json()
    assert [hit['block_ordinal'] for hit in page2['results']] == [10, 11]
    legacy = client.post('/api/authoring/attestations', json={**query, 'text_id': 'SM.1'}).get_json()
    assert legacy['occurrence_total'] == 25
    hit = page2['results'][0]
    opened = editor.app.test_client().get('/api/utterances/trees/A/duplicate/tree', query_string={
        'block': hit['block_ordinal'], 'revision': hit['source_revision']})
    assert opened.status_code == 200
    assert len(opened.get_json()['roots'][0]['children']) == 3
    assert path.read_bytes() == before


def test_current_refresh_restarts_pagination_and_old_context_is_rejected(corpus):
    client, path, query, old = corpus
    first = client.post('/api/authoring/attestations', json=query).get_json()
    historical = deepcopy(old)
    text = path.read_text().replace('lemma="L000001" form="a"', 'lemma="L000001" form="b"', 1)
    path.write_text(text)
    result = client.post('/api/authoring/attestations', json={**query, 'page': 2, 'revision': first['revision']}).get_json()
    assert result['refreshed'] and result['page'] == 1
    assert result['occurrence_total'] == 23
    assert result['candidate']['support'] == 23 / 35
    assert old == historical
    opened = editor.app.test_client().get('/api/utterances/trees/A/duplicate/tree', query_string={
        'block': 0, 'revision': first['results'][0]['source_revision']})
    assert opened.status_code == 409


def test_disappearing_pattern_does_not_become_a_lemma_search(corpus):
    client, path, query, old = corpus
    path.write_text(path.read_text().replace('<N ', '<ADJ '))
    result = client.post('/api/authoring/attestations', json=query).get_json()
    assert result['candidate'] is None
    assert result['occurrence_total'] == 0 and result['results'] == []


def test_recursive_pattern_is_exact_not_merely_same_lemma_and_yield(corpus):
    client, path, query, _ = corpus
    path.write_text('<document><block id="A.1"><N lemma="L000001">'
                    '<N form="a"/><N form="b"/></N></block><block id="A.2">'
                    '<N lemma="L000001"><ADJ form="a"/><N form="b"/></N></block>'
                    '<block id="A.3"><N lemma="L000001" form="ab"/></block></document>')
    evidence = EvidenceIndex(path.parents[2])
    evidence.refresh()
    candidate = next(c for c in evidence.candidates('ab') if c['pattern']['children']
                     and c['pattern']['children'][0]['category'] == 'N')
    result = client.post('/api/authoring/attestations', json={**query, 'form': 'ab',
                         'candidate_id': candidate['id']}).get_json()
    assert result['occurrence_total'] == 1
    assert [hit['sentence_id'] for hit in result['results']] == ['A.1']


def test_source_changed_during_read_is_rebuilt(corpus, monkeypatch):
    _, path, query, _ = corpus
    evidence = EvidenceIndex(path.parents[2])
    evidence.refresh()
    original = evidence.refresh
    changed = False

    def change_after_indexing():
        nonlocal changed
        original()
        if not changed:
            path.write_text(path.read_text().replace('form="a"', 'form="b"', 1))
            changed = True

    monkeypatch.setattr(evidence, 'refresh', change_after_indexing)
    with editor.app.test_request_context():
        result = editor._candidate_attestations(evidence, query)
    assert result['occurrence_total'] == 23


def test_current_file_open_uses_ordinal_not_duplicate_scholarly_id(corpus):
    _, path, _, _ = corpus
    root = ET.fromstring(path.read_bytes())
    root.findall('block')[1].find('./IP-MAT/N').set('form', 'distinct')
    content = ET.tostring(root)
    path.write_bytes(content)
    response = editor.app.test_client().get('/api/utterances/trees/A/duplicate/tree', query_string={
        'block': 1, 'revision': hashlib.sha256(content).hexdigest()})
    assert response.get_json()['roots'][0]['children'][0]['form'] == 'distinct'


@pytest.mark.parametrize('changes', [{'candidate_id': '../unsafe'}, {'page': -1}, {'per_page': 1},
                                    {'form': ''}, {'text_id': None}, {'support': 2}])
def test_bad_query_is_rejected(corpus, changes):
    client, _, query, _ = corpus
    assert client.post('/api/authoring/attestations', json={**query, **changes}).status_code == 400
