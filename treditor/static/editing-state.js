/* Shared occurrence records; syntax contains references, never lexical copies. */
(function (root) {
  "use strict";
  function newDocument() {
    return {schema_version: 1, text_id: "", header: "", segments: {}, segment_order: [],
      occurrences: {}, syntax_nodes: {}, syntax_roots: [], composition_groups: {},
      coverage: [], compatibility: {}, annotations: {}};
  }
  class State {
    constructor(makeId = () => root.crypto.randomUUID()) {
      this.makeId = makeId;
      this.reset();
    }
    reset() {
      this.document = newDocument(); this.filename = "draft.syn.json";
      this.savedFilename = null; this.revision = null; this.dirty = false;
    }
    open(document, filename, revision = null) {
      this.document = JSON.parse(JSON.stringify(document)); this.filename = filename;
      this.savedFilename = revision === null ? null : filename;
      this.revision = revision; this.dirty = revision === null;
    }
    addSegment() {
      const id = this.makeId();
      this.document.segments[id] = {text: "", occurrences: [], annotations: {}};
      this.document.segment_order.push(id); this.dirty = true;
      return id;
    }
    addComponent(segmentId, form = "") {
      const segment = this.document.segments[segmentId];
      if (!segment) throw new Error("Select a source segment first.");
      const occurrence = this.makeId(), node = this.makeId();
      this.document.occurrences[occurrence] = {form, lemma: null, script: null, parts: [], annotations: {}};
      segment.occurrences.push(occurrence);
      this.document.syntax_nodes[node] = {category: null, occurrence, annotations: {}};
      this.document.syntax_roots.push(node); this.dirty = true;
      return occurrence;
    }
    editOccurrence(id, field, value) {
      const occurrence = this.document.occurrences[id];
      if (!occurrence || !["form", "lemma", "script"].includes(field)) throw new Error("Invalid lexical edit.");
      if (occurrence.parts.length && ["form", "script"].includes(field)) throw new Error("Multipart form/script editing is not available in this prototype.");
      occurrence[field] = field === "form" ? value : (value || null); this.dirty = true;
    }
    terminals() {
      // Source order is display order, not identity. Include unplaced records.
      const ids = [...new Set([...this.document.segment_order.flatMap(id =>
        this.document.segments[id].occurrences), ...Object.keys(this.document.occurrences)])];
      const nodes = new Map(Object.entries(this.document.syntax_nodes)
        .filter(([, node]) => node.occurrence).map(([id, node]) => [node.occurrence, {id, node}]));
      return ids.map(id => ({id, occurrence: this.document.occurrences[id], syntax: nodes.get(id) || null}));
    }
    saved(filename, revision) {
      this.filename = filename; this.savedFilename = filename;
      this.revision = revision; this.dirty = false;
    }
    expectedRevision() { return this.filename === this.savedFilename ? this.revision : null; }
  }
  const api = {State, newDocument};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.COJEditing = api;
})(globalThis);
