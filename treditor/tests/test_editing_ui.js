"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const editing = require("../static/editing-state.js");
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.attributes = {}; this.value = ""; this.ownText = ""; }
  set textContent(value) { this.ownText = value; this.children = []; }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(""); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; this.ownText = ""; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, action) { (this.events[name] ||= []).push(action); }
  focus() { Element.focused = this; }
  async dispatch(name, extra = {}) { for (const action of this.events[name] || []) await action({target: this, preventDefault() {}, ...extra}); }
}
function all(node, predicate) { return [...(predicate(node) ? [node] : []), ...node.children.flatMap(child => all(child, predicate))]; }
const clone = value => JSON.parse(JSON.stringify(value)), disk = new Map();
let revision = 0, identity = 0;
const imported = new editing.State(() => `corpus-${++identity}`);
imported.document.name = "KK"; imported.addText("KK.67"); const p = imported.addPassage("多迦由久夜", "taka yuku ya");
imported.text.nodes.n = {category: "VB", lemma: "L1", form: "takayukuya", children: [], parts: [], script: null, annotations: {}};
imported.text.roots = ["n"];
imported.text.links.l = {node: "n", passage: p, part: null, start: 0, end: 10, status: "valid", reason: "",
  evidence: {original: "多迦由久夜", transcription: "taka yuku ya", status: "valid", reason: ""}};
async function apiFetch(url, options = {}) {
  if (url === "/api/authoring/files") return [...disk.keys()];
  if (url === "/api/authoring/corpus") return [{key: "trees:KK", name: "KK", texts: [{text_id: "KK.67"}]}];
  if (url.startsWith("/api/authoring/corpus/")) return {document: clone(imported.document)};
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
  const detail = new Element("div"), events = {};
  const context = vm.createContext({document: {createElement: tag => new Element(tag), querySelector: () => detail},
    window: {addEventListener: (name, action) => { events[name] = action; }, confirm: () => true, prompt: () => "copy"},
    COJEditing: {...editing, State: class extends editing.State { constructor() { super(() => `id-${++identity}`); } }}, apiFetch});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../static/editing.js"), "utf8"), context);
  const page = detail.children[0];
  return {page, events, button: text => all(page, node => node.tag === "button" && node.textContent === text)[0],
    input: label => all(page, node => node.attributes["aria-label"] === label)[0]};
}
async function type(input, text) { input.value = text; await input.dispatch("input"); }
(async () => {
  let ui = await session();
  await ui.button("New Text").dispatch("click");
  assert.strictEqual(Element.focused, ui.input("Text ID"));
  await type(ui.input("Document name"), "Draft"); await type(ui.input("Text ID"), "KK.67");
  await type(ui.input("1  Original text"), "多迦由久夜");
  await type(ui.input("Spaced transcription for passage 1"), "taka yuku ya");
  await ui.input("Spaced transcription for passage 1").dispatch("keydown", {key: "Enter"});
  assert.strictEqual(Element.focused, ui.input("2  Original text"));
  await type(ui.input("2  Original text"), "波夜夫佐和気能"); await type(ui.input("Spaced transcription for passage 2"), "payabusawake no");
  await ui.button("New Text").dispatch("click"); await type(ui.input("Text ID"), "KK.68");
  await type(ui.input("1  Original text"), "美淤須比賀泥"); await type(ui.input("Spaced transcription for passage 1"), "mi osupi gane");
  await ui.button("Save").dispatch("click");
  const saved = clone(disk.get("Draft.syn.json").document);
  assert.equal(saved.text_order.length, 2);
  assert.equal(saved.texts[saved.text_order[0]].passage_order.length, 2);
  assert.deepEqual(saved.texts[saved.text_order[0]].nodes, {});
  ui = await session(); await ui.button("Open Text").dispatch("click"); await ui.button("Draft").dispatch("click");
  assert.equal(ui.input("Text ID").value, "KK.67");
  const select = ui.input("Text in this Document"); select.value = saved.text_order[1]; await select.dispatch("change");
  assert.equal(ui.input("Spaced transcription for passage 1").value, "mi osupi gane");
  await type(ui.input("Text ID"), "renamed scholarly ID"); await ui.button("Save").dispatch("click");
  assert.equal(disk.size, 1); // Scholarly identity never renames storage.
  await type(ui.input("Paste paired passages"), "1 原文\n spaced input\n2 次\n next input");
  await ui.button("Save").dispatch("click"); assert.ok(ui.page.textContent.includes("Preview and add"));
  await ui.button("Preview passages").dispatch("click"); assert.ok(ui.page.textContent.includes("2  原文"));
  await ui.button("Add previewed passages").dispatch("click"); assert.equal(ui.input("3  Original text").value, "次");
  await ui.button("Remove passage").dispatch("click"); await ui.button("Undo removal").dispatch("click");
  await ui.button("Save").dispatch("click");
  disk.get("Draft.syn.json").revision = "external";
  await type(ui.input("Spaced transcription for passage 1"), "unsaved"); await ui.button("Save").dispatch("click");
  assert.ok(ui.page.textContent.includes("Your draft is retained")); assert.equal(ui.input("Spaced transcription for passage 1").value, "unsaved");
  let prevented = false; ui.events.beforeunload({preventDefault() { prevented = true; }}); assert.ok(prevented);
  ui = await session(); await ui.button("Open Text").dispatch("click"); await ui.button("KK (1 Texts)").dispatch("click");
  await type(ui.input("Spaced transcription for passage 1"), "taka  yukuya"); assert.ok(!ui.page.textContent.includes("Transcription changed"));
  await type(ui.input("Spaced transcription for passage 1"), "correction"); assert.ok(ui.page.textContent.includes("Transcription changed"));
  await ui.button("Remove passage").dispatch("click"); assert.ok(ui.page.textContent.includes("Removed passage"));
  await ui.button("Save").dispatch("click");
  const orphan = disk.get("KK.syn.json").document.texts[imported.activeText];
  assert.deepEqual(orphan.nodes, imported.text.nodes); assert.deepEqual(orphan.links.l.evidence, imported.text.links.l.evidence);
  assert.equal(orphan.links.l.status, "unresolved");
  console.log("Editing multi-Text save/reopen, paired input, bulk preview, corpus opening, orphan preservation and stale draft checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
