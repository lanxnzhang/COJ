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
The single search field filters sources and documents; an exact passage ID such
as `MYS.1.1` opens its syntax tree directly. Navigation uses one hierarchical
sidebar: source, collection, document, then passage. An expanded active document
stays pinned while its passage list is scrolled and releases at the end of that
document. Navigation and the Text panel can be collapsed to maximize tree
space, and Text can switch between stacked and two-column kanji/transcription
layouts.

PHON-family forms are italic, NLOG forms are underlined, and other forms remain
plain in both Text and the syntax tree. Tree controls can show script tags,
lemma IDs beneath either tags or word forms, and spaced kanji beneath each
sentence's transcription. The tree can be scaled, displayed full-screen, and
given much narrower or wider word spacing. Variable-width leaf slots keep long
words, collapsed forms, and kanji from overlapping without making every column
equally wide. Click a non-leaf tag to collapse its subtree into concatenated
word forms, or use **Expand all** to restore the whole tree. Clicking either a
lemma ID or a word form opens its current dictionary entry without adding any
visual annotation to the word.

Every displayed node has a pencil control that opens a separate editing drawer.
It can change node content and add or delete child and sibling nodes. These
edits are browser-local drafts: they persist across reloads in the same browser
but intentionally do not rewrite the canonical XML files. **Reset draft**
restores the repository version of the selected passage.
