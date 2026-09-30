# Open questions

This is the default question ledger. The project author may answer an entry here or explicitly move it to the chief-editor ledger. Answers and decision history remain attached to the original ID.

## PAQ-001 — Operational authority of TXT and XML

- **Question:** Given that TXT is the current human authoring representation and XML the computational representation, which direction is the normal checked-in editing workflow today, and what event makes the other representation current?
- **Context:** `README.md` currently calls XML “canonical (primary)” and TXT “derived,” while the clarified conceptual model deliberately avoids treating either serialization as the semantic model.
- **Current implementation:** applications/processors normally read XML; both repository-wide conversion scripts overwrite their destination trees.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-002 — Exact `<raw-text>` regeneration and conflict policy

- **Question:** When regenerating derived `<raw-text>`, should segment source text and boundaries always come from numbered roundtrip markers while transcription always comes from recognized tree forms, and should any mismatch with an existing `<raw-text>` be an error, warning, or silent regeneration?
- **Context:** the project-author decision establishes that `<raw-text>` is derived and not independently authoritative, but the exact validation behavior is not yet stated.
- **Example:** an XML editor could change a leaf form without changing existing `<raw-text>/<transcription>`.
- **Current implementation:** TXT → XML regenerates; XML → TXT ignores `<raw-text>`; `treditor` displays the stored value; no consistency validator exists.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-003 — Meaning of numbered marker labels

- **Question:** Are marker numbers (`0@`, `3@`, etc.) meaningful source labels that must remain unchanged, or can a canonical authoring serializer renumber them while preserving segment order, source text, and boundaries?
- **Context:** current data has gaps and restarts; for example `MYS.3.276b` has marker labels `0, 3, 4, 0, 1`.
- **Current implementation:** exact labels survive in raw roundtrip lines, while derived raw-text sentences are renumbered sequentially from 1.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-004 — `MYS_19` attached marker syntax

- **Question:** What was intended by `IP-EPT.18@於保夫祢能,*` in `data/txt/trees/MYS_19.txt:3838`: a marker `18@於保夫祢能` after parent path `...,IP-EPT`, a literal unusual tag, or something else?
- **Current implementation:** it is preserved as a raw line but is not recognized as a normal marker, raw-text segment, or marker boundary.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-005 — `SM_29` bare star line

- **Question:** What was intended by `IP-MAT,PP-TOP,NP,IP-REL,VB-ADC,*` in `data/txt/text/SM_29.txt:110`?
- **Current implementation:** it is preserved as a positioned raw line but does not create a source-text segment or structural boundary.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-006 — Resolving header/tree content discrepancies

- **Question:** What review procedure and authority should resolve the 30 content discrepancies in DI-007, and should future conversion merely report them or refuse output until reviewed?
- **Context:** the project author has decided that both layers are meaningful and content should not normally differ.
- **Current implementation:** no validation occurs; search/display can expose either layer depending on feature.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-007 — Formal status of `*T*`

- **Question:** Is `*T*` a formally modeled syntax terminal/trace with defined attributes and search behavior, or only a legacy TXT token that must round-trip literally?
- **Context:** permissive current path handling can preserve it, but the repository evidence does not establish its full intended model.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-008 — Distinction suffixes on writing-mode tags

- **Question:** When a source has a value such as `LOG;@2`, does `;@2` distinguish annotation components in the same sense that it distinguishes syntax nodes, or is it a separate historical convention?
- **Current implementation:** XML stores it as `phon="LOG" phon_index="2"` and reconstructs it exactly.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-009 — Long-term status of legacy EN/SM source IDs

- **Question:** Are IDs such as `1_EN_01` and `1_SM_15` temporary authoring IDs expected eventually to be replaced by dotted IDs, or must both the legacy spelling and canonical dotted ID remain indefinitely addressable?
- **Current implementation:** XML uses `EN.1.1`/`SM.15.1`; `roundtrip-data@source-id` restores the legacy TXT spelling.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-010 — Semicolon suffixes in text IDs

