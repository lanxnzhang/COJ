# Investigation of unlisted annotation tags

This report records the tag investigation requested in `TODO.md`, “After commit e15ad38 (3)–(5).” It distinguishes potentially meaningful annotation categories from spelling anomalies, source-format conventions, and strings that became XML element names through parsing or serialization. It does not establish new linguistic definitions or authorize changes to the data.

Investigated on 4 October 2026, against repository commit `e15ad3843971af93fc3c7755d39ab4b1727051ca` and the project author's subsequent clarifications. All unresolved interpretations below remain open.

The shorter [questions for the chief editor](tag-questions-for-chief-editor.md) selects the items most useful for editorial consultation. Existing question ledgers and issue records have not been changed.

## Authority and scope

The authoritative abbreviation reference is the project-author-designated `D:\Lanxin\Desktop\ONCOJ Abbr List.docx`, whose contents were inspected during the preceding investigation. [treditor/tag_names.json](../treditor/tag_names.json) supplies the corresponding browser expansions, but does not itself encode the Words/Bound morphemes grouping. Descriptions in Python constants are evidence of implementation usage, not authoritative linguistic definitions.

The investigation covered:

- 88 corpus documents in `data/xml/text/` and 27 in `data/xml/trees/`, with their 115 TXT counterparts;
- syntactic element names, writing-mode attributes, multipart writing-mode annotations, and unusual source spellings;
- code definitions, processor mappings, tests, documentation, notebooks, migration reports, and the history of the tag-reference module.

Dictionary XML elements, lemma IDs used correctly as attributes, ordinary text IDs, HTML elements, and generic code placeholders are not annotation categories. Historical material was used as supporting evidence; this is not an inventory of every label in every deleted Git version or of external corpora. Run-local copies in `scripteditor/runs/` are not independent corpus sources for these counts.

### What counts as unlisted

An ordinary combination such as `NP-SBJ` is not considered a missing abbreviation merely because the reference lists `NP` and `-SBJ` separately. The main inventory identifies missing bases, suffixes, unexplained spellings, and other strings encountered in annotation positions. Section 8 separately records documented components whose combination or context is not explained by the reference. Recognizing the components does not establish that every combination is authorized.

Standard `;@N` distinction labels were treated as instance labels, not separate tag categories. Their numbers are not assumed to be ordinals. Unusual spellings such as `N;2` were retained rather than normalized.

### Reading the evidence

- **Corpus evidence:** directly observed structure, form, identifier, or occurrence count.
- **Implementation description:** wording or handling found in code, tests, or documentation.
- **Tentative interpretation:** an inference to be checked, not an approved definition.
- **Open question:** information still requiring an explicit decision.
- **Technical/data concern:** a representation problem or suspicious source spelling, not automatically a confirmed editorial error.

Counts are XML element or annotation-location counts, not numbers of words, dictionary entries, or distinct texts. Parent nodes and their descendants can both be counted. For multipart annotations, a count can include component locations. TXT is not added to XML counts, which would count the same material twice.

The scan found 78 unlisted XML element/script strings, three additional code definitions without current corpus occurrences, and one additional TXT label preserved only in XML round-trip metadata. These 82 strings are not 82 linguistic categories. Test-only `NP-UNKNOWN` is listed separately.

### Project-author clarifications relevant to interpretation

Lower-level word cases are comparatively well-defined by existing annotation rules and categories. The unresolved editorial distinction concerns exceptional higher structures: the program should not determine word status solely from a Words-category tag or tree topology.

The outer `VB-ADN` in KK.30 may be regarded as a word; the higher `N` in MYS.2.150 is an annotation convention supporting headed phrase structure. Neither judgment authorizes a general automatic classifier. Word-level segmentation merges upward from smaller units and stops at phrase boundaries, independently of these exceptional word-status judgments. Tree-terminal segmentation exposes existing terminals without inferring new morphological boundaries.

Lemma assignment and lexical/grammatical classification are separate dimensions. A parent lemma establishes dictionary-entry status, not lexical-item status. The experimental compound processor and `NP_EXPANSION` are not linguistic policy or authority for interpreting `C-` labels.

## 1. Substantive unlisted or unclear annotation labels

