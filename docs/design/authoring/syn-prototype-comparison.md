# Compact `.syn` prototype comparison

**Status: earlier alternatives, not a final syntax choice.** The 10 October
2026 [source-first design revision](syntax-tree-authoring-design.md) replaces
this document's recommendation to choose A. Normal authoring now starts with
source segments and lexical components. The follow-up revision inserts those
same occurrences directly into the tree editor: source and tree views edit one
lexical record, while category and hierarchy belong to syntax. Annotation is
assisted; recursive composition is tool-maintained and optionally inspected,
with no required manual composition section. Occurrence IDs/bindings remain
hidden in normal views and explicit in portable persistence. Neither A nor B
below implements that workflow. Normal tree building now uses **Wrap in Parent**
over selected adjacent terminals/subtrees, with parent-category autocomplete.
The editor generates layout and indentation; the indented examples below are
serialized sketches, not a requirement to maintain whitespace while editing.

The eight example files are retained unchanged as evidence for comparison.
Their visible IDs and literal preservation blocks are not requirements for
the revised human-facing input. No parser or editor has been implemented.

## Earlier comparison — 9 October 2026

Proposal at `0679d7d`, 9 October 2026, continuing
[the authoring design](syntax-tree-authoring-design.md). These are static UTF-8
examples, not an implemented grammar, converter or editor. The recommendation
at that stage was **A: inline terminals**; it is superseded by the revision above.

## Two alternatives

**A — inline terminals:** write category, form, selected lemma and writing mode
on the same line. Internal nodes contain category and an optional lemma; their
children are indented. No quotes, colons, commas or field names are needed in
the ordinary case:

```text
N L050402
  N titi L050641 PHON
  N;@2 papa L051720 PHON
```

**B — terminal register:** write form, selected lemma and writing mode once in
a separate `terminals` section; tree leaves reference those occurrences. This
separates transcription order from syntax more explicitly:

```text
terminals
  #t1 titi L050641 PHON
  #t2 papa L051720 PHON
tree
  N L050402
    N #t1
    N;@2 #t2
```

Both allow the same source associations and lexical annotations. B requires
an identity/reference even when a word has no special alignment needs, and
splits frequent edits between two places. A keeps the linguist's ordinary
editing unit together.

## Shared rules for these sketches

- Two-space indentation determines hierarchy. A branch and its lexical
  annotation move together. No closing punctuation is necessary.
- A normal A terminal is `CATEGORY FORM [LEMMA] SCRIPT [#ID]`; a branch is
  `CATEGORY [LEMMA] [#ID]` followed by children. In B, a tree terminal is
  `CATEGORY #ID`; its record is `#ID FORM [LEMMA] SCRIPT`. Identity tokens
  begin with `#`; they are not comments.
- Forms that collide with an ID, keyword or lemma-looking token, contain
  whitespace, or need exact escaping use a quoted string. Unicode forms are
  accepted explicitly, without the current ASCII-only form heuristic. A
  missing lemma is allowed; the script remains explicit. Missing/unknown
  script uses the exceptional named form `script "..."`, not a guessed value.
  An intentionally absent script uses `script none`. Recognized script tags
  come from the project registry, including PHON variants, LOG and NLOG.
- `N L050402` is an internal lexical annotation, not a form taken from the
  dictionary. Dictionary lookup never chooses a lemma automatically. A bare
  lemma-looking form must be quoted to distinguish it from this branch case.
- `;@N` stays attached to the category, exactly as authored. It is a corpus
  distinction label, independent of `#ID`. Repeated sibling branches remain
  structurally separate through indentation even when their categories match.
- `parts` explicitly declares **one terminal's** ordered writing-mode
  components. Part rows are `FORM SCRIPT`; optional part identities or
  exceptional annotations can be added when needed. No repeated lemma or
  separately editable aggregate form is required.
- `header` takes the rest of its line literally. It stays independent of
  tree forms. `source` rows contain `#SEGMENT MARKER-LABEL PAYLOAD #MEMBER...`;
  a whitespace-containing payload is quoted. Membership is ordered and refers
  to terminal occurrences, not dictionary IDs or words inferred from spelling.
  Exceptional part/character coverage will need explicit syntax in the pilot.
- `preserve` is a tool-maintained section. `marker #SEGMENT POSITION RAW-LINE`
  retains the exact marker line and its original corpus-row position. POSITION
  is import evidence, not the new editing anchor. Raw marker paths retain the
  constituent-boundary events; a future adapter must reconcile them with the
  edited tree before export. Ordinary comments/opaque records also need typed
  preservation entries; no meaning is invented for them here.
- `text` denotes a complete text example; `fragment` plus `context` denotes
  a selected subtree region. A fragment cannot replace or export the complete
  text. Its absent header, surrounding syntax and comments remain in the
  original corpus, not implicitly deleted.

## Four paired examples

Open the `.syn` files below to compare the complete examples side by side.
They contain no ellipses inside the selected tree regions. The first pair is
one complete short text; the remaining pairs declare their limited scope.
All lexical forms, lemmas, scripts, internal lemmas, source payloads and existing
distinction labels were checked against current TXT and stored XML.

