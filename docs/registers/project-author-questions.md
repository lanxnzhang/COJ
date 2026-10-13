# Open questions

This is the default question ledger. The project author may answer an entry here or explicitly move it to the chief-editor ledger. Answers and decision history remain attached to the original ID.

## PAQ-001 — Operational authority of TXT and XML

- **Question:** Given that TXT is the current human authoring representation and XML the computational representation, which direction is the normal checked-in editing workflow today, and what event makes the other representation current?
- **Context:** `README.md` currently calls XML “canonical (primary)” and TXT “derived,” while the clarified conceptual model deliberately avoids treating either serialization as the semantic model.
- **Current implementation:** applications/processors normally read XML. The
  [primary TXT importer](../guides/primary-txt-import.md) now supplies the normal
  one-way workflow from committed external TXT to COJ TXT/XML, with source
  provenance and overwrite safeguards. Dictionary Save still writes COJ XML
  directly; it does not update the authoring TXT. Both general conversion
  scripts can overwrite their destination trees. This operational evidence does
  not settle the policy for reconciling direct XML edits with authoring sources.
- **Project-author notes:**
- **Answer:** This question may already have been partially resolved by more recent changes to the program and its data model. First inspect the current project state and determine whether newer documentation, formats, conversion workflows, or implementation decisions already answer part of this question. Do not assume that the description in this question ledger still reflects the latest design.
As a general policy, human authors will normally edit TXT or the newly designed SYN format rather than XML.
If XML is modified directly, those changes should ultimately be synchronized back to TXT rather than leaving the representations semantically divergent. However, direct XML editing is not expected to be a common or important workflow at the current stage of the project. Based on the latest state of the project, propose an appropriate workflow for handling such cases rather than introducing unnecessary machinery solely for a currently unlikely scenario.
The overriding requirement is that conversion between the supported representations must preserve all information and semantics without loss. Decisions about operational authority and synchronization should be made in service of that requirement.

- **Status:** Open

## PAQ-002 — Exact `<raw-text>` regeneration and conflict policy

- **Question:** When regenerating derived `<raw-text>`, should segment source text and boundaries always come from numbered roundtrip markers while transcription always comes from recognized tree forms, and should any mismatch with an existing `<raw-text>` be an error, warning, or silent regeneration?
- **Context:** the project-author decision establishes that `<raw-text>` is derived and not independently authoritative, but the exact validation behavior is not yet stated.
- **Example:** an XML editor could change a leaf form without changing existing `<raw-text>/<transcription>`.
- **Current implementation:** TXT → XML regenerates; XML → TXT ignores `<raw-text>`; `treditor` displays the stored value; no consistency validator exists.
- **Project-author notes:**
- **Answer:** This question should first be re-evaluated against the latest project design and implementation. In particular, inspect the current SYN/TXT/XML model and conversion workflows to determine the present roles of numbered markers, source text, segment boundaries, recognized tree forms, and `<raw-text>`. Do not assume that the regeneration scheme proposed in this question still accurately describes the current architecture.
As a design principle, `<raw-text>` is derived data and should not require independent human maintenance. It should follow the authoritative content represented by the syntax tree and/or the human-edited and confirmed source representation. If `<raw-text>` can be deterministically and losslessly reconstructed from that information, the program should regenerate it automatically rather than requiring users to keep a separate copy synchronized by hand.
Direct human editing of XML is not expected to be a normal workflow, so the conflict scenario involving a manually edited XML tree and stale `<raw-text>` should not drive the overall design. After examining the latest project state, determine an appropriate validation and regeneration policy consistent with the current architecture.
As with PAQ-001, the important requirement is preservation of information and semantics across representations. Derived data should remain consistent with the underlying authoritative content without creating an additional human-maintained source of truth.
- **Status:** Open

## PAQ-003 — Meaning of numbered marker labels

