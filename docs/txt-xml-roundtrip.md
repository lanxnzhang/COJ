# Current TXT ↔ XML round-trip specification

This is the detailed working specification of current conversion behavior. TXT is the current provisional authoring representation; XML is the current computational representation.

Use [glossary.md](glossary.md) for short definitions, [data-model.md](data-model.md) for the conceptual model, and [data-issues.md](data-issues.md) for concrete anomalies. This file concentrates on syntax, mappings, preservation, and known conversion limits.

## Evidence categories

- **Explicit**: stated in current documentation/tests or confirmed by the project author.
- **Strong**: consistently implied by current data, tests, and migrations.
- **Implementation**: behavior of current code that may not be intended design.
- **Historical**: retained to explain a migration or superseded understanding.

## Conversion entry points

```text
TXT corpus ──CorpusDocument.from_file──> field-list model
          ──_utterance_to_elem─────────> XML element tree
          ──ElementTree serialization──> XML

XML corpus ──CorpusDocument.from_file──> XML-backed model
          ──_utterance_from_elem / lines──> reconstructed field-list model
          ──CorpusDocument.to_text──────> TXT
```

`scripts/data_conversion/txt2xml.py` and `xml2txt.py` apply these shared functions repository-wide. `src/coj/xml/corpus_xml.py` is a thin public facade; the substantive mapping is in `src/coj/core/corpus.py`.

Dictionary conversion uses `Dictionary`/`DictEntry` from `src/coj/core/dictionary.py` and explicit XML maps in `src/coj/xml/dictionary_xml.py`.

## TXT corpus grammar and meaning

### Document and text boundaries

- **Explicit:** one TXT file is one document.
- **Explicit:** nonempty blocks separated by blank lines become current `Utterance` objects (project-facing: texts).
- **Implementation:** serialization emits one blank line between texts and a final newline; historical terminal blank-line count is not preserved.

### Header

Example:

```txt
=N(" mi ato tukuru ... ")
```

- **Project-author decision:** this is a manually supplied first-stage word-segmented transcription, not a title.
- The parser recognizes `=<word>(...)`, extracts inner text, and stores it as `<block header="...">`.
- XML → TXT emits the canonical wrapper `=N(" {header} ")` regardless of harmless historical wrapper spacing.
- The header and tree forms are independently meaningful. Neither may silently replace the other.
- Segmentation may differ intentionally (CEQ-002); underlying content should not normally differ (DI-007).

### Text ID

Example:

```txt
ID,MYS.3.235a
ID,1_EN_01
ID,MYS.14.3352;azuma_uta
```

- An `ID,` line identifies the whole text block.
- IDs already in dotted form are retained as the XML block `id`.
- Legacy `number_collection_volume` EN/SM IDs are canonicalized for XML display: `1_EN_01` becomes `EN.1.1`.
- The exact TXT spelling is preserved in `<roundtrip-data source-id="...">` and is preferred when reconstructing TXT.
- Semicolon suffixes in some MYS IDs are currently treated as opaque ID text; their formal metadata semantics remain PAQ-010.
- The data contains a duplicate legacy ID `1_SM_15` (DI-001); conversion does not enforce document-wide uniqueness.

### Tree path line

Typical examples:

```txt
IP-MAT,NP,N,L000006a,LOG,nu
IP-MAT,VB-ADC,L031257a,VB-STM,L031258a,PHON,dwori
```

The fields before the final annotations describe an ordered root-to-leaf path. A lemma-ID-shaped field immediately after an internal tag is attached to that internal node. At a normal leaf, the final ASCII word form, preceding writing-mode/script tag, and optional preceding lemma are separated from the path.

**Implementation limitation:** ordinary word recognition is `^[A-Za-z]+$`. Valid special non-ASCII forms after `ILL` are therefore misclassified as path tags (DI-004).

When a source tag cannot be used literally as an XML element name, it is sanitized and the original is stored as `raw_tag`. XML → TXT prefers `raw_tag`.