Locations below use the current XML text IDs. For EN and SM, `EN.1.2` corresponds to TXT source ID `2_EN_01`, and `SM.16.3` to `3_SM_16`. File codes refer to the matching `.xml` file under `data/xml/text/` for EN/SM and `data/xml/trees/` for the other collections. TXT counterparts use the same file basename under `data/txt/`.

### The C series

| Tag | Count | Representative location | Observed context |
| --- | ---: | --- | --- |
| `C-N` | 577 | EN_01, EN.1.2 | Inside `N`; includes phrase structure such as `PP-GEN` as well as nominal material. |
| `C-NP` | 72 | EN_01, EN.1.1 | Contains `N(kamu, nusi)`; another distinguished occurrence contains `N(papuri, ra)`. |
| `C-ADV` | 2 | EN_12, EN.12.1 | Under `NP → N`; contains `N ywo` and a `NUMCLP` with `nana` and `ywo`. |
| `C-PP` | 6 | EN_01, EN.1.3 | Under `PP-OB1`; contains a relative clause and nominal structure. |
| `C-IP` | 2 | EN_12, EN.12.3 | Under `IP-ARG`; contains clause-level material including `PP-SBJ`. |

Representative source lines from [EN_01.txt](../data/txt/text/EN_01.txt):

```txt
IP-MAT,IP-ARG,C-NP,N,N,LOG,kamu
IP-MAT,IP-ARG,C-NP,N,N;@2,LOG,nusi
IP-MAT,IP-ARG,C-NP;@5,N,N,LOG,papuri
IP-MAT,IP-ARG,C-NP;@5,N,N;@2,LOG,ra
```

**Implementation description:** [tags.py](../src/coj/core/tags.py) describes `C-N`, `C-NP`, `C-ADV`, and `C-PP` as compound noun, compound noun phrase, compound adverb, and compound postpositional phrase. It does not define `C-IP`. Migration reports preserve actual `C-` structures but do not provide an authoritative explanation of their meaning.

**Tentative interpretation:** the family groups syntactic material of several types. Indexed parallel occurrences and substantial internal phrase structure make it unsafe to equate every occurrence with one lexical compound. The prefix might have a different or more specific annotation meaning than the code descriptions suggest.

**Open questions:** What does `C-` expand to? Does it have the same function throughout the family? How does it relate to `CONJP`, ordinary phrases, and internally structured words? What category should each label occupy in the abbreviation reference?

### Apposition and nominal groupings

| Tag | Count | Representative location | Corpus evidence |
| --- | ---: | --- | --- |
| `APP-N` | 64 | EN_01, EN.1.6 | `NP-PRD → N → APP-N → N sumyera`; indexed sibling occurrences also appear. |
| `APP-NP` | 28 | EN_07, EN.7.3 | Contains `PP-GEN` with `kotosi no` and nominal material. |
| `CP-N` | 2 | EN_03, EN.3.2 | `NP-PRD → N → CP-N → N(ADJ-STM nigi, N sine)`. |
| `N-DVB` | 9 | EN_10, EN.10.5 | Form-bearing node `twopa` beneath `N`. |

**Implementation description:** `tags.py` calls `CP-N` a “noun complementizer phrase” and `N-DVB` a “deverbal noun.” [lemma_forgui.py](../scripteditor/scripts/lemma_forgui.py) maps `N-DVB` to dictionary noun/deverbal-noun POS values. No explicit definition of `APP-N` or `APP-NP` was found.

**Tentative interpretation:** `APP-` may identify appositional structures. That does not establish equivalence with documented `NP-APP`. `N-DVB` resembles a deverbal-noun label, but its relationship to documented `DVN` is unresolved. The `CP-N` example alone does not validate the code's expansion.

**Open questions:** Are these distinct categories, historical alternatives, or conventions requiring more precise definitions? How do `APP-N`/`APP-NP` relate to `NP-APP`, and `N-DVB` to `DVN`?

### Numeral-related groupings

| Tag | Count | Representative location | Corpus evidence |
| --- | ---: | --- | --- |
| `NUMCL` | 1 | EN_04, EN.4.5 | Parent containing `NUM mu` and `CL tu`. |
| `NUMCLP` | 144 | EN_01, EN.1.3 | Parent containing `NUM ti` and `N kapi`. |

