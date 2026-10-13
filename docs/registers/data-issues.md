# Open data issues

This is an evidence register, not a priority list. **Open** means that a data problem or interpretation still needs attention; it does not imply urgency or a parser failure.

Revalidated 13 October 2026 at `3b8d060` after the latest ONCOJ import. Counts below distinguish this read-only scan from historical audits. [Complete source evidence](data-investigation-2026-10-13.json) retains file/physical line, source ID, original line and adjacent context for every requested inventory; no source data was changed. Findings are not correction authorization.

## Confirmed data errors

### DI-001 — Duplicate text ID `1_SM_15`

- **Status:** Open
- **Category:** identity collision
- **Evidence:** `data/txt/text/SM_15.txt:108` and `:192` both end different blocks with `ID,1_SM_15`. They become two `<block id="SM.15.1">` elements in `data/xml/text/SM_15.xml` (near lines 3 and 485).
- **First text header:** `sumyera ga opo mikoto ni imase mawosi tamapu ... kanarazu nasi matura mu`
- **Second text header:** `sikaredomo napo yamu koto e zu si te ... kasikwo mi mo mawosi tamapa ku to mawosu`
- **Current implementation:** parsing retains both ordered blocks, but ID lookup returns the first matching text. XML does not enforce uniqueness.
- **Effect:** direct opening, lookup, and future change references cannot distinguish the two blocks reliably.
- **Related question:** PAQ-011.
- **Author position (PAQ-009/PAQ-011):** keep open; SM editing and final identifier design are incomplete. Do not allocate a replacement ID. Dotted SM IDs are provisional, not a final naming policy.
- **Current SYN behavior:** the read-only corpus adapter preserves both blocks under separate hidden Text identities. This resolves internal identity collapse in the draft adapter, not the scholarly-ID or legacy-lookup collision.

### DI-003 — Truncated multiline note for `L051953`

- **Status:** Open
- **Category:** data loss during TXT parsing
- **Source:** `data/txt/dict/dictionary.txt:47925-47926`

```txt
.NOTE	Shinano Province corresponds to Nagano prefecture (Nakanishi 1985: 452 in Vovin 2012: 32). Shinanwo shore is likely near Fushiki-Toyama Port (Omodaka 1984.17:
217-218, Nakanishi 1985: 452, Hashimoto 1985: 293 in Vovin 2015: 191).
```

- **Current implementation:** the field regex reads only the first physical line. The continuation does not begin with a recognized tag and is silently skipped. Current XML `<note>` ends at `Omodaka 1984.17:`.
- **Effect:** bibliographic/editorial content is lost without an error.
- **Related question:** PAQ-013.
- **Author decision (PAQ-013):** the continuation belongs to the same NOTE value; the physical line break is an error, not evidence for a multiline TXT syntax. The author will correct it later; no correction is authorized here.
- **Recheck:** this is the only untagged nonempty dictionary-entry line in the current scan. Parser and importer still do not diagnose its skipped text. The 6,498 parsed-entry field roundtrip checks do not account for this unparsed content; see PAQ-019.

## Parser limitations

### DI-004 — `ILL` special word forms

- **Status:** Open; chief-editor semantics pending (CEQ-004), formal character/category review pending (PAQ-018).
- **Category:** parser/model mismatch.
- **Author position:** the final field is meaningful source/form information; some source-character forms reflect insufficiently identified/read transcription. This is not a complete formal repertoire or a finalized definition of ILL.
- **Current scan:** 20 lines: five ASCII x-based forms recognized, fifteen non-ASCII forms misread as syntax components. Their strings survive as raw_tag data, but are absent from recognized tree transcription/lexical search. Do not conflate retained bytes with correct semantic modeling.
- **Current SYN adapter:** retains the original TXT/XML snapshots and imported hierarchy/category information; it does not repair this legacy parser interpretation.

