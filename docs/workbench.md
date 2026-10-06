# Workbench

Workbench is a temporary analysis workspace in **treditor**, available below
Dictionary in the activity bar. It does not save edits to corpus or dictionary
files. Its three modes keep separate contents while the page remains open.
Reloading or closing the page clears that workspace.

Each mode starts with two independently scrollable panes. **Hide pane** hides
its contents without discarding them; the corresponding **Restore** button
brings them back. Closing the Workbench tab also retains its contents until
the page is reloaded or closed.

## Text Compare

Enter or paste text into Text A and Text B, then select **Compare**.
The result below each input preserves its original spacing and line breaks.
Removed characters are red, additions green, and replacements yellow.

Each pane's **Compare as** selector offers original text, **Kanji only**, or
**Lexical fields (TXT)**. These are temporary comparison representations:
the pasted input remains unchanged. Kanji extraction keeps contiguous Han
ideograph sequences (including supplementary characters, ideographic zero,
and attached variation selectors), separating locations with spaces. Kana and
the repetition symbol `々` are not extracted as kanji characters.

Lexical extraction reads the final field of TXT comma-path rows with a writing
mode or lemma annotation; it excludes headers, IDs, marker lines, and bare
structural paths. It works on pasted fragments without a text ID. Multipart
component rows remain separate extracted fields; this is row extraction, not
a reconstruction of complete words from the tree. XML lexical extraction is
not provided by this initial option.

Normal comparison is read-only. Select **Resolve differences**, next to
**Compare**, to enable preferred-reading choices and show **Resolved result**
and **Copy Result**. **Exit resolution** returns to read-only comparison;
choices are retained until the comparison inputs/options change or Compare is
run again. Resolution mode stays active until explicitly exited.

In resolution mode, click a differing word on A or B to keep that reading. If
several character differences occur within that word, the click selects them
together. Highlight colors still identify the exact changed characters.
A selected reading has an outlined background; selecting its counterpart
switches the choice. An empty side offers highlighted **∅**, meaning keep the
omission; this marker is also highlighted in read-only comparison.
Unspaced kanji text offers a choice for each changed character sequence, not
one choice for the entire sentence.

For faster selection, click a reading, then **Shift-click** another difference
in the same pane to choose all differences between them. **Use all A** and
**Use all B** select every difference from that side. Individual choices can
still be changed afterward.