- **Question:** Are marker numbers (`0@`, `3@`, etc.) meaningful source labels that must remain unchanged, or can a canonical authoring serializer renumber them while preserving segment order, source text, and boundaries?
- **Context:** current data has gaps and restarts; for example `MYS.3.276b` has marker labels `0, 3, 4, 0, 1`.
- **Current implementation:** exact labels survive in raw roundtrip lines, while derived raw-text sentences are renumbered sequentially from 1.
- **Project-author notes:**
- **Answer:** Marker numbers are not semantically meaningful source labels. The meaningful information is the segment order, source text, and segment boundaries.
The irregular marker sequence in `MYS.3.276b` (`0, 3, 4, 0, 1`) is believed to be an error in the original TXT data. The intended sequence is `0, 1, 2, 3, 4`. However, do not modify the source data as part of this investigation. Record this case along with the other findings described below and wait for explicit project-author confirmation before making any correction.
There is an important distinction between exact TXT round-tripping and canonical serialization. When performing an exact TXT round-trip, if the original marker syntax has been retained as round-trip data, the original marker labels should also be preserved so that the input can be reproduced faithfully. This preservation requirement does not make the labels semantically meaningful.
For the project's own canonical/normalized representations, including XML and SYN, marker numbers may be regenerated or renumbered as needed, provided that segment order, source text, boundaries, and all other meaningful information are preserved without loss.
Please inspect the corpus for all numbered-marker sequences containing gaps, unexpected restarts, or other numbering irregularities. Faithfully report every such case and document it in the project's data-issue records with enough detail for project-author review.
This investigation must not modify or correct any source data. Even when an irregularity appears very likely to be an error and its intended correction seems obvious, report and document it rather than changing it. All corrections to the source data require explicit project-author confirmation first.
- **Status:** Open

## PAQ-004 — `MYS_19` attached marker syntax

- **Question:** What was intended by `IP-EPT.18@於保夫祢能,*` in `data/txt/trees/MYS_19.txt:3838`: a marker `18@於保夫祢能` after parent path `...,IP-EPT`, a literal unusual tag, or something else?
- **Current implementation:** it is preserved as a raw line but is not recognized as a normal marker, raw-text segment, or marker boundary.
- **Project-author notes:**
- **Answer:** The occurrence `IP-EPT.18@於保夫祢能,*` in `data/txt/trees/MYS_19.txt:3838` is believed to be a typo in the original TXT data. The intended form is:
`IP-EPT,18@於保夫祢能,*`
In other words, `IP-EPT` and the marker `18@於保夫祢能` should have been separated by a comma rather than joined with a period.
Record this case in the project's data-issue records, but do not modify the source data yet. Any actual correction requires explicit project-author confirmation before it is applied.
Please also inspect the corpus for other occurrences of the same or similar malformed marker syntax. Faithfully document every relevant case in the data-issue records, including the original data, its location, the surrounding context needed for review, and any evidence indicating what may be wrong.
Do not correct any of these cases during this investigation. Even if a case appears to be an obvious typo and the intended form seems clear, record the finding and leave the source unchanged until explicit project-author confirmation is given.
- **Status:** Open

## PAQ-005 — `SM_29` bare star line

- **Question:** What was intended by `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*` in `data/txt/text/SM_29.txt:110`?
- **Current implementation:** it is preserved as a positioned raw line but does not create a source-text segment or structural boundary.
- **Project-author notes:**
- **Answer:** The line `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*` in `data/txt/text/SM_29.txt:110` is believed to be an editing error in the source data. However, the intended content is currently unknown.
Do not attempt to infer, reconstruct, or propose what the original intended content might have been.
Record this case faithfully in the project's data-issue records. Please also inspect the corpus for other occurrences of the same or similar bare-star anomalies and record all such cases in the data-issue records, preserving the original data, location, and sufficient surrounding context for later project-author review.
This investigation is strictly for identification and documentation. Do not modify, normalize, repair, or otherwise alter any affected source data. Any interpretation or correction must wait for explicit project-author review and confirmation.
- **Status:** Open

