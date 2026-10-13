# Open / provisional / deferred questions

This is the default question ledger. Original project-author answers are retained verbatim. An answered policy is separate from whether it has been implemented; provisional understandings and postponed decisions remain open. Only explicitly designated chief-editor questions belong in that ledger.

Rechecked 13 October 2026 at `3b8d060`. Current code/data take precedence over historical register descriptions. Stage 1–3 `.syn.json` authoring is implemented; general legacy export and SYN dictionary serialization are not. Complete read-only corpus/dictionary evidence is in [data-investigation-2026-10-13.json](data-investigation-2026-10-13.json); it records exact lines/context and diagnostic methods. No source correction was made.

## PAQ-001 — Operational authority of TXT and XML

- **Question:** Given that TXT is the current human authoring representation and XML the computational representation, which direction is the normal checked-in editing workflow today, and what event makes the other representation current?
- **Context:** `README.md` currently calls XML “canonical (primary)” and TXT “derived,” while the clarified conceptual model deliberately avoids treating either serialization as the semantic model.
- **Current implementation:** The normal corpus update is committed ONCOJ TXT — COJ TXT/generated XML via the guarded importer. Stage 1–3 Editing saves version-2 corpus Documents as `.syn.json`, separately from corpus publication. `LegacyCorpus.open()` is read-only and retains original TXT/XML. Dictionary Save still writes XML directly; no SYN dictionary codec or general SYN TXT/XML export/synchronization exists.
- **Project-author notes:**
- **Answer:** This question may already have been partially resolved by more recent changes to the program and its data model. First inspect the current project state and determine whether newer documentation, formats, conversion workflows, or implementation decisions already answer part of this question. Do not assume that the description in this question ledger still reflects the latest design.
As a general policy, human authors will normally edit TXT or the newly designed SYN format rather than XML.
If XML is modified directly, those changes should ultimately be synchronized back to TXT rather than leaving the representations semantically divergent. However, direct XML editing is not expected to be a common or important workflow at the current stage of the project. Based on the latest state of the project, propose an appropriate workflow for handling such cases rather than introducing unnecessary machinery solely for a currently unlikely scenario.
The overriding requirement is that conversion between the supported representations must preserve all information and semantics without loss. Decisions about operational authority and synchronization should be made in service of that requirement.

- **Status:** Partially answered — authoring/preservation policy established; exceptional workflow proposed for review

### Investigation / decision history (13 October 2026)

Established author policy: normally author TXT/SYN, reconcile exceptional direct XML edits back to TXT, and preserve all information/semantics across supported representations. This is a requirement, not a claim that current converters are universally lossless.

**Workflow proposal for author review:** treat an exceptional XML edit as a reviewable change proposal; retain its original/base versions, convert only an isolated copy to TXT, compare it against retained original TXT and known conversion limits, then explicitly incorporate confirmed changes into the ONCOJ authoring source and use the normal guarded import. Do not silently overwrite corpus TXT or waive baseline conflicts. No automatic synchronization or new machinery is proposed here. Dictionary conversion gaps (DI-003/DI-011/PAQ-015) must be checked before accepting such a conversion. [Current Stage 1–3 design](../design/authoring/syntax-tree-authoring-design.md) supersedes older independent-header/parallel-tree proposals.

## PAQ-002 — Exact `<raw-text>` regeneration and conflict policy

- **Question:** When regenerating derived `<raw-text>`, should segment source text and boundaries always come from numbered roundtrip markers while transcription always comes from recognized tree forms, and should any mismatch with an existing `<raw-text>` be an error, warning, or silent regeneration?
- **Context:** the project-author decision establishes that `<raw-text>` is derived and not independently authoritative, but the exact validation behavior is not yet stated.
- **Example:** an XML editor could change a leaf form without changing existing `<raw-text>/<transcription>`.
- **Current implementation:** Legacy TXT → XML derives numbered source rows from recognized markers and transcription from recognized forms. XML → TXT ignores stored raw-text when reconstructing paths. SYN corpus opening retains both the stored rows and full original XML/TXT; it reports header/passage or passage/hierarchy discrepancies without replacing either. General SYN legacy export/regeneration is not implemented.
- **Project-author notes:**
- **Answer:** This question should first be re-evaluated against the latest project design and implementation. In particular, inspect the current SYN/TXT/XML model and conversion workflows to determine the present roles of numbered markers, source text, segment boundaries, recognized tree forms, and `<raw-text>`. Do not assume that the regeneration scheme proposed in this question still accurately describes the current architecture.
As a design principle, `<raw-text>` is derived data and should not require independent human maintenance. It should follow the authoritative content represented by the syntax tree and/or the human-edited and confirmed source representation. If `<raw-text>` can be deterministically and losslessly reconstructed from that information, the program should regenerate it automatically rather than requiring users to keep a separate copy synchronized by hand.
Direct human editing of XML is not expected to be a normal workflow, so the conflict scenario involving a manually edited XML tree and stale `<raw-text>` should not drive the overall design. After examining the latest project state, determine an appropriate validation and regeneration policy consistent with the current architecture.
As with PAQ-001, the important requirement is preservation of information and semantics across representations. Derived data should remain consistent with the underlying authoritative content without creating an additional human-maintained source of truth.
- **Status:** Partially answered — derived-data principle established; regeneration/conflict recommendation awaits review

### Investigation / decision history (13 October 2026)

Author principle established: raw-text is derived and must not need independent human maintenance. In the legacy path, marker payload/order and recognized tree forms supply it; DI-004/DI-006 show why this is not a complete lossless reconstruction for all current inputs. In SYN, independently confirmed source/transcription passages and input-to-node links coexist with historical_header and compatibility records. Stored source characters cannot be recovered from transcribed forms alone.

**Recommendation for review, not an adopted conflict policy:** regenerate a derived view automatically only when the complete source/tree mapping is deterministic and information-preserving; retain original information and report unresolved mapping/conflicts otherwise. Reconcile/edit the authoritative content explicitly rather than asking users to edit raw-text. The current corpus adapter already records mismatches. TXT → XML header discrepancy reporting is governed only by PAQ-006; policies for other directions remain unspecified. No raw-text validator/regenerator was added.