**Implementation description:** `tags.py` calls `NUMCL` “numeral classifier”; `lemma_forgui.py` associates it with classifier/numeral dictionary POS values. No explicit definition of `NUMCLP` was found.

**Tentative interpretation:** both group numeral-related material. “Numeral-classifier phrase” is a possible expansion of `NUMCLP`, not an authoritative definition. The single `NUMCL` occurrence is a parent structure, so it should not automatically be equated with the terminal bound-morpheme category `CL`.

**Open questions:** What distinguishes these labels from `NUM`, `CL`, `N`, and `NP`? Are they word categories, bound-morpheme categories, phrase categories, or other conventions?

### Other substantive labels and extensions

| Tag | Count | Representative location | Corpus evidence |
| --- | ---: | --- | --- |
| `ADV-WH` | 9 | MYS_01, MYS.1.29a | Parent containing `WH-ADJ ika`, `N sama`, and `COP-INF ni`. |
| `CFX` | 2 | SM_16, SM.16.3 | `VB → CFX na`, with phonographic writing. |
| `COMMENT` | 48 | EN_02, EN.2.1 | Uppercase wrapper containing annotated material, including `sore no …`; can contain complex syntax. |
| `MORPHEME` | 23 | SM_02, SM.2.2 | Form-bearing component `mi` under `VB`. |
| `IP-NMZ-FRM` | 74 | EN_01, EN.1.2 | Nominalized clause containing phrase/clause structure. |
| `PP-FRM` | 1 | MYS_20, MYS.20.4473 | Particle-phrase-like parent containing an `IP-NMZ`. |
| `P-FNL-PRB` | 4 | SM_07, SM.7.13 | Form `na` under a phrase inside an adverbial structure. |
| `PFX-RCP` | 24 | SM_04, SM.4.42 | Prefix-position component `api` under `VB`. |
| `PFX-UKN` | 1 | EN_01, EN.1.9 | Component `sa`, lemma `L000040`, under `VB`. |
| `W` | 1 | EN_10, EN.10.6 | Extra node beneath `N`, form `pe`, writing mode `ORDLOG`. |
| `multi-clause` | 2 | KH.27; KK.91 | Root wrapper containing clauses. |

**Implementation descriptions:** `tags.py` explains `FRM` in `IP-NMZ-FRM` as “formal/nominal,” `PRB` as “probabilitive,” and `RCP` as “reciprocal.” Converter comments and [test_export.py](../tests/test_export.py) explicitly support `multi-clause` roots. No sufficiently explicit definitions were found for the remaining labels.

**Tentative interpretations:** `ADV-WH` may be related to `WH-ADV`; `APP-` and `FRM` may encode distinct annotation conventions rather than new lexical categories. `UKN` may be an unspecified-prefix designation. `W` might be a generic word label, but its unusual surrounding annotation makes this uncertain.

Uppercase `COMMENT` must not be confused with lowercase XML `<comment>`, which stores round-trip source lines. Its children carry corpus content; its name is not evidence that they can be ignored.

**Open questions:** Confirm expansions and functions, relationships to existing labels, and placement in the reference. In particular, explain when generic `MORPHEME` and `CFX` are used instead of a specific category, and what `COMMENT` denotes editorially.

## 2. Unlisted writing-mode strings

| String | Count | Representative location | Existing explanation |
| --- | ---: | --- | --- |
| `BPHON` | 283 annotation locations | SM_01, SM.1.2: `VB-STM are` | Code: “back-phonographic (reversed phonographic reading).” |
| `ORDLOG` | 1 | EN_10, EN.10.6: `W pe` | Code: “ordinal logographic.” |
| `NLPOG` | 1 | MYS_06, MYS.6.1047: `COP-ADI no` | Code: “non-logographic, partially obscured.” |
| `inLOG` | 2 | SM_29, SM.29.7: `ire`; SM.44.7 | No explicit definition found. |

`BPHON` comprises 268 ordinary `phon` attributes and 15 multipart-component attributes. The 283 locations must not be interpreted as 283 distinct words.

