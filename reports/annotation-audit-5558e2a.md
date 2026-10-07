# Corpus annotation audit after commit 5558e2a

Audited on 7 October 2026 against commit `5558e2a18a4b6d5b96bf166d9c8f279319f1c1fc`.

**Report only. No corrections are approved or applied.** The project author's clarification superseded the original request to correct corpus data and update the guideline. The existing guideline, corpus, dictionary, application code and TODO are left unchanged.

## Evidence and scope

The audit uses:

- The original questions in `D:\Lanxin\Downloads\tag-questions-for-chief-editor.docx` and the response in `D:\Lanxin\Downloads\tag-questions-for-chief-editor + BF.docx`.
- The accompanying Editor-in-Chief reply in TODO's “After commit 5558e2a”: an NP can have an NP head; find further phrase tags beneath word tags; defer EN and SM correction.
- The current [annotation guideline](../docs/annotation-guidelines.md), its documented category lists, and the TXT/XML structures already imported at the audited commit.

Both DOCX documents were inspected structurally, including their paragraphs and tracked-change/comment parts. Neither contains tracked insertions/deletions or a comments part. The audit uses extracted document text and XML structure, not rendered pages; no page numbers or visual-layout claims are used.

The scan covers 27 uploaded-tree documents and 88 EN/SM documents, with their 115 TXT counterparts. Dictionary files, experimental run copies and historical corpus versions are not counted. No external source repository is changed.

## How to use the accompanying files

[Label proposals](label-proposals-5558e2a.json) contains 21 text-specific records: 19 spelling/label proposals and two substantive root-label proposals. Each record supplies exact current and proposed TXT lines, surrounding context, XML locations, annotation paths, confidence and remaining uncertainty. MYS.6.996 has two apposition nodes but one text-specific label record.

[Phrase-under-word findings](phrase-under-word-5558e2a.json) contains all 310 structural findings, including the EN/SM cases deferred for later review. It supplies the text ID, source ID line, TXT and XML file paths, source excerpts, word/phrase tags, form yields and individual XML addresses.

Locations refer to this snapshot. Lines are numbered from 1. An XML child address starts with the block's zero-based ordinal and then actual child positions, including metadata children. It is a snapshot locator, not a permanent scholarly node identifier.

TXT context ranges are context spans, not instructions to replace every line in the span. Matching context ignores distinction labels, so repeated sibling paths may share a context span. The exact XML address and annotation path distinguish those cases. Concatenated form yields are locator strings, not approved segmentation outputs.

