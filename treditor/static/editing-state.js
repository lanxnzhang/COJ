/* Document state and entered input. Source edits never regenerate analysis. */
(function (root) {
  "use strict";
  const clone = value => JSON.parse(JSON.stringify(value));
  const white = /[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/u;
  const compact = value => Array.from(value).filter(c => !white.test(c)).join("");
  function units(value) {
    const result = []; let start = null;
    Array.from(value).forEach((c, i) => {
      if (white.test(c)) { if (start !== null) result.push({start, end: i}); start = null; }
      else if (start === null) start = i;
    });
    if (start !== null) result.push({start, end: Array.from(value).length});
    return result;
  }
  function newDocument(makeId = () => root.crypto.randomUUID()) {
    return {schema_version: 2, id: makeId(), name: "", texts: {}, text_order: [], compatibility: {}, annotations: {}};
  }
  function newText(textId = "") {
    return {text_id: textId, passages: {}, passage_order: [], nodes: {}, roots: [], links: {},
      historical_header: null, compatibility: {}, annotations: {}};
  }
  function newPassage(original = "", transcription = "") {
    return {original, transcription, units: units(transcription), annotations: {}};
  }
  function filenameForDocument(name) {
    const value = name.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(value)
      || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(value)) {
      throw new Error("Use a Document storage name with letters, numbers, dots, underscores or hyphens.");
    }
    return `${value}.syn.json`;
  }
  function linkMaterial(text, link) {
    if (link.part !== null) return text.nodes[link.node].parts.find(p => p.id === link.part).form;
    function material(id) { const n = text.nodes[id]; return n.children.length ? n.children.map(material).join("") : n.form || ""; }
    return material(link.node);
  }
  function reconcile(text) {
    Object.entries(text.links).forEach(([id, link]) => {
      const passage = text.passages[link.passage], evidence = link.evidence;
      let reason = "";
      if (!passage) reason = "Source passage removed; analysis retained.";
      else if (passage.original !== evidence.original) reason = "Original text changed; alignment needs review.";
      else if (compact(passage.transcription) !== compact(evidence.transcription)) reason = "Transcription changed; analysis needs review.";
      link.status = reason ? "unresolved" : evidence.status;
      link.reason = reason || evidence.reason;
      const analysis = text.annotations.analysis_form_evidence?.[id];
      if (analysis && compact(linkMaterial(text, link)) !== compact(analysis.form)) {
        link.status = "unresolved";
        link.reason = [link.reason, "Analysed form changed; input-to-analysis alignment needs review."].filter(Boolean).join("; ");
      }
    });
  }
  function parsePairs(value) {
    const lines = value.replace(/\r/g, "").split("\n").filter(line => line.trim());
    if (!lines.length || lines.length % 2) throw new Error("Paste pairs: original text, then transcription on the next line.");
    const pairs = []; let numbered = null;
    for (let i = 0; i < lines.length; i += 2) {
      const match = lines[i].match(/^\s*(\d+)[ \t]+(.+)$/u);
      if (numbered === null) numbered = !!match;
      if (numbered !== !!match) throw new Error("Use numbering consistently for all pasted passages.");
      if (match && Number(match[1]) !== pairs.length + 1) throw new Error("Pasted passage numbers must start at 1 and continue in order.");
      pairs.push({original: match ? match[2] : lines[i].trim(), transcription: lines[i + 1].trim()});
    }
    return pairs;
  }
  class State {
    constructor(makeId = () => root.crypto.randomUUID()) { this.makeId = makeId; this.reset(); }
    reset() {
      root.COJAnalysis?.clearHistory(this);
      this.document = newDocument(this.makeId); this.activeText = null; this.filename = null;
      this.savedFilename = null; this.revision = null; this.dirty = false; this.removal = null;
    }
    open(document, filename = null, revision = null) {
      root.COJAnalysis?.clearHistory(this);
      this.document = clone(document); this.filename = filename; this.savedFilename = revision ? filename : null;
      this.revision = revision; this.activeText = document.text_order[0] || null; this.dirty = !revision; this.removal = null;
    }
    get text() { return this.document.texts[this.activeText] || null; }
    markDirty() { this.dirty = true; this.removal = null; root.COJAnalysis?.clearHistory(this); }
    addText(textId = "") {
      const id = this.makeId(); this.document.texts[id] = newText(textId);
      this.document.text_order.push(id); this.activeText = id; this.markDirty(); return id;
    }
    selectText(id) { if (!this.document.texts[id]) throw new Error("Text not found."); this.activeText = id; }
    addPassage(original = "", transcription = "", position = this.text?.passage_order.length) {
      if (!this.text) throw new Error("Create or choose a Text first.");
      if (!Number.isInteger(position) || position < 0 || position > this.text.passage_order.length) throw new Error("Invalid insertion position.");
      const id = this.makeId(); this.text.passages[id] = newPassage(original, transcription);
      this.text.passage_order.splice(position, 0, id); this.markDirty(); return id;
    }
    editPassage(id, field, value) {
      if (!["original", "transcription"].includes(field) || !this.text?.passages[id]) throw new Error("Passage not found.");
      const passage = this.text.passages[id]; passage[field] = value;
      passage.units = units(passage.transcription); reconcile(this.text); this.markDirty();
    }
    removePassage(id) {
      if (!this.text?.passages[id]) throw new Error("Passage not found.");
      root.COJAnalysis?.clearHistory(this);
      this.removal = {document: clone(this.document), activeText: this.activeText};
      delete this.text.passages[id]; this.text.passage_order = this.text.passage_order.filter(key => key !== id);
      reconcile(this.text); this.dirty = true;
    }
    undoRemoval() {
      if (!this.removal) return;
      root.COJAnalysis?.clearHistory(this);
      this.document = this.removal.document; this.activeText = this.removal.activeText;
      this.removal = null; this.dirty = true;
    }
    appendPairs(pairs) { pairs.forEach(pair => this.addPassage(pair.original, pair.transcription)); }
    replacePairs(pairs) {
      if (!this.text) throw new Error("Choose a Text first.");
      const snapshot = {document: clone(this.document), activeText: this.activeText, kind: "replacement"};
      this.text.passages = {}; this.text.passage_order = [];
      this.appendPairs(pairs); reconcile(this.text);
      this.removal = snapshot; this.dirty = true;
    }
    unresolved() {
      if (!this.text) return [];
      const output = [];
      const grouped = new Set();
      Object.values(this.text.links).filter(link => link.status === "unresolved").forEach(link => {
        const index = this.text.passage_order.indexOf(link.passage);
        const label = index < 0 ? "Removed passage" : `Passage ${index + 1}`;
        const key = `${label}: ${link.reason}`;
        if (!grouped.has(key)) output.push(key);
        grouped.add(key);
      });
      output.push(...(this.text.compatibility.issues || []));
      return output;
    }
    saved(filename, revision) { this.filename = filename; this.savedFilename = filename; this.revision = revision; this.dirty = false; }
    expectedRevision() { return this.filename === this.savedFilename ? this.revision : null; }
  }
  // Session-only navigation and scratch input; never serialized into .syn.json.
  class Session {
    constructor(makeId = () => root.crypto.randomUUID()) { this.makeId = makeId; this.drafts = []; this.active = null; }
    get current() { return this.drafts.find(d => d.key === this.active) || null; }
    create(standalone = true) {
      const state = new State(this.makeId); state.addText();
      const draft = {key: this.makeId(), state, standalone, origin: null, inputs: new Map()};
      this.drafts.push(draft); this.active = draft.key; return draft;
    }
    open(data, origin) {
      let draft = this.drafts.find(d => d.origin === origin);
      if (!draft) {
        const state = new State(this.makeId); state.open(data.document, data.filename, data.revision);
        draft = {key: this.makeId(), state, standalone: false, origin, inputs: new Map()}; this.drafts.push(draft);
      }
      this.active = draft.key; return draft;
    }
    select(key, textKey) {
      const draft = this.drafts.find(d => d.key === key); if (!draft) throw new Error("Draft not found.");
      if (textKey) draft.state.selectText(textKey); this.active = key; return draft;
    }
    input(draft = this.current, textKey = draft?.state.activeText) {
      if (!draft || !textKey) return null;
      if (!draft.inputs.has(textKey)) draft.inputs.set(textKey, {value: "", preview: null, scrollTop: 0, replacement: false});
      return draft.inputs.get(textKey);
    }
    get hasUnsaved() { return this.drafts.some(d => d.state.dirty || [...d.inputs.values()].some(i => i.value.length)); }
  }
  const api = {State, Session, newDocument, newText, newPassage, filenameForDocument, parsePairs, units, compact, reconcile, linkMaterial};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.COJEditing = api;
})(typeof window !== "undefined" ? window : globalThis);
