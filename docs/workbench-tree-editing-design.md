# Workbench structured tree editing: design analysis

This is a proposal, not an implemented editor. The current iteration only makes
**Parse Tree** prominent; the Workbench viewer/comparison remains read-only.
The original graphical tree renderer is outside this proposal.

## Is direct, text-like editing feasible?

Yes, but not safely by making the current rendered rows editable and exporting
their text. Branch connectors are presentation, not corpus data. They should
continue to be generated from parent–child relationships.

The existing shared model already represents ordered syntax elements inside
an XML `<block>`. Python `CorpusDocument` and `Utterance` wrap those elements;
the serializers reconstruct TXT paths and lexical annotations from them.
This supports changing forms, labels, annotations, sibling order, and hierarchy
in principle. It does not yet supply a browser editing model, structural-edit
validation, undo, or safe relocation of source markers.

The current `roots` payload is a **display projection**—a selected subset for
showing the tree—not a complete editable corpus text. It includes node fields,
other node attributes, and multipart forms, but omits block-level attributes,
header, raw-text, roundtrip-data, positioned comments, and complete element
content. Dictionary glosses are added for display and are not stored node data.
Exporting that payload alone would lose information.

## Proposed intermediate model

Use one complete in-memory text/block model per pane, not two independently
editable TXT and XML copies. An intermediate model is simply the data structure
between the visible editor and the file formats.

It would contain:

- the text's identifiers and block attributes, including the independently
  meaningful header;
- ordered syntax nodes, their XML tag and historical `raw_tag`, attributes,
  and children;
- multipart word components, including their ordered forms and annotations;
- source markers/comments and round-trip source information;
- processing/raw-text information, explicitly identified as derived;
- original input and representation origin for comparison and recovery;
- session-only stable node identities for selection and undo.

Session identities must not be TXT line numbers or `;@N` labels. A node can move
without losing its editing identity; `;@N` remains a corpus distinction label,
not an editor-generated ordinal. Copying creates fresh session identities but
does not automatically authorize changing scholarly labels.

The full XML block can be the practical starting structure because the Python
model is XML-backed. This does **not** make XML or the current TXT syntax a
permanent conceptual requirement. The editing operations should speak about
nodes, forms, annotations, and source markers rather than comma-path positions.

Unrecognized formal structures must be retained in the complete model and
flagged if their authoring-format mapping is unsupported. Retention in XML alone
is not evidence of a valid TXT round trip.

## Recommended interaction

Keep the vertically compact outline. Make node/category and lexical fields
directly editable, with the existing separate presentation of form, lemma,
writing mode, and other annotations. Generate all connectors automatically.

Recommended initial keyboard behavior, subject to approval:

- **Enter:** create a sibling row, as an incomplete editing draft rather than
  immediately exporting a malformed corpus node.
- **Tab:** move the selected node/subtree under the preceding sibling, if valid.
- **Shift+Tab:** move it after its current parent at the next outer level.
- **Cut/paste:** move an entire selected subtree as one operation.
- **Copy/paste:** duplicate a subtree with new session identities, validating
  any corpus-label conflicts before export.
- **Delete:** remove selected rows/subtrees, with undo immediately available.

Text selection within a field and node/subtree selection must be visibly
distinct. Ordinary copying of part of a word should not unexpectedly copy a
whole branch. A small context menu can expose the same operations, without
becoming the primary workflow.

This should be a structured row editor with text-like controls, rather than an
editable ASCII diagram. A fully free-form indented text language would need a
new grammar for field separation, escaping, multiline paste, and metadata;
it is not necessary to provide the desired interaction in an initial version.

## Mapping operations to TXT and XML

| Operation | Model/XML effect | TXT consequence |
| --- | --- | --- |
| Change form/lemma/writing mode | Update the relevant attribute or component | Regenerate the lexical fields |
| Change category | Update the node's category representation consistently | Regenerate its path and descendant paths |
| Insert/delete sibling | Change the ordered child list | Add/remove the corresponding paths |
| Indent/outdent/move | Reparent the existing subtree | Regenerate every affected descendant path |
| Copy subtree | Duplicate data, with fresh session identities | Validate distinction labels and boundaries |
| Edit multipart word | Change ordered components and aggregate form consistently | Regenerate component rows according to the existing convention |

The existing `CorpusLine.to_text()` and `_reconstruct_lines()` handle lemma and
writing-mode fields, `phon_index`, explicit distinction labels, and component
rows. XML can express ordered children directly, while TXT sometimes needs
markers or explicit labels to distinguish otherwise identical paths.

Therefore serialization must be followed by a **round-trip check**: serialize
the edited model to TXT, parse that TXT again, and compare the intended ordered
tree and annotations. A check that only compares displayed word strings is not
sufficient. If new sibling boundaries disappear on reparse, export must stop.

## Information that needs special protection

### Source markers and boundaries

