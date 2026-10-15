"use strict";
(() => {
  const session = new COJEditing.Session();
  let state = new COJEditing.State(), files = [], corpus = [], busy = false, message = "", focusNext = null;
  let browsing = false, selectedDocument = null, query = "", saveChoice = null, statusNode, saveButton, warnings;
  let analysisUndoButton, analysisRedoButton, analysisSelectionRefresh;
  let analysisPlanNotice, analysisCandidateButtons = [], analysisDerivedForms = new Map(), analysisScriptControls = [];
  const clone = value => JSON.parse(JSON.stringify(value));
  const fields = new Map(), openSections = new Map(), browserOpen = new Set(), savedCache = new Map();
  const dictionaryHints = new Map();
  const documentNumbers = new WeakMap(); let nextDocumentNumber = 1;
  const analysisSessions = new WeakMap();
  function analysisSession() {
    if (!analysisSessions.has(state)) analysisSessions.set(state, new Map());
    const sessions = analysisSessions.get(state);
    if (!sessions.has(state.activeText)) sessions.set(state.activeText, {plan: null, selected: new Set(), selectedParts: new Map(), support: .95, minTexts: 3});
    return sessions.get(state.activeText);
  }
  const page = document.createElement("section");
  page.id = "editor-page-editing"; page.className = "editor-page editing-page hidden";
  document.querySelector(".detail-pane").appendChild(page);
  const sidebar = document.querySelector("#editing-sidebar-controls");
  const actions = el("div", undefined, "wb-mode-list editing-sidebar-actions");
  const drafts = el("div", undefined, "editing-session-drafts");
  const browser = el("div", undefined, "editing-browser");
  const search = el("input"); search.type = "search"; search.placeholder = "Find a Text or Document…";
  search.setAttribute("aria-label", "Find a Text or Document");
  const sidebarStatus = el("p", undefined, "editing-sidebar-status"); sidebarStatus.setAttribute("role", "status");
  actions.append(button("New Text", () => createDraft(true)), button("Open Text", startBrowse), button("New Document", () => createDraft(false)));
  sidebar.append(actions, sidebarStatus, drafts, search, browser);
  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase(); renderBrowser(); if (browsing) render();
    if (query) files.forEach(filename => {
      if (!savedCache.has(filename)) getSaved({key: filename}).then(() => { renderBrowser(); if (browsing) render(); })
        .catch(error => { sidebarStatus.textContent = error.message; });
    });
  });
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(label, action, primary = false) {
    const node = el("button", label, primary ? "primary-button" : "tool-button");
    node.type = "button"; node.addEventListener("click", () => run(action)); return node;
  }
  function icon(label, text, action) {
    const node = button(text, action); node.className = "editing-row-action";
    node.setAttribute("aria-label", label); node.title = label; return node;
  }
  async function run(action) {
    if (busy) return;
    try { await action(); } catch (error) { message = error.message; }
    finally { busy = false; render(); }
  }
  function resize(input) {
    if (input.tagName !== "TEXTAREA" || input.getAttribute("aria-label") === "Text Input") return;
    input.style.height = "auto";
    input.style.height = `${Math.max(28, input.scrollHeight + 2)}px`;
  }
  function resizeFields() { requestAnimationFrame(() => fields.forEach(resize)); }
  function field(label, value, change, key, multiline = false, accessibleLabel = label) {
    const wrap = el("label", undefined, "editing-field"), input = el(multiline ? "textarea" : "input");
    if (multiline) input.rows = 1; else input.type = "text";
    input.value = value || ""; input.setAttribute("aria-label", accessibleLabel); fields.set(key, input);
    input.addEventListener("input", () => { change(input.value); resize(input); message = ""; updateStatus(); });
    wrap.append(el("span", label), input); return wrap;
  }
  function details(label, defaultOpen = false, uniqueKey = null) {
    const key = `${state.document.id}:${state.activeText || "document"}:${uniqueKey || label}`, node = el("details");
    node.open = openSections.has(key) ? openSections.get(key) : defaultOpen;
    node.appendChild(el("summary", label));
    node.addEventListener("toggle", () => {
      if (!node.isConnected) return;
      openSections.set(key, node.open); if (node.open) resizeFields();
    });
    return node;
  }
  function inputState() { return session.input(); }
  function updateStatus() {
    const status = message || (state.dirty ? "Unsaved changes" : state.savedFilename ? "Document saved" : "Not saved yet");
    statusNode.textContent = session.current ? status : ""; sidebarStatus.textContent = message;
    if (saveButton) saveButton.disabled = busy;
    if (analysisUndoButton) analysisUndoButton.disabled = busy || !COJAnalysis.canUndo(state);
    if (analysisRedoButton) analysisRedoButton.disabled = busy || !COJAnalysis.canRedo(state);
    if (session.current && state.text && typeof COJAnalysis !== "undefined") {
      const plan = analysisSession().plan, fresh = planFresh(plan);
      analysisCandidateButtons.forEach(([button, allowed]) => {
        button.disabled = busy || !fresh || !allowed; button.setAttribute("aria-disabled", String(button.disabled));
      });
      if (analysisPlanNotice) analysisPlanNotice.textContent = fresh ? ""
        : "Source or analysed Form changed. Analyse again to refresh candidates; existing analysis is preserved.";
    }
    analysisDerivedForms.forEach((node, id) => { if (state.text?.nodes[id]) node.textContent = COJAnalysis.material(state.text, id) || "∅"; });
    analysisScriptControls.forEach(({element, id, part}) => {
      const node = state.text?.nodes[id], unit = part ? node?.parts.find(p => p.id === part) : node;
      element.hidden = !unit?.form || !COJEditing.compact(unit.form);
    });
    if (analysisSelectionRefresh) analysisSelectionRefresh();
    if (warnings) {
      warnings.replaceChildren(); const issues = state.unresolved();
      if (issues.length) {
        warnings.appendChild(el("p", "Review needed. Existing analysis is preserved; this draft can be saved."));
        const list = el("ul"); issues.forEach(issue => list.appendChild(el("li", issue))); warnings.appendChild(list);
        const retained = details("Preserved alignment evidence"), seen = new Set();
        Object.values(state.text.links).filter(link => link.status === "unresolved").forEach(link => {
          const key = JSON.stringify([link.passage, link.evidence]); if (seen.has(key)) return; seen.add(key);
          const index = state.text.passage_order.indexOf(link.passage);
          retained.append(el("p", index < 0 ? "Removed source" : String(index + 1)), el("p", link.evidence.original), el("p", link.evidence.transcription));
        });
        if (seen.size) warnings.appendChild(retained);
      }
    }
  }
  function activate(draft, textKey) {
    session.select(draft.key, textKey); state = draft.state;
    browsing = false; saveChoice = null; message = "";
  }
  function createDraft(standalone) {
    activate(session.create(standalone)); focusNext = "paste";
  }
  function addTextToDraft(draft) {
    activate(draft); state.addText(); focusNext = "paste";
  }
  async function refreshInventory() {
    [files, corpus] = await Promise.all([apiFetch("/api/authoring/files"), apiFetch("/api/authoring/corpus")]);
  }
  async function startBrowse() {
    browsing = true; selectedDocument = null; query = ""; search.value = ""; saveChoice = null;
    busy = true; render(); savedCache.clear(); await refreshInventory(); message = "";
  }
  async function getSaved(entry) {
    if (!savedCache.has(entry.key)) {
      const pending = apiFetch(`/api/authoring/files/${encodeURIComponent(entry.key)}`); savedCache.set(entry.key, pending);
      try { savedCache.set(entry.key, await pending); }
      catch (error) { savedCache.delete(entry.key); throw error; }
    }
    return await savedCache.get(entry.key);
  }
  function textEntries(document) {
    return document.text_order.map((key, i) => ({key, text_id: document.texts[key].text_id, ordinal: i + 1}));
  }
  function entries() {
    const result = files.map(filename => {
      const live = session.drafts.find(d => d.state.savedFilename === filename), cached = savedCache.get(filename);
      const document = live?.state.document || cached?.document;
      return {kind: "saved", key: filename, name: document?.name || filename.replace(/\.syn\.json$/, ""),
        texts: document ? textEntries(document) : null};
    });
    corpus.forEach(item => result.push({kind: "corpus", ...item, texts: item.texts.map((t, i) => ({...t, ordinal: i + 1}))}));
    return result;
  }
  function matchingTexts(entry) {
    const work = entry.name.match(/^(.+)_\d+$/)?.[1] || entry.name;
    const matchName = `${entry.name} ${work}`.toLowerCase().includes(query);
    return !query || matchName ? entry.texts || [] : (entry.texts || []).filter(t => t.text_id.toLowerCase().includes(query));
  }
  function renderBrowser() {
    browser.replaceChildren(); search.hidden = !browsing;
    if (!browsing) return;
    const all = entries(), grouped = new Map();
    all.forEach(entry => {
      const work = entry.name.match(/^(.+)_\d+$/)?.[1] || entry.name;
      if (query && entry.texts && !matchingTexts(entry).length && !`${entry.name} ${work}`.toLowerCase().includes(query)) return;
      if (!grouped.has(work)) grouped.set(work, []); grouped.get(work).push(entry);
    });
    function documentButton(entry) {
      const node = button(entry.name, async () => {
        selectedDocument = entry; busy = true; render();
        if (entry.kind === "saved" && !entry.texts) { const data = await getSaved(entry); entry.texts = textEntries(data.document); }
      });
      node.className = "editing-work-item";
      node.setAttribute("aria-label", `Browse ${entry.name} (${entry.kind === "saved" ? "saved" : "corpus"})`);
      if (selectedDocument?.key === entry.key && selectedDocument?.kind === entry.kind) node.setAttribute("aria-current", "true");
      node.appendChild(el("small", entry.kind === "saved" ? "Saved" : "")); return node;
    }
    [...grouped.keys()].sort((a, b) => a.localeCompare(b)).forEach(work => {
      const items = grouped.get(work);
      // A work needs a second level only when it has distinct storage Documents.
      const names = new Set(all.filter(e => (e.name.match(/^(.+)_\d+$/)?.[1] || e.name) === work).map(e => e.name));
      if (names.size === 1) items.forEach(entry => browser.appendChild(documentButton(entry)));
      else {
        const group = el("details", undefined, "collection-node"); group.open = !!query || browserOpen.has(work);
        group.appendChild(el("summary", work, "editing-work-item editing-work-group"));
        group.addEventListener("toggle", () => { if (!group.isConnected) return; if (group.open) browserOpen.add(work); else browserOpen.delete(work); });
        items.forEach(entry => group.appendChild(documentButton(entry))); browser.appendChild(group);
      }
    });
    if (!grouped.size) browser.appendChild(el("p", "No matches.", "sidebar-loading"));
  }
  function draftName(draft) {
    if (draft.state.document.name) return draft.state.document.name;
    if (!documentNumbers.has(draft)) documentNumbers.set(draft, nextDocumentNumber++);
    return `Untitled Document ${documentNumbers.get(draft)}`;
  }
  function renderDrafts() {
    drafts.replaceChildren();
    if (!session.drafts.length) return;
    drafts.appendChild(el("h2", "Session drafts"));
    session.drafts.forEach(draft => {
      const container = draft.standalone ? el("div") : el("details");
      if (!draft.standalone) {
        container.open = draft.key === session.active;
        container.appendChild(el("summary", draftName(draft)));
        const add = icon(`Add Text to ${draftName(draft)}`, "+", () => addTextToDraft(draft)); container.appendChild(add);
      }
      const texts = textEntries(draft.state.document), counts = new Map();
      texts.forEach(text => counts.set(text.text_id, (counts.get(text.text_id) || 0) + 1));
      texts.forEach(text => {
        const label = text.text_id || `Untitled Text ${text.ordinal}`;
        const node = button(counts.get(text.text_id) > 1 ? `${label} (${text.ordinal})` : label, () => activate(draft, text.key)); node.className = "editing-text-item";
        node.setAttribute("aria-label", `Return to ${label} (${session.drafts.indexOf(draft) + 1}, ${text.ordinal})`);
        if (!browsing && session.active === draft.key && state.activeText === text.key) node.setAttribute("aria-current", "true");
        container.appendChild(node);
      });
      drafts.appendChild(container);
    });
  }
  async function openText(entry, textKey) {
    const origin = `${entry.kind}:${entry.key}`;
    let draft = session.drafts.find(d => d.origin === origin || (entry.kind === "saved" && d.state.savedFilename === entry.key));
    if (!draft) {
      busy = true; render();
      const data = entry.kind === "saved" ? await getSaved(entry) : await apiFetch(`/api/authoring/corpus/${encodeURIComponent(entry.key)}`);
      draft = session.open(data, origin);
    }
    const key = entry.kind === "corpus" ? draft.state.document.text_order[Number(textKey)] : textKey;
    activate(draft, key);
  }
  function renderTextBrowser(parent) {
    parent.appendChild(el("h1", selectedDocument?.name || "Open Text"));
    if (!selectedDocument) return;
    const list = el("div", undefined, "editing-text-browser");
    const counts = new Map(); (selectedDocument.texts || []).forEach(t => counts.set(t.text_id, (counts.get(t.text_id) || 0) + 1));
    matchingTexts(selectedDocument).forEach(text => {
      const label = text.text_id || `Untitled Text ${text.ordinal}`;
      const node = button(counts.get(text.text_id) > 1 ? `${label} (${text.ordinal})` : label, () => openText(selectedDocument, text.key));
      node.className = "editing-text-result"; node.setAttribute("aria-label", `Open ${label} in ${selectedDocument.name}, ${text.ordinal}`); list.appendChild(node);
    });
    if (!selectedDocument.texts) list.appendChild(el("p", "Loading…"));
    else if (!selectedDocument.texts.length) list.appendChild(el("p", "Empty Document"));
    else if (!matchingTexts(selectedDocument).length) list.appendChild(el("p", "No matching Texts."));
    parent.appendChild(list);
  }
  async function save() {
    if (state.savedFilename && !session.current.standalone) return writeDraft(session.current, state.document.name);
    busy = true; render(); await refreshInventory();
    saveChoice = {target: "new", name: state.document.name, copy: false};
  }
  async function writeDocument(candidate, filename, revision) {
    busy = true; render();
    try {
      return await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`, {method: "PUT", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({document: candidate, expected_revision: revision})});
    } catch (error) {
      if (/This file changed/.test(error.message)) throw new Error("This Document changed or already exists. Your session drafts are retained; save a copy or review the changed file in a fresh session.");
      throw error;
    }
  }
  async function writeDraft(draft, name, copy = false) {
    const candidate = clone(draft.state.document); candidate.name = name.trim();
    const filename = copy ? COJEditing.filenameForDocument(name) : draft.state.savedFilename || COJEditing.filenameForDocument(name);
    const revision = copy ? null : draft.state.expectedRevision();
    const data = await writeDocument(candidate, filename, revision);
    if (copy) {
      const copied = session.open({document: candidate, ...data}, `saved:${filename}`);
      copied.inputs = new Map([...draft.inputs].map(([k, v]) => [k, {...v}])); activate(copied, draft.state.activeText);
    } else {
      draft.state.document = candidate; draft.state.saved(data.filename, data.revision); draft.standalone = false; draft.origin = `saved:${data.filename}`; activate(draft);
    }
    savedCache.set(data.filename, {document: candidate, ...data}); if (!files.includes(data.filename)) files.push(data.filename);
    saveChoice = null; message = "Saved complete Document.";
  }
  function destinations() {
    const result = session.drafts.filter(d => !d.standalone && d.key !== session.current.key)
      .map(d => ({kind: "session", key: d.key, name: draftName(d)}));
    entries().filter(e => !session.drafts.some(d => d.state.savedFilename === e.key || d.origin === `${e.kind}:${e.key}`)).forEach(e => result.push(e));
    return result;
  }
  async function confirmSave() {
    const original = session.current, choice = {...saveChoice};
    busy = true; render();
    if (!original.standalone || choice.target === "new") return writeDraft(original, choice.name, choice.copy);
    const entry = destinations().find(e => `${e.kind}:${e.key}` === choice.target);
    if (!entry) throw new Error("Choose a Document.");
    let target = entry.kind === "session" ? session.drafts.find(d => d.key === entry.key) : null;
    let targetState;
    if (target) targetState = target.state;
    else {
      const data = entry.kind === "saved" ? await getSaved(entry) : await apiFetch(`/api/authoring/corpus/${encodeURIComponent(entry.key)}`);
      targetState = new COJEditing.State(); targetState.open(data.document, data.filename, data.revision);
    }
    const candidate = clone(targetState.document), textKey = original.state.activeText;
    if (candidate.texts[textKey]) throw new Error("Text identity already belongs to this Document; review before saving.");
    candidate.texts[textKey] = clone(original.state.text); candidate.text_order.push(textKey);
    if (!candidate.name) candidate.name = choice.name.trim();
    const filename = targetState.savedFilename || COJEditing.filenameForDocument(candidate.name);
    const data = await writeDocument(candidate, filename, targetState.expectedRevision());
    // Move into the selected container only after the atomic disk save succeeds.
    if (!target) target = session.open({document: candidate, ...data}, `saved:${data.filename}`);
    else { target.state.document = candidate; target.state.saved(data.filename, data.revision); }
    target.standalone = false; target.origin = `saved:${data.filename}`;
    if (original.inputs.has(textKey)) target.inputs.set(textKey, original.inputs.get(textKey));
    session.drafts = session.drafts.filter(d => d !== original); activate(target, textKey);
    savedCache.set(data.filename, {document: candidate, ...data}); if (!files.includes(data.filename)) files.push(data.filename);
    message = "Saved complete Document.";
  }
  function renderSaveChoice(parent) {
    if (!saveChoice) return;
    const panel = el("section", undefined, "editing-save-choice"); panel.appendChild(el("h2", "Save Document"));
    if (session.current.standalone && !saveChoice.copy) {
      const label = el("label", "Document"), select = el("select"); select.setAttribute("aria-label", "Save destination");
      const option = el("option", "New Document"); option.value = "new"; select.appendChild(option);
      destinations().forEach(entry => { const item = el("option", `${entry.name} (${entry.kind === "session" ? "session draft" : entry.kind})`); item.value = `${entry.kind}:${entry.key}`; select.appendChild(item); });
      select.value = saveChoice.target; select.addEventListener("change", () => run(() => { saveChoice.target = select.value; })); label.appendChild(select); panel.appendChild(label);
    }
    const chosen = destinations().find(e => `${e.kind}:${e.key}` === saveChoice.target);
    const targetName = chosen?.kind === "session" ? session.drafts.find(d => d.key === chosen.key)?.state.document.name : chosen?.name;
    if (saveChoice.target === "new" || !targetName) panel.appendChild(field("Document name", saveChoice.name, value => { saveChoice.name = value; }, "save-name"));
    panel.append(button("Confirm Save", confirmSave, true), button("Cancel", () => { saveChoice = null; })); parent.appendChild(panel);
  }
  function addRow(position) { const id = state.addPassage("", "", position); focusNext = `original:${id}`; message = ""; }
  function insertion(position) {
    const row = el("div", undefined, "editing-insertion");
    row.appendChild(icon(position === state.text.passage_order.length ? "Add row" : `Insert before ${position + 1}`, "+", () => addRow(position))); return row;
  }
  function renderSource(parent) {
    const source = details("Source", true); source.className = "editing-source";
    state.text.passage_order.forEach((id, index) => {
      source.appendChild(insertion(index));
      const value = state.text.passages[id], row = el("div", undefined, "editing-source-row");
      row.append(el("span", String(index + 1), "editing-source-number"),
        field("Text", value.original, text => state.editPassage(id, "original", text), `original:${id}`, true, `Text ${index + 1}`),
        icon(`Remove ${index + 1}`, "×", () => { state.removePassage(id); message = "Removed. Existing analysis is retained."; }),
        field("Transcription", value.transcription, text => state.editPassage(id, "transcription", text), `transcription:${id}`, true, `Transcription ${index + 1}`));
      fields.get(`transcription:${id}`).addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault(); const next = state.text.passage_order[index + 1];
          if (next) fields.get(`original:${next}`)?.focus(); else run(() => addRow(index + 1));
        }
      });
      source.appendChild(row);
    });
    source.appendChild(insertion(state.text.passage_order.length)); parent.appendChild(source);
  }
  function pairPreview(pairs, offset = 0) {
    const review = el("div", undefined, "editing-paste-preview");
    pairs.forEach((pair, index) => {
      const row = el("div", undefined, "editing-preview-row");
      row.append(el("span", String(offset + index + 1)), el("div", pair.original), el("div", pair.transcription)); review.appendChild(row);
    }); return review;
  }
  function renderInput(parent) {
    const scratch = inputState(), input = details("Text Input", !state.text.passage_order.length); input.className = "editing-input";
    input.appendChild(el("p", "Session scratch · Save stores Source", "editing-hint"));
    const review = el("div");
    input.appendChild(field("Text Input", scratch.value, value => { scratch.value = value; scratch.preview = null; scratch.replacement = false; review.replaceChildren(); }, "paste", true));
    const area = fields.get("paste"); area.rows = 7;
    area.scrollTop = scratch.scrollTop; area.addEventListener("scroll", () => { scratch.scrollTop = area.scrollTop; });
    input.append(button("Preview", () => { scratch.preview = COJEditing.parsePairs(scratch.value); scratch.replacement = false; }), review);
    if (scratch.preview) {
      input.open = true;
      review.append(pairPreview(scratch.preview, state.text.passage_order.length), button("Add to Source", () => {
        state.appendPairs(scratch.preview); scratch.preview = null; scratch.replacement = false; message = "";
      }));
      if (state.text.passage_order.length) {
        const advanced = details("Source replacement");
        advanced.appendChild(button("Replace entire Source", () => { scratch.replacement = true; })); review.appendChild(advanced);
      }
      if (scratch.replacement) {
        const confirmation = el("section", undefined, "editing-replacement-review");
        confirmation.setAttribute("aria-label", "Confirm Source replacement");
        scratch.replacementEvidence = JSON.stringify(state.text.passage_order.map(id => state.text.passages[id]));
        confirmation.append(el("h3", `Replace all ${state.text.passage_order.length} Source rows in ${state.text.text_id || "Untitled Text"} with ${scratch.preview.length} rows?`),
          el("p", "Existing analysis and alignment evidence will be preserved; affected relationships will become unresolved."),
          el("h4", "Source being replaced"), pairPreview(state.text.passage_order.map(id => state.text.passages[id])),
          el("h4", "Replacement Source"), pairPreview(scratch.preview),
          button("Confirm replacement", () => {
            if (scratch.replacementEvidence !== JSON.stringify(state.text.passage_order.map(id => state.text.passages[id]))) {
              scratch.replacement = false; throw new Error("Source changed; review replacement again.");
            }
            state.replacePairs(scratch.preview); scratch.preview = null; scratch.replacement = false; message = ""; }),
          button("Cancel replacement", () => { scratch.replacement = false; }));
        review.appendChild(confirmation);
      }
    }
    parent.appendChild(input);
  }
  async function analyse() {
    const target = state, textKey = state.activeText, current = analysisSession(), source = COJAnalysis.sourceKey(state.text);
    busy = true; render();
    const plan = await apiFetch("/api/authoring/analyse", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({document: state.document, text_key: textKey, settings: {support: current.support, min_texts: current.minTexts}})});
    if (target !== state || textKey !== state.activeText || source !== COJAnalysis.sourceKey(state.text)) throw new Error("Source changed; invoke Analyse again.");
    plan.source = source; current.plan = plan;
    COJAnalysis.initial(state, plan);
    plan.material = state.text.roots.map(id => COJAnalysis.material(state.text, id)).join("");
    message = Object.keys(state.text.nodes).length ? "Analysis ready. Review candidates and incomplete fields; Save stores the draft." : "Enter Source transcription before Analyse.";
  }
  function planFresh(plan) {
    return !!plan && plan.source === COJAnalysis.sourceKey(state.text)
      && (plan.material === undefined || plan.material === state.text.roots.map(id => COJAnalysis.material(state.text, id)).join(""));
  }
  function lexicalTag(tag, plan) {
    return [...(plan?.lexical_categories || ["VB", "ADJ", "WH-ADJ", "COP", "N", "DVN", "PEN", "PLN", "PRO-N", "WH-N", "ADV", "PRO-ADV", "WH-ADV", "INTJ", "NUM", "WH-NUM", "P", "XTN", "MK", "ACP", "VAX", "PFX", "SFX", "CL"]), "WORD"]
      .some(t => tag === t || tag?.startsWith(t + "-"));
  }
  function patternTree(pattern, current) {
    const tree = el("div", undefined, "editing-analysis-node"), row = el("div", undefined, "editing-tree-row");
    const material = p => p.children.length ? p.children.map(material).join("") : p.form || "";
    row.appendChild(el("span", pattern.category || "Tag unresolved", "editing-pattern-tag"));
    if (!pattern.children.length || lexicalTag(pattern.category)) row.appendChild(el("span", material(pattern), "editing-derived-form"));
    if (pattern.lemma && current.showLemma !== false) row.appendChild(el("span", pattern.lemma, "editing-pattern-lemma"));
    tree.appendChild(row);
    if (pattern.children.length) {
      const children = el("div", undefined, "editing-analysis-children");
      pattern.children.forEach(child => children.appendChild(patternTree(child, current))); tree.appendChild(children);
    }
    return tree;
  }
  function inlineInput(value, label, change, key, className) {
    const input = el("input", undefined, `editing-inline-input ${className || ""}`);
    input.type = "text"; input.value = value || ""; input.setAttribute("aria-label", label);
    input.setAttribute("spellcheck", "false"); fields.set(key, input);
    input.addEventListener("input", () => { change(input.value); message = ""; updateStatus(); });
    return input;
  }
  function hintFromEntry(entry) {
    return entry.gloss || "";
  }
  function lemmaControl(lemma, edit, label, current, dictionary) {
    if (dictionary) dictionaryHints.set(lemma, hintFromEntry(dictionary));
    const wrap = el("span", undefined, "editing-inline-lemma"), link = button(lemma || "—", () => {
      if (lemma) openDictionaryPopupEntry(lemma);
    });
    link.className = "editing-lemma-link"; link.setAttribute("aria-label", label);
    link.hidden = current.showLemma === false; link.disabled = !lemma; link.title = dictionaryHints.get(lemma) || "";
    const gloss = el("span", dictionaryHints.get(lemma) || "", "editing-inline-gloss");
    gloss.hidden = !current.showGloss;
    let pending = false;
    async function loadHint() {
      if (!lemma || pending) return;
      if (dictionaryHints.has(lemma)) { link.title = dictionaryHints.get(lemma); gloss.textContent = dictionaryHints.get(lemma); return; }
      pending = true;
      try {
        const data = await apiFetch(`/api/dictionary/${encodeURIComponent(lemma)}`);
        const text = data.fields.filter(f => f.tag === ".GLOSS").flatMap(f => f.values).join(" · ");
        dictionaryHints.set(lemma, text); link.title = text; gloss.textContent = text;
      } catch (_) { link.title = ""; }
      finally { pending = false; }
    }
    link.addEventListener("pointerenter", loadHint); link.addEventListener("focus", loadHint);
    wrap.appendChild(link);
    if (edit) {
      const pencil = el("button", "✎", "editing-row-action editing-lemma-edit"); pencil.type = "button";
      pencil.hidden = current.showLemma === false; pencil.setAttribute("aria-label", `Edit ${label}`); pencil.title = `Edit ${label}`;
      pencil.addEventListener("click", () => {
        const input = inlineInput(lemma, label, edit, `edit:${label}`, "editing-lemma-input");
        wrap.replaceChildren(input); input.focus();
        input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); render(); } });
        input.addEventListener("blur", () => { if (input.isConnected) wrap.replaceChildren(lemmaControl(input.value, edit, label, current)); });
      });
      wrap.appendChild(pencil);
    }
    wrap.appendChild(gloss);
    if (current.showGloss) loadHint();
    return wrap;
  }
  function candidatePanel(candidates, apply, label, current, key = null) {
    const panel = details(key ? "Candidates" : `Candidates: ${label}`, false, key ? `candidates:${key}` : null); panel.className = "editing-candidates";
    if (!candidates.length) panel.appendChild(el("p", "No attested analysis. Tag and lemma may remain unresolved in this draft.", "editing-hint"));
    candidates.forEach(c => {
      const row = el("div", undefined, "editing-candidate");
      const allowed = c.eligible || c.id.startsWith("dictionary:");
      row.setAttribute("role", "button"); row.tabIndex = allowed ? 0 : -1;
      row.setAttribute("aria-label", `Choose ${c.pattern.category || "unclassified"} ${c.pattern.lemma || "unassigned"} for ${label}`);
      row.disabled = !allowed; row.setAttribute("aria-disabled", String(!allowed));
      const choose = event => {
        if (row.disabled || ["BUTTON", "A", "SUMMARY"].includes(event.target.tagName)) return;
        return run(() => apply(c));
      };
      row.addEventListener("click", choose);
      row.addEventListener("keydown", event => {
        if (event.target === row && ["Enter", " "].includes(event.key)) { event.preventDefault(); return choose(event); }
      });
      row.appendChild(el("strong", c.pattern.category || "Tag unresolved"));
      if (current.showLemma !== false || current.showGloss) row.appendChild(lemmaControl(c.pattern.lemma, null, `Candidate lemma ${c.pattern.lemma || "unresolved"}`, {...current, showGloss: true}, c.dictionary));
      row.appendChild(el("small", `${c.count} attestations · ${(c.support * 100).toFixed(1)}% support`, "editing-attestation-count"));
      analysisCandidateButtons.push([row, allowed]);
      if (c.pattern.children.length) {
        const structure = el("details", undefined, "editing-candidate-structure"); structure.open = true;
        structure.append(el("summary", "Structure"), patternTree(c.pattern, current)); row.appendChild(structure);
      }
      if (!c.eligible && !c.id.startsWith("dictionary:")) row.appendChild(el("small", "Unsupported pattern; retained for review."));
      else if (c.id.startsWith("dictionary:")) row.appendChild(el("small", "Dictionary only · tag unresolved", "editing-candidate-note"));
      else if (c.pattern.lemma && !c.dictionary) row.appendChild(el("small", "Corpus annotation · lemma absent from dictionary", "editing-candidate-note"));
      panel.appendChild(row);
    });
    return panel;
  }
  function renderAnalysis(parent) {
    if (typeof COJAnalysis === "undefined") return;
    const current = analysisSession(), analysis = details("Analysis", true), controls = el("div", undefined, "editing-analysis-controls");
    controls.appendChild(button("Analyse", analyse, true));
    const settings = details("Suggestion settings");
    settings.append(field("Minimum support (%)", current.support * 100, value => { current.support = Number(value) / 100; }, "support"),
      field("Minimum distinct Texts", current.minTexts, value => { current.minTexts = Number(value); }, "min-texts"),
      el("p", "Suggestion thresholds apply on Analyse; they are not annotation rules.")); controls.appendChild(settings);
    analysisUndoButton = button("Undo analysis edit", () => COJAnalysis.undo(state));
    analysisRedoButton = button("Redo analysis edit", () => COJAnalysis.undo(state, true)); controls.append(analysisUndoButton, analysisRedoButton);
    const views = el("span", undefined, "editing-view-controls");
    for (const [key, label] of [["showLemma", "Lemma"], ["showScript", "Script"], ["showGloss", "Gloss"]]) {
      const wrap = el("label", label), box = el("input"); box.type = "checkbox";
      box.checked = key === "showGloss" ? !!current[key] : current[key] !== false; box.setAttribute("aria-label", `Show ${label}`);
      box.addEventListener("change", () => { current[key] = box.checked; render(); }); wrap.appendChild(box); views.appendChild(wrap);
    }
    controls.appendChild(views); analysis.appendChild(controls);
    const plan = current.plan, fresh = planFresh(plan);
    if (plan) { analysisPlanNotice = el("p", undefined, "editing-hint"); analysis.appendChild(analysisPlanNotice); }
    const toolbar = el("div", undefined, "editing-script-tools"), scope = el("select"), script = el("input"), override = el("input");
    scope.setAttribute("aria-label", "Script scope"); script.setAttribute("aria-label", "Scope Script"); override.type = "checkbox";
    override.setAttribute("aria-label", "Replace existing Script"); override.checked = current.override || false;
    for (const [value, label] of [["selection", "Selection / subtree"], ["empty", "Unannotated in Text"], ["text", "Whole Text"], ...state.text.passage_order.map((id, i) => [id, `Source line ${i + 1}`])]) {
      const option = el("option", label); option.value = value; scope.appendChild(option);
    }
    scope.value = current.scriptScope || "empty";
    const scripts = current.plan?.scripts || ["PHON", "LOG", "NLOG", "PHON-KUN", "PHON-ON", "PLOG", "BPHON", "ILL", "ORDLOG", "NLPOG"];
    const suggestions = el("datalist"); suggestions.id = "editing-script-values";
    for (const value of scripts) { const option = el("option"); option.value = value; suggestions.appendChild(option); }
    analysis.appendChild(suggestions); script.type = "text"; script.setAttribute("list", suggestions.id);
    function scriptSelect(value, label, change) {
      const input = el("input", undefined, "editing-inline-script"); input.type = "text";
      input.setAttribute("aria-label", label); input.setAttribute("list", suggestions.id); input.value = value || "";
      input.addEventListener("change", () => run(() => change(input.value)));
      input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); return run(() => change(input.value)); } });
      return input;
    }
    script.value = current.scriptValue || "PHON";
    const replaceLabel = el("label", "Replace existing "); replaceLabel.appendChild(override);
    const count = el("small"), preview = el("details", undefined, "editing-script-targets"), previewRows = el("div");
    preview.append(el("summary", "Targets"), previewRows);
    const rows = [];
    function targets() {
      const spec = scope.value === "empty" || scope.value === "text" ? {} : scope.value === "selection" ? {
        nodes: [...current.selected].filter(id => state.text.nodes[id]), parts: [...current.selectedParts.values()].filter(p => state.text.nodes[p.node]?.parts.some(u => u.id === p.part))} : {passage: scope.value};
      const values = COJAnalysis.scriptTargets(state.text, spec); return scope.value === "empty" ? values.filter(t => !t.script) : values;
    }
    const apply = button("Fill Script", () => COJAnalysis.batch(state, targets(), script.value, override.checked));
    function refreshSelection() {
      rows.forEach(r => { const selected = r.part ? current.selectedParts.has(r.part) : current.selected.has(r.id);
        r.element.className = `editing-tree-row${r.part ? " editing-part-row" : ""}${selected ? " is-selected" : ""}`; r.element.setAttribute("aria-selected", String(selected)); });
      const values = targets(), changed = values.filter(t => override.checked || !t.script).length;
      count.textContent = `${changed} to assign · ${values.length - changed} preserved`;
      apply.disabled = busy || !changed; apply.textContent = override.checked ? "Replace Script" : "Fill Script";
      previewRows.replaceChildren(); values.forEach(t => previewRows.appendChild(el("div", `${t.form}  ${t.script || "—"} → ${override.checked || !t.script ? script.value : t.script}`)));
      if (!["selection", "empty", "text"].includes(scope.value)) previewRows.appendChild(el("p", "Unresolved or cross-line units are excluded."));
    }
    scope.addEventListener("change", () => { current.scriptScope = scope.value; refreshSelection(); });
    script.addEventListener("change", () => { current.scriptValue = script.value; refreshSelection(); });
    override.addEventListener("change", () => { current.override = override.checked; refreshSelection(); });
    toolbar.append(el("span", "Script"), scope, script, apply, replaceLabel, count, preview,
      button("Clear selection", () => { current.selected.clear(); current.selectedParts.clear(); refreshSelection(); }));
    toolbar.hidden = current.showScript === false;
    function scriptRange(row, key) {
      row.appendChild(icon(`Script range ${key}`, "…", () => { current.scriptAnchor = current.scriptAnchor === key ? null : key; }));
      if (current.scriptAnchor === key) row.appendChild(toolbar);
    }
    const tree = el("div", undefined, "editing-analysis-tree"); tree.setAttribute("role", "tree"); tree.setAttribute("aria-multiselectable", "true");
    function selectable(row, id, part = null) {
      const descriptor = {key: part ? `part:${part}` : id, id, part, element: row}; rows.push(descriptor);
      row.className = "editing-tree-row"; row.tabIndex = 0;
      row.setAttribute("aria-label", part ? `Writing part ${part}` : `Analysis row ${id}`);
      row.addEventListener("click", event => {
        if (["INPUT", "SELECT", "BUTTON", "A", "SUMMARY"].includes(event.target.tagName) || event.target.closest?.(".editing-candidates")) return;
        COJAnalysis.selectRows(current, rows, descriptor.key, event); scope.value = "selection"; current.scriptScope = "selection"; refreshSelection();
      });
      row.addEventListener("keydown", event => {
        if (event.target !== row) return;
        const i = rows.indexOf(descriptor);
        if ([" ", "ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault(); const next = event.key === " " ? descriptor : rows[Math.max(0, Math.min(rows.length - 1, i + (event.key === "ArrowDown" ? 1 : -1)))];
          COJAnalysis.selectRows(current, rows, next.key, event); next.element.focus(); scope.value = "selection"; current.scriptScope = "selection"; refreshSelection();
        }
      });
    }
    const stack = state.text.roots.slice().reverse().map(id => [id, tree]);
    while (stack.length) {
      const [id, container] = stack.pop(), node = state.text.nodes[id], item = el("div", undefined, "editing-analysis-node"); item.setAttribute("role", "treeitem");
      const row = el("div"); selectable(row, id);
      const tagInput = inlineInput(node.category, `Tag ${id}`, v => COJAnalysis.edit(state, id, "category", v), `tag:${id}`, "editing-inline-tag");
      tagInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); render(); } }); row.appendChild(tagInput);
      const terminal = !node.children.length, lexicalWhole = !terminal && lexicalTag(node.category, plan);
      const emptyAnnotation = terminal && ["*T*", "NULL"].includes(node.category) && !node.form;
      const owned = !emptyAnnotation && terminal && !node.parts.length && (node.form || node.annotations.owns_form || !state.text.compatibility.original_block_xml);
      if (owned) row.appendChild(inlineInput(node.form, `Form ${id}`, v => COJAnalysis.editForm(state, id, v), `form:${id}`, "editing-inline-form"));
      else if (!emptyAnnotation && (terminal || lexicalWhole)) {
        const form = el("span", COJAnalysis.material(state.text, id) || "∅", "editing-derived-form");
        row.appendChild(form); analysisDerivedForms.set(id, form);
      }
      const span = node.annotations.input_span;
      const candidates = fresh ? (plan.nodes[id] || (span && plan.spans.find(s => s.first === span.first && s.last === span.last)?.candidates) || []) : [];
      if (!emptyAnnotation && (current.showLemma !== false || current.showGloss) && (terminal || lexicalWhole || node.lemma)) row.appendChild(lemmaControl(node.lemma, v => COJAnalysis.edit(state, id, "lemma", v), `Lemma ${id}`, current,
        candidates.find(c => c.pattern.lemma === node.lemma)?.dictionary));
      if (current.showScript !== false && owned) {
        const control = scriptSelect(node.script, `Script ${id}`, v => COJAnalysis.editScript(state, id, v));
        row.appendChild(control); analysisScriptControls.push({element: control, id, part: null});
        if (node.form && COJEditing.compact(node.form)) scriptRange(row, id);
      }
      if (terminal && node.form && (!node.lemma || !node.category)) { const marker = el("small", "·", "editing-incomplete"); marker.title = "Incomplete draft annotation"; row.appendChild(marker); }
      item.appendChild(row);
      if (terminal && node.parts.length) {
        const parts = el("div", undefined, "editing-writing-parts");
        node.parts.forEach(part => {
          const partRow = el("div"); selectable(partRow, id, part.id);
          partRow.appendChild(inlineInput(part.form, `Part Form ${part.id}`, v => COJAnalysis.editForm(state, id, v, part.id), `part-form:${part.id}`, "editing-inline-form"));
          if (current.showScript !== false) {
            const control = scriptSelect(part.script, `Part Script ${part.id}`, v => COJAnalysis.editScript(state, id, v, part.id));
            partRow.appendChild(control); analysisScriptControls.push({element: control, id, part: part.id});
            if (COJEditing.compact(part.form)) scriptRange(partRow, part.id);
          }
          parts.appendChild(partRow);
        }); item.appendChild(parts);
      }
      if (fresh && (Object.hasOwn(plan.nodes, id) || span)) row.appendChild(candidatePanel(candidates, c => COJAnalysis.chooseNode(state, plan, id, c), COJAnalysis.material(state.text, id), current, id));
      if (node.children.length) {
        item.setAttribute("aria-expanded", "true"); const children = el("div", undefined, "editing-analysis-children"); children.setAttribute("role", "group"); item.appendChild(children);
        for (const child of node.children.slice().reverse()) stack.push([child, children]);
      }
      container.appendChild(item);
    }
    analysis.appendChild(tree); analysisSelectionRefresh = refreshSelection; refreshSelection();
    if (fresh) plan.spans.filter(span => span.last - span.first > 1 && COJAnalysis.canChooseSpan(state, span))
      .forEach(span => {
        const candidates = span.candidates.filter(c => COJAnalysis.canChooseSpan(state, span, c, plan.revision));
        const existing = state.text.roots.find(id => {
          const coverage = state.text.nodes[id].annotations.input_span;
          return coverage?.first === span.first && coverage.last === span.last;
        });
        if (candidates.length && !existing) analysis.appendChild(candidatePanel(candidates,
          c => COJAnalysis.chooseSpan(state, plan, span, c), plan.units.slice(span.first, span.last).map(u => u.form).join(" "), current));
      });
    if (state.text.historical_header !== null) { const header = details("Historical header"); header.appendChild(el("p", state.text.historical_header)); analysis.appendChild(header); }
    analysis.appendChild(el("small", "Click row space to select; Ctrl/Cmd-click adds rows; Shift-click selects a range.", "editing-selection-help"));
    parent.appendChild(analysis);
  }
  function render() {
    analysisUndoButton = null; analysisRedoButton = null; analysisSelectionRefresh = null;
    analysisPlanNotice = null; analysisCandidateButtons = []; analysisDerivedForms = new Map(); analysisScriptControls = [];
    fields.clear(); page.replaceChildren(); const controls = el("fieldset", undefined, "editing-workspace"); controls.disabled = busy;
    statusNode = el("p", undefined, "editing-status"); statusNode.setAttribute("role", "status"); saveButton = null; warnings = null;
    controls.appendChild(statusNode);
    if (browsing) renderTextBrowser(controls);
    else if (!session.current) controls.appendChild(el("h1", "Editing"));
    else {
      const heading = el("div", undefined, "editing-text-heading");
      heading.append(el("h1", state.text?.text_id || "Untitled Text"), el("span", session.current.standalone ? "Unsaved Text" : state.document.name || "Unsaved Document", "editing-document-label"));
      saveButton = button("Save", save, true); heading.appendChild(saveButton); controls.appendChild(heading);
      if (state.savedFilename) {
        const meta = details("Document");
        meta.appendChild(field("Document name", state.document.name, value => {
          state.document.name = value; state.markDirty(); heading.children[1].textContent = value; renderDrafts();
        }, "display-name", false, "Document display name"));
        meta.append(el("p", `data/authoring/${state.savedFilename}`, "editing-hint"),
          button("Save a copy", () => { saveChoice = {target: "new", name: state.document.name + "-copy", copy: true}; })); controls.appendChild(meta);
      }
      renderSaveChoice(controls);
      if (state.text) {
        controls.appendChild(field("Text ID", state.text.text_id, value => { state.text.text_id = value; state.markDirty(); heading.children[0].textContent = value || "Untitled Text"; renderDrafts(); }, "text-id"));
        warnings = el("section", undefined, "editing-warnings"); warnings.setAttribute("role", "status"); controls.appendChild(warnings);
        if (state.removal) controls.appendChild(button(state.removal.kind === "replacement" ? "Undo replacement" : "Undo removal", () => { state.undoRemoval(); message = ""; }));
        renderInput(controls); renderSource(controls); renderAnalysis(controls);
      }
    }
    page.appendChild(controls); updateStatus(); renderDrafts(); renderBrowser(); resizeFields();
    for (const node of actions.children) node.disabled = busy;
    if (focusNext && !busy) { fields.get(focusNext)?.focus(); focusNext = null; }
  }
  const tools = el("details", undefined, "editing-file-tools"); tools.appendChild(el("summary", "Import Document"));
  const upload = el("input"); upload.type = "file"; upload.accept = ".json"; upload.setAttribute("aria-label", "Import .syn.json Document");
  upload.addEventListener("change", () => run(async () => {
    const file = upload.files[0]; if (!file) return;
    if (file.size > 32000000) throw new Error("The file is too large (maximum 32 MB).");
    busy = true; render(); const data = await apiFetch("/api/authoring/validate", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({content: await file.text()})});
    activate(session.open(data, `import:${session.makeId()}`)); message = "Imported draft copy.";
  }));
  tools.appendChild(upload); sidebar.appendChild(tools);
  window.addEventListener("beforeunload", event => { if (session.hasUnsaved) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("resize", resizeFields);
  if (typeof ResizeObserver !== "undefined") {
    let lastWidth = -1;
    const observer = new ResizeObserver(entries => { const width = entries[0].contentRect.width; if (width !== lastWidth) { lastWidth = width; resizeFields(); } }); observer.observe(page);
  }
  render();
})();
