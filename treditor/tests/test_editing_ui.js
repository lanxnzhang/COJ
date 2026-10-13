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
  getAttribute(key) { return this.attributes[key]; }
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
  if (url === "/api/authoring/corpus") return [{key: "trees:KK", name: "KK", texts: [{key: "0", text_id: "KK.67"}]}, {key: "trees:MYS_01", name: "MYS_01", texts: [{key: "0", text_id: "MYS.1.1"}]}, {key: "trees:MYS_02", name: "MYS_02", texts: [{key: "0", text_id: "MYS.2.1"}]}];
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
    requestAnimationFrame: action => action(), COJEditing: {...editing, Session: class extends editing.Session { constructor() { super(() => `id-${++identity}`); } }, State: class extends editing.State { constructor() { super(() => `id-${++identity}`); } }}, apiFetch});
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
  // Numbers count only unnamed Documents, not standalone Text wrappers or opened named files.
  let numbering = await session();
  await numbering.button("New Document").dispatch("click"); assert.ok(numbering.summary("Untitled Document 1"));
  await numbering.button("New Text").dispatch("click"); await numbering.button("New Text").dispatch("click");
  await numbering.button("New Document").dispatch("click"); assert.ok(numbering.summary("Untitled Document 2"));
  assert.ok(numbering.summary("Untitled Document 1"));
  numbering = await session();
  await numbering.button("New Text").dispatch("click"); await numbering.button("New Text").dispatch("click");
  await numbering.button("Open Text").dispatch("click"); await numbering.label("Browse KK (corpus)").dispatch("click");
  await numbering.label("Open KK.67 in KK, 1").dispatch("click");
  await numbering.button("New Document").dispatch("click"); assert.ok(numbering.summary("Untitled Document 1"));
  // Moving an earlier standalone Text into a Document must not renumber other draft labels.
  await numbering.label("Return to Untitled Text 1 (1, 1)").dispatch("click"); await numbering.button("Save").dispatch("click");
  const numberTarget = numbering.input("Save destination");
  numberTarget.value = numberTarget.children.find(n => n.textContent.startsWith("KK (session draft)")).value;
  await numberTarget.dispatch("change"); await numbering.button("Confirm Save").dispatch("click");
  assert.ok(numbering.summary("Untitled Document 1"));
  await numbering.button("New Text").dispatch("click"); await numbering.button("Save").dispatch("click");
  await type(numbering.input("Document name"), "Numbering-check"); await numbering.button("Confirm Save").dispatch("click");
  assert.ok(numbering.summary("Untitled Document 1"));
  disk.clear();
  let ui = await session();
  assert.equal(all(ui.page, n => n.tag === "button").length, 0);
  await ui.button("New Text").dispatch("click");
  assert.ok(ui.input("Text ID")); assert.equal(ui.input("Document name"), undefined);
  assert.strictEqual(Element.focused, ui.input("Text Input"));
  assert.equal(ui.input("Text Input").value, ""); assert.ok(!ui.input("Text Input").placeholder);
  await type(ui.input("Text ID"), "Draft-A");
  const scratch = "美阿止都久留\nmi ato tukuru\n伊志乃比鼻伎波\nisi no pibiki pa";
  await type(ui.input("Text Input"), scratch);
  ui.input("Text Input").scrollTop = 120; await ui.input("Text Input").dispatch("scroll");
  await ui.button("Preview").dispatch("click"); assert.equal(ui.input("Text 1"), undefined);
  await ui.button("Add to Source").dispatch("click");
  assert.equal(ui.input("Text 1").value, "美阿止都久留"); assert.equal(ui.input("Text Input").value, scratch);
  assert.equal(disk.size, 0); // Creation and source authoring are memory-only.
  await type(ui.input("Text 1"), "source correction"); assert.equal(ui.input("Text Input").value, scratch);
  await ui.button("New Document").dispatch("click");
  assert.ok(ui.input("Text ID")); assert.equal(ui.input("Text 1"), undefined);
  await type(ui.input("Text ID"), "Doc-first");
  const docAdd = all(ui.sidebar, n => n.attributes["aria-label"]?.startsWith("Add Text to Untitled Document"))[0];
  await docAdd.dispatch("click"); await type(ui.input("Text ID"), "Doc-second");
  await ui.button("Save").dispatch("click"); assert.equal(disk.size, 0);
  await type(ui.input("Document name"), "Bundle"); await ui.button("Confirm Save").dispatch("click");
  assert.equal(disk.get("Bundle.syn.json").document.text_order.length, 2);
  await ui.label("Return to Draft-A (1, 1)").dispatch("click");
  assert.equal(ui.input("Text 1").value, "source correction"); assert.equal(ui.input("Text Input").value, scratch);
  assert.equal(ui.input("Text Input").scrollTop, 120);
  const input = ui.input("Text Input"); assert.equal(input.style.height, undefined); // Scratch is not auto-sized into a clipped Source field.
  await ui.label("Insert before 2").dispatch("click");
  await type(ui.input("Text 2"), "inserted"); await type(ui.input("Transcription 2"), "insert ed");
  assert.equal(ui.input("Text 3").value, "伊志乃比鼻伎波");
  await ui.button("Save").dispatch("click");
  const select = ui.input("Save destination");
  const bundle = select.children.find(n => n.textContent.startsWith("Bundle (session draft)"));
  select.value = bundle.value; await select.dispatch("change"); await ui.button("Confirm Save").dispatch("click");
  let saved = clone(disk.get("Bundle.syn.json").document);
  assert.equal(saved.text_order.length, 3); const key = saved.text_order[2], ids = saved.texts[key].passage_order.slice();
  assert.equal(saved.texts[key].text_id, "Draft-A"); assert.equal(saved.texts[key].passage_order.length, 3);
  assert.deepEqual(saved.texts[key].nodes, {}); assert.equal(saved.texts[key].passages[ids[0]].original, "source correction");
  assert.equal(JSON.stringify(saved).includes('"preview"'), false); assert.equal(JSON.stringify(saved).includes(scratch), false);
  await ui.label("Remove 2").dispatch("click"); await ui.button("Undo removal").dispatch("click");
  await ui.button("Save").dispatch("click"); assert.deepEqual(disk.get("Bundle.syn.json").document.texts[key].passage_order, ids);
  // Search and master/detail navigation keep every draft and its scratch input.
  await ui.button("Open Text").dispatch("click"); assert.ok(ui.summary("MYS"));

  assert.equal(ui.summary("Current Document"), undefined); assert.equal(ui.summary("Other corpus Documents"), undefined);
  assert.equal(ui.label("Open KK.67 in KK, 1"), undefined);
  await ui.label("Browse KK (corpus)").dispatch("click");
  assert.ok(ui.label("Open KK.67 in KK, 1")); assert.equal(all(ui.sidebar, n => n.attributes["aria-label"] === "Open KK.67 in KK, 1").length, 0);
  await ui.label("Open KK.67 in KK, 1").dispatch("click");
  assert.equal(ui.input("Text Input").value, "");
  await type(ui.input("Text Input"), "替代\nreplacement"); await ui.button("Preview").dispatch("click");
  assert.equal(ui.input("Transcription 1").value, "taka yuku ya");
  await ui.button("Add to Source").dispatch("click"); assert.equal(ui.input("Text 2").value, "替代");
  await ui.button("Preview").dispatch("click"); await ui.button("Replace entire Source").dispatch("click");
  assert.ok(ui.label("Confirm Source replacement").textContent.includes("多迦由久夜"));
  await ui.button("Cancel replacement").dispatch("click"); assert.equal(ui.input("Text 2").value, "替代");
  await ui.button("Replace entire Source").dispatch("click");
  await type(ui.input("Text 1"), "changed while reviewing"); await ui.button("Confirm replacement").dispatch("click");
  assert.ok(ui.page.textContent.includes("Source changed")); assert.equal(ui.input("Text 2").value, "替代");
  await ui.button("Replace entire Source").dispatch("click"); await ui.button("Confirm replacement").dispatch("click");
  assert.equal(ui.input("Text 1").value, "替代"); assert.equal(ui.input("Text 2"), undefined);
  assert.ok(ui.page.textContent.includes("Removed passage")); assert.ok(ui.page.textContent.includes("taka yuku ya"));
  await ui.button("Undo replacement").dispatch("click"); assert.equal(ui.input("Text 2").value, "替代");
  await ui.button("Preview").dispatch("click"); await ui.button("Replace entire Source").dispatch("click"); await ui.button("Confirm replacement").dispatch("click");
  await ui.button("Save").dispatch("click"); await type(ui.input("Document name"), "KK"); await ui.button("Confirm Save").dispatch("click");
  const orphan = disk.get("KK.syn.json").document.texts[imported.activeText];
  assert.deepEqual(orphan.nodes, imported.text.nodes); assert.deepEqual(orphan.links.l.evidence, imported.text.links.l.evidence);
  assert.equal(orphan.links.l.status, "unresolved"); assert.ok(all(ui.page, n => n.className === "editing-analysis-children").length);
  await ui.label("Return to Draft-A (1, 3)").dispatch("click");
  assert.equal(ui.input("Text Input").value, scratch); assert.equal(ui.input("Text 1").value, "source correction");
  // Scratch edits do not make Source dirty or prevent its explicit Save.
  await type(ui.input("Text Input"), "unpaired input"); await ui.button("Preview").dispatch("click");
  assert.ok(ui.page.textContent.includes("Paste pairs")); await ui.button("Save").dispatch("click");
  assert.equal(ui.input("Text Input").value, "unpaired input");
  disk.get("Bundle.syn.json").revision = "external";
  await type(ui.input("Transcription 1"), "unsaved"); await ui.button("Save").dispatch("click");
  assert.ok(ui.page.textContent.includes("session drafts are retained")); assert.equal(ui.input("Transcription 1").value, "unsaved");
  await ui.button("New Text").dispatch("click"); await type(ui.input("Text ID"), "Pending"); await ui.label("Add row").dispatch("click");
  await type(ui.input("Text 1"), "pending"); await ui.button("Save").dispatch("click");
  const target = ui.input("Save destination"); target.value = target.children.find(n => n.textContent.startsWith("Bundle (session draft)")).value;
  await target.dispatch("change"); await ui.button("Confirm Save").dispatch("click");
  assert.equal(ui.input("Text ID").value, "Pending"); assert.equal(disk.get("Bundle.syn.json").document.text_order.length, 3);
  assert.ok(ui.page.textContent.includes("session drafts are retained"));
  let prevented = false; ui.events.beforeunload({preventDefault() { prevented = true; }}); assert.ok(prevented);
  // Reopen real saved contents in a fresh session; scratch deliberately remains session-only.
  ui = await session(); await ui.button("Open Text").dispatch("click");
  await type(ui.input("Find a Text or Document"), "Draft-A"); await new Promise(resolve => setImmediate(resolve));
  await ui.label("Browse Bundle (saved)").dispatch("click"); await ui.label("Open Draft-A in Bundle, 3").dispatch("click");
  assert.equal(ui.input("Text 1").value, "source correction"); assert.equal(ui.input("Text Input").value, "");
  await ui.button("New Text").dispatch("click"); await type(ui.input("Text ID"), "saved-standalone");
  await ui.button("Save").dispatch("click"); await type(ui.input("Document name"), "Fresh"); await ui.button("Confirm Save").dispatch("click");
  assert.equal(disk.get("Fresh.syn.json").document.text_order.length, 1);
  // Attach directly to a disk Document that has not been opened in this session.
  ui = await session(); await ui.button("New Text").dispatch("click"); await type(ui.input("Text ID"), "attached-direct");
  await type(ui.input("Text Input"), "原文\nnew input"); await ui.button("Preview").dispatch("click"); await ui.button("Add to Source").dispatch("click");
  const originalBundle = clone(disk.get("Bundle.syn.json").document);
  await ui.button("Save").dispatch("click");
  const directTarget = ui.input("Save destination"); directTarget.value = directTarget.children.find(n => n.textContent.startsWith("Bundle (saved)")).value;
  await directTarget.dispatch("change"); await ui.button("Confirm Save").dispatch("click");
  const appended = disk.get("Bundle.syn.json").document;
  assert.equal(appended.text_order.length, 4);
  assert.deepEqual(appended.text_order.slice(0, 3), originalBundle.text_order);
  originalBundle.text_order.forEach(id => assert.deepEqual(appended.texts[id], originalBundle.texts[id]));
  const beforeCopy = clone(appended);
  await ui.button("Save a copy").dispatch("click"); await type(ui.input("Document name"), "Bundle-copy"); await ui.button("Confirm Save").dispatch("click");
  assert.equal(ui.input("Text ID").value, "attached-direct"); assert.equal(ui.input("Text Input").value, "原文\nnew input");
  assert.deepEqual(disk.get("Bundle.syn.json").document, beforeCopy);
  assert.deepEqual(disk.get("Bundle-copy.syn.json").document.text_order, beforeCopy.text_order);
  console.log("Immediate session drafts, manual placement/saves, master-detail browsing, independent scratch, reviewed Source replacement and stale merge preservation passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
