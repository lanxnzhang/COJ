# Lemma-ID and word-form audit — 16 October 2026

Audited COJ `30b1dfc924acf830cd129a9928eb481fac2e604d`: **115 TXT/XML pairs, 5,665 Text blocks, 281,608 syntax nodes, 143,112 lemma-bearing nodes and 6,498 dictionary entries**. Read-only source audit; all findings concern these fingerprinted bytes.

## Results

| Category | Occurrences | Disposition |
|---|---:|---|
| Nonexistent lemma ID | 879 (114 IDs) | Absence confirmed; intended correction requires review |
| Established valid citation-form variants | 4,949 | Summarized below; filtered from individual review records |
| Remaining exact form nonmatches | 22,230 (3,579 groups) | Review required; not an error count |
| Independently confirmed wrong lemma/form association | 0 | No replacement established by this audit |
| Unambiguous correction candidates | 0 | Do not infer replacement from spelling/frequency/ID similarity |

The initial exact nonmatch count was **27,179**, before established-variant filtering. Dictionary citation forms can differ legitimately from corpus realizations. Remaining nonmatches include potentially valid inflections and possible annotation errors; neither exact inequality nor frequency establishes which.

## Inventories and use

- [nonexistent-ids.json](nonexistent-ids.json): complete 879-occurrence inventory, exact absence evidence, original source rows, node/parent context, stable `LF-NI-` identifiers and numeric-family entries for context only.
- [form-review.json](form-review.json): all remaining nonmatches grouped by lemma, actual form, raw tag and internal/terminal role (`LF-FR-` identifiers); every occurrence retains physical TXT/XML lines, original TXT rows with neighbors, source hashes, manifest provenance, attributes and local tree context. Dictionary entries, including POS, ITYPE and all original fields, are deduplicated by ID.
- [form-review-index.md](form-review-index.md): compact navigable group index. Search a group ID in the JSON for its complete correction-review evidence.
- [Compound series](../compound-structure-audit-2026-10-16/README.md): structurally different questions against explicit dictionary compound definitions; overlapping source nodes are not separate confirmed errors.

## Established variation

The summaries below cover the design-recognized pairs (lines 255–256 and 778–781), forms explicitly enumerated in dictionary NOTE fields, and literal FORM boundary-hyphen notation. Exact evidence is recorded for each summary in the JSON. For this read-only audit, the author explicitly approved ignoring only boundary hyphens on enumerated forms; internal hyphens, dots and spaces are preserved. No additional forms or paradigms are derived. Tentative analyses and inferred substrings remain for review.

