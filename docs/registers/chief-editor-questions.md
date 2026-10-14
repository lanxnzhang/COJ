# Open questions

Only questions explicitly designated by the project author appear in this ledger. Answers and decision history remain attached to the original ID.

Rechecked 13 October 2026 against current imported data and Stage 1–3 SYN authoring. No chief-editor answer has been inferred from software or from the new project-author answers. Occurrence inventories and data findings are owned by [data issues](data-issues.md), with implementation/author policy in [PAQ](project-author-questions.md). The author will seek trace confirmation under PAQ-007; this review does not assign a new chief-editor question ID.

## CEQ-001 — Project-facing term for an identified unit

- **Question:** What should the project-facing term be for a unit such as `MYS.1.1`?
- **Context:** the project author currently prefers **text**. Current code calls the unit an `Utterance`; UI/routes also use passage, sentence, and poem. The code class need not be renamed for compatibility.
- **Example:** `MYS_01.xml` is a document; `MYS.1.1` is one identified unit inside it.
- **Current implementation:** Python `Utterance`, property `sentence_id`, routes `/api/utterances` and `/api/poems`, UI “passage.”
- **Project-author notes:** Preferred term at present: “text.”
- **Answer:**
- **Status:** Pending

## CEQ-003 — Terminology for `<raw-text>/<kanji>` values

- **Question:** Because `<kanji>` sometimes contains placeholders rather than kanji, should the conceptual field be called **source text** or **original text** (or another term)?
- **Context:** the XML tag remains `<kanji>`; this question concerns the conceptual term.
- **Example:** `BS.21` has a marker payload `x都xxx`, and other source payloads can be entirely placeholder-like.
- **Current implementation:** legacy XML retains raw-text/kanji and the kanji search field. Source-first SYN uses each passage's original source and transcription strings. The newer field layout does not settle the chief-editor conceptual terminology or authorize renaming the XML tag. See DI-008 and PAQ-020.
- **Project-author notes:** “source/original text” currently seems conceptually closer.
- **Answer:**
- **Status:** Pending

## CEQ-004 — Formal meaning of `ILL` and its word form

- **Question:** What is the formal linguistic meaning of the `ILL` writing-mode/annotation tag and the special word form that follows it? Does it specifically mean unknown, illegible, uncertain, or another category, and how should the non-ASCII form be interpreted?
- **Context:** the project author's current understanding is that the final field is a word form whose transcription may be unknown or uncertain.
- **Examples:** all 20 current lines (five ASCII x-based, fifteen non-ASCII) are revalidated in DI-004; exact contexts and code points are in its linked inventory. Examples include `FRAG,WORD,L099997,ILL,xxx`, `...,ILL,莫囂圓隣之`, and `...,ILL,刺部重部`.
- **Current implementation:** ASCII `x` forms become `phon="ILL"` leaves; non-ASCII forms are incorrectly treated as nested syntax tags and disappear from recognized tree transcription.
- **Project-author notes:** PAQ-018 provisionally explains some source-character forms as insufficiently identified/read transcription, without finalizing the repertoire or universal meaning of ILL. Preserve all original information; do not change the parser or source data on that provisional interpretation. DI-004/DI-012 own the evidence.
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
- **Project-author notes:** the 347 lines/300 texts/45 documents are unchanged in the 13 October scan. SYN retains legacy snapshots/roundtrip information; no empty-terminal interpretation was chosen. Do not decide semantics from current implementation behavior.
- **Answer:**
- **Status:** Pending

# Resolved / answered questions

## CEQ-002 — Header segmentation versus tree segmentation

- **Question:** Should the manually segmented header and tree-level word-form segmentation remain independently meaningful, or should they eventually be standardized?
- **Context:** both layers are meaningful and must not silently replace each other. In 5,013 of 5,665 current texts their content matches after spaces are removed but their segmentation differs.
- **Example (`BS.1`):**
  - header: `miato tukuru isi no pibiki pa ame ni itari tuti sape yusure titipapa ga tameni moropito no tameni`
  - tree: `mi ato tukuru isi no pibiki pa ame ni itari tuti sape yusure titi papa ga tameni moro pito no tameni`
- **Current implementation:** legacy block@header and leaf forms retain separate layers. SYN imports historical_header, independently entered/source-derived passages and persistent passage-to-node links, reporting unresolved disagreements. For new SYN Texts, the authoring design uses entered spaced transcription and derived views rather than routine independent header entry; historical header preservation remains required. This preserves the historical layers; full reviewed legacy export remains later implementation work, not an unresolved decision to standardize their segmentation.
- **Project-author notes:** content should not normally differ; DI-007 now has 12 content discrepancies. PAQ-006 establishes report-and-continue only for TXT → XML; this is not a chief-editor answer about segmentation, nor a relaxation of SYN reviewed-export blocking.
- **Answer:** historical header and tree-level forms remain distinct meaningful layers. Their segmentation may differ; underlying content should not normally differ, and neither layer silently replaces the other. Preserve imported historical headers for compatibility, roundtripping and discrepancy checking rather than standardizing them to a generated tree view. For new Texts, derive header-like word segmentation from underlying annotation instead of routinely authoring a separate header.
- **Resolution authority:** existing project-author requirements in [TODO: After commit 023a10c (4)](../../TODO.md), [REP-01](../reference/annotation-guidelines.md#rep-01--textual-layers), and the [current authoring design](../design/authoring/syntax-tree-authoring-design.md#header-like-output-and-historical-headers), reviewed at the author's request. This records the established project decision, not a newly inferred chief-editor answer.
- **Scope:** the later choice of which historical header to emit after reviewed changes remains unspecified in the design; this resolution does not decide it or authorize any corpus change.
- **Status:** Resolved
