# Open questions

Only questions explicitly designated by the project author appear in this ledger. Answers and decision history remain attached to the original ID.

## CEQ-001 — Project-facing term for an identified unit

- **Question:** What should the project-facing term be for a unit such as `MYS.1.1`?
- **Context:** the project author currently prefers **text**. Current code calls the unit an `Utterance`; UI/routes also use passage, sentence, and historically poem. The code class need not be renamed for compatibility.
- **Example:** `MYS_01.xml` is a document; `MYS.1.1` is one identified unit inside it.
- **Current implementation:** Python `Utterance`, property `sentence_id`, routes `/api/utterances` and `/api/poems`, UI “passage.”
- **Project-author notes:** Preferred term at present: “text.”
- **Answer:**
- **Status:** Pending

## CEQ-002 — Header segmentation versus tree segmentation

- **Question:** Should the manually segmented header and tree-level word-form segmentation remain independently meaningful, or should they eventually be standardized?
- **Context:** both layers are meaningful and must not silently replace each other. In 4,995 of 5,665 current texts their content matches after spaces are removed but their segmentation differs.
- **Example (`BS.1`):**
  - header: `miato tukuru isi no pibiki pa ame ni itari tuti sape yusure titipapa ga tameni moropito no tameni`
  - tree: `mi ato tukuru isi no pibiki pa ame ni itari tuti sape yusure titi papa ga tameni moro pito no tameni`
- **Current implementation:** `block@header` stores one layer; leaf forms store the other; no relationship or alignment is modeled.
- **Project-author notes:** content should not normally differ; content discrepancies are listed in DI-007.
- **Answer:**
- **Status:** Pending

## CEQ-003 — Terminology for `<raw-text>/<kanji>` values

- **Question:** Because `<kanji>` sometimes contains placeholders rather than kanji, should the conceptual field be called **source text** or **original text** (or another term)?
- **Context:** this is terminology/schema interpretation only; the XML tag will not be renamed in the present work.
- **Example:** `BS.21` has a marker payload `x都xxx`, and other source payloads can be entirely placeholder-like.
- **Current implementation:** XML uses `<raw-text role="processing"><sentence><kanji>...`; UI/search code commonly calls the field `kanji`.
- **Project-author notes:** “source/original text” currently seems conceptually closer.
- **Answer:**
- **Status:** Pending

## CEQ-004 — Formal meaning of `ILL` and its word form

- **Question:** What is the formal linguistic meaning of the `ILL` writing-mode/annotation tag and the special word form that follows it? Does it specifically mean unknown, illegible, uncertain, or another category, and how should the non-ASCII form be interpreted?
- **Context:** the project author's current understanding is that the final field is a word form whose transcription may be unknown or uncertain.
- **Examples:** all 20 lines are listed in DI-004. Examples include `FRAG,WORD,L099997,ILL,xxx`, `...,ILL,莫囂圓隣之`, and `...,ILL,刺部重部`.
- **Current implementation:** ASCII `x` forms become `phon="ILL"` leaves; non-ASCII forms are incorrectly treated as nested syntax tags and disappear from recognized tree transcription.
- **Project-author notes:** Do not change the parser before this is confirmed.
- **Answer:**
- **Status:** Pending

## CEQ-005 — Meaning of `NULL,*`

- **Question:** Do `NULL,*` lines represent actual empty/null syntax terminals that belong in the computational syntax tree, or source-format annotations that should remain outside it?
- **Context:** 347 cases occur in 300 texts across 45 documents; see DI-005.
- **Examples:**

```txt
IP-MAT,IP-ADV,COP-INF,NULL,*
IP-MAT,IP-ADV,IP-ADV,NP-PRD,IP-REL,ADJ-CLS,ACP-CLS,L000033,NULL,*
multi-sentence,IP-MAT,IP-ADV,PP-OB1,NP,IP-REL,ADJ-CLS,ACP-CLS,L000033,NULL,*
```

- **Current implementation:** because the line ends in `*`, it is a `CommentLine`, preserved in roundtrip metadata, omitted from the syntax tree, and omitted from derived raw text.
- **Project-author notes:** Do not decide this from current implementation behavior.
- **Answer:**
- **Status:** Pending

# Resolved / answered questions

No chief-editor questions have an explicit answer yet.
