"""Read-only, revision-aware attested lexical analyses. No linguistic inference."""
from collections import defaultdict
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
from threading import RLock
import xml.etree.ElementTree as ET

from .legacy import METADATA
from .model import compact
from coj.core.tags import PHON_TAGS

WORDS = {'VB', 'ADJ', 'WH-ADJ', 'COP', 'N', 'DVN', 'PEN', 'PLN', 'PRO-N',
         'WH-N', 'ADV', 'PRO-ADV', 'WH-ADV', 'INTJ', 'NUM', 'WH-NUM', 'P', 'XTN', 'MK'}
BOUND = {'ACP', 'VAX', 'PFX', 'SFX', 'CL'}
PHRASES = {'NP', 'PP', 'IP', 'CP', 'CONJP', 'multi-sentence'}


def base(tag):
    # WH-/PRO- categories contain a hyphen; match longest known prefix.
    return next((x for x in sorted(WORDS | BOUND | PHRASES, key=len, reverse=True)
                 if tag == x or tag.startswith(x + '-')), None)


def legacy_domain(text_id):
    return bool(re.match(r'^(EN|SM)(?:[.;]|$)', text_id))


class EvidenceIndex:
    def __init__(self, root):
        self.root = Path(root)
        self.lock = RLock()
        self.stamp = None
        self.forms = {}
        self.dictionary = {}
        self.dictionary_forms = {}
        self.revision = ''

    def refresh(self):
        paths = sorted(self.root.glob('xml/trees/*.xml')) + sorted(self.root.glob('xml/text/*.xml'))
        dictionary = self.root / 'xml/dict/dictionary.xml'
        if dictionary.is_file():
            paths.append(dictionary)
        paths = [p for p in paths if not p.is_symlink() and p.resolve().is_relative_to(self.root.resolve())]
        stamp = tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size) for p in paths)
        if stamp == self.stamp:
            return
        entries = {}
        if dictionary in paths:
            for entry in ET.parse(dictionary).getroot().findall('entry'):
                entries[entry.get('id')] = {
                    'lemma': entry.get('id'), 'gloss': entry.findtext('gloss', ''),
                    'meanings': [x.text or '' for x in entry.findall('./meanings/meaning')],
                    'forms': [x.get('phonemic', '') for x in entry.findall('./forms/form')],
                    'components': [dict(x.attrib) for x in entry.findall('./compound/ref')],
                }
        forms = defaultdict(list)
        revisions = []
        for path in paths:
            content = path.read_bytes()
            digest = hashlib.sha256(content).hexdigest()
            revisions.append((str(path.relative_to(self.root)), digest))
            if path == dictionary:
                continue
            source = str(path.relative_to(self.root)).replace('\\', '/')
            for ordinal, block in enumerate(ET.fromstring(content).findall('block')):
                def visit(node, address):
                    children = [c for c in node if c.tag not in METADATA]
                    built = [visit(c, address + '.' + str(i)) for i, c in enumerate(children)]
                    tag = node.get('raw_tag') or node.tag
                    form = ''.join(x['yield'] for x in built) if children else node.get('form', '')
                    pattern = {'category': tag, 'lemma': node.get('lemma'),
                               'form': None if children else form,
                               'children': [x['pattern'] for x in built],
                               'annotations': {k: v for k, v in node.attrib.items()
                                               if k in {'index', 'inferred_index', 'raw_tag'}}}
                    clean = (bool(form) and base(tag) is not None and
                             (not node.get('lemma') or node.get('lemma') in entries) and
                             all(x['clean'] for x in built)) if children else (
                        bool(form) and base(tag) in WORDS | BOUND and node.get('lemma') in entries)
                    # MK alone has the confirmed internal phrase/clause exception.
                    phrase_free = base(tag) not in PHRASES and all(x['phrase_free'] for x in built)
                    supported = (base(tag) is not None and all(x['supported'] for x in built)) if children else (
                        bool(form) and base(tag) in WORDS | BOUND)
                    eligible = base(tag) in WORDS | BOUND and supported and (phrase_free or tag == 'MK')
                    # Phrase children inside MK have no lemma requirement of their own.
                    # Retain form-bearing unknown/malformed leaves in the
                    # denominator and evidence panel, without assigning a level.
                    if form and (base(tag) in WORDS | BOUND or not children):
                        forms[compact(form)].append({
                            'pattern': pattern, 'eligible': eligible, 'complete': clean,
                            'source': source, 'revision': digest, 'ordinal': ordinal,
                            'text_id': block.get('id', ''), 'address': address,
                            'domain': 'EN/SM' if legacy_domain(block.get('id', '')) else 'ordinary',
                        })
                    return {'yield': form, 'pattern': pattern, 'clean': clean, 'phrase_free': phrase_free, 'supported': supported}
                for i, node in enumerate(c for c in block if c.tag not in METADATA):
                    visit(node, str(i))
        dictionary_forms = defaultdict(list)
        for entry in entries.values():
            for form in entry['forms']:
                dictionary_forms[form].append(entry)
        self.forms, self.dictionary = dict(forms), entries
        self.dictionary_forms = dict(dictionary_forms)
        self.revision = hashlib.sha256(json.dumps(revisions).encode()).hexdigest()
        self.stamp = stamp

    def candidates(self, form, include_legacy=False, support=.95, min_texts=3):
        records = [r for r in self.forms.get(compact(form), [])
                   if include_legacy or r['domain'] == 'ordinary']
        grouped = {}
        for r in records:
            pattern = deepcopy(r['pattern'])
            # Root distinction indices belong to the attestation's surrounding
            # syntax, not to this lexical template. Internal distinctions remain.
            pattern['annotations'] = {}
            key = json.dumps(pattern, sort_keys=True, ensure_ascii=False)
            item = grouped.setdefault(key, {'pattern': pattern, 'eligible': True, 'complete': True, 'evidence': []})
            item['eligible'] = item['eligible'] and r['eligible']
            item['complete'] = item['complete'] and r['complete']
            item['evidence'].append({k: v for k, v in r.items() if k not in {'pattern', 'eligible', 'complete'}})
        result = []
        for key, item in grouped.items():
            evidence = item['evidence']
            count = len(evidence)
            text_count = len({(r['source'], r['ordinal']) for r in evidence})
            ratio = count / len(records)
            item.update(id=hashlib.sha256(key.encode()).hexdigest(), count=count,
                        texts=text_count, support=ratio,
                        default=item['eligible'] and item['complete'] and ratio >= support and text_count >= min_texts,
                        dictionary=self.dictionary.get(item['pattern']['lemma']),
                        domains={d: sum(r['domain'] == d for r in evidence) for d in ('ordinary', 'EN/SM')})
            result.append(item)
        # Dictionary matches are selectable incomplete suggestions, never corpus votes.
        seen = {x['pattern']['lemma'] for x in result}
        for entry in self.dictionary_forms.get(form, []):
            if entry['lemma'] not in seen:
                result.append({'id': 'dictionary:' + entry['lemma'], 'pattern': {
                    'category': None, 'lemma': entry['lemma'], 'form': form, 'children': [], 'annotations': {}},
                    'eligible': False, 'count': 0, 'texts': 0, 'support': 0, 'default': False,
                    'dictionary': entry, 'evidence': [], 'domains': {'ordinary': 0, 'EN/SM': 0}})
        result.sort(key=lambda c: (-c['count'], c['id']))
        # A configurable lower gate may admit multiple candidates; ties/non-dominance
        # must still never create an arbitrary pre-fill.
        for c in result:
            c['default'] = c['default'] and c['count'] > max((x['count'] for x in result if x is not c), default=0)
        return deepcopy(result)

    def analyse(self, text, support=.95, min_texts=3):
        if type(support) not in (int, float) or not 0 < support <= 1:
            raise ValueError('Support must be greater than 0 and at most 1.')
        if type(min_texts) is not int or not 1 <= min_texts <= 100000:
            raise ValueError('Minimum Text count must be a positive integer.')
        with self.lock:
            self.refresh()
            legacy = legacy_domain(text['text_id'])
            units = []
            for pid in text['passage_order']:
                passage = text['passages'][pid]
                offset = 0
                for unit in passage['units']:
                    form = passage['transcription'][unit['start']:unit['end']]
                    units.append({'form': form, 'passage': pid, 'start': offset, 'end': offset + len(form)})
                    offset += len(form)
            spans = []
            max_length = max((len(f) for f in self.forms.keys() | self.dictionary_forms.keys()), default=0)
            for i in range(len(units)):
                form = ''
                for j in range(i, len(units)):
                    form += units[j]['form']
                    if j > i and len(form) > max_length:
                        break
                    choices = self.candidates(form, legacy, support, min_texts)
                    if choices or j == i:
                        spans.append({'first': i, 'last': j + 1, 'form': form, 'candidates': choices})
            nodes = {}
            def yield_node(nid):
                n = text['nodes'][nid]
                return ''.join(yield_node(c) for c in n['children']) if n['children'] else n['form'] or ''
            for nid in text['nodes']:
                value = yield_node(nid)
                node = text['nodes'][nid]
                if base(node['category'] or '') in WORDS | BOUND or (not node['children'] and not node['category']):
                    nodes[nid] = self.candidates(value, legacy, support, min_texts)
            return {'revision': self.revision, 'domain': 'ordinary + EN/SM' if legacy else 'ordinary',
                    'settings': {'support': support, 'min_texts': min_texts},
                    'units': units, 'spans': spans, 'nodes': nodes,
                    'scripts': sorted(PHON_TAGS), 'lexical_categories': sorted(WORDS | BOUND)}
