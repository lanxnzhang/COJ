"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {State} = require("../static/editing-state.js");

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.attributes = {}; this.value = ""; this.ownText = ""; }
  set textContent(value) { this.ownText = value; this.children = []; }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(""); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; this.ownText = ""; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, action) { (this.events[name] ||= []).push(action); }
  async dispatch(name) { for (const action of this.events[name] || []) await action({target: this}); }
}
function all(node, predicate) { return [...(predicate(node) ? [node] : []), ...node.children.flatMap(child => all(child, predicate))]; }
const clone = value => JSON.parse(JSON.stringify(value));
const disk = new Map();
let revision = 0, identity = 0;
async function apiFetch(url, options = {}) {
  if (url === "/api/authoring/files") return [...disk.keys()];
  const filename = decodeURIComponent(url.split("/").at(-1));
  if (options.method === "PUT") {
    const body = JSON.parse(options.body), current = disk.get(filename);
    if ((current?.revision || null) !== body.expected_revision) throw new Error("This file changed. Reopen it.");
    const record = {filename, document: clone(body.document), revision: `revision-${++revision}`};
    disk.set(filename, record); return record;
  }
  if (!disk.has(filename)) throw new Error("Not found");
  return clone(disk.get(filename));
}
async function session() {
  const detail = new Element("div");
  const context = vm.createContext({document: {createElement: tag => new Element(tag), querySelector: () => detail},
    window: {addEventListener() {}, confirm: () => true},
    COJEditing: {State: class extends State { constructor() { super(() => `id-${++identity}`); } }}, apiFetch});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../static/editing.js"), "utf8"), context);
  await new Promise(resolve => setImmediate(resolve));
  const page = detail.children[0];
  return {page,
    button: text => all(page, node => node.tag === "button" && node.textContent === text)[0],
    input: label => all(page, node => node.attributes["aria-label"] === label)[0],
    inputs: label => all(page, node => node.attributes["aria-label"] === label)};
}
async function type(input, text) { input.value = text; await input.dispatch("input"); }

(async () => {
  let ui = await session();
  await ui.button("Add segment").dispatch("click");
  await type(ui.input("Original text"), "多迦由久夜");
  await type(ui.input("Transcription components for segment 1"), "taka\nyuku\nya");
  // Another structural UI action must retain pending transcription.
  await ui.button("Add segment").dispatch("click");
  assert.equal(ui.input("Transcription components for segment 1").value, "taka\nyuku\nya");
  await type(ui.input("Filename"), "KK.67.syn.json");
  // Save commits pending components, including a valid empty second segment.
  await ui.button("Save .syn.json").dispatch("click");
  const first = clone(disk.get("KK.67.syn.json").document);
  assert.equal(Object.keys(first.occurrences).length, 3);
  assert.equal(first.segment_order.length, 2);
  assert.equal(ui.inputs("Form").length, 6);
  await type(ui.inputs("Form")[3], "corrected");
  assert.equal(ui.inputs("Form")[0].value, "corrected");
  await type(ui.inputs("Lemma (optional)")[0], "L007005");
  assert.equal(ui.inputs("Lemma (optional)")[3].value, "L007005");
  await ui.button("Save .syn.json").dispatch("click");
  const saved = clone(disk.get("KK.67.syn.json").document);
  assert.deepEqual(Object.keys(saved.occurrences), Object.keys(first.occurrences));
  assert.deepEqual(saved.syntax_nodes, first.syntax_nodes);
  assert.ok(!ui.page.textContent.includes(Object.keys(saved.occurrences)[0]));
  // Recreate the entire UI session to simulate close/reload rather than memory reuse.
  ui = await session();
  ui.input("Saved authoring file").value = "KK.67.syn.json";
  await ui.button("Open").dispatch("click");
  assert.equal(ui.inputs("Form")[0].value, "corrected");
  await ui.button("Save .syn.json").dispatch("click");
  assert.deepEqual(disk.get("KK.67.syn.json").document, saved);
  // A failed/stale save retains the draft and does not replace newer disk data.
  disk.get("KK.67.syn.json").revision = "external-change";
  await type(ui.inputs("Form")[3], "unsaved edit");
  await ui.button("Save .syn.json").dispatch("click");
  assert.ok(ui.page.textContent.includes("This file changed"));
  assert.equal(ui.inputs("Form")[0].value, "unsaved edit");
  assert.deepEqual(disk.get("KK.67.syn.json").document, saved);
  console.log("Editing UI source/terminal synchronization, pending input, save/reopen and conflict checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
