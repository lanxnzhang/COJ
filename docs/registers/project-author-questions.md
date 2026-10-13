# Project-author questions

Latest project-author clarifications govern the statuses below. Completed investigation is evidence, not resolution of an unanswered substantive question. Open and Provisional entries retain their stated review conditions; they do not automatically require implementation now. Deferred entries are future review reminders with explicit triggers, not current work. Resolved/Answered policies can still have documented implementation gaps without reopening the author decision.

Current findings refer to the 13 October 2026 corpus/code investigation at 3b8d060, unless a newer author clarification is stated. [The read-only inventory](data-investigation-2026-10-13.json) preserves detailed source evidence. Stage 1-3 SYN corpus authoring is implemented; general legacy export and SYN dictionary serialization are not. No source correction is authorized by this reorganization. Chief-editor confirmation is not inferred from implementation.

| Status | Questions |
|---|---|
| Open | PAQ-005, PAQ-008, PAQ-017, PAQ-018 |
| Provisional | PAQ-007 |
| Deferred | PAQ-001, PAQ-002, PAQ-009, PAQ-011, PAQ-020 |
| Resolved / Answered | PAQ-003, PAQ-004, PAQ-006, PAQ-010, PAQ-012, PAQ-013, PAQ-014, PAQ-015, PAQ-016, PAQ-019, PAQ-021 |

## Open

### PAQ-005 — `SM_29` bare star line

