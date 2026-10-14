"""Read-only current-data audit and affected-XML inventory (no synchronization)."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from coj.core.corpus import CorpusDocument, _kanji_marker_parent_path
from coj.core.dictionary import Dictionary
from coj.xml.dictionary_xml import dictionary_to_xml, dictionary_from_xml


def audit(root):
    files = sorted([*root.glob('txt/*/*.txt'), *root.glob('xml/*/*.xml')])
    before = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    counts = Counter()
    affected = []
    marker_anomalies = []
    duplicate_ids = []
    duplicate_xml_ids = []
    for path in sorted(root.glob('txt/*/*.txt')):
        if path.parent.name == 'dict':
            continue
        text = path.read_text(encoding='utf-8')
        ids = Counter(re.findall(r'^ID,(.*)$', text, re.M))
        duplicate_ids.extend({'file': str(path.relative_to(root)), 'id': key, 'count': n}
                             for key, n in ids.items() if n > 1)
        local = Counter()
        for block in re.split(r'\n\s*\n', text):
            labels = []
            for line in block.splitlines():
                fields = line.split(',')
                if fields[-2:] == ['NULL', '*']:
                    local['null'] += 1
                elif fields[-1] == '*T*':
                    local['trace'] += 1
                elif len(fields) > 2 and fields[-2] == 'ILL':
                    local['ill'] += 1
                    if not fields[-1].isascii():
                        local['nonascii_ill'] += 1
                elif _kanji_marker_parent_path(line) is not None:
                    labels.append(int(fields[-2].partition('@')[0]))
                    counts['markers'] += 1
                    if 'x' in fields[-2].partition('@')[2]:
                        counts['placeholder_markers'] += 1
                elif fields[-1] == '*':
                    counts['unknown_bare_star'] += 1
            if labels and labels != list(range(len(labels))):
                marker_anomalies.append(str(path.relative_to(root)))
        counts.update(local)
        if local['null'] or local['nonascii_ill']:
            affected.append({'xml': f'xml/{path.parent.name}/{path.stem}.xml',
                             'null': local['null'], 'nonascii_ill': local['nonascii_ill']})
    mismatches = []
    for path in sorted(root.glob('xml/*/*.xml')):
        if path.parent.name == 'dict':
            continue
        doc = CorpusDocument.from_file(str(path))
        xml_ids = Counter(b.get('id') for b in doc._get_doc_elem().findall('block'))
        duplicate_xml_ids.extend({'file': str(path.relative_to(root)), 'id': key, 'count': n}
                                 for key, n in xml_ids.items() if n > 1)
        for block, utt in zip(doc._get_doc_elem().findall('block'), doc.utterances):
            forms = ''.join(line.word_form or '' for line in utt.corpus_lines())
            header = re.sub(r'\s', '', block.get('header', ''))
            if header != forms:
                mismatches.append(block.get('id'))
            counts['stored_null_nodes'] += len(block.findall('.//NULL'))
            counts['stored_traces'] += len(block.findall('.//*[@raw_tag="*T*"]'))
            counts['stored_nonascii_form_artifacts'] += sum(
                bool(e.get('raw_tag')) and not e.get('raw_tag').isascii() for e in block.iter())
    dictionary = (root / 'txt/dict/dictionary.txt').read_text(encoding='utf-8')
    headings = re.findall(r'^=== (.*)$', dictionary, re.M)
    counts['dictionary_entries'] = len(headings)
    counts['duplicate_dictionary_ids'] = sum(n - 1 for n in Counter(headings).values() if n > 1)
    counts['blank_meaning_fields'] = len(re.findall(r'^\.MEANING\t$', dictionary, re.M))
    missing = {}
    for block in re.split(r'^=== ', dictionary, flags=re.M)[1:]:
        identifier = block.splitlines()[0]
        absent = [field for field in ('GLOSS', 'MEANING', 'FORM', 'KANA', 'POS')
                  if not re.search(r'^\.' + field + r'(?:\[\d+\])?(?:\s|$)', block, re.M)]
        if absent:
            missing[identifier] = absent
    counts['untagged_dictionary_content_lines'] = sum(
        bool(line.strip()) and not line.startswith(('.', '-', '=== '))
        for line in dictionary.splitlines())
    counts['log_suffix'] = sum(p.read_text(encoding='utf-8').count('LOG;@2,')
                              for p in root.glob('txt/*/*.txt') if p.parent.name != 'dict')
    parsed = Dictionary.from_text(dictionary)
    decoded = dictionary_from_xml(dictionary_to_xml(parsed))
    counts['dictionary_field_map_roundtrip_failures'] = sum(
        dict(entry._fields) != dict(decoded.get(entry.eid)._fields) for entry in parsed)
    stored = ET.parse(root / 'xml/dict/dictionary.xml').getroot()
    note = stored.find(".//entry[@id='L051953']/notes/note")
    # Record evidence without inventing a repair if this field differs.
    note_matches = note is not None and note.text == parsed.get('L051953').get_first('NOTE')
    split_ids_present = all(parsed.get(identifier) is not None
                            and stored.find(f"entry[@id='{identifier}']") is not None
                            for identifier in ('L080725', 'L080539'))
    assert before == {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    return {'counts': dict(counts), 'affected_xml': affected, 'duplicate_text_ids': duplicate_ids,
            'duplicate_xml_text_ids': duplicate_xml_ids, 'dictionary_missing_fields': missing,
            'L051953_note_matches_xml': note_matches,
            'L080725_and_L080539_present_in_both': split_ids_present,
            'marker_numbering_anomalies': marker_anomalies, 'stored_xml_header_mismatches': mismatches,
            'source_hashes': before, 'corpus_data_changed': False}


if __name__ == '__main__':
    print(json.dumps(audit(Path(__file__).resolve().parents[2] / 'data'), ensure_ascii=False, indent=2))
