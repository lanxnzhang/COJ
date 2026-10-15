"use strict";
// Exercise the existing Search renderer and the live candidate navigation bridge.
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.value = ""; this.checked = false; this.classList = {toggle() {}}; }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.append(item); }
  set innerHTML(value) { this.children = []; }
  addEventListener(event, callback) { this.events[event] = callback; }
}
const elements = new Map(), calls = [], updates = [], opened = [], errors = [], highlights = [];
const $ = id => { if (!elements.has(id)) elements.set(id, new Element("div")); return elements.get(id); };
let response;
const hit = {source: "trees", document_id: "A", sentence_id: "duplicate", block_ordinal: 3,
  source_revision: "file-r1", label: "A", matching_fields: ["syntax_tree"], match_count: 2,
  text_segments: [{transcription: "a a", kanji: "source"}], display_roots: [],
  highlights: {transcription: [{segment: 0, start: 0, end: 3}]}, tree_context: {node_ids: ["0.0", "0.1"]}};
const context = vm.createContext({$, document: {createElement: tag => new Element(tag)},
  corpusSearchState: {mode: "text", query: "", perPage: 10}, attestationSearch: null,
  showEditorPage() {}, clearError() {}, showError: error => errors.push(error.message),
  corpusFieldLabel: value => value, findDocument: (source, id) => ({source, document_id: id, label: id}),
  appendSearchResultText: (...args) => highlights.push(args),
  selectDocument: async (...args) => opened.push(args),
  performTgrepSearch() { throw Error("Unexpected TGrep approximation"); },
  performCorpusSearch() { throw Error("Unexpected lemma approximation"); },
  apiFetch: async (url, options) => {
    calls.push({url, body: options?.body && JSON.parse(options.body)});
    if (url === "/api/authoring/attestations") return structuredClone(response);
    return {roots: [], stats: {leaves: 2}};
  }});
const source = fs.readFileSync(path.join(__dirname, "../static/app.js"), "utf8");
vm.runInContext(source.slice(source.indexOf("function searchCountSummary("), source.indexOf("function updateSearchResultDisplay(")), context);
vm.runInContext(source.slice(source.indexOf("function renderCorpusSearchResults("), source.indexOf("async function performCorpusSearch(")), context);
vm.runInContext(source.slice(source.indexOf("function performActiveSearch("), source.indexOf('$("search-mode-text").addEventListener')), context);
(async () => {
  response = {query: "a", search_type: "attestations", revision: "r1", total: 12, text_total: 12,
    occurrence_total: 24, page: 1, pages: 2, per_page: 10, results: [hit], candidate: {count: 24}};
  await context.openCandidateAttestations({form: "a", candidate_id: "exact-pattern", text_id: ""}, p => updates.push(p));
  assert.equal($("search-results-title").textContent, "Current attestations: a");
  assert.equal($("search-result-count").textContent, "24 search results · 12 texts");
  assert.equal(JSON.stringify(highlights[0][4]), JSON.stringify(hit.highlights.transcription));
  assert.equal($("search-results").children[0].className, "corpus-search-result");
  await $("search-results").children[0].events.click();
  assert.ok(calls.at(-1).url.endsWith("/duplicate/tree?block=3&revision=file-r1"));
  assert.deepEqual(opened[0][3], hit.tree_context);
  assert.equal(opened[0][4].passage.sentence_id, 'duplicate');
  response = {...response, revision: "r2", refreshed: true, occurrence_total: 25, candidate: {count: 25}};
  await context.performActiveSearch(2);
  assert.equal(calls.at(-1).body.revision, "r1");
  assert.equal(calls.at(-1).body.page, 2);
  assert.equal(updates.at(-1).candidate.count, 25);
  assert.ok($("search-results-message").textContent.includes("page 1"));
  response = {...response, candidate: null, results: [], total: 0, text_total: 0, occurrence_total: 0, pages: 0};
  await context.performActiveSearch(1);
  assert.equal($("search-results").children.length, 0);
  assert.equal($("search-result-count").textContent, "0 search results · 0 texts");
  assert.equal(errors.length, 0);
  console.log("Exact live candidate Search uses existing cards, context, ordinal navigation and refreshed pagination.");
})().catch(error => { console.error(error); process.exitCode = 1; });
