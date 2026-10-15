"use strict";
const assert = require("node:assert/strict");
const E = require("../static/editing-state.js"), A = require("../static/editing-analysis.js");
const clone = x => JSON.parse(JSON.stringify(x));
let sequence = 0;
const makeState = () => { const s = new E.State(() => `id-${++sequence}`); s.addText(); return s; };
const leaf = (form, lemma, category = "N") => ({category, lemma, form, children: [], annotations: {}});
const compound = {category: "N", lemma: "L090723", form: null, children: [leaf("paru", "L051724"), leaf("yama", "L050034")], annotations: {}};
const candidate = (pattern, dominant = true) => ({id: JSON.stringify(pattern), pattern, eligible: true, default: dominant,
  count: 8, texts: 8, support: 1, domains: {ordinary: 8, "EN/SM": 0}, evidence: [{text_id: "MYS.8.1421", source: "xml/trees/MYS_08.xml", revision: "rev", ordinal: 0, address: "0"}]});
function plan(s, candidates) {
  const pid = s.text.passage_order[0], form = s.text.passages[pid].transcription;
  return {source: A.sourceKey(s.text), revision: "evidence-revision", units: [{form, passage: pid, start: 0, end: Array.from(form).length}],
    spans: [{first: 0, last: 1, form, candidates}], nodes: {}};
}
let s = makeState(); s.addPassage("春山", "paruyama"); let p = plan(s, [candidate(compound)]);
A.initial(s, p); const first = clone(s.document), root = s.text.roots[0], children = s.text.nodes[root].children.slice();
assert.equal(A.material(s.text, root), "paruyama"); assert.equal(new Set([root, ...children]).size, 3);
assert.equal(s.text.nodes[root].form, null); assert.ok(children.every(id => s.text.nodes[id].script === null));
A.chooseNode(s, p, root, candidate(compound)); assert.deepEqual(s.text.nodes[root].children, children); A.undo(s);
A.undo(s); assert.equal(Object.keys(s.text.nodes).length, 0); A.undo(s, true); assert.deepEqual(s.document, first);
const reopened = makeState(); reopened.open(clone(first), "draft.syn.json", "rev");
assert.deepEqual(reopened.document, first); assert.ok(!A.canUndo(reopened)); assert.ok(!JSON.stringify(first).includes('"undo"'));
const same = makeState(); same.addPassage("春山", "paruyama"); A.initial(same, plan(same, [candidate(compound)]));
assert.ok(same.text.roots.every(id => !first.texts[s.activeText].nodes[id]));
// No implicit changes to existing hierarchy, even when source is changed.
const before = clone(s.text.nodes); A.initial(s, p); assert.deepEqual(s.text.nodes, before);
s.editPassage(s.text.passage_order[0], "transcription", "paruyamaX"); assert.deepEqual(s.text.nodes, before); assert.ok(!A.canUndo(s));
assert.throws(() => A.chooseNode(s, p, root, candidate(compound)), /Analyse again/);
assert.ok(Object.values(s.text.links).every(l => l.status === "unresolved"));
// Non-dominant candidates stay incomplete until selected; retained parent ID.
s = makeState(); s.addPassage("春山", "paruyama"); p = plan(s, [candidate(compound, false)]); A.initial(s, p);
const retained = s.text.roots[0]; assert.equal(s.text.nodes[retained].lemma, null);
A.chooseNode(s, p, retained, candidate(compound, false)); assert.equal(s.text.roots[0], retained); assert.equal(s.text.nodes[retained].children.length, 2);
const refined = clone(s.document); A.undo(s); assert.equal(s.text.nodes[retained].form, "paruyama"); A.undo(s, true); assert.deepEqual(s.document, refined);
// Unspecified external annotation references are never silently left dangling.
s.text.annotations.anchor = s.text.nodes[retained].children[0];
const referenced = clone(s.document), variant = candidate({...compound, children: [leaf("paru", "L9"), leaf("yama", "L050034")]});
assert.throws(() => A.chooseNode(s, p, retained, variant), /reference affected identities/); assert.deepEqual(s.document, referenced); delete s.text.annotations.anchor;
assert.throws(() => A.chooseNode(s, p, retained, candidate(leaf("paruyama", "L090723"))), /withdrawal is deferred/);
// Explicit inline correction affects only the selected persistent node.
A.edit(s, retained, "lemma", "L123"); assert.equal(s.text.nodes[retained].lemma, "L123"); assert.equal(s.text.nodes[retained].children.length, 2); A.undo(s);
// Scope-based scripts preserve all existing nonempty values and never annotate parents.
const ids = s.text.nodes[retained].children; s.text.nodes[ids[0]].script = "LOG";
const targets = A.scriptTargets(s.text); assert.equal(targets.length, 2);
A.batch(s, targets, "PHON"); assert.equal(s.text.nodes[ids[0]].script, "LOG"); assert.equal(s.text.nodes[ids[1]].script, "PHON"); assert.equal(s.text.nodes[retained].script, null);
A.batch(s, targets, "NLOG", true); assert.ok(ids.every(id => s.text.nodes[id].script === "NLOG")); A.undo(s); assert.equal(s.text.nodes[ids[0]].script, "LOG");
// Multipart ipaku: parts carry scripts, empty parent is never a batch target.
s = makeState(); const pid = s.addPassage("石", "ipaku");
s.text.nodes.n = {category: "VB-NML", lemma: "L030199a", form: "ipaku", children: [], script: "", annotations: {},
  parts: [{id: "ipa", form: "ipa", script: "LOG", annotations: {}}, {id: "ku", form: "ku", script: "PHON-ON", annotations: {}}]}; s.text.roots = ["n"];