## PAQ-006 — Resolving header/tree content discrepancies

- **Question:** What review procedure and authority should resolve the 30 content discrepancies in DI-007, and should future conversion merely report them or refuse output until reviewed?
- **Context:** the project author has decided that both layers are meaningful and content should not normally differ.
- **Current implementation:** no validation occurs; search/display can expose either layer depending on feature.
- **Project-author notes:**
- **Answer:** First inspect the current repository state and the relevant data-issue history. The previously identified header/tree content discrepancies, including the 30 cases referred to by DI-007, may already have been corrected. Verify their current status rather than assuming that the cases described in this question ledger are still present. Do not reintroduce or modify data merely to match the older issue description.
Also review the latest architecture, including the current SYN/TXT/XML model and conversion workflows, before deciding how header/tree consistency validation should be integrated into the implementation.
As a general policy for future discrepancies, when the program detects inconsistent content between meaningful representations or layers such as the header and tree content, it should report the inconsistency and faithfully record it in the project's data-issue records with sufficient information for later review. The converter should nevertheless continue the conversion rather than treating the discrepancy itself as a blocking error.
Detection and reporting must not silently resolve the discrepancy, choose one side as correct, or modify the affected source data. Any actual data correction should remain a separate, explicitly reviewed decision.
- **Status:** Open

## PAQ-007 — Formal status of `*T*`

- **Question:** Is `*T*` a formally modeled syntax terminal/trace with defined attributes and search behavior, or only a legacy TXT token that must round-trip literally?
- **Context:** permissive current path handling can preserve it, but the repository evidence does not establish its full intended model.
- **Project-author notes:**
- **Answer:** `*T*` is provisionally understood to be a marker representing a trace and likely belongs to the annotation system rather than being merely an arbitrary legacy TXT token.
However, this interpretation has not yet been confirmed with the chief editor. Treat it as a provisional understanding, not as a final project-author decision about the formal model.
Please inspect the current corpus and the latest architecture to document how `*T*` is currently represented, preserved, converted, and handled by relevant syntax/search functionality. Do not introduce a new formal model, change its semantics, or modify source data on the basis of the provisional interpretation alone.
The project author will seek further confirmation from the chief editor before its exact formal status and behavior are finalized. In the meantime, existing occurrences and their information must continue to be preserved losslessly across relevant format conversions.
- **Status:** Open

## PAQ-008 — Distinction suffixes on writing-mode tags

- **Question:** When a source has a value such as `LOG;@2`, does `;@2` distinguish annotation components in the same sense that it distinguishes syntax nodes, or is it a separate historical convention?
- **Current implementation:** XML stores it as `phon="LOG" phon_index="2"` and reconstructs it exactly.
- **Project-author notes:**
- **Answer:** The exact meaning and formal status of suffixes such as `;@2` in values such as `LOG;@2` are currently uncertain. Do not assume that they have the same semantics as distinction suffixes on syntax nodes, and do not infer their semantics from the current XML representation alone.
Please inspect the corpus and identify every occurrence of `LOG;@2`. Faithfully document all such occurrences in the project's data-issue records, including their exact source data, locations, and sufficient surrounding context for later review.
Do not modify, normalize, reinterpret, or otherwise alter any of these occurrences. This task is for documentation only. The formal meaning of `;@2` will be determined separately after further review.
In the meantime, existing conversion behavior should continue to preserve this information losslessly.
- **Status:** Open

## PAQ-009 — Long-term status of legacy EN/SM source IDs