| Case and evidence | A | B | What to check |
|---|---|---|---|
| Ordinary tree: complete **KK.67**, `data/txt/trees/KK.txt` | [Inline](syn-prototypes/a-inline/kk67.syn) | [Register](syn-prototypes/b-register/kk67.syn) | Eight terminals, internal MK/VB lemmas, exact header, all three source markers. |
| Cross-source word: **KK.30**, outer VB-ADN region | [Inline](syn-prototypes/a-inline/kk30.syn) | [Register](syn-prototypes/b-register/kk30.syn) | `awo kaki` and `yama gomor eru` retain separate source segments; word-level output remains `awokakiyamagomoreru`. |
| Multipart: **MYS.4.619**, VB-NML occurrence | [Inline](syn-prototypes/a-inline/mys4619.syn) | [Register](syn-prototypes/b-register/mys4619.syn) | `ipa LOG` + `ku PHON` forms one terminal `ipaku`, with lemma L030199a. |
| Repeated structures: **MYS.2.150**, first two NP-APP siblings | [Inline](syn-prototypes/a-inline/mys2150.syn) | [Register](syn-prototypes/b-register/mys2150.syn) | Same forms/lemmas can occur twice; separate occurrences, NLOG `ga`, existing `NP-APP;@2`, and source segments 2–5 survive. |

For example, the critical KK.30 region in A reads:

```text
tree
  VB-ADN
    N L080331
      N L050206
        ADJ-STM awo L007042 PHON #t1
        N kaki L050141 PHON #t2
      N yama L050034 PHON #t3
    VB-ADN
      VB-STM gomor L030744a PHON #t4
      VAX-STV-ADN eru L000024 PHON #t5
source
  #s3 3 阿袁加岐 #t1 #t2
  #s4 4 夜麻碁母禮流 #t3 #t4 #t5
```

The corresponding B file has the same structure, with forms/scripts/lemmas in
the register and `ADJ-STM #t1`, `N #t2`, etc. in the tree. Neither format inserts
a phrase boundary at the source break. No explicit new word declaration is
needed: the confirmed structural display rule derives this word.

The multipart alternative is similarly small:

```text
tree
  VB-NML L030199a
    parts
      ipa LOG
      ku PHON
```

In B, that record is `#t1 L030199a` with the same `parts` block in the register,
and `VB-NML #t1` in the tree. These are writing-mode components, not two syntax
children. The source segment `言雲知久` also contains `mo siru ku` outside this
fragment, so neither file falsely associates the entire source payload with
`ipaku` alone.

## Everyday editing and identity burden

| Task | A: inline | B: register |
|---|---|---|
| Correct a form or choose a lemma | Edit its visible tree row. | Edit the register while finding the category in the tree. |
| Insert a terminal | Type one lexical row; tooling assigns an ID if referenced. | Add a register record and a tree reference. |
| Move a subtree | Cut/paste one indented block; check source/order consequences. | Move the tree block; separately reconcile register order. |
| Duplicate a repeated structure | Copy one block; tooling regenerates identities and checks labels/coverage. | Copy the structure plus its register entries; reusing refs would incorrectly share occurrences. |
| Change source segmentation | Edit independent membership; tree stays intact. | Same, using existing register identities. |
| Git review | Form, script, lemma and parent context appear together. | Syntax and transcription changes have separate diffs, but require cross-reading. |

The short `#t1`/`#s3` names are illustrative **persistent aliases**, not line
numbers, marker numbers or values to regenerate in traversal order. Actual
tools should generate opaque IDs, retain them on moves and spelling changes,
and create fresh ones on copy. Equal forms or equal lemmas never imply identity.

For A, show inline identities where source/part links genuinely require them;
do not require an ID on every ordinary branch or manually typed terminal.
Revision/undo storage can keep additional internal IDs in tool metadata. A
plain source file must still carry the IDs needed for its explicit associations;
those cannot exist only in localStorage or depend on VS Code being installed.
Without tooling, only a new explicitly referenced occurrence needs a new alias.

Dim identifiers or fold `preserve` in future tooling; retain them in ordinary
UTF-8 source and diffs. Reformatting must not renumber them. A metadata map for
unreferenced nodes must be tied to a base fingerprint; ambiguous identity after
external text edits needs review or a new history boundary, not guessed matching.
Whole-file undo can work without durable IDs on every node. The precise history
storage policy remains a pilot decision.

## Recommendation and next pilot

Choose **A**. It directly supports the preferred `N titi L050641 PHON` spelling,
avoids repeated paths and named fields, and keeps structural and lexical work
in one place. Use a separate transcription/terminal view as a generated editing
aid later, rather than making B's register mandatory authoring syntax.

Initially retain explicit scripts on terminal rows. A text-wide default would
save typing in PHON-heavy texts but makes a default change affect many rows
and obscures mixed-script evidence such as MYS.2.150. A script default can be
evaluated later with an explicit scope; never infer it from the dictionary.

The next authorized pilot should define A's grammar/escaping and preservation
schema, then implement a parser, deterministic serializer and semantic
comparison on copies only. Verify these eight-terminal/fragment fixtures plus
ambiguous quoted forms, missing lemmas, `phon_index`, opaque comments, repeated
same-tag siblings without labels, duplicate identities and character/part
coverage. The serializer must preserve source associations and label meaning,
not merely reproduce the visible strings.

Fresh `;@N` allocation, marker reassociation after moves, unresolved NULL/ILL
semantics and complete TXT/XML export mappings remain open. The fragments are
not evidence of complete legacy export support. No parser, VS Code extension,
full editor or renderer change is included in this comparison.

Validation for this comparison: all eight static examples were checked against
the selected stored XML subtrees for ordered categories, lexical annotations,
forms, scripts and multipart components. Retained marker lines/positions,
complete-text header and source reference targets were checked. Current TXT
parsing agrees with stored XML for all four source texts. Document links and
code fences also passed inspection. These checks do not establish a working
`.syn` parser or an export guarantee.