for (const [part, start, end] of [["ipa", 0, 3], ["ku", 3, 5]]) s.text.links[part] = {
  node: "n", part, passage: pid, start, end, status: "valid", reason: "",
  evidence: {original: "石", transcription: "ipaku", status: "valid", reason: ""}};
const ipaku = clone(s.document); A.batch(s, A.scriptTargets(s.text), "PHON"); assert.deepEqual(s.document, ipaku);
const partOnly = A.scriptTargets(s.text, {nodes: [], parts: [{node: "n", part: "ku"}]}); assert.equal(partOnly.length, 1);
A.batch(s, partOnly, "PHON", true); assert.equal(s.text.nodes.n.parts[0].script, "LOG"); assert.equal(s.text.nodes.n.parts[1].script, "PHON");
// Independently supplied matching-boundary refinement promotes parts, not duplicate layers.
p = plan(s, []); const finer = candidate({category: "VB-NML", lemma: "L030199a", form: null, annotations: {}, children: [leaf("ipa", "L1"), leaf("ku", "L2")]});
A.chooseNode(s, p, "n", finer); assert.equal(s.text.nodes.n.children.length, 2);
assert.equal(s.text.nodes[s.text.nodes.n.children[0]].script, "LOG"); assert.ok(s.text.nodes.n.children.every(id => !s.text.nodes[id].parts.length));
assert.equal(s.text.links.ipa.node, s.text.nodes.n.children[0]); assert.equal(s.text.links.ipa.part, null);
assert.equal(s.text.links.ku.node, s.text.nodes.n.children[1]); assert.equal(s.text.links.ku.status, "valid");
// Crossing writing/morphological boundaries is rejected atomically.
A.undo(s); const intact = clone(s.document);
const crossing = candidate({...finer.pattern, children: [leaf("ipak", "L1"), leaf("u", "L2")]});
assert.throws(() => A.chooseNode(s, p, "n", crossing), /writing boundaries/); assert.deepEqual(s.document, intact);
const ipakuSource = clone(s.text.passages), ipakuEvidence = clone(s.text.links.ipa.evidence);
A.editForm(s, "n", "ipaX", "ipa"); assert.equal(s.text.nodes.n.form, "ipaXku");
assert.deepEqual(s.text.passages, ipakuSource); assert.deepEqual(s.text.links.ipa.evidence, ipakuEvidence);
assert.equal(s.text.links.ipa.status, "unresolved"); assert.equal(s.text.links.ku.status, "valid");
assert.deepEqual(A.scriptTargets(s.text, {passage: pid}).map(t => t.part), ["ku"]);
A.editForm(s, "n", "ipa", "ipa"); assert.equal(A.scriptTargets(s.text, {passage: pid}).length, 2);
// Explicit multi-unit selection merges only the accepted lexical span.
s = makeState(); const source = s.addPassage("高行", "taka yuku");
const tk = candidate({category: "VB-ADC", lemma: "L030996a", form: null, children: [leaf("taka", "L007005", "ADJ-STM"), leaf("yuku", "L031840a", "VB-ADC")], annotations: {}}, false);
p = {source: A.sourceKey(s.text), revision: "rev", units: [{form: "taka", passage: source, start: 0, end: 4}, {form: "yuku", passage: source, start: 4, end: 8}],
  spans: [{first: 0, last: 1, form: "taka", candidates: []}, {first: 1, last: 2, form: "yuku", candidates: []}, {first: 0, last: 2, form: "takayuku", candidates: [tk]}], nodes: {}};
