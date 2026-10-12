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

1. In the Editing sidebar, **New Document** creates an empty container. Enter
   its **Document name** (under **Document**) and Save it if desired. No Text is
   created automatically.
2. **New Text** asks you to choose its existing Document: the current container,
   a saved Document, or a corpus Document opened as a draft copy. Choosing the
   parent creates an empty Text with no placeholder source row. Enter **Text ID**.
3. **Bulk entry** is initially expanded for an empty Text. Paste alternating
   original/transcription lines, for example:

   ```text
   美阿止都久留
   mi ato tukuru
   伊志乃比鼻伎波
   isi no pibiki pa
   ```

   Select **Preview**, verify the numbered pairs, then **Apply**. Preview changes
   no authored data. Apply appends the reviewed pairs, which remain individually
   editable. Editing the paste invalidates its preview. Optional original-line
   numbers must start at 1 and continue in order; blank separators are accepted.
4. **Source** shows compact numbered **Text** and **Transcription** pairs.
   Inputs grow to fit their content. The small **+** controls insert before a
   pair or append at the end; **×** removes a pair and offers **Undo removal**.
   Display numbers update, while existing source/node identities and alignment
   evidence remain unchanged. Enter in transcription continues to the next pair.
5. **Save** writes the complete Document in `data/authoring/`, including all its
   Texts and unresolved drafts. Text ID/display-name edits retain a saved file's
   path. **Document → Save a copy** chooses a fresh destination. No Git commit
   is made automatically.
6. **Open Text** browses/searches Texts in the sidebar. Related corpus Documents
   are grouped (for example MYS → MYS_01, MYS_02). Expand a Document to select
   its Texts, or search by Text ID/Document name. Saved Document contents are
   read for expansion/search; browsing does not replace the active draft.
   Selecting a Text in the current Document retains other Texts' edits; opening
   another Document warns before discarding unsaved changes. Corpus selections
   open draft copies without writing to TXT/XML.

**Preserved analysis (read only)** displays the retained hierarchy with generated
indentation/connector guides, plus its historical header. No connector characters
are authored and no hierarchy editing is enabled. Expanding sections retains the
workspace width; source fields resize when the available width changes.

Drafts are not saved automatically. Hiding/reopening the Editing tab retains
state while the page remains loaded. Refresh/page close warns about unsaved
changes, but leaving loses them; there is no browser recovery store. Opening a
different Document also warns before discarding unsaved changes. Saved/unsaved
status is visible above the fields.

Editing imported source content never rewrites or deletes its hierarchy.
Whitespace-only transcription changes with unchanged original text retain
supported alignment. Uncertain content changes mark the passage's relationships
unresolved and preserve their original evidence. Removing a passage retains
orphaned analysis. Warnings identify affected passages; draft Save remains
available. No automatic re-analysis or TXT/XML synchronization occurs. Reviewed
export/write-back and editable analysis are later stages.

Storage names use letters, numbers, dots, underscores or hyphens; reserved
Windows device names are rejected. Text IDs are scholarly metadata rather than
paths. Existing destinations and stale revisions cannot be silently overwritten.
A failed Save retains the draft. File import validates version-2 `.syn.json`
and opens an unsaved copy. Version-1 prototype files require reviewed conversion
and are rejected; conversion controls are not implemented in this milestone.

The backend checks ordered membership, hierarchy references/cycles, writing
parts, initial boundaries and evidence-linked alignment status. Incomplete
analysis and unresolved relationships are valid drafts. The deterministic UTF-8
codec and atomic store support complete Documents up to 32 MB. Saves use a local
server lock plus disk fingerprints; simultaneous independent server processes
are not a supported collaboration mode.

Implementation remains modular in `src/coj/authoring/`, `treditor/authoring.py`,
`editing-state.js` and `editing.js`. Existing browsing and Workbench remain
separate. Stage 3+ suggestions, morphology, full hierarchy editing and reviewed
TXT/XML export are deferred; the corpus has not been migrated.

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
