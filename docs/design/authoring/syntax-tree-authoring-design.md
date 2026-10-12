# Syntax-tree authoring: source-first workflow

Revised 12 October 2026 following **After commit 023a10c (2)–(9)**
and the **After commit 7d5fb6f** Stage 2 usability corrections and the
author's header, synchronization, unified-hierarchy and permissive source-edit
clarifications. The Stage 1 + Stage 2 milestone now implements version-2
multi-Text Documents, paired source entry, read-only corpus opening and
revision-checked `.syn.json` saves inside the existing Editing tab. Analysis,
full hierarchy editing and reviewed TXT/XML export remain later stages. No
corpus migration has been performed. See [current milestone](#current-stage-1--stage-2-milestone)
for the implemented behavior and limits.
The earlier separate syntax/composition model and split/replacement alternatives
are superseded: the target is one recursively annotated hierarchy, with
composition as a view of that hierarchy and refinement preserving higher nodes.

The [A/B comparison](syn-prototype-comparison.md) and its eight static files
remain historical alternatives, not the settled authoring format. The
[current workflow guide](../../guides/current-workflows.md#source-first-drafts-in-editing)
describes the implemented Stage 1 + Stage 2 workflow; later annotation stages
below remain the target design.

## Authority and repository evidence

Follow the author's requirements and clarifications, the confirmed
[annotation guidelines](../../reference/annotation-guidelines.md), the
[conceptual data model](../../reference/data-model.md), and the
[TXT/XML conversion specification](../../reference/txt-xml-roundtrip.md).
Corpus patterns support suggestions; processor heuristics and software tag
descriptions do not establish new linguistic rules. The author's clarification
here supersedes any earlier proposal to routinely author an independent header
for new Texts. Historical header preservation remains required.

| Current evidence | Design consequence |
|---|---|
| [BS.xml](../../../data/xml/trees/BS.xml) contains 21 Texts; [MYS_04.xml](../../../data/xml/trees/MYS_04.xml) contains 311. | Document ≠ Text. Keep established membership such as BS.* → BS and MYS.4.* → MYS_04. |
| [KK.67](../../../data/xml/trees/KK.xml) pairs 多迦由久夜 with `taka yuku ya`; its historical header has `takayukuya`. | One spaced transcription entry supplies initial components; it is not necessarily word-level segmentation. |
| KK.30 source passages 4–5 contain `awo kaki` / `yama gomor eru`; SEG-06 gives `awokakiyamagomoreru`. | A word can cross passage boundaries. Source numbering must not impose word boundaries. |
| [MYS.8.1421](../../../data/xml/trees/MYS_08.xml) has `N L090723 → N paru L051724 + N yama L050034`; [dictionary L090723](../../../data/xml/dict/dictionary.xml) explicitly references both components. | Supported compound analysis retains both component lemmas and the compound lemma. The eight current corpus nodes carrying L090723 have this structure. |
| MYS.4.619 represents `ipaku L030199a` as one VB-NML terminal with `ipa/LOG` and `ku/PHON` form parts. | Writing boundaries alone do not license morphological analysis. Independently supported finer analysis with matching boundaries can reuse those parts as annotated nodes. |
| BS.1 retains parent/component IDs for `titipapa`; MYS.2.150 repeats `sakari`, `wite`, and `kimi`. | Preserve parent associations and distinct occurrence identities, even for identical forms/lemmas. |
| [Export tests](../../../tests/test_export.py) cover multipart grouping, internal lemmas, distinction labels and marker-induced constituent boundaries. | Import the complete legacy representation, not a reduced renderer payload or flat word list. |

The [data issues](../../registers/data-issues.md),
[author questions](../../registers/project-author-questions.md), and
[chief-editor questions](../../registers/chief-editor-questions.md) identify
unresolved semantics. Preserve their evidence and ask the author when a required
behavior cannot be determined. This design does not resolve those questions.

## Document and Text organization

One complete `.syn.json` file represents one **Document**, containing ordered
scholarly **Texts**. Document identity/storage location and Text identity are
separate. Existing corpus membership is retained, not reconstructed by an
invented universal filename rule. New Texts belong to a selected existing or
new authoring Document; Text IDs are not filenames.

```text
Document: MYS_04.syn.json
├── …
├── Text: MYS.4.619
│   ├── Numbered source passages + entered spaced transcription
│   ├── Initial boundaries and links to annotated node identities
│   ├── One recursive annotated hierarchy, including writing-mode metadata
│   ├── Generated composition, terminal and word-level views
│   └── Historical header/legacy records and unresolved discrepancies
└── …
```

This outline illustrates the container relationship, not a final JSON schema.
Hidden Text identities must distinguish the two existing `SM.15.1` blocks
(DI-001); do not silently correct or discard a duplicate scholarly ID. Preserve
legacy aliases and opaque suffixes. Eventually migrate complete corpus
Documents into `.syn.json`, not one file per Text. **Do not perform that migration yet.**

## Recommended workflow

1. Open an existing Text in its Document, or create a Text within an existing/new
   Document. Existing and newly authored Texts ultimately use the same Editing
   representation, including source, analysis and syntax views.
2. Enter numbered source lines/passages from 1, each with original text visibly
   beside its number and a spaced transcription such as `taka yuku ya` below it.
   Spaces supply the initial component segmentation. Support individual passage
   entry and efficient bulk paste/import of paired source/transcription content;
   show the parsed pairing/numbering for review. Do not require one component per
   newline or an additional unspaced transcription entry.
3. Analyse that input using established annotations and dictionary evidence.
   Pre-fill supported lemmas, terminal categories, further segmentation and
   compound associations. The user reviews the result and changes exceptions,
   chooses another candidate or enters an annotation manually. Initial space
   units are provisional, not a commitment to final terminal granularity.
4. The resulting persistent annotated nodes appear directly in the hierarchy/
   tree workspace. Review, edit and refine them there; Analysis and Tree can
   have different display modes but edit the same hierarchy. There is no step
   of moving/copying analysis results into another Tree. Assign scripts manually,
   including batch PHON/LOG and individual exceptions; reliable suggestions may
   follow later. Coincident writing/analysis boundaries can share nodes when
   finer analysis is independently supported.
5. Build upward and refine downward in that workspace through ordinary typing,
   Enter, local Tab/Shift+Tab, selection and structurally valid cut/copy/paste.
   Use **Wrap in Parent** when grouping several existing adjacent nodes/subtrees
   saves substantial work. Do not require a menu/command for every small edit.
   Layout, indentation and optional guides are maintained by the editor.
6. Inspect composition as a view of the same hierarchy. Correct a proposed
   compound by editing the hierarchy itself; there is no independently editable
   composition graph or competing grouping. A lemma is not required for every
   compound. View derived word-level segmentation and correct the underlying
   hierarchy when necessary.
7. Save the complete authoring Document to `.syn.json`. TXT/XML import,
   synchronization and reviewed export are separate, explicit user operations.

Source/transcription input, the annotated hierarchy and generated views remain
distinct. Lexical, morphological and syntactic interpretation share one
hierarchy, without a fixed boundary or parallel authored trees. The ordinary
workspace has source and analysis/tree views over one complete model;
composition is an optional inspector or tree overlay. New Texts do not
require routine header entry. No manually typed occurrence IDs, alignment
records or preservation blocks belong in the normal view.

An unfinished transcription, missing lemma, unresolved category or absent tree
is a valid draft. A compound without a lemma is valid in completed annotation:
it requires neither confirmation of that absence nor a new dictionary entry.
Composition is revised by changing the relevant nodes/relationships in the
same hierarchy. Nested compounds are recursive subtrees. Competing analyses of
the same occurrence are not a current requirement.

### Source revision with existing analysis

Draft source/transcription edits remain permissive even when a Text already has
an imported annotated hierarchy. They must never silently rewrite, delete or
regenerate that hierarchy. Preserve relationships that remain demonstrably
valid. If their validity is lost or uncertain, retain the hierarchy, original
alignment evidence and referenced identities, and mark the affected relationships
unresolved. Removing a passage retains its analysed nodes as unresolved/orphaned
analysis. Show the impact and permit `.syn.json` draft saves.

Stage 2 uses a conservative, evidence-based check: links address Unicode
code-point ranges in the compacted **original evidence transcription**, not
editable live text or original-script character positions. Unchanged original
text plus unchanged transcription content after whitespace removal preserves
an imported link's prior status. Initial spaces may change without imposing a
new analysis. A content change makes that passage's relationships unresolved;
relationships belonging to unchanged passages retain their status. The original
range and source/transcription evidence remain intact. Reverting to the exact
supported content restores the original evidence status, including any
uncertainty already present at import. No guessed substring remapping occurs.
Ordinary draft editing and Save remain available for all these cases.

Re-analysis is explicit: the future **Analyse** operation may offer suggestions
based on revised input, but changes to an existing parsed hierarchy require user
review/acceptance. Source editing does not trigger analysis. Unresolved conflicts
must block later reviewed TXT/XML export/write-back and any other operation
requiring resolved authoritative relationships. Those operations are absent in
Stage 2; draft Save must not be treated as their substitute. If a case cannot be
classified safely, preserve its evidence, mark it unresolved and ask before
choosing an analysis or reconciliation representation.

### Assisted annotation

- Search/autocomplete existing lemma IDs using forms and dictionary information;
  rank candidates using corpus attestations and retain the attested spelling.
- Suggest terminal categories from previous attestations of the same form/lemma
  and relevant, established morphological patterns. Category belongs to the
  annotated node, not the dictionary entry; dictionary POS is
  supporting evidence, not an obligatory category mapping.
- Pre-fill further component structure when supported by corpus annotations and
  dictionary links, while preserving the entered transcription and its initial
  boundaries. Do not infer a split merely because substrings have dictionary
  matches, or infer a compound solely from adjacency or a parent lemma.
- Initially support manual script selection, including registered PHON variants,
  LOG and NLOG. Retain unusual imported values; missing information remains
  unresolved rather than becoming a guessed tag. Automatic script inference is
  deferred until reliable evidence supports it.
- Support batch PHON/LOG assignment to an explicitly selected scope. Show the
  affected occurrences and allow individual exceptions and undo.

Pre-fill well-supported values and expose uncertainty where evidence conflicts,
so the user mainly reviews exceptions. Suggestions carry evidence/provenance
and review state; imported annotations retain their existing status. Changing a
lemma can refresh category suggestions but must not silently overwrite an
authored category. Missing evidence is acceptable in a draft.

For example, `taka` has several exact dictionary matches; `yuku` is attested
under L031840a whose dictionary form is `yuki`. A surface-form match alone is
not enough to choose a lemma/category. For `paruyama`, explicit component links
and attested `N → N + N` structure support a proposed `paru + yama` analysis
with L090723 retained. Ranking thresholds, broader morphological inference and
unattested analyses are not specified here; establish evidence and ask where
a required linguistic behavior remains undecided. No per-item confirmation
dialog is required for well-supported pre-fills.

The existing `treditor` application is the proposed primary authoring interface.
Users normally work through its structured UI. VS Code initially supports file
storage, inspection and Git history; a full editing extension is deferred.
Paired entry and the revised container/hierarchy schema are implemented in
Stage 1 + Stage 2; assisted analysis and editable hierarchy views remain deferred.

## Input, unified hierarchy and derived views

| Layer | Contents and relationship |
|---|---|
| Document/Text containers | One Document contains ordered Text records with persistent identities and scholarly IDs. Save and revision checks operate on the complete Document. |
| Source passages and transcription | Ordered original-text passages visibly numbered from 1; entered spaced transcription and its initial boundaries. Display numbers are not persistent identities; preserve historical marker labels separately without deciding their semantics. |
| Analysis linkage | Explicit links between entered transcription material and persistent annotated nodes. Initial spaces, passage breaks and current terminal boundaries may differ; nodes need not belong exclusively to a passage. |
| Unified annotated hierarchy | Ordered recursive nodes with category/tag, optional lemma, children and applicable annotations. Current leaves carry terminal material/writing-mode metadata; higher lexical forms are normally derived from descendants. Higher nodes increasingly represent syntax, without a fixed lexical/syntax boundary. |
| Composition view | Interpretation/inspection of subtrees in the same hierarchy. Compound grouping and nested compounds are authored there, not in separate groups/graphs. Correct suggestions by editing that hierarchy. |
| Hidden identity | Persistent identities for Documents, Texts, input passages/units and annotated nodes, plus writing-mode parts where required. A node keeps its identity when supported refinement adds children. Addresses and terminal status can change; they are not identities. |
| Display | Form labels, optional compound lemma/gloss overlays, indentation guides, word/terminal/hyphenated segmentation and source-row layout. Changing a display option changes no annotation. |
| Word-level projection and compatibility | New header-like output is derived from annotation. Imported historical headers remain preserved for round-trip/discrepancy checking, alongside exact scholarly/legacy IDs, comments, `;@N`, script indices and non-derivable source information. |
| Dictionary and attestations | Independent lemma entries and their lexical definitions; annotated nodes link attested spellings, subtree patterns and context to those entries. |

Coverage is a separate relation: one annotated subtree can span passages, and multiple
initial transcription units can map to one analysed occurrence (including a
multipart terminal). Conversely, an initial unit such as `paruyama` can acquire
supported component analysis. Preserve these relationships rather than saving
independent editable lexical strings in each view. Exact source-character
coverage may be stored where explicitly known; do not invent it from juxtaposition.

For an internally analysed lexical node, ordered descendants normally produce
its displayed form. The parent retains its own category, optional lemma and
annotations; no special whole-analysis container is needed. A phrase/clause
node does not require a stored lexical form. A concatenated descendant yield
may serve a processing/display purpose without asserting that the phrase is a
word. Writing-mode segmentation and morphological analysis are distinct
annotation dimensions, but coincident boundaries can share annotated nodes
when the finer analysis is independently supported. There is no mandatory
duplicate segmentation layer. Non-concatenative analysis would require an explicit supported rule;
do not invent one or duplicate authored parent forms to conceal a discrepancy.

The existing XML already supports this recursive shape: `_build_children()`
attaches internal lemmas to nodes, and `_reconstruct_lines()` emits them in
ancestor paths. No current syntax node was found with both its own `form` and
syntax children. XML has no persistent authoring node IDs or explicit input-to-
analysis alignment, so preserving its hierarchy does not make the current
serializer a complete authoring model.

### Initial segmentation, analysis and word-level output

Initial spaces are author input for analysis, not a declaration that every unit
is a word, morpheme or final syntax terminal. Apply confirmed TERM-01, SEG-01–09,
LEX-01 and LEM-01–02 from the annotation guidelines:

- Tree-terminal segmentation exposes represented terminals without inventing
  morphology; an imported `VB-CND saraba` stays one terminal absent an explicitly
  supported further analysis. Suggestions for new analysis must have evidence
  and remain reviewable, not alter imported annotation merely for display.
- Word-level segmentation recombines ordered annotated material upward while
  preserving phrase-level or higher boundaries (NP, PP, IP, CP, CONJP and
  multi-sentence, including confirmed subtypes). A higher Words-tagged node
  cannot erase an internal stopping boundary. Lemma presence, layout depth and
  visibility do not define segmentation.
- Hyphenated word-level display exposes represented internal boundaries without
  changing word-level groups. Writing-mode changes alone do not license hyphens;
  finer boundary rules remain TBD-02.
- Word status, lexical composition and independent dictionary-entry status are
  separate. Adjacency does not establish a new lexical item; lexical + grammatical
  does not normally create one, with editorial exceptions documented in LEX-01.
- Preserve imported parent lemma associations in their actual context. A lemma
  on an internal syntax node is not automatically proof of a compound; entries
  can cover other expressions. Preserve the annotation on its original node
  without relocating it or asserting a compound interpretation by guesswork.

### Header-like output and historical headers

For **new Texts**, derive the corresponding word-segmented representation from
underlying annotation using the documented segmentation procedure. The user
reviews/corrects the underlying analysis, rather than routinely entering a
separate header or typing the transcription twice. Source passage breaks do
not add word boundaries to this whole-Text projection. Incomplete/unsupported
analysis remains a draft; do not invent the missing grouping to manufacture a
finished header.

For **imported Texts**, retain the historical header exactly as supported by the
legacy representation, with its provenance, for compatibility/round-trip and
discrepancy checking. Show a generated word-level view separately when useful;
do not overwrite the historical header with it. REP-01 and CEQ-002 establish
that historical header and tree layers can differ in segmentation. Compare
content as well as boundaries without diagnosing or correcting differences
automatically. The exact long-term status of historical headers, and which
header to emit after reviewed changes, remain open; ask before implementing a
choice. These clarifications do not authorize additional header semantics.

### Ordinary Editing view

```text
Document: KK                 Text: KK.67                  [Save]
[New Text] [Open Text]       (choose Document and Text)

1  多迦由久夜
   [taka yuku ya                                      ]

2  波夜夫佐和気能
   [payabusawake no                                   ]

3  美淤須比賀泥
   [mi osupi gane                                     ]

[Add passage] [Paste/import passages] [Analyse]

Hierarchy workspace (Analysis/Tree display modes share these same nodes)
ADJ-STM taka
VB-ADC  yuku
P-FOC   ya
[Optional overlays: lemma IDs / scripts / glosses]
[Assign PHON/LOG to selection] [Inspect composition]

Type/edit rows; Enter adds a node; Tab/Shift+Tab adjusts local hierarchy.
Select adjacent rows/subtrees → [Wrap in Parent] when useful.
Hover lemma information for gloss; click lemma to open dictionary entry.
Word-level view: generated from annotation
Historical header: available for imported Texts / discrepancy inspection
```

The category rows illustrate supported corpus evidence, not a rule that
these values are selected solely from spelling. Source number and original
text remain visible together during review. Cross-passage selection/grouping
is supported; the cards do not isolate word analysis. The three rows already
are the persistent annotated nodes; there is no transfer step. Keep the display
lightweight, with independently optional lemma/script/gloss overlays. Hovering
must make a lemma and its gloss understandable; clicking a lemma opens the
existing `treditor` dictionary popup/entry view. Reuse dictionary lookup and
presentation infrastructure rather than build another dictionary interface.
Exact bulk-input grammar and context-sensitive key behavior remain UI details,
not a new legacy corpus grammar.

## Tree-building interaction

Storage syntax and editing interaction are separate. Ordinary local editing
should feel close to text editing while updating the underlying hierarchy.
The editor maintains structural validity, indentation and guides; users do not
manually reindent every descendant or maintain serialized whitespace. Structural
commands supplement direct editing when they save substantial work.

| Concern | Proposed role |
|---|---|
| Serialized tree representation | A serializer may encode ordered parent-child relationships using whitespace indentation. It generates indentation from the model. The final `.syn` grammar remains undecided; portable occurrence bindings still travel with the complete model. |
| Visible tree/editor representation | A selectable outline or rendered tree shows categories, forms and optional lexical overlays. The editor generates layout, indentation and optional `|` guides. Visible rows are projections of the same annotated nodes, not a separate syntax/lexical record pair. |
| Editing operations | Direct row/content edits, Enter, local indent/outdent and structurally valid cut/copy/paste update the shared hierarchy. Wrap in Parent groups existing subtrees efficiently. Internal operations maintain validity and undo without requiring a command dialog for every small edit. |

### Ordinary local editing and downward refinement

- Type/edit a node's category, form where applicable, lemma and script directly.
  Optional overlays control visibility, not whether the data exists.
- **Enter** creates a new line/node where appropriate. **Tab/Shift+Tab** performs
  local indent/outdent or reparenting where valid. In text fields and autocomplete,
  normal editing/focus behavior takes precedence; do not invent an exact key
  dispatch policy before the interaction is specified.
- Use normal selection and cut/copy/paste where structurally valid. Moving
  existing nodes retains identity; actual duplication requires new identities
  and valid input/coverage relationships, not duplicate placement of one node.
- Create children directly for supported downward refinement, retaining the
  parent and its annotations. No obligatory parent-category dialog or separate
  analysis-to-tree transfer belongs in this local workflow.

```text
Before: N paruyama L090723

After direct child editing:
N paruyama L090723
  N paru L051724
  N yama L050034
```

The displayed parent form becomes derived from the children; it is not another
string to maintain. Invalid edits must be exposed without silently changing
source content, losing annotations, introducing cycles or duplicating yield.
Unfinished nodes remain valid drafts subject to structural invariants.

### Upward grouping: Wrap in Parent

Wrap is primarily useful for several adjacent existing nodes/subtrees, where
manually reindenting all descendants would be inefficient. It is available for
unary grouping too, but does not replace ordinary small/local editing.

1. Select one or more adjacent whole terminals/subtrees under the same parent,
   or in the ordered top-level draft forest. A subtree selection includes its
   descendants. A single node can be wrapped to create a unary branch.
2. Invoke **Wrap in Parent** from a lightweight command or keyboard shortcut;
   no particular key binding is settled yet.
3. Type/autocomplete a parent category and accept it.
4. Create one syntax branch at the selected range's position and move the
   selected nodes into its ordered children. Keep their order, node identities
   and source/transcription links. The editor handles layout/indentation
   automatically and selects the new parent for further grouping.

Non-adjacent selections or nodes from different parents need a contiguous
sibling selection before wrapping; do not silently flatten existing structure
or include unselected material. Cancelling category entry changes nothing.
One wrap is one undoable operation; undo restores the previous parent/child
relationships. Wrapping adds one annotated parent and retains the selected
nodes and their source/transcription links. It does not copy terminal material
or redistribute existing lemma/script annotations. Because composition is a
view of the hierarchy, grouping changes can affect that view; they do not
automatically establish a new word or dictionary entry.

Parent-category autocomplete should use the project's category registry and,
where available, rank likely categories from existing corpus structures:
ordered child categories, comparable terminal form/lemma patterns and surrounding
syntactic context. For KK.67, evidence can rank VB-ADC above the selected
ADJ-STM/VB-ADC pair and MK above VB-ADC/P-FOC. These are proposed suggestions
based on known corpus structure, not a reason to insert branches automatically.
Show the evidence/context when useful, allow another supported category, and
retain ordinary category entry when evidence is sparse. Imported distinction
labels remain independent; wrapping must not invent or renumber `;@N` labels.

### Additional structural adjustments

- **Tab/Shift+Tab:** offer structural indent/outdent (reparenting) for selected
  whole nodes where a valid target exists. Show the destination and preserve
  node order; these keys do not insert/remove literal spaces. In text fields,
  normal focus/autocomplete behavior takes precedence.
- **Enter:** create a line/node in ordinary editing where appropriate, or accept
  an active category prompt. It does not move/copy analysed material from a
  separate staging view.
- **Cut/paste and subtree movement:** move whole syntax nodes to an explicit
  parent and child position, preserving identities and descendant structure.
  Check cycles and duplicate yield, and expose changed order/coverage conflicts.
  Source order is not silently changed by a syntax move.
- **Change category / unwrap parent:** edit a node's category, or remove a
  selected branch while promoting its ordered children. Retain child references;
  if a removed branch has annotations or compatibility anchors, expose how those
  are retained or require resolution rather than dropping them silently.

All structural changes update references atomically, support undo and retain
valid drafts with unplaced source occurrences or incomplete branches. Generated
guides are never selectable annotation data. An optional raw serialized-text
view is secondary and subject to the external-edit reconciliation rules below;
it is not required for normal tree building.

## One concise KK.67 workflow example

This example shows the first source segment and its MK subtree only. The rest
of KK.67, its header and other source segments remain intact. These are proposed
views over real corpus evidence, not executable `.syn` files.

**Enter source.** The user types only segmentation and transcription:

```text
1 多迦由久夜
  taka yuku ya
```

Spaces supply three initial components. Analysis retains that entered layer
and, for this attested example, produces three distinct underlying occurrences
directly in the hierarchy workspace. Initial components are not universally equated with
terminals. Corpus/dictionary evidence pre-fills lemma/category annotations;
user review and a scoped manual PHON assignment produce:

```text
ADJ-STM taka L007005 PHON
VB-ADC  yuku L031840a PHON
P-FOC   ya   L000537 PHON
```

**Wrap the first pair.** Select the existing `ADJ-STM taka` and `VB-ADC yuku`
rows, invoke **Wrap in Parent**, and type/autocomplete `VB-ADC`. With lexical
overlays hidden for clarity, the editor generates this visible outline:

```text
VB-ADC
  ADJ-STM taka
  VB-ADC yuku
P-FOC ya
```

**Wrap again.** Select that whole VB-ADC subtree and the adjacent `P-FOC ya`,
invoke **Wrap in Parent**, and choose `MK`. The generated visible outline is:

```text
MK
  VB-ADC
    ADJ-STM taka
    VB-ADC yuku
  P-FOC ya
```

Both commands reuse the source occurrences. The user enters two parent
categories, without retyping terminals, inserting spaces or maintaining `|`.

**Serialize separately.** A possible generated tree projection with lexical
overlays included is shown below. Its indentation represents stored hierarchy;
it is not a sequence of manual editing steps. Hidden bindings still accompany
the portable model, as described below.

```text
MK
  VB-ADC
    ADJ-STM taka L007005 PHON
    VB-ADC yuku L031840a PHON
  P-FOC ya L000537 PHON
```

The source/analysis link for `taka` resolves to the same annotated node shown
as `ADJ-STM taka`. Form, lemma, script and category edits target that node;
moving it changes hierarchy relationships. A repeated `taka` has a different
hidden identity even if all visible fields match. Entered transcription remains
its own linked input layer; content discrepancies are exposed, not silently
overwritten when an annotation changes.

**Inspect composition optionally.** Ordered component-lemma evidence can
support pre-filling the nested VB-ADC subtree associated with L030996a. Its dictionary form
is **takayuki**, with component references L007005 (`taka`) and L031840a
(`yuki`); this text attests **takayuku** and **yuku**. Variant evidence
supports ranking the existing lemma, rather than requiring exact concatenation
or replacing the attested form. An internally analysed node may also remain lemma-less.

The imported MK annotation L091050 (`takayukuya`) is retained independently.
That entry has no dictionary compound references: a fresh draft cannot treat
its full recursive composition as established by the dictionary alone.
Imported links can be shown on the tree, or a proposed association reviewed
in the inspector. A suggested grouping is edited directly in the hierarchy;
no separate composition section or dictionary-entry creation is
required to finish this tree.

**Choose display.** Hide lemma IDs and script tags to work with category/form
rows; show them again for review. Gloss and compound-lemma overlays have
independent toggles. None of these toggles removes data or changes identity.

## Recursive analysis, multipart forms and repeated occurrences

Further supported analysis extends the annotated hierarchy downward, preserving
the higher node, category, lemma and applicable annotations. New children receive
new identities. There is no replacement of the whole occurrence with unrelated
smaller occurrences, and no special W1 whole-analysis container. For example:

```text
Entered input T1: paruyama
       │ linked to the analysed material
       ▼
Before: n0  N, lemma L090723, terminal material paruyama

After:  n0  N, lemma L090723              ← same node
        ├── n1  N, paru, lemma L051724   ← new child
        └── n2  N, yama, lemma L050034   ← new child
```

After refinement, n0's form is normally derived as `paru` + `yama`; its own
redundant terminal form is not manually maintained. References from ancestors
and whole-occurrence notes remain attached to n0. It is now internal rather
than terminal: **terminal status is a role, not a permanent identity type**.
Links to the entered material remain distinct from links to the finer children.
Do not equate T1, n0 or a current terminal merely because their displayed text
was once identical. Validate corresponding material before replacing stored
terminal realization with child-derived output; a mismatch requires review.

Undo restores the previous node realization, children and links; redo restores
the same generated identities. Collapsing n0 for display leaves its children
intact. Withdrawing or regrouping analysis is a separate structural operation,
not display collapse; its deletion/history and annotation-transfer policies
remain to be agreed before implementation. A reference specifically requiring
a terminal must be reconciled when its node becomes internal. Stable node IDs
alone do not define that transition's alignment or script behavior.

In MYS.4.619, `ipa/LOG` plus `ku/PHON` realizes one `ipaku` terminal linked
to L030199a. That current writing annotation does not itself establish two
morphological components. Preserve its ordered forms, scripts and `phon_index`
without inventing categories or component lemmas.

If later **independently supported** finer analysis has those same boundaries,
reuse the existing parts as the finer annotated nodes, retaining their writing
annotations and the higher node. Do not create another redundant set of nodes
for identical segmentation. A node may carry form, category, lemma and script
together. The following is conditional, not an asserted analysis of `ipaku`:

```text
VB-NML ipaku L030199a
  TAG1 ipa Lxxxxx LOG
  TAG2 ku  Lyyyyy PHON
```

TAG1/TAG2 and the component lemmas are placeholders for independently justified
annotations, not new project categories or lemma assignments. The higher form
is derived. Stable part/node references must be retained/reconciled by the
versioned schema; the clarification settles reuse, not an invented linguistic
split or automatic redistribution onto differently bounded material.

The corpus check covered all 115 XML Documents and all 115 TXT Documents through
the current parser: 3,130 recognized multipart terminals, with no explicit
crossing writing/morphological child analysis. XML parent forms all matched
concatenated parts. This is evidence about what is encoded, not all possible
linguistic analyses. Do not design hypothetical crossing-boundary machinery;
if a real conflicting case is found, show it to the author and ask before
extending the representation.

A repeated form in the tree is a display label, never a global lookup key.
Source/transcription analysis links directly to persistent nodes in the
hierarchy workspace; there is no later spelling-based binding or transfer step. Importing an unbound external
file may need occurrence context and explicit disambiguation. In MYS.2.150 the repeated
`sakari`, `wite` and `kimi` occurrences must remain separate even when
their forms and lemma IDs match. Preserve the original `NP-APP;@2` distinction;
do not replace it with a hidden address or renumber it.

Traverse current hierarchical leaves to obtain terminal yield; do not emit an
internal derived form and its descendants as additional terminal material.
Legacy internal lemmas remain on their nodes even when their linguistic
interpretation is unresolved. Initial input boundaries, current leaves and
derived word boundaries are different representations, not parallel trees.

Import existing finer analysis directly: MYS.8.1421 already has `paru` and
`yama` children below the parent N. Its derived passage transcription is
`paru yama no` and its historical header starts `paruyama no`; neither proves
a historical single-unit entry followed by a split. Preserve actual evidence
without inventing that editing history. Import the repeated occurrences,
distinction labels and marker events from complete corpus records.

The hierarchy must allow an ordered forest for incomplete drafts and the
existing SM.37.1 multi-root case, retaining the anomalous `]IP-MAT` spelling
without deciding its correction. Writing-mode parts alone do not establish
analysis children; coincident independently supported analysis can reuse them.
Historical headers and marker records remain outside the hierarchy. No concrete
current case has been identified that requires a competing composition graph;
if one emerges, show it to the author before introducing another analysis.

## Hidden identity and plain-text persistence

Never require annotators to type `#t1`, `1.1` or a `C...` occurrence name.
Hierarchical addresses such as `1.1.1` can be shown temporarily for navigation
or disambiguation. Persistent internal identities survive moves, spelling edits
and source regrouping. New source occurrences receive new identities; moving
or copying a view of an existing occurrence does not create another lexical
record. Duplicating actual source material creates fresh occurrences, and undo
restores the previous records and references.
Annotated parent and child nodes use the same identity mechanism; a compound
does not need a special container identity or a separate occurrence namespace.

### Single storage and explicit references

The complete persisted model stores each annotated node once, keyed by opaque
persistent identity. A node carries its category, optional lemma, ordered child
references and applicable annotations; current leaves carry terminal material
and ordered writing-mode parts where present. Source/transcription links resolve
to these same nodes, and every tree/analysis/composition view projects them.
There is no separate syntax node pointing to a duplicate lexical record and no
independently persisted composition group. Display settings remain separate.

For the KK.67 `taka`, a conceptual machine-owned encoding is:

```json
{
  "nodes": {
    "node-a": {"category": "ADJ-STM", "lemma": "L007005", "form": "taka", "script": "PHON", "children": []}
  },
  "sourcePassages": {
    "passage-a": {"original": "多迦由久夜", "transcription": "taka yuku ya"}
  }
}
```

This is an illustrative excerpt inside a Text record: Document/Text containers,
other occurrences, initial boundaries, transcription/analysis links, tree
parents, coverage and version data are omitted, not implicitly deleted.
These names stand for generated persistent IDs, not author input, traversal
numbers or an approved schema. The input-to-analysis link (omitted here) resolves
to `node-a`, which is the same record rendered in the tree. Lexical/category
edits update that record; moves update ordered parent-child references. The
entered transcription is preserved as an input representation, not a second
tree terminal record. The final schema for its units/anchors remains to be
specified. Persisting a view edits the shared model, not duplicate node strings.

Detaching an analysed subtree from a higher parent leaves those same nodes
available as draft roots; it does not create a second lexical occurrence.
Deleting source material must update dependent references atomically or report
unresolved dependants. Ordinary tree copying must not silently duplicate lexical
coverage; copying source material and moving syntax are distinct operations.
Validation must reject duplicate placements/yield and cycles while allowing
incomplete analysis and unplaced draft roots. Current prototype validation will
need adaptation to these unified-node invariants.

### Portable encoding and external edits

Use one complete, versioned, human-readable `.syn.json` file **per Document**,
containing its ordered Texts; for example `BS.syn.json` or `MYS_04.syn.json`.
The current single-Text schema is obsolete for this target and requires an
explicit versioned conversion, not silent reinterpretation. The unified hierarchy,
source/transcription input, alignment and compatibility information
travel together in one atomic Document save. Technical IDs are hidden in the UI
but visible in file inspection and Git diffs. No parallel manually maintained
lexical/tree text is required.

Use UTF-8, fixed two-space indentation, LF and a final newline, documented field
ordering and stable ordering of record tables by persistent ID. Ordered source,
child and component-reference arrays preserve semantic order and must never be
sorted. Generate IDs only when records are created and retain them across saves,
moves and reloads; neither formatting nor export renumbers them. Store annotated
nodes in a table with ordered child references so wrapping changes a small set
of records instead of rewriting the indented body of every descendant.

Save schema version, Document/Text identities and order, original source payloads,
entered transcription/initial boundaries and analysis links, annotated node/part
records, coverage, ordered hierarchy roots, imported historical headers
and non-derivable compatibility data. Generated word-level views are projections,
not separately authored fields; their exact export handling remains open.
Persist meaningful suggestion/review provenance, but exclude transient selection,
coordinates, caches, dictionary-derived glosses and routine save timestamps.
Unchanged save/load/save should be byte-identical. Original text must not be
Unicode-normalized merely for formatting.

An indented tree view or TXT/XML preview is generated from this complete file;
it is not a second authority. A later custom `.syn` notation may be considered
after the model stabilizes if it materially improves inspection. It must encode
the same complete model without changing occurrence identity.

A visible form-only tree projection is not sufficient to reconstruct every binding:
identical repeated forms make that impossible in general. With no metadata,
tooling must treat a file as a new/unbound draft and ask for ambiguous choices.
External plain-text edits require reconciliation against the previous revision;
never silently guess identity from form, line number or tree position.
Human input can remain minimal, but portable authoring data must include all
references. Validate externally edited complete files and report dangling or
ambiguous bindings before replacing a loaded revision.

## Compound suggestions and collecting attestations

Future suggestions should use ordered **recursive tagged subtree patterns**,
parent/component lemma associations and existing dictionary composition references.
Surface forms, inflectional variants and POS can support ranking; they cannot
prove a unique lemma. A missing dictionary composition field means less evidence,
not proof that a matching lemma does not exist.

Repeated attestations of a lemma with similar internal tagged structure can
support pre-filling an entire analysed subtree, not merely isolated terminal
lemmas. Instantiate a new occurrence with fresh node identities and link it to
the new input material; never reuse the original corpus node objects. Keep the
attested child order, categories and supported annotations as evidence, while
allowing contextual exceptions and form variants. Lemma equality or frequency
does not make every instance structurally identical.

Pre-fill supported grouping/lemma associations directly in the same hierarchy.
The user corrects an incorrect grouping by wrapping, unwrapping, moving or
otherwise editing its nodes. Nested compounds are recursive subtrees; there is
no secondary structure retaining a competing grouping. Composition inspection
does not impose a review dialog on every subtree: lemma-less compound analysis
is valid. Refinement retains the higher node and adds supported children;
terminal-specific links and annotations still need explicit reconciliation.

No automatic new dictionary ID or entry is created. Current
`compound_lemma_processor.py` is not this workflow: it looks up concatenated
forms and can allocate new IDs/create/refine entries. Reusing it unchanged would
violate the intended annotation process.

Collect occurrences under the selected existing lemma as an attestation index:
form, source/text identity, annotated node identity, script parts and context.
For example, `takayuku` can be recorded under L030996a without replacing the
dictionary form `takayuki` or creating a new lemma. A lemma need not be assigned
to every internally analysed node. Adding an attested spelling to dictionary `.FORM`
is a separate user-chosen dictionary revision; indexing evidence is not that
write. Do not infer modernized kana or lexical equivalence automatically.

## Reconstructible legacy bookkeeping and export limits

Treat TXT marker paths and row offsets as generated serialization details
**when their semantic inputs determine them uniquely**:

1. Source payload and ordered coverage identify the transcription segment.
2. A separate structural event identifies the syntax parent and next child
   whose boundary the imported marker expresses.
3. The adapter derives that parent's current TXT path, including required
   lexical annotations and existing distinction labels.
4. Traversing the intended tree and ordered writing-mode parts derives corpus
   rows; occurrence/part boundary anchors determine marker insertion positions.

Coverage alone cannot recover a marker's parent path. BS.1 demonstrates that
otherwise identical paths can denote separate constituents because of marker
events. Import those events into the semantic model; do not mistake the
literal path for the only way to retain the distinction. A changed parent or
ambiguous association needs explicit resolution before export.

Retain non-derivable information as compatibility data: original
marker labels where their meaning is unresolved, opaque comments, unusual
spellings/lines, legacy ID aliases/suffixes, explicit distinction-label values,
script indices and unsupported formal annotations. Retain untouched input
snapshots for recovery/provenance, without forcing annotators to maintain
`preserve` blocks. Exact byte reconstruction is a different goal from semantic
round trips. Whether original marker spelling itself is authoritative remains
[PAQ-021](../../registers/project-author-questions.md#paq-021--exact-marker-syntax-versus-regenerable-serialization).
Until that decision and the adapter mapping are settled, preserve complete
imported marker lines/positions; this reconstruction proposal does not authorize
discarding them because a generated equivalent seems possible.

The existing TXT/XML recursive hierarchy already represents internal categories,
parent/component lemmas and nesting. The previous export limitation about a
separate composition graph is obsolete: no such graph is required. Persistent
node identities, entered transcription/initial boundaries, explicit alignment
and review provenance still exceed the current legacy representation. Define
their adapter mappings/limits explicitly; do not claim a legacy export alone
is the complete portable authoring model. Check reparsed hierarchy, annotations,
coverage, parts, IDs and retained records against the model. Unsupported formal
information must not silently disappear during reduced export.

Preserve historical headers; derive new header-like output from annotated
structure under the documented segmentation rules. `<raw-text>` remains
derived legacy processing information, not an independently edited authority.
The new passage transcription is entered authoring data; importing a derived
legacy raw-text pairing does not authorize silently overwriting header/tree
content. Exact regeneration/conflict policy remains PAQ-002. Fresh `;@N`
allocation, NULL/ILL semantics, partial-character coverage and new annotation
mappings also remain unresolved. Future annotation types need explicit typed
extensions and versioned adapters, not silent omission or interpretation by
visual similarity.

## Explicit synchronization and reviewed export

The intended eventual Editing source of truth is the complete `.syn.json`
Document. TXT/XML ↔ `.syn` import, synchronization and export are **explicit,
user-controlled operations**, never a consequence of Save, page refresh,
opening a Text or a background watcher. Existing browsing/processors continue
using current inputs until separately migrated; this revision does not switch
them to `.syn` or change external primary TXT repositories.

Temporary divergence is permitted, including when TXT/XML is edited first.
Preserve both sides and their base provenance instead of choosing whichever
file is newest. A `.syn` draft can be saved with incomplete analysis and
unresolved representation discrepancies. **Reviewed `.syn → TXT/XML`
write-back/export must be blocked until those discrepancies are resolved.**
Display discrepancy reports and previews for review; do not silently discard
the historical header, replace content, or synchronize one side into the other.

Retain the explicit review and semantic round-trip checks described above;
recheck the intended source/target revisions before writing so stale review
cannot overwrite changed data. Fingerprints detect change, but do not settle
linguistic disagreements. This does not establish an automatic merge algorithm,
header replacement policy, correction authority, or complete synchronization
protocol. Those details need evidence/author decisions before implementation.

### Decisions deliberately left open

| Required clarification before implementing the affected behavior | Current limit |
|---|---|
| Historical header emission after annotation changes | Preserve it and show discrepancies; do not choose retained versus regenerated export output by assumption. |
| Exact `.syn` schema, terminal transitions and compatibility anchors | Unified node identity and downward refinement are settled. More detailed input-unit anchors, terminal-specific transitions, withdrawal/regrouping history and annotation transfer still require explicit specifications; Stage 2 version 2 implements the container/hierarchy and conservative evidence links; later terminal transitions remain open. |
| Marker labels/exact spelling and malformed markers | PAQ-003/004/005/021 remain open. Display numbering from 1 does not license renumbering historical markers. |
| ILL, NULL, traces and unresolved tag classifications | CEQ-004/005, PAQ-007 and guideline TBDs remain open. Retain the evidence; parser behavior is not a linguistic answer. |
| General morphology, non-concatenative realization and finer hyphenation | Coincident writing/analysis boundaries reuse nodes when finer analysis is independently supported. Use supported existing analysis only; no new paradigms or unspecified hyphenation rules are chosen. No crossing-boundary mechanism is required by current evidence; ask if a real case emerges. |
| Detailed synchronization/reconciliation and unsupported export mappings | Explicit user control and discrepancy blocking are settled; a more specific policy is not. |

Leaving these decisions open does not prevent Document draft saving or ordinary
source/analysis review. Ask the author before implementing a behavior whose
answer is not established by requirements or repository evidence.

## Implementation plan for the existing application

The version-1 prototype at `023a10c` supplied reusable modules, but the
previous claim that Stage 1 and minimal Stage 2 implement the complete model
is superseded. The version-1 schema is a single Text with `text_id`, `header`,
segments and occurrence/syntax/composition tables. The flat `data/authoring/`
store uses deterministic JSON and atomic revision-checked writes. It validates
references, cycles, ordered parts and duplicate yield, but does not establish
complete corpus preservation or the revised Document/transcription workflow.

### Current Editing prototype assessment

This table records the superseded version-1 baseline and the full target.
The milestone below reports which changes are implemented; later annotation
features in this table are not part of Stage 2.

| Prototype behavior or obsolete design claim | Required change next |
|---|---|
| `new_document()` / `newDocument()` create one Text, not a Document containing Texts. | Define a versioned Document container, ordered Text identities, membership and per-Text analysis. Specify conversion of existing version-1 drafts without treating them as migrated corpus Documents. |
| `filenameForText()` derives `<Text ID>.syn.json`; changing the Text ID changes the destination. | Choose storage by Document. Text IDs become scholarly metadata, not paths; retain aliases/suffixes and duplicate legacy IDs without silent correction. |
| Open lists saved single-Text filenames and does not load corpus Texts. | Navigate Document → Text; use complete-data legacy adapters to bring existing Texts into the same Editing representation through explicit import. Do not bulk-migrate yet. |
| Source cards contain manually added component rows; bulk input is one component per newline. | Pair numbered original text with a spaced transcription field; support bulk passage pairs and preserve initial boundaries/analysis links. Keep number and source visible together. |
| `addComponent()` creates a syntax node immediately for each input component. | Treat input spaces as provisional segmentation and pre-fill persistent nodes directly in the hierarchy workspace. Local review/refinement and upward construction edit those same nodes; initial units need not equal current terminals. |
| Separate occurrence records, syntax nodes and `composition_groups` encode the earlier target. | Replace the target schema with one recursively annotated node table/hierarchy. Category, optional lemma and annotations belong to that node; composition is a generated view, not another graph. Define reviewed versioned conversion of existing drafts rather than silently dropping their separate records. |
| Header is an independently editable optional input. | For new Texts, show derived word-level output and edit underlying analysis. Preserve imported historical headers for compatibility/discrepancy checking; exact emission policy remains open. |
| Lemma/script inputs exist, but no evidence-based pre-fill or category workflow is implemented. | Add read-only corpus/dictionary evidence, candidate alternatives and manual entry, then supported splitting/morphology/compound proposals; review exceptions without repeated confirmation dialogs. |
| Ordered parts and separate recursive groups are validated but have no specialized Editing interaction. | Preserve writing evidence; reuse coincident parts as annotated children only with independent analysis. Replace group editing with hierarchy editing/composition inspection. Add scoped PHON/LOG assignment and cross-passage alignment. |
| No structural construction or leaf-to-parent refinement interactions exist. | Add direct node typing, Enter, local Tab/Shift+Tab, structurally valid cut/copy/paste and child creation. Preserve parent identity during refinement; Wrap in Parent supplements local editing for efficient upward grouping. Adapt references/undo/yield without guessing word status. |
| Lemma IDs are plain inputs and lexical understanding relies on separate lookup. | Keep optional overlays, add understandable lemma/gloss hover information and open the existing dictionary popup/entry view on lemma click. Reuse current dictionary infrastructure. |
| Generic compatibility fields can hold information, but no complete corpus adapter proves its preservation. | Declare explicit mappings, unresolved-issue records and semantic checks for markers, headers, multipart data, IDs and unsupported formal fields. Do not import from reduced browser payloads. |
| Current 2 MB file and 10,000-record table limits were designed for single-Text drafts. | Measure complete Document encodings and reassess appropriate limits before Document migration; no replacement limits are chosen here. |
| Save is `.syn.json`-only; general TXT/XML synchronization/export is absent. | Retain the separation. Later add explicit reviewed operations with discrepancy blocking and revision checks; do not add automatic synchronization. |

Retain the principle of shared persistent identity, deterministic save/load,
atomic replacement, stale-save rejection and validation of structural errors.
The current separate occurrence/syntax/group schema is not itself reusable as
the target unchanged. These mechanisms are foundations,
not proof that the current schema is the intended full model. Existing UI/state
tests asserting Text-ID filenames or immediate component-to-terminal creation
described obsolete prototype behavior and have been replaced for Stage 1 + Stage 2. Later-stage acceptance remains deferred.

Extend `treditor` incrementally, using its existing editor shell and graphical
tree as the primary authoring surface. Workbench remains available for comparison
and conversion. Do not revive the abandoned editors or introduce a second
dictionary/corpus engine.

### What can be reused, and what must change

| Existing code | Reuse and required extension |
|---|---|
| [Editor shell](../../../treditor/templates/index.html) and [app.js](../../../treditor/static/app.js): tabs, passage loading, SVG renderer, display toggles, node drawer and dictionary popup | Reuse UI/navigation and drawing. Add Document state, paired source entry and contiguous multi-selection. Route form/category/lemma/script edits to the same persistent annotated nodes. Existing Add Child/Add Sibling/Delete mutate reduced tree objects; replace their authoring behavior with complete-model structural commands. |
| `prepareTreeData()`, `editableNodeCopy()` and localStorage drafts in app.js | Drawing paths may remain temporary addresses. `_nodeId` is regenerated from tree position, so it cannot be persistent identity. Draft copying drops metadata and duplicates lexical fields; replace it for authoring with complete-model recovery plus durable file saves and base-revision checks. Do not silently promote old local drafts to complete authoring records. |
| [Workbench backend](../../../treditor/workbench.py) and [browser panes](../../../treditor/static/workbench.js) | Reuse one-text TXT/XML loading, retained input, parse errors, generated previews, origin labels and dictionary/tooltips. Current Syntax Trees is read-only, memory-only and TXT parsing requires a tree; build source-only drafting separately rather than force it through `parse_text()`. |
| [Workbench comparison](../../../treditor/static/workbench-core.js) | Reuse textual comparison and field highlighting for previews. `compareTrees()` aligns siblings by content/order, so it is not an identity-preserving edit reconciler or complete-model semantic validator. Add an ID-aware authoring comparison where needed. |
| [Corpus model/TXT parser](../../../src/coj/core/corpus.py) and [XML facade](../../../src/coj/xml/corpus_xml.py) | Reuse the recursive hierarchy, internal/terminal lemmas, multipart handling, distinction labels and retained comments. Add complete-model adapters with persistent node IDs and input/alignment records. Current XML-backed objects lack those identities/links and source-only drafts; preserve their unified shape rather than introduce parallel lexical/syntax trees. |
| [Dictionary model](../../../src/coj/core/dictionary.py), [XML mappings](../../../src/coj/xml/dictionary_xml.py) and [Flask dictionary/search code](../../../treditor/app.py) | Reuse all-form lookup, ID validation/entry access, existing search scoring, glosses, compound references and corpus evidence. Add debounced lemma autocomplete and indexed form/lemma/category and child-pattern suggestions. Current search/frequency caches are useful inputs, not a ready-made suggestion engine. Keep suggestions read-only; no dictionary write is required to annotate an occurrence. |
| [Tags](../../../src/coj/core/tags.py) and [UI tag descriptions](../../../treditor/tag_names.json) | Reuse script inventory and category descriptions; expose one shared suggestion/validation catalog, checking discrepancies rather than copying another registry. Add scoped batch script commands with individual exceptions. |
| [Display segmentation](../../../treditor/static/segmentation.js) and raw-text helpers in app.py | Reuse terminal/word/hyphenated rules over the unified hierarchy. Current string/traversal matching does not supply persistent alignment. Extend projections to use input-to-node links, writing-mode parts and cross-passage subtree coverage. |
| [XML formatter](../../../src/coj/xml_format.py) and [primary TXT importer](../../../scripts/data_conversion/import_primary_txt.py) | Reuse canonical XML previews and established fingerprint/atomic-write patterns through shared helpers where appropriate. The importer is one-way primary-source synchronization, not an authoring save endpoint. A new complete-file serializer/repository service is required. |

The required extensions are the Document/Text and transcription/analysis model,
versioned draft conversion and legacy adapters, the command/undo layer, paired
passage entry and multi-node selection, and evidence indexes for assisted
hierarchical analysis and composition views. Existing modules provide storage foundations, adapters
and presentation.

### Fit into the architecture

Extend the focused package already under `src/coj/authoring/` with Document/Text
records, validation, versioned serialization and legacy adapters.
It uses the existing dictionary/tag/corpus APIs; the existing corpus classes
remain the legacy representation used by browsing and processors. One editable
authoring Document supplies the shared model for its Text editing views;
renderer and export payloads are derived projections, never parallel mutable
lexical copies. Concurrent views remain subject to Document revision checks.

Extend the existing Flask authoring blueprint under `treditor/` for Document
load/save, explicit import/export previews and suggestions, rather than adding
every responsibility to app.py. Keep structural UI commands in a testable browser module: they update
the complete in-memory document and an undo stack; the server validates every
saved document using the same declared schema/invariants. Export adapters
traverse the unified hierarchy into legacy paths, preserving both internal and
terminal annotations at the adapter boundary.

Use bounded Document-level paths, for example `data/authoring/BS.syn.json` and
`data/authoring/MYS_04.syn.json`, with storage destination independent of Text
IDs. The exact directory layout/new-Document naming interface remains a later
implementation detail, not a reason to split one Document into per-Text files.
Browser recovery is optional secondary storage, not an implemented guarantee.
For now, XML remains the existing browsing/processor input and primary TXT import
continues as documented. Saving an authoring file does not automatically publish
XML/TXT or write to external source repositories.

### Current Stage 1 + Stage 2 milestone

- `schema_version: 2` stores an identified Document with `name`, ordered Text
  keys and per-Text `text_id`, ordered passages, one node table/root forest,
  explicit links, historical header and compatibility/annotation records.
  Scholarly Text IDs may repeat. Changing a Text ID never renames the file.
- Each passage stores original text, entered spaced transcription and derived
  Unicode code-point initial ranges. Display numbering follows passage order
  from 1. These ranges are input boundaries, not inferred terminal boundaries.
  Source-only drafts create no analysis nodes.
- Editing provides sidebar New Document/New Text/Open Text actions. New Document
  creates only an empty container; New Text requires an explicit existing parent
  choice and starts with primary bulk entry, not a placeholder source row. A
  compact grouped Document/Text browser supports Text-ID/name search and
  on-demand expansion. Numbered Text/Transcription pairs support insertion
  between existing pairs, Enter to continue and removal/undo. Bulk Preview
  precedes Apply; complete-Document Save/Reopen retains existing persistence.
  Switching Texts retains other
  Texts' drafts. Pending paste must be applied or cleared before Save/switching.
- The corpus adapter explicitly reads complete XML Documents and preserves
  original XML/TXT snapshots, block records, historical headers, attributes,
  markers and writing-mode parts. It maps only exact ordered compacted yields;
  mismatches retain scope-level unresolved links instead of guessed alignment.
  Nodes spanning passages and multipart nodes remain one hierarchy. Imported
  numbering is retained separately from display numbering. Original corpus
  files remain untouched. A read-only analysis inspector shows retained nodes
  with generated tree
  guides rather than nested bullets. Fixed workspace width and a stable
  scrollbar gutter prevent section expansion from resizing the editor.
- Stable corpus-copy identities derive from file content and record addresses;
  new draft identities are generated once and retained on Save/Reopen. The
  codec uses sorted keys, ordered arrays, UTF-8, indentation and a final LF.
  Saves retain atomic replacement and fingerprint-based stale checks. The
  32 MB limit accommodates the measured largest corpus Document (MYS_10,
  17,619,990 serialized bytes); table limits apply per Text. This is local
  single-server storage, not a multi-process collaboration protocol.
- `data/authoring/<Document name>.syn.json` is chosen on first Save. Later
  display-name/Text-ID changes retain that path. Save a copy chooses a fresh
  destination without replacing an existing file. Imported copies have no
  overwrite authorization/revision. Storage names use safe ASCII filename
  characters; scholarly Text IDs remain unrestricted text.
- Drafts are kept in memory until Save. Refresh/closing the page warns about
  unsaved changes but provides no automatic recovery. Switching/hiding the
  Editing tab retains the live draft while the page remains loaded.

**Version-1 draft conversion policy:** never reinterpret a version-1 file as
version 2 or overwrite it while opening. A reviewed conversion must preserve
its complete original record as historical compatibility evidence; reconstruct
source transcription from old component order with that reconstruction clearly
identified; map explicit occurrence/syntax associations into unified nodes;
and show unresolved mappings before saving to a new destination. Separate
composition groupings that conflict with the hierarchy require a concrete case
and author decision, not automatic choice or silent record loss. No version-1
files exist in the current `data/authoring/` inventory. This milestone therefore
rejects version-1 opening with an explicit conversion-required message; a
conversion UI is deferred until an actual draft can be reviewed. The active
version-2 schema contains none of the obsolete occurrence/syntax/group tables.

### Staged delivery and acceptance

1. **Correct the model before extending the prototype.** Specify/version the
   Document/Text container, entered transcription/initial boundaries, one
   annotated node hierarchy, input links, historical headers and typed legacy
   records. Preserve higher nodes during downward refinement. Specify remaining
   terminal-transition/alignment and withdrawal policies with the author where
   evidence is insufficient. Define explicit conversion for old single-Text
   drafts; retain deterministic codec and atomic revision checks. Demonstrate
   multi-Text save/reload with stable identities, order and byte-identical no-op
   saves. Do not migrate the corpus at this stage.
2. **Paired source entry and common opening representation.** Add Document/Text
   selection, numbered source/spaced-transcription entry and bulk passage import.
   Test initial spaces separately from final terminal boundaries. Develop explicit
   legacy import adapters on representative Documents without bulk migration;
   existing annotations must appear in the same views as new authoring data.
3. **Assisted recursive analysis and refinement in the workspace.** Use corpus/dictionary evidence
   to pre-fill supported tagged subtrees, lemmas/categories and component
   structure with fresh node identities. Retain the higher annotated nodes and
   original input links. Provide manual correction of the same hierarchy,
   writing-mode metadata and batch scripts. Results are already persistent
   workspace nodes, with no transfer between analysis and tree modes. Reuse
   coincident writing/analysis boundaries when independently supported.
   Composition is a view; lemma-less
   internal analysis is valid. Verify fresh-instance identity, refinement
   save/reload/undo, no duplicated yield and no dictionary mutation. Use
   `paruyama`, `titipapa`, ambiguous `taka`, attested `yuku`, and multipart `ipaku`.
4. **Text-like editing and efficient upward construction.** Add direct node
   content editing, Enter, local indent/outdent, structurally valid selection
   and cut/copy/paste, and direct child creation with undo/redo. Maintain validity
   and generated indentation underneath those interactions. Add Wrap in Parent
   with category autocomplete for adjacent subtrees, movement and unwrap on the
   same hierarchy. Keep overlays optional; reuse lemma/gloss hover and clickable
   dictionary entry presentation. Preserve node identities and input links. The first
   acceptance workflow is the two KK.67 wraps above, including save/reload and
   undo; also verify direct `paruyama` child refinement, optional overlays and
   dictionary navigation. No separate transfer step or unnecessary local-edit
   dialogs are required.
5. **Derived projections and explicit export review.** Apply the documented
   segmentation rules to generate word-level output; preserve imported headers
   and report discrepancies without overwriting either representation. Add
   export previews, semantic reparse checks, revision checks and unsupported-data
   reports after required open decisions are answered. Verify unresolved content
   discrepancies remain saveable drafts but block reviewed write-back/export.
   Check KK.30 cross-passage grouping, MYS.4.619 parts, MYS.2.150 repeated
   occurrences, BS.1 marker boundaries and duplicate Text identity preservation.
6. **Future Document migration, separately authorized.** After complete mappings
   and preservation checks are established, migrate existing corpus Documents
   equivalently to `.syn.json` and move Editing to that source of truth. This
   revision authorizes neither that migration nor automatic TXT/XML synchronization.

Stages 1–4 can deliver useful new-text authoring and saves without promising
general legacy export. At each stage, add focused model/command and backend
tests to the existing pytest/Node suites; exercise integration through the
current renderer, dictionary and segmentation tests. Repository acceptance
evidence includes [segmentation tests](../../../treditor/tests/test_segmentation.js),
[export/round-trip tests](../../../tests/test_export.py),
[dictionary tests](../../../tests/test_dictionary.py),
[authoring validation/storage tests](../../../tests/test_authoring.py), and
[Editing state](../../../treditor/tests/test_editing_state.js)/
[UI tests](../../../treditor/tests/test_editing_ui.js). These tests establish
current behavior, not unspecified annotation policy. No runtime tests were run
for this documentation-only revision.

### Major risks and blockers

- **Lossy projections and unstable IDs:** current renderer payloads omit some
  compatibility attributes; path IDs change after edits. Complete import must
  read original blocks/records, never reconstruct authoritative data from the
  rendered payload or legacy localStorage draft.
- **Alignment and marker events:** traversal/string matching does not establish
  occurrence identity or partial-source coverage. Imported marker paths encode
  constituent-boundary events as well as text breaks. Resolve their typed
  anchors and ambiguous cases before permitting general legacy export.
- **Authority and concurrent writes:** authoring files, stored XML and external
  primary TXT can diverge. Record import bases and keep save/export separate;
  detect changed inputs, refresh application caches after approved publication,
  and resolve conflicts instead of silently choosing one copy.
- **Format completeness:** the legacy formats already express recursive tagged
  analysis and internal lemmas. New identities, entered-input boundaries,
  alignment and review provenance need explicit mappings/limits. Draft saving
  remains available when reduced export cannot preserve formal information;
  NULL/ILL, fresh distinction labels and partial-character mappings still need
  agreed rules. No separate composition graph is required.
- **Suggestions are evidence, not decisions:** dictionary spelling/POS may
  differ from attestations. Existing compound processors can allocate/refine
  dictionary entries and must not run unchanged as autocomplete. Build a
  read-only evidence service and measure ranking cost on the current corpus.
- **Coupled frontend code:** app.js combines navigation, drawing and mutation.
  Extract adapters/commands at the boundary of the new authoring feature;
  preserve browsing/search behavior rather than rewrite the whole application.
