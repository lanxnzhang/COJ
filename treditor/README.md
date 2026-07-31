# COJ Tree Editor

`treditor` is an isolated copy of the original `editor` application, updated
for the repository's current XML data and styled with the blue COJ editor
theme. It reads canonical data from:

- `data/xml/text` — texts under editing
- `data/xml/trees` — uploaded syntax trees
- `data/xml/dict/dictionary.xml` — the current dictionary

The original `editor` folder is not imported or modified.

Run the application from the repository root:

```powershell
python treditor/app.py
```

Then open `http://127.0.0.1:5002`.

The interface groups documents by source and collection, displays current
canonical passage IDs, and shows processing-role kanji/transcription segments.
The Documents search filters sources and documents; an exact passage ID such as
`MYS.1.1` opens its syntax tree directly. The activity bar switches between the
hierarchical Documents sidebar and corpus-wide Search, and clicking an active
activity icon collapses the sidebar. Corpus search covers transcriptions,
kanji, headers, and word forms across both current data sources. Search results
and syntax trees open as separate, switchable, closable editor tabs.

An expanded active document stays pinned while its passage list is scrolled and
releases at the end of that document. The Text and Tree diagram sections can
each be collapsed; collapsing the tree gives the text section the available
workspace for full-text browsing. Text can switch between stacked and
two-column kanji/transcription layouts.

PHON-family forms are italic, NLOG forms are underlined, and other forms remain
plain in both Text and the syntax tree. Tree controls can show script tags,
lemma IDs beneath either tags or word forms, and spaced kanji beneath each
sentence's transcription. By default kanji and null nodes are shown, while
lemma IDs, script tags, and aligned leaves are off. The tree can be scaled,
displayed full-screen, and given much narrower or wider word spacing.
Variable-width leaf slots keep long words, collapsed forms, and kanji from
overlapping without making every column equally wide. Hover a non-leaf tag to
reveal its collapse control; collapsed nodes retain a visible `+`. Clicking
either a lemma ID or a word form opens its current dictionary entry.

Click **Edit** to reveal pencil controls beside the displayed nodes. A pencil
opens the editing drawer, which can change node content and add or delete child
and sibling nodes. These edits are browser-local drafts: they persist across
reloads in the same browser but intentionally do not rewrite the canonical XML
files. **Reset draft** restores the repository version of the selected passage.
