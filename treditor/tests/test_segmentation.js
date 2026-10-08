const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const segmentation = require("../static/segmentation.js");
const reference = JSON.parse(fs.readFileSync(path.join(__dirname, "../tag_names.json"), "utf8"));
const leaf = (tag, form, phon = "PHON") => ({tag, form, phon});
const branch = (tag, ...children) => ({tag, children});
const text = (nodes, mode) => segmentation.tokens(nodes, mode, reference).map(t => t.text).join(" ");
const bs = [branch("IP-REL", branch("NP-OB1", branch("N", leaf("PFX-HON", "mi"),
  leaf("N", "ato"))), leaf("VB-ADC", "tukuru"))];
assert.equal(text(bs, "word"), "miato tukuru");
assert.equal(text(bs, "terminal"), "mi ato tukuru");
assert.equal(text(bs, "hyphenated"), "mi-ato tukuru");
const kk = [branch("VB-ADN", branch("N", branch("N", leaf("ADJ-STM", "awo"),
  leaf("N", "kaki")), leaf("N", "yama")), branch("VB-ADN", leaf("VB-STM", "gomor"),
  leaf("VAX-STV-ADN", "eru")))];
assert.equal(text(kk, "word"), "awokakiyamagomoreru");
assert.equal(text(kk, "hyphenated"), "awo-kaki-yama-gomor-eru");
assert.equal(text([branch("N", branch("NP", leaf("N", "a")), leaf("N", "b"))], "word"), "a b");
assert.equal(text([branch("N", branch("multi-sentence", leaf("N", "a")), leaf("N", "b"))], "word"), "a b");
assert.equal(text([leaf("VB-CND", "saraba")], "hyphenated"), "saraba");
const multipart = {tag: "VB", form: "ipaku", phon: "", parts: [
  {form: "ipa", phon: "LOG"}, {form: "ku", phon: "PHON"}]};
assert.equal(text([multipart], "hyphenated"), "ipaku");
assert.equal(text([branch("C-N", branch("N", leaf("PFX", "a"), leaf("N", "b")))], "word"), "a b");
assert.equal(text([branch("N", leaf("N", "a"), leaf("N", "x", "ILL"))], "word"), "a x");
assert.equal(text([branch("N", leaf("N", "a"), leaf("N", "x", "NULL"))], "word"), "a x");
assert.equal(text([branch("N-UNKNOWN", leaf("N", "a"), leaf("N", "b"))], "word"), "a b");
const before = JSON.stringify(kk);
const rows = [{number: "4", transcription: "awo kaki"}, {number: "5", transcription: "yama gomor eru"}];
let formatted = segmentation.format(kk, rows, "word", true, reference);
assert.deepEqual(formatted.map(r => r.text), ["awokaki", "yamagomoreru"]);
assert.deepEqual(formatted.map(r => r.number), ["4", "5"]);
assert.deepEqual(segmentation.format(kk, rows, "terminal", true, reference).map(r => r.text),
  ["awo kaki", "yama gomor eru"]);
assert.deepEqual(segmentation.format(kk, rows, "hyphenated", true, reference).map(r => r.text),
  ["awo-kaki", "yama-gomor-eru"]);
formatted = segmentation.format(kk, rows, "word", false, reference);
assert.equal(formatted[0].text, "awokakiyamagomoreru");
assert.deepEqual(segmentation.ranges(formatted[0], [{segment: 1, start: 5, end: 10}]),
  [{start: 11, end: 16}]);
assert.equal(JSON.stringify(kk), before);
assert.equal(segmentation.format(kk, [{transcription: "different"}], "word", true, reference), null);
formatted = segmentation.format([multipart], [{transcription: "ipa ku"}], "hyphenated", true, reference);
assert.equal(formatted[0].text, "ipaku");
assert.deepEqual(formatted[0].tokens[0].parts, multipart.parts);
const compound = branch("N", leaf("N", "titi"), leaf("N", "papa"));
compound.lemma = "L050402";
assert.equal(segmentation.tokens([compound], "word", reference)[0].lemma, "L050402");
formatted = segmentation.format(bs, [{transcription: "mi ato tukuru"}], "word", false, reference);
assert.deepEqual(segmentation.ranges(formatted[0], [{segment: 0, start: 0, end: 2}]),
  [{start: 0, end: 2}]);
formatted = segmentation.format(bs, [{transcription: "mi ato tukuru"}], "hyphenated", false, reference);
assert.deepEqual(segmentation.ranges(formatted[0], [{segment: 0, start: 0, end: 6}]),
  [{start: 0, end: 2}, {start: 3, end: 6}]);
console.log("Display segmentation, row preservation, multipart forms, fallback and highlight offsets passed.");
