# Current project architecture

This document is a map of the repository and applications as they exist now.

For the conceptual corpus model, see [data-model.md](data-model.md). For step-by-step application behavior, see [current-workflows.md](current-workflows.md).

## Repository map

| Path | Current responsibility | Status |
|---|---|---|
| `src/coj/core/` | Shared Python corpus, dictionary, lemma-ID, kana, and tag models. | Active shared library |
| `src/coj/xml/` | XML serialization/deserialization facades and dictionary field mappings. | Active shared library |
| `src/coj/visual/` | Text-mode syntax-tree rendering. | Active utility |
| `data/xml/` | Current machine-facing corpus and dictionary representation used by the applications and package processors. | Active data |
| `data/txt/` | Current human/editor-oriented authoring representation. Conversion code maps it to and from XML. | Active but provisional format |
| `treditor/` | Main corpus browsing/research application, with provisional lightweight tree editing and direct dictionary editing. | Active main application |
| `scripteditor/` | Experimental GUI for running selected processors on copies, reviewing proposals, and creating separate final output. | Active experiment |
| `scripts/processors/` | Package-based XML processors. | Active utilities; direct execution requires care |
| `scripts/standalone_processors/` | Self-contained TXT-oriented processor variants. | Active/portable utilities |
| `scripts/data_conversion/` | TXT/XML converters and completed multipart-word and marker-boundary migrations. | Active conversion plus historical migrations |
| `tests/` | Shared model, conversion, and serialization tests. | Active tests |
| `treditor/tests/`, `scripteditor/tests/` | Application-specific backend and UI-contract tests. | Active tests |
| `reports/` | Generated historical migration evidence. | Historical/audit records |
| `compreditor/` | Abandoned comprehensive-editor experiment. | Abandoned |
| `editor/` | Legacy editor. | Legacy |
| `notebooks/` | Examples and exploratory use of the package/processors. | Supporting material |
| `README.md`, `TODO.md` | Repository introduction and accumulated development history/tasks. | Documentation/history; `TODO.md` is not a formal specification |

## Technologies

- Python 3.11 or newer.
- Flask for the two active local web servers.
- Vanilla JavaScript, HTML, and CSS for both active browser interfaces; there is no React/Vue-style component framework.
- Python's `xml.etree.ElementTree` for XML parsing and serialization.
- Browser `localStorage` for `treditor` tree drafts.
- The local filesystem for corpus data, dictionary data, and `scripteditor` runs.
- `pytest` for tests and Ruff for lint checks.
- There is no database, authentication service, remote API, or separate queue/worker service.

## Main entry points

| Entry point | Purpose |
|---|---|
| `python treditor/app.py` | Starts the main browser/research UI on port 5002. |
| `python scripteditor/app.py` | Starts the experimental processing/review UI on port 5001. |
| `python scripts/data_conversion/txt2xml.py` | Rebuilds XML from TXT using the shared model. |
| `python scripts/data_conversion/xml2txt.py` | Rebuilds TXT from XML using the shared model. |
| `python scripts/processors/<processor>.py` | Runs a package-based processor on XML according to constants in that script. |
| `python scripts/standalone_processors/<processor>.py` | Runs a self-contained TXT processor according to its settings. |

## `treditor`: current application structure

`treditor/templates/index.html` defines the complete page shell: activity bar, Documents/Search/Dictionary sidebars, editor tabs, text and syntax-tree panels, tree controls, dictionary views, popups, and editing drawers.

`treditor/static/app.js` is a single browser-side module controlling nearly all interaction and state. Important areas include:

- activity/sidebar switching: `showSidebarView()` and activity-button listeners;
- tabs: `showEditorPage()` and `closeEditorPage()`;
- documents and passages: document-loading/rendering functions plus `selectPassage()`;
- text and syntax-tree rendering: `renderRawText()`, `prepareTreeData()`, and `renderSvgTree()`;
- corpus search and TGrep2 result rendering;
- dictionary main view and quick-reference popup;
- provisional tree editing and browser-local draft persistence.

`treditor/app.py` is the Flask server. It loads XML files through `src/coj`, maintains process-memory caches, builds search indexes, executes text and structural searches, returns tree payloads, and reads or writes the XML dictionary.

### Important `treditor` endpoints

| Endpoint | Plain-English use |
|---|---|
| `GET /` | Serves the application page. |
| `GET /api/documents` | Lists XML documents and passage counts in `data/xml/text` and `data/xml/trees`. |
| `GET /api/documents/<source>/<doc_id>` | Lists the texts/passages inside one document. |
| `GET /api/passages?q=...` | Searches passage IDs and aliases; exact matches can be opened directly. |
| `GET /api/poems?q=...` | Looks up one passage ID using the passage-location index. The name is historical. |
| `GET /api/utterances/<source>/<doc_id>/<sentence_id>/tree` | Returns one text's header, derived raw-text segments, syntax tree, and statistics. Route/function names retain implementation terminology. |
| `GET /api/search` | Performs corpus-wide textual/annotation search with source, field, match, case, spacing, and pagination options. |
| `GET /api/tgrep` | Parses and executes the supported COJ TGrep2 subset over in-memory tree payloads. |
| `GET /api/dictionary` | Searches selected dictionary fields. |
| `GET /api/dictionary/tags` | Lists dictionary fields understood by the current data. |
| `GET /api/dictionary/<id>` | Returns a complete dictionary entry. |
| `POST /api/dictionary` | Creates and immediately persists a dictionary entry in `dictionary.xml`. |
| `PUT /api/dictionary/<id>` | Replaces and immediately persists an existing dictionary entry. |

### `treditor` state

