const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../static/app.js"), "utf8");
const context = vm.createContext({
  COJSegmentation: require("../static/segmentation.js"),
  collapsedNodeIds: new Set(["phrase"]),
  CHARACTER_WIDTH: 7.4,
  treeTagNames: JSON.parse(fs.readFileSync(path.join(__dirname, "../tag_names.json"), "utf8")),
});
const start = source.indexOf("function isNullNode(");
const end = source.indexOf("function measureSubtreeWidth(");
vm.runInContext(source.slice(start, end), context);
assert.equal(context.displayTag("ADN", {fullTags: true}), "Adnominal");
assert.equal(context.displayTag("NP-APP", {fullTags: true}), "Noun phrase - apposition");
assert.equal(context.displayTag("CP-FINAL", {fullTags: true}),
  "Complementizer phrase - clauses with a right dislocated element");
assert.equal(context.displayTag("IP-PRP", {fullTags: true}),
  "Inflectional phrase - purposive subordinate clause");
assert.equal(context.displayTag("NULL", {fullTags: true}), "Null element");
assert.equal(context.displayTag("VB-ADC", {fullTags: true}),
  "Verb - syncretic adnominal and conclusive");
assert.equal(context.displayTag("VB-ADN", {fullTags: true}), "Verb - adnominal");
assert.equal(context.displayTag("VAX-NEG-ADN", {fullTags: true}),
  "Verbal auxiliary - negative - adnominal");
assert.equal(context.displayTag("NP;@5", {fullTags: true}), "Noun phrase;@5");
assert.equal(context.displayTag("NP-UNKNOWN", {fullTags: true}), "NP-UNKNOWN");
assert.equal(context.displayTag("NP", {fullTags: false}), "NP");
assert.equal(context.displayTag("multi-sentence", {fullTags: true}), "Multiple sentences in series");
assert.ok(!Object.hasOwn(context.treeTagNames.labels, "multi-clause"));
const original = {
  _nodeId: "phrase",
  tag: "PP-OB1",
  children: [
    {tag: "N", form: "ipapo", phon: "LOG", lemma: "L050493", gloss: "rock"},
    {tag: "P-RES", form: "sura", phon: "LOG", lemma: "L000528a", gloss: "even"},
    {tag: "VB", form: "ipaku", lemma: "multipart", gloss: "say",
      parts: [{form: "ipa", phon: "LOG"}, {form: "ku", phon: "PHON"}]},
  ],
};
const before = JSON.stringify(original);
const options = {nullNodes: true, gloss: true, lemma: false, phon: false};
const collapsed = context.buildDisplayNode(original, options);
assert.equal(collapsed.form, "ipapo sura ipaku");
assert.equal(collapsed._collapsedTokens.length, 3);
assert.equal(collapsed._collapsedTokens[0].gloss, "rock");
assert.equal(collapsed._collapsedTokens[1].lemma, "L000528a");
assert.equal(collapsed._collapsedTokens[2].parts.length, 2);
assert.equal(JSON.stringify(original), before);
const width = context.collapsedTokensWidth(collapsed._collapsedTokens, options);
assert.ok(width > context.collapsedTokensWidth(collapsed._collapsedTokens, {...options, gloss: false}) - 1);
const longGloss = {...collapsed._collapsedTokens[0], annotations:
  collapsed._collapsedTokens[0].annotations.map(a => ({...a, gloss: "a much longer dictionary gloss"}))};
assert.ok(context.collapsedTokenWidth(longGloss, options)
  > context.collapsedTokenWidth(longGloss, {...options, gloss: false}));
context.collapsedNodeIds.clear();
assert.equal(context.buildDisplayNode(original, options).children.length, 3);
const miato = {_nodeId: "word", tag: "N", children: [
  {tag: "PFX-HON", form: "mi", phon: "PHON", gloss: "HON", lemma: "prefix"},
  {tag: "N", form: "ato", phon: "LOG", gloss: "foot, step", lemma: "foot"},
]};
const miatoBefore = JSON.stringify(miato);
context.collapsedNodeIds.add("word");
const joined = context.buildDisplayNode(miato, options);
assert.equal(joined.form, "miato");
assert.deepEqual(joined._collapsedTokens[0].annotations.filter(a => a.gloss).map(a => a.gloss),
  ["HON", "foot, step"]);
