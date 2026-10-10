# Syntax-tree authoring: source-first workflow

Revised for checkout `ab78d4e`, 10 October 2026. **Design only:** no grammar,
parser, editor, migration or renderer is implemented. This revision follows
the author's annotation workflow and replaces the earlier recommendation to
choose A. The [A/B comparison](syn-prototype-comparison.md) and its eight static
files remain historical alternatives, not the settled authoring format.

## Recommended workflow

1. Manually enter source-text segments and their transcription components only.
   Creating a component immediately creates a persistent lexical occurrence.
2. The editor inserts those same occurrences into a terminal tray or provisional
   tree. Users do not retype terminals or bind them later by matching spelling.
3. Review assisted lemma, script and category input in either source or tree
   views. Editing lexical information in either view updates the same record.
4. Select adjacent terminals/subtrees and use **Wrap in Parent** to build the
   hierarchy. The editor lays out the result automatically; whitespace may encode
   hierarchy in serialization, and optional `|` guides are generated display.
5. Inspect derived lexical composition when useful; adjust exceptional analysis
   separately. No manually maintained composition section is required.

Source, lexical occurrences, composition, syntax and display remain separate
semantic layers, without requiring a manually edited section for each one.
The ordinary workspace has source and tree views over one complete model;
composition is an optional inspector or tree overlay. The independently authored
header remains available. No manually typed occurrence IDs, alignment records
or preservation blocks belong in the normal view.

An unfinished transcription, missing lemma, unresolved category or absent tree
is a valid draft. A compound without a lemma is valid in completed annotation:
it requires neither confirmation of that absence nor a new dictionary entry.
Composition can be revised independently of syntax.

### Assisted annotation

- Search/autocomplete existing lemma IDs using forms and dictionary information;
  rank candidates using corpus attestations and retain the attested spelling.
- Suggest terminal categories from previous attestations of the same form/lemma
  and relevant morphological patterns. Category belongs to the syntax node;
  dictionary POS is supporting evidence, not an obligatory category mapping.
- Autocomplete the small controlled script-tag set, including registered PHON
  variants, LOG and NLOG. Retain unusual imported values; missing information
  remains unresolved rather than becoming a guessed tag.
- Support batch PHON/LOG assignment to an explicitly selected scope. Show the
  affected occurrences and allow individual exceptions and undo.

Pre-fill well-supported values and expose uncertainty where evidence conflicts,
so the user mainly reviews exceptions. Suggestions carry evidence/provenance
and review state; imported annotations retain their existing status. Changing a
lemma can refresh category suggestions but must not silently overwrite an
authored category. Missing evidence is acceptable in a draft.

The existing `treditor` application is the proposed primary authoring interface.
Users normally work through its structured UI. VS Code initially supports file
storage, inspection and Git history; a full editing extension is deferred.
These are proposed editing views, not an implemented authoring format.

## Separate layers in one complete model

| Layer | Contents and relationship |
|---|---|
| Source/text segmentation | Ordered original-text segments, independent payloads, transcription coverage, original marker labels where imported. Segment numbers shown to the user are navigation labels, not persistent identities. |
| Lexical occurrences | Single records containing attested form, selected lemma reference and script/ordered writing-mode parts. Source coverage and syntax refer to these same records by persistent identity. An occurrence is not a dictionary entry, a syntax category or necessarily one source character. |
| Recursive lexical composition | Ordered occurrence-based groups whose children can be components or other groups. Each group may carry an existing lemma, or none; composition does not require a syntax node. |
| Syntax | Ordered nodes with categories and occurrence references. A terminal can reference a component or a composed realization; branches can optionally link to a composition group without owning it. Retain independent syntax annotations and distinctions. |
| Hidden identity | Persistent identities for occurrences, groups, source segments and syntax nodes. Derived hierarchical addresses support navigation; they change after moves and are not identities. |
| Display | Form labels, optional compound lemma/gloss overlays, indentation guides, word/terminal/hyphenated segmentation and source-row layout. Changing a display option changes no annotation. |
| Header and compatibility | Independently meaningful header/transcription segmentation, exact scholarly and legacy IDs, comments, explicit `;@N`, script indices and non-derivable source information. |
| Dictionary and attestations | Independent lemma entries and their lexical definitions; corpus occurrence records link attested spellings and context to those entries. |

