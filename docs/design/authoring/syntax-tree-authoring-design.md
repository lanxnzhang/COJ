# Syntax-tree authoring: current design review

Review of checkout `0679d7d`, 9 October 2026. **Proposal only.** No editor,
authoring grammar, migration, or renderer change is implemented by this review.
The [earlier Workbench analysis](../../archive/workbench-tree-editing-design.md) remains
historical context; this document is the current recommendation.

## Recommendation and current architecture

Use a **combination**: a small UTF-8 authoring language, provisionally `.syn`,
and a structured outline editor using the same complete, versioned model.
Pilot the language before adopting it as primary source. The browser editor
would provide convenient structural operations; VS Code would support sustained
authoring, ordinary file diffs, and offline work. Neither needs repeated full
paths or an editable graphical tree.

The proposed architecture is useful if “canonical model” means the common
semantic contract, not another independently editable master file:

```text
One declared authoring source per document (legacy TXT initially; .syn in a pilot)
                ↕ parse / validated authoring edits
Complete model: syntax + textual layers + links + preservation/provenance
                ↓ explicit adapters
        legacy TXT       computational XML       viewer projection
```

XML input must also have an adapter into the complete model. Output formats
have different expressive limits; arrows do not promise universal losslessness.
Generated TXT/XML should remain reproducible outputs once a document adopts
`.syn`. Moving authority requires an explicit migration, not detection by file
extension or whichever file was edited most recently.

Current evidence changes the emphasis of the earlier outline-first proposal:

| Current repository evidence | Design consequence |
|---|---|
| `src/coj/core/corpus.py`: `CorpusDocument`/`Utterance` wrap XML; `CorpusLine` still interprets positional TXT fields. `src/coj/xml/corpus_xml.py` is a facade. | The existing Python model is a compatibility bridge, not yet an independent canonical schema. |
| `scripts/data_conversion/import_primary_txt.py` and [primary import workflow](../../guides/primary-txt-import.md): committed external TXT is copied one-way; XML and provenance are generated. | Actual authoring authority is outside COJ today. A new source must not compete with that importer. |
| `treditor/workbench.py`, `_workbench_roots` in `app.py`, and `static/workbench.js`: retained source, generated alternate representation, read-only outline and comparison. | There is **no existing structured Workbench editor** to adopt. Reuse its shell, parsing access and dictionary lookup, not its reduced `roots` as saved data. |
| `editableNodeCopy`/`saveTreeDraft` in `static/app.js`: reduced localStorage drafts; `_nodeId` is a child-index path. | Legacy main-tree drafts lack complete metadata, durable identity and base revision; they are not a safe publishing foundation. |
| Current multipart/marker tests; `static/segmentation.js`; authoritative `multi-sentence` rule. | Preserve marker-induced structure, distinguish script parts from separate terminals, and keep computed display words separate from source segmentation. |
| Dictionary PUT/POST routes save XML immediately; Workbench derives glosses from dictionary entries. | Tree editing and dictionary mutation need separate, visible transactions. A displayed gloss is not automatically a stored annotation. |

These are findings from the current checkout, not a claim that every capability
was added after the old report. The earlier report already identified several
preservation risks. The revised recommendation adds durable identities across
sessions, independent alignment records, and a text-format pilot rather than
assuming the structured outline alone is sufficient.

## Independent layers and recommended model

Define a versioned schema independent of XML element names and TXT path syntax.
Keep an adapter around the current XML-backed implementation during transition.

