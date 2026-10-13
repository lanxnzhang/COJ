"use strict";
(() => {
  const session = new COJEditing.Session();
  let state = new COJEditing.State(), files = [], corpus = [], busy = false, message = "", focusNext = null;
  let browsing = false, selectedDocument = null, query = "", saveChoice = null, statusNode, saveButton, warnings;
  let analysisUndoButton, analysisRedoButton;
  let analysisPlanNotice, analysisCandidateButtons = [];
  const clone = value => JSON.parse(JSON.stringify(value));
  const fields = new Map(), openSections = new Map(), browserOpen = new Set(), savedCache = new Map();
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
  function details(label, defaultOpen = false) {
    const key = `${state.document.id}:${state.activeText || "document"}:${label}`, node = el("details");
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
      const plan = analysisSession().plan, fresh = plan?.source === COJAnalysis.sourceKey(state.text);
      analysisCandidateButtons.forEach(([button, allowed]) => { button.disabled = busy || !fresh || !allowed; });
      if (analysisPlanNotice) analysisPlanNotice.textContent = fresh ? `Evidence domain: ${plan.domain}. Existing hierarchy changes require accepting a candidate.`
        : "Source or Text identity changed. Analyse again to refresh candidates; existing analysis is preserved.";
    }
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
    message = Object.keys(state.text.nodes).length ? "Analysis ready. Review candidates and incomplete fields; Save stores the draft." : "Enter Source transcription before Analyse.";
  }
  function patternOutline(pattern, depth = 0) {
    return `${"  ".repeat(depth)}${[pattern.category || "?", pattern.form, pattern.lemma].filter(Boolean).join(" ")}\n`
      + pattern.children.map(c => patternOutline(c, depth + 1)).join("");
  }
  function candidatePanel(candidates, apply, label) {
    const panel = details(`Candidates: ${label}`);
    if (!candidates.length) panel.appendChild(el("p", "No attested analysis. Enter lemma/category manually; unfinished analysis can be saved."));
    candidates.forEach(c => {
      const row = el("div", undefined, "editing-candidate");
      row.append(el("p", `${c.pattern.category || "Category needed"} ${c.pattern.lemma || "Lemma needed"} — ${c.count} occurrences / ${c.texts} Texts (${(c.support * 100).toFixed(1)}%)${c.default ? " · dominant default" : ""}`),
        el("pre", patternOutline(c.pattern)));
      if (c.dictionary) row.appendChild(el("p", [c.dictionary.gloss, ...c.dictionary.meanings].join(" · ")));
      const use = button("Accept this candidate", () => apply(c));
      use.setAttribute("aria-label", `Accept ${c.pattern.category || "unclassified"} ${c.pattern.lemma || "unassigned"} for ${label}`);
      use.disabled = !c.eligible && !c.id.startsWith("dictionary:"); row.appendChild(use);
      analysisCandidateButtons.push([use, !use.disabled]);
      if (c.pattern.lemma) row.appendChild(button("Dictionary", () => openDictionaryPopupEntry(c.pattern.lemma)));
      const sources = details(`Evidence: ${c.count} occurrences (${c.domains.ordinary} ordinary, ${c.domains["EN/SM"]} EN/SM)`);
      c.evidence.forEach(e => sources.appendChild(el("p", `${e.text_id} · ${e.source} · block ${e.ordinal + 1} · node ${e.address} · ${e.domain} · revision ${e.revision.slice(0, 12)}`)));
      if (!c.eligible) sources.appendChild(el("p", c.id.startsWith("dictionary:") ? "Dictionary association only; no inferred category or morphology." : "Incomplete or unsupported corpus pattern; preserved as evidence."));
      else if (c.complete === false) sources.appendChild(el("p", "Incomplete lemma evidence: selectable as a draft, excluded from dominant defaults."));
      row.appendChild(sources); panel.appendChild(row);
    });
    return panel;
  }
  function renderScripts(parent, current) {
    const panel = details("Batch script annotation"), scope = el("select"), value = el("select");
    scope.setAttribute("aria-label", "Script scope"); value.setAttribute("aria-label", "Batch script value");
    [["text", "Unannotated units in this Text"], ["selection", "Selected subtrees / units"], ...state.text.passage_order.map((id, i) => [id, `Source line ${i + 1}`])].forEach(([v, label]) => {
      const option = el("option", label); option.value = v; scope.appendChild(option);
    });
    scope.value = current.scriptScope || "text";
    (current.plan?.scripts || ["PHON", "LOG", "NLOG", "PHON-KUN", "PHON-ON", "PLOG", "BPHON", "ILL", "ORDLOG", "NLPOG"]).forEach(v => { const option = el("option", v); option.value = v; value.appendChild(option); });
    value.value = current.scriptValue || "PHON";
    const override = el("input"); override.type = "checkbox"; override.checked = current.override || false;
    override.setAttribute("aria-label", "Override existing script values");
    const label = el("label", "Explicitly override existing values "); label.appendChild(override);
    function targets() {
      const spec = scope.value === "text" ? {} : scope.value === "selection" ? {nodes: [...current.selected].filter(id => state.text.nodes[id]),
        parts: [...current.selectedParts.values()].filter(p => state.text.nodes[p.node]?.parts.some(u => u.id === p.part))} : {passage: scope.value};
      return COJAnalysis.scriptTargets(state.text, spec);
    }
    const preview = el("div", undefined, "editing-script-preview");
    function refresh() {
      const ts = targets(); preview.replaceChildren(el("p", `${ts.length} applicable units; ${ts.filter(t => !t.script).length} empty. Existing values are preserved unless explicitly overridden.`));
      ts.forEach(t => preview.appendChild(el("span", `${t.form}: ${t.script || "empty"} → ${override.checked || !t.script ? value.value : t.script}; `)));
      if (!["text", "selection"].includes(scope.value)) preview.appendChild(el("p", "Unresolved or cross-line units are excluded; review their alignment before assigning a line scope."));
    }
    scope.addEventListener("change", () => { current.scriptScope = scope.value; refresh(); });
    value.addEventListener("change", () => { current.scriptValue = value.value; refresh(); });
    override.addEventListener("change", () => { current.override = override.checked; refresh(); });
    panel.append(scope, value, label, preview, button("Apply script batch", () => COJAnalysis.batch(state, targets(), value.value, override.checked)));
    refresh(); parent.appendChild(panel);
  }
  function renderAnalysis(parent) {
    if (typeof COJAnalysis === "undefined") return;
    const current = analysisSession(), analysis = details("Analysis", true);
    analysis.appendChild(button("Analyse", analyse, true));
    const settings = details("Suggestion settings");
    settings.append(field("Minimum support (%)", current.support * 100, value => { current.support = Number(value) / 100; }, "support"),
      field("Minimum distinct Texts", current.minTexts, value => { current.minTexts = Number(value); }, "min-texts"),
      el("p", "Suggestion thresholds are configurable; they are not annotation rules. Changes take effect on Analyse."));
    analysis.appendChild(settings);
    analysisUndoButton = button("Undo analysis edit", () => COJAnalysis.undo(state));
    analysisRedoButton = button("Redo analysis edit", () => COJAnalysis.undo(state, true));
    analysis.append(analysisUndoButton, analysisRedoButton);
    const plan = current.plan, fresh = plan?.source === COJAnalysis.sourceKey(state.text);
    if (plan) { analysisPlanNotice = el("p"); analysis.appendChild(analysisPlanNotice); }
    if (fresh) {
      const spans = details("Source span candidates");
      plan.spans.filter(s => s.last - s.first > 1 && s.candidates.length).forEach(span => spans.appendChild(candidatePanel(span.candidates,
        c => COJAnalysis.chooseSpan(state, plan, span, c), span.form)));
      analysis.appendChild(spans);
    }
    const tree = el("div", undefined, "editing-analysis-tree"); tree.setAttribute("role", "tree");
    // Nested containers draw guides from the hierarchy; no connector text is stored.
    const stack = state.text.roots.slice().reverse().map(id => [id, tree]);
    while (stack.length) {
      const [id, container] = stack.pop(), node = state.text.nodes[id], item = el("div", undefined, "editing-analysis-node");
      item.setAttribute("role", "treeitem");
      const row = el("div", undefined, "editing-analysis-label"), selected = el("input"); selected.type = "checkbox";
      selected.checked = current.selected.has(id); selected.setAttribute("aria-label", `Select analysis ${id}`);
      selected.addEventListener("change", () => { if (selected.checked) current.selected.add(id); else current.selected.delete(id); render(); });
      row.append(selected, el("span", COJAnalysis.material(state.text, id)));
      row.append(field("Category", node.category, v => COJAnalysis.edit(state, id, "category", v), `category:${id}`, false, `Category ${id}`),
        field("Lemma", node.lemma, v => COJAnalysis.edit(state, id, "lemma", v), `lemma:${id}`, false, `Lemma ${id}`));
      row.appendChild(button("Dictionary", () => {
        const currentNode = state.text.nodes[id];
        if (currentNode.lemma) openDictionaryPopupEntry(currentNode.lemma);
        else openDictionaryPopupLookup(COJAnalysis.material(state.text, id));
      }));
      if (!node.children.length && (!node.lemma || !node.category)) row.appendChild(el("span", !node.form || node.category === "*T*" ? "Special/empty material: review separately" : "Incomplete draft", "editing-hint"));
      if (node.parts.length) node.parts.forEach(part => {
        const label = el("label", `${part.form}/${part.script || "empty"} `), box = el("input"); box.type = "checkbox";
        box.checked = current.selectedParts.has(part.id); box.setAttribute("aria-label", `Select writing part ${part.id}`);
        box.addEventListener("change", () => { if (box.checked) current.selectedParts.set(part.id, {node: id, part: part.id}); else current.selectedParts.delete(part.id); render(); });
        label.appendChild(box); row.appendChild(label);
      });
      else if (node.script) row.appendChild(el("span", node.script));
      item.appendChild(row);
      const span = node.annotations.input_span;
      const candidates = fresh ? (plan.nodes[id] || (span && plan.spans.find(s => s.first === span.first && s.last === span.last)?.candidates) || []) : [];
      if (fresh && (Object.hasOwn(plan.nodes, id) || span)) {
        const panel = candidatePanel(candidates, c => COJAnalysis.chooseNode(state, plan, id, c), COJAnalysis.material(state.text, id));
        panel.appendChild(el("p", "Acceptance changes this occurrence. Its whole identity and material are retained; descendants may be replaced with fresh identities. Existing scripts and known alignment references must transfer safely or the change is rejected."));
        item.appendChild(panel);
      }
      if (node.annotations.suggestion) item.appendChild(el("small", `${node.annotations.suggestion.status}; ${node.annotations.suggestion.count} attested occurrences`));
      if (node.children.length) {
        item.setAttribute("aria-expanded", "true");
        const children = el("div", undefined, "editing-analysis-children"); children.setAttribute("role", "group"); item.appendChild(children);
        for (const child of node.children.slice().reverse()) stack.push([child, children]);
      }
      container.appendChild(item);
    }
    if (state.text.historical_header !== null) analysis.appendChild(el("p", `Historical header: ${state.text.historical_header}`));
    analysis.appendChild(tree); renderScripts(analysis, current); parent.appendChild(analysis);
  }
  function render() {
    analysisUndoButton = null; analysisRedoButton = null;
    analysisPlanNotice = null; analysisCandidateButtons = [];
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
