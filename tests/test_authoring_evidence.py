"""Stage 3 uses real attestations without writing its evidence sources."""
from copy import deepcopy
from pathlib import Path
import hashlib
import xml.etree.ElementTree as ET

import pytest
from flask import Flask

from coj.authoring.evidence import EvidenceIndex
from coj.authoring.model import new_document, new_text, new_passage, validate
from treditor.authoring import create_blueprint

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope='module')
def evidence():
    files = sorted((ROOT / 'data/xml').glob('*/*.xml'))
    before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    index = EvidenceIndex(ROOT / 'data')
    index.refresh()
    yield index
    assert before == {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}


def test_dominance_and_all_alternatives(evidence):
    yuku = evidence.candidates('yuku')
    dominant = next(c for c in yuku if c['default'])
    assert dominant['count'] == 247 and dominant['support'] == .988
    assert dominant['pattern']['lemma'] == 'L031840a'
    assert {c['pattern']['category'] for c in yuku} == {'VB-ADC', 'VB-ADN', 'VB-CLS', 'VB-INF'}
    taka = evidence.candidates('taka')
    assert taka[0]['count'] == 140 and len(taka) == 6
    assert not any(c['default'] for c in taka)
    assert any(c['default'] for c in evidence.candidates('taka', support=.85))


@pytest.mark.parametrize('form,lemma,count', [('paruyama', 'L090723', 8), ('titipapa', 'L050402', 21)])
def test_recursive_compounds(evidence, form, lemma, count):
    candidate = evidence.candidates(form)[0]
    assert candidate['default'] and candidate['count'] == count
    assert candidate['pattern']['lemma'] == lemma and len(candidate['pattern']['children']) == 2
    assert 'script' not in candidate['pattern']
    assert 'index' not in candidate['pattern']['annotations']


def test_small_sample_and_mk_alternatives(evidence):
    assert not evidence.candidates('takayuku')[0]['default']
    assert evidence.candidates('takayuku', min_texts=2)[0]['default']
    oki = evidence.candidates('okitunami')
    assert sorted(c['count'] for c in oki) == [1, 2]
    assert all(c['eligible'] and not c['default'] for c in oki)
    assert any(c['pattern']['children'][0]['category'] == 'PP' for c in oki)
    opo = evidence.candidates('opobuneno')
    assert sorted(c['count'] for c in opo) == [1, 2, 19]
    assert all(c['eligible'] and not c['default'] for c in opo)
    assert any(c['pattern']['children'][0]['category'] == 'IP-ADV' for c in opo)
    ipaku = evidence.candidates('ipaku')[0]
    assert not ipaku['pattern']['children']  # Script parts never manufacture morphology.


def test_domain_filter_precedes_counts(evidence):
    ordinary = evidence.candidates('taka')
    legacy = evidence.candidates('taka', include_legacy=True)
    assert all(e['domain'] == 'ordinary' for c in ordinary for e in c['evidence'])
    assert any(c['domains']['EN/SM'] for c in legacy)
    t = new_text(); t['passages']['p'] = new_passage('x', 'taka yuku'); t['passage_order'] = ['p']
    unnamed = evidence.analyse(t)
    assert unnamed['domain'] == 'ordinary'
    t['text_id'] = 'EN.1.1'
    assert evidence.analyse(t)['domain'] == 'ordinary + EN/SM'
    t['text_id'] = 'ordinary-EN-name'
    assert evidence.analyse(t)['domain'] == 'ordinary'


def test_revision_invalidation_and_no_source_mutation(tmp_path):
    corpus = tmp_path / 'xml/trees'; corpus.mkdir(parents=True)
    dictionary = tmp_path / 'xml/dict'; dictionary.mkdir()
    (dictionary / 'dictionary.xml').write_text('<dictionary><entry id="L1"><forms><form phonemic="a"/></forms></entry></dictionary>')
    path = corpus / 'A.xml'
    path.write_text('<document><block id="A.1"><N lemma="L1" phon="LOG" form="a"/></block></document>')
    e = EvidenceIndex(tmp_path); e.refresh(); revision = e.revision
    original = path.read_bytes(); assert e.candidates('a')[0]['count'] == 1
    assert path.read_bytes() == original
    path.write_text('<document><block id="A.1"><VB lemma="L1" phon="LOG" form="a"/></block></document>')
    e.refresh(); assert e.revision != revision and e.candidates('a')[0]['pattern']['category'] == 'VB'
    (dictionary / 'dictionary.xml').write_text('<dictionary/>')
    e.refresh(); assert not e.candidates('a')[0]['complete'] and not e.candidates('a')[0]['default']


def test_api_is_explicit_read_only_and_draft_save(tmp_path):
    folder = tmp_path / 'xml/trees'; folder.mkdir(parents=True)
    (folder / 'A.xml').write_text('<document><block id="A.1"><N lemma="L1" form="a" phon="LOG"/></block></document>')
    app = Flask(__name__); app.register_blueprint(create_blueprint(tmp_path / 'authoring')); client = app.test_client()
    doc = new_document('draft'); doc['texts']['t'] = new_text(); doc['text_order'] = ['t']
    t = doc['texts']['t']; t['passages']['p'] = new_passage('x', 'a'); t['passage_order'] = ['p']
    original = deepcopy(doc)
    response = client.post('/api/authoring/analyse', json={'document': doc, 'text_key': 't'})
    assert response.status_code == 200 and response.json['units'][0]['form'] == 'a'
    assert doc == original and client.get('/api/authoring/files').json == []
    assert client.post('/api/authoring/analyse', json={'document': doc, 'text_key': 'missing'}).status_code == 400
    assert client.post('/api/authoring/analyse', json={'document': doc, 'text_key': 't', 'settings': {'support': 2}}).status_code == 400
    assert client.put('/api/authoring/files/draft.syn.json', json={'document': validate(doc), 'expected_revision': None}).status_code == 200
