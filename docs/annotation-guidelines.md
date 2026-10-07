# COJ annotation guidelines

Current specification for annotation-related development. Confirmed rules and acceptance cases are stated below; unresolved decisions are listed separately in section 6. This document does not authorize corpus corrections.

## 1. Authority and terminology

### AUTH-01 — Sources of authority

Linguistic rules come from project-author decisions, the designated `D:\Lanxin\Desktop\ONCOJ Abbr List.docx`, and confirmed Editor-in-Chief guidance. [tag_names.json](../treditor/tag_names.json) supplies display expansions, not a complete classification registry.

The confirmed editorial guidance is documented in [the annotation audit](../reports/annotation-audit-5558e2a.md). Code descriptions and inferred corpus patterns are not independent linguistic authority.

### TERM-01 — Separate the concepts

| Concept | Meaning |
| --- | --- |
| Tag category | An authoritatively defined annotation category. |
| Lexical or grammatical item | The item's classification under the confirmed principles. |
| Word status | Whether a structure constitutes a word. |
| Segmentation unit | A group produced by the specified segmentation procedure. |
| Tree terminal | A smallest unit represented in the existing tree, not necessarily a complete word or analyzed morpheme. |
| Dictionary-entry status | Association with an independent entry through a lemma ID. |

Syntactic decomposition, word segmentation, lexical classification and dictionary-entry status are distinct. A word may contain separately annotated lexical and grammatical components.

Use **text** for an identified unit such as `BS.1`; final scholarly terminology remains provisional. See [the glossary](glossary.md).

## 2. Categories and word structure

### CAT-01 — Category lists

**Parts of speech: Words**

`VB`, `ADJ`, `WH-ADJ`, `COP`, `N`, `DVN`, `PEN`, `PLN`, `PRO-N`, `WH-N`, `ADV`, `PRO-ADV`, `WH-ADV`, `INTJ`, `NUM`, `WH-NUM`, `P`, `XTN`, `MK`, `WORD`.

**Parts of speech: Bound morphemes**

`ACP`, `VAX`, `PFX`, `SFX`, `CL`.

Items in the Words category are lexical items; items in the Bound morphemes category are grammatical items.

### CAT-02 — Confirmed labels and usage

- `NP-APP` labels an appositional noun phrase.
- `WH-ADV` is the wh-adverb label.
- `NLOG` is the accepted writing-mode spelling.
- `FRM` means **frame**. It introduces complement clauses and accompanies a nominal form. Both `IP-NMZ-FRM` and `PP-FRM` are acceptable; no standardization between them is specified.
- `multi-clause` is not an accepted grouping label. Its replacement requires editorial confirmation.

EN and SM legacy markup is deferred for editorial review. Do not normalize its unconfirmed categories by analogy with uploaded trees. Do not assign meanings or classifications to undocumented tags by analogy.

### WORD-01 — Internally structured words

Internal children do not by themselves prevent a structure from being a word or lexical item. In BS.1, `N miato` contains grammatical `PFX-HON mi` and lexical `N ato`; the combined noun is also lexical. Its components retain their own classifications.

### WORD-02 — Phrase heads and higher structures

An `NP` can have an `N` head or an `NP` head. Do not require an extra word-level `N` merely to provide an `N` head.

Do not determine the word status of an exceptional higher structure solely from its Words-category tag or topology. Regardless of word status, segmentation must preserve any phrase-level or higher boundaries inside it.

## 3. Segmentation

### SEG-01 — Three representations

| Representation | Rule |
| --- | --- |
| Tree-terminal segmentation | Expose existing terminals without new morphological analysis. |
| Word-level segmentation | Merge upward from smaller units; stop at phrase-level or higher boundaries. |
| Hyphenated word-level segmentation | Keep the same word-level boundaries; show annotated internal morpheme boundaries with hyphens. |

Use **tree-terminal segmentation**, not “morpheme-level segmentation,” for the existing tree's finest represented units.

### SEG-02 — Input and order

Use the existing ordered tree and its forms. Preserve their sequence and spelling: segmentation changes boundaries, not textual content or annotations.

Do not substitute the manually segmented header for the tree. A lemma ID does not instruct segmentation to merge, split or infer missing decomposition.

### SEG-03 — Merge upward and preserve stopping boundaries

1. Begin with ordered terminal material.
2. Recombine smaller components within internal structures until reaching a phrase-level or higher constituent.
3. Keep that constituent's word-level groups separate.
4. Preserve the boundary when processing higher ancestors; a Words-tagged ancestor cannot erase it.

A phrase with one word-bearing child still prevents that child's material from subsequently merging with material outside the phrase. Clauses follow the same rule.

### SEG-04 — Confirmed stopping boundaries

- `NP`, `PP`, `IP` and `CP`, including documented subtypes; `IP` includes clauses.
- `CONJP`, a coordinated phrase.
- `multi-sentence`, a sentence-level grouping.

Once a label is established as phrase-level or higher, SEG-03 applies. Classification of unresolved labels remains under TBD-01.

### SEG-05 — BS.1 acceptance case

Relevant structure:

```text
IP-REL
├── NP-OB1
│   └── N
│       ├── PFX-HON    mi
│       └── N          ato
└── VB-ADC             tukuru
```

Required outputs:

```text
tree-terminal:          mi ato tukuru
word-level:             miato tukuru
hyphenated word-level:  mi-ato tukuru
```

The components `mi` and `ato` merge below `NP-OB1`; the phrase boundary keeps `tukuru` separate.

### SEG-06 — KK.30 and MYS.2.150 acceptance cases

**KK.30 — relevant structure**

```text
VB-ADN
├── N                  awokakiyama
└── VB-ADN
    ├── VB-STM         gomor
    └── VAX-STV-ADN    eru
```

Author-confirmed word-level output: **`awokakiyamagomoreru`**. No internal phrase boundary separates the noun and verbal material.

**MYS.2.150 — relevant appositional portion**

```text
NP
└── NP-APP
    ├── IP-REL
    │   ├── IP-ADV
    │   │   └── VB-GER (sakari + wite)
    │   ├── NP-ADV (asa)
    │   └── VB-ADC (nageku)
    └── N (kimi)
```

Required word-level output for this portion: **`sakariwite asa nageku kimi`**. The phrase boundaries remain distinct. The illustration covers one appositional portion, not the entire text.

### SEG-07 — No inferred terminal decomposition

A single terminal `VB-CND saraba` remains **`saraba`** in tree-terminal segmentation. Do not invent a stem/ending boundary in an unanalyzed terminal.

### SEG-08 — Hyphenation

Hyphens expose represented internal morpheme boundaries without changing word-level groups or phrase-boundary spaces. They do not establish new lexical items or dictionary entries.

`mi-ato tukuru` is confirmed. A writing-mode change alone is not an approved reason to introduce a hyphen; other boundary-selection details remain under TBD-02.

### SEG-09 — Display independence

Segmentation boundaries come from the annotated structure, not node visibility, lemma display or layout depth. Collapsing a subtree does not remove its internal phrase boundaries.

## 4. Lexical combinations and dictionary entries

### LEX-01 — Combination principles

- Lexical + lexical **may** create a new lexical item; adjacency alone does not establish this.
- Lexical + grammatical normally does **not** create a new lexical item.
- Combinations involving `PFX`, `SFX` or `CL` may be exceptions, determined by editorial judgment.

Word-level recombination does not itself decide lexical-item or dictionary-entry status.

### LEM-01 — Independent entry criterion

In principle, assign a lemma ID to a form or expression a reader would reasonably expect to find as a dictionary entry. It may be lexical, grammatical or another expression warranting independent treatment.

Lemma presence is not a lexical-item test; dictionary entries are not restricted to Words-category items.

### LEM-02 — Parent and component IDs

When a combination warrants its own entry, assign its lemma ID to the parent and retain component IDs where applicable.

BS.1 illustrates this:

```text
N                     titipapa   L050402
├── N                 titi       L050641
└── N;@2              papa       L051720
```

## 5. Structural and representation safeguards

### STRUCT-01 — Preserve genuine distinctions

Preserve child order, internal annotations and distinct nodes. `;@N` numbers are distinction labels, not necessarily ordinals; do not renumber them without editorial approval.

Numbered `,*` markers carry source/original-text information and can encode structural boundaries. Equal tag/path spellings do not justify merging constituents separated by such boundaries.

### REP-01 — Textual layers

The **header** is a manually supplied first-stage word-segmented transcription, not a text title. Both it and tree-level forms are meaningful. Segmentation may differ, but underlying content should not normally differ; neither layer silently replaces the other.

`<raw-text>` is derived processing information, not an independently edited authority or a definition of word segmentation.

### REP-02 — Multipart words

Consecutive TXT rows with the same complete path and lemma, differing only in writing-mode tag, are components of one word under the confirmed convention. Separate siblings require `;@N` where that convention calls for distinction.

XML stores a multipart word as one terminal with ordered form parts. Writing-mode decomposition is not morphological decomposition.

Representation details are in [TXT/XML round-trip rules](txt-xml-roundtrip.md).

## 6. Unresolved decisions

These decisions still require author/editorial confirmation. Do not fill them from apparent spelling corrections, UI behavior or processing heuristics.

| ID | Decision still needed |
| --- | --- |
| TBD-01 | Structural levels of unresolved `C-`, deferred legacy `APP-` labels, `FRAG` and other unclassified groupings. Confirmed `NP-APP` is a phrase, not an unresolved label. |
| TBD-02 | Internal morpheme-boundary selection for hyphenation beyond confirmed examples, including nested and multipart structures. |
| TBD-03 | Segmentation treatment of traces, null/empty terminals, special ILL forms, malformed labels and missing forms. |
| TBD-04 | Multiple-root/segment formatting and unusual whitespace; acceptance cases specify ordinary spaces between groups. |
| TBD-05 | Unspecified grammatical + grammatical and phrase-spanning combination cases. |
| TBD-06 | Meanings, classifications, aliases and permitted combinations of remaining unconfirmed annotations. Confirmed usage in CAT-02 is excluded. |