| Source and line | Source text ID | Complete source line | Final form / recognized |
|---|---|---|---|
| `data/txt/trees/BS.txt:331` | `BS.11` | `FRAG,WORD,L099997,ILL,xxx` | `xxx` / yes |
| `data/txt/trees/BS.txt:622` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,x` | `x` / yes |
| `data/txt/trees/BS.txt:624` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,xxx` | `xxx` / yes |
| `data/txt/trees/BS.txt:626` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,xxxx` | `xxxx` / yes |
| `data/txt/trees/BS.txt:629` | `BS.21` | `multi-sentence,IP-MAT,FRAG,NP-ADV,PP,NP,WORD,L099997,ILL,xx` | `xx` / yes |
| `data/txt/trees/MYS_01.txt:462` | `MYS.1.9` | `multi-sentence,IP-MAT,WORD,L099997,ILL,莫囂圓隣之` | `莫囂圓隣之` / no |
| `data/txt/trees/MYS_01.txt:464` | `MYS.1.9` | `multi-sentence,IP-MAT,WORD,L099997,ILL,大相七兄爪謁氣` | `大相七兄爪謁氣` / no |
| `data/txt/trees/MYS_02.txt:2974` | `MYS.2.156` | `IP-MAT,WORD,L099997,ILL,已具耳` | `已具耳` / no |
| `data/txt/trees/MYS_02.txt:2976` | `MYS.2.156` | `IP-MAT,WORD,L099997,ILL,矣自得見監乍共` | `矣自得見監乍共` / no |
| `data/txt/trees/MYS_04.txt:5302` | `MYS.4.655` | `multi-sentence,IP-MAT;@2,WORD,L099997,ILL,邑礼左變` | `邑礼左變` / no |
| `data/txt/trees/MYS_13.txt:1320` | `MYS.13.3242` | `IP-MAT,NP-VOC,CONJP,NP,IP-REL,NP-PRD,IP-REL,IP-ADV,IP-ARG,PP-SBJ,NP,WORD,L099997,ILL,行靡闕` | `行靡闕` / no |
| `data/txt/trees/MYS_14.txt:2110` | `MYS.14.3419;azuma_uta` | `multi-sentence,IP-MAT,WORD,L099997,ILL,奈可中次下` | `奈可中次下` / no |
| `data/txt/trees/MYS_16.txt:280` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,WORD,L099997,ILL,刺部重部` | `刺部重部` / no |
| `data/txt/trees/MYS_16.txt:322` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,信巾裳成` | `信巾裳成` / no |
| `data/txt/trees/MYS_16.txt:324` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,者之寸丹取為支` | `者之寸丹取為支` / no |
| `data/txt/trees/MYS_16.txt:326` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,屋所経` | `屋所経` / no |
| `data/txt/trees/MYS_16.txt:537` | `MYS.16.3791` | `multi-sentence,IP-MAT,WORD,L099997,ILL,如是` | `如是` / no |
| `data/txt/trees/MYS_16.txt:539` | `MYS.16.3791` | `multi-sentence,IP-MAT,WORD,L099997,ILL,所為故為` | `所為故為` / no |
| `data/txt/trees/MYS_16.txt:566` | `MYS.16.3791` | `multi-sentence,IP-MAT;@4,WORD,L099997,ILL,如是` | `如是` / no |
| `data/txt/trees/MYS_16.txt:568` | `MYS.16.3791` | `multi-sentence,IP-MAT;@4,WORD,L099997,ILL,所為故為` | `所為故為` / no |

Exact neighboring source context is in inventory.ill_lines. Non-ASCII code points are in inventory.outside_ascii_forms, cross-referenced by DI-012. No form, tag or annotation was changed.

## Unresolved semantic questions

### DI-005 — Ambiguous `NULL,*` lines

- **Status:** Pending chief-editor answer
- **Category:** unclear semantic/structural role
- **Extent:** 347 lines in 300 texts across 45 documents (65 under `data/txt/text`, 282 under `data/txt/trees`).
- **Examples:**

```txt
- **13 October recheck:** unchanged: 347 lines, 300 source texts, 45 documents. SYN retains original XML/TXT and raw comments rather than inventing empty terminals. CEQ-005 remains unanswered; current omission is not a semantic decision.

# data/txt/text/EN_01.txt, source ID 3_EN_01 (current XML ID EN.1.3)
IP-MAT,IP-ADV,IP-ADV,NP-PRD,IP-REL,ADJ-CLS,ACP-CLS,L000033,NULL,*

# data/txt/text/EN_01.txt, source ID 4_EN_01 (current XML ID EN.1.4)
IP-MAT,IP-ADV,COP-INF,NULL,*

