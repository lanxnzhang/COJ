"""Form/Source conflicts remain explicit, reversible and saveable drafts."""
from copy import deepcopy

import pytest

from coj.authoring import AuthoringStore
from coj.authoring.legacy import make_link
from coj.authoring.model import new_document, new_text, new_passage, reconcile_links, validate


def document():
    doc = new_document('forms'); doc['text_order'] = ['t']; doc['texts']['t'] = new_text()
    t = doc['texts']['t']; t['passage_order'] = ['p']; t['passages']['p'] = new_passage('source', 'ipa ku')
    t['nodes']['n'] = {'category': 'VB-NML', 'lemma': 'L030199a', 'children': [], 'form': 'ipaku', 'script': None,
                       'parts': [{'id': 'ipa', 'form': 'ipa', 'script': 'LOG', 'annotations': {}},
                                 {'id': 'ku', 'form': 'ku', 'script': 'PHON', 'annotations': {}}], 'annotations': {}}
    t['roots'] = ['n']
    t['links']['ipa'] = make_link('p', 'n', 'ipa', t['passages']['p'], 0, 3)
    t['links']['ku'] = make_link('p', 'n', 'ku', t['passages']['p'], 3, 5)
    return doc, t


def test_part_change_preserves_evidence_and_saves_unresolved(tmp_path):
    doc, t = document(); original = deepcopy(t['links']); source = deepcopy(t['passages'])
    t['annotations']['analysis_form_evidence'] = {'ipa': {'form': 'ipa'}}
    t['nodes']['n']['parts'][0]['form'] = 'ipaX'; t['nodes']['n']['form'] = 'ipaXku'
    reconcile_links(t); validate(doc)
    assert t['links']['ipa']['status'] == 'unresolved' and t['links']['ku']['status'] == 'valid'
    assert t['links']['ipa']['evidence'] == original['ipa']['evidence'] and t['passages'] == source
    store = AuthoringStore(tmp_path); store.save('forms.syn.json', doc, None)
    assert store.load('forms.syn.json')['document'] == doc
    reconcile_links(store.load('forms.syn.json')['document']['texts']['t'])
    t['nodes']['n']['parts'][0]['form'] = 'i pa'; t['nodes']['n']['form'] = 'i paku'
    reconcile_links(t); assert t['links'] == original  # Ranges address compacted material.
    t['nodes']['n']['parts'][0]['form'] = 'ipa'; t['nodes']['n']['form'] = 'ipaku'
    reconcile_links(t); assert t['links'] == original


def test_reverting_form_does_not_resolve_changed_source_or_prior_uncertainty():
    doc, t = document()
    t['links']['ipa']['evidence'].update(status='unresolved', reason='Original alignment uncertain.')
    t['annotations']['analysis_form_evidence'] = {'ipa': {'form': 'ipa'}}
    t['nodes']['n']['parts'][0]['form'] = 'changed'; t['nodes']['n']['form'] = 'changedku'
    reconcile_links(t); assert t['links']['ipa']['status'] == 'unresolved'
    t['nodes']['n']['parts'][0]['form'] = 'ipa'; t['nodes']['n']['form'] = 'ipaku'
    reconcile_links(t); assert t['links']['ipa']['reason'] == 'Original alignment uncertain.'
    t['passages']['p'] = new_passage('new source', 'ipa ku')
    reconcile_links(t); assert t['links']['ku']['status'] == 'unresolved'; validate(doc)


def test_form_evidence_requires_live_links_and_string_material():
    doc, t = document(); t['annotations']['analysis_form_evidence'] = {'gone': {'form': 'ipa'}}
    with pytest.raises(ValueError, match='Dangling analysis form evidence'):
        validate(doc)
    t['annotations']['analysis_form_evidence'] = {'ipa': {'form': None}}
    with pytest.raises(ValueError, match='Original analysed material'):
        validate(doc)
