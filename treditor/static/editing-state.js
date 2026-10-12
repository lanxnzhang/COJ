/* Shared occurrence records; syntax contains references, never lexical copies. */
(function (root) {
  "use strict";
  function newDocument() {
    return {schema_version: 1, text_id: "", header: "", segments: {}, segment_order: [],
      occurrences: {}, syntax_nodes: {}, syntax_roots: [], composition_groups: {},
      coverage: [], compatibility: {}, annotations: {}};
  }
  function filenameForText(textId) {
    const id = textId.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(id)
      || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(id)) {
      throw new Error("Enter a Text ID using letters, numbers, dots, underscores or hyphens, such as KK.67.");
    }
    return `${id}.syn.json`;
  }
  class State {
    constructor(makeId = () => root.crypto.randomUUID()) {
      this.makeId = makeId;
      this.reset();
    }
    reset() {
      this.document = newDocument(); this.filename = "draft.syn.json";
      this.savedFilename = null; this.revision = null; this.dirty = false;
      this.removal = null;
    }
    open(document, filename, revision = null) {
      this.document = JSON.parse(JSON.stringify(document)); this.filename = filename;
      this.savedFilename = revision === null ? null : filename;
      this.revision = revision; this.dirty = revision === null;
      this.removal = null;
    }
    markDirty() { this.dirty = true; this.removal = null; }
    addSegment() {
      const id = this.makeId();
      this.document.segments[id] = {text: "", occurrences: [], annotations: {}};
      this.document.segment_order.push(id); this.markDirty();
      return id;
    }
    addComponent(segmentId, form = "") {
      const segment = this.document.segments[segmentId];
      if (!segment) throw new Error("Select a source segment first.");
      const occurrence = this.makeId(), node = this.makeId();
      this.document.occurrences[occurrence] = {form, lemma: null, script: null, parts: [], annotations: {}};
      segment.occurrences.push(occurrence);
      this.document.syntax_nodes[node] = {category: null, occurrence, annotations: {}};
      this.document.syntax_roots.push(node); this.markDirty();
      return occurrence;
    }
    editOccurrence(id, field, value) {
      const occurrence = this.document.occurrences[id];
      if (!occurrence || !["form", "lemma", "script"].includes(field)) throw new Error("Invalid lexical edit.");
      if (occurrence.parts.length && ["form", "script"].includes(field)) throw new Error("Multipart form/script editing is not available in this prototype.");
      occurrence[field] = field === "form" ? value : (value || null); this.markDirty();
    }
    checkRemoval(segmentId, refs) {
      for (const ref of refs) {
        const elsewhere = Object.entries(this.document.segments).some(([id, segment]) => id !== segmentId && segment.occurrences.includes(ref));
        if (!elsewhere && Object.values(this.document.composition_groups).some(group =>
          group.children.some(child => child.kind === "occurrence" && child.id === ref))) {
          throw new Error("This component is used in a lexical analysis. Its links must be reviewed before removal.");
        }
      }
    }
    detach(segmentId, refs) {
      const segment = this.document.segments[segmentId];
      segment.occurrences = segment.occurrences.filter(ref => !refs.includes(ref));
      this.document.coverage = this.document.coverage.filter(item => item.segment !== segmentId || !refs.includes(item.occurrence));
      for (const ref of refs) {
        if (Object.values(this.document.segments).some(other => other.occurrences.includes(ref))) continue;
        const removedNodes = Object.entries(this.document.syntax_nodes)
          .filter(([, node]) => node.occurrence === ref).map(([id]) => id);
        removedNodes.forEach(id => delete this.document.syntax_nodes[id]);
        this.document.syntax_roots = this.document.syntax_roots.filter(id => !removedNodes.includes(id));
        Object.values(this.document.syntax_nodes).forEach(node => {
          if (node.children) node.children = node.children.filter(id => !removedNodes.includes(id));
        });
        delete this.document.occurrences[ref];
        this.document.coverage = this.document.coverage.filter(item => item.occurrence !== ref);
      }
    }
    removeComponent(segmentId, ref) {
      if (!this.document.segments[segmentId]?.occurrences.includes(ref)) throw new Error("Component not found.");
      this.checkRemoval(segmentId, [ref]);
      this.removal = JSON.parse(JSON.stringify(this.document));
      this.detach(segmentId, [ref]); this.dirty = true;
    }
    removeSegment(segmentId) {
      const segment = this.document.segments[segmentId];
      if (!segment) throw new Error("Segment not found.");
      this.checkRemoval(segmentId, segment.occurrences);
      this.removal = JSON.parse(JSON.stringify(this.document));
      this.detach(segmentId, [...segment.occurrences]);
      delete this.document.segments[segmentId];
      this.document.segment_order = this.document.segment_order.filter(id => id !== segmentId);
      this.dirty = true;
    }
    undoRemoval() {
      if (this.removal) { this.document = this.removal; this.removal = null; this.dirty = true; }
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
  const api = {State, newDocument, filenameForText};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.COJEditing = api;
})(globalThis);