- **Question:** Are IDs such as `1_EN_01` and `1_SM_15` temporary authoring IDs expected eventually to be replaced by dotted IDs, or must both the legacy spelling and canonical dotted ID remain indefinitely addressable?
- **Current implementation:** XML uses `EN.1.1`/`SM.15.1`; `roundtrip-data@source-id` restores the legacy TXT spelling.
- **Project-author notes:**
- **Answer:** This question should remain open for later resolution.
EN and SM have not yet been fully edited, and dotted IDs such as `EN.1.1` are currently provisional IDs introduced for use in XML. Their current use should therefore not be interpreted as establishing the project's final or canonical identifier scheme.
Do not make a long-term design decision yet about whether legacy IDs such as `1_EN_01` must remain permanently addressable, whether dotted IDs should replace them, or what the final canonical ID system for EN and SM should be.
Preserve the information necessary to avoid losing the existing identifiers and revisit this question after the editing and identifier design for EN and SM have been finalized.
- **Status:** Open

## PAQ-010 — Semicolon suffixes in text IDs

- **Question:** What formal metadata is encoded by suffixes such as `MYS.14.3352;azuma_uta`, and should a future model store the base text ID and label as separate fields?
- **Current implementation:** the complete string is the block ID; passage search creates aliases so `MYS.14.3352` and `azuma` can find it.
- **Project-author notes:**
- **Answer:** In an ID such as `MYS.14.3352;azuma_uta`, the suffix `azuma_uta` represents 東歌 (あずまうた), i.e. a textual category/label associated with the passage. It should not be understood as an inseparable part of the underlying passage ID `MYS.14.3352`.
A future data model may therefore represent the base text ID and this label as separate fields rather than encoding both pieces of information in a single semicolon-delimited identifier.
However, do not change the current data, IDs, or serialization yet. Preserve the existing representation losslessly for now. The separation should be considered as part of a later data-model design change rather than applied immediately.
- **Status:** Open

## PAQ-011 — Duplicate `1_SM_15` correction

- **Question:** Which of the two texts currently labeled `1_SM_15` should receive a different ID, and what should that ID be?
- **Context:** see DI-001 for both headers and locations.
- **Current implementation:** both serialize as `SM.15.1`; lookup returns the first.
- **Project-author notes:**
- **Answer:** First inspect the current repository to determine whether the duplicate `1_SM_15` issue still exists in the latest data.
If the duplicate remains, make sure it is faithfully documented in the project's data-issue records, including both affected texts, their locations, and the resulting identifier/lookup conflict. Do not assign a new ID to either text and do not modify the source data at this stage.
As noted in PAQ-009, SM has not yet been fully edited, and the current dotted IDs such as `SM.15.1` are provisional identifiers used for XML rather than a finalized identifier scheme. It would therefore be premature to decide which of the two texts should receive a different ID or what that replacement ID should be.
Keep this issue open and preserve all existing identifier information. The actual correction should be made later, after the editing of SM and the design of its final identifier system have been resolved and explicitly reviewed.
- **Status:** Open

## PAQ-012 — Duplicate dictionary ID `L080539`

- **Question:** Should Shibi/`sibi` and Hegomori/`pyegomori` be separate entries, and which entry should retain `L080539`?
- **Context:** see DI-002.
- **Current implementation:** the latter silently replaces the former during TXT parsing; only Hegomori is in current XML.
- **Project-author notes:**
- **Answer:** First inspect the current repository and relevant data-issue history to determine whether the duplicate dictionary ID `L080539` involving Shibi/`sibi` and Hegomori/`pyegomori` has already been resolved.
Do not assume that the behavior described in this question ledger—where the latter entry silently replaced the former during TXT parsing and only Hegomori remained in XML—still reflects the current implementation or data.
If the issue has already been resolved, report its current status and retain the relevant decision/history in the data-issue record.
If the issue remains unresolved, preserve and, where necessary, update the data-issue record so that the duplicate, the affected entries, and any resulting data-loss or conversion behavior are faithfully documented.
Do not independently decide which entry should retain `L080539`, do not assign or invent a replacement ID, and do not modify the dictionary data. Any such correction requires explicit project-author review and confirmation.
- **Status:** Open

