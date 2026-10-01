const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../static/app.js"), "utf8");
const context = vm.createContext({
  collapsedNodeIds: new Set(["phrase"]),
  CHARACTER_WIDTH: 7.4,
  treeTagNames: JSON.parse(fs.readFileSync(path.join(__dirname, "../tag_names.json"), "utf8")),
});
const start = source.indexOf("function isNullNode(");
const end = source.indexOf("function measureSubtreeWidth(");
vm.runInContext(source.slice(start, end), context);
assert.equal(context.displayTag("ADN", {fullTags: true}), "Adnominal");
assert.equal(context.displayTag("NP-APP", {fullTags: true}), "Noun phrase apposition");
assert.equal(context.displayTag("CP-FINAL", {fullTags: true}),
  "Complementizer phrase clauses with a right dislocated element");
assert.equal(context.displayTag("IP-PRP", {fullTags: true}),
  "Inflectional phrase purposive subordinate clause");
assert.equal(context.displayTag("NULL", {fullTags: true}), "Null element");
assert.equal(context.displayTag("VB-ADC", {fullTags: true}),
  "Verb syncretic adnominal and conclusive");
assert.equal(context.displayTag("NP;@5", {fullTags: true}), "Noun phrase;@5");
assert.equal(context.displayTag("NP-UNKNOWN", {fullTags: true}), "NP-UNKNOWN");
assert.equal(context.displayTag("NP", {fullTags: false}), "NP");
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
const longGloss = {...collapsed._collapsedTokens[0], gloss: "a much longer dictionary gloss"};
assert.ok(context.collapsedTokenWidth(longGloss, options)
  > context.collapsedTokenWidth(longGloss, {...options, gloss: false}));
context.collapsedNodeIds.clear();
assert.equal(context.buildDisplayNode(original, options).children.length, 3);
console.log("Collapsed word segmentation, glosses, multipart forms, sizing, and expansion passed.");
