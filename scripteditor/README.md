# COJ Script Editor

A local Flask GUI for configuring GUI-specific copies of the COJ processors,
running them against copied XML data, and reviewing structured corpus-line and
dictionary changes. The original files in `scripts/processors/` are never loaded
or modified by the GUI.

```powershell
python scripteditor/app.py
```

Open `http://127.0.0.1:5001`. Every run is stored under `scripteditor/runs/`; canonical files under `data/xml/` are never passed to a processor as writable inputs. Delete old run folders when they are no longer needed.

The editor exposes `compound lemma`, `lemma`, and `mk lemma`, backed by the
`*_forgui.py` copies in `scripteditor/scripts/`. Adding arbitrary uploaded scripts later
requires an OS-level sandbox: Python code must otherwise be considered fully
trusted.

Open **Processing scope** to select an entire source group, collection, XML
document, or individual passage. Parent checkboxes show a partial state when
only some descendants are selected. A passage-level run receives a temporary
XML copy containing only those selected blocks. After a run, text-line results
can be filtered by result type, candidate count, and file. **Start at result**,
Previous/Next, and **Maximum displayed** provide range-based browsing without
rendering the entire result set.

Click a result word to open its passage in a separate right-side context drawer.
The drawer shows only the full transcription and kanji text, with the selected
transcription token highlighted, so the review controls remain unobstructed.

## Dictionary

Use the **Dictionary** button to open or hide the read-only dictionary drawer.
The default search covers lemma IDs and forms. Advanced search can independently
include glosses, meanings, parts of speech, notes, compounds, and related-entry
fields. Results display complete entries as labeled fields instead of raw XML.
Lemma IDs in processor results, candidate lists, and dictionary cross-references
open their entries directly in the reader.

## Manual review and final output

Processor results are proposals. Confirm individual lines or use the checkbox
above the list to confirm every result on the current page. Filters and global
actions stay fixed while the result list scrolls. Every result—including a
single-candidate result—shows its chosen-lemma selector. **Create final output**
rebuilds XML files from the untouched run inputs and applies only confirmed,
valid choices; generated processor output remains separate.

The global **Add new entry** action creates a reviewable dictionary draft with a
unique ID. Advanced settings can begin the unused-ID search at a chosen number
and generate `.KANA` values from `.FORM`; tag fields offer existing dictionary
tags while still accepting custom input. A manual entry is offered only to text
results whose form matches one of its `.FORM` values.

Dictionary proposals can be filtered by source and change type. Machine and
user proposals are labeled separately, and every proposal can be edited or
deleted. Numeric IDs are checked against both the source dictionary and
machine-generated proposals before saving. Deleting a selected added entry
marks that selection invalid; leaving a new entry unconfirmed excludes every
line that selects it and reports a warning.
Final reviewed files and a review manifest are stored under
`scripteditor/runs/<run-id>/final/`; canonical repository data is not modified.
