# Current workflows

This document follows what the current applications actually do: what they load, where changes are held, and what is written to disk.

For repository structure, see [architecture.md](../reference/architecture.md). For the underlying corpus concepts, see [data-model.md](../reference/data-model.md).

## Opening a text in `treditor`: `BS.1`

```text
User opens Documents
  ↓
GET /api/documents
  ↓
treditor/app.py scans data/xml/text and data/xml/trees
  ↓
app.js renders source → collection → document hierarchy
  ↓
User expands BS (or enters BS.1 in passage search)
  ↓
GET /api/documents/trees/BS  or  GET /api/passages?q=BS.1
  ↓
CorpusDocument for data/xml/trees/BS.xml is loaded/cached
  ↓
User selects exact text BS.1
  ↓
GET /api/utterances/trees/BS/BS.1/tree
  ↓
server finds current Utterance/block and returns header, raw_text, roots, stats
  ↓
app.js selectPassage() restores any browser-local tree draft,
renders source/transcription segments, then draws the SVG syntax tree
```

Relevant code:

- HTML containers and controls: `treditor/templates/index.html`.
- document and passage APIs: `list_documents()`, `document_index()`, `search_passages()`, and `find_poem_location()` in `treditor/app.py`;
- tree API: `utterance_tree()` and `_elem_to_node()` in `treditor/app.py`;
- browser flow: document-loading functions and `selectPassage()` in `treditor/static/app.js`;
- storage/model: `CorpusDocument.from_file()` and `find_utterance()` in `src/coj/core/corpus.py`.

Opening from Documents clears temporary search-result tree context. Opening from a search result passes match context so normally hidden lemma/script/source-text details can be revealed and corresponding nodes marked.

## Corpus search in `treditor`

```text
User enters a query and submits it
  ↓
app.js selects text search or TGrep2 and builds URL parameters
  ↓
GET /api/search or GET /api/tgrep
  ↓
app.py builds/reuses an in-memory index of both XML source groups
  ↓
query is matched against selected fields or parsed as a structural query
  ↓
server builds paginated result payloads, highlight ranges, and tree context
  ↓
app.js renders the Search Results tab
  ↓
opening a hit loads the ordinary tree endpoint plus temporary match context
```

Text search currently covers transcription, source text (`kanji` in implementation terminology), word forms, and lemma IDs. It supports contains, whole-word, exact-field, case-sensitive, and space-insensitive modes. Search executes on explicit submission rather than on every keystroke.

TGrep2 is a project-specific subset implemented by `_parse_tgrep_query()` and the `_tgrep_*` functions in `treditor/app.py`. It is not an external TGrep2 engine. It supports the relations and selectors documented in `treditor/README.md`, including bracketed same-node attributes such as `[form=no & phon=PHON]`.

The Flask process caches loaded documents and indexes. The cache is not a database and is cleared on restart. Repository files changed outside the process may require restart or cache-refresh behavior before every view reflects them.

Display segmentation can switch between word-level (default), terminal and
hyphenated forms. Source rows remain separate wherever their correspondence
is needed. This changes presentation, not the query or source annotations;
the structural rules are in the [annotation guidelines](../reference/annotation-guidelines.md).

## Temporary analysis in Workbench

Open Workbench below Dictionary. Text Compare, Convert and Syntax Trees retain
separate browser-memory state; reload/close clears it. Syntax Trees accepts
one TXT/XML text or a corpus ID and offers retained/generated representations,
read-only parsing/comparison and dictionary lookup. None of these actions saves
corpus or dictionary changes. Detailed controls and limits are in the
[Workbench guide](workbench.md).

## Source-first drafts in Editing

Start the existing app with `python treditor/app.py`, then open **Editing**
below **Workbench**. Save writes complete multi-Text `.syn.json` Documents in
`data/authoring/`; it does not modify corpus TXT/XML or dictionary data.

