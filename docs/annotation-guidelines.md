# COJ annotation guidelines

Working reference for annotation-related development. Confirmed rules below derive from project-author decisions, the authoritative abbreviation reference, and explicitly confirmed corpus examples. Unresolved rules are marked **TBD — requires author/editorial confirmation**. This document does not authorize changes to annotations, reference tables, or application behavior.

## 1. Authority and terminology

### AUTH-01 — Sources of authority

Use the project author's explicit decisions and the designated `D:\Lanxin\Desktop\ONCOJ Abbr List.docx` for linguistic categories. [tag_names.json](../treditor/tag_names.json) supplies corresponding display expansions; it is not a complete classification registry.

Application code, variable names, historical processors, tests, and inferred corpus patterns are not independent sources of linguistic authority.

### TERM-01 — Separate the concepts

Keep these dimensions distinct:

| Concept | Meaning in this guideline |
| --- | --- |
| Tag category | A category documented in the authoritative abbreviation reference. |
| Lexical or grammatical item | The item's classification under the confirmed annotation principles. |
| Word status | Whether a structure constitutes a word; exceptional higher structures require the narrower treatment in WORD-02. |
| Segmentation unit | A group produced by a specified segmentation procedure; not an automatic judgment of lexical-item or dictionary-entry status. |
| Tree terminal | One of the smallest units actually represented in the existing syntax tree. |
| Dictionary-entry status | Association with an independent dictionary entry, represented by a lemma ID. |

Syntactic decomposition and word segmentation are not equivalent. A word can contain separately annotated lexical and grammatical components. A terminal need not be a complete word or a fully analyzed morpheme.

Use **text** for an identified corpus unit such as `BS.1`; the final scholarly terminology remains provisional. Existing Python names and XML tags are not renamed by this guideline. See [glossary.md](glossary.md) for other project terminology.

## 2. Categories and word status

### CAT-01 — Authoritative category lists

The reference lists these base categories under **Parts of speech: Words**:

`VB`, `ADJ`, `WH-ADJ`, `COP`, `N`, `DVN`, `PEN`, `PLN`, `PRO-N`, `WH-N`, `ADV`, `PRO-ADV`, `WH-ADV`, `INTJ`, `NUM`, `WH-NUM`, `P`, `XTN`, `MK`, `WORD`.

It lists these under **Parts of speech: Bound morphemes**:

`ACP`, `VAX`, `PFX`, `SFX`, `CL`.

Items belonging to Parts of speech: Words are lexical items. Items belonging to Parts of speech: Bound morphemes are grammatical items.

Do not classify unlisted or undocumented tags by analogy; leave them unresolved pending authoritative confirmation.

### WORD-01 — Lower-level internally structured words

Lower-level cases are comparatively well-defined by existing categories and confirmed annotation rules. Internal children do not by themselves prevent a structure from being a word or lexical item.

**Confirmed example — BS.1:**

```text
NP-OB1
└── N                  miato
    ├── PFX-HON        mi
    └── N              ato
```

`mi` is a grammatical item; `ato` is a lexical item; the combined noun `miato` is also a lexical item. The inner lexical status of `ato` is not removed by its occurrence inside `miato`.

### WORD-02 — Exceptional higher structures

Do not determine whether an exceptional higher structure constitutes a word solely from its Words-category tag or tree topology. This restriction does not make word status generally uncertain at all levels.

**Confirmed examples:**

- In KK.30, the outer `VB-ADN`, which contains an `NP` and another verbal structure, can be regarded as a word.
- In MYS.2.150, the higher `N` containing appositional phrases is an annotation convention, not evidence that its entire yield is one word.

The corpus requires headed phrase structure: for example, an `NP` must have an `N` head. A high-level Words-category node can therefore serve structural uniformity without making all its descendants one word.

The program need not distinguish these exceptional cases automatically at this stage. Do not introduce a mechanical word-status classifier from these examples.

## 3. Segmentation specification

### SEG-01 — Three distinct representations