## PAQ-013 — Multiline dictionary value syntax

- **Question:** Was the second line of L051953 intended as a continuation of `.NOTE`, and should current TXT formally support continuation lines (if so, by what syntax)?
- **Context:** see DI-003.
- **Current implementation:** untagged lines are silently ignored.
- **Project-author notes:**
- **Answer:** The second line associated with `L051953` is intended to be a continuation of the `.NOTE` value. The line break itself is an error in the source data: the continuation should be part of the same `.NOTE` value and should not have been placed on a separate untagged line.
This case therefore should not, by itself, be treated as evidence that the TXT dictionary format needs to support untagged continuation lines or a formal multiline-value syntax.
The source data will be corrected later by the project author. Do not modify `L051953` as part of this task.
Please also check the latest repository state before relying on the older parser behavior described in this question ledger. In particular, ensure that accidental untagged lines are not silently discarded in a way that can cause unnoticed information loss. Any broader policy for malformed or unsupported dictionary input should remain consistent with the project's general requirement that information and semantics must not be silently lost during conversion.
- **Status:** Open

## PAQ-014 — Missing versus explicitly blank dictionary fields

- **Question:** Is an absent dictionary field semantically different from a present field with an empty value for every field, only some fields, or never?
- **Current implementation:** `normalise()` adds required fields (sometimes blank); XML omits some absent optional fields; blank form/kana list behavior is not uniform with singular fields.
- **Project-author notes:**
- **Answer:** An absent dictionary field and a field that is explicitly present with an empty value should be treated as semantically distinct states. Conversion or normalization should therefore not silently collapse one into the other.
Before changing the implementation, inspect the latest dictionary/SYN architecture and the current dictionary data. Determine which fields actually occur with explicitly blank values, which fields are absent, and how the current parsing, normalization, serialization, and format-conversion workflows transform these two states.
In particular, identify any cases where a missing field becomes an explicitly blank field, or where an explicitly blank field becomes absent, during conversion or normalization. Also examine whether the current behavior differs between required fields, optional singular fields, and repeated/list-like fields such as `.FORM` and `.KANA`.
Update this question document with the results of the investigation so that the findings and the current implementation status are preserved alongside this question.
If the TXT source data contains any fields that are explicitly present but have empty values, faithfully document all such cases in the project's data-issue records, including the affected entry, field, location, and relevant context. Do not modify, remove, fill in, or otherwise normalize those source-data cases.
Use these findings to determine how the latest data model should preserve the missing-versus-explicitly-blank distinction consistently across supported representations. The implementation should preserve this semantic distinction losslessly rather than normalizing it away merely for serialization convenience.
Do not modify dictionary source data as part of this investigation. If the investigation reveals questionable or inconsistent source-data cases, document them for review rather than silently changing them.
- **Status:** Open

## PAQ-015 — `.NOTE` and `.NOTES`

- **Question:** Is `.NOTES` a supported alias that should canonicalize to `.NOTE`, or are they intended as distinct formal fields?
- **Current implementation:** both serialize into `<notes>`, and XML → model always produces `.NOTE`, so original spelling/distinction is lost.
- **Project-author notes:**
- **Answer:** `.NOTE` and `.NOTES` are provisionally believed to reflect an editorial inconsistency rather than two intentionally distinct formal dictionary fields. However, this should not yet be treated as a final decision to canonicalize one spelling to the other.
Please inspect the TXT dictionary data and identify every occurrence of `.NOTES`. Faithfully document all such occurrences in the project's data-issue records, including the affected dictionary entry, source location, exact original content, and sufficient surrounding context for later review.
Do not modify, rename, canonicalize, or otherwise normalize any `.NOTES` occurrence in the source data at this stage.
Also review the latest dictionary/SYN architecture and current conversion behavior, including the existing behavior that maps both `.NOTE` and `.NOTES` to the same representation and may therefore lose their original spelling distinction. Preserve the information necessary for lossless conversion until the project author has reviewed the collected cases and the formal status of `.NOTES` has been finalized.
- **Status:** Open

