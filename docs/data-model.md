# Current data model

This document explains what the corpus conceptually contains and how those concepts appear in the current Python, TXT, and XML representations.

Definitions are collected in [glossary.md](glossary.md). Exact conversion rules and limitations are in [txt-xml-roundtrip.md](txt-xml-roundtrip.md).

## Representation layers

**Project-author decision:** the project has an abstract semantic layer and two current representations:

```text
corpus semantic content
        ↕
human/editor-oriented authoring representation (currently TXT; provisional)
        ↕ conversion / serialization
machine-oriented computational representation (currently XML)
```

TXT is not a permanent architectural requirement. XML is not the semantic model itself. The current Python implementation mediates between both, but is not yet fully representation-independent.

## Semantic concepts and current classes

| Semantic concept | Current Python representation | Current TXT representation | Current XML representation |
|---|---|---|---|
| Corpus document | `CorpusDocument` | One `.txt` file containing blank-line-separated blocks | `<corpus filename="...">` containing `<block>` elements |
| Individually identified text | `Utterance` (implementation name) | One block with header, paths/markers, and `ID,...` | One `<block id="..." header="...">` |
| Ordered source lines | `CorpusLine` or `CommentLine` | Literal lines inside a block | Syntax nodes plus `<roundtrip-data>` metadata; not every source line is a syntax node |
| Syntax tree | Built from `CorpusLine.synt_path` sequences | Repeated comma-separated root-to-leaf paths | Nested syntax elements directly represent hierarchy |
| Syntax node | Implicit grouping in paths | A path component, possibly with `;@N` and an embedded lemma | An XML element, possibly with `index`, `inferred_index`, `raw_tag`, and `lemma` |
| Word/leaf | Usually one `CorpusLine`; several for a multipart word | Final path tag plus optional lemma, writing-mode tag, and form | Leaf element with `lemma`, `phon`, `form`; optional ordered `<form-parts>` |
| Original/source-text segment | Numbered marker payload | `N@source-text,*` at a path position | Derived `<raw-text>/<sentence>/<kanji>` plus exact raw line in `<roundtrip-data>/<comment>` |
| Header transcription | `CommentLine` recognized by `=...(` | `=N(" ... ")` | Bare text in `<block header="...">` |
| Lemma identity | `LemmaID` | ID-shaped field such as `L000520` | `lemma` attribute and matching dictionary `<entry id>` |
| Dictionary | `Dictionary` | Separator-delimited entry blocks | `<dictionary version="1.0">` |
| Dictionary entry | `DictEntry` | `=== ID` plus dot-prefixed fields | `<entry id>` with field-specific child structures |

## Concrete example: `BS.xml` and `BS.1`

- `data/xml/trees/BS.xml` is one **document** and is represented by `CorpusDocument`.
- Its `<block id="BS.1" ...>` is one individually identified **text** and is represented by the current `Utterance` class.
- The block's `header` is the manually segmented header transcription.
- `<raw-text role="processing">` contains derived source-text/transcription segments.
- All other direct block children are syntax-tree roots.
- Nested elements are constituents; terminal elements with `form` are word/leaf nodes.
- `roundtrip-data` holds source-format details needed to recreate current TXT, not an alternative tree.

## `CorpusDocument`

`CorpusDocument` represents a whole file. In TXT mode it parses nonempty blocks separated by blank lines. In XML mode it wraps a `<corpus>` element. It exposes ordered `Utterance` objects, lookup by current text ID, and corpus-line queries.

The document boundary is currently coupled to files: filename and directory (`text` versus `trees`) supply collection/application context not modeled as richer domain objects.

## `Utterance` (project-facing: text)

The class represents one block. Its important accessors are:

- `header`: the current manually segmented header line/attribute;
- `sentence_id`: the current implementation name for the text ID;
- `lines`: reconstructed source order;
- `corpus_lines()`: word/tree-path records;
- `comment_lines()`: round-trip marker/comment records.