- Browser-memory variables hold the open documents, tabs, active text, search settings/results, tree display settings, dictionary selection, and cached passage data.
- Flask process-memory globals cache loaded documents, dictionary data, search indexes, passage indexes, and lemma frequencies. Restarting the server clears these caches.
- Only provisional tree drafts use browser `localStorage`.
- Dictionary saves write directly and atomically to `data/xml/dict/dictionary.xml` using a temporary file followed by replacement.
- There is no database-backed session, user identity, shared draft store, revision history, approval state, or publishing state.

## `scripteditor`: current application structure

`scripteditor/templates/index.html` and the CSS/JavaScript files in `scripteditor/static/` implement scope selection, processor settings, result review, dictionary proposal editing, context viewing, and final-output creation.

`scripteditor/app.py` is the Flask server. It exposes only three fixed GUI-specific processor copies from `scripteditor/scripts/`, prepares run-local inputs, starts `scripteditor/worker.py` as a subprocess, serves proposals/context, validates review choices, and builds final output.

`scripteditor/worker.py` inspects settings with Python's abstract syntax tree, loads a selected trusted processor, forces it to use run-local paths, executes it, and compares before/after corpus lines and dictionaries to produce `result.json`.

### Important `scripteditor` endpoints

| Endpoint | Plain-English use |
|---|---|
| `GET /api/scripts` | Lists the fixed GUI processor copies. |
| `GET /api/scripts/<id>/settings` | Extracts editable literal settings from a processor. |
| `GET /api/documents` | Builds the selectable source/collection/document/text scope tree. |
| `POST /api/run` | Creates a run directory, copies selected inputs and the dictionary, invokes the worker, and returns proposals. |
| `GET /api/runs/<id>/context` | Loads the selected run-local text around a proposed line. |
| `GET /api/dictionary/search`, `GET /api/dictionary/<id>` | Reads the current repository dictionary for reference. |
| `POST /api/runs/<id>/dictionary/suggest-id` | Suggests an unused run-local dictionary ID. |
| `POST /api/runs/<id>/dictionary/generate-kana` | Generates kana suggestions from forms. |
| `GET /api/runs/<id>/dictionary/check-id/<id>` | Checks ID conflicts against the copied and processor-produced dictionaries. |
| `POST /api/runs/<id>/finalize` | Reopens untouched run inputs, applies confirmed valid decisions, and writes separate final XML plus a review manifest. |
| `GET /api/runs/<id>/files/<name>` | Serves processor-generated output. |
| `GET /api/runs/<id>/final/<name>` | Serves reviewed final output. |

## Current data/storage architecture

There is no database. The active applications read files under `data/xml/`:

```text
data/xml/text/*.xml          texts under editing
data/xml/trees/*.xml         uploaded syntax trees
data/xml/dict/dictionary.xml dictionary
```

Equivalent current authoring files live under `data/txt/`. The abstract semantic content is not identical to either serialization; see `data-model.md` and `txt-xml-roundtrip.md`.

`scripteditor/runs/<run-id>/` is local workflow storage and is ignored by Git. Each run can contain selected input XML, a complete dictionary copy, processor output, reports, `result.json`, and optional reviewed final output. No automatic retention or cleanup exists.

## Current system diagram

```text
                         shared Python model
                       src/coj/core + src/coj/xml
                          ↑                  ↑
                          │                  │
Browser ──HTTP──> treditor/app.py     conversion/processors
  │                    │                    │
  │                    ├── reads corpus XML ├── reads/writes TXT or XML
  │                    └── writes dictionary XML
  │
  └── localStorage (provisional tree drafts only)

Browser ──HTTP──> scripteditor/app.py ──subprocess──> worker + GUI processor
                         │                              │
                         └── scripteditor/runs/<id>/ ──┘
                              copied input / output / review final
```

## Application status

- **Project-author decision:** `treditor` is the current main browsing/research application; its editing mechanism is provisional/legacy and should not be extended now.
- **Project-author decision:** `scripteditor` is an experimental automated-editing and proposal-review tool with a limited pipeline.
- **Project-author decision:** `compreditor` is abandoned.
- **Project-author decision:** `editor` is legacy/historical.

## Most important files for orientation

1. `src/coj/core/corpus.py` — corpus-line, current `Utterance`, document, TXT parsing, tree construction, and XML round-trip logic.
2. `src/coj/core/dictionary.py` — dictionary entry and collection models plus TXT parsing/serialization.
3. `src/coj/xml/dictionary_xml.py` — explicit dictionary field mappings between the model and XML.
4. `src/coj/xml/corpus_xml.py` — public XML corpus facade.
5. `scripts/data_conversion/txt2xml.py` — repository-wide TXT-to-XML entry point.
6. `scripts/data_conversion/xml2txt.py` — repository-wide XML-to-TXT entry point.
7. `treditor/app.py` — main application's server, search engine, tree API, and dictionary writes.
8. `treditor/templates/index.html` — main application's UI structure.
9. `treditor/static/app.js` — main application's browser state, rendering, searching, and draft editing.
10. `scripteditor/app.py` — experimental run preparation, proposal review, and finalization server.
11. `scripteditor/worker.py` — processor execution and before/after proposal extraction.
12. `scripteditor/static/app.js` — experimental review UI state and decisions.
13. `scripts/data_conversion/README.md` — current documented XML block conventions.
14. `reports/multipart_words.md` — evidence for the multipart-word migration.
15. `reports/kanji_marker_boundaries.md` — evidence for marker-derived syntax boundaries.
16. `tests/test_corpus.py` — executable expectations for TXT/XML corpus behavior.
17. `tests/test_dictionary.py` and `tests/test_export.py` — executable dictionary and serialization expectations.