1. **New Text** immediately creates a blank, unsaved Text. Start editing without
   choosing a Document or storage name. **New Document** creates an unnamed,
   unsaved container with one blank Text. Its small **+** in **Session drafts**
   adds another Text to that same container before saving. The three primary
   sidebar actions use the same button sizing as Workbench.
2. **Session drafts** lets you return to open Texts/Documents without losing
   Source edits, Text Input, previews or input scroll positions. Creating or
   opening something else does not discard drafts or require a naming decision.
   Drafts and scratch input live only in this page session, not browser recovery
   storage; refresh/closing the page loses unsaved work and warns before leaving.
3. **Text Input** is an independent, normally editable and scrollable scratch
   area, also available on existing Texts. Paste or type alternating lines:

   ```text
   美阿止都久留
   mi ato tukuru
   伊志乃比鼻伎波
   isi no pibiki pa
   ```

   Select **Preview**, review the numbered pairs, then **Add to Source**. Nothing
   is authored at Preview. Addition creates rows when Source is empty and appends
   when rows already exist. The scratch content stays intact; editing it
   invalidates its preview but never changes Source. Editing Source never
   rewrites Text Input. Save stores Source; it neither serializes scratch input
   nor requires scratch input to have been added/cleared.
4. **Source** remains the authoritative authoring input: compact numbered
   **Text** and **Transcription** pairs. Inputs grow to fit content. The small
   **+** controls insert before a pair or append; **×** removes a pair, with
   **Undo removal**. Display numbering changes while persistent identities and
   existing alignment evidence remain stable. Enter in transcription continues.
5. After Preview, **Source replacement → Replace entire Source** opens a separate
   confirmation showing the old rows, the current Text and replacement count.
   **Confirm replacement** replaces Source with fresh paired rows. It preserves
   the hierarchy and original evidence, marks affected links unresolved and
   offers **Undo replacement**. If Source changed during review, review again
   before replacing. Replacement is separate from normal **Add to Source**.
6. **Save** is manual. For a standalone new Text it opens a destination chooser:
   add it to an existing Document (including a session container) or save into
   a new named Document. An unnamed new Document asks for its final name at
   Save. **Confirm Save** writes the complete Document, including its other
   Texts and any unresolved drafts. A failed save/merge retains the original
   drafts; Text/container membership is committed only after disk save succeeds.
   Already saved Documents use their existing filename on subsequent Save.
   **Document → Save a copy** chooses a fresh destination. Display-name/Text-ID
   changes do not rename an existing file; no Git commit is made automatically.
7. **Open Text** uses a compact master/detail browser: works/Documents on the
   left, the selected Document's Texts in the workspace on the right. A work
   gets a second level only when it actually contains multiple storage Documents
   (for example MYS → MYS_01, MYS_02); BS/KK need no redundant group. Search
   Text IDs or Document names, choose a Document, then its Text. Returning to
   an already open Document uses its retained session draft. Corpus opening
   creates a draft copy without modifying the original TXT/XML.

