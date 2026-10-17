# MK research: data quality and validation

Read-only study completed 16 October 2026 against COJ `c890931ba128a8b7c92d3f42ed1fc2559917cae3`. Scope: 115 corpus TXT/XML pairs, 5,665 Texts and the current TXT/XML dictionary. Existing source data, documentation and issue registers were not changed.

[Research workbook](../../../../COJ-backup/MK/MK-study-c890931.xlsx) contains the four requested tables and a Methodology sheet. [evidence.json](evidence.json) supplies stable finding IDs, exact TXT/XML locations, original rows, tree/dictionary evidence, source fingerprints, kana sort evidence and validation details. This report is study evidence, not general project policy.

## Results and count definitions

| Output | Scope |
|---|---|
| Table 1: MK occurrences | 1,891 explicit MK occurrences across 379 exact realized forms. |
| Table 2: forms/components | 1,696 component/definition rows covering all 379 forms. Rows represent components of distinct attested structure/lemma variants or separately labeled literal dictionary definitions, not individual text occurrences. |
| Table 3: target distribution | 914 aggregate rows; 1,889 MKs have operationally selected targets, and two MKs are retained in a clearly labeled unassigned-target group. |
| Table 4: same-form candidates | 1,334 non-MK exact-span matches. They are candidates, not errors merely because MK annotation is absent. |

There are 3,225 exact continuous-string matches in total. Each form’s total equals its explicit MK occurrences plus its Table 4 candidates. Matches inside larger terminals/words and across source-line segments are included without changing segmentation. Different MK forms can overlap, so totals across forms are not a count of unique corpus words.

MK frequency counts explicit MK annotations of a form. Total occurrences count exact string spans. Lemma frequency counts each distinct (Text, character span, lemma ID) once, including internal and terminal annotations. MK–target counts aggregate Table 1 by target form/ID and selection type; blank-target counts represent unassigned occurrences, not a known target.

## Confirmed observations and unresolved corrections

| Observation | Evidence and effect on this study | Treatment |
|---|---|---|
| Missing dictionary entry L050124 | Selected target `tosi` after `aratamano`, KK.28; `data/txt/trees/KK.txt:1489`. | Dictionary absence confirmed. Target ID and literal-ID frequency retained; meaning unavailable. Intended replacement remains unresolved. |
| Missing dictionary entry L002015 | Component `tu` inside `mitugurino`, KK.42/43; `KK.txt:2033,2147`. The literal ID has 18 distinct corpus occurrences, including these two MK components. | Dictionary absence confirmed. No replacement inferred; component frequency remains the corpus-wide literal-ID count. |
| Unassigned MK IDs | 10 annotated MK occurrences, grouped into seven form cases in the evidence. | Annotation incompleteness is observed; no ID is supplied by inference. This is not a claim that every MK must already have an ID. |
| Generic MK placeholder | 125 MK occurrences across 82 forms carry L099999, the existing processor’s MK placeholder. | Actual annotations are retained. The placeholder does not establish a form-specific lemma identity or meaning. |
| Repeated same-span lemma annotation | Three cases: FK `twori`/L031258a; MYS.11.2424 `pimokagami`/L090757; MYS.14 `asawo`/L020000. | Confirmed repeated IDs on nested nodes; not automatically erroneous. Each same-span ID counts once, as explicitly requested for this study. |

No linguistic replacement or annotation correction is established by these observations. Missing IDs, generic placeholders and dictionary absence are separate conditions; their counts should not be added into one error total. Detailed cases and exact source contexts are in the JSON evidence. Missing-reference evidence also cross-references the [earlier lemma audit](../lemma-form-audit-2026-10-16/README.md), with its cited file hashes rechecked against current bytes.

## Exact MK/dictionary form differences: review required

Excluding generic-placeholder cases, 20 MK occurrences fall into nine exact form/ID nonmatch groups. This confirms string inequality only; it does not distinguish legitimate variation, a dictionary convention, or an annotation error. No spelling equivalence or correction is invented.

| Realized MK form | Annotated ID | Dictionary FORM | Occurrences |
|---|---|---|---:|
| amatutapu | L091033 | amadutapu | 3 |
| amenaru | L091037 | ameniaru | 1 |
| opopuneno | L020022 | opobuneno | 1 |
| kakwozimono | L080597 | kamozimono | 1 |
| sasutakeno | L020004 | sasutake | 10 |
| turukitati | L090335 | turugitati | 1 |
| papukuduno | L090673 | papukuzuno | 1 |
| makwipasira | L090613 | makwibasira | 1 |
| mwomwosikwino | L091018 | momosikwino | 1 |

## Context and relationship limitations

- KH.2 and KH.7 end with `midukukwino`; no following word exists within either current Text. Table 1 leaves their targets blank; Table 3 retains the two unassigned occurrences. No external context or missing source continuation is inferred.
- Thirteen Table 4 matches cross existing source-line segments. Their complete containing source lines and both endpoint line numbers are retained. Following-line context begins after the ending line, as requested.
- Two `amanopara` candidates (SM.4.40 and SM.5.2) precede the first source-marker/raw-text segment. Their exact transcription spans exist, but source-line numbering/kanji alignment is unavailable. Those fields remain blank with explicit notes and original TXT context in the evidence. This limitation is not classified as an annotation error.
- Nested MK nodes and matches contained in a larger MK expression are retained as their actual distinct form/spans. Only an MK node over the exact matched span counts as explicit MK for that form. No additional decomposition or missing-MK correction is inferred.

Target assignments are the author-approved **temporary operational heuristic for this study only**: prefer the first following reliably identified head/content word, skipping grammatical/function items; otherwise use the immediately following whole word and label it as fallback. Existing word-level groups are preserved (`amayuku`, `opokimi`), rather than selecting internal components. The table evidence identifies the categories/skipped items supporting each estimate. There are 1,880 head/content selections, nine immediate-word fallbacks and two unavailable targets among explicit MKs. These are operational counts, not independently confirmed linguistic relations.

The detailed Methodology sheet/JSON explains the bounded implementation, source-line units, literal matching, dictionary meaning provenance and aggregation. No heuristic was added to existing project documentation, annotation guidelines, models, registers or source data.

## Validation

Independent TXT parsing and in-memory conversion reproduced every stored MK form/ID per Text. Reconstructed TXT and stored XML agree on terminal material and all source-line rows. A separate XML validator recomputed all exact match spans, source/following-line fields, deduplicated lemma frequencies and Table 3 aggregation. Table 1 is complete; Table 4 is disjoint from it; each form’s counts reconcile.

All four tables use the same Japanese gojūon form order: matching dictionary FORM/KANA pairs, otherwise the existing project kana converter, collated with Japanese ja-JP sort keys. All 379 forms have reliable keys; none required the end-of-list fallback. Kana evidence and order are preserved in the JSON.

Every saved workbook cell was compared with the validated tables, including numeric types and blanks. Four native filter tables and frozen headers/identifiers were verified; the formula-error scan returned zero matches. All five sheets and all output-column panels were visually reviewed, including Japanese source text and missing-reference flags. Recorded data/documentation/TODO hashes remain unchanged. The workbook is a fixed research snapshot; it does not refresh corpus data or apply corrections.