## PAQ-016 — Canonical dictionary entry order

- **Question:** What deterministic order should dictionary entries use: `LemmaID` numeric/suffix order, historical source order, or another editorial order?
- **Context:** the project author wants stable canonical output but has not finalized exact ordering.
- **Current implementation:** serialization uses insertion/source order; `sorted_entries()` provides numeric/suffix order but is not used by serializers.
- **Project-author notes:**
- **Answer:** For exact TXT round-tripping, preserve the original dictionary entry order from the source TXT so that the original serialization can be reproduced faithfully.
For the project's own canonical dictionary serialization, entries should be normalized into a deterministic ascending order by `LemmaID`, from smallest to largest. This canonical ordering should be used consistently across the project's normalized dictionary representations where applicable.
The distinction between these two requirements should be maintained explicitly: preserving source order is a round-trip requirement, whereas ascending `LemmaID` order is the canonical serialization policy. Canonical sorting must not destroy the information needed to reconstruct the original TXT order when exact round-tripping is required.
Please review the latest dictionary/SYN architecture and current serializers when implementing this policy, including the existing `sorted_entries()` behavior, and ensure that the resulting `LemmaID` ordering is deterministic and correctly handles any supported ID suffixes.
- **Status:** Open

## PAQ-017 — Complete canonical dictionary field order

- **Question:** After `.GLOSS`, `.MEANING`, `.FORM`, `.KANA`, and `.POS`, what fixed order should all optional fields use, and how should repeated values be ordered?
- **Current implementation:** `normalise()` fixes only the required prefix and leaves remaining insertion order; XML imposes its own code-defined category order.
- **Project-author notes:**
- **Answer:** Repeated values within dictionary fields have semantically meaningful order, and that order may also encode positional correspondence between repeated values of different fields.
For example, if an entry contains multiple `.FORM` values and multiple `.KANA` values, each `.KANA` may correspond positionally to its associated `.FORM`. The first `.KANA` may belong to the first `.FORM`, the second `.KANA` to the second `.FORM`, and so on. Reordering the `.FORM` values or `.KANA` values independently could therefore break the intended associations and change the meaning of the entry.
For this reason, repeated values must preserve their existing relative order and positional relationships. They must not be independently alphabetized, sorted, deduplicated, regrouped, or otherwise reordered during normalization, canonical serialization, or format conversion.
For the project's canonical dictionary field order, first inspect the current TXT dictionary and the latest dictionary/SYN architecture. Derive the fixed canonical order from the most typical and established field ordering found in the existing TXT dictionary, rather than inventing an unrelated new ordering. Document the resulting complete canonical field order in this question document.
Exact TXT round-tripping must continue to preserve the original field order and all repeated-value ordering and correspondence necessary to reproduce the source faithfully.
The canonical field-order specification should also remain extensible. If a new formal dictionary field appears during future editing that is not yet included in the predefined canonical field order, do not arbitrarily insert it among the established fields. As a deterministic fallback, place all such currently unspecified fields after the established fixed-order fields, ordered alphabetically from A to Z by field name.
Whenever an unrecognized or newly introduced formal field triggers this fallback behavior, record it in the PAQ/question ledger and ask the project author whether the field should be assigned a specific permanent position in the canonical order. Until such a decision is made, retain the alphabetical fallback position.
The alphabetical fallback applies only to the placement of different unspecified field types. It must never reorder repeated values or disrupt positional correspondence between related repeated fields.
- **Status:** Open

## PAQ-018 — Formal word-form character repertoire

