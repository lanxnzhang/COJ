"""Chief-editor confirmed ILL, NULL and trace behavior; corpus stays read-only."""
from pathlib import Path
import hashlib
import xml.etree.ElementTree as ET

import pytest

from coj.core.corpus import CorpusDocument, CorpusLine, CommentLine, Utterance
from coj.xml.corpus_xml import corpus_to_xml, corpus_from_xml, utterance_from_xml


@pytest.mark.parametrize('form', ['xxx', '莫囂圓隣之', '刺部重部'])
def test_ill_form_is_material_not_syntax(form):
    raw = f'IP-MAT,WORD,L099997,ILL,{form}'
    line = CorpusLine.parse(raw)
    assert line.word_form == form
    assert line.synt_path == ['IP-MAT', 'WORD']
    assert line.phon_tag == 'ILL'
    assert str(line.lemma_id) == 'L099997'
    text = f'=N(" {form} ")\nIP-MAT,0@原文,*\n{raw}\nID,BS.1\n'
    doc = corpus_from_xml(corpus_to_xml(CorpusDocument.from_text(text)))
    assert doc.to_text() == text
    assert len(doc.utterances[0].find_by_form(form)) == 1
    block = doc._get_doc_elem().find('block')
    assert block.find('IP-MAT/WORD').get('form') == form
    assert block.findtext('raw-text/sentence/transcription') == form
    assert block.get('header') == form


@pytest.mark.parametrize('path', [
    'IP-MAT,IP-ADV,COP-INF,NULL,*',
    'IP-MAT,IP-ADV,ADJ-CLS,ACP-CLS,L000033,NULL,*',
])
def test_null_is_empty_terminal_with_exact_encoding(path):
    marker = 'IP-MAT,4@曾能夜弊賀岐袁,*'
    text = f'=N(" nu ")\n{marker}\n{path}\nIP-MAT,N,LOG,nu\nID,BS.1\n'
    lines = Utterance.from_lines(text.splitlines()).lines
    assert isinstance(lines[1], CommentLine) and lines[1].is_inline_comment
    assert isinstance(lines[2], CorpusLine)
    assert lines[2].word_form is None
    assert lines[2].synt_path[-1] == 'NULL'
    xml = corpus_to_xml(CorpusDocument.from_text(text))
    block = ET.fromstring(xml).find('block')
    null = block.find('.//NULL')
    assert null is not None and null.get('form') == '' and null.get('phon') == ''
    assert len(block.findall('roundtrip-data/comment')) == 1
    assert block.findtext('raw-text/sentence/transcription') == 'nu'
    assert corpus_from_xml(xml).to_text() == text
    # Also exercise the separate field-list XML decoder.
    assert utterance_from_xml(ET.tostring(block, encoding='unicode')).to_text() + '\n' == text
    assert not CommentLine(path).is_inline_comment
    assert '∅' not in xml


def test_trace_keeps_subject_position_without_visible_material():
    text = '=N(" nu ")\nIP-MAT,0@原文,*\nIP-MAT,NP-SBJ,*T*\nIP-MAT,N,LOG,nu\nID,BS.3\n'
    doc = CorpusDocument.from_text(text)
    trace = doc._get_doc_elem().find('block/IP-MAT/NP-SBJ/_T_')
    assert trace is not None
    assert trace.get('raw_tag') == '*T*' and trace.get('form') == ''
    assert doc._get_doc_elem().findtext('block/raw-text/sentence/transcription') == 'nu'
    assert not doc.utterances[0].find_by_form('*T*')
    assert corpus_from_xml(corpus_to_xml(doc)).to_text() == text


def test_unknown_bare_star_is_preserved_without_inventing_semantics():
    raw = 'IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*'
    text = f'{raw}\nID,SM.29.2\n'
    doc = CorpusDocument.from_text(text)
    assert doc.to_text() == text
    assert not CommentLine(raw).is_inline_comment
    assert doc._get_doc_elem().find('block/raw-text/sentence') is None
    assert not doc.utterances[0].corpus_lines()


def test_syn_import_keeps_special_material_and_empty_terminals(tmp_path):
    from coj.authoring.legacy import LegacyCorpus
    from coj.authoring.model import validate
    folder = tmp_path / 'xml/trees'
    folder.mkdir(parents=True)
    source = ('=N(" 莫囂圓隣之 ")\nIP-MAT,0@原文,*\n'
              'IP-MAT,WORD,L099997,ILL,莫囂圓隣之\n'
              'IP-MAT,COP-INF,NULL,*\nIP-MAT,NP-SBJ,*T*\nID,BS.3\n')
    CorpusDocument.from_text(source).to_file(str(folder / 'BS.xml'))
    doc = LegacyCorpus(tmp_path).open('trees:BS')
    validate(doc)
    text = next(iter(doc['texts'].values()))
    nodes = list(text['nodes'].values())
    special = next(n for n in nodes if n['form'] == '莫囂圓隣之')
    assert special['category'] == 'WORD' and special['script'] == 'ILL'
    assert special['lemma'] == 'L099997'
    for tag in ('NULL', '*T*'):
        node = next(n for n in nodes if n['category'] == tag)
        assert node['form'] == '' and not node['children'] and not node['parts']
    assert all(text['nodes'][link['node']]['form'] != '' for link in text['links'].values())


def test_all_current_special_records_roundtrip_without_source_writes():
    root = Path(__file__).resolve().parents[1] / 'data'
    paths = [*root.glob('txt/*/*.txt'), *root.glob('xml/*/*.xml')]
    before = {p: hashlib.sha256(p.read_bytes()).digest() for p in paths}
    counts = {'null': 0, 'trace': 0, 'ill': 0}
    for path in sorted(root.glob('txt/*/*.txt')):
        if path.parent.name == 'dict':
            continue
        text = path.read_text(encoding='utf-8')
        doc = CorpusDocument.from_text(text)
        decoded = corpus_from_xml(corpus_to_xml(doc))
        assert decoded.to_text() == doc.to_text()
        # These files are canonical already, except physical line endings/blank spacing.
        assert decoded.to_text().split() == text.split()
        for utt in decoded.utterances:
            for line in utt.corpus_lines():
                if line.synt_path[-1] == 'NULL':
                    counts['null'] += 1
                    assert line.word_form is None and line.to_text().endswith(',NULL,*')
                if line.synt_path[-1] == '*T*':
                    counts['trace'] += 1
                    assert line.word_form is None
                if line.phon_tag == 'ILL':
                    counts['ill'] += 1
                    assert line.word_form and line.synt_path[-1] == 'WORD'
    assert counts == {'null': 347, 'trace': 243, 'ill': 20}
    assert before == {p: hashlib.sha256(p.read_bytes()).digest() for p in paths}
