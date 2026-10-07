"""Canonical XML is deterministic without changing the corpus content."""

import xml.etree.ElementTree as ET
from xml.dom import minidom

import pytest

from coj.xml_format import canonical_xml, element_to_xml
from coj.core.corpus import CorpusDocument
from coj.xml.corpus_xml import corpus_to_xml, corpus_to_xml_file, utterance_to_xml
from coj.core.dictionary import Dictionary
from coj.xml.dictionary_xml import dictionary_to_xml, dictionary_to_xml_file, entry_to_xml


def test_attribute_orders_and_layout_produce_identical_output():
    first = '<r z="3" a="1"><PLN phon="PHON-ON" lemma="L051076" form="ikaruga"></PLN></r>'
    second = '<r a="1" z="3">\r\n    <PLN form="ikaruga" phon="PHON-ON" lemma="L051076" />\r\n</r>'
    expected = ('<?xml version="1.0" encoding="utf-8"?>\n'
                '<r a="1" z="3">\n  <PLN form="ikaruga" lemma="L051076" phon="PHON-ON" />\n</r>\n').encode()
    assert canonical_xml(first) == canonical_xml(second) == expected
    assert canonical_xml(expected) == expected


def test_text_child_order_mixed_content_and_leaf_whitespace():
    source = '<r><second> a\tb\n c </second><first> </first><mixed>Hello <b z="2" a="1">世界</b> !</mixed><inline><b>x</b> <i>y</i></inline></r>'
    result = canonical_xml(source)
    before, after = ET.fromstring(source), ET.fromstring(result)
    assert [node.tag for node in before] == [node.tag for node in after]
    assert after[0].text == before[0].text
    assert after[1].text == " "
    assert ''.join(after[2].itertext()) == 'Hello 世界 !'
    assert ''.join(after[3].itertext()) == 'x y'
    assert b'Hello <b a="1" z="2">' in result
    assert canonical_xml(result) == result


def test_xml_space_comments_processing_instructions_and_namespaces():
    source = '<?before keep?><r xmlns:p="urn:test" xml:space="preserve">\n  <!--note-->\n  <p:x p:z="v" a="p:Type"> a\n b </p:x>\n  <?inside keep?>\n</r><!--after-->'
    result = canonical_xml(source)
    assert b'xmlns:p="urn:test"' in result
    assert b'<p:x a="p:Type" p:z="v"> a\n b </p:x>' in result
    assert b'<?before keep?>' in result and b'<?inside keep?>' in result
    assert b'<!--note-->' in result and result.endswith(b'<!--after-->\n')
    with minidom.parseString(source) as before, minidom.parseString(result) as after:
        assert [node.data for node in before.documentElement.childNodes if node.nodeType == node.TEXT_NODE] == [
            node.data for node in after.documentElement.childNodes if node.nodeType == node.TEXT_NODE]
    assert canonical_xml(result) == result


def test_escaping_and_numeric_whitespace_characters():
    source = '<r a="&quot;&amp;&lt;&#13;&#10;&#9;"><x>&amp;&lt;&gt;&#13;\n\t</x></r>'
    result = canonical_xml(source)
    before, after = ET.fromstring(source), ET.fromstring(result)
    assert before.attrib == after.attrib
    assert before[0].text == after[0].text
    assert b"\r" not in result


@pytest.mark.parametrize("encoding", ["utf-16", "iso-8859-1"])
def test_encoding_normalized_to_utf8(encoding):
    source = f'<?xml version="1.0" encoding="{encoding}"?><r>é</r>'.encode(encoding)
    result = canonical_xml(source)
    assert result.startswith(b'<?xml version="1.0" encoding="utf-8"?>\n')
    assert ET.fromstring(result).text == "é"


def test_dtd_and_malformed_xml_fail_instead_of_losing_information():
    with pytest.raises(ValueError, match="DOCTYPE"):
        canonical_xml('<!DOCTYPE r [<!ENTITY x "word">]><r>&x;</r>')
    with pytest.raises(ValueError, match="Cannot parse"):
        canonical_xml('<r>')


def test_cdata_and_doctype_mentions_in_comments_are_preserved():
    source = '<r><!--mention <!DOCTYPE here--><![CDATA[\n  ]]><x z="2" a="1" /></r>'
    result = canonical_xml(source)
    assert b'<!--mention <!DOCTYPE here-->' in result
    assert b'<![CDATA[\n  ]]>' in result
    assert canonical_xml(result) == result


def test_element_serialization_does_not_mutate_input():
    root = ET.fromstring('<r z="3" a="1"><leaf /></r>')
    before = ET.tostring(root)
    element_to_xml(root)
    assert ET.tostring(root) == before


def test_all_corpus_and_dictionary_serializer_entry_points(tmp_path):
    doc = CorpusDocument.from_text('=N(" nu ")\nIP-MAT,N,L000006a,LOG,nu\nID,BS.1\n', filename="BS.txt")
    corpus_path = tmp_path / "BS.xml"
    corpus_to_xml_file(doc, str(corpus_path))
    assert corpus_path.read_bytes() == corpus_to_xml(doc).encode()
    assert canonical_xml(corpus_path.read_bytes()) == corpus_path.read_bytes()
    assert canonical_xml(utterance_to_xml(doc[0]), declaration=False) == utterance_to_xml(doc[0]).encode()
    dictionary = Dictionary.from_text('---------------------------------------------------\n=== L000006a\n.FORM\tnu\n.GLOSS\tNEG\n')
    dict_path = tmp_path / "dictionary.xml"
    dictionary_to_xml_file(dictionary, str(dict_path))
    assert dict_path.read_bytes() == dictionary_to_xml(dictionary).encode()
    assert canonical_xml(entry_to_xml(dictionary['L000006a']), declaration=False) == entry_to_xml(dictionary['L000006a']).encode()