- **Question:** Beyond the confirmed ILL special forms, what characters may a formal word form contain: ASCII letters only, Unicode letters/source characters, placeholders such as `x`, punctuation, or other symbols?
- **Current implementation:** `CorpusLine.word_form` accepts only ASCII `A-Z/a-z`.
- **Project-author notes:**
- **Answer:** The complete formal character repertoire for word forms is not yet confirmed. The project author recalls that the relevant data may include kanji/source characters and placeholders, but does not currently remember the full set of permitted forms. Treat this as provisional information rather than a complete specification.
There is also an important semantic distinction behind at least some occurrences of kanji/source characters. When kanji text appears directly in a syntax tree, this often indicates that the source text could not be identified or read with sufficient confidence to provide an accurate transcription. In such cases, the original characters were placed directly into the syntax tree so that the source information would not be lost.
These unresolved source-character forms should not automatically be treated as the same kind of data as ordinary transcribed word forms consisting of letters. The latest data model should be examined to determine whether this distinction is already represented, or whether it needs to be modeled more explicitly. Regardless of the eventual representation, the original source characters are meaningful information and must never be omitted merely because they do not conform to the ordinary alphabetic word-form pattern.
Before changing the validator or formal data model, inspect the latest architecture and the entire corpus. Identify every word form or corresponding syntax-tree form that falls outside the current ASCII `A-Z/a-z` restriction.
Produce a detailed inventory of these cases. Record the actual forms and characters encountered, their source locations, and sufficient surrounding context to support later project-author review. Where the existing data or architecture already makes the distinction clear, also record whether a case represents an ordinary transcription, unresolved/untranscribed source characters, a placeholder, or another existing category. Do not infer such a classification when the evidence does not establish it.
Faithfully document all such cases in the project's data-issue records.
Do not modify any source data during this investigation. Do not independently decide that an observed form is valid, erroneous, or in need of normalization. Likewise, do not simply broaden the ordinary word-form character validator to accept every observed character, since some non-alphabetic forms may represent a semantically different category rather than an expanded spelling repertoire.
The collected evidence will be reviewed later to determine the complete formal repertoire and the appropriate modeling of these different cases. Until that decision is made, preserve all existing information losslessly and keep the distinction between observed corpus usage and formally confirmed permitted syntax explicit.
- **Status:** Open

## PAQ-019 — Unsupported formal-field error policy

- **Question:** When a converter encounters a dictionary/XML field that has been declared formal but lacks a mapping in the current converter version, should conversion fail, produce output with a blocking error report, or preserve an explicit opaque extension?
- **Context:** the project author has decided unsupported formal data should eventually be detectable and unknown undeclared fields need not survive by magic.
- **Current implementation:** unknown TXT lines and XML dictionary children are silently ignored.
- **Project-author notes:**
- **Answer:** Unsupported formal data must never be silently dropped during conversion.
If a field has been declared part of the formal data model but the current converter does not yet have a proper mapping for it, the preferred behavior is to preserve the complete original information through an explicit opaque representation whenever this can be done losslessly.
In that case, conversion may continue, but the converter must clearly report the unsupported formal field and record the case in the project's data-issue records. The opaque representation must preserve enough information to recover the original formal data without loss; it must not merely retain a partial or approximate substitute.
The fact that conversion can continue through an opaque representation must not make the unsupported field invisible. The report and data-issue record should make clear what field was unsupported, where it occurred, how it was preserved, and what converter/model mapping remains to be implemented.
Before implementing new behavior, inspect the latest SYN/XML/dictionary architecture to determine whether an appropriate extension or opaque-preservation mechanism already exists and use the current architecture where possible.
If the converter cannot preserve the unsupported formal data losslessly, it must not silently produce an apparently successful conversion that omits or changes that information. Such a case should instead be surfaced explicitly for further handling.
This policy concerns data that is already recognized as formal data. It should not be interpreted as requiring arbitrary unknown or undeclared input to be automatically promoted into the formal model.
- **Status:** Open

## PAQ-020 — Status of XML container metadata