# data/txt/trees/KK.txt
multi-sentence,IP-MAT,IP-ADV,PP-OB1,NP,IP-REL,ADJ-CLS,ACP-CLS,L000033,NULL,*
```

- **Current implementation:** every line ends with `*`, so it is classified as `CommentLine`, stored only as a positioned roundtrip comment, excluded from the syntax tree, and excluded from derived raw-text sentences.
- **Interpretive risk:** if these are empty terminals, the computational tree omits them; if they are source-format annotations, turning them into nodes would invent structure.
- **Chief-editor question:** CEQ-005.

## Anomalies

### DI-006 — Two anomalous marker-like lines

- **Status:** MYS.19.4220 attached-marker case Resolved; SM.29.2 bare-star case Open.
- **Evidence scope:** the 13 October COJ scan found one malformed numeric-@ marker and one bare-star anomaly after excluding the separately registered NULL,* lines. Source synchronization status is distinct from author-decision status.

#### MYS.19.4220 - attached marker (Resolved)

```txt
# data/txt/trees/MYS_19.txt:3839
IP-MAT,IP-ADV,NP-SBJ,N,L050918,PHON,maywobiki
IP-MAT,IP-ADV,IP-ADV,IP-EPT.18@於保夫祢能,*
IP-MAT,IP-ADV,IP-ADV,IP-EPT,MK,L020022,N,L050510,ADJ-STM,L007009a,PHON,opo
```

The project author reports that this typo has already been corrected in ONCOJ (PAQ-004): the period between IP-EPT and the numeric marker is replaced by a comma. It is awaiting normal ONCOJ to COJ synchronization. The old malformed line remains in this COJ checkout; that is not an unresolved author decision or permission to edit COJ source directly. The inventory retains the original line and its context. Its missing recognized marker 18 contributes to DI-009's current-checkout diagnostic; that observation does not reopen the resolved source correction.

#### Source 2_SM_29 / XML SM.29.2 - bare star (Open)

```txt
# data/txt/text/SM_29.txt:110
IP-MAT,PP-TOP,NP,IP-REL,PP-DAT,P-CASE,L000519,PHON,ni
IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*
IP-MAT,PP-TOP,NP,9@許止方不得,*
```

The investigation is complete, but intended content remains unknown (PAQ-005). Keep the substantive issue Open until reliable evidence or editorial review establishes it. Do not infer/reconstruct/propose a replacement or alter source data. The line is preserved as a raw comment without recognized source-segment/boundary semantics. Full original cases remain in inventory.malformed_markers / inventory.bare_stars.

## Cross-layer discrepancies

### DI-007 — Header and tree-derived transcription content discrepancies

- **Status:** Open; source-side authority/corrections still require review.
- **Current extent:** 5,665 texts; 640 exact matches, 5,013 segmentation-only differences, 12 content discrepancies.
- **Method:** current XML block@header vs ordered recognized CorpusLine.word_form values, ignoring whitespace only. Multipart pieces are included. This diagnostic is not a decision to replace either layer. DI-004 non-ASCII forms remain absent from recognized transcription.
- **Author policy (PAQ-006 and 13 October scope clarification):** **TXT → XML only** must report/register header/tree discrepancies and continue; do not silently choose a side or modify data. This does not specify XML → TXT policy. SYN reviewed write-back/export keeps its existing blocking rules for unresolved discrepancies. Automatic legacy converter reporting remains unimplemented. SYN opening already records historical-header/passage or passage/hierarchy disagreements.

#### Current discrepancy list

| XML file | Text ID | Character-difference excerpts (header → tree) |
|---|---|---|
| `data/xml/text/SM_45.xml` | `SM.45.20` | `i` -> `a` |
| `data/xml/text/SM_61.xml` | `SM.61.11` | `w` -> `<empty>` |
| `data/xml/trees/MYS_01.xml` | `MYS.1.9` | `莫囂圓隣之大相七兄爪謁氣` -> `<empty>` |
| `data/xml/trees/MYS_02.xml` | `MYS.2.156` | `已具耳矣自得見監乍共` -> `<empty>` |
| `data/xml/trees/MYS_04.xml` | `MYS.4.655` | `邑礼左變` -> `<empty>` |
| `data/xml/trees/MYS_07.xml` | `MYS.7.1306` | `<empty>` -> `N` |
| `data/xml/trees/MYS_09.xml` | `MYS.9.1740` | `a` -> `<empty>`; `<empty>` -> `bu` |
| `data/xml/trees/MYS_11.xml` | `MYS.11.2793` | `s` -> `ar` |
| `data/xml/trees/MYS_13.xml` | `MYS.13.3242` | `行靡闕` -> `<empty>` |
| `data/xml/trees/MYS_14.xml` | `MYS.14.3419;azuma_uta` | `奈可中次下` -> `<empty>` |
| `data/xml/trees/MYS_16.xml` | `MYS.16.3791` | `m` -> `<empty>`; `<empty>` -> `k`; `na` -> `bi`; `<empty>` -> `w`; `e` -> `i`; `<empty>` -> `ni`; additional differences in full inventory |
| `data/xml/trees/NSK.xml` | `NSK.40` | `t` -> `d` |

The inventory retains complete headers and transcriptions for all 12 cases. Nine historical IDs remain discrepant; 21 no longer fail this same check: `KK.4`, `MYS.10.2011`, `MYS.10.2026`, `MYS.11.2386`, `MYS.11.2478`, `MYS.12.2850`, `MYS.12.2922`, `MYS.12.3077`, `MYS.13.3289`, `MYS.15.3589`, `MYS.15.3625`, `MYS.16.3827b`, `MYS.17.4000`, `MYS.17.4023`, `MYS.19.4177`, `MYS.2.121`, `MYS.3.483`, `MYS.4.531`, `MYS.4.744`, `MYS.7.1101`, `MYS.7.1373`. Three current cases were not in the old list: MYS.7.1306, MYS.9.1740 and MYS.11.2793. Absence from the current diagnostic does not approve a linguistic correction.

#### Historical audit evidence

The older 30-case list is retained below to preserve audit history. Its spellings/locations are historical and must not be treated as the current source.

<details>
<summary>Historical audit: 30 discrepancies, not the current case list</summary>

| Source file | Text ID | Header | Tree-derived transcription | Concise content difference |
|---|---|---|---|---|
| `data/xml/text/SM_45.xml` | `SM.45.20` | `mata nori tamapi siku ko no mikadwo no kurawi to ipu mono pa ame no saduke tamapa nu pito ni saduke te pa tamotu koto mo e zu mata kapyeri te mwi mo porobwi nuru mono so` | `mata nori tamapa siku ko no mikadwo no kurawi to ipu mono pa ame no saduke tamapa nu pito ni saduke te pa tamotu koto mo e zu mata kapyeri te mwi mo porobwi nuru mono so` | `tamapi` vs `tamapa`. |
| `data/xml/text/SM_61.xml` | `SM.61.11` | `mata popusi no tukasa wo pazime te tera dera no tigyau no pito to tosi ya swodi ywori kamwi tu kata no popusi ama domo to ni mono podokosi tama pu` | `mata popusi no tukasa wo pazime te tera dera no tigyau no pito to tosi ya swodi ywori kami tu kata no popusi ama domo to ni mono podokosi tama pu` | `kamwi` vs `kami`. |
| `data/xml/trees/KK.xml` | `KK.4` | `nubatamano kurwoki mikyesi wo matubusani toriyosopi okitutori munamiru toki patatagi mo kore pa pusapazu pyetunami so ni nukiute swonidori no awoki mikyesi wo matubusani toriyosopi okitutori munamiru toki patatagi mo ko mo pusapazu pyetunami so ni nukiute yamagata ni makisi atate tuki somekwi ga siru ni simekoromo wo matubusani toriyosopi okitutori munamiru toki patatagi mo ko si yorosi itwokwoyano imwo no mikoto muratori no wa ga mureinaba piketori no wa ga pikeinaba nakazi to pa na pa ipu tomo yamato no pitomotosusuki unakabusi na ga nakasamaku cd no kwiri ni tatamu zo wakakusano tuma no mikoto koto no katarigoto mo ko woba` | `nubatama no kurwo ki mi kyesi wo ma tubusa ni tori yosopi oki tu tori muna miru toki patatagi mo kore pa pusapa zu pye tu nami so ni nuki ute swoni dori no awo ki mi kyesi wo ma tubusa ni tori yosopi oki tu tori muna miru toki patatagi mo ko mo pusapa zu pye tu nami so ni nuki ute yam agata ni maki si atate tuki some kwi ga siru ni sime koromo wo ma tubusa ni tori yosopi oki tu tori muna miru toki patatagi mo ko si yorosi itwokwoya no imwo no mikoto mura tori no wa ga mure inaba pike tori no wa ga pike inaba nakazi to pa na pa ipu tomo yamato no pito moto susuki una kabusi na ga naka sa maku asa ame no kwiri ni tata mu zo waka kusa no tuma no mikoto koto no katari goto mo ko woba` | Header `cd`; tree `asa ame`. |
| `data/xml/trees/MYS_01.xml` | `MYS.1.9` | `莫囂圓隣之 大相七兄爪謁氣 wa ga sekwo ga itataserikyemu itukasi ga moto` | `wa ga se kwo ga i tata s eri kye mu itu kasi ga moto` | ILL forms absent from recognized tree forms. |
| `data/xml/trees/MYS_02.xml` | `MYS.2.121` | `yupu saraba sipo mitikinamu suminoye no asakanoura ni tamamo karitena` | `yupu sareba sipo miti ki na mu suminoye no asa ka no ura ni tama mo kari tena` | `saraba` vs `sareba`. |
| `data/xml/trees/MYS_02.xml` | `MYS.2.156` | `mimoro no kamwi no kamusugwi 已具耳 矣自得見監乍共 inenu ywo zo opoki` | `mimoro no kamwi no kamu sugwi i ne nu ywo zo opo ki` | ILL forms absent from recognized tree forms. |
| `data/xml/trees/MYS_03.xml` | `MYS.3.483` | `asatorino ne nomwi si nakayu wagimokwo ni ima mata sarani apu yosi wo nami` | `asa tori no ne nomwi si naka mu wagimo kwo ni ima mata sara ni apu yosi wo na mi` | `nakayu` vs `nakamu`. |
| `data/xml/trees/MYS_04.xml` | `MYS.4.531` | `adusayumi tumapiku ywooto no topooto ni mo kimi ga miyuki wo kikaku si yosi mo` | `adusa yumi tuma piku ywo to no topo to ni mo kimi ga mi yuki wo kikaku si yo si mo` | Two extra `o` characters in the header compounds. |
| `data/xml/trees/MYS_04.xml` | `MYS.4.655` | `omopanu wo omopu to ipaba ametuti no kamwi mo sirasamu opo re sa kapyeru` | `omopa nu wo omopu to ipaba ame tuti no kamwi mo sira sa mu` | Header has trailing `oporesakapyeru`; also `omopanu` vs `omopanu` after spacing is otherwise equal. |
| `data/xml/trees/MYS_04.xml` | `MYS.4.744` | `yupu saraba yadwo akemakete ware matamu ime ni apimi ni komu to pu pito wo` | `yupu sareba yadwo ake makete ware mata mu ime ni api mi ni ko mu to pu pito wo` | `saraba` vs `sareba`. |
| `data/xml/trees/MYS_07.xml` | `MYS.7.1101` | `nubatamano yworu sarikureba makimukunokapa to takasi mo arasi ka mo twoki` | `nubatama no yworu sari kureba makimuku no kapa oto taka si mo arasi ka mo two ki` | Tree has additional `o` before `taka`. |
| `data/xml/trees/MYS_07.xml` | `MYS.7.1373` | `kasugayama yama takaka rasi ipa no pe no suga no ne mimu ni tukwi matigataki` | `kasuga yama yama taka ka rasi ipa no pe no suga no ne mi mu ni tukwi mati gata si` | Final `k` vs `s` (`matigataki` / `matigatasi`). |
| `data/xml/trees/MYS_10.xml` | `MYS.10.2011` | `ama no gapa imukapitatite kwopu ramu ni koto dani tugemu tuma to ipu made pa` | `ama no gapa i mukapi tatite kwopu ramu ni koto dani tuge mu tuma dopu made pa` | `tuma to ipu` vs `tuma dopu` and `tugemu`/`tugemu` segmentation aside. |
| `data/xml/trees/MYS_10.xml` | `MYS.10.2026` | `sirakumo no ipopye gakurite topokyedomo yworu sarazu mimu imo ga atari pa` | `sira kumo no i po pye ni kakuri topo kyedomo yworu sara zu mi mu imo ga atari pa` | Header `gakurite`; tree `nikakuri`. |
| `data/xml/trees/MYS_11.xml` | `MYS.11.2386` | `ipapo sura yukitoporu beki masurawo mo kwopwi to ipu koto pa noti kui ni ari` | `ipapo sura yuki toporu be ki masura wo mo kwopwi to ipu koto pa noti no kui ari` | Tree adds `no`; header has extra `in` near the ending. |
| `data/xml/trees/MYS_11.xml` | `MYS.11.2478` | `akikasipa uruwakapapye no sinwonome no pito ni pa apane kimi ni apenaku` | `aki kasipa uruwa kapa pye no sinwonome no pito ni pa sinobwi kimi ni ape naku` | `apane` vs `sinobwi`. |
| `data/xml/trees/MYS_12.xml` | `MYS.12.2850` | `ututu ni pa tadani pa apane ime ni dani apu to miyekoso wa ga kwopuraku ni` | `ututu ni pa tada ni pa apa ne ime ni dani apu to mi ye koso a ga kwopuraku ni` | `wa ga` vs `a ga`. |
| `data/xml/trees/MYS_12.xml` | `MYS.12.2922` | `yupu saraba kimi ni apamu to omope koso pi no kururaku mo uresikarikyere` | `yupu sareba kimi ni apa mu to omope koso pi no kururaku mo uresi kari kyere` | `saraba` vs `sareba`. |
| `data/xml/trees/MYS_12.xml` | `MYS.12.3077` | `misagwo wiru ariswo ni opuru nanoriso no yosi na pa norase oya pa siru tomo` | `misagwo wiru ariswo ni opu ru nanoriso no yosi na pa norazi oya pa siru tomo` | `norase` vs `norazi`. |
| `data/xml/trees/MYS_13.xml` | `MYS.13.3242` | `momokine minwonokuni no takakita no kukuri no miya ni pimukapi ni 行靡闕 wo ari to kikite wa ga yuku miti no okiswoyama minwo no yama nabikye to pito pa pumedomo kaku yore to pito pa tukedomo kokoro naki yama no okiswoyama minwo no yama` | `momokine minwo no kuni no taka kita no kukuri no miya ni pi mukapi ni wo ari to kikite wa ga yuku miti no okiswo yama minwo no yama nabikye to pito pa pumedomo kaku yore to pito pa tukedomo kokoro na ki yama no okiswo yama minwo no yama` | ILL form `行靡闕` absent from recognized tree forms. |
| `data/xml/trees/MYS_13.xml` | `MYS.13.3289` | `mipakasiwo turugi no ike no patisupa ni tamareru midu no yukupye nami wa ga suru toki ni apu besi to apitaru kimi wo na ne so to papa kikosedomo wa ga kokoro kiywosumi no ike no ike no soko ware pa wasurezi tadani apu madeni` | `mi pakasi wo turugi no ike no patisu pa ni tamar eru midu no yuku pye na mi a ga suru toki ni apu be si to api taru kimi wo na ne so to papa kikosedomo wa ga kokoro kiywosumi no ike no ike no soko ware pa wasurezi tada ni apu made ni` | `wa ga` vs `a ga`. |
| `data/xml/trees/MYS_14.xml` | `MYS.14.3419;azuma_uta` | `ikapo se ywo 奈可中次下 omopitworo kuma koso situ to wasure senapu mo` | `ikapo se ywo omopi tworo kuma koso si tu to wasure se napu mo` | ILL form `奈可中次下` absent from recognized tree forms. |
| `data/xml/trees/MYS_15.xml` | `MYS.15.3589` | `yupu saraba pigurasi kinaku ikwomayama kwoyete so a ga kuru imo ga me wo pori` | `yupu sareba pigurasi ki naku ikwoma yama kwoyete so a ga kuru imo ga me wo pori` | `saraba` vs `sareba`. |
| `data/xml/trees/MYS_15.xml` | `MYS.15.3625` | `yupu sareba asibye ni sawaki akekureba oki ni nadusapu kamo sura mo tuma to tagupite wa ga wo ni pa simo na puri so to sirwotapeno pane sasikapete utiparapi sane to pu monowo yuku midu no kapyeranu gotoku puku kaze no miyenu ga gotoku atwo mo naki yo no pito nisite wakarenisi imo ga kisetesi naregoromo swode katasikite pitori ka mo nemu` | `yupu sareba asi bye ni sawaki ake kureba oki ni nadusapu kamo sura mo tuma to tagupite wa ga wo ni pa simo na puri so to sirwo tape no pane sasi kapete uti parapi sa nu to pu monowo yuku midu no kapyera nu goto ku puku kaze no mi ye nu ga goto ku atwo mo na ki yo no pito nisite wakare ni si imo ga kise te si nare goromo swode kata sikite pito ri ka mo ne mu` | `sane` vs `sanu`. |
| `data/xml/trees/MYS_16.xml` | `MYS.16.3791` | `midorikwo no wakigwogami ni pa taratisi papa ni mudakaye pimutuki no papukwogami ni pa yupukataginu pitura ni nupiki unatuki no warapagami ni pa yupipata no swodetukegoromo kisi ware wo nipopiyoru kwora ga yoti ni pa minanowata kagurwosi kami wo makusi moti koko ni kakitare toritukane agete mo maki mi tokimidari warapa ni nasi mi sanitukapu iro natukasiki murasaki no opoaya no kinu suminoye no toposatwowonwo no mapari moti nipoposi kinu ni komanisiki pimo ni nupituke 刺部重部 namikasanekite utiswoyasi womi no kwora arikinuno takara no kwora ga ututape pa pete oru nunwo pizarasi no asatedukuri wo 信巾裳成 者之寸丹取爲支 屋所經 inakiwotomye ga tumadopu to ware ni zo okosesi wotikata no putaayasitagutu tobutorino asukawotokwo ga nagame imi nupisi kurwogutu sasipakite nipa ni tatazumye makari na tati to sapuru wotomye ga ponokikite ware ni okosesi mipanada no kinu no obi wo pikiobi nasu karaobi ni torase watatumi no tono no iraka ni tobikakeru sugaru no gotoki kosiboso ni torikazarapi maswokagami torinamekakete ono ga kapo kapyerapi mitutu paru sarite nwopye wo megureba omosirwomi ware wo omope ka sanwotutori kinakikakerapu aki sarite yamapye wo yukeba natukasi to ware wo omope ka amakumo mo yukitanabikinu kapyeritati miti wo kureba utipisasu miyawomina sasutakeno toneriwotokwo mo sinoburapi kapyerapi mitutu ta ga kwo so to ya omopayete aru 如是 所爲故爲 inisipye sasakisi ware ya pasikiyasi kyepu ya mo kwora ni isa ni to ya omopayete aru 如是 所爲故爲 inisipye no sakasiki pito mo noti no yo no kagami ni semu to oipito wo okurisi kuruma motikapyerikyeri motikapyerikyeri` | `midorikwo no waku gwo ga mwi ni pa taratisi papa ni udaka ye pimutuki no papu kwo gami ni pa yupu kata ginu pitura ni nupi ki kubi tuki no warapa ga mwi ni pa yupi pata no swode tuke goromo ki si ware wo nipopi yoru kwo ra ga yoti ni pa mina no wata ka gurwo si kami wo ma kusi moti koko ni kaki tari tori tukane agete mo maki mi toki midari warapa ni nasi mi sa ni tukapu iro ni natukasi ki murasaki no opo aya no kinu suminoye no topo satwo wo nwo no ma pari moti ni posi si kinu ni koma nisiki pimo ni nupi tuke nami kasane ki uti swo ya si womi no kwo ra arikinu no takara no kwo ra ga uti tape pa pete oru nunwo pi sarasi no asa te dukuri wo inaki wotomye ga tuma dopu to ware ni okose si wotikata no puta aya sita gutu tobu tori no asuka wotokwo ga nag ame imi nupi si kurwo gutu sasi pakite nipa ni tatazume makari na tati to sapuru wotomye ga pono kikite ware ni okose si mipanada no kinu no obi wo piki obi nasu kara obi ni tora se watatumi no tono no iraka ni tobi kakeru sugaru no goto ki kosi boso ni tori kazara pi maswo kagami tori name kakete ono ga kapo kapyerapi mitutu paru sarite nwo pye wo megureba omosirwo mi ware wo omo pe ka sa nwo tu tori ki naki kakera pu aki sarite yama pye wo yukeba natukasi to ware wo omo pe ka ama kumo mo yuki tanabiki nu kapyeri tati miti wo kureba utipi sasu miya womina sasutake no toneri wotokwo mo sino burapi kapye rapi mitutu ta ga kwo so to ya omopa yete aru inisipye sasaki si ware ya pasikiyasi kyepu ya mo kwo ra ni isa ni to ya omopa yete aru inisipye no sakasi ki pito mo noti no yo no kagami ni se mu to oi pito wo okuri si kuruma moti kapyeri k yeri moti kapyeri k yeri` | Multiple romanization/content differences plus all seven ILL occurrences absent from recognized tree forms. Requires line-by-line editorial comparison; no layer should overwrite the other. |
| `data/xml/trees/MYS_16.xml` | `MYS.16.3827b` | `iti ni no me nomwi ni arazu go roku samu si sape arikyeri suguroku no saye` | `iti ni no me nomwi ni pa ara zu go roku samu si sape ari kyeri suguroku no saye` | Tree adds `pa`. |
| `data/xml/trees/MYS_17.xml` | `MYS.17.4000` | `amazakaru pina ni na kakasu kwosi no naka kunuti kotogoto yama pa si mo sizini aredomo kapa pa si mo sapani yukedomo sumyekamwi no usipakiimasu nipikapa no so no tatiyama ni tokonatu ni yuki purisikite obaseru katakapigapa no kiywoki se ni asaywopi gotoni tatu kwiri no omopisugwime ya arigaywopi iya tosinopa ni yoso nomwi mo purisakemitutu yoroduyo no katarapigusa to imada minu pito ni mo tugemu oto nomwi mo na nomwi mo kikite tomosiburu gane` | `ama zakaru pina ni na kaka su kwosi no naka kun uti kotogoto yama pa si mo sizi ni aredomo kapa pa si mo sapa ni yukedomo sumye kamwi no usipaki imasu nipikapa no so no tatiyama ni toko natu ni yuki puri sikite oba s eru katakapi gapa no kiywo ki se ni asa ywopi gotoni tatu kwiri no omopi sugwi me ya ari gaywopi iya tosi no pa ni yoso nomwi mo purisake mi tutu yorodu yo ni katarapi gusa to imada mi nu pito ni mo tuge mu oto nomwi mo na nomwi mo kikite tomosiburu gane` | `obaseru` vs `obas eru` is segmentation; actual compared difference is header `o` vs tree `i` in the surrounding sequence and needs editorial localization. |
| `data/xml/trees/MYS_17.xml` | `MYS.17.4023` | `myepikapa no payaki se gotoni kagari sasi yaswotomonowo pa ukapa tatikyeri` | `myepi kapa no paya ki se gotoni kagari sasi yaswo yaswo tomonowo pa u kapa tati kyeri` | Tree repeats/adds `yaswo`. |
| `data/xml/trees/MYS_19.xml` | `MYS.19.4177` | `wa ga sekwo to te tadusaparite akekureba idetatimukapi yupu sareba purisakemitutu omopinobe minagwisi yama ni yatuwo ni pa kasumi tanabiki tanipye pa tubakipana saki uraganasi ni paru si sugureba pototogisu iya siki nakinu pitori nomwi kikeba sabusi mo kimi to are to pyedatete kwopuru twonamiyama tobikwoyeyukite aketataba matu no sayeda ni yupu saraba tukwi ni mukapite ayamyegusa tama nuku madeni nakitoyome yasui nesimezu kimi wo nayamase` | `wa ga sekwo to te tadusaparite ake kureba ide tati mukapi yupu sareba purisake mi tutu omopi nobe mi nagwi si yama ni ya tu wo ni pa kasumi tanabiki tani pye pa tubaki pana saki ura ganasi ni paru si sugureba pototogisu iya siki naki nu pito ri nomwi kike ba sabusi mo kimi to are to pyedatete kwopu ru twonami yama tobi kwoye yukite ake tataba matu no sa yeda ni yupu sareba tukwi ni mukapite ayamye gusa tama nuku madeni naki toyome yasu i ne sime zu kimi wo nayamase` | Later `yupu saraba` vs `yupu sareba`. |
| `data/xml/trees/NSK.xml` | `NSK.40` | `apadisima iya putanarabi adukisima iya putanarabi yorosiki simasima ta ka tasarearatisi kibwi n aru imo wo apimituru mono` | `apadi sima iya puta narabi aduki sima iya puta narabi yorosi ki sima sima daka tasarearatisi kibwi n aru imo wo api mi turu mono` | `taka` vs `daka`. |

</details>

The concise descriptions are mechanical character-level differences after removing spaces; they are not editorial diagnoses. CEQ-002 addresses segmentation generally. PAQ-006 asks how content discrepancies should be validated and resolved.

## Terminology ambiguity

### DI-008 — Current source-text placeholders are not necessarily kanji

- **Status:** Open terminology/schema issue; data not to be “fixed” automatically
- **Category:** representation naming mismatch
- **Evidence:** the current marker corpus contains placeholder payloads, including `x`-based source strings in `BS.20`, while XML stores every payload under `<kanji>`.
- **Current implementation:** `treditor` labels/displays the field as kanji in several places; search indexes it as the `kanji` field.
- **Project-author decision:** conceptually this may be source/original text, but the XML tag must not be renamed now.
- **Chief-editor question:** CEQ-003.
- **Current architecture:** source-first SYN stores numbered passages with an original-source string and independently entered transcription. Historical XML still uses kanji; no current tag rename is implied. Terminology remains CEQ-003, and uncertain source-character forms are recorded under DI-004/DI-012.

## Additional current investigations

### DI-009 — Numbered-marker sequence irregularities

- **Status:** Open for author review; labels are nonsemantic under PAQ-003.
- **Method/extent:** scan all 37,707 recognized markers across 5,665 TXT blocks. Ten sequences differ from diagnostic 0-based consecutive numbering. Gaps/restarts/swaps are observations, not automatic error classifications. Source order, payload and structural boundaries must remain unchanged.

| Text ID | TXT file | First-last marker line | Complete observed sequence |
|---|---|---|---|
| `MYS.3.276b` | `data/txt/trees/MYS_03.txt` | 1470–1489 | `0,3,4,0,1` |
| `MYS.3.319` | `data/txt/trees/MYS_03.txt` | 2750–2914 | `0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,35,33,34,36` |
| `MYS.6.920` | `data/txt/trees/MYS_06.txt` | 490–588 | `0,1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23` |
| `MYS.6.923` | `data/txt/trees/MYS_06.txt` | 648–723 | `0,1,2,3,4,5,6,7,8,9,10,11,12,14,13,15,16,17,18` |
| `MYS.6.1053` | `data/txt/trees/MYS_06.txt` | 5677–5796 | `0,1,2,3,4,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27` |
| `MYS.9.1759` | `data/txt/trees/MYS_09.txt` | 3469–3548 | `0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19` |
| `MYS.16.3867` | `data/txt/trees/MYS_16.txt` | 2729–2748 | `0,1,2,4,3` |
| `MYS.17.4006` | `data/txt/trees/MYS_17.txt` | 4801–5016 | `0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,34,37,36,38,39,40,41,42,43,44,45,46,48,47,49,50,51,52` |
| `MYS.19.4220` | `data/txt/trees/MYS_19.txt` | 3765–3862 | `0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19,20,21,22,23,24` |
| `MYS.20.4398` | `data/txt/trees/MYS_20.txt` | 3174–3360 | `0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45` |

Every marker's exact raw line and neighboring context are inventory.marker_sequences. For MYS.3.276b only, the author believes 0,1,2,3,4 intended; source correction still requires explicit confirmation. MYS.19.4220 shares the malformed-marker cause recorded once in DI-006. No labels were renumbered.

### DI-010 — Writing-mode distinction suffix `LOG;@2`

- **Status:** Open semantics; documentation-only investigation complete (PAQ-008).
- **Extent:** all 14 current occurrences are below; exact original lines and neighbors are inventory.log_suffix.
- **Implementation:** phon=LOG / phon_index=2 restores the original suffix. SYN retains annotation metadata; representation is not an answer about semantics.

| Source and line | Source text ID | Original line |
|---|---|---|
| `data/txt/text/EN_08.txt:466` | `1_EN_08` | `IP-MAT,IP-ARG,IP-ADV,IP-ARG,NP,N,C-N,IP-REL,NP-PRD,PEN,LOG;@2,toyo` |
| `data/txt/text/SM_19.txt:180` | `2_SM_19` | `IP-MAT,N,N,LOG;@2,goto` |
| `data/txt/text/SM_25.txt:308` | `7_SM_25` | `IP-MAT,IP-ADV,IP-ADV,IP-ADV,IP-ADV,ADJ-INF,ADJ-STM,LOG;@2,swo` |
| `data/txt/text/SM_26.txt:49` | `2_SM_26` | `CP-FINAL,IP-SUB,IP-ADV,IP-ADV,IP-ADV,IP-ADV,VB,VB-STM,L030402a,LOG;@2,si` |
| `data/txt/trees/MYS_02.txt:314` | `MYS.2.94b` | `IP-MAT,IP-ADV,VB-CND,VAX-NEG-CND,L000006a,LOG;@2,pa` |
| `data/txt/trees/MYS_04.txt:6809` | `MYS.4.713` | `IP-MAT,NP,IP-REL,IP-ADV,IP-ADV,NP-PRD,N,L090706,LOG;@2,po` |
| `data/txt/trees/MYS_07.txt:2520` | `MYS.7.1162` | `IP-MAT,NP-SBJ,N,L050677,LOG;@2,dori` |
| `data/txt/trees/MYS_09.txt:3464` | `MYS.9.1758` | `IP-MAT,VB-OPT,L031100a,LOG;@2,wora` |
| `data/txt/trees/MYS_10.txt:7538` | `MYS.10.2089` | `IP-MAT,PP,NP,NP,PP,NP,PP,NP,N,L090385,LOG;@2,tukwi` |
| `data/txt/trees/MYS_11.txt:1930` | `MYS.11.2417` | `IP-MAT,PP-OB1,NP,IP-REL,VB-ADN,VB-STM,L030529a,LOG;@2,sabwi` |
| `data/txt/trees/MYS_11.txt:2630` | `MYS.11.2444` | `IP-MAT,IP-ADV,COP-EXC,L031966,LOG;@2,are` |
| `data/txt/trees/MYS_12.txt:8785` | `MYS.12.3150` | `IP-MAT,PP-ADV-PTH,NP,IP-REL,IP-ADV,NP-SBJ,N,L051661,LOG;@2,ka` |
| `data/txt/trees/MYS_13.txt:4132` | `MYS.13.3291a` | `multi-sentence,IP-MAT;@2,IP-ADV,COP-CND,L031966,LOG;@2,araba` |
| `data/txt/trees/MYS_13.txt:4233` | `MYS.13.3291b` | `multi-sentence,IP-MAT;@2,IP-ADV,COP-CND,L031966,LOG;@2,araba` |

No occurrence was modified or reinterpreted.

### DI-011 — Dictionary field presence and preservation limitations

- **Status:** Author semantic policy answered (PAQ-014); implementation gaps and source cases await review.
- **Policy:** missing and explicitly blank are distinct. Do not fill/remove source fields during this investigation.
- **Current source blanks:** exactly two, both MEANING; both survive the current XML mapping.

| Entry | Source line | Original field | Adjacent content |
|---|---|---|---|
| `L080104` | `data/txt/dict/dictionary.txt:48838` | `.MEANING<TAB>` (empty value) | `.GLOSS	EPITHET`; `.FORM	yapotadewo` |
| `L091024` | `data/txt/dict/dictionary.txt:54326` | `.MEANING<TAB>` (empty value) | `.GLOSS	EPITHET`; `.FORM	takakurano` |

- **Missing required fields:** L050830 lacks GLOSS/MEANING/FORM/KANA/POS; L080156 and L099997 lack POS. Other absent optional-field counts are inventory.dictionary.field_absent_entries. Absence is not labeled a source error here.
- **Current-data roundtrip probe:** all 6,498 parsed entry field maps survive TXT model → XML → model, including these blanks. This does not cover skipped untagged content (DI-003) or physical syntax/order identity.
- **Normalization probe, on copies only:** three entries change semantic presence states. L080156/L099997 gain POS=[]; L050830 gains GLOSS="", MEANING=[], FORM=[], KANA=[""] and POS=[]. Empty repeated lists emit no TXT occurrence; a bare blank KANA without FORM is not serialized to XML.
- **Synthetic mapping probes:** blank optional singular CORRESP disappears; orphan/extra KANA values disappear; FORM without KANA gains a blank KANA; unmapped fields disappear. These are implementation counterexamples, not claims that those fixtures occur in current source. Indexed field values are reordered by explicit index and duplicate singular occurrences overwrite.
- **Current architecture:** no SYN dictionary codec exists; generic corpus compatibility snapshots do not resolve these dictionary mappings. PAQ-019 owns unsupported-formal-data policy. Full field/order/model/normalization evidence is inventory.dictionary.

### DI-012 — Nonalphabetic syntax/form candidates and provisional trace notation

- **Status:** Formal repertoire/categories open (PAQ-007/PAQ-018); no validator or source change authorized.
- **Complete extent:** 258 nonalphabetic final-field candidates: 243 *T* lines in 182 texts/25 documents and 15 non-ASCII ILL lines. The ILL issue/examples are owned by DI-004, not a second data-error list. All five x-based ILL forms are ASCII and remain in DI-004's inventory. An independent scan of every non-comment/nonheader/non-ID tree line found no other nonalphabetic final field.
- **Evidence:** inventory.outside_ascii_forms records actual final strings, every Unicode character/code point, file/line, source ID and neighbors; inventory.traces retains every complete *T* line. Candidate location does not prove a formally permitted word form.
- **Current representation:** *T* becomes `_T_` with raw_tag=*T*, empty form/phon; XML → TXT restores the literal tag. It participates in the tree tag payload, not ordinary recognized transcription/form search. SYN keeps the category and original snapshots but supplies no finalized trace semantics. Author's trace interpretation is provisional and awaits chief-editor confirmation sought by the author.
- **Source-character understanding:** author explains some characters as uncertain/untranscribed source information; do not classify all observed forms by guess or broaden the alphabetic validator indiscriminately. Meaningful information must be retained while the formal category design remains open.

# Resolved / closed data issues

### DI-002 — Duplicate dictionary ID `L080539`

- **Status:** Resolved in current imported data; historical parser risk retained
- **Category:** data loss during TXT parsing
- **Historical evidence:** two consecutive entries occurred in `data/txt/dict/dictionary.txt`:

```txt
=== L080539
.GLOSS	Shibi
.MEANING	Shibi
.FORM	sibi
.KANA	シビ
.POS	personal name

=== L080539
.GLOSS	Hegomori
.MEANING	Hegomori
.FORM	pyegomori
.KANA	ヘゴモリ
.POS	personal name
```

- **Historical implementation/data result:** `Dictionary.from_text()` assigns entries into an ID-keyed ordered mapping. The second silently replaces the first. At that time XML contained only Hegomori/`pyegomori`.
- **Historical effect:** one entry is lost during TXT parsing, and corpus references to the shared ID remain ambiguous.
- **Related question:** PAQ-012.

- **13 October verified resolution:** `dictionary.txt:47697` is L080725/Shibi/sibi; :47705 is L080539/Hegomori/pyegomori. Both entries are present in XML. The allocation was already imported in 5558e2a; this investigation allocated no ID and changed no dictionary data. No duplicate headings remain among 6,498 current entries. TXT duplicate parsing still uses last-write replacement if future collisions occur; this residual behavior is not resolved by the data correction. See PAQ-012.