| Lemma | Citation form | Corpus form | Tag | Node kind | Count |
|---|---|---|---|---|---:|
| L000004 | masi | maseba | VAX-SJV-CND | terminal | 17 |
| L000006a | nu, zu | naku | VAX-NEG-NML | terminal | 205 |
| L000006a | nu, zu | ne | VAX-NEG-EXC | terminal | 15 |
| L000006a | nu, zu | neba | VAX-NEG-PRV | terminal | 97 |
| L000006a | nu, zu | nedo | VAX-NEG-CSS | terminal | 9 |
| L000006a | nu, zu | ni | VAX-NEG-INF | terminal | 72 |
| L000006a | nu, zu | nito | VAX-NEG-GER | terminal | 6 |
| L000006a | nu, zu | zuni | VAX-NEG-GER | terminal | 9 |
| L000006a | nu, zu | zupa | VAX-NEG-CND | terminal | 60 |
| L000006a | nu, zu | zupa | VAX-NEG-IFC | terminal | 5 |
| L000006a | nu, zu | zusite | VAX-NEG-GER | terminal | 42 |
| L000006a | nu, zu | zute | VAX-NEG-GER | terminal | 73 |
| L000015 | ki, si | kye | VAX-MPST-ADN | terminal | 1 |
| L000015 | ki, si | kye | VAX-SPST-STM | terminal | 147 |
| L000015 | ki, si | kyeba | VAX-SPST-CND | terminal | 1 |
| L000015 | ki, si | kyeba | VAX-SPST-PRV | terminal | 2 |
| L000015 | ki, si | kyeku | VAX-SPST-NML | terminal | 3 |
| L000015 | ki, si | seba | VAX-SPST-CND | terminal | 35 |
| L000015 | ki, si | sika | VAX-SPST-EXC | terminal | 7 |
| L000015 | ki, si | sikaba | VAX-SPST-ADN | terminal | 1 |
| L000015 | ki, si | sikaba | VAX-SPST-CND | terminal | 1 |
| L000015 | ki, si | sikaba | VAX-SPST-PRV | terminal | 24 |
| L000015 | ki, si | sikado | VAX-SPST-CSS | terminal | 5 |
| L000015 | ki, si | siku | VAX-SPST-NML | terminal | 25 |
| L000032 | -kari | kari | ACP-IFC | terminal | 2 |
| L000032 | -kari | kari | ACP-STM | terminal | 25 |
| L000033 | -si, -ki, -ke | ke | ACP-ADN | terminal | 6 |
| L000033 | -si, -ki, -ke | ke | ACP-STM | terminal | 1 |
| L000033 | -si, -ki, -ke | ki | ACP-ADN | terminal | 1132 |
| L000033 | -si, -ki, -ke | ki | VAX-CLS | terminal | 1 |
| L000033 | -si, -ki, -ke | ku | ACP-INF | terminal | 1168 |
| L000033 | -si, -ki, -ke | kupa | ACP-CND | terminal | 19 |
| L000033 | -si, -ki, -ke | kute | ACP-GER | terminal | 15 |
| L000033 | -si, -ki, -ke | kye | ACP-ADN | terminal | 12 |
| L000033 | -si, -ki, -ke | kye | ACP-STM | terminal | 86 |
| L000033 | -si, -ki, -ke | kyeba | ACP-CND | terminal | 3 |
| L000033 | -si, -ki, -ke | kyeba | ACP-PRV | terminal | 7 |
| L000033 | -si, -ki, -ke | kyedo | ACP-CSS | terminal | 20 |
| L000033 | -si, -ki, -ke | kyeku | ACP-INF | terminal | 1 |
| L000033 | -si, -ki, -ke | kyeku | ACP-NML | terminal | 75 |
| L000033 | -si, -ki, -ke | kyere | ACP-EXC | terminal | 1 |
| L000033 | -si, -ki, -ke | kyereba | ACP-PRV | terminal | 14 |
| L000033 | -si, -ki, -ke | kyeredo | ACP-CSS | terminal | 1 |
| L000033 | -si, -ki, -ke | si | ACP-CLS | terminal | 496 |
| L000034 | -mi | mi | ACP-INF | terminal | 471 |
| L000039 | -sa | sa | ACP-EXC | terminal | 52 |
| L030718a | kototopi | kotodopi | VB-INF | internal | 5 |
| L030996a | takayuki | takayuku | VB-ADC | internal | 2 |
| L031336a | nipope | nipopuredo | VB-CSS | terminal | 1 |
| L031463a | pikageri, pigakeri | pigakeru | VB-ADC | internal | 1 |
| L031544a | pupumi, popomi | popom | VB-STM | terminal | 1 |
| L031840a | yuki | yuku | VB-ADC | terminal | 253 |
| L031840a | yuki | yuku | VB-ADN | terminal | 1 |
| L031840a | yuki | yuku | VB-CLS | terminal | 1 |
| L031840a | yuki | yuku | VB-INF | terminal | 1 |
| L031964a | kose | kosene | VB-OPT | terminal | 3 |
| L031964a | kose | koso | VB-IMP | terminal | 53 |
| L031964a | kose | kosu | VB-ADC | terminal | 2 |
| L031964a | kose | kosu | VB-CLS | terminal | 6 |
| L031965 | no, ni, n | nasu | COP-SEM | terminal | 74 |
| L031965 | no, ni, n | nisite | COP-GER | terminal | 56 |
| L031965 | no, ni, n | nite | COP-GER | terminal | 8 |
| L031965 | no, ni, n | nito | COP-GER | terminal | 1 |
| L031965 | no, ni, n | nosu | COP-SEM | terminal | 8 |
| L050528 | yamasakura | yamasakurabana | N | internal | 2 |

## Method and limits

Every syntax node carrying a lemma was checked, including internal lexical nodes. Actual internal forms are ordered child yields; terminal forms use the model’s whole node form, including multipart writing representations. Every dictionary FORM alternative is accepted. Beyond the expressly approved boundary-hyphen notation for enumerated forms, no Unicode, punctuation, whitespace, case or morphological normalization is performed. Empty realizations, if any, are explicitly classified rather than assumed to be lexical errors.

Complete dictionary TXT/XML field maps agree. Every nonblank physical TXT row equals the corresponding XML-model reconstructed row in order across all 115 corpus pairs; source mapping therefore handles duplicate rows and block markers without spelling search. Source/dictionary SHA-256 and syntax-only zero-based node addresses identify exact audited locations; text IDs alone need not be unique.

Source hashes/commit/path are manifest-recorded provenance, not a claim about the current external ONCOJ working tree. Physical line numbers refer to COJ; verify upstream bytes before later corrections. Replacement IDs are not guessed from numeric families. The old `no` / `L090824` example is absent from the current data: its sole occurrence is now `ye` at `data/txt/trees/KK.txt:1154`, matching dictionary `ye` (`dictionary.txt:63498`); it is therefore not retained as a current mismatch.

These are review reports, not patches or adopted editorial decisions. No source data, dictionary, implementation, existing register or TODO was changed by the audit.
