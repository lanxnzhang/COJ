# Open data issues

This is an evidence register, not a priority list. **Open** means that a data problem or interpretation still needs attention; it does not imply urgency or a parser failure.

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

### DI-002 — Duplicate dictionary ID `L080539`

- **Status:** Open
- **Category:** data loss during TXT parsing
- **Evidence:** two consecutive entries occur in `data/txt/dict/dictionary.txt`:

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

- **Current implementation:** `Dictionary.from_text()` assigns entries into an ID-keyed ordered mapping. The second silently replaces the first. Current XML contains only Hegomori/`pyegomori`.
- **Effect:** one entry is lost during TXT parsing, and corpus references to the shared ID remain ambiguous.
- **Related question:** PAQ-012.

### DI-003 — Truncated multiline note for `L051953`

- **Status:** Open
- **Category:** data loss during TXT parsing
- **Source:** `data/txt/dict/dictionary.txt:47777-47778`

```txt
.NOTE	Shinano Province corresponds to Nagano prefecture (Nakanishi 1985: 452 in Vovin 2012: 32). Shinanwo shore is likely near Fushiki-Toyama Port (Omodaka 1984.17:
217-218, Nakanishi 1985: 452, Hashimoto 1985: 293 in Vovin 2015: 191).
```

- **Current implementation:** the field regex reads only the first physical line. The continuation does not begin with a recognized tag and is silently skipped. Current XML `<note>` ends at `Omodaka 1984.17:`.
- **Effect:** bibliographic/editorial content is lost without an error.
- **Related question:** PAQ-013.

## Parser limitations

### DI-004 — `ILL` special word forms

- **Status:** Open; chief-editor semantics pending
- **Category:** parser/model mismatch
- **Project-author clarification:** the final field after `ILL` is a special **word form**, possibly a form whose transcription is unknown or uncertain.
- **Current implementation:** an ordinary TXT word form must match ASCII letters. The five `x`-based forms are recognized correctly. The fifteen non-ASCII forms are not recognized: `word_form`, `phon_tag`, and typed `lemma_id` become absent, while `L099997`, `ILL`, and the special form are treated as syntax-path components. XML therefore creates nested `<ILL>` and sanitized elements with `raw_tag="special form"` instead of a leaf `phon="ILL" form="special form"`.
- **Effect:** the current XML is semantically incomplete for these forms, and tree-derived text/search cannot treat them as word forms.
- **Chief-editor question:** CEQ-004.

#### Complete current example list

<details>
<summary>Show all 20 current ILL lines and their present interpretation</summary>


