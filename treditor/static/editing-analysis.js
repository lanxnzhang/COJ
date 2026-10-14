/* Complete-model Stage 3 commands; history is session-only. */
(function (root) {
  "use strict";
  const clone = x => JSON.parse(JSON.stringify(x)), histories = new WeakMap();
  const material = (t, id) => t.nodes[id].children.length ? t.nodes[id].children.map(c => material(t, c)).join("") : t.nodes[id].form || "";
  const sourceKey = t => JSON.stringify([t.text_id, t.passage_order, t.passages]);
  function history(s) { if (!histories.has(s)) histories.set(s, {undo: [], redo: []}); return histories.get(s); }
  function transact(s, action) {
    const before = clone(s.document);
    try { action(); } catch (e) { s.document = before; throw e; }
    if (JSON.stringify(before) !== JSON.stringify(s.document)) { const h = history(s); h.undo.push(before); h.redo = []; s.dirty = true; s.removal = null; }
  }
  function undo(s, redo = false) {
    const h = history(s), from = redo ? h.redo : h.undo, to = redo ? h.undo : h.redo;
    if (from.length) { to.push(clone(s.document)); s.document = from.pop(); s.dirty = true; s.removal = null; }
  }
  function check(s, p) {
    if (p.source !== sourceKey(s.text)) throw new Error("Source or Text identity changed. Invoke Analyse again.");
    if (p.material !== undefined && p.material !== s.text.roots.map(id => material(s.text, id)).join("")) throw new Error("Analysed Form changed. Invoke Analyse again.");
  }
  const provenance = (c, revision) => ({candidate: c.id, revision, count: c.count, texts: c.texts,
    support: c.support, domains: c.domains, evidence: clone(c.evidence), status: "suggested"});
  function instantiate(s, p, c, revision, retained = null) {
    const id = retained || s.makeId();
    s.text.nodes[id] = {category: p.category, lemma: p.lemma, form: p.form, children: [], script: null, parts: [], annotations: clone(p.annotations || {})};
    if (c) s.text.nodes[id].annotations.suggestion = provenance(c, revision);
    s.text.nodes[id].children = p.children.map(child => instantiate(s, child, null, revision)); return id;
  }
  function initial(s, p) {
    check(s, p); if (Object.keys(s.text.nodes).length) return;
    transact(s, () => {
      for (let i = 0; i < p.units.length;) {
        const span = p.spans.filter(x => x.first === i && x.candidates.some(c => c.default)).sort((a, b) => b.last - a.last)[0]
          || p.spans.find(x => x.first === i && x.last === i + 1), c = span.candidates.find(c => c.default);
        const id = instantiate(s, c?.pattern || {category: null, lemma: null, form: span.form, children: [], annotations: {}}, c, p.revision);
        s.text.roots.push(id); s.text.nodes[id].annotations.input_span = {first: span.first, last: span.last};
        for (const u of p.units.slice(span.first, span.last)) {
          const passage = s.text.passages[u.passage];
          s.text.links[s.makeId()] = {passage: u.passage, node: id, part: null, start: u.start, end: u.end, status: "valid", reason: "",
            evidence: {original: passage.original, transcription: passage.transcription, status: "valid", reason: ""}};
        }
        i = span.last;
      }
    });
  }
  function descendants(t, id) { return [id, ...t.nodes[id].children.flatMap(c => descendants(t, c))]; }
  function leaves(t, ids) { return ids.flatMap(id => t.nodes[id].children.length ? leaves(t, t.nodes[id].children) : [id]); }
  function unitsWithin(t, ids) {
    let offset = 0;
    return leaves(t, ids).flatMap(id => {
      const n = t.nodes[id], us = n.parts.length ? n.parts.map(p => ({...p, node: id, part: p.id}))
        : [{form: n.form || "", script: n.script, annotations: {}, node: id, part: null}];
      return us.map(u => { const start = offset; offset += Array.from(u.form).length; return {...u, start, end: offset}; });
    });
  }
  function replace(s, ids, c, revision) {
    const t = s.text, old = ids.flatMap(id => descendants(t, id)), set = new Set(old);
    if (!c.eligible && !c.id.startsWith("dictionary:")) throw new Error("Unsupported evidence can be inspected but cannot be instantiated automatically.");
    const yieldOf = p => p.children.length ? p.children.map(yieldOf).join("") : p.form || "";
    if (ids.map(id => material(t, id)).join("") !== yieldOf(c.pattern)) throw new Error("Candidate material differs; existing analysis was preserved.");
    if (ids.some(id => t.nodes[id].children.length) && !c.pattern.children.length) throw new Error("Whole-refinement withdrawal is deferred; use session undo for recent refinement.");
    function matches(id, pattern) {
      const n = t.nodes[id];
      return n.category === pattern.category && n.lemma === pattern.lemma && n.form === pattern.form
        && Object.entries(pattern.annotations || {}).every(([k, v]) => n.annotations[k] === v)
        && n.children.length === pattern.children.length && n.children.every((child, i) => matches(child, pattern.children[i]));
    }
    if (ids.length === 1 && matches(ids[0], c.pattern)) {
      t.nodes[ids[0]].annotations.suggestion = {...provenance(c, revision), status: "accepted"};
      return ids[0];
    }
    const us = unitsWithin(t, ids), retained = ids[0], prior = clone(t.nodes[retained]);
    const removedIdentities = new Set([...old.slice(1), ...us.map(u => u.part).filter(Boolean)]);
    function mentionsIdentity(value) {
      if (typeof value === "string") return removedIdentities.has(value);
      if (value && typeof value === "object") return Object.values(value).some(mentionsIdentity);
      return false;
    }
    if (mentionsIdentity(s.document.annotations) || mentionsIdentity(t.annotations)
      || Object.entries(t.nodes).some(([id, n]) => !set.has(id) && (mentionsIdentity(n.annotations) || n.parts.some(p => mentionsIdentity(p.annotations)))))
      throw new Error("An additional annotation may reference affected identities. Resolve its impact explicitly; existing analysis was preserved.");
    if (old.some(id => Object.keys(t.nodes[id].annotations).some(k => !["index", "inferred_index", "raw_tag", "suggestion", "input_span", "owns_form"].includes(k))))
      throw new Error("Additional annotations need transfer review; existing analysis was preserved.");
    const links = Object.entries(t.links).filter(([, l]) => set.has(l.node));
    instantiate(s, c.pattern, c, revision, retained); t.nodes[retained].annotations = {...prior.annotations, ...t.nodes[retained].annotations};
    if (t.nodes[retained].children.length) delete t.nodes[retained].annotations.owns_form;
    let position = 0; const destinations = [];
    for (const nid of leaves(t, [retained])) {
      const n = t.nodes[nid], start = position, end = start + Array.from(n.form || "").length; position = end;
      const inside = us.filter(u => u.start >= start && u.end <= end);
      const crossing = us.filter(u => u.start < end && u.end > start && !(u.start >= start && u.end <= end));
      if (crossing.some(u => u.script || u.part)) throw new Error("Refinement crosses writing boundaries. Script redistribution is unspecified; existing analysis was preserved.");
      if (inside.length === 1 && inside[0].start === start && inside[0].end === end) {
        n.script = inside[0].script;
        Object.assign(n.annotations, clone(inside[0].annotations));
      }
      else if (inside.length && inside.reduce((sum, u) => sum + Array.from(u.form).length, 0) === end - start && inside.some(u => u.script || u.part))
        n.parts = inside.map(u => ({id: u.part || s.makeId(), form: u.form, script: u.script, annotations: clone(u.annotations)}));
      for (const u of inside) destinations.push({old: u, node: nid, part: n.parts.find(p => p.id === u.part)?.id || null});
    }
    for (const [lid, l] of links) {
      if (ids.includes(l.node) && !l.part) { l.node = retained; continue; }
      const d = destinations.find(d => d.old.node === l.node && d.old.part === l.part);
      if (!d) throw new Error("An alignment cannot be safely retargeted; existing analysis was preserved.");
      t.links[lid] = {...l, node: d.node, part: d.part};
    }
    for (const id of old) if (id !== retained) delete t.nodes[id];
    if (ids.length > 1) t.roots = t.roots.filter(id => !ids.slice(1).includes(id));
    t.nodes[retained].annotations.suggestion.status = "accepted"; return retained;
  }
  function chooseNode(s, p, id, c) { check(s, p); if (!s.text.nodes[id]) throw new Error("Node changed; invoke Analyse again."); transact(s, () => replace(s, [id], c, p.revision)); }
  function chooseSpan(s, p, span, c) {
    check(s, p);
    const ids = s.text.roots.filter(id => { const r = s.text.nodes[id].annotations.input_span; return r && r.first >= span.first && r.last <= span.last; });
    if (!ids.length || s.text.nodes[ids[0]].annotations.input_span.first !== span.first || s.text.nodes[ids.at(-1)].annotations.input_span.last !== span.last)
      throw new Error("Span overlaps existing analysis. Choose candidates on its current node.");
    transact(s, () => { const id = replace(s, ids, c, p.revision); s.text.nodes[id].annotations.input_span = {first: span.first, last: span.last}; });
  }
  function edit(s, id, field, value) {
    if (!["lemma", "category"].includes(field)) throw new Error("Unsupported annotation field.");
    transact(s, () => { s.text.nodes[id][field] = value || null;
      if (s.text.nodes[id].annotations.suggestion) s.text.nodes[id].annotations.suggestion.status = "corrected"; });
  }
  function scriptTargets(t, scope = {}) {
    let ids = [...(scope.nodes || (scope.parts ? [] : t.roots)), ...(scope.parts || []).map(p => p.node)];
    if (scope.passage) ids = Object.values(t.links).filter(l => l.passage === scope.passage && l.status === "valid").map(l => l.node);
    const targets = new Map();
    for (const id of leaves(t, ids)) {
      const n = t.nodes[id];
      if (n.parts.length) n.parts.filter(p => root.COJEditing.compact(p.form)).forEach(p => targets.set(p.id, {node: id, part: p.id, form: p.form, script: p.script}));
      else if (n.form && root.COJEditing.compact(n.form)) targets.set(id, {node: id, part: null, form: n.form, script: n.script});
    }
    if (scope.parts) for (const [key, target] of targets) {
      const covered = (scope.nodes || []).some(id => descendants(t, id).includes(target.node));
      if (!covered && !scope.parts.some(p => p.node === target.node && p.part === target.part)) targets.delete(key);
    }
    if (scope.passage) for (const [key, target] of targets) {
      const exact = Object.values(t.links).filter(l => l.node === target.node && l.part === target.part);
      const linked = exact.length ? exact : Object.values(t.links).filter(l =>
        l.part === null && (l.node === target.node || descendants(t, l.node).includes(target.node)));
      if (linked.some(l => l.status !== "valid" || l.passage !== scope.passage)) targets.delete(key);
      if (!linked.length) targets.delete(key);
    }
    return [...targets.values()];
  }
  function batch(s, targets, value, override = false) {
    transact(s, () => targets.forEach(t => { const n = s.text.nodes[t.node], u = t.part ? n.parts.find(p => p.id === t.part) : n;
      if (u && (override || !u.script)) u.script = value; }));
  }
  function editForm(s, id, value, part = null) {
    transact(s, () => {
      const n = s.text.nodes[id];
      if (n.children.length || (part === null && n.parts.length)) throw new Error("Edit owned terminal material or its writing parts, not a derived form.");
      const unit = part === null ? n : n.parts.find(p => p.id === part);
      if (!unit) throw new Error("Writing part not found.");
      if (unit.form === value) return;
      for (const [lid, link] of Object.entries(s.text.links)) {
        if (!descendants(s.text, link.node).includes(id) || (link.part !== null && link.part !== part)) continue;
        s.text.annotations.analysis_form_evidence ||= {};
        s.text.annotations.analysis_form_evidence[lid] ||= {form: root.COJEditing.linkMaterial(s.text, link)};
      }
      unit.form = value;
      if (part === null) n.annotations.owns_form = true;
      if (part !== null) n.form = n.parts.map(p => p.form).join("");
      root.COJEditing.reconcile(s.text);
    });
  }
  function editScript(s, id, value, part = null) {
    const targets = scriptTargets(s.text, part === null ? {nodes: [id]} : {nodes: [], parts: [{node: id, part}]});
    if (targets.length !== 1 || targets[0].node !== id || targets[0].part !== part) throw new Error("Script belongs to a form-bearing terminal or writing part.");
    batch(s, targets, value || null, true);
  }
  function selectRows(selection, rows, key, event = {}) {
    const index = rows.findIndex(r => r.key === key), anchor = rows.findIndex(r => r.key === selection.anchor);
    if (index < 0) return;
    const extend = event.shiftKey && anchor >= 0, additive = event.ctrlKey || event.metaKey;
    if (!additive) { selection.selected.clear(); selection.selectedParts.clear(); }
    const choices = extend ? rows.slice(Math.min(index, anchor), Math.max(index, anchor) + 1) : [rows[index]];
    for (const r of choices) {
      if (r.part) { if (additive && !extend && selection.selectedParts.has(r.part)) selection.selectedParts.delete(r.part);
        else selection.selectedParts.set(r.part, {node: r.id, part: r.part}); }
      else if (additive && !extend && selection.selected.has(r.id)) selection.selected.delete(r.id);
      else selection.selected.add(r.id);
    }
    if (!extend) selection.anchor = key;
  }
  const api = {material, sourceKey, initial, chooseNode, chooseSpan, edit, editForm, editScript, selectRows, scriptTargets, batch, undo,
    clearHistory: s => histories.delete(s), canUndo: s => !!history(s).undo.length, canRedo: s => !!history(s).redo.length};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.COJAnalysis = api;
})(typeof window !== "undefined" ? window : globalThis);