The parser preserves legacy `multi-clause` input without automatically renaming it to `multi-sentence`.

### `;@N` distinction labels

Example:

```txt
...,C-NP;@5,...
```

- **Project-author decision:** `;@N` distinguishes structurally separate occurrences with the same relevant base tag/path.
- `N` is a distinction label, not necessarily an ordinal.
- Do not renumber, normalize, or “correct” unusual values without editorial approval.
- TXT → XML removes the suffix from the element name and stores `index="N"`.
- If an unsuffixed sibling shares a base tag with suffixed siblings, the XML builder can store `index="1" inferred_index="1"` so it remains distinct. `inferred_index` suppresses `;@1` on XML → TXT.
- A suffix on a writing-mode tag is stored as `phon_index`; its intended domain rule remains PAQ-008.

### Numbered `,*` markers

Example:

```txt
IP-MAT,IP-ARG,0@神主祝部等諸聞食登,*
```

- **Project-author decision:** these are not generic comments. The payload contains source/original text and the line can encode segment and structural-boundary information.
- The path before `N@...` names a syntax parent. The next syntax child below that parent begins a new constituent; same-tag constituents separated this way must not be merged.
- The exact raw line and its position among corpus lines are preserved as `<roundtrip-data>/<comment position="..." raw="...">`.
- Each regex-recognized marker also starts one derived `<raw-text>/<sentence>` segment.
- **Implementation:** original marker numbers are not copied into the derived sentence number. XML sentences are numbered sequentially from 1. Exact marker numbers survive only inside `roundtrip-data`.
- Marker numbers can restart or have gaps in existing data, so their intended semantics are not inferred here (PAQ-003).
- Two malformed/ambiguous marker-like lines are recorded as DI-006.

### `NULL,*`

Example:

```txt
IP-MAT,IP-ADV,COP-INF,NULL,*
```

- Current line classification treats it as a `CommentLine`, because every line ending in `*` is non-tree data.
- It is preserved in `roundtrip-data`, but it does not become a syntax leaf and it does not start a raw-text sentence because it lacks `N@payload`.
- The repository contains 347 cases in 300 texts across 45 documents.
- The intended linguistic/computational semantics require the chief editor (CEQ-005; DI-005).

### Multipart words

Example:

```txt
...,VB-NML,L030199a,LOG,ipa
...,VB-NML,L030199a,PHON,ku
```

- **Explicit project-author confirmation:** consecutive lines with the same complete syntax path and lemma, differing in script tag, are components of one word.
- XML stores one leaf with combined `form="ipaku"`, blank leaf `phon`, and ordered `<form-parts><part .../></form-parts>`.
- Each part retains its form, writing-mode tag, and optional tag distinction index.
- XML → TXT emits one path line per part in stored order.
- `;@N` means a genuinely separate sibling and prevents multipart grouping.
- Historical migration evidence: 3,018 words made from 6,109 original lines in 1,792 texts across 84 documents (`reports/multipart_words.md`).

### Other forms and legacy tags

- Lines with an ASCII form but no recognized writing-mode tag are accommodated by treating the penultimate field as the leaf tag and omitting `phon` on reconstruction.
- Internal node lemmas are supported.
- Empty XML leaf `form`/`phon` values are omitted as TXT fields.
- The literal token `*T*`, unusual root/tag spellings, and several legacy annotations survive through permissive path parsing and `raw_tag`, but their formal status is not fully specified (PAQ-007, PAQ-009).

## TXT corpus → model → XML mapping

