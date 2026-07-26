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
canonical passage IDs, shows processing-role kanji/transcription segments, and
renders syntax trees with optional lemma, script-tag, node-metadata, null-node,
and round-trip-comment layers. Clicking a lemma ID opens its current dictionary
entry.