| Layer | Model contents |
|---|---|
| Document/text identity | Collection/file context, ordered texts, exact scholarly ID including suffix, legacy source ID, block attributes, schema version. Internal identity is separate from these names. |
| Syntax | Ordered roots and nodes, category, children or terminal reference, lexical annotations on internal nodes as well as leaves; explicit distinction label and whether an imported index was inferred. |
| Terminal transcription | Ordered terminal occurrences with explicit Unicode forms; ordered writing-mode parts, `phon_index` and other supported annotations. Concatenating parts derives the aggregate form. |
| Word segmentation | Named segmentation views/groups over terminal occurrences. Existing structural word-level and hyphenated rules are computed views, not dictionary identity or automatic new scholarly token annotations. |
| Original/source text | Ordered segments with exact payload, marker spelling/number, stable segment identity, transcription coverage and separate structural-boundary record. The content may be a placeholder, not kanji. |
| Header | Exact independently authored transcription and its segmentation. Optional explicit correspondence to terminal spans; content conflicts remain reviewable. |
| Dictionary | Independent entries keyed by lemma ID; multiple forms per entry and multiple candidates per form. Corpus annotations retain the chosen lemma reference without deriving it from spelling. |
| Preservation/revision | Positioned comments and opaque legacy records, original TXT/XML snapshot, supported extension fields, source fingerprints/commit, actor/process/time and operation history. |

Derived `<raw-text>` and dictionary glosses belong to generated views. Preserve
their imported values as comparison evidence, then regenerate raw-text only
from validated source associations. Syntax-only changes should not silently
rewrite header segmentation or source text.

Unknown input needs a retained compatibility record and an unsupported-mapping
diagnostic. This is a preservation proposal, not an interpretation of unknown
annotations. Formal new fields still need explicit bidirectional adapters.
Keep incomplete draft terminals distinct from linguistically empty terminals;
`NULL,*` and special `ILL` forms retain their unresolved status.

## Mismatched segmentation and stable identities

Use persistent opaque IDs where references or revision history require stable
identity, including source segments and referenced terminal/part occurrences.
Tools create and maintain them; linguists should not type IDs routinely.
Unreferenced nodes need not all display inline IDs: additional history identities
can live in tool metadata, subject to explicit reconciliation after external
edits. Moves retain identity; copies get fresh IDs; undo restores deleted
records with their original IDs. A lemma ID, path, line number, `;@N` or marker
number is never an editing identity. Duplicate scholarly IDs must be reported
without collapsing the records.

Represent source-to-transcription correspondence as ordered references to
terminal/part spans, optionally with explicit character ranges. A segment can
cover several terminals, and a terminal or word can participate in several
segments. Do not model these as one syntax child per source row. Character
ranges use a defined Unicode coordinate system (recommend code-point offsets,
half-open ranges); UI grapheme selection and JavaScript UTF-16 offsets require
conversion. Spelling edits must update or invalidate affected ranges explicitly.

Real acceptance cases inspected in TXT and stored XML:

- **KK.30**, `data/txt/trees/KK.txt`: marker `3@阿袁加岐` precedes `awo kaki`;
  `4@夜麻碁母禮流` precedes `yama gomor eru`. The header and confirmed
  word-level output join these as `awokakiyamagomoreru`. Retain both source
  segments and the single displayed word; neither boundary replaces the other.
- **BS.1**, `data/txt/trees/BS.txt`: marker paths under `CP-FINAL` separate two
  `NP-ADV` constituents with otherwise repeated paths. Marker placement carries
  syntax information as well as source text. `TestKanjiMarkerSyntaxBoundaries`
  in `tests/test_export.py` checks this separation.
- **MYS.4.619**, `data/txt/trees/MYS_04.txt`: `VB-NML L030199a` has `LOG ipa`
  followed by `PHON ku`, forming one terminal `ipaku`. Script parts are not two
  words. Existing multipart tests check grouping and reverse serialization.
- **MYS.2.150**, `data/txt/trees/MYS_02.txt`: internal lexical annotations and
  repeated `NP-APP` structures include explicit `;@2`; the confirmed portion
  displays `sakariwite asa nageku kimi`. Keep phrase boundaries and existing
  labels without renumbering them.

KK.30 supports cross-segment **word** coverage, not an inferred character-level
alignment between kanji and transcription. Coverage imported from TXT records
the association currently expressed by marker order. Finer correspondences
need explicit evidence and an unresolved state when absent.

Store a marker's structural event separately, for example “start child X under
parent P,” as well as its transcription coverage and exact legacy line. Generic
comments can attach before/after an occurrence or boundary; retain original
position as provenance. Reparenting syntax alone keeps transcription/source
order unchanged. A command that also reorders terminals must show affected
coverage and request reassociation where ambiguous. Do not clamp old offsets
and call the result preserved.

