# UX observations

This file records behavior noticed during actual use. It is not a feature roadmap, and an observation is not automatically a decision or active task.

1. 侧边栏看上去不是很被需要，而且词典和搜索的侧边栏很冗余，不知道要不要把侧边栏删了，或者做成暂时弹出，用户需要的时候再固定。
2. Document里文本打开的框显示的内容太多了，很冗余，至少header和token数量什么的不需要。之后可能考虑显示标题/作者/时代/体裁并做成可选框。
3. 不同的功能和页面框可以自由拖动。

4. 折叠之后汉字文本发生碰撞重叠。
There is a display issue in BS.2: after I collapse the first IP-REL, the two text rows containing 弥蘇知阿麻利 and 布多都乃加多知 overlap visually.
For now, do not modify any files.
Please investigate the cause and report:
a. why collapsing this IP-REL causes these two rows to overlap;
b. which part of the current layout/rendering logic is responsible;
c. whether this is specific to this tree or reflects a more general collapsed-tree layout problem;
d. what change you would recommend to fix it; and
e. whether that fix could negatively affect any existing behavior or visual layout, especially row alignment, tree positioning, source-text alignment, collapsed annotations, dynamic height calculation, or other trees that currently display correctly.
Please distinguish between the underlying cause and any secondary symptoms/workarounds.
I want to understand the cause, proposed fix, and regression risk before approving any modification. Do not implement the fix yet.

Codex认为这是因为一个 collapsed node 横跨多个 source rows，而且只吃掉了最后一行的一部分。
目前不是很好修复，之后再说吧。

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

**Observation:** An initialization error can leave Documents apparently loading forever without explaining the cause in the interface.

**Current behavior:** Early uncaught exceptions are visible mainly through the browser's Developer Tools Console.

**Possible idea already raised:** Make early startup failures visible to non-developer users.

**Status:** Current diagnostic limitation.

### UX-009 — Passage search and direct opening share one control

**Observation:** The Documents search box both finds passages and opens an exact passage.

**Current behavior:** One control combines document filtering and passage resolution. IDs with metadata suffixes, such as `MYS.14.3352;azuma_uta`, have aliases so a base ID or metadata fragment can still find the text.

**Status:** Current interaction.

### UX-010 — Search highlighting can imply an alignment that does not exist

**Observation:** The corpus does not map every source character to one transliterated word. A whole transcription segment can therefore be contextual information rather than an exact character-to-word match.

**Current behavior:** Source characters are highlighted exactly when displayed. Search-result tree mode can reveal normally hidden data and use temporary markers; opening the same text from Documents clears that state.

**Status:** Current data constraint with interface mitigations.

### UX-012 — Initial corpus searches can feel opaque

**Observation:** A first corpus-wide search can take time while the server builds an in-memory index.

**Current behavior:** Search runs only when explicitly submitted. Restarting the server discards the index cache.

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