| TXT construct | Intermediate model | XML result | Evidence/status |
|---|---|---|---|
| TXT file | `CorpusDocument` | `<corpus filename="source-name">` | Implementation; filename mapping is not a full semantic schema |
| Blank-line block | `Utterance` | `<block>` | Explicit current format |
| `ID,<source-id>` | `CommentLine.sentence_id` | canonical `block@id`; exact `roundtrip-data@source-id` | Explicit current behavior |
| `=N(" words ")` | header `CommentLine` | `block@header="words"` | Project-author meaning; canonical wrapper on reverse |
| comma path | `CorpusLine.synt_path` | nested elements | Explicit/strong |
| internal tag followed by lemma ID | path node key | internal element `lemma` | Implementation supported by tests/data |
| leaf lemma | `CorpusLine.lemma_id` | leaf `lemma` | Explicit |
| script tag | `CorpusLine.phon_tag` | `phon` and optional `phon_index` | Implementation naming |
| ASCII form | `CorpusLine.word_form` | `form` | Implementation restriction |
| `TAG;@N` | node key with suffix | `TAG index="N"` | Project-author distinction rule |
| unsuffixed same-tag peer | ordinary tag plus suffixed peer evidence | `index="1" inferred_index="1"` | Implementation bridge; reverse suppresses `;@1` |
| numbered marker | `CommentLine`; transient boundary attached to next corpus line | exact positioned roundtrip comment; syntax split; derived raw-text sentence | Project-author/strong |
| `NULL,*` | `CommentLine` | roundtrip comment only | Implementation; semantics unresolved |
| multipart run | several `CorpusLine`s | one leaf plus ordered form parts | Explicit confirmed convention |
| invalid XML-name tag | raw path token | sanitized element plus `raw_tag` | Implementation preservation mechanism |

### How same-tag node distinctions are preserved

The recursive builder groups consecutive lines sharing the node key at each depth. It must end a group when the base/index key changes or when a pending marker boundary says the next child starts below that parent. Therefore three different mechanisms can create distinct adjacent same-tag nodes:

1. explicit different `;@N` labels;
2. an unsuffixed occurrence beside explicitly suffixed occurrences (represented by inferred XML index 1);
3. a numbered marker boundary between otherwise identical-looking runs.

The marker-boundary migration restored 4,020 constituent boundaries covering 26,105 original annotation lines in 1,818 texts across 105 documents (`reports/kanji_marker_boundaries.md`).

## Derived `<raw-text>`

Current shape:

```xml
<raw-text role="processing">
  <sentence n="1">
    <kanji>侍</kanji>
    <transcription>ugonapar eru</transcription>
  </sentence>
</raw-text>
```

TXT → XML starts a `<raw-text>` segment at every regex-recognized numbered marker, copies its payload to `<kanji>`, and appends every subsequently recognized word form until the next marker. It renumbers those segments from 1.

**Project-author decision:** `<raw-text>` is derived, machine-generated processing data. It is not edited independently; it should be regenerated after relevant source/tree changes and must not silently compete with the source/tree data. The current child name `<kanji>` is retained for compatibility even when a value is a placeholder.

Current conflict behavior is not a validation rule:

- TXT → XML regenerates `<raw-text>`.
- XML → TXT ignores `<raw-text>` and reconstructs markers from `roundtrip-data` plus paths/forms from the tree.
- `treditor` displays `<raw-text>` directly.
- no converter currently reports disagreement among header, tree forms, roundtrip markers, and `<raw-text>`.

Thus independently editing XML `<raw-text>` has no guaranteed round-trip meaning. Precise regeneration/validation policy remains PAQ-002.

## Round-trip metadata

`<roundtrip-data format="coj-txt">` currently contains:

- exact `source-id` for reconstruction;
- ordered `<comment position="K" raw="...">` entries, where `K` counts preceding corpus lines.

XML → TXT collects all syntax leaves, then reinserts comments at their recorded positions. Position values outside the current range are clamped; invalid positions become zero. Legacy direct `<comment>` children are also read for backward compatibility.

Marker comments are simultaneously serialization evidence and inputs to syntax construction during TXT → XML. Calling the container “round-trip-only” must not be read as saying marker boundaries are semantically irrelevant.

