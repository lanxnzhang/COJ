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

Enter, paste, or load text into Text A and Text B, then select **Compare**.
The result below each input preserves its original spacing and line breaks.
Removed characters are red, additions green, and replacements yellow.

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
including any unresolved placeholders. **Swap direction** is available when
the reverse conversion is registered; it uses the current result as its source.

Registered directions in this first version are:

- Frellesvig–Whitman notation ↔ historical katakana;
- modern Hepburn ↔ hiragana or katakana;
- hiragana ↔ katakana.

Auto detection recognizes unambiguous kana-script input. Romanized input
requires an explicit system because spelling alone cannot reliably distinguish
Old Japanese notation from modern Hepburn. Katakana-to-FW conversion also
requires explicit selection of historical katakana.

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
containing exactly one block). Paste input, load a file, or enter a corpus text
ID such as `MYS.1.1`. **Parse / show tree** displays a compact downward-growing
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

## Implementation and checks

- `treditor/workbench.py`: read-only loading and single-text parsing endpoints.
- `treditor/workbench_conversion.py`: conversion and uncertainty handling.
- `treditor/static/workbench-core.js`: text and tree comparison.
- `treditor/static/workbench.js` / `workbench.css`: session state and panes.

Tree and conversion inputs are limited to 250,000 characters per request.
File loading accepts files below 1 MB. Oversized or malformed inputs report an
error without changing stored corpus data.

Run focused checks from the repository root:

```powershell
python -m pytest treditor/tests -q
node treditor/tests/test_workbench.js
node --check treditor/static/workbench.js
```