- **Question:** What formal metadata is encoded by suffixes such as `MYS.14.3352;azuma_uta`, and should a future model store the base text ID and label as separate fields?
- **Current implementation:** the complete string is the block ID; passage search creates aliases so `MYS.14.3352` and `azuma` can find it.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-011 — Duplicate `1_SM_15` correction

- **Question:** Which of the two texts currently labeled `1_SM_15` should receive a different ID, and what should that ID be?
- **Context:** see DI-001 for both headers and locations.
- **Current implementation:** both serialize as `SM.15.1`; lookup returns the first.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-012 — Duplicate dictionary ID `L080539`

- **Question:** Should Shibi/`sibi` and Hegomori/`pyegomori` be separate entries, and which entry should retain `L080539`?
- **Context:** see DI-002.
- **Current implementation:** the latter silently replaces the former during TXT parsing; only Hegomori is in current XML.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-013 — Multiline dictionary value syntax

- **Question:** Was the second line of L051953 intended as a continuation of `.NOTE`, and should current TXT formally support continuation lines (if so, by what syntax)?
- **Context:** see DI-003.
- **Current implementation:** untagged lines are silently ignored.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-014 — Missing versus explicitly blank dictionary fields

- **Question:** Is an absent dictionary field semantically different from a present field with an empty value for every field, only some fields, or never?
- **Current implementation:** `normalise()` adds required fields (sometimes blank); XML omits some absent optional fields; blank form/kana list behavior is not uniform with singular fields.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-015 — `.NOTE` and `.NOTES`

- **Question:** Is `.NOTES` a supported alias that should canonicalize to `.NOTE`, or are they intended as distinct formal fields?
- **Current implementation:** both serialize into `<notes>`, and XML → model always produces `.NOTE`, so original spelling/distinction is lost.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-016 — Canonical dictionary entry order

- **Question:** What deterministic order should dictionary entries use: `LemmaID` numeric/suffix order, historical source order, or another editorial order?
- **Context:** the project author wants stable canonical output but has not finalized exact ordering.
- **Current implementation:** serialization uses insertion/source order; `sorted_entries()` provides numeric/suffix order but is not used by serializers.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-017 — Complete canonical dictionary field order

- **Question:** After `.GLOSS`, `.MEANING`, `.FORM`, `.KANA`, and `.POS`, what fixed order should all optional fields use, and how should repeated values be ordered?
- **Current implementation:** `normalise()` fixes only the required prefix and leaves remaining insertion order; XML imposes its own code-defined category order.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-018 — Formal word-form character repertoire

- **Question:** Beyond the confirmed ILL special forms, what characters may a formal word form contain: ASCII letters only, Unicode letters/source characters, placeholders such as `x`, punctuation, or other symbols?
- **Current implementation:** `CorpusLine.word_form` accepts only ASCII `A-Z/a-z`.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-019 — Unsupported formal-field error policy

- **Question:** When a converter encounters a dictionary/XML field that has been declared formal but lacks a mapping in the current converter version, should conversion fail, produce output with a blocking error report, or preserve an explicit opaque extension?
- **Context:** the project author has decided unsupported formal data should eventually be detectable and unknown undeclared fields need not survive by magic.
- **Current implementation:** unknown TXT lines and XML dictionary children are silently ignored.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-020 — Status of XML container metadata

- **Question:** Which current container attributes are formal model/version data requiring authoring-format mappings—`corpus@filename`, `dictionary@version`, `raw-text@role`, and `roundtrip-data@format`—and which are replaceable implementation metadata?
- **Current implementation:** serializers write fixed/current values; readers mostly do not validate or version behavior from them.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

## PAQ-021 — Exact marker syntax versus regenerable serialization

- **Question:** Must the complete raw numbered marker line—including its original path spelling and position—remain authoritative source syntax, or may a future canonical authoring serializer regenerate an equivalent marker from modeled source text and boundary data?
- **Context:** markers carry semantic source text and real boundaries, while current XML also stores their exact raw lines as round-trip data.
- **Project-author notes:**
- **Answer:**
- **Status:** Open

# Resolved / answered questions

No project-author questions have an explicit answer yet.