Representative source lines:

```txt
multi-sentence,IP-MAT,PP-SBJ,NP,IP-REL,IP-ADV,PP-SBJ,NP,PLN,L080684,COP-ADI,L031965,NLPOG,no
IP-MAT,IP-ADV,PP-OB1,NP,N,APP-N,N,C-N;@8,N,W,ORDLOG,pe
IP-MAT,IP-ADV,VB,VB-STM,L030223a,inLOG,ire
```

`BPHON`, `ORDLOG`, and `NLPOG` are explicitly recognized by `PHON_TAGS`, standalone processors, and tag tests. Their explanations already appear in the initial Git version of the tag module; this establishes historical implementation usage, not independent linguistic authority. `inLOG` occurs as an XML `phon` value but is not in `PHON_TAGS`.

**Tentative interpretations:** `NLPOG` could be an intentional extension or a spelling anomaly related to `NLOG`; `inLOG` could be an accidental alteration of `LOG`. Neither hypothesis is resolved.

**Open questions:** Confirm which are genuine writing-mode categories, their exact meanings, and any permitted aliases. These belong to writing/annotation terminology, not automatically Words or Bound morphemes.

## 3. Suspected spelling variants and suspicious labels

The proposed comparisons below are hypotheses, not corrections. All original spellings are retained. A rare label is not an error merely because it is rare.

| Exact label | Count | Representative location or form | Tentative interpretation |
| --- | ---: | --- | --- |
| `AD-STM` | 1 | SM.32.4, `koto` | Possibly `ADJ-STM`. |
| `ADC-CLS` | 1 TXT metadata line | EN.5.2, `…,ADJ,ADC-CLS,NULL,*` | Possibly `ACP-CLS`; see below. |
| `ADJ-ATM` | 1 | EN.3.2, `awo` | Possibly `ADJ-STM`. |
| `ADJ-STEM` | 1 | MYS.20.4360, `parara` | Possibly a longer spelling of `ADJ-STM`. |
| `ADJ-STN` | 1 | EN.6.1, `ara` | Possibly `ADJ-STM`. |
| `C-CASE-DAT` | 1 | EN.8.1, `ni` | Possibly `P-CASE-DAT`, or another use of `C-`. |
| `COP-ADJ` | 1 | EN.27.7, `no` | Possibly `COP-ADI`; `ADJ` is not a documented copular inflection suffix. |
| `FPX` | 1 | EN.7.10, `mi` | Possibly transposed `PFX`. |
| `IP-` | 1 | EN.5.1 | Incomplete suffix, or an unexplained unspecialized clause label. |
| `IP-AV` | 1 | EN.25.6 | Possibly `IP-ADV`. |
| `IP-IPT` | 1 | MYS.19.4214, parent of `MK pasikiyosi` | Possibly `IP-EPT`. |
| `IP_ADV` | 1 | MYS.8.1518a | Possibly underscore spelling of `IP-ADV`. |
| `N-dVB` | 1 | EN.10.3, `parape` | Case variant of unlisted `N-DVB`. |
| `NP-OBJ` | 2 | EN.1.11; EN.20.1 | Possibly a general/older object label; do not assume `OB1`. |
| `NP-PRED` | 1 | MYS.7.1328 | Possibly an alternative spelling of `NP-PRD`. |
| `NPP-RES` | 1 | SM.57.3, `sape` | Possibly `P-RES` with extra characters. |
| `OB1-SBJ` | 1 | NSK.32, contains `*T*` | Role labels without a documented category base. |
| `P-COP` | 1 | EN.13.1, `mo` | Possibly a distinct particle category or a spelling anomaly. |
| `PP-OBJ` | 1 | MYS.3.323 | Possibly a general/older object label; do not assume `PP-OB1`. |
| `V-IMP` | 1 | EN.24.1, `narapye` | Possibly `VB-IMP`. |
| `V-STM` | 1 | MYS.14.3389;azuma_uta, contains `topo + soki` | Possibly `VB-STM`; this occurrence is a parent, not a terminal. |
| `VB-IMO` | 1 | EN.5.1, `tamape` | Possibly `VB-IMP`. |
| `VB-STN` | 1 | EN.8.1, `mamori` | Possibly `VB-STM`. |
| `VB-VML` | 2 | EN.1.14, `mawosa` | Possibly `VB-NML`. |
| `VB-iNF` | 1 | EN.2.1, `siri` | Case variant of `VB-INF`. |
| `VB-sTM` | 1 | EN.27.7, `kogora` | Case variant of `VB-STM`. |
| `VBN` | 1 | SM.15.1, contains `PFX-HON mi` | Possibly combined/malformed category fields; no definition found. |
| `VP-ADC` | 1 | EN.1.7, `myesu` | Possibly `VB-ADC`; a distinct `VP` convention cannot be excluded. |
| `mulit-sentence` | 1 | NSK.26 | Likely transposition of `multi-sentence`. |