## XML corpus → model → TXT mapping

| XML construct | Model/reconstruction | TXT result | Limit |
|---|---|---|---|
| `<corpus>` | XML-backed `CorpusDocument` | one TXT file | `filename` is not emitted inside TXT |
| `<block id header>` | XML-backed current `Utterance` | canonical header and final ID line | source ID overrides block ID if present |
| nested syntax element | ancestor list for each leaf | repeated comma path | only recognized syntax children participate |
| `raw_tag` | preferred node name | original tag spelling | absent extensions are not preserved magically |
| `index=N` | node label | `;@N` unless `inferred_index` exists | distinction label retained, not renumbered |
| internal/leaf `lemma` | path/leaf annotation | lemma field | malformed IDs may not be exposed through typed accessors |
| leaf `phon`, `phon_index`, `form` | leaf annotation | final fields | empty fields are omitted |
| `<form-parts>` | multiple XML-backed `CorpusLine`s | one line per part | ordered |
| roundtrip comment | positioned `CommentLine` | exact raw line | position is relative to reconstructed corpus lines |
| roundtrip source ID | source ID accessor | exact `ID,...` | otherwise block ID is used |
| `<raw-text>` | ignored by TXT serializer | nothing directly | derived view, not reverse source |

## Dictionary TXT grammar

```txt
---------------------------------------------------
=== L000006a
.GLOSS<TAB>NEG
.MEANING<TAB>[negative]
.FORM<TAB>nu
.KANA<TAB>ヌ
.POS<TAB>auxiliary
```

- A 51-dash line starts an entry block.
- `=== <LemmaID>` identifies the entry.
- A field line is a leading dot plus ASCII uppercase letters, optional numeric `[index]`, optional tab, then the value.
- Repeated fields and explicitly indexed fields become ordered lists. Indexed values are flushed in numeric index order after unindexed values.
- Unrecognized nonblank lines are currently silently skipped (DI-003 demonstrates a truncated continuation).
- Duplicate IDs silently replace an earlier in-memory entry because `Dictionary` is keyed by ID (DI-002).

### Dictionary XML mappings

| TXT/model fields | XML |
|---|---|
| `.GLOSS` | `<gloss>` |
| `.MEANING` | `<meanings><meaning>` |
| paired `.FORM` / `.KANA` | `<forms><form phonemic="..." kana="...">` |
| `.POS` | `<pos><value>` |
| `.ITYPE`, `.VCLASS`, `.GEO`, `.PTR` | correspondingly named wrappers with `<value>` |
| `.NOTE` and `.NOTES` | merged `<notes><note>`; reverse uses `.NOTE` |
| `.COMPOUND`, `.RELATED`, `.MKTARGET`, `.MKTARGETNEW`, `.DERIVATION`, `.TRANSREL` | field-specific wrapper and `<ref target form raw>` |
| `.CORRESP`, `.AFFIX`, `.ACCENTCLASS`, `.USE`, `.TRANSITIVITY`, `.INTRVCLASS` | singular named element |

The `raw` attribute on cross-references preserves exact legacy reference values while structured `target` and `form` attributes support computation. Forms with missing corresponding kana receive an empty XML `kana`; extra kana with no form are not serialized.

**Project-author decision:** formal new fields require explicit bidirectional mappings. Unknown fields do not need automatic preservation, but silent loss of a field that has become formal is unacceptable. Current mappings are scattered and unknown TXT lines/XML children are skipped rather than reported.

## Canonicalization: current behavior

These are observed serializer behaviors, not all final policy decisions.

### Corpus

- UTF-8 XML declaration and two-space ElementTree indentation.
- One blank line between TXT texts and a final newline.
- Canonical header wrapper `=N(" words ")`.
- Legacy EN/SM ID canonicalization in `block@id`, with exact source ID retained separately.
- Child order follows source/tree order.
- Explicit `;@N` labels are preserved; inferred index 1 is not emitted as `;@1`.
- Multipart parts retain stored order.
- Derived raw-text sentence numbers are sequential from 1 rather than historical marker labels.