- **Question:** Which current container attributes are formal model/version data requiring authoring-format mappings—`corpus@filename`, `dictionary@version`, `raw-text@role`, and `roundtrip-data@format`—and which are replaceable implementation metadata?
- **Current implementation:** serializers write fixed/current values; readers mostly do not validate or version behavior from them.
- **Project-author notes:**
- **Answer:** The project author does not currently know whether `corpus@filename`, `dictionary@version`, `raw-text@role`, and `roundtrip-data@format` represent meaningful information that needs to be preserved, or whether some or all of them are merely obsolete, redundant, or replaceable implementation metadata.
Do not assume either interpretation from the attribute names or from their presence in the current XML.
Investigate each attribute individually against the latest project architecture and implementation. For each one, determine and explain:
- where and why it is currently written;
- where, if anywhere, it is currently read;
- whether its value affects parsing, validation, conversion, round-tripping, version compatibility, application behavior, or any other observable semantics;
- whether the information it carries exists elsewhere in the current SYN/TXT/XML model;
- whether removing or changing it would cause any information loss or behavioral change;
- whether the latest architecture already provides a different mechanism for representing the same information; and
- whether there is evidence that it was intended as formal model/version data rather than an XML-specific implementation detail.
Distinguish clearly between evidence from the current implementation/documentation and any architectural recommendation you make. Do not classify an attribute as formal data merely because it currently exists in XML, and do not classify it as disposable merely because the current reader does not use it.
Update this PAQ/question document with the investigation results for each attribute and explain, in terms understandable to the project author, what information the attribute actually represents and what would happen if it were removed.
Do not remove, rewrite, or otherwise modify these metadata fields as part of this investigation. Their final status will be decided by the project author after reviewing the findings.
- **Status:** Open

## PAQ-021 — Exact marker syntax versus regenerable serialization

- **Question:** Must the complete raw numbered marker line—including its original path spelling and position—remain authoritative source syntax, or may a future canonical authoring serializer regenerate an equivalent marker from modeled source text and boundary data?
- **Context:** markers carry semantic source text and real boundaries, while current XML also stores their exact raw lines as round-trip data.
- **Project-author notes:**
- **Answer:** First investigate the latest repository and architecture before finalizing the status of numbered marker lines. In particular, inspect the relevant TODO records, implementation history, and current parsing/conversion code. There was a previously discussed and repaired bug involving these markers, and the repository history should be used to recover the intended behavior rather than inferring it solely from the older description in this PAQ.
If the markers referred to here are constructs such as `18@於保夫祢能` occurring within syntax-tree data, they have at least one function that is more than mere serialization syntax. In some cases, a marker separates syntax-tree branches that should not be grouped under the same branch. This boundary behavior is semantically/structurally important. Please identify the previous bug and its fix, explain how this boundary function is represented in the latest architecture, and make sure that it remains preserved across format conversions.
This structural boundary function should be distinguished from the exact textual serialization of the marker line. Apart from the meaningful information carried by the marker—including source text and any real structural/segment boundary information—the exact marker syntax appears primarily to be information that needs to be retained for round-tripping.
In particular, the existing XML must retain enough round-trip information to reconstruct the original TXT losslessly. Exact marker serialization may therefore be preserved as round-trip data without making every aspect of its original textual spelling part of the canonical semantic model.
After reviewing the repository, determine precisely which aspects of the marker are semantically or structurally meaningful and which exist only to support exact TXT round-tripping. Do not assume that the older PAQ description captures the latest design.
Preserve both categories losslessly: meaningful boundary/source information must survive at the model level, while serialization-specific information required to reconstruct the original TXT must survive as round-trip data. Do not remove or simplify existing marker information until the repository evidence and current architecture establish that doing so is lossless.
Update this PAQ with the investigation results, including the relevant earlier TODO/bug history and how the current implementation represents the marker's boundary behavior.
- **Status:** Open

# Resolved / answered questions

No project-author questions have an explicit answer yet.
