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
Navigation and the Text panel can be collapsed to maximize tree space; Text can
switch between stacked and two-column layouts.

PHON-family forms are italic, NLOG forms are underlined, and other forms remain
plain in both Text and the syntax tree. Tree controls can show script tags,
lemma IDs beneath leaf tags, and kanji beneath each sentence's transcription.
Click a non-leaf tag to collapse its subtree into concatenated word forms, then
click it again to expand it. Clicking a lemma ID opens its current dictionary
entry.
