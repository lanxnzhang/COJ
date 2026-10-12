"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const editing = require("../static/editing-state.js");
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.attributes = {}; this.value = ""; this.ownText = ""; this.tagName = tag.toUpperCase(); this.style = {}; this.scrollHeight = 28; this.isConnected = true; }
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
imported.text.nodes.root = {...imported.text.nodes.n, category: "IP-MAT", form: null, children: ["n"]}; imported.text.roots = ["root"];
imported.text.links.l = {node: "n", passage: p, part: null, start: 0, end: 10, status: "valid", reason: "",
  evidence: {original: "多迦由久夜", transcription: "taka yuku ya", status: "valid", reason: ""}};
async function apiFetch(url, options = {}) {
  if (url === "/api/authoring/files") return [...disk.keys()];
  if (url === "/api/authoring/corpus") return [{key: "trees:KK", name: "KK", texts: [{key: "0", text_id: "KK.67"}]}, {key: "trees:MYS_01", name: "MYS_01", texts: [{key: "0", text_id: "MYS.1.1"}]}];
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
async function session(options = {}) {
  const detail = new Element("div"), sidebar = new Element("div"), events = {};
  const context = vm.createContext({document: {createElement: tag => new Element(tag), querySelector: selector => selector === ".detail-pane" ? detail : sidebar},
    window: {addEventListener: (name, action) => { events[name] = action; }, confirm: options.confirm || (() => true), prompt: () => "copy"},
    requestAnimationFrame: action => action(), COJEditing: {...editing, State: class extends editing.State { constructor() { super(() => `id-${++identity}`); } }}, apiFetch});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../static/editing.js"), "utf8"), context);
  const page = detail.children[0];
  const root = new Element("div"); root.append(page, sidebar);
  return {page, sidebar, events,
    button: text => all(root, node => node.tag === "button" && node.textContent === text)[0],
    input: label => all(root, node => node.attributes["aria-label"] === label)[0],
    label: label => all(root, node => node.attributes["aria-label"] === label)[0],
    summary: label => all(root, node => node.tag === "summary" && node.textContent === label)[0],
    expand: async label => {
      const node = all(root, node => node.tag === "details" && node.children[0]?.textContent === label)[0];
      node.open = true; await node.dispatch("toggle");
    }};
}
async function type(input, text) { input.value = text; await input.dispatch("input"); }
(async () => {
  let ui = await session();
  assert.equal(all(ui.page, n => n.tag === "button").length, 0);
  await ui.button("New Text").dispatch("click");
  assert.equal(ui.input("Text ID"), undefined); // A parent must be explicitly chosen.
  await ui.button("New Document").dispatch("click");
  assert.equal(ui.input("Text ID"), undefined);
  await type(ui.input("Document name"), "Draft");
  await ui.button("Save").dispatch("click");
  assert.deepEqual(disk.get("Draft.syn.json").document.text_order, []);
  await ui.button("New Text").dispatch("click");
  await ui.label("Add Text to Draft").dispatch("click");
  assert.strictEqual(Element.focused, ui.input("Bulk entry"));
  await type(ui.input("Text ID"), "KK.67");
  assert.equal(ui.input("Text 1"), undefined);
  await type(ui.input("Bulk entry"), "美阿止都久留\nmi ato tukuru\n伊志乃比鼻伎波\nisi no pibiki pa\n阿米爾伊多利\name ni itari");
  await ui.button("Preview").dispatch("click");
  assert.equal(ui.input("Text 1"), undefined); // Preview has not authored anything.
  assert.ok(ui.page.textContent.includes("美阿止都久留"));
  await ui.button("Apply").dispatch("click");
  assert.equal(ui.input("Text 1").value, "美阿止都久留");
  assert.equal(ui.input("Transcription 3").value, "ame ni itari");
  await ui.button("Save").dispatch("click");
  const first = clone(disk.get("Draft.syn.json").document), firstKey = first.text_order[0];
  const ids = first.texts[firstKey].passage_order;
  await ui.label("Insert before 2").dispatch("click");
  assert.strictEqual(Element.focused, ui.input("Text 2"));
  assert.equal(ui.input("Text 3").value, "伊志乃比鼻伎波");
  await type(ui.input("Text 2"), "inserted"); await type(ui.input("Transcription 2"), "insert ed");
  await ui.button("Save").dispatch("click");
  const inserted = disk.get("Draft.syn.json").document.texts[firstKey].passage_order;
  assert.deepEqual([inserted[0], inserted[2], inserted[3]], ids);
  assert.notEqual(inserted[1], ids[1]);
  await ui.label("Remove 2").dispatch("click");
  assert.equal(ui.input("Text 2").value, "伊志乃比鼻伎波");
  await ui.button("Undo removal").dispatch("click");
  assert.equal(ui.input("Text 2").value, "inserted");
  await ui.input("Transcription 4").dispatch("keydown", {key: "Enter"});
  assert.strictEqual(Element.focused, ui.input("Text 5"));
  await ui.label("Remove 5").dispatch("click");
  await ui.button("New Text").dispatch("click"); await ui.label("Add Text to Draft").dispatch("click");
  await type(ui.input("Text ID"), "KK.68");
  await ui.label("Add row").dispatch("click"); await type(ui.input("Text 1"), "美淤須比賀泥"); await type(ui.input("Transcription 1"), "mi osupi gane");
  await ui.button("Save").dispatch("click");
  const saved = clone(disk.get("Draft.syn.json").document);
  assert.equal(saved.text_order.length, 2); assert.deepEqual(saved.texts[firstKey].nodes, {});
  // Searching a saved Text reads its Document without replacing the active draft.
  ui = await session(); await ui.button("Open Text").dispatch("click");
  await ui.expand("Draft");
  await ui.label("Open KK.68 in Draft, 2").dispatch("click");
  assert.equal(ui.input("Transcription 1").value, "mi osupi gane");
  await type(ui.input("Text ID"), "renamed scholarly ID"); await ui.button("Save").dispatch("click");
  assert.equal(disk.size, 1);
  await type(ui.input("Bulk entry"), "1 原文\n spaced input\n2 次\n next input");
  await ui.button("Save").dispatch("click"); assert.ok(ui.page.textContent.includes("Preview and apply"));
  await ui.button("Preview").dispatch("click");
  await type(ui.input("Bulk entry"), "unpaired");
  assert.equal(ui.button("Apply"), undefined); // Changed input invalidates its preview.
  await ui.button("New Text").dispatch("click"); await ui.label("Add Text to Draft").dispatch("click");
  assert.equal(ui.input("Text ID").value, "renamed scholarly ID");
  assert.equal(ui.input("Bulk entry").value, "unpaired");
  await type(ui.input("Bulk entry"), "原文\n spaced input"); await ui.button("Preview").dispatch("click"); await ui.button("Apply").dispatch("click");
  assert.equal(ui.input("Text 2").value, "原文"); await ui.button("Save").dispatch("click");
  disk.get("Draft.syn.json").revision = "external";
  await type(ui.input("Transcription 1"), "unsaved"); await ui.button("Save").dispatch("click");
  assert.ok(ui.page.textContent.includes("Your draft is retained")); assert.equal(ui.input("Transcription 1").value, "unsaved");
  let prevented = false; ui.events.beforeunload({preventDefault() { prevented = true; }}); assert.ok(prevented);
  ui = await session(); await ui.button("Open Text").dispatch("click");
  assert.ok(ui.summary("MYS")); assert.equal(ui.button("MYS_01"), undefined);
  await type(ui.input("Find a Text or Document"), "KK.67"); await new Promise(resolve => setImmediate(resolve));
  assert.ok(ui.label("Open KK.67 in Draft, 1"));
  await ui.label("Open KK.67 in KK, 1").dispatch("click");
  await type(ui.input("Transcription 1"), "taka  yukuya"); assert.ok(!ui.page.textContent.includes("Transcription changed"));
  await type(ui.input("Transcription 1"), "correction"); assert.ok(ui.page.textContent.includes("Transcription changed"));
  assert.ok(ui.page.textContent.includes("taka yuku ya")); // Retained original evidence is visible.
  assert.equal(all(ui.page, n => n.tag === "li" && n.textContent.includes("VB")).length, 0);
  assert.ok(all(ui.page, n => n.className === "editing-analysis-children").length);
  await ui.label("Remove 1").dispatch("click"); await ui.button("Save").dispatch("click");
  const orphan = disk.get("KK.syn.json").document.texts[imported.activeText];
  assert.deepEqual(orphan.nodes, imported.text.nodes); assert.deepEqual(orphan.links.l.evidence, imported.text.links.l.evidence);
  assert.equal(orphan.links.l.status, "unresolved");
  // Creating a Text in a different saved Document requires choosing that parent.
  await ui.button("New Text").dispatch("click"); await ui.label("Add Text to Draft").dispatch("click");
  assert.equal(ui.input("Text ID").value, ""); assert.equal(ui.input("Text 1"), undefined);
  await type(ui.input("Text ID"), "third"); await ui.button("Save").dispatch("click");
  assert.equal(disk.get("Draft.syn.json").document.text_order.length, 3);
  ui = await session({confirm: () => false}); await ui.button("New Document").dispatch("click");
  await type(ui.input("Document name"), "unsaved-parent");
  await ui.button("New Text").dispatch("click"); await ui.label("Add Text to Draft").dispatch("click");
  assert.equal(ui.input("Document name").value, "unsaved-parent");
  assert.equal(ui.input("Text ID"), undefined);
  console.log("Sidebar parenting/search, empty Documents, bulk review, compact insertion identities, multi-Text reopen, guided hierarchy and preserved draft checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
