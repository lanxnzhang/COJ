# UX observations

This file records behavior noticed during actual use. It is not a feature roadmap, and an observation is not automatically a decision or active task.

## Small and local usability observations

### UX-001 — Inconsistent terminology

**Observation:** The same identified unit can appear as *text*, *passage*, *sentence*, *utterance*, or *poem*. “Header” looks like a title even though it is a manually segmented transcription, and “kanji” can include placeholders.

**Current behavior:** These terms occur in code, API routes, and interface labels. The project-facing terminology remains partly provisional; see [glossary.md](glossary.md).

**Status:** Current.

### UX-006 — An old server process can serve old code

**Observation:** Restarting a newly opened terminal does not stop an older Flask process that is already listening on port 5002. The browser can therefore continue to show old HTML or JavaScript after files have changed.

**Current behavior:** The page does not show its server process, build, or commit. The symptom can look like a newly introduced application bug.

**Status:** Current development/deployment characteristic.

### UX-007 — Search help still mentions headers

**Observation:** The Search sidebar says it searches “transcriptions, kanji, headers, word forms, and lemma IDs.”

**Current behavior:** The backend fields are transcription, kanji/source text, word forms, and lemma IDs. Headers were deliberately removed as a selectable scope.

**Status:** Current documentation/UI inconsistency.

### UX-008 — Startup JavaScript failures are difficult to diagnose

**Observation:** A previous missing-element `addEventListener` error stopped application initialization and left Documents apparently loading forever.

**Current behavior:** That specific bug was corrected, but diagnosis required the browser's Developer Tools Console because the page had no visible initialization error.

**Possible idea already raised:** Make early startup failures visible to non-developer users.

**Status:** Historical observation; specific bug resolved.

### UX-009 — Passage search and direct opening share one control

**Observation:** The Documents search box both finds passages and opens an exact passage. Earlier behavior briefly showed “No document match” before an exact asynchronous open completed.

**Current behavior:** The flicker was corrected. IDs with metadata suffixes, such as `MYS.14.3352;azuma_uta`, have aliases so a base ID or metadata fragment can still find the text.

**Status:** Improved; the mixed purpose remains part of the current interaction.

### UX-010 — Search highlighting can imply an alignment that does not exist

**Observation:** The corpus does not map every source character to one transliterated word. A whole transcription segment can therefore be contextual information rather than an exact character-to-word match.

**Current behavior:** Source characters are highlighted exactly when displayed. Search-result tree mode can reveal normally hidden data and use temporary markers; opening the same text from Documents clears that state.

**Status:** Current data constraint with interface mitigations.

### UX-012 — Initial corpus searches can feel opaque

**Observation:** A first corpus-wide search can take time while the server builds an in-memory index.

**Current behavior:** Search now runs only when explicitly submitted, avoiding the former expensive search on every keystroke. Restarting the server discards the index cache.

**Status:** Current characteristic.

## Larger workflow observations

These concern persistence and review rather than small interface adjustments. They are recorded here without proposing a redesign.

### UX-002 — Tree edits look more durable than they are

**Observation:** The tree editor allows substantial structural changes and its drafts survive a browser reload. A user could reasonably assume that the draft can later be saved safely to the corpus.

**Current behavior:** Drafts are reduced browser-local JSON. They have no repository save/export, review, source-version check, share function, or step-by-step history. **Reset Draft** discards the entire draft for that text.

**Status:** Current; the mechanism is provisional/legacy.

### UX-003 — Dictionary Save and tree editing use different persistence models

**Observation:** The two editing interfaces look related but have very different consequences.

**Current behavior:** Tree changes remain in browser-local storage and never alter corpus files. Dictionary Save immediately replaces repository `dictionary.xml`.

**Status:** Current.

### UX-004 — An unfinished `scripteditor` review is not resumable

**Observation:** A processing run persists, but an interrupted review does not reliably resume with its previous decisions.

**Current behavior:** Inputs, processor output, and proposals are files. Checkbox choices and edited review decisions remain browser state until finalization.

**Status:** Current; conflicts with the project-author requirement that review be resumable.

### UX-005 — Processing runs have no storage lifecycle

**Observation:** `scripteditor/runs/` can consume substantial local disk space.

**Current behavior:** Each run can retain several corpus and dictionary copies, reports, proposals, and final output. The interface has no size summary, archive, retention, cleanup, or delete control. Users delete run folders manually.

**Status:** Current.

### UX-011 — Provenance is not visible during editing or review

**Observation:** A user cannot easily tell which exact repository state, processor code, or person produced a draft or proposal.

**Current behavior:** `scripteditor` retains some settings and input/output files but not a complete base commit, processor identity/hash, reviewer, or saved review time. `treditor` drafts contain no base version.

**Status:** Current.