The source-first view does not mean components are owned exclusively by source
segments. Coverage is a separate relation: one composition can span segments,
and a component or writing-mode part can have explicitly annotated partial
coverage. Do not invent character-to-transcription alignment from juxtaposition.

Source components and composition groups share a realization mechanism:
ordered children produce a form, while child roles distinguish lexical or
morphological composition from writing-mode parts. They are not interchangeable.
A displayed compound form is normally generated from its children, not another
string that the annotator must keep synchronized. Non-concatenative realizations
would need an explicit supported rule; do not assume every future analysis is
simple concatenation.

## Tree-building interaction

Storage syntax and editing interaction are separate. Users build normal trees
through structural commands; they do not maintain spaces or type depth guides.

| Concern | Proposed role |
|---|---|
| Serialized tree representation | A serializer may encode ordered parent-child relationships using whitespace indentation. It generates indentation from the model. The final `.syn` grammar remains undecided; portable occurrence bindings still travel with the complete model. |
| Visible tree/editor representation | A selectable outline or rendered tree shows categories, forms and optional lexical overlays. The editor generates layout, indentation and optional `|` guides. Visible rows are projections of syntax nodes and shared lexical occurrences, not independently stored strings. |
| Structural editing operations | Commands create branches, reparent nodes and change categories in the model. The visible tree and serialized projection refresh from those changes; display whitespace is not the source of an ordinary structural command. |

### Primary operation: Wrap in Parent

1. Select one or more adjacent whole terminals/subtrees under the same parent,
   or in the ordered top-level draft forest. A subtree selection includes its
   descendants. A single node can be wrapped to create a unary branch.
2. Invoke **Wrap in Parent** from a lightweight command or keyboard shortcut;
   no particular key binding is settled yet.
3. Type/autocomplete a parent category and accept it.
4. Create one syntax branch at the selected range's position and move the
   selected nodes into its ordered children. Keep their order, node identities
   and lexical-occurrence references. The editor handles layout/indentation
   automatically and selects the new parent for further grouping.

Non-adjacent selections or nodes from different parents need a contiguous
sibling selection before wrapping; do not silently flatten existing structure
or include unselected material. Cancelling category entry changes nothing.
One wrap is one undoable operation; undo restores the previous parent/child
relationships. Wrapping neither creates lexical occurrences nor changes source
coverage, lemma/script annotation or independent composition.

Parent-category autocomplete should use the project's category registry and,
where available, rank likely categories from existing corpus structures:
ordered child categories, comparable terminal form/lemma patterns and surrounding
syntactic context. For KK.67, evidence can rank VB-ADC above the selected
ADJ-STM/VB-ADC pair and MK above VB-ADC/P-FOC. These are proposed suggestions
based on known corpus structure, not a reason to insert branches automatically.
Show the evidence/context when useful, allow another supported category, and
retain ordinary category entry when evidence is sparse. Imported distinction
labels remain independent; wrapping must not invent or renumber `;@N` labels.

### Secondary adjustments

- **Tab/Shift+Tab:** offer structural indent/outdent (reparenting) for selected
  whole nodes where a valid target exists. Show the destination and preserve
  node order; these keys do not insert/remove literal spaces. In text fields,
  normal focus/autocomplete behavior takes precedence.
- **Enter:** accept the category prompt or offer insertion of an empty branch
  at a selected structural boundary. Existing source occurrences can be placed
  from the tray; Enter does not require typing a duplicate lexical row.
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
source
  1 多迦由久夜
    taka
    yuku
    ya
