# Special-terminal XML repair proposal after 4f1eada

**Status: unapplied, awaiting user approval.** Parser/model fixes and tests are implemented. No TXT, dictionary or corpus XML has changed.

Browsing/search and SYN import read stored XML. Current XML omits 347 NULL terminals and misrepresents 15 known-source ILL forms. Fixing the TXT parser alone cannot repair those existing views. User instructions in TODO: After commit 4f1eada explicitly require approval before corpus XML changes.

## Proposed repair

Apply the already prepared guarded-import preview with `python scripts/data_conversion/import_primary_txt.py --apply`. Its 45 XML replacements are exactly identical to the [reviewable patch](special-terminals-4f1eada-preview.patch) below; this equality was checked against all staged payloads. The existing importer also updates `data/primary-txt-import.json` to record the new converter fingerprint and output hashes, preserving its source-revision/dirty-data safeguards. Do not manually apply the patch and leave the manifest stale. It replaces only the 305 Text blocks containing NULL,* or non-ASCII ILL source rows, using the corrected parser on unchanged matching TXT blocks. All other blocks retain their existing content. Before/after TXT reconstruction was checked against every affected original block; source line order and encoded material remain the same under existing canonical whitespace rules.

- Insert empty NULL syntax terminals; remove their old roundtrip-comment duplicates and adjust subsequent comment positions to include the added tree rows. Do not put the encoding star in form material.
- Restore non-ASCII ILL forms as WORD form material with original ILL and L099997 assignments; regenerate the affected derived transcription rows. Preserve historical headers independently.
- Preserve numbered marker source payloads, ordering and boundary evidence; preserve trace terminals and their empty forms.
- Leave TXT and dictionary files untouched. This is an explicitly approved conversion repair, not automatic synchronization or a new source-of-truth policy. No linguistic corrections, new tags or identifier changes are proposed.

After approval, verify the patch against current source hashes, apply it, recheck roundtrip and corpus/search/SYN behavior, and update DI-004/005/012 only where the stored implementation/data defects are demonstrably gone. Keep remaining header/content disagreements and deferred retagging decisions open.

## File-by-file scope

Paths are relative to `data/`.

| XML file | NULL terminals | ILL forms |
|---|---:|---:|
| `xml/text/EN_01.xml` | 6 | 0 |
| `xml/text/EN_02.xml` | 4 | 0 |
| `xml/text/EN_03.xml` | 6 | 0 |
| `xml/text/EN_04.xml` | 7 | 0 |
| `xml/text/EN_05.xml` | 4 | 0 |
| `xml/text/EN_06.xml` | 3 | 0 |
| `xml/text/EN_07.xml` | 3 | 0 |
| `xml/text/EN_08.xml` | 4 | 0 |
| `xml/text/EN_12.xml` | 1 | 0 |
| `xml/text/EN_13.xml` | 2 | 0 |
| `xml/text/EN_14.xml` | 1 | 0 |
| `xml/text/EN_15.xml` | 3 | 0 |
| `xml/text/EN_19.xml` | 2 | 0 |
| `xml/text/EN_22.xml` | 1 | 0 |
| `xml/text/EN_23.xml` | 1 | 0 |
| `xml/text/EN_25.xml` | 3 | 0 |
| `xml/text/SM_26.xml` | 2 | 0 |
| `xml/text/SM_41.xml` | 1 | 0 |
| `xml/text/SM_42.xml` | 1 | 0 |
| `xml/text/SM_46.xml` | 3 | 0 |
| `xml/text/SM_51.xml` | 4 | 0 |
| `xml/text/SM_54.xml` | 1 | 0 |
| `xml/text/SM_58.xml` | 2 | 0 |
| `xml/trees/KK.xml` | 12 | 0 |
| `xml/trees/MYS_01.xml` | 7 | 2 |
| `xml/trees/MYS_02.xml` | 12 | 2 |
| `xml/trees/MYS_03.xml` | 13 | 0 |
| `xml/trees/MYS_04.xml` | 14 | 1 |
| `xml/trees/MYS_05.xml` | 4 | 0 |
| `xml/trees/MYS_06.xml` | 8 | 0 |
| `xml/trees/MYS_07.xml` | 10 | 0 |
| `xml/trees/MYS_08.xml` | 15 | 0 |
| `xml/trees/MYS_09.xml` | 7 | 0 |
| `xml/trees/MYS_10.xml` | 19 | 0 |
| `xml/trees/MYS_11.xml` | 21 | 0 |
| `xml/trees/MYS_12.xml` | 22 | 0 |
| `xml/trees/MYS_13.xml` | 16 | 1 |
| `xml/trees/MYS_14.xml` | 27 | 1 |
| `xml/trees/MYS_15.xml` | 9 | 0 |
| `xml/trees/MYS_16.xml` | 5 | 8 |
| `xml/trees/MYS_17.xml` | 13 | 0 |
| `xml/trees/MYS_18.xml` | 9 | 0 |
| `xml/trees/MYS_19.xml` | 13 | 0 |
| `xml/trees/MYS_20.xml` | 11 | 0 |
| `xml/trees/NSK.xml` | 15 | 0 |

## Evidence and decisions

The [read-only audit](special-terminals-4f1eada-audit.json) records counts, current remaining discrepancies and source hashes. DI-001 is already Resolved by 4f1eada's distinct SM.15 IDs. Trace semantics are chief-editor Confirmed; all 243 traces retain zero transcription yield and exact TXT roundtrip. DI-004/005 remain Open while this patch is unapplied; DI-012's trace subcase is Resolved, but its ILL subcase remains Open. General word-form repertoire and future ILL retagging remain open/deferred under their respective registers.

Guarded preview ID: `d23894c435984c71a5f8982b2f094ec2`. Both external source commits remain those recorded in the existing manifest. All 116 source files are unchanged; 45 XML files require replacement, no TXT/dictionary files do. The importer recalculates all XML outputs because conversion code changed; the remaining outputs are identical. No preview blockers or warnings. See the local `.primary-txt-import/preview.txt` and `preview.json`.
