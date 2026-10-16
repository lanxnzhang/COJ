# Project documentation

`docs/` holds maintained architecture, conventions, policies, guidelines, decisions, registers and workflows, plus intentionally preserved design/history. [Reports](../reports/README.md) hold investigation and process outputs; they supply evidence, not general project policy.

Start with the material relevant to the task below. Recorded project-author decisions and confirmed chief-editor guidance establish policy within their stated scope. Code/tests establish implementation behavior, not linguistic authority. Open questions, proposals and corpus patterns are not adopted decisions; consult the latest recorded answers and ask if sources conflict.

| Material | Role, status and when to consult |
|---|---|
| [Architecture](reference/architecture.md) | Current repository/application map and entry points; start here before locating implementation. |
| [Data model](reference/data-model.md) and [glossary](reference/glossary.md) | Current conceptual model, representation layers and terminology; provisional terminology remains identified. |
| [Annotation guidelines](reference/annotation-guidelines.md) | Current annotation specification and confirmed linguistic guidance; unresolved decisions remain explicitly separate. Consult before interpreting tags, segmentation or word structure. |
| [TXT/XML roundtrip](reference/txt-xml-roundtrip.md) | Working conversion specification, preservation guarantees and limits; distinguishes explicit policy, implementation evidence and history. |
| [Current workflows](guides/current-workflows.md) | Implemented application behavior, storage and write effects; consult before changing a workflow. |
| [Primary TXT import](guides/primary-txt-import.md) | Current upstream mappings, preview/apply procedure, safeguards, validation and manual cleanup. Use for corpus updates. |
| [Workbench](guides/workbench.md) | Current temporary comparison, conversion and read-only tree workflows; distinct from persistent Editing authoring. |
| [Project-author questions](registers/project-author-questions.md) | Author decisions and question statuses: [Open](registers/project-author-questions.md#open), [Provisional](registers/project-author-questions.md#provisional), [Deferred](registers/project-author-questions.md#deferred), [Resolved/Answered](registers/project-author-questions.md#resolved--answered). Read the applicable entry before making an assumption. |
| [Chief-editor questions](registers/chief-editor-questions.md) | Designated consultation questions, recorded answers and resolution authority; distinguish pending questions, answered cases and deferred follow-ups. |
| [Tag questions](registers/tag-questions-for-chief-editor.md) | Focused editorial consultation on unclear annotations, with separate answered items; software descriptions do not resolve these questions. |
| [Data issues](registers/data-issues.md) | Maintained issue statuses and current/historical evidence links; Open is not a priority or automatic correction instruction. |
| [UX observations](registers/ux-observations.md) | Observations and deferred ideas, not an adopted roadmap or implicit work authorization. |
| [13 October investigation inventory](registers/data-investigation-2026-10-13.json) | Historical evidence snapshot retained beside the registers. Consult for original details; use the maintained registers for later status and corrections. |
| [Authoring design](design/authoring/syntax-tree-authoring-design.md) | Current source-first design, accepted decisions, implemented milestones and later-stage proposals. Check the stated implementation limits before treating a design feature as available. |
| [SYN comparison](design/authoring/syn-prototype-comparison.md) and [example prototypes](design/authoring/syn-prototypes/) | Earlier alternatives retained for comparison; neither alternative defines the current authoring workflow or final syntax. |
| [Archived Workbench design](archive/workbench-tree-editing-design.md) | Superseded proposal; consult only for design history, then return to the current authoring design. |
| [Archived tag investigation](archive/tag-investigation-report.md) | Historical counts, examples and tentative interpretations. Current rules belong in the guidelines; unanswered consultation topics remain in the tag questions. |

For new files, put reusable specifications/conventions in `reference/`, operational instructions in `guides/`, maintained decisions/questions/issues in `registers/`, authoring design work in `design/authoring/`, and intentionally preserved superseded documentation in `archive/`. Put outputs of a particular investigation, audit, migration, validation or repair in `reports/`, linking them from the relevant documentation/register. Existing historical evidence retained here is not a reason to accumulate new investigation dumps beside registers.

Keep substantive decisions and statuses in their owning documents. Completed investigation does not resolve an unanswered question; an answered policy may still have an implementation gap. This page is navigation, not another decision log or issue register. [TODO](../TODO.md) supplies task/history context, not a formal specification or fresh authorization to execute old requests.