| Representation | Rule | BS.1 example |
| --- | --- | --- |
| Tree-terminal segmentation | Expose the existing terminal units; perform no new morphological analysis. | `mi ato tukuru` |
| Word-level segmentation | Merge upward from smaller units; stop at any phrase-level or higher constituent boundary. | `miato tukuru` |
| Hyphenated word-level segmentation | Keep exactly the same word-level boundaries; expose annotated internal morpheme boundaries with hyphens. | `mi-ato tukuru` |

Use **tree-terminal segmentation**, not “morpheme-level segmentation,” for the existing tree's finest represented units.

### SEG-02 — Input and order

Use the existing ordered syntax structure and its represented forms. Preserve their sequence and spelling; segmentation changes boundaries, not the forms' content or the corpus tree.

Do not substitute the manually segmented header for the tree or infer missing morphological decomposition from a dictionary entry. A lemma ID is not an instruction to merge or split forms.

### SEG-03 — Merge upward and stop at phrase-level or higher boundaries

The operational rule is:

> Start from smaller represented units and merge upward. Stop merging at any phrase-level or higher constituent boundary.

This includes clauses and higher syntactic groupings; clause boundaries do not require a separate special-case rule.

For implementation purposes:

1. Begin with the tree's ordered terminal material.
2. Recombine smaller components within the relevant internal structure until a phrase-level or higher constituent boundary is reached.
3. Keep the groups separated at that boundary. Do not concatenate the yields of separate children of a phrase-level or higher constituent into a single group.
4. Preserve the stopping boundary when processing higher ancestors. A Words-tagged ancestor does not permit merging across a phrase-level or higher constituent boundary already encountered inside it.

A phrase-level or higher constituent with a single word-bearing child still provides a stopping boundary: that child's material must not subsequently be merged with neighboring material outside the constituent merely because a higher ancestor is word-tagged. This is illustrated by KK.30 in SEG-06.

Thus, the rule is not “concatenate all descendants of every Words-tagged node.” Nor is it “put a space between every terminal.” It is independent of whether an exceptional higher structure is editorially regarded as a word.

### SEG-04 — Recognizing phrase-level or higher boundaries

The general stopping rule in SEG-03 is confirmed. Classification of a particular label determines whether that rule applies to it; it does not change the rule itself.

Confirmed stopping boundaries are:

- `NP`, `PP`, `IP`, and `CP`, including their documented subtypes. The authoritative reference identifies these as phrases, with `IP` including clauses.
- `CONJP`, explicitly identified in the authoritative reference as a coordinated phrase.
- `multi-sentence`, a sentence-level grouping.
- `multi-clause`, already established in the corpus investigation as a clause-level grouping.

**TBD — requires author/editorial confirmation (TBD-01):** Whether unresolved structural labels, such as the `C-` and `APP-` families, `FRAG`, and other unclassified grouping labels, are phrase-level or higher. Once a label is established as phrase-level or higher, SEG-03 requires merging to stop there; that consequence is not a separate open question. Do not infer an unresolved label's structural level from its spelling alone.

### SEG-05 — Confirmed BS.1 output

```text
IP-REL
├── NP-OB1
│   └── N
│       ├── PFX-HON    mi
│       └── N          ato
└── VB-ADC             tukuru
```

Required outputs for this portion:

```text
tree-terminal:          mi ato tukuru
word-level:             miato tukuru
hyphenated word-level:  mi-ato tukuru
```

`mi` and `ato` merge below `NP-OB1`. Merging stops at that phrase boundary; `tukuru` remains a separate group.

### SEG-06 — Confirmed exceptional-structure outputs

**KK.30 — simplified relevant structure:**

```text
VB-ADN
├── NP
│   └── N              awokakiyama
└── VB-ADN
    ├── VB-STM         gomor
    └── VAX-STV-ADN    eru
```

Required word-level output: **`awokakiyama gomoreru`**.

Do not produce `awokakiyamagomoreru` merely because the outer `VB-ADN` can be regarded as a word. The internal `NP` boundary stops the merger.

**MYS.2.150 — relevant appositional portion:**

```text
N                     higher structural head
└── NP-APP
    ├── IP-REL
    │   ├── IP-ADV
    │   │   └── VB-GER (sakari + wite)
    │   ├── NP-ADV (asa)
    │   └── VB-ADC (nageku)
    └── N (kimi)
```

