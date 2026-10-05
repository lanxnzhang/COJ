# Questions about unlisted corpus annotations

Several annotations in the current corpus are absent from, or insufficiently explained by, the current ONCOJ abbreviation reference. Please help confirm their meanings and whether they should be added to that reference. The examples below retain the existing annotations; no corrections have been made.

For each genuine category, please provide its expansion, annotation function, relationship to similar labels, and appropriate reference section. Where applicable, please specify **Parts of speech: Words**, **Parts of speech: Bound morphemes**, or another category. Existing explanations in software are provisional, not assumed to be authoritative.

EN/SM identifiers use dotted spelling: `EN.1.1` corresponds to source ID `1_EN_01`. The [detailed investigation](tag-investigation-report.md) contains counts and further evidence; this shorter document omits parser and XML-name artifacts.

## Main questions

### 1. The C family

What does `C-` mean in `C-N`, `C-NP`, `C-ADV`, `C-PP`, and `C-IP`? Does its function remain the same across the family? How do these labels relate to `CONJP`, ordinary phrases, and internally structured words?

EN.1.1 contains:

```text
IP-ARG
├── C-NP       → N(kamu, nusi)
└── C-NP;@5    → N(papuri, ra)
```

Other examples are `C-N` in EN.1.2, `C-PP` in EN.1.3, `C-ADV` in EN.12.1, and `C-IP` in EN.12.3. Some contain substantial phrase or clause structure. Software describes several as “compound” categories; is that interpretation correct?

### 2. Apposition and nominal labels

- **`APP-N` / `APP-NP`:** What do these labels mean, and how do they differ from `NP-APP`? EN.1.6 has `NP-PRD → N → APP-N → N sumyera`; EN.7.3 has `APP-NP` containing `kotosi no …`.
- **`CP-N`:** What is its function? EN.3.2 has `N → CP-N → N(ADJ-STM nigi, N sine)`. Software calls it “noun complementizer phrase”; is that correct?
- **`N-DVB`:** How does it differ from `DVN`? EN.10.5 annotates `twopa` as `N-DVB`.
- **`ADV-WH`:** Is this distinct from `WH-ADV`? In MYS.1.29a it contains `ika + sama + ni`.

### 3. Numeral-related structures

What distinguishes `NUMCL` and `NUMCLP` from `NUM`, `CL`, `N`, and `NP`? Which reference categories should contain them?

```text
EN.4.5: NUMCL  → NUM mu + CL tu
EN.1.3: NUMCLP → NUM ti + N kapi
```

Software calls `NUMCL` “numeral classifier,” but the example is a parent grouping multiple components. Please confirm the intended expansion rather than assuming it is synonymous with `CL`.

### 4. Generic or unexplained labels

- **`CFX`:** What does it mean? SM.16.3 contains `VB → CFX na`.
- **`MORPHEME`:** When is this used instead of a specific category? SM.2.2 contains `VB → MORPHEME mi`.
- **`COMMENT`:** What is the annotation function of this wrapper? EN.2.1 places annotated `sore no …` and further syntax beneath `COMMENT`.
- **`W`:** Is this a genuine label? EN.10.6 annotates `pe` under `N → W`, with writing mode `ORDLOG`.
- **`multi-clause`:** How does this root label differ from `multi-sentence`? It occurs in KH.27 and KK.91.

### 5. Unlisted extensions

Please confirm the expansion and function of:

- **`FRM`** in `IP-NMZ-FRM` (EN.1.2) and `PP-FRM` (MYS.20.4473). Is its function the same in both?
- **`PRB`** in `P-FNL-PRB`, applied to `na` in SM.7.13.
- **`RCP`** in `PFX-RCP`, applied to `api` in SM.4.42. Software describes it as “reciprocal.”
- **`UKN`** in `PFX-UKN`, applied to `sa` in EN.1.9.

### 6. Writing-mode annotations

Are the following genuine writing-mode categories? Please confirm their meanings and any accepted alternative spellings.

| Annotation | Example | Provisional software description |
| --- | --- | --- |
| `BPHON` | SM.1.2, `are` | Back-phonographic / reversed phonographic reading |
| `ORDLOG` | EN.10.6, `pe` | Ordinal logographic |
| `NLPOG` | MYS.6.1047, `no` | Non-logographic, partially obscured |

In particular, is `NLPOG` intentional or a spelling variant of another writing-mode annotation?

## Secondary verification questions

These cases may be historical conventions, unusual combinations, or spelling anomalies. Please distinguish them rather than assuming every unfamiliar spelling is an error.

### Historical spellings and source notation

- Are `NP-OBJ` (EN.1.11) and `PP-OBJ` (MYS.3.323) general/older object labels, distinct from `OB1` and `OB2`? Is `NP-PRED` (MYS.7.1328) equivalent to `NP-PRD`?
- Is `P-COP` on `mo` in EN.13.1 a distinct particle category? Is `C-CASE-DAT` on `ni` in EN.8.1 related to the `C-` family or an unintended spelling?
- What do `IP-MAT;_que_` (BS.12) and `VB-ST&M` (EN.25.7, `takye`) mean? Are `N;2` (MYS.10.2030) and `N;4` (MYS.18.4132) accepted historical distinction notation related to `;@N`?

### Unusual combinations

Are these accepted extensions, and what do they mean in these contexts?

- `N-COMP` on `to` (SM.1.2), `N-PRD` containing `asa + gwiri` (MYS.17.4008), and `N-ADC` on `opomasimasu` (SM.58.2).
- `VB-ADV` on `puru` (MYS.2.131a), `P-COMP-GER` on `to` (SM.11.2), and `NP-ADV-SEM` (KK.9).
- `P-ADV` containing an `IP-NMZ` (MYS.10.2250), `P-SBJ` on `pa` (EN.27.1), and `PP-MAT` (MYS.11.2640).
- `PP-CASE` and `PP-CASE-ABL/ACC/COM/DAT`: are these accepted phrase labels, and how do they relate to the corresponding simpler phrase/case labels?
- `SFX-INF` on `api` (EN.19.4) and `WORD-STM` on `yorokobosi` (SM.15.2).

### Labels defined in software without current corpus examples

Are `IP-EMP` (“empty clause”), `PFX-PHB` (“prohibitive prefix”), and `VB-DVB` (“verb deverbal”) recognized historical or reserved annotations? If so, please supply their definitions; software descriptions alone have not been treated as authority.

All questions remain unanswered. XML-generated names, misparsed special word forms, and free-text/lemma-like element names are retained in the author's detailed report rather than proposed as linguistic abbreviations here.