### Dictionary

- `Dictionary.to_text()` uses current insertion/source order; `sorted_entries()` exists but serialization does not call it.
- `DictEntry.normalise()` places required fields first in this order: `.GLOSS`, `.MEANING`, `.FORM`, `.KANA`, `.POS`; remaining fields retain insertion order.
- TXT repeats list-valued tags without explicit indices.
- Dictionary XML emits known categories in a fixed code-defined order regardless of original field order.
- XML root version is always `1.0` on serialization.
- XML → model maps `<notes>` to `.NOTE`; `.NOTES` spelling is not retained.

**Project-author decision:** dictionary entry/field order is not semantic, but output should ultimately be deterministic. The exact entry ordering and complete field order are not yet finalized (PAQ-016 and PAQ-017).

## Losslessness guarantees and limits

### A. Semantic losslessness

Current converters preserve the semantics they formally recognize: text IDs, headers, supported tree annotations and node order/distinctions, marker source text/positions, multipart words, and mapped dictionary fields.

They do **not** provide an unconditional semantic-lossless guarantee over all current source data:

- duplicate dictionary ID `L080539` loses the first entry on TXT parsing;
- the second physical line of the multiline L051953 note is ignored;
- non-ASCII `ILL` forms become syntax elements rather than forms;
- `NULL,*` semantics are unresolved and current conversion keeps them outside the tree;
- malformed marker-like lines survive as raw lines but do not receive normal marker processing;
- unknown dictionary fields and unknown XML constructs are not reported/preserved by a general extension mechanism.

### B. Structural losslessness

For the current interpreted corpus schema, an audit of all 115 current corpus XML files found stable syntax/annotation signatures after XML → TXT → XML; the current dictionary XML was likewise stable under the supported model. This is strong evidence that current XML is structurally stable under its own interpretation.

It is not proof that the interpretation is editorially correct. ILL and NULL show that a structurally stable round trip can preserve the wrong or incomplete model.

### C. Exact textual/formatting identity

Not guaranteed. An audit found 88 of 115 corpus files textually identical after newline normalization, while 27 differed only in terminal blank-line treatment. More generally, serializers normalize header wrapping, blank lines, XML indentation, dictionary repeated/indexed syntax, XML field order, and some ID/derived numbering. Line endings can also differ by platform/Git settings.

Formatting identity should not be used as the sole semantic test. Conversely, semantic equivalence should not excuse unstable output; deterministic canonicalization remains important for useful diffs.

## XML constructs without a complete independent reverse rule

- `<raw-text>`: deliberately derived and ignored by XML → TXT; regeneration/conflict validation is not implemented.
- `<corpus filename>`: file metadata with no embedded TXT equivalent.
- `<raw-text role>` and `<roundtrip-data format>`: current constants, not a versioned formal schema.
- `<dictionary version>`: written but not used to select a parser/migration.
- legacy direct `<comment>` children: accepted on read and folded into current round-trip behavior.
- arbitrary XML attributes/children, XML comments, namespaces, and unknown dictionary child elements: no general preservation rule.
- `inferred_index`: an XML bridge for TXT distinction behavior, not an independently authored TXT field.

These are current limitations, not invitations to infer automatic semantics for arbitrary XML extensions.

## Current cautions

1. Marker paths preserve real syntax-hierarchy boundaries.
2. XML became the data read by applications/processors and the README currently calls it “canonical (primary)” and TXT “derived.” The project-author model instead treats TXT as the current human authoring representation and XML as computational. This unresolved operational wording is PAQ-001; neither file syntax should be equated with semantic authority.
3. Compatibility attributes (`raw_tag`, `source-id`, `inferred_index`, and cross-reference `raw`) preserve source distinctions that regenerated-looking syntax cannot always recover.