```

The editor creates three distinct occurrences immediately and inserts them into
the tree workspace. Lemma search, corpus category evidence and a scoped PHON
assignment can produce the following reviewed terminal rows:

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

The source `taka` and the displayed `ADJ-STM taka` reference one occurrence.
Editing its form, lemma or script in either view refreshes both. Changing
ADJ-STM or moving the row edits syntax only. A repeated `taka` would have a
different hidden identity even if all visible lexical fields matched.

**Inspect composition optionally.** Ordered component-lemma evidence can
suggest a `takayuku` group linked to existing L030996a. Its dictionary form
is **takayuki**, with component references L007005 (`taka`) and L031840a
(`yuki`); this text attests **takayuku** and **yuku**. Variant evidence
supports ranking the existing lemma, rather than requiring exact concatenation
or replacing the attested form. The group may also remain lemma-less.

The imported MK annotation L091050 (`takayukuya`) is retained independently.
That entry has no dictionary compound references: a fresh draft cannot treat
its full recursive composition as established by the dictionary alone.
Imported links can be shown on the tree, or a proposed association reviewed
in the inspector. No composition section or dictionary-entry creation is
required to finish this tree.

**Choose display.** Hide lemma IDs and script tags to work with category/form
rows; show them again for review. Gloss and compound-lemma overlays have
independent toggles. None of these toggles removes data or changes identity.

## Recursive analysis, multipart forms and repeated occurrences

A lexical group must support children that are themselves groups. Future finer
morphological annotation can subdivide a component while retaining its occurrence
identity and its syntax reference. Specify which realization a syntax terminal
uses; changing granularity must not duplicate material in the tree's yield.

Keep writing-mode parts distinct from morphological children. In MYS.4.619,
`ipa` LOG plus `ku` PHON realizes one `ipaku` terminal linked to L030199a.
That is multipart writing annotation, not evidence of two words or two morphemes.
The source view can expose a nested `parts` section on `ipaku`; syntax can show
`VB-NML ipaku` without inventing syntax children for the parts. Preserve the
ordered part forms/scripts and any `phon_index`.

A repeated form in the tree is a display label, never a global lookup key.
Normal source entry already supplies the exact identity to the inserted terminal;
there is no later spelling-based binding step. Importing an unbound external
file may need occurrence context and explicit disambiguation. In MYS.2.150 the repeated
`sakari`, `wite` and `kimi` occurrences must remain separate even when
their forms and lemma IDs match. Preserve the original `NP-APP;@2` distinction;
do not replace it with a hidden address or renumber it.

Allow syntax to reference either a component or a composed realization, subject
to coverage validation. Referencing both a group and its contained components
as separate ordinary terminals would duplicate material and must be diagnosed.
An independent composition may exist without appearing as a dedicated syntax
node. Legacy internal-node lemmas that cannot yet be assigned an approved
composition interpretation remain typed syntax annotations with provenance.

## Hidden identity and plain-text persistence

Never require annotators to type `#t1`, `1.1` or a `C...` occurrence name.
Hierarchical addresses such as `1.1.1` can be shown temporarily for navigation
or disambiguation. Persistent internal identities survive moves, spelling edits
and source regrouping. New source occurrences receive new identities; moving
or copying a view of an existing occurrence does not create another lexical
record. Duplicating actual source material creates fresh occurrences, and undo
restores the previous records and references.
A possible compound-occurrence namespace is an implementation question, not
an approved authoring syntax.

### Single storage and explicit references

The complete persisted model stores lexical information once, keyed by opaque
occurrence identity. Source coverage contains occurrence references; a syntax
terminal stores its own identity, category and an occurrence reference, with
no independently editable copy of form/lemma/script. Branches store category
and ordered syntax children. Composition groups store ordered references to
occurrences or other groups, optional lemma association, realization rules and
provenance. Display settings are separate.

For the KK.67 `taka`, a conceptual machine-owned encoding is:

```json
{
  "occurrences": {
    "occ-a": {"form": "taka", "lemma": "L007005", "script": "PHON"}
  },
  "sourceSegments": {
    "seg-a": {"text": "多迦由久夜", "occurrences": ["occ-a", "occ-b", "occ-c"]}
  },
  "syntaxNodes": {
    "node-a": {"category": "ADJ-STM", "occurrence": "occ-a"}
  }
}
```