Implementation names do not determine the project-facing scholarly term; see [CEQ-001](chief-editor-questions.md#ceq-001-project-facing-term-for-a-unit-such-as-mys11).

## `CorpusLine`

`CorpusLine` has two backing modes:

- field-list mode for TXT, where it owns a list of comma-separated strings;
- XML-backed mode, where it wraps a leaf, its ancestors, and optionally a multipart `<part>`.

Its interpretation is positional and regex-driven: ASCII word form at the end, writing-mode tag before it, optional lemma before that, and the remaining fields as the syntax path. This design is tightly coupled to the current TXT grammar. DI-004 shows a failure when a valid special word form is non-ASCII.

## `CommentLine`

`CommentLine` is an implementation bucket for every non-tree source line: header, ID, marker, or other raw line. This classification is not a semantic statement. In particular, numbered `,*` markers contain source text and can encode segmentation and structural boundary information.

## Syntax identity and structure

TXT does not assign a globally stable identifier to each node. Structure is recovered from:

1. ordered root-to-leaf paths;
2. embedded lemma-bearing nodes;
3. `;@N` distinction labels;
4. source line order;
5. marker-derived child boundaries;
6. the multipart-word convention.

XML gives nodes direct hierarchical identity within one parsed tree, but current node identity is still positional. `treditor` assigns temporary dot-separated child-index paths in browser memory. Those paths are not durable semantic IDs.

## Header, tree forms, source text, and raw text

These layers must remain distinct:

- The **header** is a manually supplied first-stage segmented transcription.
- The **tree-derived transcription** is the ordered sequence of recognized tree word forms.
- Numbered markers preserve **source/original text** and divide it into segments.
- XML `<raw-text role="processing">` is a derived pairing of marker payloads and tree forms encountered after each marker.

**Project-author decision:** both header and tree-level forms are meaningful. Their segmentation may intentionally differ; their underlying content should not normally differ. `<raw-text>` is derived and must not become an independently edited authority.

## Dictionary, entries, and lemma IDs

`Dictionary` is an insertion-ordered mapping keyed by the string form of `LemmaID`. `DictEntry` stores fields in insertion order and classifies fields as singular or multi-valued using constants from `src/coj/core/tags.py`.

TXT permits repeated fields and explicitly indexed fields such as `.MEANING[1]`. Both become ordered lists in memory. XML uses an explicit mapping table for known fields; forms and kana are paired by position, and cross-references receive structured attributes plus a `raw` value for exact reconstruction of legacy syntax.

**Project-author decision:** every formally introduced dictionary field must receive explicit bidirectional representation rules. Unknown future fields need not survive without such a rule, but unsupported formal data should eventually be detectable rather than silently discarded.

## Semantic data versus serialization details

The following are semantic or structural under current decisions/evidence:

- text identity and document membership;
- header content and its segmentation layer;
- source/original text carried by numbered markers;
- syntax hierarchy, child order, and distinct same-tag nodes;
- marker-derived boundaries;
- word forms, lemmas, writing-mode tags, multipart component order;
- dictionary field values and repeated-value order where meaningful.

The following primarily support current serialization or processing:

- exact `ID,...` spelling preserved as `source-id` (although the identifier itself is semantic);
- positioned raw marker lines in `roundtrip-data`;
- inferred XML index `1` used to preserve an unsuffixed TXT node alongside suffixed peers;
- XML indentation and ordinary whitespace;
- `<raw-text>` as a regenerable processing view.

Some items remain ambiguous rather than safely classifiable, notably marker numbers, `NULL,*`, anomalous marker-like lines, semicolon suffixes in text IDs, and several container metadata attributes. See the question documents.

## Tight coupling in the current implementation

1. `CorpusLine` infers meaning from current TXT field positions and ASCII-only regexes.
2. `Utterance` and `CorpusDocument` preserve historical names and assume current block/file boundaries.
3. Tree reconstruction depends on TXT-only marker positions held transiently on `CorpusLine` objects.
4. XML elements double as the mutable in-memory tree; there is no separate representation-neutral node class.
5. `raw_tag`, `index`, and `inferred_index` exist specifically to bridge XML naming/identity with TXT spellings.
6. Dictionary conversion rules are hard-coded across `dictionary.py`, `tags.py`, and `dictionary_xml.py`, rather than declared in one schema/registry.
7. Applications read XML directly and use its element names/attributes in API payloads.
8. Current tree drafts store a reduced rendering/editing JSON shape, not the complete semantic or round-trip model.

## Current semantic/data-model diagram

```text
Corpus
└── Document / CorpusDocument (file-level)
    └── Text / current Utterance (identified by text ID)
        ├── manually segmented header transcription
        ├── source/original-text markers and segment boundaries
        └── ordered syntax-tree roots
            └── constituent nodes
                └── leaf/word nodes
                    ├── lemma ID ───────────────┐
                    ├── writing-mode annotation │
                    ├── form or form-parts      │
                    └────────────────────────────┼──> Dictionary
                                                 │    └── DictEntry by LemmaID
                                                 └────── named field values
```