## PAQ-004 — `MYS_19` attached marker syntax

- **Question:** What was intended by `IP-EPT.18@於保夫祢能,*` in `data/txt/trees/MYS_19.txt:3838`: a marker `18@於保夫祢能` after parent path `...,IP-EPT`, a literal unusual tag, or something else?
- **Current implementation:** The malformed line remains at current `data/txt/trees/MYS_19.txt:3839`, in MYS.19.4220. It is retained as a raw comment but does not match the numbered-marker/boundary recognizers.
- **Project-author notes:**
- **Answer:** The occurrence `IP-EPT.18@於保夫祢能,*` in `data/txt/trees/MYS_19.txt:3838` is believed to be a typo in the original TXT data. The intended form is:
`IP-EPT,18@於保夫祢能,*`
In other words, `IP-EPT` and the marker `18@於保夫祢能` should have been separated by a comma rather than joined with a period.
Record this case in the project's data-issue records, but do not modify the source data yet. Any actual correction requires explicit project-author confirmation before it is applied.
Please also inspect the corpus for other occurrences of the same or similar malformed marker syntax. Faithfully document every relevant case in the data-issue records, including the original data, its location, the surrounding context needed for review, and any evidence indicating what may be wrong.
Do not correct any of these cases during this investigation. Even if a case appears to be an obvious typo and the intended form seems clear, record the finding and leave the source unchanged until explicit project-author confirmation is given.
- **Status:** Provisional — probable typo recorded; correction awaits explicit confirmation

### Investigation / decision history (13 October 2026)

The full scan found one malformed numbered-marker line, the existing MYS.19.4220 case (DI-006). Author's probable correction is IP-EPT,18@於保夫祢能,*; it is a belief/proposal, not permission to apply. Exact line and neighbors are in the inventory. No other similar numeric-@ attached-marker syntax was found by the reported scan.

## PAQ-005 — `SM_29` bare star line

- **Question:** What was intended by `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*` in `data/txt/text/SM_29.txt:110`?
- **Current implementation:** The bare-star line remains at `data/txt/text/SM_29.txt:110`, source ID `2_SM_29` (XML SM.29.2). It is retained in roundtrip metadata, without a recognized source segment or boundary.
- **Project-author notes:**
- **Answer:** The line `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*` in `data/txt/text/SM_29.txt:110` is believed to be an editing error in the source data. However, the intended content is currently unknown.
Do not attempt to infer, reconstruct, or propose what the original intended content might have been.
Record this case faithfully in the project's data-issue records. Please also inspect the corpus for other occurrences of the same or similar bare-star anomalies and record all such cases in the data-issue records, preserving the original data, location, and sufficient surrounding context for later project-author review.
This investigation is strictly for identification and documentation. Do not modify, normalize, repair, or otherwise alter any affected source data. Any interpretation or correction must wait for explicit project-author review and confirmation.
- **Status:** Open — intended content unknown; investigation complete

### Investigation / decision history (13 October 2026)

One bare-star anomaly remains after excluding normal numbered markers and the separately registered 347 NULL,* lines: the existing SM.29.2 case (DI-006). Original line and neighbors are recorded. Its intended content is unknown; no reconstruction or proposed replacement was inferred.

## PAQ-007 — Formal status of `*T*`

- **Question:** Is `*T*` a formally modeled syntax terminal/trace with defined attributes and search behavior, or only a legacy TXT token that must round-trip literally?
- **Context:** permissive current path handling can preserve it, but the repository evidence does not establish its full intended model.
- **Current implementation:** 243 TXT lines in 182 texts/25 documents contain *T*. XML stores `_T_` with raw_tag="*T*", empty form/phon; path reconstruction and tree tag payloads retain it, while ordinary recognized transcription omits it. SYN retains the category and original snapshots, not a formal trace schema.
- **Project-author notes:**
- **Answer:** `*T*` is provisionally understood to be a marker representing a trace and likely belongs to the annotation system rather than being merely an arbitrary legacy TXT token.
However, this interpretation has not yet been confirmed with the chief editor. Treat it as a provisional understanding, not as a final project-author decision about the formal model.
Please inspect the current corpus and the latest architecture to document how `*T*` is currently represented, preserved, converted, and handled by relevant syntax/search functionality. Do not introduce a new formal model, change its semantics, or modify source data on the basis of the provisional interpretation alone.
The project author will seek further confirmation from the chief editor before its exact formal status and behavior are finalized. In the meantime, existing occurrences and their information must continue to be preserved losslessly across relevant format conversions.
- **Status:** Provisional — chief-editor confirmation pending; current representation investigated

### Investigation / decision history (13 October 2026)

The provisional trace understanding is retained, with chief-editor confirmation to be sought by the author; no new CEQ ID or formal semantics were assigned. DI-012 holds the full inventory and links to DI-004 for non-ASCII ILL material. Current raw_tag preservation/tree search is implementation evidence, not a formal trace model. No source, model or search behavior was changed.

## PAQ-008 — Distinction suffixes on writing-mode tags

- **Question:** When a source has a value such as `LOG;@2`, does `;@2` distinguish annotation components in the same sense that it distinguishes syntax nodes, or is it a separate historical convention?
- **Current implementation:** 14 current TXT lines contain `LOG;@2`; XML uses `phon="LOG" phon_index="2"`, and reconstruction restores the suffix. SYN imports phon_index as annotation metadata, including part-level attributes. This storage does not settle its meaning.
- **Project-author notes:**
- **Answer:** The exact meaning and formal status of suffixes such as `;@2` in values such as `LOG;@2` are currently uncertain. Do not assume that they have the same semantics as distinction suffixes on syntax nodes, and do not infer their semantics from the current XML representation alone.
Please inspect the corpus and identify every occurrence of `LOG;@2`. Faithfully document all such occurrences in the project's data-issue records, including their exact source data, locations, and sufficient surrounding context for later review.
Do not modify, normalize, reinterpret, or otherwise alter any of these occurrences. This task is for documentation only. The formal meaning of `;@2` will be determined separately after further review.
In the meantime, existing conversion behavior should continue to preserve this information losslessly.
- **Status:** Open — semantics unconfirmed; occurrence inventory complete