A.initial(s, p); const originalRoot = s.text.roots[0];
const beforeApplicability = clone(s.document);
assert.ok(A.canChooseSpan(s, p.spans[2], tk, p.revision));
assert.deepEqual(s.document, beforeApplicability); // Applicability consumes no real identities or edits.
const unsafe = candidate({...tk.pattern, children: [leaf("different", "L1")]}, false);
assert.ok(!A.canChooseSpan(s, p.spans[2], unsafe, p.revision));
assert.deepEqual(s.document, beforeApplicability);
A.chooseSpan(s, p, p.spans[2], tk);
assert.deepEqual(s.text.roots, [originalRoot]); assert.equal(A.material(s.text, originalRoot), "takayuku"); assert.ok(Object.values(s.text.links).every(l => l.node === originalRoot));
const importedSpan = clone(s.text.nodes[originalRoot].annotations.input_span);
delete s.text.nodes[originalRoot].annotations.input_span;
assert.ok(!A.canChooseSpan(s, p.spans[2], tk));
assert.throws(() => A.chooseSpan(s, p, p.spans[2], tk), /Span overlaps/);
s.text.nodes[originalRoot].annotations.input_span = importedSpan;
// Editable owned forms preserve Source and immutable alignment evidence.
const sourceBefore = clone(s.text.passages), evidenceBefore = clone(Object.values(s.text.links).map(l => l.evidence));
const editedChild = s.text.nodes[originalRoot].children[0];
A.editForm(s, editedChild, "takaX");
assert.deepEqual(s.text.passages, sourceBefore); assert.deepEqual(Object.values(s.text.links).map(l => l.evidence), evidenceBefore);
assert.ok(Object.values(s.text.links).every(l => l.status === "unresolved"));
const changed = clone(s.document); const restored = makeState(); restored.open(changed, "changed.syn.json", "rev"); E.reconcile(restored.text);
assert.ok(Object.values(restored.text.links).every(l => l.status === "unresolved"));
A.editForm(s, editedChild, "taka"); assert.ok(Object.values(s.text.links).every(l => l.status === "valid"));
A.editForm(s, editedChild, "ta ka"); assert.ok(Object.values(s.text.links).every(l => l.status === "valid"));
A.editForm(s, editedChild, "taka");
assert.throws(() => A.editForm(s, originalRoot, "derived"), /derived form/);
// Targeting depends on real material, not a resolved lexical category.
s.text.nodes[editedChild].category = "WORD"; A.editScript(s, editedChild, "LOG");
s.text.nodes[editedChild].category = null; A.editScript(s, editedChild, "PHON");
s.text.nodes[editedChild].category = "NL000033"; assert.ok(A.scriptTargets(s.text).some(t => t.node === editedChild));
const empty = s.makeId(); s.text.nodes[empty] = {category: "*T*", lemma: null, form: "", children: [], parts: [], script: null, annotations: {}}; s.text.roots.push(empty);
assert.ok(!A.scriptTargets(s.text).some(t => t.node === empty));
// Pointer/keyboard range selection is transient and avoids per-row checkboxes.
const selection = {selected: new Set(), selectedParts: new Map()}, rows = [{key: "a", id: "a"}, {key: "b", id: "b"}, {key: "p", id: "n", part: "p"}];
A.selectRows(selection, rows, "a"); A.selectRows(selection, rows, "p", {shiftKey: true});
assert.deepEqual([...selection.selected], ["a", "b"]); assert.equal(selection.selectedParts.get("p").node, "n");
A.selectRows(selection, rows, "a", {ctrlKey: true}); assert.ok(!selection.selected.has("a"));
console.log("Stage 3 defaults, explicit review, fresh IDs, refinement, scripts, preservation, undo/redo and reopen passed.");
if (process.argv.includes("--document")) console.log(JSON.stringify(s.document));