**Analysis** now provides explicit Stage 3 assistance. Enter paired Source and
press **Analyse**; scratch Text Input is not analysed until added to Source.
For a new unanalysed Text, eligible dominant candidates are pre-filled and
unsupported/non-dominant units remain editable incomplete drafts. Inspect
**Candidates** for clickable tag/lemma cards, concise glosses, quiet attestation
counts and support percentages from the ranking evidence scope. Click a card
or focus it and press Enter/Space to select it. Recursive **Structure** is
expanded initially and uses the same compact tree presentation.
Nonzero attestation counts open the existing Search result view for the exact
current pattern and permitted evidence domain, with contextual text, matching
nodes and tree navigation. Counts and percentages refresh on the originating
cards; zero counts are plain text. Search is live, not a historical snapshot:
changed evidence restarts pagination at page 1, and changed source files require
refresh before opening old node addresses. Saved suggestion provenance is not
rewritten by browsing. Repeated matches within a Text count separately even
though Search groups them into one Text result card.
Detailed paths, addresses, hashes and domain labels stay
internally retained rather than occupying the editing UI.
Multi-unit choices appear as **Candidates: taka yuku**, for example, using the
same cards. Once a parent exists, its ordinary Candidates provides the choices.
Only proposals applicable through the existing initial-root operation appear;
imported regrouping is deferred to Stage 4 structural operations, without guessed
Source-unit mappings. No empty multi-unit section is shown. Existing
imported/authored hierarchy remains unchanged by Analyse until a candidate is
explicitly accepted. The compact tree uses parallel tag, owned Form, lemma and
Script information, with indentation and connector guides. High syntactic rows
show tags without concatenated descendant text. Edit a tag directly. Click a
lemma to open the existing dictionary popup; hover for gloss only, or
use its small pencil to edit the ID (Enter finishes). **Lemma**, **Script** and
**Gloss** view switches change display only. **Auto-collapse** defaults on:
opening one Candidates panel closes the previous one. Turn it off to compare
multiple panels; manual opening/closing works in either mode. Trace and NULL terminals show their
tags alone, without empty-material or unresolved-lemma controls. Literal `;@N`
notation is hidden while distinction metadata remains preserved. Corpus
candidates with missing dictionary entries are distinguished from dictionary-only
form/lemma suggestions; the latter have unresolved tags and zero matching
corpus-pattern attestations. Neither is automatically promoted to a default.

Owned terminal Forms are editable; multipart material is edited through its
individual **Part Form** fields and the aggregate is derived. Internal lexical
forms are derived, and higher structural nodes have no independently editable
Form. Form edits preserve Source and original alignment evidence. Affected
relationships become unresolved if the material no longer agrees; such drafts
remain saveable. Reverting material restores only its originally supported
alignment status, including any prior uncertainty. Spacing-only Form changes
retain supported alignment under the existing compacted-range convention.

**Suggestion settings** defaults to 95% support and three distinct Text records.
Changing settings takes effect on the next Analyse. Ordinary and unnamed Texts
exclude EN/SM evidence; explicitly identified EN/SM Text IDs may use both domains.
MK internal PP/IP templates are eligible, with structural alternatives preserved.
Ordinary phrase/higher syntax construction is not part of Stage 3.

For supported **downward refinement**, accept a recursive candidate on its
current node: the higher identity is retained and children get fresh identities.
Writing parts can become matching finer nodes only with independently attested
analysis. Unknown annotation transfers, unmatched alignments or crossing existing
writing boundaries are rejected with the current analysis preserved; no script
redistribution is guessed. General whole-refinement withdrawal is deferred.
**Undo analysis edit / Redo analysis edit** are session-only and preserve generated
identities. Source edits clear this analysis history to prevent undo from
unexpectedly reverting subsequently edited Source.

**Script** sits inline beside each applicable terminal or writing part. Type a
value directly or use registered-value suggestions; commit with Enter or by
leaving the field. This is an explicit single-unit edit, including replacement
or clearing.
Targets depend on nonempty represented material, not on whether the tag/lemma is
resolved: WORD, unresolved-tag drafts and material with malformed tags remain
eligible. Multipart aggregates, higher nodes, empty traces and missing-form
artifacts are not direct targets.

For efficient fills, click row space to toggle a node/subtree or writing part.
Successive clicks add selections; clicking a selected row removes it. No modifier
is required. Shift-click adds a range; focused rows also support Up/Down and Shift
navigation. Open the single **Script range** tool above the hierarchy, offering
**Selection / subtree**, **Unannotated in Text**, **Whole Text**, and Source-line
scopes. Type or choose a Script, inspect **Targets** if useful, then **Fill Script**.
Every existing nonempty value is preserved. **Replace existing** changes the
operation to **Replace Script**, explicitly authorizing replacements in its
scope. Source-line scopes exclude unresolved or cross-line coverage; exact
valid part links can still support unaffected writing parts. Script edits and
fills have session undo/redo. There are no permanent per-node checkboxes or
remote Batch script annotation section.