### Investigation / decision history (13 October 2026)

Every occurrence with exact original line, source ID and adjacent lines is in DI-010/the inventory. The suffix's semantics remain uncertain. No normalization or interpretation was applied.

## PAQ-009 — Long-term status of legacy EN/SM source IDs

- **Question:** Are IDs such as `1_EN_01` and `1_SM_15` temporary authoring IDs expected eventually to be replaced by dotted IDs, or must both the legacy spelling and canonical dotted ID remain indefinitely addressable?
- **Current implementation:** The legacy converter derives dotted XML IDs and preserves TXT IDs in roundtrip-data@source-id. SYN retains scholarly IDs, complete block records and separate hidden Text identities. Dotted EN/SM IDs remain provisional under the author answer.
- **Project-author notes:**
- **Answer:** This question should remain open for later resolution.
EN and SM have not yet been fully edited, and dotted IDs such as `EN.1.1` are currently provisional IDs introduced for use in XML. Their current use should therefore not be interpreted as establishing the project's final or canonical identifier scheme.
Do not make a long-term design decision yet about whether legacy IDs such as `1_EN_01` must remain permanently addressable, whether dotted IDs should replace them, or what the final canonical ID system for EN and SM should be.
Preserve the information necessary to avoid losing the existing identifiers and revisit this question after the editing and identifier design for EN and SM have been finalized.
- **Status:** Deferred — identifier design/editing pending

### Investigation / decision history (13 October 2026)

Deferred by the author until EN/SM editing and identifier design are finalized. Preserve both source spelling and provisional dotted identity. Duplicate SM IDs remain DI-001/PAQ-011, not a reason to invent an identifier policy.

## PAQ-011 — Duplicate `1_SM_15` correction

- **Question:** Which of the two texts currently labeled `1_SM_15` should receive a different ID, and what should that ID be?
- **Context:** see DI-001 for both headers and locations.
- **Current implementation:** The duplicate remains: TXT lines 108 and 192 both identify `1_SM_15`; XML has two SM.15.1 blocks. Legacy lookup takes the first. SYN opening uses distinct hidden identities keyed by block position and preserves both scholarly IDs.
- **Project-author notes:**
- **Answer:** First inspect the current repository to determine whether the duplicate `1_SM_15` issue still exists in the latest data.
If the duplicate remains, make sure it is faithfully documented in the project's data-issue records, including both affected texts, their locations, and the resulting identifier/lookup conflict. Do not assign a new ID to either text and do not modify the source data at this stage.
As noted in PAQ-009, SM has not yet been fully edited, and the current dotted IDs such as `SM.15.1` are provisional identifiers used for XML rather than a finalized identifier scheme. It would therefore be premature to decide which of the two texts should receive a different ID or what that replacement ID should be.
Keep this issue open and preserve all existing identifier information. The actual correction should be made later, after the editing of SM and the design of its final identifier system have been resolved and explicitly reviewed.
- **Status:** Deferred — duplicate persists; no replacement ID authorized

### Investigation / decision history (13 October 2026)

DI-001 remains open with both text locations/headers. The current SYN adapter preserves two independent Text identities, so it avoids collapsing the blocks internally; this does not resolve the scholarly ID collision or legacy lookup ambiguity. Correction is explicitly deferred with PAQ-009.

## PAQ-015 — `.NOTE` and `.NOTES`

- **Question:** Is `.NOTES` a supported alias that should canonicalize to `.NOTE`, or are they intended as distinct formal fields?
- **Current implementation:** No `.NOTES` field occurs in the current TXT dictionary. The mapping still merges NOTE/NOTES into `<notes>` and reads it back as NOTE. A synthetic NOTES probe confirms spelling loss; no current source occurrence was renamed during this investigation.
- **Project-author notes:**
- **Answer:** `.NOTE` and `.NOTES` are provisionally believed to reflect an editorial inconsistency rather than two intentionally distinct formal dictionary fields. However, this should not yet be treated as a final decision to canonicalize one spelling to the other.
Please inspect the TXT dictionary data and identify every occurrence of `.NOTES`. Faithfully document all such occurrences in the project's data-issue records, including the affected dictionary entry, source location, exact original content, and sufficient surrounding context for later review.
Do not modify, rename, canonicalize, or otherwise normalize any `.NOTES` occurrence in the source data at this stage.
Also review the latest dictionary/SYN architecture and current conversion behavior, including the existing behavior that maps both `.NOTE` and `.NOTES` to the same representation and may therefore lose their original spelling distinction. Preserve the information necessary for lossless conversion until the project author has reviewed the collected cases and the formal status of `.NOTES` has been finalized.
- **Status:** Provisional — alias status unconfirmed; no current NOTES occurrences

### Investigation / decision history (13 October 2026)

The requested current source inventory is empty. No source data needs renaming on the evidence of this scan. Alias semantics remain provisional despite zero present cases. Current XML merges NOTE and NOTES and canonicalizes back to NOTE, losing a possible source distinction; SYN's original corpus snapshot does not provide a dictionary-specific restoration layer.

## PAQ-017 — Complete canonical dictionary field order