**Copy Result** is enabled once every difference has a choice. The resolved
result uses the temporary comparison texts, never modifies either input, and
retains A's ignored spacing and line breaks. If B is chosen for a changed span,
A's ignored whitespace within that span is retained at character boundaries
(or at the span's end if the chosen text is shorter). Whitespace that is being
compared normally is treated as selectable content instead.

Comparison uses visible Unicode characters (grapheme clusters), so a character
with a combining accent or a joined emoji is not split into smaller pieces.
Canonically equivalent Unicode spellings compare equally without altering
either original input.

**Compare spaces** and **Compare line breaks** are independent and off by
default. Spaces include tabs, full-width spaces, and other Unicode whitespace
apart from line breaks. Ignored whitespace remains visible but is not marked.

For interactive performance, comparison accepts at most 100,000 non-ignored
characters in total and at most 1,000 character additions/deletions. For larger
or very different inputs, compare smaller sections.

## Convert

Select **From** and **To**, provide the source, and select **Convert**.
The result is read-only, but **Copy result** copies the current output,
including any unresolved placeholders. The compact **⇄** control between the
selectors swaps the representations; if a result exists, it becomes the source.

Registered directions in this first version are:

- Japanese kana ↔ modern Hepburn;
- Japanese kana ↔ Frellesvig–Whitman notation;
- modern Hepburn ↔ Frellesvig–Whitman notation.

Kana input accepts hiragana, katakana, or both. When the target is kana,
**Kana script** chooses hiragana (the initial default) or katakana output.
For example, `たらちし`, `tarachishi`, and `taratisi` can be converted in all
six directions. These are spelling/transcription representations, not a
conversion of Old Japanese linguistic content into Modern Japanese.

Romanization-to-romanization routes compose the existing mappings through an
in-memory kana representation. Uncertainty in either stage remains marked;
the inspection shows the origins of the rules involved. This does not add
unsupported FW mappings for modern contracted sounds, gemination, or long
vowels. Forms outside the registered FW inventory remain unresolved rather
than being assigned a new linguistic convention.

Auto detection recognizes unambiguous kana-script input. Romanized input
requires an explicit system because spelling alone cannot reliably distinguish
FW notation from modern Hepburn. Explicit source/target choices remain the
recommended way to convert romanized input.

### Rule authority and uncertainty

The rule registry is [conversion_rules.json](../treditor/conversion_rules.json).
Rule origin and approval status appear under **Conversion rule origins** and
when inspecting a marked result.

- **Project-defined:** existing FW-to-kana mappings from `src/coj/core/kana.py`.
- **Project-approved:** the author's reverse ambiguity policy, preferring an
  unmarked reading where the historical kana does not distinguish the readings
  (for example, `キ → ki`, with `kwi` available as an alternative).
- **Provisional/reference:** the initial modern Hepburn rules, informed by the
  [ALA-LC Japanese Romanization Table (2011)](https://www.loc.gov/catdir/cpso/romanization/japanese-2011.pdf).
  These are not project-approved scholarly rules.

Yellow results have a configured default but remain ambiguous. Purple `□`
results have no approved default or no registered mapping. Select a marked
result to inspect the reason and choose an available alternative. Choices
apply only to that result in the current session; they do not change rules.

The modern converter supports basic syllables, common contracted sounds,
syllabic `n`, doubled consonants, and long vowels. A prolonged sound mark
produces a macron. Kana vowel sequences such as `こう` remain ambiguous
between a long vowel (`kō`) and separate vowel spelling (`kou`); a reverse
macron may similarly have several kana spellings. These use placeholders and
alternatives, rather than silently selecting one.

This is kana transliteration, not a Japanese word-reading engine: it does not
infer kanji readings, word boundaries, capitalization, or context-dependent
particle readings. Unsupported symbols and extended kana use unresolved
placeholders. Whitespace, numbers, and punctuation are preserved, except an
apostrophe used to disambiguate syllabic `n`. Romanized input is case-insensitive
and converted output uses lowercase romanization.

Project Hepburn mapping overrides have a separate registry section and are
applied after provisional mappings. Additional conversion families can be
registered in the backend; no conversion rules are embedded in the UI.

## Syntax Trees

Each pane accepts one TXT text or one XML `<block>` (also a `<document>`
containing exactly one block). Paste input or enter a corpus text
ID such as `MYS.1.1`. The prominent **Parse Tree** action displays a compact downward-growing
tree; **Compare** parses both panes and marks their differences.

**View** switches between source and tree. **Representation** offers the
retained input and its generated alternate representation. Corpus ID loading
offers **Source TXT** by default and **Stored XML** separately. A discrepancy
indicator compares the parsed XML structures while ignoring XML indentation
and attribute order; it is not a separate semantic-difference report. Metadata
differences can also trigger that indicator.

Generated representations use the existing shared TXT/XML conversion behavior
and inherit its limitations; see [TXT–XML round trip](txt-xml-roundtrip.md).
The original input is retained in memory and is not overwritten by parsing.
Stored XML is displayed as the serialized block read from the stored document,
not as an exact byte-for-byte excerpt of the full file.

Tree differences distinguish category, form, lemma, writing mode, multipart
forms, and other XML node attributes. Corresponding nodes are matched in sibling
order within each parent. Only changed fields are highlighted; added/removed
subtrees are marked throughout. A moved branch may appear as removal and
addition, rather than a separately classified move.

**Show glosses** displays dictionary glosses when available. Category tooltips
reuse existing tag descriptions; selecting a lemma opens the existing Dictionary
popup. The Workbench tree has no editing, collapsing, or draft controls and
does not use or alter the main graphical tree renderer.

The proposed future text-like structured editor is analyzed separately in
[the tree-editing design report](workbench-tree-editing-design.md). It is not
implemented in this version.

## Implementation and checks

- `treditor/workbench.py`: read-only loading and single-text parsing endpoints.
- `treditor/workbench_conversion.py`: conversion and uncertainty handling.
- `treditor/static/workbench-core.js`: text and tree comparison.
- `treditor/static/workbench.js` / `workbench.css`: session state and panes.

Tree and conversion inputs are limited to 250,000 characters per request.
File loading and Copy Input are not provided in the current interface.
Oversized or malformed inputs report an
error without changing stored corpus data.

Run focused checks from the repository root:

```powershell
python -m pytest treditor/tests -q
node treditor/tests/test_workbench.js
node treditor/tests/test_workbench_ui.js
node --check treditor/static/workbench.js
```
