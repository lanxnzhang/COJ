# Dictionary-defined compound audit — 16 October 2026

Audited the same **115 corpus pairs, 5,665 Text blocks and 281,608 syntax nodes** as the [lemma series](../lemma-form-audit-2026-10-16/README.md), at COJ `30b1dfc924acf830cd129a9928eb481fac2e604d`. Only existing dictionary entries with explicit COMPOUND fields are in scope.

The dictionary has **2,605 compound-bearing entries**: 2,530 support the declared direct ordered tests; 75 have incomplete/single-component/self-referential definitions requiring separate treatment. Scanned 14,428 corpus nodes already carrying a compound ID; 7,435 directly conforming occurrences are counted and omitted from findings.

## Findings

| Category | Findings | Status |
|---|---:|---|
| A | 105 | Unambiguous annotation-only candidate |
| B | 3,419 | Review required |
| C | 100 | Unambiguous annotation-only candidate |
| D | 620 | Review required |
| ambiguous_compound_entry | 2 | Review required |
| component_form_review | 2,276 | Review required |
| conflicting_component_ids | 262 | Review required |
| conflicting_mother_id | 29 | Review required |
| definition_limited | 470 | Review required |
| mother_and_component_ids_missing | 461 | Review required |
| non_direct_structure_review | 461 | Review required |

**205 unambiguous correction candidates; 8,000 review-required findings.** Counts are mother/span findings, not necessarily unique sentences or independent errors.

- **A:** Existing annotated compound mother; exact ordered direct component forms; only expected child lemma attributes are missing. The report specifies each missing ID and its exact node/line, preserving all other annotation.
- **B:** Explicit usable dictionary compound represented on a terminal. Review the split, tags and writing representation; none is invented.
- **C:** Existing lexical mother, registered whole form, exact ordered component forms/IDs and one supporting usable definition; only mother ID is absent. Report specifies the mother ID insertion.
- **D:** Adjacent whole sibling span matches an explicit ordered definition and registered compound form without a dedicated lexical mother. All grouping decisions require review.
- **Other categories:** Conflicting IDs, component-form differences, non-direct/nested structures, missing mother plus component annotations, definition limitations and multiple entry candidates remain distinct review-required records. A differing analysis is not itself a confirmed annotation error.

## Evidence and scope

[findings.json](findings.json) contains the full inventory, stable `CS-` identifiers, source/dictionary fingerprints, original TXT rows plus context, physical TXT/XML lines, node and parent structure, exact component locations, literal ordered references, raw dictionary entries and correction instructions where uniquely supported. [finding-index.md](finding-index.md) provides a human-readable index.

A/C certainty is limited to the annotation-only edit supported by the current explicit dictionary definition and observed exact structure. It does not authorize editing or settle broader linguistic analysis. Existing contradictory IDs, uncertain groupings and multiple possible dictionary entries are never silently replaced.

One reference cycle is present: `L051294` (komayama) references `L060355` (koma), whose single COMPOUND field points back to L051294. The latter is already handled as definition-limited. The audit uses direct ordered definitions, so it does not recursively expand this cycle or invalidate the complete two-component komayama definition merely because its component entry points back. No dictionary or corpus change is proposed from that cycle alone.

The scan tests all annotated compound nodes and adjacent whole-sibling spans. It does not infer new compounds from substrings or flatten/rebracket arbitrary nested syntax. Unannotated nested/inflected spans outside literal or independently documented matches cannot be classified reliably by these tests. Definitions with one reference, empty/nonexistent targets, missing forms or direct self-reference are not completed by guesswork. Unattested limited definitions are counted, not dumped into a separate dictionary issue inventory.

Literal COMPOUND qualifiers/targets/forms are preserved in evidence. Empty raw `ref_target=` slots are treated as empty, even if a permissive cross-reference parser would consume the following form as a target. Matching recognizes the expressly authorized boundary-hyphen notation and enumerated/documented citation-form variants; it does not remove internal hyphens, derive new forms or extend enumerated paradigms. See the lemma series for the complete accepted-variant summary and exact dictionary/design evidence.

All source TXT/XML rows and dictionary field maps were cross-checked as described in the lemma series. Physical lines are current COJ locations; imported-source commits and hashes are manifest provenance and must be checked against ONCOJ before any future source correction. Corpus, dictionary, code, registers and TODO were preserved.
