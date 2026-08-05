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
kanji, headers, word forms, and lemma IDs across both current data sources. Advanced
controls restrict the source and searched categories and support contains,
whole-word, exact-field, and case-sensitive matching. Result display controls
can add kanji text and prefix each transcription or kanji segment with its
raw-text sentence number. Larger result sets expose a
page-size selector and page navigation. Search results and syntax trees open
as separate, switchable, closable editor tabs.

The Search sidebar also has a TGrep2 mode for structural syntax-tree searches.
It supports exact or `/regular-expression/` node labels; immediate and
transitive dominance (`<`, `<<`, `>`, `>>`); precedence (`.`, `..`, `,`,
`,,`); sister relationships (`$`, `$.`, `$..`, `$,`, `$,,`); negated links;
and multiple ANDed relationships. COJ-specific `tag=`, `form=`, `lemma=`, and
`phon=` selectors expose the annotations stored on tree nodes. Multiple
attributes that must belong to the same node are enclosed in square brackets,
for example `[form=no & phon=PHON]`. Bracketed predicates can participate in
relationships, as in `NP << [form=no & phon=PHON]`; outside brackets, `&`
retains its original role of joining relationship clauses. The in-app help
includes runnable examples. Parenthesized subpatterns and named-node
backreferences are outside this editor's supported TGrep2 subset.

An expanded active document stays pinned while its passage list is scrolled and
releases at the end of that document. The Text and Syntax tree sections can
each be collapsed; collapsing the tree gives the text section the available
workspace and a dedicated scrollbar for full-text browsing while keeping the
Syntax tree heading visible. Text can switch between stacked and two-column
kanji/transcription layouts.

PHON-family forms are italic, NLOG forms are underlined, and other forms remain
plain in both Text and the syntax tree. Tree controls can show script tags,
lemma IDs beneath either tags or word forms, and spaced kanji beneath each
sentence's transcription. By default kanji and null nodes are shown, while
lemma IDs, script tags, and aligned leaves are off. The tree can be scaled,
displayed full-screen, and given much narrower or wider word spacing.
Variable-width leaf slots keep long words, collapsed forms, and kanji from
overlapping without making every column equally wide. Hover a non-leaf tag to
reveal its collapse control; collapsed nodes retain a visible `+`. Clicking
either a lemma ID or a word form opens a right-side dictionary quick-reference
drawer.

The activity bar's dictionary-book icon opens both a Dictionary sidebar and a
separate, closable Dictionary tab. The sidebar provides quick search plus
**New entry** and **Edit open entry** actions. The field editor discovers the
real XML tag vocabulary and saves additions and edits atomically to
`data/xml/dict/dictionary.xml`.

Full dictionary search can target any current tag—including Kana, Note,
Correspondence, POS, and other optional fields—and explains its contains,
whole-word, and exact-field modes on hover. Results emphasize word form, POS,
and gloss and also display kana and a live corpus frequency. Frequency is the
number of whole-corpus TGrep2 passage results for `lemma=ID`; selecting it runs
that exact TGrep2 search. The collapsible
right-side quick-reference popup intentionally searches only lemma IDs, kana,
and word forms; its relevance-ranked results emphasize POS and gloss without
the extra kana/frequency row.

Click **Edit** to reveal pencil controls beside the displayed nodes. A pencil
opens the editing drawer, which can change node content and add or delete child
and sibling nodes. These edits are browser-local drafts: they persist across
reloads in the same browser but intentionally do not rewrite the canonical XML
files. **Reset draft** restores the repository version of the selected passage.