let layout = context.collapsedTokenAnnotations(joined._collapsedTokens[0], {...options, phon: true});
assert.equal(layout.labels.length, 4);
assert.ok(layout.labels.find(label => label.text === "HON").x < 0);
assert.ok(layout.labels.find(label => label.text === "foot, step").x > 0);
assert.equal(layout.rows, 2);
assert.ok(layout.labels.filter(label => label.field === "gloss").every(label => label.row === 0));
assert.ok(layout.labels.filter(label => label.field === "phon").every(label => label.row === 1));
layout.labels.forEach((left, index) => layout.labels.slice(index + 1).forEach(right => {
  if (left.row === right.row) assert.ok(left.right + 6 <= right.left || right.right + 6 <= left.left);
}));
assert.equal(context.collapsedTokenAnnotations(joined._collapsedTokens[0],
  {...options, gloss: false, phon: false}).labels.length, 0);
const hyphenated = context.buildDisplayNode(miato, {...options, segmentation: "hyphenated"});
assert.equal(hyphenated.form, "mi-ato");
assert.equal(hyphenated._collapsedTokens[0].annotations.find(a => a.gloss === "foot, step").start, 3);
const terminals = context.buildDisplayNode(miato, {...options, segmentation: "terminal"});
assert.equal(terminals.form, "mi ato");
assert.equal(terminals._collapsedTokens[0].annotations[0].gloss, "HON");
assert.equal(terminals._collapsedTokens[1].annotations[0].phon, "LOG");
context.collapsedNodeIds.add("phrase");
const higherWord = {...miato, gloss: "honorific footprint"};
const containing = context.buildDisplayNode({...original, children: [higherWord]}, options);
assert.deepEqual(containing._collapsedTokens[0].annotations.filter(a => a.gloss).map(a => a.gloss),
  [higherWord.gloss]);
const higherCollapsed = context.buildDisplayNode(higherWord, options);
assert.equal(higherCollapsed.gloss, higherWord.gloss);
assert.ok(higherCollapsed._collapsedTokens[0].annotations.every(a => !a.gloss));
assert.equal(context.collapsedTokenAnnotations(containing._collapsedTokens[0],
  {...options, phon: true}).rows, 2);
const noGloss = {...joined._collapsedTokens[0], annotations:
  joined._collapsedTokens[0].annotations.map(a => ({...a, gloss: ""}))};
assert.ok(context.collapsedTokenAnnotations(noGloss, {...options, phon: true}).labels
  .every(label => label.row === 1));
assert.equal(context.collapsedTokenAnnotations(joined._collapsedTokens[0],
  {...options, gloss: false, phon: true}).rows, 1);
const multipartLayout = context.collapsedTokenAnnotations(collapsed._collapsedTokens[2],
  {...options, phon: true});
assert.deepEqual(multipartLayout.labels.filter(label => label.field === "phon").map(label => label.text),
  ["LOG", "PHON"]);
const miswoti = {_nodeId: "number", tag: "N", children: [
  {tag: "NUM", gloss: "thirty", children: [
    {tag: "NUM", form: "mi", phon: "PHON", gloss: "three"},
    {tag: "NUM", form: "swo", phon: "PHON", gloss: "ten"},
  ]}, {tag: "CL", form: "ti", phon: "PHON", gloss: "CL"},
]};
context.collapsedNodeIds.add("number");
for (const segmentation of ["word", "hyphenated"]) {
  const number = context.buildDisplayNode(miswoti, {...options, segmentation});
  const labels = context.collapsedTokenAnnotations(number._collapsedTokens[0], {...options, phon: true});
  assert.deepEqual(labels.labels.filter(label => label.field === "gloss").map(label => label.text),
    ["thirty", "CL"]);
  assert.deepEqual(labels.labels.filter(label => label.field === "phon").map(label => label.text),
    ["PHON"]);
}
const mixed = {...joined._collapsedTokens[0], parts: [
  {form: "a", phon: "PHON"}, {form: "b", phon: "PHON"},
  {form: "c", phon: "LOG"}, {form: "d", phon: "LOG"}, {form: "e", phon: "PHON"},
]};
assert.deepEqual(context.collapsedTokenAnnotations(mixed, {...options, phon: true}).labels
  .filter(label => label.field === "phon").map(label => label.text), ["PHON", "LOG", "PHON"]);
assert.equal(JSON.stringify(miato), miatoBefore);
console.log("Collapsed word segmentation, glosses, multipart forms, sizing, and expansion passed.");