- **Question:** After `.GLOSS`, `.MEANING`, `.FORM`, `.KANA`, and `.POS`, what fixed order should all optional fields use, and how should repeated values be ordered?
- **Current implementation:** Current dictionary has 21 observed field types. Source-pattern/pair-precedence evidence is recorded below and in the inventory; it does not establish a consistent complete canonical order. The XML serializer uses a separate hard-coded category order, while normalise() only fixes the required prefix.
- **Project-author notes:**
- **Answer:** Repeated values within dictionary fields have semantically meaningful order, and that order may also encode positional correspondence between repeated values of different fields.
For example, if an entry contains multiple `.FORM` values and multiple `.KANA` values, each `.KANA` may correspond positionally to its associated `.FORM`. The first `.KANA` may belong to the first `.FORM`, the second `.KANA` to the second `.FORM`, and so on. Reordering the `.FORM` values or `.KANA` values independently could therefore break the intended associations and change the meaning of the entry.
For this reason, repeated values must preserve their existing relative order and positional relationships. They must not be independently alphabetized, sorted, deduplicated, regrouped, or otherwise reordered during normalization, canonical serialization, or format conversion.
For the project's canonical dictionary field order, first inspect the current TXT dictionary and the latest dictionary/SYN architecture. Derive the fixed canonical order from the most typical and established field ordering found in the existing TXT dictionary, rather than inventing an unrelated new ordering. Document the resulting complete canonical field order in this question document.
Exact TXT round-tripping must continue to preserve the original field order and all repeated-value ordering and correspondence necessary to reproduce the source faithfully.
The canonical field-order specification should also remain extensible. If a new formal dictionary field appears during future editing that is not yet included in the predefined canonical field order, do not arbitrarily insert it among the established fields. As a deterministic fallback, place all such currently unspecified fields after the established fixed-order fields, ordered alphabetically from A to Z by field name.
Whenever an unrecognized or newly introduced formal field triggers this fallback behavior, record it in the PAQ/question ledger and ask the project author whether the field should be assigned a specific permanent position in the canonical order. Until such a decision is made, retain the alphabetical fallback position.
The alphabetical fallback applies only to the placement of different unspecified field types. It must never reorder repeated values or disrupt positional correspondence between related repeated fields.
- **Status:** Partially answered — preservation/fallback settled; full order expressly left open

### Investigation / decision history (13 October 2026)

Author policy settled for relative repeated-value order/positional correspondence and alphabetical placement of unspecified field types after established fields. Do not sort/deduplicate repeated values.

**Project-author clarification (13 October 2026):** record supported order evidence, conflicts and non-co-occurring pairs; leave those positions open. Do not infer a complete canonical order to resolve cycles or fill gaps. No ordering implementation was changed.

#### Observed field-order evidence — not a complete canonical specification

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

The cycle is NOTE → ITYPE (91/67), ITYPE → COMPOUND (450/0), COMPOUND → NOTE (162/52). No topological or alphabetical tie-break is being substituted for an author decision about these established fields. Full observed patterns and every pair count are in [the inventory](data-investigation-2026-10-13.json), dictionary.order_patterns / dictionary.pair_precedence. `.NOTES` and `.MKTARGETNEW` are recognized by code but absent in current source; their fixed positions are not established by this corpus scan. Alphabetical fallback for unspecified field types is the author policy, not permission to reorder repeated values or pretend a complete fixed order exists.

## PAQ-018 — Formal word-form character repertoire

- **Question:** Beyond the confirmed ILL special forms, what characters may a formal word form contain: ASCII letters only, Unicode letters/source characters, placeholders such as `x`, punctuation, or other symbols?
- **Current implementation:** The inventory finds 15 non-ASCII ILL final-field forms and 243 trace-like `*T*` lines. The five ASCII x-based ILL forms pass current word-form recognition. No further nonalphabetic final-field candidates were found under the documented scan rule. Non-ASCII ILL forms still become raw_tag-bearing nested elements rather than recognized lexical forms.
- **Project-author notes:**
- **Answer:** The complete formal character repertoire for word forms is not yet confirmed. The project author recalls that the relevant data may include kanji/source characters and placeholders, but does not currently remember the full set of permitted forms. Treat this as provisional information rather than a complete specification.
There is also an important semantic distinction behind at least some occurrences of kanji/source characters. When kanji text appears directly in a syntax tree, this often indicates that the source text could not be identified or read with sufficient confidence to provide an accurate transcription. In such cases, the original characters were placed directly into the syntax tree so that the source information would not be lost.
These unresolved source-character forms should not automatically be treated as the same kind of data as ordinary transcribed word forms consisting of letters. The latest data model should be examined to determine whether this distinction is already represented, or whether it needs to be modeled more explicitly. Regardless of the eventual representation, the original source characters are meaningful information and must never be omitted merely because they do not conform to the ordinary alphabetic word-form pattern.
Before changing the validator or formal data model, inspect the latest architecture and the entire corpus. Identify every word form or corresponding syntax-tree form that falls outside the current ASCII `A-Z/a-z` restriction.
Produce a detailed inventory of these cases. Record the actual forms and characters encountered, their source locations, and sufficient surrounding context to support later project-author review. Where the existing data or architecture already makes the distinction clear, also record whether a case represents an ordinary transcription, unresolved/untranscribed source characters, a placeholder, or another existing category. Do not infer such a classification when the evidence does not establish it.
Faithfully document all such cases in the project's data-issue records.
Do not modify any source data during this investigation. Do not independently decide that an observed form is valid, erroneous, or in need of normalization. Likewise, do not simply broaden the ordinary word-form character validator to accept every observed character, since some non-alphabetic forms may represent a semantically different category rather than an expanded spelling repertoire.
The collected evidence will be reviewed later to determine the complete formal repertoire and the appropriate modeling of these different cases. Until that decision is made, preserve all existing information losslessly and keep the distinction between observed corpus usage and formally confirmed permitted syntax explicit.
- **Status:** Open — formal repertoire/categories require review; inventory complete

### Investigation / decision history (13 October 2026)

Complete observed inventory: DI-012 (258 candidate lines: 243 *T* and 15 non-ASCII ILL), with exact forms/Unicode code points/context; ILL examples remain DI-004. The author's explanation of some source-character forms as unresolved/untranscribed material is provisional/category evidence, not a universal assignment to every character form. Trace and ILL inventories remain separate from an approved ordinary spelling repertoire. No validator was broadened.