Changing imported source content never rewrites/deletes its hierarchy.
Whitespace-only transcription changes with unchanged original text retain
supported alignment. Uncertain content changes mark that Source row's links
unresolved and preserve original evidence. Removal/replacement retains orphaned
analysis; unresolved drafts can still be saved. Re-analysis requires an explicit Analyse action and reviewed candidate acceptance.
TXT/XML synchronization remains deferred; typing and Save trigger neither operation.

Storage names use letters, numbers, dots, underscores or hyphens; reserved
Windows device names are rejected. Text IDs remain scholarly metadata, not
paths. Stale revisions/existing destinations cannot be silently overwritten.
File import validates version-2 `.syn.json` and adds a session draft. Version-1
prototype files still require reviewed conversion and are rejected.

The version-2 schema, deterministic UTF-8 codec, atomic file store and 32 MB
limit are unchanged. Saves use a local server lock and disk fingerprints;
simultaneous independent server processes are not a supported collaboration
mode. Session navigation/scratch input are client-only state in
`editing-state.js`; `editing-analysis.js` supplies Stage 3 commands and transient
undo/redo; `editing.js` controls the UI. Save persists accepted annotations,
identities and provenance in the existing version-2 Document. Stage 4 tree
construction, reviewed TXT/XML export and corpus migration remain deferred.

## Importing primary authoring TXT

The primary TXT sources are committed files in the external `oncoj_source`
and `senmyo_norito_project` repositories. The manual importer previews changes,
then applies a reviewed plan to COJ TXT/XML and its provenance manifest.
Conflicts and deletions block replacement; there is no background pull or
source-repository write. Follow the [primary TXT import guide](primary-txt-import.md)
for commands, safeguards and recovery. Direct Dictionary Save does not update
those authoring sources.

## Dictionary workflows in `treditor`

### Main Dictionary view

1. The activity-bar book icon opens the Dictionary sidebar and editor tab.
2. `GET /api/dictionary/tags` discovers currently known fields.
3. A submitted query calls `GET /api/dictionary` with selected fields and matching options.
4. `get_dictionary()` loads/caches `data/xml/dict/dictionary.xml` as a `Dictionary`.
5. Results are scored, limited to 100, and returned with forms, kana, POS, gloss, and corpus frequency.
6. Selecting a result calls `GET /api/dictionary/<id>` for the full entry.

### Quick-reference popup

Clicking a displayed lemma ID opens that entry directly; clicking a word form runs the popup's restricted dictionary lookup. It uses the same backend dictionary, but presents a smaller reading-oriented interface.

### Dictionary editing

The current Dictionary sidebar can create a new entry or edit the selected entry. Submitting the field editor sends `POST /api/dictionary` or `PUT /api/dictionary/<id>`.

The server:

1. reloads the current XML dictionary from disk under a process-local write lock;
2. validates the ID and accepts only currently known tags;
3. normalizes required fields and kana behavior through `DictEntry.normalise()`;
4. writes a temporary XML file;
5. replaces `data/xml/dict/dictionary.xml` with that file;
6. updates the in-process dictionary cache.

This is an immediate canonical-file write. There is no dictionary draft, review, approval, undo, history, or automatic matching update to `dictionary.txt`. Git can record/revert a committed or working-tree change, but Git is external to the application workflow.

## Provisional syntax-tree editing in `treditor`

### What can be edited

The browser UI can change a node tag or lemma; change a simple leaf's form and writing-mode tag; edit multipart form/script rows; add a child or sibling; or delete a node.

### What the draft contains

`editableNodeCopy()` stores only a recursively nested JSON list containing:

- `tag`;
- optional `lemma`;
- `children`, or leaf `form` and `phon`;
- optional ordered multipart `parts` with `form` and `phon`.

It does **not** retain the complete block/document context, header, source ID, round-trip marker lines and positions, raw-text segments, XML `index`/`inferred_index`, writing-mode `phon_index`, multipart part indices, arbitrary attributes, or a source/base version.

