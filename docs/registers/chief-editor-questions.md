# Open questions

Only questions explicitly designated by the project author appear in this ledger. Answers and decision history remain attached to the original ID.

Rechecked 13 October 2026 against current imported data and Stage 1–3 SYN authoring. No chief-editor answer has been inferred from software or from the new project-author answers. Occurrence inventories and data findings are owned by [data issues](data-issues.md), with implementation/author policy in [PAQ](project-author-questions.md). The later chief-editor clarifications in TODO: After commit 4f1eada confirm ILL, NULL and trace semantics; the decisions below supersede the earlier provisional notes.

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

- **Status:** Answered for current cases; future retagging Deferred.
- **Authority:** chief-editor clarifications in [TODO: After commit 4f1eada](../../TODO.md).
- **Answer:** ASCII x-based forms represent illegible/damaged source text; ILL means illegible and is appropriate here. Dictionary L099997 has GLOSS `ILLEGIBLE`, MEANING `[illegible word]`, and placeholder FORM/KANA `xxxxxxxxxx`; it is not a license to substitute that placeholder for an actual occurrence.
- Non-ASCII forms such as `莫囂圓隣之` preserve known source characters whose linguistic transcription is undetermined. They are genuine special word forms, retained in the tree, textual material/header and search, rather than syntax tags. Preserve imported headers independently; do not automatically rewrite them.
- **Deferred:** the chief editor is considering a different future tag for the second situation. Keep current ILL and L099997 assignments; no new tag or data migration is chosen.
- **Implementation:** corrected TXT parsing recognizes current special ILL forms in the form slot. Existing stored XML still contains fifteen malformed syntax paths; its repair needs explicit approval. See DI-004 and the [scoped XML preview](../../reports/special-terminals-4f1eada-preview.patch).

## CEQ-005 — Meaning of `NULL,*`

- **Status:** Answered; stored-XML correction pending approval (DI-005).
- **Authority:** chief-editor clarifications in [TODO: After commit 4f1eada](../../TODO.md).
- **Answer:** NULL is a genuine null syntax terminal with empty phonological/orthographic content. The trailing `*` is its TXT encoding, not word material. Preserve the node and exact `NULL,*` TXT roundtrip; it contributes zero transcription characters. Do not store a literal `∅`.
- **Distinction:** `number@text,*` is a source marker, not a null terminal. An otherwise unexplained bare star remains opaque evidence pending DI-006 review.
- **Implementation:** the parser now builds empty NULL leaves; new XML conversions contain the nodes. Existing XML still stores all 347 occurrences only as roundtrip comments. No corpus XML has been changed.

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
