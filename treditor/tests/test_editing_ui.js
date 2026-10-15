"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const editing = require("../static/editing-state.js");
const analysis = require("../static/editing-analysis.js");
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
const dictionaryOpens = [];
let revision = 0, identity = 0;
let analysisOverride = null;
const attestationRequests = [];
let liveEvidence = null;
const imported = new editing.State(() => `corpus-${++identity}`);
imported.document.name = "KK"; imported.addText("KK.67"); const p = imported.addPassage("多迦由久夜", "taka yuku ya");
imported.text.nodes.n = {category: "VB", lemma: "L1", form: "takayukuya", children: [], parts: [], script: null, annotations: {}};
imported.text.nodes.root = {...imported.text.nodes.n, category: "IP-MAT", form: null, children: ["n"]}; imported.text.roots = ["root"];
imported.text.links.l = {node: "n", passage: p, part: null, start: 0, end: 10, status: "valid", reason: "",
  evidence: {original: "多迦由久夜", transcription: "taka yuku ya", status: "valid", reason: ""}};
async function apiFetch(url, options = {}) {
  if (url.startsWith("/api/dictionary/")) return {fields: [{tag: ".GLOSS", values: ["test gloss"]},
    {tag: ".MEANING", values: ["meaning must not appear on hover"]}, {tag: ".POS", values: ["NOUN"]}]};
  if (url === "/api/authoring/analyse") {
    const data = JSON.parse(options.body), text = data.document.texts[data.text_key];
    const pattern = {category: "N", lemma: "L090723", form: null, annotations: {}, children: [
      {category: "N", lemma: "L051724", form: "paru", children: [], annotations: {}},
      {category: "N", lemma: "L050034", form: "yama", children: [], annotations: {}}]};
    const candidate = {id: "paruyama", pattern, dictionary: {gloss: "spring mountain"}, eligible: true, default: true, count: 8, texts: 8, support: 1,
      domains: {ordinary: 8, "EN/SM": 0}, evidence: [{text_id: "MYS.8.1421", source: "xml/trees/MYS_08.xml", ordinal: 0, address: "0", domain: "ordinary", revision: "evidence-revision"}]};
    const units = text.passage_order.flatMap(passage => {
      let offset = 0;
      return text.passages[passage].units.map(u => {
        const form = text.passages[passage].transcription.slice(u.start, u.end), start = offset; offset += form.length;
        return {form, passage, start, end: offset};
      });
    });
    if (analysisOverride) return analysisOverride(text, units);
    return {revision: "evidence-revision", domain: "ordinary", units,
      spans: units.map((u, i) => ({first: i, last: i + 1, form: u.form, candidates: u.form === "paruyama" ? [candidate] : []})),
      nodes: {}, scripts: ["LOG", "PHON", "NLOG"]};
  }
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
    requestAnimationFrame: action => action(), openDictionaryPopupEntry: id => dictionaryOpens.push(id),
    openCandidateAttestations: async (query, update) => { attestationRequests.push(query); if (liveEvidence) update(clone(liveEvidence)); },
    COJAnalysis: analysis, COJEditing: {...editing, Session: class extends editing.Session { constructor() { super(() => `id-${++identity}`); } }, State: class extends editing.State { constructor() { super(() => `id-${++identity}`); } }}, apiFetch});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../static/editing.js"), "utf8"), context);
  const page = detail.children[0];
  const root = new Element("div"); root.append(page, sidebar);
  function labelled(label) {
    const direct = all(root, node => node.attributes["aria-label"] === label)[0]; if (direct) return direct;
    const match = label.match(/^(Edit Lemma|Part Form|Part Script|Analysis row|Writing part|Tag|Form|Lemma|Script) (.+)$/);
    if (!match) return;
    const kind = {"Edit Lemma": "edit-lemma", "Part Form": "part-form", "Part Script": "part-script", "Analysis row": "node", "Writing part": "part"}[match[1]] || match[1].toLowerCase();
    return all(root, node => node.attributes["data-editing-key"] === `${kind}:${match[2]}`)[0];
  }
  return {page, sidebar, events,
    button: text => all(root, node => node.tag === "button" && node.textContent === text)[0],
    input: labelled,
    label: labelled,
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
  // Stage 3 uses Source explicitly and retains complete accepted data through Save/open.
  disk.clear(); ui = await session(); await ui.button("New Text").dispatch("click");
  await type(ui.input("Text Input"), "春山\nparuyama");
  await ui.button("Preview").dispatch("click"); await ui.button("Add to Source").dispatch("click");
  assert.equal(disk.size, 0); await ui.button("Analyse").dispatch("click");
  assert.ok(all(ui.page, n => n.attributes["aria-label"] === "Lemma" && n.textContent === "L090723").length);
  assert.equal(all(ui.page, n => n.attributes["aria-label"] === "Tag").length, 3);
  assert.equal(ui.button("Use"), undefined);
  assert.ok(ui.page.textContent.includes("8 attestations · 100.0%"));
  assert.ok(!ui.page.textContent.includes("% support"));
  assert.ok(all(ui.page, n => n.className === "editing-candidate-structure").every(n => n.open));
  assert.ok(!ui.page.textContent.includes("Source span candidates"));
  await ui.label("Choose N L090723 for paruyama").dispatch("click");
  const lemmaButton = all(ui.page, n => n.attributes["aria-label"] === "Lemma" && n.textContent === "L051724")[0];
  const childId = lemmaButton.attributes["data-editing-key"].slice("lemma:".length);
  assert.equal(ui.label(`Edit Lemma ${childId}`).title, "Edit lemma");
  await ui.label(`Edit Lemma ${childId}`).dispatch("click");
  const lemmaInput = ui.input(`Lemma ${childId}`);
  await type(lemmaInput, "L999"); await ui.button("Undo analysis edit").dispatch("click");
  assert.ok(all(ui.page, n => n.textContent === "L051724").length);
  await type(ui.input(`Form ${childId}`), "paruX"); assert.ok(ui.label("Choose N L090723 for paruyama").disabled);
  assert.equal(ui.input("Transcription 1").value, "paruyama");
  await type(ui.input(`Form ${childId}`), "paru"); assert.ok(!ui.label("Choose N L090723 for paruyama").disabled);
  assert.ok(!ui.page.textContent.includes("xml/trees/") && !ui.page.textContent.includes("evidence-revision"));
  await ui.expand("Script range");
  await ui.button("Fill Script").dispatch("click");
  await ui.button("Save").dispatch("click"); await type(ui.input("Document name"), "Stage3-check"); await ui.button("Confirm Save").dispatch("click");
  const savedAnalysis = clone(disk.get("Stage3-check.syn.json").document), savedText = Object.values(savedAnalysis.texts)[0];
  assert.equal(Object.keys(savedText.nodes).length, 3); assert.equal(savedText.nodes[savedText.roots[0]].form, null);
  assert.equal(savedText.nodes[savedText.roots[0]].annotations.suggestion.status, "accepted");
  assert.ok(Object.values(savedText.nodes).filter(n => !n.children.length).every(n => n.script === "PHON"));
  ui = await session(); await ui.button("Open Text").dispatch("click"); await ui.label("Browse Stage3-check (saved)").dispatch("click");
  await ui.label("Open Untitled Text 1 in Stage3-check, 1").dispatch("click");
  assert.equal(all(ui.page, n => n.attributes["aria-label"] === "Tag").length, 3);
  assert.ok(ui.button("Undo analysis edit").disabled); // History is never saved.
  await ui.button("Analyse").dispatch("click");
  const historicalSuggestion = clone(savedText.nodes[savedText.roots[0]].annotations.suggestion);
  liveEvidence = {revision: "live-revision", candidate: {id: "paruyama", count: 9, support: .9,
    texts: 9, evidence: [{revision: "live-file"}], revision: "live-revision"}};
  await ui.button("8 attestations").dispatch("click");
  assert.equal(attestationRequests.at(-1).form, "paruyama");
  assert.equal(attestationRequests.at(-1).candidate_id, "paruyama");
  assert.ok(ui.page.textContent.includes("9 attestations · 90.0%"));
  liveEvidence = {revision: "gone-revision", candidate: null};
  await ui.button("9 attestations").dispatch("click");
  assert.ok(ui.page.textContent.includes("0 attestations · 0.0%"));
  assert.equal(ui.button("0 attestations"), undefined);
  assert.ok(ui.label("Choose N L090723 for paruyama").disabled);
  assert.ok(ui.page.textContent.includes("No current corpus attestations"));
  await ui.button("Save").dispatch("click");
  const afterLiveSearch = Object.values(disk.get("Stage3-check.syn.json").document.texts)[0];
  assert.deepEqual(afterLiveSearch.nodes[afterLiveSearch.roots[0]].annotations.suggestion, historicalSuggestion);
  liveEvidence = null;
  await type(ui.input("Transcription 1"), "paruyamaX");
  assert.ok(all(ui.page, n => n.textContent.includes("Analyse again to refresh candidates")).length);
  assert.ok(ui.label("Choose N L090723 for paruyama").disabled);
  assert.equal(all(ui.page, n => n.attributes["aria-label"] === "Tag").length, 3);
  // Compact structural rows, material-based Script targets and ordinary range selection.
  const compact = new editing.State(() => `compact-${++identity}`); compact.document.name = "Compact"; compact.addText("Compact.1");
  const line = compact.addPassage("source", "titi papa moro pito ipaku ukwi yuku");
  const node = (form, category = "N", script = null, lemma = "L1") => ({form, category, script, lemma, children: [], parts: [], annotations: {}});
  compact.text.nodes = {r: {...node(null, "CP-FINAL", null, null), children: ["h", "q", "m", "w", "u", "t", "z", "f"]},
    h: {...node(null, "N", null, "L050402"), children: ["a", "b"]},
    a: node("titi", "N", "PHON"), b: node("papa", "N", "LOG"),
    q: {...node(null, "N", null, null), children: ["c", "d"]},
    c: node("moro", "ADJ-STM", null, "L007011"), d: node("pito", "N", null, "L050046"),
    m: {...node("ipaku", "VB-NML", null, "L030199a"), parts: [
      {id: "ipa", form: "ipa", script: "LOG", annotations: {}}, {id: "ku", form: "ku", script: "PHON-ON", annotations: {}}]},
    w: node("ukwi", "WORD", null), u: node("yuku", null, null, null),
    t: node("", "*T*", null, null), z: node("", "NULL", null, null), f: node("", "____", null, null)};
  compact.text.nodes.b.annotations.index = "2";
  compact.text.roots = ["r"]; compact.text.compatibility.original_block_xml = "<block/>";
  compact.text.links.whole = {node: "r", passage: line, part: null, start: 0, end: 29, status: "valid", reason: "",
    evidence: {original: "source", transcription: "titi papa moro pito ipaku ukwi yuku", status: "valid", reason: ""}};
  disk.set("Compact.syn.json", {filename: "Compact.syn.json", revision: "compact-rev", document: clone(compact.document)});
  ui = await session(); await ui.button("Open Text").dispatch("click"); await ui.label("Browse Compact (saved)").dispatch("click"); await ui.label("Open Compact.1 in Compact, 1").dispatch("click");
  await ui.expand("Script range");
  const high = ui.label("Analysis row r");
  assert.equal(all(high, n => n.attributes["aria-label"] === "Form").length, 0);
  assert.equal(all(high, n => n.className === "editing-derived-form").length, 0);
  assert.equal(all(ui.page, n => n.tag === "input" && n.type === "checkbox" && n.attributes["aria-label"]?.startsWith("Select")).length, 0);
  assert.ok(ui.input("Script w") && ui.input("Script u")); assert.equal(ui.input("Script r"), undefined); assert.equal(ui.input("Script m"), undefined);
  assert.equal(ui.input("Script t"), undefined); assert.equal(ui.input("Script f"), undefined);
  for (const id of ["t", "z"]) {
    assert.equal(ui.input(`Lemma ${id}`), undefined); assert.equal(ui.input(`Form ${id}`), undefined);
    assert.equal(all(ui.label(`Analysis row ${id}`), n => n.className === "editing-derived-form").length, 0);
  }
  assert.ok(!ui.page.textContent.includes(";@2"));
  assert.equal(all(ui.label("Analysis row h"), n => n.className === "editing-derived-form")[0].textContent, "titipapa");
  assert.equal(all(ui.label("Analysis row q"), n => n.className === "editing-derived-form")[0].textContent, "moropito");
  assert.equal(all(ui.label("Analysis row q"), n => n.className === "editing-incomplete").length, 0);
  assert.ok(ui.input("Part Script ipa") && ui.input("Part Script ku"));
  assert.equal(ui.button("Dictionary"), undefined); await ui.input("Lemma a").dispatch("click"); assert.equal(dictionaryOpens.at(-1), "L1");
  await ui.input("Lemma a").dispatch("pointerenter"); assert.equal(ui.input("Lemma a").title, "test gloss");
  await ui.label("Analysis row c").dispatch("click"); await ui.label("Analysis row u").dispatch("click", {shiftKey: true});
  assert.equal(ui.input("Script scope").value, "selection"); assert.ok(ui.page.textContent.includes("4 to assign · 2 preserved"));
  await ui.button("Fill Script").dispatch("click");
  assert.equal(ui.input("Script c").value, "PHON"); assert.equal(ui.input("Script u").value, "PHON");
  assert.equal(ui.input("Part Script ipa").value, "LOG"); assert.equal(ui.input("Part Script ku").value, "PHON-ON");
  const partScript = ui.input("Part Script ku"); partScript.value = "NLOG"; await partScript.dispatch("change");
  assert.equal(ui.input("Part Script ku").value, "NLOG"); assert.equal(ui.input("Part Script ipa").value, "LOG");
  assert.equal(ui.input("Part Script ku").tag, "input");
  assert.equal(ui.input("Part Script ku").attributes.list, "editing-script-values");
  const typed = ui.input("Script w"); typed.value = "CUSTOM-SCRIPT"; await typed.dispatch("keydown", {key: "Enter"});
  assert.equal(ui.input("Script w").value, "CUSTOM-SCRIPT");
  await ui.label("Analysis row a").dispatch("click"); await ui.label("Analysis row b").dispatch("click", {ctrlKey: true});
  assert.ok(ui.button("Fill Script").disabled);
  const replace = ui.input("Replace existing Script"); replace.checked = true; await replace.dispatch("change"); await ui.button("Replace Script").dispatch("click");
  assert.equal(ui.input("Script b").value, "PHON"); await ui.button("Undo analysis edit").dispatch("click"); assert.equal(ui.input("Script b").value, "LOG");
  const show = ui.input("Show Script"); show.checked = false; await show.dispatch("change"); assert.equal(ui.input("Script a"), undefined);
  ui.input("Show Script").checked = true; await ui.input("Show Script").dispatch("change"); assert.equal(ui.input("Script a").value, "PHON");
  await type(ui.input("Form a"), "titiX"); assert.equal(ui.input("Transcription 1").value, "titi papa moro pito ipaku ukwi yuku");
  await type(ui.input("Part Form ku"), "kuX");
  assert.ok(all(ui.label("Analysis row m"), n => n.className === "editing-derived-form" && n.textContent === "ipakuX").length);
  await ui.button("Save").dispatch("click");
  const changedText = Object.values(disk.get("Compact.syn.json").document.texts)[0];
  assert.equal(changedText.nodes.m.form, "ipakuX"); assert.equal(changedText.links.whole.status, "unresolved");
  assert.equal(changedText.links.whole.evidence.transcription, "titi papa moro pito ipaku ukwi yuku");
  assert.equal(changedText.annotations.analysis_form_evidence.whole.form, "titipapamoropitoipakuukwiyuku");
  assert.equal(changedText.nodes.q.lemma, null); // Internal lexical absence remains saveable.
  assert.equal(changedText.nodes.u.category, null); assert.equal(changedText.nodes.u.script, "PHON");
  assert.equal(changedText.nodes.b.annotations.index, "2");
  assert.deepEqual(changedText.nodes.t.children, []); assert.equal(changedText.nodes.t.lemma, null);
  // Corpus incompleteness and dictionary-only lookup are distinct, without evidence/debug clutter.
  const choice = (pattern, overrides = {}) => ({id: "attested", pattern, eligible: true, complete: false, default: false,
    count: 1, texts: 1, support: .25, evidence: [], domains: {ordinary: 1, "EN/SM": 0}, ...overrides});
  const leafPattern = (form, category, lemma) => ({form, category, lemma, children: [], annotations: {}});
  const missing = choice(leafPattern("no", "N", "L052548b"));
  const lookup = choice(leafPattern("no", null, "L052548"), {id: "dictionary:L052548", eligible: false,
    count: 0, texts: 0, support: 0, dictionary: {gloss: "baggage", meanings: ["hidden meaning"]}});
  analysisOverride = (text, units) => ({revision: "rev", units, nodes: {}, scripts: ["PHON", "LOG"],
    spans: [{first: 0, last: 1, form: "no", candidates: [missing, lookup]}]});
  ui = await session(); await ui.button("New Text").dispatch("click");
  await type(ui.input("Text Input"), "source\nno"); await ui.button("Preview").dispatch("click");
  await ui.button("Add to Source").dispatch("click"); await ui.button("Analyse").dispatch("click");
  assert.ok(ui.page.textContent.includes("Corpus annotation · lemma absent from dictionary"));
  assert.ok(ui.page.textContent.includes("Dictionary only · tag unresolved"));
  assert.ok(ui.page.textContent.includes("1 attestations · 25.0%"));
  assert.ok(ui.page.textContent.includes("0 attestations · 0.0%"));
  assert.ok(!ui.page.textContent.includes("Incomplete draft suggestion") && !ui.page.textContent.includes("hidden meaning"));
  assert.ok(ui.summary("Script range"));
  assert.equal(ui.button("0 attestations"), undefined);
  await ui.label("Choose unclassified L052548 for no").dispatch("keydown", {key: "Enter"});
  await ui.button("Save").dispatch("click"); await type(ui.input("Document name"), "Dictionary-choice"); await ui.button("Confirm Save").dispatch("click");
  const dictionaryNode = Object.values(Object.values(disk.get("Dictionary-choice.syn.json").document.texts)[0].nodes)[0];
  assert.equal(dictionaryNode.lemma, "L052548"); assert.equal(dictionaryNode.category, null);
  // Multi-unit choices use the same cards, with the existing span operation only.
  const takayuku = choice({category: "VB-ADC", lemma: "L030996a", form: null, annotations: {}, children: [
    leafPattern("taka", "ADJ-STM", "L007005"), leafPattern("yuku", "VB-ADC", "L031840a")]},
    {id: "takayuku", count: 2, texts: 2, support: 1, complete: true, dictionary: {gloss: "go high"}});
  analysisOverride = (text, units) => ({revision: "rev", units, nodes: {}, scripts: ["PHON", "LOG"],
    spans: [...units.map((u, i) => ({first: i, last: i + 1, form: u.form, candidates: []})),
      {first: 0, last: 2, form: "takayuku", candidates: [takayuku]}]});
  ui = await session(); await ui.button("New Text").dispatch("click");
  await type(ui.input("Text Input"), "source\ntaka yuku"); await ui.button("Preview").dispatch("click");
  await ui.button("Add to Source").dispatch("click"); await ui.button("Analyse").dispatch("click");
  assert.ok(ui.summary("Candidates: taka yuku"));
  await ui.label("Choose VB-ADC L030996a for taka yuku").dispatch("click");
  assert.equal(ui.summary("Candidates: taka yuku"), undefined); // Existing parent now owns Candidates.
  assert.equal(all(ui.page, n => n.attributes["aria-label"] === "Tag").length, 3);
  await ui.button("Save").dispatch("click"); await type(ui.input("Document name"), "Span-choice"); await ui.button("Confirm Save").dispatch("click");
  const spanText = Object.values(disk.get("Span-choice.syn.json").document.texts)[0];
  assert.equal(spanText.roots.length, 1); assert.deepEqual(spanText.nodes[spanText.roots[0]].annotations.input_span, {first: 0, last: 2});
  assert.ok(Object.values(spanText.links).every(l => l.status === "valid"));
  ui = await session(); await ui.button("Open Text").dispatch("click"); await ui.label("Browse KK (corpus)").dispatch("click");
  await ui.label("Open KK.67 in KK, 1").dispatch("click"); await ui.button("Analyse").dispatch("click");
  assert.equal(ui.summary("Candidates: taka yuku"), undefined); // No invented imported input_span mapping.
  // Click-toggle selection is additive without modifiers; Candidates collapse on opening, never on mouse-leave.
  analysisOverride = (text, units) => ({revision: "rev", units, nodes: {}, scripts: ["PHON", "LOG"],
    spans: units.map((u, i) => ({first: i, last: i + 1, form: u.form, candidates: [clone(missing)]}))});
  ui = await session(); await ui.button("New Text").dispatch("click");
  await type(ui.input("Text Input"), "source\nno no no"); await ui.button("Preview").dispatch("click");
  await ui.button("Add to Source").dispatch("click"); await ui.button("Analyse").dispatch("click");
  const nodeRows = all(ui.page, n => n.attributes["data-editing-key"]?.startsWith("node:"));
  await nodeRows[0].dispatch("click"); await nodeRows[1].dispatch("click"); await nodeRows[2].dispatch("click");
  assert.ok(nodeRows.every(n => n.attributes["aria-selected"] === "true"));
  await nodeRows[1].dispatch("click");
  assert.deepEqual(nodeRows.map(n => n.attributes["aria-selected"]), ["true", "false", "true"]);
  assert.equal(all(ui.page, n => n.tag === "details" && n.children[0]?.textContent === "Script range").length, 1);
  assert.ok(!all(ui.page, n => n.title?.includes("id-") || n.attributes["aria-label"]?.includes("id-")).length);
  const panels = all(ui.page, n => n.className === "editing-candidates");
  assert.ok(ui.input("Auto-collapse Candidates").checked);
  panels[0].open = true; await panels[0].dispatch("toggle");
  panels[1].open = true; await panels[1].dispatch("toggle");
  assert.ok(!panels[0].open && panels[1].open);
  await panels[1].dispatch("mouseleave"); assert.ok(panels[1].open);
  ui.input("Auto-collapse Candidates").checked = false; await ui.input("Auto-collapse Candidates").dispatch("change");
  panels[0].open = true; await panels[0].dispatch("toggle");
  assert.ok(panels[0].open && panels[1].open);
  panels[0].open = false; await panels[0].dispatch("toggle"); assert.ok(!panels[0].open && panels[1].open);
  ui.input("Auto-collapse Candidates").checked = true; await ui.input("Auto-collapse Candidates").dispatch("change");
  panels[2].open = true; await panels[2].dispatch("toggle"); assert.ok(!panels[1].open && panels[2].open);
  await all(panels[2], n => n.className === "editing-candidate")[0].dispatch("click");
  assert.ok(all(ui.page, n => n.className === "editing-candidates").every(n => !n.open));
  console.log("Stage 1–3 UI flows, explicit Analyse/correction, script batches, saved identities and stale-source preservation passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