`_utterance_to_elem()` stores marker/comment lines in roundtrip-data with
`position` measured in corpus rows. Some numbered source markers also introduce
real structural boundaries. `_merge_source_lines()` later reinserts them at the
recorded positions, clamping positions to the available row count.

Those numeric offsets are not safe anchors for arbitrary insert/delete/move
operations. A multipart word can produce several TXT rows, so a node index is
not interchangeable with a row offset either.

Before structural editing, source markers need an explicit relationship to
the content/boundary they describe. Merely retaining their old offsets can
preserve the characters while attaching them to the wrong material. Until that
relationship is decided, edits affecting those markers should be blocked or
require explicit resolution, not silently relocated.

### Same-category siblings and distinction labels

The parser uses path labels and marker-derived boundaries to distinguish nodes;
it also creates inferred indices. The TXT serializer suppresses indices marked
as inferred. Newly edited XML siblings cannot therefore be assumed to remain
separate when exported without suitable source distinctions.

Existing `;@N` values must not be renumbered. The policy for introducing a new
distinction label when no source marker provides the boundary requires author
approval, including behavior when copied siblings reuse a label.

### Textual layers and derived data

The header is a manually segmented transcription, not a disposable title.
Changing tree forms should not silently replace it. Source/original text carried
by markers is also independently meaningful.

Raw-text is derived processing data. It should be regenerated after relevant
source/tree changes, but the current Workbench parse route does not provide an
editing transaction that maintains these relationships. Re-parsing through TXT
can regenerate it only if the source-marker mapping has remained valid; that
route also inherits the converter's documented limitations.

### Existing conversion limits

The non-ASCII final forms following ILL, unresolved NULL semantics, unknown
formal XML extensions, unsupported annotations, and unusual source conventions
must not be silently normalized by an editor. See
[data issues](data-issues.md) and [round-trip specification](txt-xml-roundtrip.md).

Empty draft nodes are another risk: the current serializers are not a complete
grammar for editing placeholders. A visibly empty node must be distinguished
from an approved empty/null terminal before export.

Semantic and structural preservation are the target. Exact historical spacing,
attribute order, or byte-for-byte source identity is not guaranteed after edits.
The untouched original input should remain available as a recovery reference.

## Synchronization, invalid edits, and undo

Use a single operation path:

```text
Field/keyboard operation
  → validate operation against the complete block model
  → update that model atomically and record undo
  → refresh outline and generated source views
  → validate TXT/XML serialization before export
```

An operation is atomic when it either completes fully or leaves the old state
intact. Cycles, reparenting under oneself, unsupported metadata loss, and
unresolvable boundary changes should be rejected without destroying content.
Incomplete field typing can remain in a clearly marked draft buffer, but should
not appear as a successfully serialized corpus text.

Recommend generated source views be read-only initially. If direct source
editing is later enabled, it should be a separate transaction: parse the entire
changed source, validate it, then replace the complete model. While parsing is
invalid or unfinished, retain the last valid model and visibly indicate that
the edited source is not synchronized. Never silently present both as current.

Undo/redo should exist from the beginning. A subtree move, deletion, marker
update, and associated derived-data refresh must undo together. Consecutive
typing can be grouped for comfortable editing. Undo should cover metadata and
source associations as well as visible node fields. Dictionary lookup should
remain read-only; changing a tree lemma does not authorize editing its entry.

## Decisions needed before implementation

1. What source content/boundary does each marker belong to, and should that
   content travel with a moved subtree, remain in source order, or require
   manual reassociation?
2. May the editor introduce fresh explicit `;@N` labels to represent new
   otherwise-identical siblings? How should copied label conflicts be handled
   without renumbering existing labels?
3. Should a change to tree forms merely flag a header/content discrepancy for
   review, leaving the header untouched? This is the safest recommendation
   given the independently meaningful segmentation layers.
4. Should raw-source editing be deferred until structured edits and their
   round-trip validation are reliable? The recommendation is yes.
5. Should incomplete nodes stay as non-exportable editing placeholders until
   completed, and should subtree deletion require confirmation when it also
   affects source-text markers?

These are unresolved design decisions, not behaviors implemented in this task.
No new structured editor, persistence workflow, pane resizing, or multi-pane
system has been added.

## Implementation evidence

- `treditor/workbench.py`: current one-text parsing and alternate serialization.
- `treditor/app.py::_workbench_roots`: display-only node projection.
- `treditor/static/workbench.js::renderTree`: read-only compact outline.
- `src/coj/core/corpus.py`: XML-backed models, path reconstruction,
  marker-derived boundaries, multipart words, source-comment positions.
- `src/coj/xml/corpus_xml.py`: XML serialization wrappers.
- `tests/test_export.py`: source-ID, marker-position, and boundary tests.

This proposal relies on existing implementations and documented author
decisions; it does not assume that current serializer behavior establishes
the intended semantics of unresolved historical annotations.