The `ADC-CLS` line is [EN_05.txt:335](../data/txt/text/EN_05.txt):

```txt
IP-MAT,IP-ARG,IP-ARG,IP-ADV,IP-ADV,PP-GEN,NP,IP-REL,ADJ,ADC-CLS,NULL,*
```

It survives in XML as a positioned `roundtrip-data/comment@raw` value, not an `ADC-CLS` syntax element. It was therefore included through the TXT cross-check rather than the syntactic-element count. This is separate from the unresolved semantics of `NULL,*` in [CEQ-005](chief-editor-questions.md#ceq-005--meaning-of-null).

**Open questions:** Which spellings are accepted conventions, and which are editorially approved correction candidates? In particular, do `OBJ` and `PRED` represent historical categories rather than typos? No normalization has been applied.

## 4. XML names generated from unusual source syntax

[corpus.py](../src/coj/core/corpus.py), `_sanitize_xml_name()`, replaces characters outside its accepted XML-name repertoire with underscores. The converter retains an original spelling in `raw_tag` where necessary. The XML name and its source spelling must therefore be considered together.

| XML name | Original source spelling | Count | Representative text |
| --- | --- | ---: | --- |
| `IP-ADV_` | `IP-ADV `, trailing space | 1 | MYS.6.948 |
| `IP-MAT__que_` | `IP-MAT;_que_` | 6 | BS.12; BS.16 |
| `N_2` | `N;2` | 1 | MYS.10.2030, `gwiri` |
| `N_4` | `N;4` | 1 | MYS.18.4132, `sa` |
| `VB-ST_M` | `VB-ST&M` | 2 | EN.25.7, `takye` |
| `_-IP-ADV` | `-IP-ADV` | 1 | KK.103 |
| `_IP-MAT` | `]IP-MAT` | 1 | SM.37.1 |
| `_T_` | `*T*` | 241 | BS.1; BS.2; many other texts |

**Corpus evidence:** `*T*` occurs in apparently gap-like syntactic positions with empty XML form/script values. `N;2` and `N;4` differ from the standard `;@N` spelling. `;_que_` and `ST&M` survive as source annotations.

**Tentative interpretation:** `*T*` conventionally suggests a trace; the evidence here does not establish its complete formal model. `N;2`/`N;4` may be historical distinction syntax, but that cannot be inferred merely from their similarity to `;@N`. The meanings of `_que_` and `ST&M` remain unresolved.

**Technical concern:** adding the sanitized XML spellings to a linguistic abbreviation table would confuse a serialization mechanism with the source annotation. The original spellings, where meaningful, are the editorial questions. [PAQ-007](project-author-questions.md#paq-007--formal-status-of-t) already records the unresolved formal status of `*T*`.

## 5. Special ILL word forms represented as XML names

| XML name | Count | Representative source word form | Text |
| --- | ---: | --- | --- |
| `__` | 2 | `如是` | MYS.16.3791 |
| `___` | 3 | `已具耳` | MYS.2.156 |
| `____` | 5 | `邑礼左變` | MYS.4.655 |
| `_____` | 2 | `莫囂圓隣之` | MYS.1.9 |
| `_______` | 3 | `大相七兄爪謁氣` | MYS.1.9 |

These underscore-only names are not linguistic tags. The project author has identified the final field after `ILL` as a special word form. The current ASCII-oriented form recognition instead treats the non-ASCII strings as path material, then sanitizes them into XML names with `raw_tag` holding the source value.

The 15 occurrences belong to the parser/model limitation already recorded in [DI-004](data-issues.md#di-004--ill-special-word-forms). That issue contains the complete ILL example list. Its formal linguistic interpretation remains in [CEQ-004](chief-editor-questions.md#ceq-004--formal-meaning-of-ill-and-its-word-form). This report does not reopen the strings as candidate POS abbreviations or change the parser.

## 6. Lemma-like and free-text fields represented as elements

### Lemma-like names

| XML element name | Count | Representative text |
| --- | ---: | --- |
| `L000033` | 1 | EN.1.9; element carries form `ki` |
| `L050749N` | 6 | EN.1.8 |
| `L050750N` | 9 | EN.2.1 |
| `L050751N` | 3 | EN.3.1 |
| `L050752N` | 3 | EN.1.2 |
| `L050754N` | 4 | SM.34.5 |
| `L080203N` | 9 | EN.1.2 |

Representative original line:

```txt
IP-MAT,IP-ARG,IP-ADV,PP-DAT,NP,N,L050749N,PFX-HON,L000035,LOG,mi
```

**Implementation behavior:** `_LEMMA_RE` in `corpus.py` accepts a letter, digits, and optional lowercase suffix letters. Uppercase-final `N` values do not match; they can therefore become syntax-path elements. `L000033` matches the ID pattern, but this particular occurrence is still an element in a source configuration lacking the usual writing-mode layout. Its cause should not be conflated with the uppercase-suffix cases.

**Tentative interpretation:** the uppercase-final `N` strings might be lemma IDs with a historical suffix or accidentally joined ID/category fields. The inventory does not establish which. They are not seven new linguistic categories.

**Open question:** What was intended by the uppercase-final `N` fields, and how should their semantic identity be represented? The ordinary existence of lemma IDs on grammatical or lexical items is not itself a problem.

### Free-text names

| Element name | Count | Representative text and source context |
| --- | ---: | --- |
| `asawo` | 1 | MYS.14.3484;azuma_uta: appears before further `N` components `asa + wo`. |
| `borrow` | 2 | SM.44.3: `…,VB-GER,borrow,LOG,kari` |
| `grow` | 1 | SM.13.18: `…,VB-ADC,grow,PHON,musu` |
| `rescue` | 3 | SM.41.4: `…,VB-STM;@2,rescue,LOG,sukupi` |

**Tentative interpretation:** `asawo` may be a compound-form explanation; `borrow`, `grow`, and `rescue` look like English glosses inserted into the path. No formal rule for these fields was found. Their text is preserved in XML structure, but preservation as an element does not establish the correct semantic representation.

These are authoring/parser questions rather than obvious additions to the abbreviation table.

## 7. Code definitions without current corpus occurrences

| Tag | Definition in `tags.py` | Corpus evidence | Open question |
| --- | --- | --- | --- |
| `IP-EMP` | “empty clause” | No occurrence found in the current corpus sources. | Accepted historical/reserved category, or unsupported reference entry? |
| `PFX-PHB` | “prohibitive prefix” | No occurrence found. | `PHB` is documented for final particles, not in prefix specifications; is this extension accepted? |
| `VB-DVB` | “verb deverbal” | No occurrence found. | What does it mean, and how does it relate to `DVN` and `N-DVB`? |

Definitions alone are insufficient grounds to add these labels to the formal linguistic model.

`NP-UNKNOWN` occurs in [test_collapsed_words.js](../treditor/tests/test_collapsed_words.js) as an intentionally unfamiliar label testing display fallback. It is not a corpus category. Generic placeholders such as `<SEMANTIC>`, `<INFLECTION>`, `<ID>`, and `<PREFIX>` are likewise not annotation tags.

## 8. Documented abbreviations in undocumented combinations

Every component below can be found elsewhere in the reference, but its use in this particular context is not clearly specified. These cases are not counted among the 78 unlisted XML strings above.

| Combination | Count | Representative text | Clarification needed |
| --- | ---: | --- | --- |
| `N-ADC` | 1 | SM.58.2, `opomasimasu` | Verbal inflection suffix on `N`: accepted convention or anomalous annotation? |
| `N-COMP` | 1 | SM.1.2, `to` | Code says “compound noun member”; reference `COMP` describes complementizer particles. |
| `N-PRD` | 1 | MYS.17.4008, contains `asa + gwiri` | Code says “predicative noun”; reference discusses `PRD` for nominal phrases. |
| `VB-ADV` | 1 | MYS.2.131a, `puru` | `ADV` is not listed among verbal inflectional categories. |
| `P-COMP-GER` | 1 | SM.11.2, `to` | What does inflectional `GER` mean on a particle label? |
| `NP-ADV-SEM` | 6 | KK.9 | Is inflectional `SEM` also an accepted nominal-phrase extension? |
| `P-ADV` | 1 | MYS.10.2250, contains an `IP-NMZ` | Meaning of this particle-tagged parent containing clause structure. |
| `P-SBJ` | 1 | EN.27.1, `pa` | Phrase-role suffix on a particle. |
| `PP-MAT` | 1 | MYS.11.2640 | Clause-type suffix on a particle phrase. |
| `PP-CASE` | 4 | EN.3.5 | Intended phrase-level case convention. |
| `PP-CASE-ABL` | 9 | EN.1.8 | Relationship to `PP-ABL` and particle case labels. |
| `PP-CASE-ACC` | 1 | EN.5.1 | Relationship to `PP-ACC` and particle case labels. |
| `PP-CASE-COM` | 2 | EN.23.1 | Relationship to `PP-COM` and particle case labels. |
| `PP-CASE-DAT` | 1 | EN.10.12 | Relationship to `PP-DAT` and particle case labels. |
| `SFX-INF` | 1 | EN.19.4, `api` | Is inflectional annotation of `SFX` intentional here? |
| `WORD-STM` | 1 | SM.15.2, `yorokobosi` | Meaning of a stem designation on generic `WORD`. |

The reference is not a complete formal grammar of every allowable combination. These observations therefore identify gaps or verification cases, not prove that the combinations are invalid. Processor POS mappings for `N-COMP` and `N-PRD` are implementation assumptions, not resolutions.

## Evidence sources and limitations

- [Authoritative display expansions](../treditor/tag_names.json): base labels and suffix explanations; not an explicit category-membership registry.
- [Python tag reference](../src/coj/core/tags.py): descriptions for `C-` labels, several extensions, and writing modes. Its header combines corpus mining and external sources rather than documenting each definition's editorial authority.
- [Corpus parser and serializer](../src/coj/core/corpus.py): lemma recognition, path handling, XML-name sanitization, and round-trip metadata behavior.
- [Scripteditor POS mapping](../scripteditor/scripts/lemma_forgui.py): dictionary-candidate preferences for `N-DVB`, `N-COMP`, `N-PRD`, and `NUMCL`.
- [Tag tests](../tests/test_tags.py) and [corpus tests](../tests/test_corpus.py): recognized writing modes and tag preservation. Passing tests establish supported behavior, not linguistic meaning.
- [Export tests](../tests/test_export.py): explicit preservation of `multi-clause` roots and internal lemma annotations.
- [Marker-boundary migration report](../reports/kanji_marker_boundaries.md) and [multipart-word report](../reports/multipart_words.md): source examples and structural changes, generally not definitions of unlisted labels.
- [Compound processor notebook](../notebooks/compound_lemma_processor.ipynb): experimental grouping heuristics, expressly not annotation policy under the project author's clarification.
- Git history: initial `src/oncoj/tags.py` already includes explanations such as “compound,” “back-phonographic,” and “ordinal logographic.” Later renaming to `coj` and addition of the browser abbreviation mapping do not supply independent confirmation of those definitions.

Counts and examples describe the investigated snapshot. Occurrence counts do not resolve meaning; similar spellings do not establish aliases; topology does not automatically establish exceptional higher-level word status. Absence from current data does not prove that a historical category never existed.

No labels were corrected, no meanings or Words/Bound morphemes memberships were assigned by inference, and no parser, corpus, reference-table, or existing documentation changes were made. The companion chief-editor report asks for definitions without treating technical artifacts as new linguistic categories.
