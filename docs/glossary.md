# COJ Glossary

This glossary uses project-facing language wherever possible. Names such as `Utterance`, `sentence_id`, and `<kanji>` are retained when referring to the current implementation, but they do not determine the project's scholarly terminology.

## Quick terminology map

| Project-facing term | Current implementation term |
|---|---|
| Document | `CorpusDocument`; one corpus file |
| Text (provisional) | `Utterance`; also called passage, sentence, or poem in parts of the UI/API |
| Text ID | `sentence_id`; `<block id>` |
| Manually segmented transcription | Header; `<block header>` |
| Source/original text | `<raw-text>/<sentence>/<kanji>` and numbered TXT marker payloads |
| Writing-mode or script tag | `phon` / `phon_tag` |
| Human-facing authoring representation | Currently TXT |
| Machine-facing computational representation | Currently XML |

The preferred name for a unit such as `MYS.1.1` is not final. The project author currently prefers **text**; see CEQ-001 in [chief-editor-questions.md](chief-editor-questions.md).

## Corpus units

### Document

A file-level corpus grouping such as `BS.xml` or `MYS_01.xml`. The current Python class is `CorpusDocument`. A document contains multiple texts.

### Text

The provisional project-facing term for an individually identified unit such as `BS.1` or `MYS.1.1`.

The current Python class is `Utterance`. The code and interface also use *passage*, *sentence*, and historically *poem*. These implementation names do not settle the final scholarly term.

### Passage

A general-language and current UI synonym for an individually openable text. It is not a separate model class. Project documentation should normally prefer **text** when it means the identified corpus unit.

### Sentence

Potentially a linguistic sentence or a numbered segment inside XML `<raw-text>`. A raw-text sentence is a derived processing segment and must not automatically be equated with a whole identified text.

### Text ID

The identifier of an individual text, for example `MYS.1.1`. The current property name is `sentence_id`.

### Source ID

The exact ID spelling found in TXT. It is preserved in `<roundtrip-data source-id="...">` so XML can reconstruct TXT identifiers such as `1_EN_01`, even when the XML block uses the canonical ID `EN.1.1`.

## Textual layers

### Header

The current code and file-format term for a manually supplied, first-stage word-segmented transcription. It is **not** the title of a text.

The header and the forms in the syntax tree are both meaningful. They may differ in segmentation and must not silently replace one another. See [data-model.md](data-model.md#header-tree-forms-source-text-and-raw-text).

### Transcription

A romanized or phonemic textual rendering. In this project the word may refer to the manually segmented header, the sequence of tree forms, or a derived transcription inside `<raw-text>`. Documentation should say which layer is meant.

### Tree-derived transcription

The ordered sequence of recognized word forms read from syntax-tree leaves.

### Source/original text

The original-script material associated with a text segment. Current XML calls the field `<kanji>`, although some values are placeholders rather than kanji. Final terminology is still open; see CEQ-003.

### Raw text

The current XML element `<raw-text role="processing">`. It is a machine-generated view that pairs source/original-text segments with derived transcriptions.

It is not independently edited and must not become a competing authoritative source. Details are in [txt-xml-roundtrip.md](txt-xml-roundtrip.md#derived-raw-text).

## Representations

### Corpus semantic content

The scholarly content being represented: identified texts, source text, transcriptions, segmentation, syntax, word forms, lemmas, writing-mode annotations, dictionary information, and meaningful distinctions.

This content is abstract. It is not identical to a particular TXT or XML byte sequence.

### Authoring representation

A representation intended for human editors to maintain. The current authoring representation is TXT, but TXT is provisional and may be replaced.

### Computational representation

A structured representation intended for processing, search, visualization, and applications. The current computational representation is XML.

XML is not itself the abstract semantic model, and not every XML field is independently authoritative.

## Syntax and annotation

### Syntax tree

The ordered hierarchical constituent structure associated with a text. TXT records it as repeated root-to-leaf paths; XML records the hierarchy directly.

### Node

One constituent or leaf in a syntax tree. XML syntax elements represent nodes.

### Leaf

A terminal tree node. A normal leaf carries a word form and may carry a lemma and writing-mode annotation. A multipart word is one leaf with several ordered form parts.

### Tree path line

A TXT line that lists a root-to-leaf syntax path followed by annotations such as lemma ID, writing-mode tag, and word form. The current class is `CorpusLine`.

### Marker

A TXT line ending in `,*`. Numbered markers such as `0@神主祝部等,*` carry source/original text and can also mark segment and syntax boundaries.

Although the current class is `CommentLine`, numbered markers are not ordinary comments.

### Marker boundary

A structural boundary inferred from a numbered marker's path. The next child below the named parent begins a distinct constituent, even if it has the same tag as the preceding child.

### Distinction label (`;@N`)

A label that distinguishes separate occurrences of the same relevant base tag or path. The number is not necessarily an ordinal: `C-NP;@5` need not mean “the fifth C-NP.”

These labels must not be renumbered or corrected without editorial approval.

### Multipart word

One word represented historically by consecutive TXT lines with the same complete syntax path and lemma but different writing-mode tags. XML stores it as one leaf with ordered `<form-parts>`.

A `;@N` distinction instead indicates a separate sibling.

### Word form

The form attached to a leaf or multipart component. The current TXT parser recognizes ordinary forms using an ASCII-only rule; special non-ASCII `ILL` forms expose a known limitation (DI-004 in [data-issues.md](data-issues.md)).

### Writing-mode/script tag

An annotation such as `LOG`, `PHON`, `NLOG`, `PHON-ON`, `BPHON`, or `ILL`. Current code uses the names `phon` and `phon_tag`, although the category is broader than phonographic writing alone.

### Lemma

A dictionary headword identity associated with a word or node. It is represented by a `LemmaID`, such as `L000520`.

## Dictionary

### Dictionary

The ordered collection of lemma entries. The current class is `Dictionary`; the current files are `dictionary.txt` and `dictionary.xml`.

### Dictionary entry

One lemma record with an ID and named fields. The current class is `DictEntry`. Some fields contain one value and others contain an ordered list of values.

## Conversion and preservation

### Round-trip data

XML metadata retained specifically to reconstruct current TXT conventions. `<roundtrip-data>` stores the exact source ID and positioned raw marker/comment lines.

Marker lines are stored there, but their boundary information can still be structurally meaningful.

### Canonical serialization

A deterministic textual form for the same represented information, so version-control diffs remain stable and useful. Canonical formatting does not make formatting itself semantic.

### Semantic losslessness

Preservation of the intended scholarly meaning.

### Structural losslessness

Preservation of formal structure: tree hierarchy and order, distinct nodes, multipart components, and other modeled relationships.

### Textual identity

Exact preservation of spelling, whitespace, line endings, field order, and layout. Current TXT/XML conversion does not guarantee exact textual identity.

## Editorial workflow

### Draft

Unpublished changed state. The term is currently inconsistent:

- in `treditor`, it means a browser-local JSON copy of one syntax tree;
- in `scripteditor`, it can refer to run-local processor proposals and review choices.

There is no shared project-wide draft model.

### Review state

The persistent record of work awaiting review and the decisions already made. `scripteditor` currently supports review interactions, but an unfinished review is not reliably persisted.

### Provenance

Information that explains where a data state or change came from—for example the person or process, source/base state, time, and processor or script. Current provenance is partial and has no final schema.