### Persistence and restore

Every tree mutation calls `saveTreeDraft()`. The JSON is stored under:

```text
coj-tree-draft:<source>:<document_id>:<text_id>
```

When the same text is opened from ordinary browsing in the same browser profile, `restoreTreeDraft()` replaces the freshly loaded roots with the saved JSON. Closing the browser does not normally remove `localStorage`, so the draft survives browser restart/reload. It is not shared with another browser profile, browser, device, or user.

Opening a search result uses a temporary search context and intentionally does not restore the draft. This avoids mixing search highlighting/display state with ordinary draft display.

### Reset Draft

Reset removes that one `localStorage` key and reloads the repository-backed tree for the active text. There is no multi-step undo; Reset discards the complete saved tree draft for that key.

### Can it safely become authoring data?

No. The current draft is sufficient to redraw and continue editing the reduced browser tree, but not to reconstruct the complete semantic text or current human-facing authoring representation safely. In particular:

- loss of explicit and inferred node distinction labels can merge or relabel same-tag nodes;
- loss of marker lines and positions prevents exact source-text/segment/boundary reconstruction;
- loss of header/source-ID/block metadata prevents a complete text serialization;
- loss of a base version prevents detecting changes made after the draft was created;
- added/deleted/reparented JSON nodes are not represented as reviewable semantic operations.

The draft never reaches a backend save endpoint and does not modify corpus XML or TXT. **Project-author decision:** this editing mechanism is provisional/legacy and should eventually be removed or replaced, not extended now.

## One complete `scripteditor` run

```text
Repository XML selected in Processing scope
  ↓ POST /api/run
scripteditor/runs/<run-id>/ created
  ├── config.json
  └── data/
      ├── text/ selected whole XML files or filtered XML copies
      └── dict/ complete dictionary directory copy
  ↓ worker subprocess
GUI-specific processor receives only run-local TEXT_FOLDER, DICT_FILE,
OUTPUT_FOLDER and OVERWRITE_SOURCE=False
  ↓
output/ processor files and reports
  ↓
worker compares untouched input with processor output
  ↓
result.json: corpus-line and dictionary proposals
  ↓
browser review: choose/confirm lines; edit/confirm/delete dictionary proposals
  ↓ POST /api/runs/<id>/finalize
server reopens untouched run inputs and applies confirmed valid decisions only
  ↓
final/*.xml + final/dictionary.xml + final/review_manifest.json
```

### Scope copying

If a whole document is selected, `_prepare_selected_documents()` copies it with `shutil.copy2`. If individual texts are selected, it parses the source XML, removes unselected `<block>` elements, and writes a filtered XML document. All selected corpus files, whether originally under `data/xml/text` or `data/xml/trees`, are placed together in the run's `data/text/` directory by basename. The complete `data/xml/dict/` directory is copied for every run.

### Settings and processor provenance currently retained

- `config.json` stores chosen setting values.
- The run result returned to the browser identifies the run and selected scope.
- The selected processor ID is used to launch a fixed file, but neither the processor ID/path nor a code hash is written into the current final manifest.
- No user/reviewer identity, timestamp inside the manifest, Git commit/base hash, or application version is recorded.
- The random run directory name is not itself a reliable provenance schema.

### Proposal representation

`worker.line_records()` compares old and processed corpus lines by paired document/text/line positions and emits records containing file, text ID, one-based corpus-line position, form, path, category, candidates, old/new lemma, and full before/after line strings.

`worker.dict_records()` compares dictionary entries by ID and emits added/revised/deleted records with current fields plus textual before/after entries.

This design works for the processors' current line-level lemma operations. It is not a general structural change representation: line position is unstable after insertions/deletions, documents are paired with `zip`, and tree reparenting/movement is not described semantically.

### Review state