| Source and line | Text ID | Complete TXT line | Special form | Current parser/XML interpretation |
|---|---|---|---|---|
| `data/txt/trees/BS.txt:331` | `BS.11` | `FRAG,WORD,L099997,ILL,xxx` | `xxx` | Correctly recognized leaf: `<WORD lemma="L099997" phon="ILL" form="xxx"/>`. |
| `data/txt/trees/BS.txt:622` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,x` | `x` | Recognized form; becomes first part of multipart `xtuxxx`. |
| `data/txt/trees/BS.txt:624` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,xxx` | `xxx` | Recognized form; becomes third part of multipart `xtuxxx`. |
| `data/txt/trees/BS.txt:626` | `BS.21` | `multi-sentence,IP-MAT,FRAG,WORD,L099997,ILL,xxxx` | `xxxx` | Recognized form; becomes first part of multipart `xxxxpitaru`. |
| `data/txt/trees/BS.txt:629` | `BS.21` | `multi-sentence,IP-MAT,FRAG,NP-ADV,PP,NP,WORD,L099997,ILL,xx` | `xx` | Correctly recognized leaf with `phon="ILL" form="xx"`. |
| `data/txt/trees/MYS_01.txt:462` | `MYS.1.9` | `multi-sentence,IP-MAT,WORD,L099997,ILL,莫囂圓隣之` | `莫囂圓隣之` | Misread as path; XML `<WORD lemma="L099997"><ILL><_____ raw_tag="莫囂圓隣之" phon="" form=""/></ILL></WORD>`. |
| `data/txt/trees/MYS_01.txt:464` | `MYS.1.9` | `multi-sentence,IP-MAT,WORD,L099997,ILL,大相七兄爪謁氣` | `大相七兄爪謁氣` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_02.txt:2970` | `MYS.2.156` | `IP-MAT,WORD,L099997,ILL,已具耳` | `已具耳` | Misread as path; `<ILL>` contains sanitized child `raw_tag="已具耳"`. |
| `data/txt/trees/MYS_02.txt:2972` | `MYS.2.156` | `IP-MAT,WORD,L099997,ILL,矣自得見監乍共` | `矣自得見監乍共` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_04.txt:5297` | `MYS.4.655` | `multi-sentence,IP-MAT;@2,WORD,L099997,ILL,邑礼左變` | `邑礼左變` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_13.txt:1320` | `MYS.13.3242` | `IP-MAT,NP-VOC,CONJP,NP,IP-REL,NP-PRD,IP-REL,IP-ADV,IP-ARG,PP-SBJ,NP,WORD,L099997,ILL,行靡闕` | `行靡闕` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_14.txt:2110` | `MYS.14.3419;azuma_uta` | `multi-sentence,IP-MAT,WORD,L099997,ILL,奈可中次下` | `奈可中次下` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:280` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,WORD,L099997,ILL,刺部重部` | `刺部重部` | Misread as path; XML `<ILL>` contains sanitized child `raw_tag="刺部重部"`. |
| `data/txt/trees/MYS_16.txt:322` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,信巾裳成` | `信巾裳成` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:324` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,者之寸丹取爲支` | `者之寸丹取爲支` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:326` | `MYS.16.3791` | `multi-sentence,IP-MAT;@2,IP-ADV,WORD,L099997,ILL,屋所經` | `屋所經` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:537` | `MYS.16.3791` | `multi-sentence,IP-MAT,WORD,L099997,ILL,如是` | `如是` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:539` | `MYS.16.3791` | `multi-sentence,IP-MAT,WORD,L099997,ILL,所爲故爲` | `所爲故爲` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:566` | `MYS.16.3791` | `multi-sentence,IP-MAT;@4,WORD,L099997,ILL,如是` | `如是` | Misread as path; sanitized child with `raw_tag`. |
| `data/txt/trees/MYS_16.txt:568` | `MYS.16.3791` | `multi-sentence,IP-MAT;@4,WORD,L099997,ILL,所爲故爲` | `所爲故爲` | Misread as path; sanitized child with `raw_tag`. |

</details>

## Unresolved semantic questions

### DI-005 — Ambiguous `NULL,*` lines

- **Status:** Pending chief-editor answer
- **Category:** unclear semantic/structural role
- **Extent:** 347 lines in 300 texts across 45 documents (65 under `data/txt/text`, 282 under `data/txt/trees`).
- **Examples:**

```txt
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

- **Status:** Open
- **Category:** ambiguous/malformed source syntax

#### MYS.19 marker attached to a path tag

```txt
# data/txt/trees/MYS_19.txt:3838
IP-MAT,IP-ADV,IP-ADV,IP-EPT.18@於保夫祢能,*
```

Current marker recognition requires the numeric marker to begin after a comma. `18@...` is attached to `IP-EPT.` and therefore is preserved as a raw roundtrip comment but does not create a raw-text segment or normal marker boundary.

#### SM.29 bare star line

```txt
# data/txt/text/SM_29.txt:110
IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*
```

This is also preserved as a raw roundtrip comment but has neither numbered source-text payload nor recognized boundary semantics.

- **Current result:** raw preservation protects textual round-trip, but does not establish intended structure or source-text processing.
- **Related questions:** PAQ-004 and PAQ-005.

## Cross-layer discrepancies

### DI-007 — Header and tree-derived transcription content discrepancies

- **Status:** Open
- **Category:** inconsistent meaningful transcription layers
- **Extent:** all 5,665 current texts have a header. In the audit, 640 headers exactly matched tree token spacing, 4,995 differed only in segmentation, and the following 30 differed after all spaces were removed.
- **Project-author decision:** header and tree transcription are both meaningful. Segmentation differences can be intentional, but underlying content should not normally differ. Do not silently replace either layer.
- **Method:** compare `block@header` with the concatenation of every recognized tree `word_form`, ignoring whitespace only. Because DI-004 forms are not recognized, affected ILL text appears as content present only in the header.

<details>
<summary>Show all 30 content discrepancies</summary>

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

# Resolved / closed data issues

No data issue has been explicitly resolved or closed yet.