- **Status:** Open
- **Question:** what was intended by the bare-star line in SM.29.2 (source 2_SM_29)?
- **Evidence:** data/txt/text/SM_29.txt:110 remains `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*`. The corpus scan is complete: this is the only bare-star anomaly after excluding numbered markers and the 347 separately registered NULL,* lines. [DI-006](data-issues.md#di-006--two-anomalous-marker-like-lines) retains the original line and adjacent context.
- **Current implementation:** retained as a positioned raw comment; no recognized source segment or structural boundary is inferred from it.
- **Unresolved point:** intended content is unknown. Investigation completion does not settle it; do not infer/reconstruct/propose a correction or change source data.

**Latest project-author clarification:** Keep PAQ-005 Open.
The corpus investigation is complete, but the substantive question remains unresolved because the intended content of the bare-star line is still unknown. Do not infer or propose a correction, and do not modify the source data.
The completed investigation should remain recorded as evidence, but PAQ-005 should stay open until the intended content can be established from reliable evidence or further editorial review.

### PAQ-008 — Distinction suffixes on writing-mode tags

- **Status:** Open
- **Question:** what does the suffix in writing-mode values such as LOG;@2 mean? Do not assume syntax-node distinction semantics.
- **Completed investigation:** all 14 LOG;@2 source lines and context are in [DI-010](data-issues.md#di-010--writing-mode-distinction-suffix-log2) and the inventory.
- **Current implementation:** XML stores phon=LOG / phon_index=2 and reconstructs the suffix; SYN retains annotation metadata. This is representation evidence, not a semantic decision.
- **Next decision:** chief-editor confirmation to be sought by the author. No further implementation/modeling now; preserve source unchanged.

**Latest project-author clarification:** Keep PAQ-008 Open. No further implementation or modeling is needed now. I will confirm with the chief editor later.

### PAQ-017 — Complete canonical dictionary field order

- **Status:** Open
- **Question:** what complete canonical dictionary field order should be adopted when it is needed, given the observed ordering conflicts and gaps?
- **Review trigger:** bring this back when a complete canonical dictionary field order is actually needed. Do not define a complete order now or infer one to resolve a cycle or fill non-co-occurring-field gaps.
- **Established policies:** repeated-value order and positional relationships (such as FORM/KANA pairing) are meaningful; do not independently sort, deduplicate, regroup or reorder them. Exact TXT roundtripping preserves original field order and repeated-value correspondence.
- **Unspecified formal fields:** the accepted deterministic fallback puts unspecified field types after established fields, alphabetically by field name, without reordering repeated values. Whenever that fallback is triggered by an unrecognized/new formal field, record it in the PAQ ledger and ask the author about its permanent position. This does not supply missing positions for the currently observed established fields.
- **Completed investigation:** retain the supported source patterns, conflicts and unestablished relationships below. A future complete order should be informed by typical established dictionary usage, not invented now.
- **Current implementation:** 21 observed field types; XML uses its own hard-coded category order, while normalise() fixes only its required prefix. No complete canonical order was implemented by the investigation.

#### Observed field-order evidence - not a complete canonical specification

First-occurrence field-type patterns (repeated values remain in source order): `.GLOSS .MEANING .FORM .KANA .POS .COMPOUND` occurs in 1,722 entries; the five-field prefix alone in 1,691. `.CORRESP` precedes `.FORM` in all 1,059 co-occurrences, so the older question's assumed five-field prefix cannot alone define the complete source-derived order.

Observed fields and physical-line counts:

| Field | Lines |
|---|---:|
| `.ACCENTCLASS` | 9 |
| `.AFFIX` | 17 |
| `.COMPOUND` | 5572 |
| `.CORRESP` | 1059 |
| `.DERIVATION` | 916 |
| `.FORM` | 6936 |
| `.GEO` | 23 |
| `.GLOSS` | 6497 |
| `.INTRVCLASS` | 363 |
| `.ITYPE` | 1670 |
| `.KANA` | 6936 |
| `.MEANING` | 7198 |
| `.MKTARGET` | 120 |
| `.NOTE` | 571 |
| `.POS` | 6498 |
| `.PTR` | 14 |
| `.RELATED` | 919 |
| `.TRANSITIVITY` | 435 |
| `.TRANSREL` | 415 |
| `.USE` | 3 |
| `.VCLASS` | 452 |

Pairs appearing in both orders (counts show first-listed → second-listed / reverse; these are evidence, not adopted positions):

- `.AFFIX` / `.NOTE`: 2 / 3.
- `.COMPOUND` / `.DERIVATION`: 77 / 9.
- `.COMPOUND` / `.NOTE`: 162 / 52.
- `.COMPOUND` / `.POS`: 1 / 2604.
- `.COMPOUND` / `.RELATED`: 205 / 7.
- `.CORRESP` / `.NOTE`: 85 / 6.
- `.DERIVATION` / `.ITYPE`: 1 / 555.
- `.DERIVATION` / `.NOTE`: 9 / 61.
- `.DERIVATION` / `.RELATED`: 39 / 6.
- `.DERIVATION` / `.TRANSITIVITY`: 1 / 195.
- `.DERIVATION` / `.TRANSREL`: 210 / 5.
- `.FORM` / `.GEO`: 6 / 15.
- `.FORM` / `.NOTE`: 472 / 75.
- `.GEO` / `.ITYPE`: 4 / 1.
- `.GEO` / `.KANA`: 15 / 6.
- `.GEO` / `.NOTE`: 3 / 2.
- `.GEO` / `.POS`: 20 / 1.
- `.INTRVCLASS` / `.NOTE`: 18 / 21.
- `.ITYPE` / `.NOTE`: 67 / 91.
- `.ITYPE` / `.POS`: 7 / 1660.
- `.KANA` / `.NOTE`: 472 / 75.
- `.MKTARGET` / `.NOTE`: 5 / 3.
- `.MKTARGET` / `.RELATED`: 6 / 21.
- `.NOTE` / `.POS`: 210 / 336.
- `.NOTE` / `.RELATED`: 49 / 43.
- `.NOTE` / `.TRANSITIVITY`: 22 / 19.
- `.NOTE` / `.TRANSREL`: 16 / 8.
- `.NOTE` / `.VCLASS`: 23 / 20.
- `.POS` / `.RELATED`: 711 / 1.
- `.RELATED` / `.TRANSREL`: 2 / 13.
- `.TRANSITIVITY` / `.VCLASS`: 36 / 96.

Pairs never co-occurring (relative position cannot be established):

- `.ACCENTCLASS` / `.AFFIX`.
- `.ACCENTCLASS` / `.COMPOUND`.
- `.ACCENTCLASS` / `.DERIVATION`.
- `.ACCENTCLASS` / `.GEO`.
- `.ACCENTCLASS` / `.INTRVCLASS`.
- `.ACCENTCLASS` / `.ITYPE`.
- `.ACCENTCLASS` / `.MKTARGET`.
- `.ACCENTCLASS` / `.PTR`.
- `.ACCENTCLASS` / `.TRANSITIVITY`.
- `.ACCENTCLASS` / `.TRANSREL`.
- `.ACCENTCLASS` / `.USE`.
- `.ACCENTCLASS` / `.VCLASS`.
- `.AFFIX` / `.INTRVCLASS`.
- `.AFFIX` / `.MKTARGET`.
- `.AFFIX` / `.PTR`.
- `.AFFIX` / `.RELATED`.
- `.AFFIX` / `.TRANSITIVITY`.
- `.AFFIX` / `.TRANSREL`.
- `.AFFIX` / `.USE`.
- `.AFFIX` / `.VCLASS`.
- `.CORRESP` / `.MKTARGET`.
- `.CORRESP` / `.PTR`.
- `.DERIVATION` / `.MKTARGET`.
- `.DERIVATION` / `.PTR`.
- `.GEO` / `.MKTARGET`.
- `.GEO` / `.PTR`.
- `.GEO` / `.RELATED`.
- `.GEO` / `.TRANSREL`.
- `.GEO` / `.USE`.
- `.INTRVCLASS` / `.MKTARGET`.
- `.INTRVCLASS` / `.PTR`.
- `.INTRVCLASS` / `.USE`.
- `.ITYPE` / `.MKTARGET`.
- `.ITYPE` / `.PTR`.
- `.MKTARGET` / `.PTR`.
- `.MKTARGET` / `.TRANSITIVITY`.
- `.MKTARGET` / `.TRANSREL`.
- `.MKTARGET` / `.USE`.
- `.MKTARGET` / `.VCLASS`.
- `.NOTE` / `.PTR`.
- `.NOTE` / `.USE`.
- `.PTR` / `.RELATED`.
- `.PTR` / `.TRANSITIVITY`.
- `.PTR` / `.TRANSREL`.
- `.PTR` / `.USE`.
- `.PTR` / `.VCLASS`.
- `.RELATED` / `.USE`.
- `.TRANSITIVITY` / `.USE`.
- `.TRANSREL` / `.USE`.
- `.USE` / `.VCLASS`.

The cycle is NOTE → ITYPE (91/67), ITYPE → COMPOUND (450/0), COMPOUND → NOTE (162/52). No topological or alphabetical tie-break is being substituted for an author decision about these established fields. Full observed patterns and every pair count are in [the inventory](data-investigation-2026-10-13.json), dictionary.order_patterns / dictionary.pair_precedence. `.MKTARGETNEW` is recognized by code but absent in current source; its fixed position is not established by this corpus scan. Alphabetical fallback for unspecified field types is the author policy, not permission to reorder repeated values or pretend a complete fixed order exists.

**Latest project-author clarification:** Keep PAQ-017 **Open**. Do not define a complete canonical field order yet. Retain the investigation evidence and the policies already established, and bring this question back to me when a complete canonical dictionary field order is actually needed.

### PAQ-018 — Formal word-form character repertoire

- **Status:** Open
- **Question:** what ordinary word-form repertoire and separate source-character/placeholder categories should the formal model support?
- **Author position:** the full repertoire remains unconfirmed. Some characters placed directly in syntax trees may preserve source information when accurate transcription is unavailable; do not assign that explanation to every case by guess. Preserve meaningful information without treating every observed character as an approved ordinary spelling.
- **Completed investigation:** 15 non-ASCII ILL final-field forms and 243 *T* lines; five ASCII x-based ILL forms pass current recognition. An independent scan found no other nonalphabetic final field. [DI-004](data-issues.md#di-004--ill-special-word-forms) owns ILL examples; [DI-012](data-issues.md#di-012--nonalphabetic-syntaxform-candidates-and-provisional-trace-notation) and the inventory hold every occurrence, code point and context.
- **Current implementation:** non-ASCII ILL strings survive as raw_tag-bearing syntax elements but are omitted from recognized lexical transcription; SYN retains that imported hierarchy and original snapshots rather than repairing it.
- **Related evidence:** all six texts with those 15 ILL source-character forms also appear in [DI-007](data-issues.md#di-007--header-and-tree-derived-transcription-content-discrepancies): MYS.1.9, MYS.2.156, MYS.4.655, MYS.13.3242, MYS.14.3419;azuma_uta and MYS.16.3791. Omitted recognized forms explain part of those diagnostic differences. This does not establish a common cause/semantics for every DI-007 case or every difference within those texts; DI-007 also contains other content discrepancies.
- **Next decision:** later author review/revision. Do not change the validator, formal character/category model or source data now.

**Latest project-author clarification:** Keep PAQ-018 **Open**. I will review and revise this issue later. Do not change the validator or formal character/category model yet.
Also note that this issue may be related to the data issue concerning header/tree content inconsistencies. Please check and preserve any relevant cross-reference or evidence between them, but do not assume that they have the same cause or semantics unless the repository evidence establishes that.

## Provisional

### PAQ-007 — Formal status of `*T*`

- **Status:** Provisional
- **Provisional understanding:** *T* likely represents a trace belonging to the annotation system. Formal meaning/status has not been confirmed with the chief editor; this is not an adopted formal model.
- **Current evidence:** 243 lines in 182 texts/25 documents. XML stores `_T_` with raw_tag="*T*" and empty form/phon. All 243 survive XML to TXT reconstruction; a tag query matches `*T*`, but a form query does not. SYN retains category and original snapshots, not a formal trace schema. [DI-012](data-issues.md#di-012--nonalphabetic-syntaxform-candidates-and-provisional-trace-notation) and the inventory retain locations and context.
- **Next decision:** the author will confirm meaning/status with the chief editor. Preserve existing information; no implementation, modeling or source changes now.

**Latest project-author clarification:** Keep PAQ-007 **Provisional**. No further implementation or modeling is needed now. I will confirm the formal status and meaning of `*T*` with the chief editor later.

## Deferred

Revisit only at the stated feature/editorial trigger, bringing the question back to the author and checking the architecture then.

### PAQ-001 — Operational authority of TXT and XML

- **Status:** Deferred
- **Scope:** operational authority/synchronization when direct XML editing becomes a real use case.
- **Established policy:** humans normally author TXT or SYN, rather than XML. Direct XML changes should ultimately be synchronized back to TXT; supported conversions must preserve all information and semantics.
- **Current context:** the normal corpus path is committed ONCOJ TXT to COJ TXT/generated XML. SYN saves are separate from publication; general SYN legacy export/synchronization is not implemented.
- **Author decision:** direct XML editing is not a normal or pressing use case. Do not implement synchronization machinery now. Bring this question back when it becomes a real issue and re-evaluate against the architecture then.

#### Possible future approach (not adopted)

The author considers the earlier exceptional-edit proposal reasonable in principle: retain original/base versions, convert an isolated XML copy to TXT, compare it against original TXT and known conversion limits, then explicitly incorporate reviewed changes into the authoring source and use guarded import. This is an optional future reference, not an adopted workflow or decision-history entry. It must not be assumed to remain appropriate when revisited.

### PAQ-002 — Exact `<raw-text>` regeneration and conflict policy

- **Status:** Deferred
- **Scope:** exact regeneration/validation of derived `<raw-text>` when a concrete feature or workflow needs it.
- **Derived-data policy:** raw-text is nonauthoritative and should not require independent human maintenance.
- **Approved principle:** automatically regenerate only when the required source/tree mapping is deterministic and regeneration causes no information or semantic loss. Otherwise preserve the existing/original information and report the unresolved mapping or conflict; do not guess, overwrite, or produce an incomplete derived representation.
- **Current context:** legacy TXT conversion derives source rows from recognized markers and transcription from recognized forms; DI-004/DI-006 show incomplete mappings. SYN retains source/transcription passages, hierarchy links, historical headers and original snapshots. Source characters cannot be reconstructed from transcription alone.
- **Author decision:** no new validator/regenerator now. Bring this question back before implementing a concrete regeneration/validation feature, and re-evaluate its implementation against the architecture then. The principle is approved; an implementation is not.

### PAQ-009 — Long-term status of legacy EN/SM source IDs

- **Status:** Deferred
- **Question to revisit:** the final EN/SM identifier scheme and long-term addressability of legacy versus dotted IDs.
- **Required context:** EN/SM editing is incomplete. Dotted XML IDs such as EN.1.1 and SM.15.1 are provisional, not a finalized canonical scheme. The current converter retains legacy TXT IDs in roundtrip-data@source-id; SYN also preserves original block records and separate hidden Text identities.
- **Author decision / trigger:** preserve existing identifier information. Revisit when EN/SM editing and final identifier design are ready for review, together with PAQ-011. Do not choose a final identifier scheme now.

### PAQ-011 — Duplicate `1_SM_15` correction

- **Status:** Deferred
- **Question to revisit:** the two SM texts sharing source ID 1_SM_15 / provisional XML ID SM.15.1.
- **Required context:** TXT SM_15.txt lines 108 and 192 have the duplicate ID; legacy lookup returns the first block. SYN keeps separate hidden Text identities but does not settle the scholarly-ID collision. [DI-001](data-issues.md#di-001--duplicate-text-id-1_sm_15) retains both texts and source evidence.
- **Author decision / trigger:** defer together with PAQ-009. Do not change either ID. Revisit the duplicate when SM editing and final identifier design are ready for review; no replacement ID has been chosen.

### PAQ-020 — Status of XML container metadata

- **Status:** Deferred
- **Question to revisit:** which legacy XML attributes need formal model/export mappings.
- **Author decision:** keep all four attributes for now; do not decide their final formal status. No metadata removal, restructuring or new mapping now.
- **Revisit trigger:** before general SYN legacy export to TXT/XML is designed, bring this question back to the author and re-evaluate the attributes against that architecture.

#### Evidence needed for later export design

| Attribute | Current behavior and preservation consideration |
|---|---|
| `document@filename` (historical question: `corpus@filename`) | Current corpus roots are document. CorpusDocument writes/reads filename, falls back to the disk basename if absent, and exposes it in document metadata. Changing it can alter model/API metadata and serialized output. Disk path and SYN Document name/origin are not automatically the same information. |
| `dictionary@version` | Writer sets 1.0; reader does not validate/dispatch on it, and dictionary model serialization resets an alternative value. SYN schema_version=2 is a corpus-draft version, not a replacement dictionary version. |
| `raw-text@role` | Writer sets processing; readers locate raw-text by element names, not role. No dedicated role-dependent parsing path exists. Original XML/SYN snapshots retain it; derived source/transcription content must remain distinct from its label. |
| `roundtrip-data@format` | Writer sets coj-txt; current reconstruction uses the container, source-id, positioned comments and raw lines without format dispatch. Changing this attribute alone differs from deleting the container/content, which would lose reconstruction information. |

Original corpus snapshots retain attributes, but are not a complete edited-export mapping. Generic XML inspection/search can expose attribute values even without dedicated parsing behavior. Current readers not using a value does not establish that it is disposable. Evidence: src/coj/core/corpus.py, src/coj/xml/dictionary_xml.py, src/coj/authoring/{legacy,model,persistence}.py and [the inventory](data-investigation-2026-10-13.json). No attribute has been reclassified or removed.

## Resolved / Answered

Accepted answers and useful resolution evidence remain under their original IDs. Implementation or source synchronization is separate from whether an author decision is settled; no additional follow-up records are created here.

### PAQ-003 — Meaning of numbered marker labels

- **Question:** Are marker numbers (`0@`, `3@`, etc.) meaningful source labels that must remain unchanged, or can a canonical authoring serializer renumber them while preserving segment order, source text, and boundaries?
- **Context:** current data has gaps and restarts; for example `MYS.3.276b` has marker labels `0, 3, 4, 0, 1`.
- **Current implementation:** Original labels remain in positioned raw comments; legacy raw-text rows receive consecutive numbers from 1. SYN passages have ordered identities and retain `legacy_number`; no semantic role for that number is imposed by the new model.
- **Answer:** Marker numbers are not semantically meaningful source labels. The meaningful information is the segment order, source text, and segment boundaries.
The irregular marker sequence in `MYS.3.276b` (`0, 3, 4, 0, 1`) is believed to be an error in the original TXT data. The intended sequence is `0, 1, 2, 3, 4`. However, do not modify the source data as part of this investigation. Record this case along with the other findings described below and wait for explicit project-author confirmation before making any correction.
There is an important distinction between exact TXT round-tripping and canonical serialization. When performing an exact TXT round-trip, if the original marker syntax has been retained as round-trip data, the original marker labels should also be preserved so that the input can be reproduced faithfully. This preservation requirement does not make the labels semantically meaningful.
For the project's own canonical/normalized representations, including XML and SYN, marker numbers may be regenerated or renumbered as needed, provided that segment order, source text, boundaries, and all other meaningful information are preserved without loss.
Please inspect the corpus for all numbered-marker sequences containing gaps, unexpected restarts, or other numbering irregularities. Faithfully report every such case and document it in the project's data-issue records with enough detail for project-author review.
This investigation must not modify or correct any source data. Even when an irregularity appears very likely to be an error and its intended correction seems obvious, report and document it rather than changing it. All corrections to the source data require explicit project-author confirmation first.
- **Status:** Answered
- **Implementation / data note:** Answered — numbering policy; recorded source corrections await explicit confirmation

#### Investigation / decision history (13 October 2026)

Scanned all 37,707 recognized numbered markers in 5,665 TXT blocks. Ten texts have nonconsecutive/out-of-order sequences under the diagnostic zero-based consecutive-label convention (DI-009). MYS.3.276b still has 0,3,4,0,1. The author considers 0,1,2,3,4 intended but has not authorized a source correction. Labels are not semantic; source order/text and real boundaries are semantic. Exact retained TXT labels must still round-trip, while canonical renumbering may be regenerated without losing meaningful data.

### PAQ-004 — `MYS_19` attached marker syntax

- **Status:** Resolved
- **Resolution:** the project author has corrected the attached-marker typo in ONCOJ. The correction is awaiting the normal ONCOJ to COJ import; do not edit COJ source directly.
- **Evidence retained:** COJ still has `IP-EPT.18@` in MYS.19.4220 at data/txt/trees/MYS_19.txt:3839. The intended correction separates IP-EPT from the numbered marker with a comma. The earlier corpus scan found one such malformed numeric-@ marker; complete original/context evidence remains in [DI-006](data-issues.md#di-006--two-anomalous-marker-like-lines) and the inventory.
- **Interpretation of current checkout:** pending source synchronization is not an unresolved author decision and does not reopen PAQ-004.

**Latest project-author clarification:** I have already corrected this typo in the ONCOJ source data. The corrected data will be synchronized into COJ through the normal ONCOJ → COJ import workflow later.
Please mark PAQ-004 and the corresponding data-issue item as Resolved. The fact that the current COJ checkout may still contain the old malformed line is only because the updated ONCOJ source has not yet been imported; it should not be treated as an unresolved author decision or as authorization to edit the COJ source directly.
Please retain enough resolution context to indicate that the correction was made in ONCOJ and is awaiting normal synchronization into COJ.

### PAQ-006 — Resolving header/tree content discrepancies

- **Question answered:** how should TXT to XML handle header/tree content discrepancies? The historical 30-case audit is distinct from the 12 current cases.
- **Context:** the project author has decided that both layers are meaningful and content should not normally differ.
- **Current implementation:** Current XML scan: 5,665 texts; 640 exact header/tree matches, 5,013 segmentation-only differences and 12 content discrepancies. SYN opening records historical-header/passage mismatches. The legacy converter does not yet automatically report/register every header/tree discrepancy.
- **Answer:** First inspect the current repository state and the relevant data-issue history. The previously identified header/tree content discrepancies, including the 30 cases referred to by DI-007, may already have been corrected. Verify their current status rather than assuming that the cases described in this question ledger are still present. Do not reintroduce or modify data merely to match the older issue description.
Also review the latest architecture, including the current SYN/TXT/XML model and conversion workflows, before deciding how header/tree consistency validation should be integrated into the implementation.
As a general policy for future discrepancies, when the program detects inconsistent content between meaningful representations or layers such as the header and tree content, it should report the inconsistency and faithfully record it in the project's data-issue records with sufficient information for later review. The converter should nevertheless continue the conversion rather than treating the discrepancy itself as a blocking error.
Detection and reporting must not silently resolve the discrepancy, choose one side as correct, or modify the affected source data. Any actual data correction should remain a separate, explicitly reviewed decision.
- **Status:** Answered
- **Implementation / data note:** Answered — TXT → XML policy scoped; reporting implementation pending

#### Investigation / decision history (13 October 2026)

DI-007 is revalidated: 21 of the historical 30 texts no longer fail the same comparison, nine still fail, and three additional current discrepancies were not in the historical list. Original historical evidence remains labeled as history. No source correction was made.

**Project-author scope clarification (13 October 2026):** report/register discrepancies and continue applies **specifically and only to TXT → XML**. It does not establish policy for XML → TXT or any other conversion. SYN reviewed write-back/export retains its existing blocking rules for unresolved discrepancies. The converter's automatic report/register step is still an implementation gap; the read-only audit here is not that implementation.

### PAQ-010 — Semicolon suffixes in text IDs

- **Question:** What formal metadata is encoded by suffixes such as `MYS.14.3352;azuma_uta`, and should a future model store the base text ID and label as separate fields?
- **Current implementation:** Existing XML retains the complete semicolon-delimited ID. SYN retains the same scholarly text_id and original block; no separate typed field for azuma_uta is implemented. Search supports the base alias and suffix fragments.
- **Answer:** In an ID such as `MYS.14.3352;azuma_uta`, the suffix `azuma_uta` represents 東歌 (あずまうた), i.e. a textual category/label associated with the passage. It should not be understood as an inseparable part of the underlying passage ID `MYS.14.3352`.
A future data model may therefore represent the base text ID and this label as separate fields rather than encoding both pieces of information in a single semicolon-delimited identifier.
However, do not change the current data, IDs, or serialization yet. Preserve the existing representation losslessly for now. The separation should be considered as part of a later data-model design change rather than applied immediately.
- **Status:** Answered
- **Implementation / data note:** Answered — conceptual label distinction; later model design deferred

#### Investigation / decision history (13 October 2026)

Author identifies azuma_uta as a textual category/label distinct conceptually from MYS.14.3352. A future separate representation is permitted for consideration, not mandated now. Current complete IDs remain unchanged; future separation must preserve information and addressability.

### PAQ-012 — Duplicate dictionary ID `L080539`

- **Historical question:** Should Shibi/`sibi` and Hegomori/`pyegomori` be separate entries, and which entry should retain `L080539`?
- **Context:** see DI-002.
- **Current implementation:** Resolved in imported data since 5558e2a: Shibi/sibi is L080725, Hegomori/pyegomori is L080539; both are present in TXT and XML. No duplicate dictionary ID exists among the current 6,498 headings. The parser still replaces duplicate TXT IDs if a new collision is introduced.
- **Answer:** First inspect the current repository and relevant data-issue history to determine whether the duplicate dictionary ID `L080539` involving Shibi/`sibi` and Hegomori/`pyegomori` has already been resolved.
Do not assume that the behavior described in this question ledger—where the latter entry silently replaced the former during TXT parsing and only Hegomori remained in XML—still reflects the current implementation or data.
If the issue has already been resolved, report its current status and retain the relevant decision/history in the data-issue record.
If the issue remains unresolved, preserve and, where necessary, update the data-issue record so that the duplicate, the affected entries, and any resulting data-loss or conversion behavior are faithfully documented.
Do not independently decide which entry should retain `L080539`, do not assign or invent a replacement ID, and do not modify the dictionary data. Any such correction requires explicit project-author review and confirmation.
- **Status:** Resolved
- **Implementation / data note:** Resolved in current data — historical allocation verified, no new decision made

#### Investigation / decision history (13 October 2026)

The source/import history already supplied L080725; this review did not allocate or endorse a new identifier. DI-002 is moved to resolved history, retaining the original collision and the residual parser behavior. This is a verified data resolution, not evidence that the parser prevents future duplicate loss.

### PAQ-013 — Multiline dictionary value syntax

- **Question:** Was the second line of L051953 intended as a continuation of `.NOTE`, and should current TXT formally support continuation lines (if so, by what syntax)?
- **Context:** see DI-003.
- **Current implementation:** The untagged continuation remains at dictionary.txt:47926, after `.NOTE` at :47925 for L051953. `_parse_block()` silently skips the continuation; XML note still ends at `Omodaka 1984.17:`. The importer checks counts/root/reload, not all skipped physical lines.
- **Answer:** The second line associated with `L051953` is intended to be a continuation of the `.NOTE` value. The line break itself is an error in the source data: the continuation should be part of the same `.NOTE` value and should not have been placed on a separate untagged line.
This case therefore should not, by itself, be treated as evidence that the TXT dictionary format needs to support untagged continuation lines or a formal multiline-value syntax.
The source data will be corrected later by the project author. Do not modify `L051953` as part of this task.
Please also check the latest repository state before relying on the older parser behavior described in this question ledger. In particular, ensure that accidental untagged lines are not silently discarded in a way that can cause unnoticed information loss. Any broader policy for malformed or unsupported dictionary input should remain consistent with the project's general requirement that information and semantics must not be silently lost during conversion.
- **Status:** Answered
- **Implementation / data note:** Answered — erroneous line break; source correction and reporting implementation pending

#### Investigation / decision history (13 October 2026)

Author confirms an accidental physical line break, not formal multiline syntax. DI-003 stays open for later author correction. The full dictionary scan found exactly one untagged nonempty entry line, this continuation. No broad continuation syntax or parser repair is implemented in this register-only task. Silent dropping remains an implementation gap under PAQ-019.

### PAQ-014 — Missing versus explicitly blank dictionary fields

- **Question:** Is an absent dictionary field semantically different from a present field with an empty value for every field, only some fields, or never?
- **Current implementation:** Current source contains two explicitly blank `.MEANING` values; 6,498 entry-model TXT → XML → model comparisons preserve current parsed fields. This does not cover the skipped DI-003 line or exact field syntax. Synthetic probes still lose blank optional singular fields and orphan KANA; normalise() changes missing-field states.
- **Answer:** An absent dictionary field and a field that is explicitly present with an empty value should be treated as semantically distinct states. Conversion or normalization should therefore not silently collapse one into the other.
Before changing the implementation, inspect the latest dictionary/SYN architecture and the current dictionary data. Determine which fields actually occur with explicitly blank values, which fields are absent, and how the current parsing, normalization, serialization, and format-conversion workflows transform these two states.
In particular, identify any cases where a missing field becomes an explicitly blank field, or where an explicitly blank field becomes absent, during conversion or normalization. Also examine whether the current behavior differs between required fields, optional singular fields, and repeated/list-like fields such as `.FORM` and `.KANA`.
Update this question document with the results of the investigation so that the findings and the current implementation status are preserved alongside this question.
If the TXT source data contains any fields that are explicitly present but have empty values, faithfully document all such cases in the project's data-issue records, including the affected entry, field, location, and relevant context. Do not modify, remove, fill in, or otherwise normalize those source-data cases.
Use these findings to determine how the latest data model should preserve the missing-versus-explicitly-blank distinction consistently across supported representations. The implementation should preserve this semantic distinction losslessly rather than normalizing it away merely for serialization convenience.
Do not modify dictionary source data as part of this investigation. If the investigation reveals questionable or inconsistent source-data cases, document them for review rather than silently changing them.
- **Status:** Answered
- **Implementation / data note:** Answered — semantic presence distinction; implementation gaps documented

#### Investigation / decision history (13 October 2026)

See DI-011 and the complete blank/missing/normalization inventory. Exactly two source blanks are MEANING for L080104 (:48838) and L091024 (:54326); both survive current XML mapping. GLOSS/MEANING/FORM/KANA are absent in L050830; POS is absent in L080156, L099997 and L050830. In-memory normalization adds POS=[] to the first two and adds required fields to L050830 (including GLOSS="" and KANA=[""]). An empty list is present in memory but emits no repeated TXT line, so it cannot faithfully retain a present-empty field state.

Synthetic probes distinguish preservation from current source usage: blank GLOSS/MEANING/POS/NOTE survive; blank CORRESP disappears; KANA without FORM disappears; FORM without KANA creates a blank KANA; extra KANA values beyond FORM are ignored. Indexed fields are accumulated/sorted by index and singular repeats overwrite, rather than preserving every physical occurrence. Corpus SYN does not define dictionary fields yet. Future explicit presence and ordered-value mappings are required by the author policy; implementation/fixtures were not changed.

### PAQ-015 — `.NOTE` and `.NOTES`

- **Status:** Resolved
- **Author decision:** `.NOTES` is a historical editorial inconsistency, not a formal field distinct from `.NOTE`.
- **Current finding:** no `.NOTES` occurs in the TXT dictionary. Existing XML mappings merge NOTE/NOTES into notes and read it as NOTE. No current source correction is needed or has been made.
- **Future occurrence:** bring PAQ-015 back to the author before changing actual source data or deciding how a newly encountered occurrence should be handled.
- **Record scope:** retain this resolution only in PAQ-015; do not create separate data-issue, TODO, register or documentation records for it.

**Latest project-author clarification:** `.NOTES` should be treated as a historical editorial inconsistency, not as a formal field distinct from `.NOTE`.
Please mark PAQ-015 as **Resolved**. Since there are currently no `.NOTES` occurrences in the TXT dictionary, no source-data correction is needed now.
Keep this resolution in PAQ-015 only. Do not create or add separate `.NOTES`-related records in data issues, TODOs, other registers, or other documentation merely to record this resolved issue.
If `.NOTES` is encountered in actual source data in the future, bring PAQ-015 back to my attention before making any source-data change or deciding how that occurrence should be handled.

### PAQ-016 — Canonical dictionary entry order

- **Question:** What deterministic order should dictionary entries use: `LemmaID` numeric/suffix order, historical source order, or another editorial order?
- **Context:** canonical ascending LemmaID ordering is decided; exact source-order preservation remains a separate roundtrip requirement.
- **Current implementation:** Serializers use insertion order; sorted_entries() is not called by the TXT/XML serializers. LemmaID comparison orders by (numeric part, suffix, prefix), deterministically placing an unsuffixed ID before its a/b suffixes. SYN currently has no dictionary serializer.
- **Answer:** For exact TXT round-tripping, preserve the original dictionary entry order from the source TXT so that the original serialization can be reproduced faithfully.
For the project's own canonical dictionary serialization, entries should be normalized into a deterministic ascending order by `LemmaID`, from smallest to largest. This canonical ordering should be used consistently across the project's normalized dictionary representations where applicable.
The distinction between these two requirements should be maintained explicitly: preserving source order is a round-trip requirement, whereas ascending `LemmaID` order is the canonical serialization policy. Canonical sorting must not destroy the information needed to reconstruct the original TXT order when exact round-tripping is required.
Please review the latest dictionary/SYN architecture and current serializers when implementing this policy, including the existing `sorted_entries()` behavior, and ensure that the resulting `LemmaID` ordering is deterministic and correctly handles any supported ID suffixes.
- **Status:** Answered
- **Implementation / data note:** Answered — canonical/source-order policies; implementation pending

#### Investigation / decision history (13 October 2026)

Author policy settled: source order for exact TXT restoration; deterministic ascending LemmaID order for canonical output; preserve the information needed for the former. Existing numeric/suffix comparator is evidence of available implementation, not proof serializers implement that policy. Any mixed-prefix tie convention not expressly specified by the author remains to be reviewed before changing serialization.

### PAQ-019 — Unsupported formal-field error policy

- **Question:** When a converter encounters a dictionary/XML field that has been declared formal but lacks a mapping in the current converter version, should conversion fail, produce output with a blocking error report, or preserve an explicit opaque extension?
- **Context:** unsupported declared formal data must not be silently dropped; arbitrary undeclared input is not automatically promoted to formal data.
- **Current implementation:** All 21 currently observed dictionary field types have XML mappings, but unknown tags/children are still ignored, and DI-003 untagged input is skipped. SYN has generic compatibility/annotations and full original corpus snapshots, not an implemented dictionary opaque-extension or export guarantee.
- **Answer:** Unsupported formal data must never be silently dropped during conversion.
If a field has been declared part of the formal data model but the current converter does not yet have a proper mapping for it, the preferred behavior is to preserve the complete original information through an explicit opaque representation whenever this can be done losslessly.
In that case, conversion may continue, but the converter must clearly report the unsupported formal field and record the case in the project's data-issue records. The opaque representation must preserve enough information to recover the original formal data without loss; it must not merely retain a partial or approximate substitute.
The fact that conversion can continue through an opaque representation must not make the unsupported field invisible. The report and data-issue record should make clear what field was unsupported, where it occurred, how it was preserved, and what converter/model mapping remains to be implemented.
Before implementing new behavior, inspect the latest SYN/XML/dictionary architecture to determine whether an appropriate extension or opaque-preservation mechanism already exists and use the current architecture where possible.
If the converter cannot preserve the unsupported formal data losslessly, it must not silently produce an apparently successful conversion that omits or changes that information. Such a case should instead be surfaced explicitly for further handling.
This policy concerns data that is already recognized as formal data. It should not be interpreted as requiring arbitrary unknown or undeclared input to be automatically promoted into the formal model.
- **Status:** Answered
- **Implementation / data note:** Answered — lossless preservation/reporting policy; mapping behavior still incomplete

#### Investigation / decision history (13 October 2026)

The author's policy is recorded as given: losslessly preserve declared formal unsupported data opaquely where possible, report/register it, and otherwise surface it explicitly for further handling. The answer does not decide a particular failure/opaque schema for nonpreservable cases, and does not promote arbitrary unknown input into formal data. Whole original corpus snapshots in SYN are an existing retention mechanism but no supported edited-export mapping is implemented; no dictionary opaque codec exists. Synthetic unknown-field disappearance and DI-003 show remaining gaps. All current observed field types map, but the in-memory field roundtrip scan excludes unparsed lines and does not prove exact TXT identity.

### PAQ-021 — Exact marker syntax versus regenerable serialization

- **Question:** Must the complete raw numbered marker line—including its original path spelling and position—remain authoritative source syntax, or may a future canonical authoring serializer regenerate an equivalent marker from modeled source text and boundary data?
- **Context:** markers carry semantic source text and real boundaries, while current XML also stores their exact raw lines as round-trip data.
- **Current implementation:** Marker parent paths attach transient `_syntax_boundaries_before` to the next CorpusLine. `_build_children()` stops same-tag grouping at the marker parent depth. XML retains the separate hierarchy and positioned raw comments; SYN retains that hierarchy, passage links and original TXT/XML, but general legacy export remains pending.
- **Answer:** First investigate the latest repository and architecture before finalizing the status of numbered marker lines. In particular, inspect the relevant TODO records, implementation history, and current parsing/conversion code. There was a previously discussed and repaired bug involving these markers, and the repository history should be used to recover the intended behavior rather than inferring it solely from the older description in this PAQ.
If the markers referred to here are constructs such as `18@於保夫祢能` occurring within syntax-tree data, they have at least one function that is more than mere serialization syntax. In some cases, a marker separates syntax-tree branches that should not be grouped under the same branch. This boundary behavior is semantically/structurally important. Please identify the previous bug and its fix, explain how this boundary function is represented in the latest architecture, and make sure that it remains preserved across format conversions.
This structural boundary function should be distinguished from the exact textual serialization of the marker line. Apart from the meaningful information carried by the marker—including source text and any real structural/segment boundary information—the exact marker syntax appears primarily to be information that needs to be retained for round-tripping.
In particular, the existing XML must retain enough round-trip information to reconstruct the original TXT losslessly. Exact marker serialization may therefore be preserved as round-trip data without making every aspect of its original textual spelling part of the canonical semantic model.
After reviewing the repository, determine precisely which aspects of the marker are semantically or structurally meaningful and which exist only to support exact TXT round-tripping. Do not assume that the older PAQ description captures the latest design.
Preserve both categories losslessly: meaningful boundary/source information must survive at the model level, while serialization-specific information required to reconstruct the original TXT must survive as round-trip data. Do not remove or simplify existing marker information until the repository evidence and current architecture establish that doing so is lossless.
Update this PAQ with the investigation results, including the relevant earlier TODO/bug history and how the current implementation represents the marker's boundary behavior.
- **Status:** Answered
- **Implementation / data note:** Answered — source/boundary/roundtrip distinction; complete SYN export mapping pending

#### Investigation / decision history (13 October 2026)

Historical fix recovered: TODO After commit a36a1af identified BS.1's two NP-ADV constituents accidentally merged across CP-FINAL marker rows. Commit 4cc54dd restored 4,020 marker-derived boundaries (report: 26,105 unique annotation lines, 1,818 passages, 105 XML documents; 4,089 additional separated nodes). `reports/kanji_marker_boundaries.md`, the repeatable migration and TestKanjiMarkerSyntaxBoundaries retain the evidence.

Current marker parent path means a new **child below that parent**, not a split of the parent named in the marker; `_starts_new_syntax_child()` and `_build_children()` enforce this. Numbers themselves are not semantic under PAQ-003; source text/order, segment events and constituent separation are meaningful. Exact path spelling, marker labels and positioned raw lines are needed for retained TXT reproduction. XML retains both hierarchy and roundtrip comments; SYN imports hierarchy and whole original bytes but has no complete marker-event export adapter. Do not simplify existing preservation merely because some bookkeeping might eventually be derivable.