This is an illustrative excerpt: other occurrence records, tree parents,
coverage details and version data are omitted, not implicitly deleted.
These names stand for generated persistent IDs, not author input, traversal
numbers or an approved schema. The source view resolves `occ-a`; the tree
view resolves `node-a.occurrence` to that identical record. Lexical edits
update `occurrences["occ-a"]`; category edits update `node-a`; moves update
ordered parent-child references. Persisting a changed view must perform the
corresponding operation on the shared model, not save two lexical strings.

Removing a syntax placement leaves its source occurrence available in the tray.
Deleting source material must update dependent references atomically or report
unresolved dependants. Ordinary tree copying must not silently duplicate lexical
coverage; copying source material and moving syntax are distinct operations.
Existing realization/coverage validation also prevents a group and its children
from producing duplicated yield.

### Portable encoding and external edits

For the first implementation, recommend one complete, versioned, human-readable
JSON document per text, provisionally named `<text-id>.syn.json`. The extension
is a proposal, not an implemented format. It supersedes the earlier preference
for minimal text plus a metadata companion: shared occurrences, source coverage,
syntax, composition and compatibility information travel together in one atomic
save. Technical IDs are hidden in the UI but visible in file inspection and Git
diffs. No parallel manually maintained lexical/tree text is required.

Use UTF-8, fixed two-space indentation, LF and a final newline, documented field
ordering and stable ordering of record tables by persistent ID. Ordered source,
child and component-reference arrays preserve semantic order and must never be
sorted. Generate IDs only when records are created and retain them across saves,
moves and reloads; neither formatting nor export renumbers them. Store syntax
nodes in a table with ordered child references so wrapping changes a small set
of records instead of rewriting the indented body of every descendant.

Save schema version, header, original source payloads, occurrence/part records,
coverage, ordered syntax roots, composition and non-derivable compatibility data.
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

Future suggestions should use ordered **recursive component lemma structure**,
compatible lexical analysis and existing dictionary composition references.
Surface forms, inflectional variants and POS can support ranking; they cannot
prove a unique lemma. A missing dictionary composition field means less evidence,
not proof that a matching lemma does not exist.

Derive provisional grouping and rank existing lemma associations where ordered
component structure and dictionary/corpus evidence support them. Ambiguous
grouping or lemma associations remain inspectable suggestions; users can adjust
or reject them. This does not impose a review dialog on every derived group:
lemma-less composition is valid and requires no confirmation. Finer morphological
children can be added later without replacing occurrence identity.

No automatic new dictionary ID or entry is created. Current
`compound_lemma_processor.py` is not this workflow: it looks up concatenated
forms and can allocate new IDs/create/refine entries. Reusing it unchanged would
violate the intended annotation process.

Collect occurrences under the selected existing lemma as an attestation index:
form, source/text identity, occurrence/group identity, script parts and context.
For example, `takayuku` can be recorded under L030996a without replacing the
dictionary form `takayuki` or creating a new lemma. A lemma need not be assigned
to every lexical group. Adding an attested spelling to dictionary `.FORM`
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