The primary authoring files live outside COJ: uploaded-tree TXT corresponds to `D:\Lanxin\Desktop\ONCOJ\oncoj_source\trees\`; EN/SM TXT corresponds to `D:\Lanxin\Desktop\ONCOJ\senmyo_norito_project\EN_SM_trees_table\`. Verify the external source version before using COJ line numbers there. See [the existing import workflow](../docs/primary-txt-import.md).

## High-confidence spelling and label corrections

These are separate from changes to constituent structure. None has been applied.

### Explicitly confirmed by the Editor-in-Chief

- `ADV-WH → WH-ADV`: nine nodes in nine texts; 27 TXT rows. The response states that WH-ADV is correct and ADV-WH is wrong.
- `NLPOG → NLOG`: one writing-mode attribute in MYS.6.1047; one TXT row. The response explicitly identifies the misspelling.
- `APP-NP → NP-APP`: two nodes in MYS.6.996; three TXT rows. The response identifies NP-APP as correct. This label change alone does **not** resolve the incorrect enclosing N; see AS-001.

| Proposal | Text | Current → proposed | TXT location |
| --- | --- | --- | --- |
| LC-008 | MYS.1.29a | `ADV-WH → WH-ADV` | data/txt/trees/MYS_01.txt:1307, 1308, 1309 |
| LC-009 | MYS.1.29b | `ADV-WH → WH-ADV` | data/txt/trees/MYS_01.txt:1467, 1468, 1469 |
| LC-010 | MYS.2.162 | `ADV-WH → WH-ADV` | data/txt/trees/MYS_02.txt:3210, 3211, 3212 |
| LC-011 | MYS.2.167a | `ADV-WH → WH-ADV` | data/txt/trees/MYS_02.txt:3593, 3594, 3595 |
| LC-012 | MYS.2.167b | `ADV-WH → WH-ADV` | data/txt/trees/MYS_02.txt:3874, 3875, 3876 |
| LC-013 | MYS.2.217 | `ADV-WH → WH-ADV` | data/txt/trees/MYS_02.txt:8619, 8620, 8621 |
| LC-014 | MYS.3.443 | `ADV-WH → WH-ADV` | data/txt/trees/MYS_03.txt:7371, 7372, 7373 |
| LC-015 | MYS.3.460 | `ADV-WH → WH-ADV` | data/txt/trees/MYS_03.txt:7934, 7935, 7936 |
| LC-016 | MYS.6.996 | `APP-NP → NP-APP` | data/txt/trees/MYS_06.txt:3448, 3449, 3450 |
| LC-017 | MYS.6.1047 | `NLPOG → NLOG` | data/txt/trees/MYS_06.txt:5099 |
| LC-019 | MYS.13.3326 | `ADV-WH → WH-ADV` | data/txt/trees/MYS_13.txt:6887, 6888, 6889 |

### Additional high-confidence spelling candidates

The following eight single-node cases use case, letter-order or abbreviation variants of documented labels. These are spelling inferences, **not explicit Editor-in-Chief approvals**. Five are in EN and remain deferred. Their full source context and proposed lines are in the label-proposal file.

| Proposal | Text | Current → proposed | TXT location | Basis |
| --- | --- | --- | --- | --- |
| LC-001 | EN.2.1 | `VB-iNF → VB-INF` | data/txt/text/EN_02.txt:207 | Case-only variant of VB-INF |
| LC-002 | EN.5.1 | `VB-IMO → VB-IMP` | data/txt/text/EN_05.txt:270 | Final-letter candidate for documented imperative IMP; tamape supports the proposal |
| LC-003 | EN.6.1 | `ADJ-STN → ADJ-STM` | data/txt/text/EN_06.txt:134 | Final-letter candidate for documented stem STM |
| LC-004 | EN.8.1 | `VB-STN → VB-STM` | data/txt/text/EN_08.txt:442 | Final-letter candidate for documented stem STM |
| LC-005 | EN.27.7 | `VB-sTM → VB-STM` | data/txt/text/EN_27.txt:858 | Case-only variant of VB-STM |
| LC-018 | MYS.8.1518a | `IP_ADV → IP-ADV` | data/txt/trees/MYS_08.txt:2882, 2883 | Underscore instead of the documented hyphen |
| LC-020 | MYS.20.4360 | `ADJ-STEM → ADJ-STM` | data/txt/trees/MYS_20.txt:2118 | Expanded STEM instead of documented STM |
| LC-021 | NSK.26 | `mulit-sentence → multi-sentence` | data/txt/trees/NSK.txt:833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849 | Transposed letters in multi |

The list is deliberately narrow. Other unusual labels are not silently treated as typographical errors. Approval should specify the proposed replacement, especially for non-case-only variants.

## Substantive annotation issues

### AS-001 MYS.6.996 apposition and enclosing noun

**Status:** open; label spelling is confirmed, full tree replacement needs confirmation.

Source: `data/txt/trees/MYS_06.txt:3448–3450`. XML: `data/xml/trees/MYS_06.xml:11334–11344`, inside `CP-FINAL/IP-SUB/NP-SBJ/IP-EMB/NP-SBJ`. Label proposal: LC-016.

Current relevant tree:

```text
NP-SBJ
└── N
    ├── APP-NP
    │   └── N (PFX-HON mi + N tami)
    └── APP-NP;@2
        └── PRO-N ware
```

The Editor-in-Chief explicitly says NP-APP is correct and the N above the apposition is wrong. The additional reply confirms that an NP can have an NP head. Revised MYS.2.150 also provides a current example without a word-level N enclosing the appositional phrases.

**Recommended proposal, medium confidence:** rename APP-NP to NP-APP and replace the enclosing N with NP:

```text
NP-SBJ
└── NP
    ├── NP-APP
    │   └── N (PFX-HON mi + N tami)
    └── NP-APP;@2
        └── PRO-N ware