Review selections and edits live in browser JavaScript state during review. There is no endpoint that continuously saves an unfinished review and no run-local review-state file before finalization. Therefore an unfinished review is not reliably resumable after closing/reloading the page.

At finalization, `review_manifest.json` records counts, excluded-line issues, and a file list. It does not record every decision, reviewer, processor identity/hash, settings, source commit/hash, or time. The detailed proposals remain in `result.json`, but the manifest does not link a formal decision record to each proposal.

**Project-author decision:** review must ultimately be a persistent resumable workflow state and important changes must have provenance. Those requirements are not fully met today.

## Why `scripteditor` storage grows

For every run, current code retains:

- a complete dictionary input copy (about the size of `dictionary.xml`);
- selected full corpus documents or filtered selected-text documents;
- processor-produced corpus documents;
- often another complete processor-produced dictionary;
- processor reports and GUI metadata;
- `result.json`, which repeats before/after strings and proposal metadata;
- if finalized, another corpus output set, another complete dictionary, and a manifest.

The immutable input copy is necessary for current context display, before/after comparison, stale-line checking, and rebuilding final output from the pre-processor state. Processor output is necessary to derive proposals during the current synchronous run but is partly redundant after a complete `result.json` exists, subject to audit/provenance needs. Multiple full dictionary copies dominate small-scope runs.

There is no cleanup, retention period, archive, deduplication, or UI delete function. Runs remain indefinitely until a person deletes their directories.

## Other scripts that modify or generate corpus data

- `scripts/data_conversion/txt2xml.py` rewrites `data/xml/` outputs from `data/txt/`.
- `scripts/data_conversion/xml2txt.py` rewrites `data/txt/` outputs from `data/xml/`.
- package processors read XML and write according to script constants. Several default `OUTPUT_FOLDER` values equal source directories; exact output naming and `OVERWRITE_SOURCE` behavior must be checked before direct use.
- standalone processors operate on configured TXT paths and can overwrite sources if `OVERWRITE_SOURCE=True`; otherwise they produce separate outputs/reports.
- migration scripts can apply repository-wide XML changes when invoked with `--apply`; their reports preserve audit examples, not a general undo log.

The primary importer attempts to restore backups after ordinary detected apply
failures, but its multi-file update is not one filesystem transaction. See the
[import recovery limits](primary-txt-import.md#apply-failure-and-local-storage).
The other utilities do not provide a shared repository-wide rollback mechanism;
recovery relies on separate outputs, retained run inputs, reports or Git.

## Current approach comparison

| Concern | `treditor` manual editing | `scripteditor` automated editing |
|---|---|---|
| Primary role | Browsing/research with lightweight edits | Processor configuration and proposal review |
| Unit called a draft | Entire reduced tree JSON for one text | Run-local processor proposals plus browser review choices |
| Change storage | Browser `localStorage` | Files under `scripteditor/runs/<id>`; unfinished decisions only in browser memory |
| Canonical corpus writes | Tree edits: none | None; final output remains under the run |
| Dictionary writes | Immediate direct write to repository XML | Confirmed dictionary changes go only to run-local final XML |
| Review | None | Confirm/reject/select proposals, but incomplete review is not persisted |
| History/undo | Reset whole tree draft; no step history | Untouched input and generated output retained; no general undo UI |
| Provenance | None beyond storage key | Settings/input/output retained partially; manifest is incomplete |
| Shareable | No | Run files can be copied, but no supported collaborative workflow |
| Relation to authoring representation | No safe export path | Produces XML final output only; TXT regeneration is a separate conversion step |
| Structural edits | Browser permits them, but cannot save safely | Current proposal comparison is line/lemma-oriented, not general tree operations |

The applications already share `CorpusDocument`, `Utterance`, `CorpusLine`, `Dictionary`, `DictEntry`, `LemmaID`, XML files, text IDs, and lemma-oriented operations. They implement draft, persistence, review, and dictionary saving differently. This demonstrates conceptual overlap, but this document does not design a shared future layer.