The first editor should accept only moves whose tree yield remains compatible
with transcription order. A move requiring discontinuous syntax or a different
yield must be rejected or explicitly resolved; the legacy adapters do not supply
a general representation for such structures.

## Is a `.syn` format worthwhile?

Yes, as a **small experimental authoring format**, not an immediate replacement
for all legacy data. A structured editor alone offers a simpler initial UI but
still needs this full model and preservation machinery. A text language alone
offers familiar file editing but leaves complex moves and alignment repair
awkward. Combining them shares the difficult work and lets linguists choose.

Use indentation for ordered hierarchy and positional fields when context makes
their meaning reliable. The preferred ordinary terminal is
`N titi L050641 PHON`, without quotes, colons or repeated field names. Reserve
quoted strings and named fields for ambiguous or exceptional values. Source
coverage and headers remain separate from syntax. Dictionary references must
never default from form lookup; writing modes remain explicit in the first pilot.
Keep the grammar small, with defined escaping, indentation and version rules.

The [compact prototype comparison](syn-prototype-comparison.md) develops two
alternatives and eight static `.syn` examples: a complete ordinary text plus
KK.30, MYS.4.619 and MYS.2.150 fragments in each format. Its recommended inline
format supersedes this review's original punctuation-heavy sketches. `parts`
still declares one terminal's components; source membership still allows words
to cross source segments. Tool-generated IDs remain visible only where required
by references; full preservation records should be maintained by tools.

VS Code can later supply tag/lemma completion, candidate gloss/POS previews,
diagnostics, outline/folding and preview via the shared parser. Current stored
dictionary evidence: `nwo` matches both `L000520` (case particle; forms
`no/nwo/na`) and `L051650` (noun; `nwo/no/nu`). Lookup helps choose a reference;
it cannot uniquely assign one. Neither a VS Code extension nor a language server
exists for `.syn` in this proposal.

## TXT/XML export and semantic round-trip risks

The current converters are useful adapters, not a sufficient validation oracle.
`CorpusLine` recognizes ordinary forms with an ASCII-letter regex; dictionary
parsing can overwrite duplicate IDs or skip continuation lines. A stable round
trip can reproduce a misinterpretation. See [conversion limits](../../reference/txt-xml-roundtrip.md)
and [data issues](../../registers/data-issues.md).

For each export, compare the complete intended model with the reparsed result:
ordered structure, supported annotations, multipart parts, exact ID aliases,
header, source payload/coverage, structural events and retained records. Compare
derived views separately. Require deterministic formatting, but do not equate
byte identity with semantic preservation.

- Legacy TXT can merge identical paths or multipart-looking siblings; marker
  events and explicit labels must recreate the intended distinctions. Preserve
  current labels; proposing fresh labels for new sibling conflicts needs a
  policy decision. Block an export that cannot represent the structure safely.
- Current XML has no standard persistent editing IDs or independent alignment
  records. Existing processors may discard unfamiliar fields. Such information
  needs a versioned XML mapping or a required accompanying preservation file;
  an ordinary standalone XML export must disclose those limits.
- A legacy marker falls between TXT corpus rows. A new association cutting
  inside a writing-mode part may not be representable without changing that
  part or the old grammar. Block legacy export until resolved; do not split
  scholarly annotations merely to accommodate the serializer.
- Preserve `raw_tag`, explicit/inferred indices, `phon_index`, source IDs and
  opaque suffixes. Do not silently rename imported `multi-clause`; diagnose it
  against the authoritative `multi-sentence` authoring rule.
- `NULL,*`, unusual marker-like lines, special `ILL` forms and unsupported
  dictionary/XML fields need retained evidence and targeted diagnostics, not
  guessed semantic repairs.

Separate a **complete authoring export** from a **legacy computational export**.
If a target lacks required information, retain it in the authoring source and
an explicit export manifest, or reject the export. Never describe the reduced
target alone as a complete reversible copy.