Required word-level output for this portion: **`sakariwite asa nageku kimi`**.

The higher `N` does not erase internal phrase boundaries. This example specifies the displayed portion, not the entire text's transcription.

### SEG-07 — No inferred terminal decomposition

If the existing tree has a single terminal `VB-CND saraba`, tree-terminal segmentation retains **`saraba`**. Do not infer an additional stem/ending boundary or split it automatically.

The same principle applies to any terminal not further decomposed in the annotation. “Terminal” describes what the tree represents, not proof that no further linguistic analysis is possible.

### SEG-08 — Hyphenation preserves word boundaries

Hyphenated word-level segmentation uses SEG-03 without changing its word-level groups. Hyphens expose internal morpheme boundaries only where the annotation represents them. They must not create new spaces, remove spaces at phrase-level or higher boundaries, or imply new lexical items or dictionary entries.

`mi-ato tukuru` is explicitly confirmed. Do not infer hyphens inside an unanalyzed terminal such as `saraba`.

**TBD — requires author/editorial confirmation (TBD-02):** Exact recognition and selection of annotated morpheme boundaries for other constructions, nested internal structures, and multipart writing-mode components. A writing-mode change alone is not an approved rule for introducing a hyphen.

### SEG-09 — Keep linguistic segmentation separate from UI state

Phrase-level-or-higher boundary decisions come from the annotated structure, not the accidental visibility of nodes, presence of lemma IDs, or layout depth. Collapsing a subtree does not remove these boundaries inside it or establish that its entire yield is one word.

This is a segmentation invariant, not approval for a particular tree-control redesign. The next UI investigation must determine where and how to apply these representations.

**TBD — requires author/editorial confirmation (TBD-03):** Output treatment of traces, `NULL`, empty terminals, special `ILL` forms, malformed/unclassified labels, and unavailable form data. These cases must not acquire silent linguistic interpretations through display fallbacks.

**TBD — requires author/editorial confirmation (TBD-04):** Exact formatting at multiple-root/text-segment boundaries and handling of whitespace inside unusual forms. The examples specify ordinary spaces between word-level groups, not a complete serialization or line-break policy.

## 4. Lexical combinations and dictionary entries

### LEX-01 — General combination principles

- Lexical item + lexical item **may** create a new lexical item; this is not an automatic conclusion from adjacency.
- Lexical item + grammatical item normally does **not** create a new lexical item. Productive grammatical combinations do not normally require separate lexical-entry treatment merely because they occur.
- Combinations involving `PFX`, `SFX`, or `CL` may be exceptions. Their treatment as new lexical items is currently determined by editorial judgment, not an automatic procedure.

Word-level recombination does not by itself decide new lexical-item status.

### LEX-02 — Do not extrapolate beyond the confirmed scope

**TBD — requires author/editorial confirmation (TBD-05):** Grammatical item + grammatical item combinations and expressions spanning phrase nodes, unless a confirmed existing rule already determines the particular case. Ask for a decision rather than generalizing the lexical-combination rules.

Do not treat adjacent noun children, an inserted grouping node, or the presence of a lemma as automatic evidence that a new lexical item has been formed. `NP_EXPANSION` and the historical compound-processing heuristics are experimental tools, not annotation rules.

### LEM-01 — Independent dictionary-entry criterion

In principle, assign a lemma ID to a form or expression that a reader would reasonably expect to find as a dictionary entry. Such an entry may represent a lexical item, a grammatical item, or another expression warranting independent treatment.

Do not use lemma presence as a lexical-item test, and do not restrict dictionary entries to Words-category items.

### LEM-02 — Parent and component IDs

When a combination warrants its own dictionary entry, the general annotation pattern is:

- the parent receives the lemma ID for the complete combination;
- children retain their own lemma IDs where applicable.

**Confirmed example — BS.1:**

```text
N                     titipapa   L050402
├── N                 titi       L050641
└── N;@2              papa       L051720
```