## PAQ-020 — Status of XML container metadata

- **Question:** Which current container attributes are formal model/version data requiring authoring-format mappings—`corpus@filename`, `dictionary@version`, `raw-text@role`, and `roundtrip-data@format`—and which are replaceable implementation metadata?
- **Current implementation:** Current corpus roots are `<document>`, not `<corpus>` (115 documents). The four attribute roles are investigated individually below; their final formal/implementation classification remains the author's decision.
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
- **Status:** Open — attribute evidence recorded; author classification pending

### Investigation / decision history (13 October 2026)

See the attribute investigation table below. Generic snapshot retention is distinct from a formal bidirectional attribute mapping. None of these attributes was removed, renamed or rewritten. Reader indifference alone is not evidence that an attribute is disposable; final classification remains open. Generic XML inspection and attribute-based search (including the abandoned compreditor services) can still expose these names/values; the absence of dedicated version/role/format dispatch does not mean removing an attribute would leave every XML display, search or serialized byte unchanged.

#### Individual XML attribute investigation

| Attribute | Current writes/reads and observable effect | Redundancy / alternative; decision still open |
|---|---|---|
| `document@filename` (question's historical `corpus@filename`) | All 115 current roots are document. `CorpusDocument.from_text()` / `_get_doc_elem()` write filename; `_from_elem()` reads it; from_file falls back to disk basename only if missing. treditor document metadata returns it. Removing/changing it can change model filename/API metadata and later serialized output, even though syntax/IDs are not reconstructed from it. | It is a source/display filename, not a model schema version. Path and SYN Document name/origin also identify context but are not automatically equivalent to its exact value. Legacy opening stores the original XML. Whether exact spelling is formal remains undecided. |
| `dictionary@version` | dictionary_to_xml always writes 1.0. dictionary_from_xml does not inspect it, dispatch schemas or validate it; model → XML resets any alternative value to 1.0. No current parsing branch changes when it changes. | Existing value looks like an XML format label, but there is no documented version migration contract. Corpus SYN schema_version=2 is validated and is not a dictionary version replacement. No SYN dictionary mapping exists; original value is not retained by the dictionary model. Formal/version status awaits author review. |
| `raw-text@role` | `_utterance_to_elem()` writes processing; all 5,665 current blocks have it. Readers find raw-text/sentence by element names, not by role. Changing/removing role does not select another current processing path; its element content remains displayed/imported. XML-backed retention and SYN original snapshots can retain the bytes. | It states the view is derived, already established conceptually. Independent source passages and hierarchy in SYN distinguish content from projections without this attribute, but no legacy export equivalence is implemented. Author decides whether the label itself must survive formally. |
| `roundtrip-data@format` | `_utterance_to_elem()` writes coj-txt for all 5,665 blocks. `_roundtrip_comments()` and `_source_sentence_id()` read the container and positioned raw/source-id values without reading format. Changing/removing format alone does not stop current comment/ID restoration; removing the container or its contents would lose meaningful reconstruction information. | It labels preserved TXT bookkeeping. SYN compatibility snapshots retain the original container; no complete typed export adapter exists. The importer's normalization.format check is a different field, not a reader of roundtrip-data@format. No formal compatibility/version dispatch for this attribute is implemented; classification remains open. |

Evidence: `src/coj/core/corpus.py`, `src/coj/xml/dictionary_xml.py`, `treditor/app.py`, `src/coj/authoring/{legacy,model,persistence}.py`; scanned XML values are in the inventory. Recommendation only: keep all attributes for now; define bidirectional treatment when legacy export is designed, rather than remove fields based solely on reader behavior.

# Resolved / answered questions

Complete answers and investigation history are retained here under their original IDs. Follow-up implementation work or source corrections listed below are not implicitly authorized by this register update.

## PAQ-003 — Meaning of numbered marker labels

- **Question:** Are marker numbers (`0@`, `3@`, etc.) meaningful source labels that must remain unchanged, or can a canonical authoring serializer renumber them while preserving segment order, source text, and boundaries?
- **Context:** current data has gaps and restarts; for example `MYS.3.276b` has marker labels `0, 3, 4, 0, 1`.
- **Current implementation:** Original labels remain in positioned raw comments; legacy raw-text rows receive consecutive numbers from 1. SYN passages have ordered identities and retain `legacy_number`; no semantic role for that number is imposed by the new model.
- **Project-author notes:**
- **Answer:** Marker numbers are not semantically meaningful source labels. The meaningful information is the segment order, source text, and segment boundaries.
The irregular marker sequence in `MYS.3.276b` (`0, 3, 4, 0, 1`) is believed to be an error in the original TXT data. The intended sequence is `0, 1, 2, 3, 4`. However, do not modify the source data as part of this investigation. Record this case along with the other findings described below and wait for explicit project-author confirmation before making any correction.
There is an important distinction between exact TXT round-tripping and canonical serialization. When performing an exact TXT round-trip, if the original marker syntax has been retained as round-trip data, the original marker labels should also be preserved so that the input can be reproduced faithfully. This preservation requirement does not make the labels semantically meaningful.
For the project's own canonical/normalized representations, including XML and SYN, marker numbers may be regenerated or renumbered as needed, provided that segment order, source text, boundaries, and all other meaningful information are preserved without loss.
Please inspect the corpus for all numbered-marker sequences containing gaps, unexpected restarts, or other numbering irregularities. Faithfully report every such case and document it in the project's data-issue records with enough detail for project-author review.
This investigation must not modify or correct any source data. Even when an irregularity appears very likely to be an error and its intended correction seems obvious, report and document it rather than changing it. All corrections to the source data require explicit project-author confirmation first.
- **Status:** Answered — numbering policy; recorded source corrections await explicit confirmation

### Investigation / decision history (13 October 2026)

Scanned all 37,707 recognized numbered markers in 5,665 TXT blocks. Ten texts have nonconsecutive/out-of-order sequences under the diagnostic zero-based consecutive-label convention (DI-009). MYS.3.276b still has 0,3,4,0,1. The author considers 0,1,2,3,4 intended but has not authorized a source correction. Labels are not semantic; source order/text and real boundaries are semantic. Exact retained TXT labels must still round-trip, while canonical renumbering may be regenerated without losing meaningful data.

## PAQ-006 — Resolving header/tree content discrepancies

- **Question:** What review procedure and authority should resolve the 30 content discrepancies in DI-007, and should future conversion merely report them or refuse output until reviewed?
- **Context:** the project author has decided that both layers are meaningful and content should not normally differ.
- **Current implementation:** Current XML scan: 5,665 texts; 640 exact header/tree matches, 5,013 segmentation-only differences and 12 content discrepancies. SYN opening records historical-header/passage mismatches. The legacy converter does not yet automatically report/register every header/tree discrepancy.
- **Project-author notes:**
- **Answer:** First inspect the current repository state and the relevant data-issue history. The previously identified header/tree content discrepancies, including the 30 cases referred to by DI-007, may already have been corrected. Verify their current status rather than assuming that the cases described in this question ledger are still present. Do not reintroduce or modify data merely to match the older issue description.
Also review the latest architecture, including the current SYN/TXT/XML model and conversion workflows, before deciding how header/tree consistency validation should be integrated into the implementation.
As a general policy for future discrepancies, when the program detects inconsistent content between meaningful representations or layers such as the header and tree content, it should report the inconsistency and faithfully record it in the project's data-issue records with sufficient information for later review. The converter should nevertheless continue the conversion rather than treating the discrepancy itself as a blocking error.
Detection and reporting must not silently resolve the discrepancy, choose one side as correct, or modify the affected source data. Any actual data correction should remain a separate, explicitly reviewed decision.
- **Status:** Answered — TXT → XML policy scoped; reporting implementation pending

### Investigation / decision history (13 October 2026)

DI-007 is revalidated: 21 of the historical 30 texts no longer fail the same comparison, nine still fail, and three additional current discrepancies were not in the historical list. Original historical evidence remains labeled as history. No source correction was made.

**Project-author scope clarification (13 October 2026):** report/register discrepancies and continue applies **specifically and only to TXT → XML**. It does not establish policy for XML → TXT or any other conversion. SYN reviewed write-back/export retains its existing blocking rules for unresolved discrepancies. The converter's automatic report/register step is still an implementation gap; the read-only audit here is not that implementation.

## PAQ-010 — Semicolon suffixes in text IDs

- **Question:** What formal metadata is encoded by suffixes such as `MYS.14.3352;azuma_uta`, and should a future model store the base text ID and label as separate fields?
- **Current implementation:** Existing XML retains the complete semicolon-delimited ID. SYN retains the same scholarly text_id and original block; no separate typed field for azuma_uta is implemented. Search supports the base alias and suffix fragments.
- **Project-author notes:**
- **Answer:** In an ID such as `MYS.14.3352;azuma_uta`, the suffix `azuma_uta` represents 東歌 (あずまうた), i.e. a textual category/label associated with the passage. It should not be understood as an inseparable part of the underlying passage ID `MYS.14.3352`.
A future data model may therefore represent the base text ID and this label as separate fields rather than encoding both pieces of information in a single semicolon-delimited identifier.
However, do not change the current data, IDs, or serialization yet. Preserve the existing representation losslessly for now. The separation should be considered as part of a later data-model design change rather than applied immediately.
- **Status:** Answered — conceptual label distinction; later model design deferred

### Investigation / decision history (13 October 2026)

Author identifies azuma_uta as a textual category/label distinct conceptually from MYS.14.3352. A future separate representation is permitted for consideration, not mandated now. Current complete IDs remain unchanged; future separation must preserve information and addressability.

## PAQ-012 — Duplicate dictionary ID `L080539`

- **Historical question:** Should Shibi/`sibi` and Hegomori/`pyegomori` be separate entries, and which entry should retain `L080539`?
- **Context:** see DI-002.
- **Current implementation:** Resolved in imported data since 5558e2a: Shibi/sibi is L080725, Hegomori/pyegomori is L080539; both are present in TXT and XML. No duplicate dictionary ID exists among the current 6,498 headings. The parser still replaces duplicate TXT IDs if a new collision is introduced.
- **Project-author notes:**
- **Answer:** First inspect the current repository and relevant data-issue history to determine whether the duplicate dictionary ID `L080539` involving Shibi/`sibi` and Hegomori/`pyegomori` has already been resolved.
Do not assume that the behavior described in this question ledger—where the latter entry silently replaced the former during TXT parsing and only Hegomori remained in XML—still reflects the current implementation or data.
If the issue has already been resolved, report its current status and retain the relevant decision/history in the data-issue record.
If the issue remains unresolved, preserve and, where necessary, update the data-issue record so that the duplicate, the affected entries, and any resulting data-loss or conversion behavior are faithfully documented.
Do not independently decide which entry should retain `L080539`, do not assign or invent a replacement ID, and do not modify the dictionary data. Any such correction requires explicit project-author review and confirmation.
- **Status:** Resolved in current data — historical allocation verified, no new decision made

### Investigation / decision history (13 October 2026)

The source/import history already supplied L080725; this review did not allocate or endorse a new identifier. DI-002 is moved to resolved history, retaining the original collision and the residual parser behavior. This is a verified data resolution, not evidence that the parser prevents future duplicate loss.

## PAQ-013 — Multiline dictionary value syntax

- **Question:** Was the second line of L051953 intended as a continuation of `.NOTE`, and should current TXT formally support continuation lines (if so, by what syntax)?
- **Context:** see DI-003.
- **Current implementation:** The untagged continuation remains at dictionary.txt:47926, after `.NOTE` at :47925 for L051953. `_parse_block()` silently skips the continuation; XML note still ends at `Omodaka 1984.17:`. The importer checks counts/root/reload, not all skipped physical lines.
- **Project-author notes:**
- **Answer:** The second line associated with `L051953` is intended to be a continuation of the `.NOTE` value. The line break itself is an error in the source data: the continuation should be part of the same `.NOTE` value and should not have been placed on a separate untagged line.
This case therefore should not, by itself, be treated as evidence that the TXT dictionary format needs to support untagged continuation lines or a formal multiline-value syntax.
The source data will be corrected later by the project author. Do not modify `L051953` as part of this task.
Please also check the latest repository state before relying on the older parser behavior described in this question ledger. In particular, ensure that accidental untagged lines are not silently discarded in a way that can cause unnoticed information loss. Any broader policy for malformed or unsupported dictionary input should remain consistent with the project's general requirement that information and semantics must not be silently lost during conversion.
- **Status:** Answered — erroneous line break; source correction and reporting implementation pending

### Investigation / decision history (13 October 2026)

Author confirms an accidental physical line break, not formal multiline syntax. DI-003 stays open for later author correction. The full dictionary scan found exactly one untagged nonempty entry line, this continuation. No broad continuation syntax or parser repair is implemented in this register-only task. Silent dropping remains an implementation gap under PAQ-019.

## PAQ-014 — Missing versus explicitly blank dictionary fields

- **Question:** Is an absent dictionary field semantically different from a present field with an empty value for every field, only some fields, or never?
- **Current implementation:** Current source contains two explicitly blank `.MEANING` values; 6,498 entry-model TXT → XML → model comparisons preserve current parsed fields. This does not cover the skipped DI-003 line or exact field syntax. Synthetic probes still lose blank optional singular fields and orphan KANA; normalise() changes missing-field states.
- **Project-author notes:**
- **Answer:** An absent dictionary field and a field that is explicitly present with an empty value should be treated as semantically distinct states. Conversion or normalization should therefore not silently collapse one into the other.
Before changing the implementation, inspect the latest dictionary/SYN architecture and the current dictionary data. Determine which fields actually occur with explicitly blank values, which fields are absent, and how the current parsing, normalization, serialization, and format-conversion workflows transform these two states.
In particular, identify any cases where a missing field becomes an explicitly blank field, or where an explicitly blank field becomes absent, during conversion or normalization. Also examine whether the current behavior differs between required fields, optional singular fields, and repeated/list-like fields such as `.FORM` and `.KANA`.
Update this question document with the results of the investigation so that the findings and the current implementation status are preserved alongside this question.
If the TXT source data contains any fields that are explicitly present but have empty values, faithfully document all such cases in the project's data-issue records, including the affected entry, field, location, and relevant context. Do not modify, remove, fill in, or otherwise normalize those source-data cases.
Use these findings to determine how the latest data model should preserve the missing-versus-explicitly-blank distinction consistently across supported representations. The implementation should preserve this semantic distinction losslessly rather than normalizing it away merely for serialization convenience.
Do not modify dictionary source data as part of this investigation. If the investigation reveals questionable or inconsistent source-data cases, document them for review rather than silently changing them.
- **Status:** Answered — semantic presence distinction; implementation gaps documented

### Investigation / decision history (13 October 2026)

See DI-011 and the complete blank/missing/normalization inventory. Exactly two source blanks are MEANING for L080104 (:48838) and L091024 (:54326); both survive current XML mapping. GLOSS/MEANING/FORM/KANA are absent in L050830; POS is absent in L080156, L099997 and L050830. In-memory normalization adds POS=[] to the first two and adds required fields to L050830 (including GLOSS="" and KANA=[""]). An empty list is present in memory but emits no repeated TXT line, so it cannot faithfully retain a present-empty field state.

Synthetic probes distinguish preservation from current source usage: blank GLOSS/MEANING/POS/NOTE survive; blank CORRESP disappears; KANA without FORM disappears; FORM without KANA creates a blank KANA; extra KANA values beyond FORM are ignored. Indexed fields are accumulated/sorted by index and singular repeats overwrite, rather than preserving every physical occurrence. Corpus SYN does not define dictionary fields yet. Future explicit presence and ordered-value mappings are required by the author policy; implementation/fixtures were not changed.

## PAQ-016 — Canonical dictionary entry order

- **Question:** What deterministic order should dictionary entries use: `LemmaID` numeric/suffix order, historical source order, or another editorial order?
- **Context:** the project author wants stable canonical output but has not finalized exact ordering.
- **Current implementation:** Serializers use insertion order; sorted_entries() is not called by the TXT/XML serializers. LemmaID comparison orders by (numeric part, suffix, prefix), deterministically placing an unsuffixed ID before its a/b suffixes. SYN currently has no dictionary serializer.
- **Project-author notes:**
- **Answer:** For exact TXT round-tripping, preserve the original dictionary entry order from the source TXT so that the original serialization can be reproduced faithfully.
For the project's own canonical dictionary serialization, entries should be normalized into a deterministic ascending order by `LemmaID`, from smallest to largest. This canonical ordering should be used consistently across the project's normalized dictionary representations where applicable.
The distinction between these two requirements should be maintained explicitly: preserving source order is a round-trip requirement, whereas ascending `LemmaID` order is the canonical serialization policy. Canonical sorting must not destroy the information needed to reconstruct the original TXT order when exact round-tripping is required.
Please review the latest dictionary/SYN architecture and current serializers when implementing this policy, including the existing `sorted_entries()` behavior, and ensure that the resulting `LemmaID` ordering is deterministic and correctly handles any supported ID suffixes.
- **Status:** Answered — canonical/source-order policies; implementation pending

### Investigation / decision history (13 October 2026)

Author policy settled: source order for exact TXT restoration; deterministic ascending LemmaID order for canonical output; preserve the information needed for the former. Existing numeric/suffix comparator is evidence of available implementation, not proof serializers implement that policy. Any mixed-prefix tie convention not expressly specified by the author remains to be reviewed before changing serialization.

## PAQ-019 — Unsupported formal-field error policy

- **Question:** When a converter encounters a dictionary/XML field that has been declared formal but lacks a mapping in the current converter version, should conversion fail, produce output with a blocking error report, or preserve an explicit opaque extension?
- **Context:** the project author has decided unsupported formal data should eventually be detectable and unknown undeclared fields need not survive by magic.
- **Current implementation:** All 21 currently observed dictionary field types have XML mappings, but unknown tags/children are still ignored, and DI-003 untagged input is skipped. SYN has generic compatibility/annotations and full original corpus snapshots, not an implemented dictionary opaque-extension or export guarantee.
- **Project-author notes:**
- **Answer:** Unsupported formal data must never be silently dropped during conversion.
If a field has been declared part of the formal data model but the current converter does not yet have a proper mapping for it, the preferred behavior is to preserve the complete original information through an explicit opaque representation whenever this can be done losslessly.
In that case, conversion may continue, but the converter must clearly report the unsupported formal field and record the case in the project's data-issue records. The opaque representation must preserve enough information to recover the original formal data without loss; it must not merely retain a partial or approximate substitute.
The fact that conversion can continue through an opaque representation must not make the unsupported field invisible. The report and data-issue record should make clear what field was unsupported, where it occurred, how it was preserved, and what converter/model mapping remains to be implemented.
Before implementing new behavior, inspect the latest SYN/XML/dictionary architecture to determine whether an appropriate extension or opaque-preservation mechanism already exists and use the current architecture where possible.
If the converter cannot preserve the unsupported formal data losslessly, it must not silently produce an apparently successful conversion that omits or changes that information. Such a case should instead be surfaced explicitly for further handling.
This policy concerns data that is already recognized as formal data. It should not be interpreted as requiring arbitrary unknown or undeclared input to be automatically promoted into the formal model.
- **Status:** Answered — lossless preservation/reporting policy; mapping behavior still incomplete

### Investigation / decision history (13 October 2026)

The author's policy is recorded as given: losslessly preserve declared formal unsupported data opaquely where possible, report/register it, and otherwise surface it explicitly for further handling. The answer does not decide a particular failure/opaque schema for nonpreservable cases, and does not promote arbitrary unknown input into formal data. Whole original corpus snapshots in SYN are an existing retention mechanism but no supported edited-export mapping is implemented; no dictionary opaque codec exists. Synthetic unknown-field disappearance and DI-003 show remaining gaps. All current observed field types map, but the in-memory field roundtrip scan excludes unparsed lines and does not prove exact TXT identity.

## PAQ-021 — Exact marker syntax versus regenerable serialization

- **Question:** Must the complete raw numbered marker line—including its original path spelling and position—remain authoritative source syntax, or may a future canonical authoring serializer regenerate an equivalent marker from modeled source text and boundary data?
- **Context:** markers carry semantic source text and real boundaries, while current XML also stores their exact raw lines as round-trip data.
- **Current implementation:** Marker parent paths attach transient `_syntax_boundaries_before` to the next CorpusLine. `_build_children()` stops same-tag grouping at the marker parent depth. XML retains the separate hierarchy and positioned raw comments; SYN retains that hierarchy, passage links and original TXT/XML, but general legacy export remains pending.
- **Project-author notes:**
- **Answer:** First investigate the latest repository and architecture before finalizing the status of numbered marker lines. In particular, inspect the relevant TODO records, implementation history, and current parsing/conversion code. There was a previously discussed and repaired bug involving these markers, and the repository history should be used to recover the intended behavior rather than inferring it solely from the older description in this PAQ.
If the markers referred to here are constructs such as `18@於保夫祢能` occurring within syntax-tree data, they have at least one function that is more than mere serialization syntax. In some cases, a marker separates syntax-tree branches that should not be grouped under the same branch. This boundary behavior is semantically/structurally important. Please identify the previous bug and its fix, explain how this boundary function is represented in the latest architecture, and make sure that it remains preserved across format conversions.
This structural boundary function should be distinguished from the exact textual serialization of the marker line. Apart from the meaningful information carried by the marker—including source text and any real structural/segment boundary information—the exact marker syntax appears primarily to be information that needs to be retained for round-tripping.
In particular, the existing XML must retain enough round-trip information to reconstruct the original TXT losslessly. Exact marker serialization may therefore be preserved as round-trip data without making every aspect of its original textual spelling part of the canonical semantic model.
After reviewing the repository, determine precisely which aspects of the marker are semantically or structurally meaningful and which exist only to support exact TXT round-tripping. Do not assume that the older PAQ description captures the latest design.
Preserve both categories losslessly: meaningful boundary/source information must survive at the model level, while serialization-specific information required to reconstruct the original TXT must survive as round-trip data. Do not remove or simplify existing marker information until the repository evidence and current architecture establish that doing so is lossless.
Update this PAQ with the investigation results, including the relevant earlier TODO/bug history and how the current implementation represents the marker's boundary behavior.
- **Status:** Answered — source/boundary/roundtrip distinction; complete SYN export mapping pending

### Investigation / decision history (13 October 2026)

Historical fix recovered: TODO After commit a36a1af identified BS.1's two NP-ADV constituents accidentally merged across CP-FINAL marker rows. Commit 4cc54dd restored 4,020 marker-derived boundaries (report: 26,105 unique annotation lines, 1,818 passages, 105 XML documents; 4,089 additional separated nodes). `reports/kanji_marker_boundaries.md`, the repeatable migration and TestKanjiMarkerSyntaxBoundaries retain the evidence.

Current marker parent path means a new **child below that parent**, not a split of the parent named in the marker; `_starts_new_syntax_child()` and `_build_children()` enforce this. Numbers themselves are not semantic under PAQ-003; source text/order, segment events and constituent separation are meaningful. Exact path spelling, marker labels and positioned raw lines are needed for retained TXT reproduction. XML retains both hierarchy and roundtrip comments; SYN imports hierarchy and whole original bytes but has no complete marker-event export adapter. Do not simplify existing preservation merely because some bookkeeping might eventually be derivable.