## Editing, synchronization, validation and undo

Use one transaction service for browser operations and text-format edits.
Structured operations address IDs: change field, insert/remove, reparent,
reorder terminals, split/join parts, and edit coverage. Each operation validates,
updates the complete model, records its inverse and refreshes derived views
together. Syntax reparenting and transcription reordering are different actions.

During text typing, retain both the draft source and last valid model. An invalid
draft stays saveable as a draft; mark its preview stale and block final export.
After a valid parse, reconcile IDs and apply one transaction. Ambiguous identity
matching after an external edit must be reviewed, not guessed from equal forms.
Keep referenced identities explicit in persisted source. The pilot should test
dimmed IDs and fingerprinted metadata for other history identities, without
assuming that equal forms or line positions establish identity.

Validation has three levels: grammar/reference integrity; supported schema and
export representability; linguistic questions/warnings. Check cycles, ownership,
order, duplicate identities, dangling lemma/source links, part aggregates,
header/content conflicts and preservation completeness. Unknown semantics must
not become a hard linguistic verdict. Unresolved export-affecting issues block
that target while remaining editable and preserved.

Persist resumable drafts with full model/source, schema version, base revision
and operation history. Undo/redo covers metadata, coverage and derived updates
alongside structure; group continuous typing into one useful undo step. Review
decisions must survive closing the application. Record actor/process and time
when changes are saved, without assuming a final publication architecture.

For concurrent editing, recheck base fingerprints before saving; offer a
three-way comparison of base, local and current state. Do not overwrite source
changes. Changing a tree lemma can be undone locally; creating/editing a
dictionary entry is a separate revision, with dependency checks for any tree
using a new entry. Reuse lookup/popup behavior without silently invoking today's
immediate Dictionary Save workflow.

Keep the current external TXT importer as-is during a pilot. Experimental `.syn`
documents live outside its managed outputs. Later adoption requires explicit
authority declarations and importer/processor compatibility; generated XML
edits would become reviewed proposals against that authoring source, not an
automatic second source of truth.

## Staged implementation recommendation

1. **Model and evidence first:** specify identities, coverage, marker events and
   preservation contracts; build read-only adapters and a semantic comparator.
   Use KK.30, BS.1/BS.2, MYS.2.150/MYS.4.619 and EN/SM unresolved records as
   fixtures. Include duplicate IDs, comments, internal lemmas and unusual labels.
2. **Small format pilot:** implement only parsing/serialization, diagnostics and
   a read-only preview on copies. Test linguist authoring effort against legacy
   TXT and a structured outline. Settle escaping, IDs and metadata visibility
   before choosing `.syn` as a primary format. Add synthetic character-range
   cases without claiming they establish corpus semantics.
3. **Structured authoring:** add the complete-model outline, dictionary lookup,
   atomic commands, persisted drafts and undo. Gate TXT/XML exports on semantic
   comparison. Keep the main graphical renderer outside this stage.
4. **Workflow adoption:** only after successful pilots, decide source authority,
   reviewed saves, dictionary revisions, concurrent edits and migrations.
   Add VS Code completion/folding/diagnostics using the same parser; migrate
   document-by-document with recoverable originals, never wholesale conversion.

Before implementation, decisions remain on marker behavior when transcription
is reordered, new distinction-label allocation, persistence of alignment/IDs
in computational exports, and which authoring repository would own `.syn`.
Existing questions about NULL/ILL, marker numbering, script-tag indices and ID
suffixes remain unresolved; this design does not settle them.

## Review validation

Inspected the current parser/model, conversion entry points, dictionary maps
and lookup/save code, Workbench backend/UI, draft and segmentation code, source
import behavior, tests and the corpus fragments above. Read-only Python probes
checked stored source segments and dictionary candidates. Existing conversion
and Workbench checks were run with:

```text
python -m pytest tests/test_export.py treditor/tests/test_workbench.py -q
```

Result: **108 passed**, with one pytest cache-write permission warning. These
checks validate existing behavior, not the proposed model, grammar or future
editor. No corpus, dictionary, application, renderer or TODO edits were made.