```

**Alternative requiring confirmation:** remove the enclosing N and attach the two NP-APP constituents directly to NP-SBJ. The response does not choose between replacement and removal. Retain child order, component forms, lemma IDs and the existing distinction label in either approved solution.

### AS-002 KH.27 root label

**Status:** confirmed incorrect label; replacement proposed, not confirmed. Proposal LC-006.

TXT: `data/txt/trees/KH.txt:590–612`. These are all 23 root-prefixed source rows; the proposal file lists each exact row and replacement.

Current structure:

```text
multi-clause
├── IP-MAT (nezumi no ipye ... piki kiri idasu)
└── CP-FINAL (yotu to ipu ka swore)
```

The response explicitly calls multi-clause a mistake. **Recommended replacement, medium confidence:** multi-sentence, preserving the two ordered children and all annotations. It is an established grouping label in the corpus, unlike the rejected label. The response does not explicitly name the replacement or exclude a more substantial restructuring; confirm before implementation.

### AS-003 KK.91 root label

**Status:** confirmed incorrect label; replacement proposed, not confirmed. Proposal LC-007.

TXT: `data/txt/trees/KK.txt:3780–3863`. These are all 84 root-prefixed rows.

Current structure:

```text
multi-clause
├── IP-MAT                    kusakabye ... pabirokumakasi
├── IP-MAT;@2                 moto ni pa ... ikumi pa nezu
├── IP-MAT                    tasimidake ... winezu
└── CP-FINAL                  noti mo ... apare
```

**Recommended replacement, medium confidence:** multi-sentence, preserving the ordered children and all existing distinction labels. The same evidence and uncertainty as AS-002 apply.

Two separate IP-MAT nodes have the same displayed index in current XML. They must not be merged during a future label correction: marker-derived boundaries and document order remain meaningful.

## Phrase tags beneath word tags

### Search definition and totals

The scan starts with documented word-category bases and searches downward for the first NP, PP, IP, CP or CONJP boundary. Documented-style hyphen suffixes are included as a search heuristic, not a declaration that every suffix combination is approved. Unclassified intermediate wrappers are traversed without assigning them a meaning.

CP-N is excluded because its classification is unresolved. APP-NP is not silently reclassified as NP-APP; its MYS.6.996 issue is documented separately above. Other unknown aliases may therefore need a later, editorially expanded scan.

A phrase nested beneath an already reported phrase is not counted again unless another word-category ancestor intervenes. This keeps the result focused on where word/phrase structure first crosses the boundary.

| Corpus group | Boundaries | Texts | Treatment |
| --- | ---: | ---: | --- |
| Uploaded trees | 12 | 12 | Review the individual structures below |
| EN/SM | 298 | 64 | Report only; correction deferred |
| Total | 310 | 76 | No automatic corrections |

Of the 310 boundaries, 17 are immediate word-to-phrase edges and 293 pass through intervening unclassified wrappers. Every record is included in the JSON file.

A match is **not proof of an annotation error**. In particular, epithets or lexicalized names may intentionally contain internal phrase structure. The confirmed segmentation rule still stops at phrase-level or higher boundaries; it does not itself authorize rewriting the corpus.

### Uploaded-tree cases

#### PW-299 MYS.3.443

TXT: `data/txt/trees/MYS_03.txt:7273–7278`. XML word subtree: `data/xml/trees/MYS_03.xml:23698–23712`; first phrase: lines 23699–23704.

Current path: `CP-FINAL/IP-SUB/IP-ADV/IP-ARG/ADJ-INF/CONJP`. Word-ancestor material: `tapirakekumasakiku`; phrase material: `tapirakeku`.

```text
7273: CP-FINAL,IP-SUB,IP-ADV,IP-ARG,ADJ-INF,CONJP,ADJ-INF,ADJ-STM,L007184,LOG,tapirake
7274: CP-FINAL,IP-SUB,IP-ADV,IP-ARG,ADJ-INF,CONJP,ADJ-INF,ACP-INF,L000033,NLOG,ku
7275: CP-FINAL,IP-SUB,IP-ADV,IP-ARG,ADJ-INF,27@間幸座与,*
```

Coordination is enclosed by ADJ-INF. The other coordinated adjective remains its sibling, so this is not simply an isolated extra CONJP wrapper. Determine whether the outer word label or coordination placement is wrong; no particular replacement is established.

Proposed action: Review whether the outer ADJ-INF incorrectly treats coordination as a word, or whether CONJP placement is wrong. No particular replacement label is established by the available response.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-300 MYS.3.478

TXT: `data/txt/trees/MYS_03.txt:8917–8920`. XML word subtree: `data/xml/trees/MYS_03.xml:28944–28959`; first phrase: lines 28945–28952.

Current path: `multi-sentence/IP-MAT;@4/IP-ADV/IP-NMZ-OB1/NP-SBJ/N/CONJP`. Word-ancestor material: `wemapipurumapi`; phrase material: `wemapi`.

```text
8917: multi-sentence,IP-MAT;@4,IP-ADV,IP-NMZ-OB1,NP-SBJ,N,CONJP,N,L031931b,LOG,wema
8918: multi-sentence,IP-MAT;@4,IP-ADV,IP-NMZ-OB1,NP-SBJ,N,CONJP,N,L031931b,PHON,pi
8919: multi-sentence,IP-MAT;@4,IP-ADV,IP-NMZ-OB1,NP-SBJ,N,N,L051833,LOG,puru
```

The outer N groups coordinated nominal material: wemapi and purumapi. An NP parent is a plausible alternative under the confirmed NP-head rule.

Proposed action: Consider changing the outer N to NP, preserving CONJP and both coordinated nominal components. This is a proposal, not an established correction.

Confidence: high for the observed structure; medium for replacing the outer N with NP. Status: editorial confirmation required; not applied.

#### PW-301 MYS.5.804b

TXT: `data/txt/trees/MYS_05.txt:876–877`. XML word subtree: `data/xml/trees/MYS_05.xml:3070–3075`; first phrase: lines 3071–3073.

Current path: `multi-sentence/IP-MAT;@6/NP-SBJ/N/CONJP`. Word-ancestor material: `wemapimaywobiki`; phrase material: `wemapi`.

```text
876: multi-sentence,IP-MAT;@6,NP-SBJ,N,CONJP,DVN,L031931b,PHON,wemapi
877: multi-sentence,IP-MAT;@6,NP-SBJ,N,N,L050918,PHON,maywobiki
```

The outer N groups wemapi and maywobiki through a CONJP child and a sibling N. An NP parent is a plausible alternative.

Proposed action: Consider changing the outer N to NP, preserving CONJP, DVN wemapi and N maywobiki. This is a proposal, not an established correction.

Confidence: high for the observed structure; medium for replacing the outer N with NP. Status: editorial confirmation required; not applied.

#### PW-302 MYS.6.923

TXT: `data/txt/trees/MYS_06.txt:668–687`. XML word subtree: `data/xml/trees/MYS_06.xml:2284–2292`; first phrase: lines 2285–2290.

Current path: `multi-sentence/IP-MAT/IP-ADV/VB-INF/NP`. Word-ancestor material: `awokakigomori`; phrase material: `awokaki`.

```text
668: multi-sentence,IP-MAT,IP-ADV,VB-INF,NP,N,L050206,ADJ-STM,L007042,LOG,awo
669: multi-sentence,IP-MAT,IP-ADV,VB-INF,NP,N,L050206,N,L050141,LOG,kaki
670: multi-sentence,IP-MAT,IP-ADV,VB-INF,VB-INF,L030744a,LOG,gomori
```

The NP encloses awo+kaki inside VB-INF alongside gomori. This resembles the earlier KK.30 structure, whose NP was removed in the imported revision. Analogy alone cannot decide whether this case is also a compound word.

Proposed action: Consider removing the NP wrapper inside VB-INF while retaining its N child and the sibling VB-INF gomori, by analogy with revised KK.30. Confirm compound-word analysis first.

Confidence: high for the observed structure; medium for the analogy; removal of NP still needs confirmation. Status: editorial confirmation required; not applied.

#### PW-303 MYS.10.2250

TXT: `data/txt/trees/MYS_10.txt:12004–12007`. XML word subtree: `data/xml/trees/MYS_10.xml:38506–38517`; first phrase: lines 38507–38515.

Current path: `IP-MAT/P-ADV/IP-NMZ`. Word-ancestor material: `akitakarumade`; phrase material: `akitakaru`.

```text
12004: IP-MAT,P-ADV,IP-NMZ,NP-OB1,N,L080586,N,L050032,LOG,aki
12005: IP-MAT,P-ADV,IP-NMZ,NP-OB1,N,L080586,N;@2,L050097,LOG,ta
12006: IP-MAT,P-ADV,IP-NMZ,VB-ADC,L030545a,LOG,karu
```

P-ADV contains a nominalized clause and sibling P-RES made. The larger structure may be a phrase rather than a particle word.

Proposed action: Consider changing outer P-ADV to PP-ADV while retaining IP-NMZ and P-RES made. Confirm the construction and required phrase subtype first.

Confidence: high for the observed structure; medium for a phrase-level replacement; exact subtype needs confirmation. Status: editorial confirmation required; not applied.

#### PW-304 MYS.11.2596b

TXT: `data/txt/trees/MYS_11.txt:6813–6815`. XML word subtree: `data/xml/trees/MYS_11.xml:21725–21733`; first phrase: lines 21726–21731.

Current path: `IP-MAT/IP-ADV/IP-EPT/MK/PP`. Word-ancestor material: `okitunami`; phrase material: `okitu`.

```text
6813: IP-MAT,IP-ADV,IP-EPT,MK,L020020,PP,NP,N,L052520,LOG,oki
6814: IP-MAT,IP-ADV,IP-EPT,MK,L020020,PP,P-CASE-GEN,L000532,PHON,tu
6815: IP-MAT,IP-ADV,IP-EPT,MK,L020020,N,L050017,LOG,nami
```

MK with lemma L020020 contains PP oki+tu and N nami. Internal phrase structure in an epithet may be intentional.

Proposed action: No correction recommended yet: MK may intentionally contain a structured epithet. Confirm whether the internal PP is appropriate before changing lexical or structural annotations.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-305 MYS.12.2900

TXT: `data/txt/trees/MYS_12.txt:1794–1796`. XML word subtree: `data/xml/trees/MYS_12.xml:5724–5734`; first phrase: lines 5725–5727.

Current path: `IP-MAT/IP-ADV/NP-SBJ/N/CONJP`. Word-ancestor material: `wemapimaywobiki`; phrase material: `wemapi`.

```text
1794: IP-MAT,IP-ADV,NP-SBJ,N,CONJP,DVN,L031931b,LOG,wemapi
1795: IP-MAT,IP-ADV,NP-SBJ,N,N,L050918,LOG,maywo
1796: IP-MAT,IP-ADV,NP-SBJ,N,N,L050918,PHON,biki
```

The outer N contains CONJP with wemapi and a sibling multipart maywobiki. An NP parent is plausible; its form-parts must remain intact.

Proposed action: Consider changing the outer N to NP, preserving CONJP and the existing multipart form-parts. This is a proposal, not an established correction.

Confidence: high for the observed structure; medium for replacing the outer N with NP. Status: editorial confirmation required; not applied.

#### PW-306 MYS.13.3225

TXT: `data/txt/trees/MYS_13.txt:276–278`. XML word subtree: `data/xml/trees/MYS_13.xml:935–943`; first phrase: lines 936–941.

Current path: `multi-sentence/CP-FINAL/IP-SUB/IP-ADV/IP-EPT/MK/PP`. Word-ancestor material: `okitunami`; phrase material: `okitu`.

```text
276: multi-sentence,CP-FINAL,IP-SUB,IP-ADV,IP-EPT,MK,L020020,PP,NP,N,L052520,LOG,oki
277: multi-sentence,CP-FINAL,IP-SUB,IP-ADV,IP-EPT,MK,L020020,PP,P-CASE-GEN,L000532,PHON,tu
278: multi-sentence,CP-FINAL,IP-SUB,IP-ADV,IP-EPT,MK,L020020,N,L050017,LOG,nami
```

A second oki+tu+nami epithet has the same MK/PP structure as PW-304; assess the convention consistently rather than editing one occurrence alone.

Proposed action: No correction recommended yet: MK may intentionally contain a structured epithet. Confirm whether the internal PP is appropriate before changing lexical or structural annotations.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-307 MYS.13.3253

TXT: `data/txt/trees/MYS_13.txt:1915–1920`. XML word subtree: `data/xml/trees/MYS_13.xml:6464–6478`; first phrase: lines 6465–6470.

Current path: `multi-sentence/CP-FINAL/IP-ARG/ADJ-INF/CONJP`. Word-ancestor material: `sakikumasakiku`; phrase material: `sakiku`.

```text
1915: multi-sentence,CP-FINAL,IP-ARG,ADJ-INF,CONJP,ADJ-INF,ADJ-STM,L007230,LOG,saki
1916: multi-sentence,CP-FINAL,IP-ARG,ADJ-INF,CONJP,ADJ-INF,ACP-INF,L000033,NLOG,ku
1917: multi-sentence,CP-FINAL,IP-ARG,ADJ-INF,7@眞福座跡,*
```

The outer ADJ-INF contains CONJP with sakiku and a sibling adjective masakiku. As in PW-299, the intended coordination structure needs confirmation.

Proposed action: Review whether the outer ADJ-INF incorrectly treats coordination as a word, or whether CONJP placement is wrong. No particular replacement label is established by the available response.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-308 MYS.13.3324a

TXT: `data/txt/trees/MYS_13.txt:6323–6325`. XML word subtree: `data/xml/trees/MYS_13.xml:21167–21177`; first phrase: lines 21168–21176.

Current path: `multi-sentence/IP-MAT/PP/NP/IP-REL/IP-EPT/MK/IP-ADV`. Word-ancestor material: `opobuneno`; phrase material: `opobuneno`.

```text
6323: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,NP-PRD,N,L050510,ADJ-STM,L007009a,LOG,opo
6324: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,NP-PRD,N,L050510,N,L050007a,LOG,bune
6325: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,COP-ADI,L031965,LOG,no
```

MK with lemma L020022 contains an IP-ADV yielding opobuneno. A clause-level internal structure may be intentional in this epithet.

Proposed action: No correction recommended yet: MK may intentionally contain a clause-level epithet. Confirm its internal IP-ADV before changing the annotation.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-309 MYS.13.3324b

TXT: `data/txt/trees/MYS_13.txt:6694–6696`. XML word subtree: `data/xml/trees/MYS_13.xml:22445–22455`; first phrase: lines 22446–22454.

Current path: `multi-sentence/IP-MAT/PP/NP/IP-REL/IP-EPT/MK/IP-ADV`. Word-ancestor material: `opobuneno`; phrase material: `opobuneno`.

```text
6694: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,NP-PRD,N,L050510,ADJ-STM,L007009a,LOG,opo
6695: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,NP-PRD,N,L050510,N,L050007a,LOG,bune
6696: multi-sentence,IP-MAT,PP,NP,IP-REL,IP-EPT,MK,L020022,IP-ADV,COP-ADI,L031965,LOG,no
```

The companion text has the same opobuneno epithet structure as PW-308. Both occurrences need the same editorial assessment.

Proposed action: No correction recommended yet: MK may intentionally contain a clause-level epithet. Confirm its internal IP-ADV before changing the annotation.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

#### PW-310 SNK.3

TXT: `data/txt/trees/SNK.txt:51–53`. XML word subtree: `data/xml/trees/SNK.xml:190–198`; first phrase: lines 191–196.

Current path: `IP-MAT/IP-ADV/PP-SBJ/NP/IP-REL/PEN/PP`. Word-ancestor material: `amatukamwi`; phrase material: `amatu`.

```text
51: IP-MAT,IP-ADV,PP-SBJ,NP,IP-REL,PEN,PP,NP,N,L050001b,PHON,ama
52: IP-MAT,IP-ADV,PP-SBJ,NP,IP-REL,PEN,PP,P-CASE-GEN,L000532,PHON,tu
53: IP-MAT,IP-ADV,PP-SBJ,NP,IP-REL,PEN,N,L050005a,PHON,kamwi
```

PEN contains PP ama+tu and N kamwi. A lexicalized divine name can plausibly retain internal structure; no error is established merely by this match.

Proposed action: No correction recommended yet: PEN may represent a lexicalized divine name with internal PP structure. Confirm the name analysis and inner PP before changing the annotation.

Confidence: high for the observed structure; no approved replacement is established. Status: editorial confirmation required; not applied.

### EN and SM deferred findings

All 298 cases, PW-001 through PW-298, remain deferred. Their JSON records give exact original context without inventing meanings for C-, APP- or other legacy wrappers. No speculative replacements are supplied for these unresolved conventions.

| Source | Boundaries | Texts |
| --- | ---: | ---: |
| data/xml/text/EN_01.xml | 26 | EN.1.2, EN.1.4, EN.1.5, EN.1.6, EN.1.7, EN.1.8, EN.1.11, EN.1.13 |
| data/xml/text/EN_02.xml | 16 | EN.2.1 |
| data/xml/text/EN_03.xml | 20 | EN.3.2, EN.3.3, EN.3.4, EN.3.5 |
| data/xml/text/EN_04.xml | 26 | EN.4.2, EN.4.3, EN.4.5 |
| data/xml/text/EN_05.xml | 10 | EN.5.1, EN.5.2 |
| data/xml/text/EN_06.xml | 9 | EN.6.1, EN.6.2 |
| data/xml/text/EN_07.xml | 12 | EN.7.3, EN.7.5, EN.7.6, EN.7.9, EN.7.11 |
| data/xml/text/EN_08.xml | 32 | EN.8.1, EN.8.2 |
| data/xml/text/EN_09.xml | 2 | EN.9.1 |
| data/xml/text/EN_10.xml | 36 | EN.10.2, EN.10.3, EN.10.5, EN.10.6, EN.10.9, EN.10.10, EN.10.12, EN.10.13, EN.10.14 |
| data/xml/text/EN_12.xml | 12 | EN.12.1, EN.12.3, EN.12.4 |
| data/xml/text/EN_13.xml | 13 | EN.13.1, EN.13.2 |
| data/xml/text/EN_14.xml | 4 | EN.14.2 |
| data/xml/text/EN_15.xml | 9 | EN.15.1 |
| data/xml/text/EN_16.xml | 3 | EN.16.1 |
| data/xml/text/EN_19.xml | 4 | EN.19.4, EN.19.6 |
| data/xml/text/EN_20.xml | 6 | EN.20.1 |
| data/xml/text/EN_21.xml | 5 | EN.21.1 |
| data/xml/text/EN_22.xml | 4 | EN.22.3, EN.22.5 |
| data/xml/text/EN_24.xml | 1 | EN.24.2 |
| data/xml/text/EN_25.xml | 20 | EN.25.5, EN.25.6, EN.25.7 |
| data/xml/text/EN_27.xml | 25 | EN.27.1, EN.27.2, EN.27.3, EN.27.4, EN.27.5, EN.27.6, EN.27.7 |
| data/xml/text/SM_55.xml | 2 | SM.55.5 |
| data/xml/text/SM_58.xml | 1 | SM.58.7 |

## Confirmed guideline updates for later approval

These are proposed documentation changes only; [annotation-guidelines.md](../docs/annotation-guidelines.md) has not been changed in this report-only task.

1. **WORD-02:** replace “an NP must have an N head” with the confirmed allowance for either an N head or an NP head. Do not retain the superseded MYS.2.150 enclosing-N example as a current rule.
2. **SEG-06, KK.30:** the imported structure is now `VB-ADN → N awokakiyama + VB-ADN gomoreru`, not `VB-ADN → NP + VB-ADN`. Applying the existing phrase-boundary rule to this revised subtree yields `awokakiyamagomoreru`. This is a consequence of the existing procedure, not a new independently supplied segmentation decision.
3. **SEG-06, MYS.2.150:** remove the old enclosing N from the illustration; NP directly contains the appositional NPs. The displayed portion remains `sakariwite asa nageku kimi`.
4. **SEG-03:** remove the reference to KK.30 as a current example of an internal NP stopping boundary; that boundary no longer exists there. The general stopping rule remains unchanged.
5. **SEG-04:** remove multi-clause from the accepted grouping list. The Editor-in-Chief identifies it as a mistake; no unconfirmed replacement should become a guideline rule.
6. Add the confirmed acceptance of NP-APP, WH-ADV and NLOG without adding historical error examples to the guideline.
7. Add the confirmed meaning of FRM: frame, used in introducing complement clauses with a nominal form; both IP-NMZ-FRM and PP-FRM are acceptable. Do not prescribe a normalization between them while their usage remains under discussion.
8. State that EN/SM legacy markup is deferred. The response recognizes BPHON as important there but does not supply a complete definition; no new definition is invented.

No new guideline definitions are proposed for tentative C- meanings, ORDLOG, unexplained nominal labels or other unanswered questions.

## Conditions for any later correction task

Approval should identify the proposal/case ID and the precise replacement, including whether a node is renamed, removed or reparented. A detected structure must not be treated as authorization to rewrite it.

Before implementation, recheck the source version and the recorded context. Preserve forms, lemma IDs, child order, multipart components, distinction labels and marker boundaries. Update TXT and XML consistently, including any affected round-trip marker paths. Do not merge equally labelled nodes while renaming a root.

The proposal JSON gives only label-level TXT substitutions. It does not encode the complete AS-001 structural alternatives, or any automatic PW correction. No importer, parser, processor or application changes are part of this audit.

## Verification

The report's line references, TXT excerpts, XML addresses and label proposals are checked against the unchanged working-tree corpus. The JSON files are valid and their counts agree with the summary. Git checks confirm no source, corpus, dictionary or guideline changes remain from this task; the author's pre-existing TODO changes are preserved. No application tests are needed for a report-only change.