Keep only genuinely non-derivable information as compatibility data: original
marker labels where their meaning is unresolved, opaque comments, unusual
spellings/lines, legacy ID aliases/suffixes, explicit distinction-label values,
script indices and unsupported formal annotations. Retain untouched input
snapshots for recovery/provenance, without forcing annotators to maintain
`preserve` blocks. Exact byte reconstruction is a different goal from semantic
round trips. Whether original marker spelling itself is authoritative remains
[PAQ-021](../../registers/project-author-questions.md#paq-021--exact-marker-syntax-versus-regenerable-serialization).

Current TXT/XML express composition mainly through syntax-attached lemmas and
dictionary references; they cannot independently encode arbitrary recursive
occurrence composition and hidden bindings. Export such links only when their
syntax association is explicit and compatible. Otherwise use an agreed complete
package/extension, or block that reduced export; do not invent a syntax node
to carry a compound ID. Check reparsed structure, supported annotations,
coverage, parts, IDs and retained records against the complete model.

Headers remain independent; derived raw-text must be regenerated from validated
source coverage and transcription. Fresh `;@N` allocation, NULL/ILL semantics,
partial-character coverage and new annotation mappings remain unresolved.
Future annotation types need explicit typed extensions and versioned adapters,
not silent omission or interpretation by visual similarity.

## Implementation plan for the existing application

Inspected the current code at checkout `ab78d4e`; everything below is proposed.
Extend `treditor` incrementally, using its existing editor shell and graphical
tree as the primary authoring surface. Workbench remains available for comparison
and conversion. Do not revive the abandoned editors or introduce a second
dictionary/corpus engine.

### What can be reused, and what must change

| Existing code | Reuse and required extension |
|---|---|
| [Editor shell](../../../treditor/templates/index.html) and [app.js](../../../treditor/static/app.js): tabs, passage loading, SVG renderer, display toggles, node drawer and dictionary popup | Reuse UI/navigation and drawing. Add an authoring document state, source-entry panel, terminal tray and contiguous multi-selection. Route lexical edits to occurrence records and categories to syntax nodes. Existing Add Child/Add Sibling/Delete directly mutate reduced tree objects; replace their authoring behavior with structural commands rather than extend those mutations. |
| `prepareTreeData()`, `editableNodeCopy()` and localStorage drafts in app.js | Drawing paths may remain temporary addresses. `_nodeId` is regenerated from tree position, so it cannot be persistent identity. Draft copying drops metadata and duplicates lexical fields; replace it for authoring with complete-model recovery plus durable file saves and base-revision checks. Do not silently promote old local drafts to complete authoring records. |
| [Workbench backend](../../../treditor/workbench.py) and [browser panes](../../../treditor/static/workbench.js) | Reuse one-text TXT/XML loading, retained input, parse errors, generated previews, origin labels and dictionary/tooltips. Current Syntax Trees is read-only, memory-only and TXT parsing requires a tree; build source-only drafting separately rather than force it through `parse_text()`. |
| [Workbench comparison](../../../treditor/static/workbench-core.js) | Reuse textual comparison and field highlighting for previews. `compareTrees()` aligns siblings by content/order, so it is not an identity-preserving edit reconciler or complete-model semantic validator. Add an ID-aware authoring comparison where needed. |
| [Corpus model/TXT parser](../../../src/coj/core/corpus.py) and [XML facade](../../../src/coj/xml/corpus_xml.py) | Reuse legacy parsing, tree construction, multipart handling, explicit/inferred labels and retained comments. Wrap them with complete-model import/export adapters. Their XML-backed objects store lexical fields on tree leaves and do not represent independent occurrence composition or source-only drafts; they cannot be the whole authoring model unchanged. |
| [Dictionary model](../../../src/coj/core/dictionary.py), [XML mappings](../../../src/coj/xml/dictionary_xml.py) and [Flask dictionary/search code](../../../treditor/app.py) | Reuse all-form lookup, ID validation/entry access, existing search scoring, glosses, compound references and corpus evidence. Add debounced lemma autocomplete and indexed form/lemma/category and child-pattern suggestions. Current search/frequency caches are useful inputs, not a ready-made suggestion engine. Keep suggestions read-only; no dictionary write is required to annotate an occurrence. |
| [Tags](../../../src/coj/core/tags.py) and [UI tag descriptions](../../../treditor/tag_names.json) | Reuse script inventory and category descriptions; expose one shared suggestion/validation catalog, checking discrepancies rather than copying another registry. Add scoped batch script commands with individual exceptions. |
| [Display segmentation](../../../treditor/static/segmentation.js) and raw-text helpers in app.py | Reuse terminal/word/hyphenated display rules. Current formatting compares concatenated strings and raw-text annotation is assigned by traversal order; neither supplies persistent alignment. Extend display projections to consume explicit occurrence coverage, including parts and cross-segment composition. |
| [XML formatter](../../../src/coj/xml_format.py) and [primary TXT importer](../../../scripts/data_conversion/import_primary_txt.py) | Reuse canonical XML previews and established fingerprint/atomic-write patterns through shared helpers where appropriate. The importer is one-way primary-source synchronization, not an authoring save endpoint. A new complete-file serializer/repository service is required. |

The genuinely new pieces are the complete occurrence/reference model, its
schema/codec and validators, the command/undo layer, source-entry and multi-node
selection interactions, durable authoring load/save, and evidence indexes for
suggestions/composition. Existing components provide adapters and presentation.

### Fit into the architecture

Place a small complete-model package under `src/coj/authoring/` (proposed),
containing records, validation, deterministic serialization and legacy adapters.
It uses the existing dictionary/tag/corpus APIs; the existing corpus classes
remain the legacy representation used by browsing and processors. One editable
authoring document is authoritative per open text; renderer and export payloads
are derived projections, never parallel mutable copies.

Add a focused Flask authoring blueprint under `treditor/` for create/load/save,
import/export previews and suggestions, rather than adding every responsibility
to app.py. Keep structural UI commands in a testable browser module: they update
the complete in-memory document and an undo stack; the server validates every
saved document using the same declared schema/invariants. Export adapters
resolve occurrence references back into legacy leaf fields only at the boundary.

Use a proposed tracked `data/authoring/<source>/<document>/<text-id>.syn.json`
location with validated IDs and bounded paths; new unsited drafts need a chosen
collection/document destination. Browser recovery is optional secondary storage.
For now, XML remains the existing browsing/processor input and primary TXT import
continues as documented. Saving an authoring file does not automatically publish
XML/TXT or write to external source repositories.

### Staged delivery and acceptance

1. **Complete model and file round trip.** Define stable identity, ordered
   references, partial drafts, coverage, composition and compatibility records.
   Build schema validation and deterministic codec first. Demonstrate
   byte-identical no-op save and preservation of repeated forms, Unicode,
   multipart annotations and unknown retained data.
2. **Source-first authoring and durable drafts.** Add a new/open authoring tab
   within the current app, source segmentation/transcription entry, occurrence
   creation and automatic terminal generation. Bind both views to the same
   occurrence records. Add load/save with atomic replacement and expected-base
   fingerprints so stale tabs cannot overwrite newer disk content. Verify
   reload retains identity and lexical edits update both views.
3. **Assisted annotation.** Connect lemma autocomplete, controlled scripts,
   scoped batch assignment and basic corpus-ranked terminal categories. Begin
   with transparent counts/examples and explicit missing-evidence states; defer
   elaborate inference. Cache evidence by corpus/dictionary revision and extend
   it to attested forms under existing lemmas. Verify batch undo and exceptions.
4. **Structural tree construction.** Add adjacent sibling/subtree selection,
   Wrap in Parent with category autocomplete, undo/redo and then movement,
   outdent and unwrap. Preserve identities and source references. The first
   acceptance workflow is the two KK.67 wraps above, including save/reload and
   undo; no manual whitespace maintenance is required.
5. **Import, optional composition and export review.** Import existing texts
   through shared TXT/XML code with original input fingerprints/provenance.
   Derive supported recursive groups and rank existing compound lemmas; provide
   an optional inspector and accept lemma-less groups. Add validated legacy
   export previews, reparsed semantic checks and explicit unsupported-data
   reports before any publishing action. Check KK.30 cross-source grouping,
   MYS.4.619 parts, MYS.2.150 repeated occurrences and BS.1 marker boundaries.

Stages 1–4 can deliver useful new-text authoring and saves without promising
general legacy export. At each stage, add focused model/command and backend
tests to the existing pytest/Node suites; exercise integration through the
current renderer, dictionary and segmentation tests. No runtime tests were run
for this documentation-only plan.

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
- **Format completeness:** arbitrary recursive composition and finer morphology
  exceed current TXT/XML expressiveness. Complete-file saving must work even
  when reduced export is unavailable; NULL/ILL, fresh distinction labels and
  partial-character mappings still need agreed rules.
- **Suggestions are evidence, not decisions:** dictionary spelling/POS may
  differ from attestations. Existing compound processors can allocate/refine
  dictionary entries and must not run unchanged as autocomplete. Build a
  read-only evidence service and measure ranking cost on the current corpus.
- **Coupled frontend code:** app.js combines navigation, drawing and mutation.
  Extract adapters/commands at the boundary of the new authoring feature;
  preserve browsing/search behavior rather than rewrite the whole application.
