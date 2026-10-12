"use strict";
(() => {
  const state = new COJEditing.State();
  let files = [], corpus = [], busy = false, hasDocument = false, message = "", focusNext = null;
  let pasted = "", preview = null, browseMode = null, query = "", statusNode, saveButton, warnings;
  const fields = new Map(), openSections = new Map(), browserOpen = new Set(), savedCache = new Map();
  const page = document.createElement("section");
  page.id = "editor-page-editing"; page.className = "editor-page editing-page hidden";
  document.querySelector(".detail-pane").appendChild(page);
  const sidebar = document.querySelector("#editing-sidebar-controls");
  const actions = el("div", undefined, "editing-sidebar-actions");
  const browser = el("div", undefined, "editing-browser");
  const search = el("input"); search.type = "search"; search.placeholder = "Find a Text or Document…";
  search.setAttribute("aria-label", "Find a Text or Document");
  const browserTitle = el("h2"), browserMessage = el("p", undefined, "editing-hint");
  const sidebarStatus = el("p", undefined, "editing-sidebar-status"); sidebarStatus.setAttribute("role", "status");
  actions.append(button("New Text", () => startBrowse("create")), button("Open Text", () => startBrowse("open")), button("New Document", newDocument));
  sidebar.append(actions, sidebarStatus, browserTitle, search, browserMessage, browser);
  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase(); renderBrowser();
    // Saved files have no Text inventory endpoint. Read them only for expansion/search.
    if (query) files.forEach(filename => {
      const entry = {kind: "saved", key: filename};
      if (!savedCache.has(filename)) getSaved(entry).then(renderBrowser).catch(error => { sidebarStatus.textContent = error.message; });
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
    if (input.tagName !== "TEXTAREA") return;
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
  function updateStatus() {
    const status = message || (state.dirty || pasted.trim() ? "Unsaved changes" : state.savedFilename ? "All changes saved" : "Not saved yet");
    statusNode.textContent = status; sidebarStatus.textContent = message;
    if (saveButton) saveButton.disabled = busy || !state.document.name.trim();
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
  function mayReplace() { return !(state.dirty || pasted.trim()) || window.confirm("Discard unsaved changes to this Document?"); }
  function checkPaste() { if (pasted.trim()) throw new Error("Apply or clear the bulk entry before switching Texts."); }
  function newDocument() {
    if (!mayReplace()) return;
    state.reset(); state.markDirty(); hasDocument = true; pasted = ""; preview = null;
    browseMode = null; message = ""; focusNext = "document-name";
  }
  async function startBrowse(mode) {
    browseMode = mode; query = ""; search.value = ""; busy = true; render();
    [files, corpus] = await Promise.all([apiFetch("/api/authoring/files"), apiFetch("/api/authoring/corpus")]);
    savedCache.clear(); message = "";
  }
  async function getSaved(entry) {
    if (!savedCache.has(entry.key)) {
      const pending = apiFetch(`/api/authoring/files/${encodeURIComponent(entry.key)}`);
      savedCache.set(entry.key, pending);
      try { const data = await pending; savedCache.set(entry.key, data); }
      catch (error) { savedCache.delete(entry.key); throw error; }
    }
    return await savedCache.get(entry.key);
  }
  function textEntries(document) {
    return document.text_order.map((key, i) => ({key, text_id: document.texts[key].text_id, ordinal: i + 1}));
  }
  function entries() {
    const result = [];
    if (hasDocument) result.push({kind: "current", key: "current", name: state.document.name || "Untitled Document", group: "Current Document", texts: textEntries(state.document)});
    files.filter(filename => filename !== state.savedFilename).forEach(filename => {
      const data = savedCache.get(filename);
      result.push({kind: "saved", key: filename, name: data?.document?.name || filename.replace(/\.syn\.json$/, ""), group: "Saved Documents", texts: data?.document ? textEntries(data.document) : null});
    });
    corpus.forEach(item => result.push({kind: "corpus", ...item,
      group: item.name.match(/^(.+)_\d+$/)?.[1] || "Other corpus Documents", texts: item.texts.map((text, i) => ({...text, ordinal: i + 1}))}));
    return result;
  }
  function renderBrowser() {
    browser.replaceChildren(); search.hidden = !browseMode; browserTitle.hidden = !browseMode;
    browserMessage.textContent = browseMode === "create" ? "Choose the Document for the new Text." : "";
    browserTitle.textContent = browseMode === "create" ? "New Text" : "Open Text";
    if (!browseMode) return;
    const groups = new Map();
    entries().forEach(entry => {
      const nameMatches = `${entry.name} ${entry.group}`.toLowerCase().includes(query);
      const matches = (entry.texts || []).filter(t => t.text_id.toLowerCase().includes(query));
      if (query && !nameMatches && entry.texts && !matches.length) return;
      if (!groups.has(entry.group)) groups.set(entry.group, []);
      groups.get(entry.group).push({...entry, filtered: !query || nameMatches ? entry.texts : matches});
    });
    groups.forEach((items, group) => {
      const section = el("details", undefined, "collection-node"), summary = el("summary", group, "collection-heading");
      section.open = !!query || group === "Current Document" || group === "Saved Documents" || browserOpen.has(group);
      section.addEventListener("toggle", () => { if (!section.isConnected) return; if (section.open) browserOpen.add(group); else browserOpen.delete(group); });
      section.appendChild(summary);
      items.forEach(entry => {
        if (browseMode === "create") {
          const choose = button(entry.name, () => chooseDocument(entry, null, true)); choose.className = "document-item";
          choose.setAttribute("aria-label", `Add Text to ${entry.name}`); section.appendChild(choose); return;
        }
        const doc = el("details", undefined, "document-node"), heading = el("summary"), texts = el("div", undefined, "inline-passage-list");
        heading.append(el("strong", entry.name), el("small", entry.texts ? String(entry.texts.length) : ""));
        const docKey = `${entry.kind}:${entry.key}`;
        doc.open = browserOpen.has(docKey) || (!!query && !!entry.filtered?.length);
        function fill() {
          texts.replaceChildren();
          if (!entry.texts) { texts.appendChild(el("p", "Expand to load Texts", "sidebar-loading")); return; }
          const counts = new Map();
          entry.texts.forEach(text => counts.set(text.text_id, (counts.get(text.text_id) || 0) + 1));
          (entry.filtered || []).forEach(text => {
            const label = text.text_id || `Untitled Text ${text.ordinal}`;
            const display = counts.get(text.text_id) > 1 ? `${label} (${text.ordinal})` : label;
            const choose = button(display, () => chooseDocument(entry, text.key)); choose.className = "editing-text-item";
            choose.setAttribute("aria-label", `Open ${label} in ${entry.name}, ${text.ordinal}`);
            if (entry.kind === "current" && state.activeText === text.key) choose.setAttribute("aria-current", "true");
            texts.appendChild(choose);
          });
          if (!entry.texts.length) texts.appendChild(el("p", "Empty Document", "sidebar-loading"));
        }
        fill();
        doc.addEventListener("toggle", async () => {
          if (!doc.isConnected) return;
          if (!doc.open) { browserOpen.delete(docKey); return; }
          browserOpen.add(docKey);
          if (!entry.texts) {
            texts.replaceChildren(el("p", "Loading…", "sidebar-loading"));
            try {
              const data = await getSaved(entry); entry.texts = textEntries(data.document);
              entry.filtered = query && !entry.name.toLowerCase().includes(query) ? entry.texts.filter(t => t.text_id.toLowerCase().includes(query)) : entry.texts;
              fill();
            } catch (error) { texts.replaceChildren(el("p", error.message, "sidebar-loading")); }
          }
        });
        doc.append(heading, texts); section.appendChild(doc);
      });
      browser.appendChild(section);
    });
    if (!groups.size) browser.appendChild(el("p", "No matching Documents or Texts.", "sidebar-loading"));
  }
  async function chooseDocument(entry, textKey, create = false) {
    if (entry.kind === "current") checkPaste();
    else {
      if (!mayReplace()) return;
      busy = true; render();
      const data = entry.kind === "saved" ? await getSaved(entry) : await apiFetch(`/api/authoring/corpus/${encodeURIComponent(entry.key)}`);
      state.open(data.document, data.filename, data.revision); hasDocument = true; pasted = ""; preview = null;
      if (entry.kind === "corpus") message = "Corpus draft copy; original files remain unchanged.";
    }
    if (create) { state.addText(); preview = null; focusNext = "paste"; }
    else {
      const key = entry.kind === "corpus" ? state.document.text_order[Number(textKey)] : textKey;
      state.selectText(key); preview = null;
    }
    browseMode = "open";
  }
  async function save() {
    if (pasted.trim()) throw new Error("Preview and apply the bulk entry, or clear it before saving.");
    const filename = state.savedFilename || COJEditing.filenameForDocument(state.document.name);
    state.filename = filename; busy = true; render(); let data;
    try {
      data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`, {method: "PUT", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({document: state.document, expected_revision: state.expectedRevision()})});
    } catch (error) {
      if (/This file changed/.test(error.message)) throw new Error(state.expectedRevision() === null
        ? "A saved Document already uses this name. Choose another name or open it."
        : "This Document changed elsewhere. Your draft is retained; reopen it or use Save a copy.");
      throw error;
    }
    state.saved(data.filename, data.revision); savedCache.set(data.filename, {...data, document: state.document});
    if (!files.includes(data.filename)) files.push(data.filename); message = "Saved complete Document.";
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
  function renderBulk(parent) {
    const bulk = details("Bulk entry", !state.text.passage_order.length); bulk.className = "editing-bulk";
    if (pasted.trim() || preview) bulk.open = true;
    const review = el("div", undefined, "editing-paste-preview");
    bulk.appendChild(field("Text / Transcription", pasted, value => { pasted = value; preview = null; review.replaceChildren(); }, "paste", true, "Bulk entry"));
    fields.get("paste").placeholder = "美阿止都久留\nmi ato tukuru\n伊志乃比鼻伎波\nisi no pibiki pa";
    bulk.append(button("Preview", () => { preview = COJEditing.parsePairs(pasted); }), review);
    if (preview) {
      preview.forEach((pair, index) => {
        const row = el("div", undefined, "editing-preview-row");
        row.append(el("span", String(state.text.passage_order.length + index + 1)), el("div", pair.original), el("div", pair.transcription)); review.appendChild(row);
      });
      review.appendChild(button("Apply", () => { state.appendPairs(preview); pasted = ""; preview = null; message = ""; }));
    }
    parent.appendChild(bulk);
  }
  function renderAnalysis(parent) {
    if (!Object.keys(state.text.nodes).length) return;
    const analysis = details("Preserved analysis (read only)"), tree = el("div", undefined, "editing-analysis-tree"); tree.setAttribute("role", "tree");
    // Nested containers draw guides from the hierarchy; no connector text is stored.
    const stack = state.text.roots.slice().reverse().map(id => [id, tree]);
    while (stack.length) {
      const [id, container] = stack.pop(), node = state.text.nodes[id], item = el("div", undefined, "editing-analysis-node");
      item.setAttribute("role", "treeitem");
      item.appendChild(el("div", [node.category, node.form, node.lemma, node.script].filter(Boolean).join(" "), "editing-analysis-label"));
      if (node.children.length) {
        item.setAttribute("aria-expanded", "true");
        const children = el("div", undefined, "editing-analysis-children"); children.setAttribute("role", "group"); item.appendChild(children);
        for (const child of node.children.slice().reverse()) stack.push([child, children]);
      }
      container.appendChild(item);
    }
    if (state.text.historical_header !== null) analysis.appendChild(el("p", `Historical header: ${state.text.historical_header}`));
    analysis.appendChild(tree); parent.appendChild(analysis);
  }
  function render() {
    fields.clear(); page.replaceChildren(); const controls = el("fieldset", undefined, "editing-workspace"); controls.disabled = busy;
    statusNode = el("p", undefined, "editing-status"); statusNode.setAttribute("role", "status"); saveButton = null; warnings = null; controls.appendChild(statusNode);
    if (!hasDocument) controls.appendChild(el("h1", "Editing"));
    else {
      const heading = el("div", undefined, "editing-text-heading");
      heading.appendChild(el("h1", state.text ? state.text.text_id || "Untitled Text" : "Empty Document"));
      heading.appendChild(el("span", state.document.name || "Untitled Document", "editing-document-label"));
      saveButton = button("Save", save, true); heading.appendChild(saveButton); controls.appendChild(heading);
      const meta = details("Document", !state.document.name); meta.className = "editing-document-options";
      meta.appendChild(field("Document name", state.document.name, value => { state.document.name = value; state.markDirty(); heading.children[1].textContent = value || "Untitled Document"; renderBrowser(); }, "document-name"));
      if (state.savedFilename) {
        meta.appendChild(el("p", `data/authoring/${state.savedFilename}`, "editing-hint"));
        meta.appendChild(button("Save a copy", () => {
          if (pasted.trim()) throw new Error("Apply or clear the bulk entry before saving a copy.");
          const name = window.prompt("Name for the copied Document:", state.document.name + "-copy"); if (!name) return;
          COJEditing.filenameForDocument(name); state.document.name = name; state.filename = state.savedFilename = null; state.revision = null; state.markDirty(); return save();
        }));
      }
      controls.appendChild(meta);
      if (state.text) {
        controls.appendChild(field("Text ID", state.text.text_id, value => {
          state.text.text_id = value; state.markDirty(); heading.children[0].textContent = value || "Untitled Text"; renderBrowser();
        }, "text-id"));
        warnings = el("section", undefined, "editing-warnings"); warnings.setAttribute("role", "status"); controls.appendChild(warnings);
        if (state.removal) controls.appendChild(button("Undo removal", () => { state.undoRemoval(); message = ""; }));
        renderBulk(controls); renderSource(controls); renderAnalysis(controls);
      }
    }
    page.appendChild(controls); updateStatus(); renderBrowser(); resizeFields();
    for (const node of actions.children) node.disabled = busy;
    if (focusNext && !busy) { fields.get(focusNext)?.focus(); focusNext = null; }
  }
  const tools = el("details", undefined, "editing-file-tools"); tools.appendChild(el("summary", "Import Document"));
  const upload = el("input"); upload.type = "file"; upload.accept = ".json"; upload.setAttribute("aria-label", "Import .syn.json Document");
  upload.addEventListener("change", () => run(async () => {
    const file = upload.files[0]; if (!file || !mayReplace()) return;
    if (file.size > 32000000) throw new Error("The file is too large (maximum 32 MB).");
    busy = true; render(); const data = await apiFetch("/api/authoring/validate", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({content: await file.text()})});
    state.open(data.document); hasDocument = true; pasted = ""; preview = null; browseMode = "open"; message = "Imported draft copy.";
  }));
  tools.appendChild(upload); sidebar.appendChild(tools);
  window.addEventListener("beforeunload", event => { if (state.dirty || pasted.trim()) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("resize", resizeFields);
  if (typeof ResizeObserver !== "undefined") {
    let lastWidth = -1;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== lastWidth) { lastWidth = width; resizeFields(); }
    });
    observer.observe(page);
  }
  render();
})();