The parent's dictionary-entry status and the components' identities coexist. Do not replace or discard component IDs merely because the parent has an entry.

The “reasonably expected dictionary entry” criterion is an editorial principle, not a completed automatic entry-creation algorithm.

## 5. Structural and representation safeguards

### STRUCT-01 — Preserve genuine distinctions

Preserve child order, internal annotations, and structurally distinct nodes when generating segmentation. `;@N` labels distinguish occurrences; their numbers are distinction labels, not necessarily ordinals. Do not renumber or correct them without editorial approval.

Numbered `,*` markers carry source/original-text information and can encode real structural boundaries. Do not merge distinct constituents merely because their tags or path spellings otherwise look identical. Deriving a display string does not authorize changing the annotation tree.

### REP-01 — Do not conflate textual layers

The header is a manually supplied first-stage word-segmented transcription, not a text title. Header segmentation need not match tree-terminal segmentation. Both the header and tree-level forms are meaningful; neither silently replaces the other. Underlying content should not normally differ, even when segmentation does.

`<raw-text>` is derived processing information, not an independently edited authority. The current converter's space-joined output must not determine the segmentation specification in this document.

### REP-02 — Multipart words are not TXT row counts

Consecutive TXT rows with the same complete path and lemma, differing only in writing-mode tag, are components of one word under the confirmed historical convention. Genuinely separate siblings require `;@N` where the convention calls for a distinction.

The current XML representation stores such a multipart word as one terminal with ordered form parts. Therefore, one row is not necessarily one tree terminal. Writing-mode decomposition and morphological decomposition are distinct; hyphenation beyond confirmed examples remains under TBD-02.

See [txt-xml-roundtrip.md](txt-xml-roundtrip.md) for representation mechanisms and limitations. This guideline does not change conversion behavior or declare all current parser outputs linguistically correct.

### REP-03 — Undocumented tags remain unresolved

**TBD — requires author/editorial confirmation (TBD-06):** Authoritative meanings, classifications, accepted aliases, and permitted combinations for the unlisted or unclear annotations in [tag-investigation-report.md](tag-investigation-report.md) and [tag-questions-for-chief-editor.md](tag-questions-for-chief-editor.md).

Do not promote code descriptions or apparent spelling corrections into rules. XML-generated names, lemma-like fields, free-text path fields, and misparsed ILL forms must not be silently treated as new linguistic categories.

## 6. Future tooling requirements

### FUT-01 — Locate terminals needing further analysis

The system should eventually support searching for and locating terminal forms that have not been further morphologically analyzed, so the author can inspect them or request operations on them. The precise detection criterion and interface are not specified here. Do not infer or perform the missing analysis automatically.

### FUT-02 — Identify editorial candidates

A future tool may identify candidate combinations involving `PFX`, `SFX`, or `CL` for editorial inspection. Candidate detection is not an automatic decision that a new lexical item or dictionary entry exists. No detection algorithm is specified here.

These are future requirements, not active implementation instructions.

## 7. Open decisions for review

All entries below have status **TBD — requires author/editorial confirmation**:

| ID | Decision still needed |
| --- | --- |
| TBD-01 | Whether unresolved labels, including `C-`, `APP-`, and `FRAG`, are phrase-level or higher. The stopping rule itself is confirmed. |
| TBD-02 | Recognition/selection of internal morpheme boundaries for hyphenation beyond confirmed examples, including nested and multipart structures. |
| TBD-03 | Treatment of traces, null/empty terminals, ILL special forms, malformed/unclassified labels, and missing forms in segmentation output. |
| TBD-04 | Multiple-root/segment formatting and whitespace handling outside the confirmed ordinary examples. |
| TBD-05 | Unspecified grammatical+grammatical and phrase-spanning combination cases. |
| TBD-06 | Formal definitions and classifications of unlisted labels, aliases, and undocumented combinations. |

These are local guideline references, not new entries or resolutions in the existing PAQ/CEQ ledgers. They must remain explicit until an authoritative decision is supplied. Confirmed examples in SEG-05–SEG-07 are implementation acceptance cases; unresolved cases must not be filled from current UI behavior or experimental processor heuristics.
