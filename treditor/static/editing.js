"use strict";

(() => {
  const state = new COJEditing.State();
  let files = [], busy = false, message = "New draft. Add a source segment to begin.";
  const lexicalInputs = new Map();
  const pendingComponents = new Map();
  let statusNode;
  const page = document.createElement("section");
  page.id = "editor-page-editing"; page.className = "editor-page editing-page hidden";
  document.querySelector(".detail-pane").appendChild(page);

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(label, action) {
    const node = element("button", label, "tool-button"); node.type = "button";
    node.addEventListener("click", () => run(action)); return node;
  }
  async function run(action) {
    if (busy) return;
    try { await action(); } catch (error) { message = error.message; }
    finally { busy = false; render(); }
  }
  function updateStatus() {
    if (statusNode) statusNode.textContent = `${state.dirty ? "Unsaved · " : ""}${message}`;
  }
  function input(label, value, change, disabled = false, multiline = false, lexicalKey = null) {
    const wrapper = element("label", undefined, "editing-field");
    const node = element(multiline ? "textarea" : "input");
    if (!multiline) node.type = "text";
    node.value = value || ""; node.disabled = disabled;
    if (lexicalKey) {
      if (!lexicalInputs.has(lexicalKey)) lexicalInputs.set(lexicalKey, []);
      lexicalInputs.get(lexicalKey).push(node);
    }
    node.setAttribute("aria-label", label);
    node.addEventListener("input", () => {
      try { change(node.value); message = "Unsaved changes."; }
      catch (error) { message = error.message; }
      if (lexicalKey) lexicalInputs.get(lexicalKey).forEach(other => { other.value = node.value; });
      updateStatus();
    });
    wrapper.append(element("span", label), node); return wrapper;
  }
  async function refreshFiles() { files = await apiFetch("/api/authoring/files"); }
  function mayReplace() {
    return !state.dirty || window.confirm("Discard unsaved Editing changes?");
  }
  async function load(filename) {
    if (!filename || !mayReplace()) return;
    busy = true; render();
    const data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`);
    state.open(data.document, data.filename, data.revision);
    pendingComponents.clear();
    message = `Opened ${data.filename}.`;
  }
  async function save() {
    pendingComponents.forEach((text, id) => addPending(id));
    busy = true; render();
    const data = await apiFetch(`/api/authoring/files/${encodeURIComponent(state.filename)}`, {
      method: "PUT", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({document: state.document, expected_revision: state.expectedRevision()}),
    });
    state.saved(data.filename, data.revision);
    message = `Saved ${data.filename} in data/authoring/.`;
    await refreshFiles();
  }
  function lexicalRow(id, occurrence) {
    const row = element("div", undefined, "editing-lexical-row");
    row.append(input("Form", occurrence.form, value => state.editOccurrence(id, "form", value), occurrence.parts.length > 0, false, `${id}:form`),
      input("Lemma (optional)", occurrence.lemma, value => state.editOccurrence(id, "lemma", value), false, false, `${id}:lemma`),
      input("Script (optional)", occurrence.script, value => state.editOccurrence(id, "script", value), occurrence.parts.length > 0, false, `${id}:script`));
    if (occurrence.parts.length) row.append(element("small", "Multipart details retained; form/script editing is deferred."));
    return row;
  }
  function addPending(id) {
    const text = pendingComponents.get(id) || "";
    text.split(/\r?\n/).filter(form => form.trim()).forEach(form => state.addComponent(id, form.trim()));
    pendingComponents.delete(id);
  }
  function render() {
    lexicalInputs.clear();
    page.replaceChildren();
    page.append(element("h1", "Editing"), element("p", "Source entry and shared terminals. Tree construction will follow in a later milestone."));
    const status = element("p", undefined, "editing-status");
    statusNode = status; updateStatus();
    status.setAttribute("role", "status"); page.appendChild(status);
    const controls = element("fieldset"); controls.disabled = busy;
    const toolbar = element("div", undefined, "editing-toolbar");
    toolbar.append(button("New draft", () => {
      if (mayReplace()) { state.reset(); pendingComponents.clear(); message = "New draft."; }
    }), input("Filename", state.filename, value => { state.filename = value; state.dirty = true; }),
    button("Save .syn.json", save));
    const picker = element("select"); picker.setAttribute("aria-label", "Saved authoring file");
    const placeholder = element("option", "Choose saved draft"); placeholder.value = ""; picker.appendChild(placeholder);
    files.forEach(filename => { const option = element("option", filename); option.value = filename; picker.appendChild(option); });
    toolbar.append(picker, button("Open", () => load(picker.value)), button("Refresh files", refreshFiles));
    const upload = element("input"); upload.type = "file"; upload.accept = ".json";
    upload.setAttribute("aria-label", "Open authoring file from computer");
    upload.addEventListener("change", () => run(async () => {
      const file = upload.files[0]; if (!file || !mayReplace()) return;
      if (file.size > 2000000) throw new Error("Authoring files are limited to 2 MB.");
      busy = true; render();
      const data = await apiFetch("/api/authoring/validate", {method: "POST",
        headers: {"Content-Type": "application/json"}, body: JSON.stringify({content: await file.text()})});
      state.open(data.document, file.name); message = "Imported file. Choose a new filename to save a copy.";
      pendingComponents.clear();
    }));
    toolbar.append(upload); controls.appendChild(toolbar);
    const metadata = element("div", undefined, "editing-toolbar");
    metadata.append(input("Text ID (optional)", state.document.text_id, value => { state.document.text_id = value; state.dirty = true; }),
      input("Header (optional)", state.document.header, value => { state.document.header = value; state.dirty = true; }));
    controls.appendChild(metadata);
    const columns = element("div", undefined, "editing-columns");
    const source = element("section"); source.append(element("h2", "Source"), button("Add segment", () => state.addSegment()));
    state.document.segment_order.forEach((id, index) => {
      const segment = state.document.segments[id];
      const card = element("section", undefined, "editing-segment"); card.append(element("h3", `Segment ${index + 1}`));
      card.appendChild(input("Original text", segment.text, value => { segment.text = value; state.dirty = true; }, false, true));
      segment.occurrences.forEach(ref => card.appendChild(lexicalRow(ref, state.document.occurrences[ref])));
      const components = element("textarea"); components.setAttribute("aria-label", `Transcription components for segment ${index + 1}`);
      components.value = pendingComponents.get(id) || "";
      components.addEventListener("input", () => {
        pendingComponents.set(id, components.value); state.dirty = true;
        message = "Unsaved changes. Add components or Save to record this transcription."; updateStatus();
      });
      components.placeholder = "Transcription: one component per line (taka, yuku, ya on separate lines)";
      card.append(components, button("Add components", () => addPending(id)), button("Add blank component", () => state.addComponent(id)));
      source.appendChild(card);
    });
    const tree = element("section"); tree.append(element("h2", "Terminals (tree workspace)"),
      element("p", "These edit the same lexical records as Source. Categories may remain unresolved."));
    state.terminals().forEach(({id, occurrence, syntax}, index) => {
      const card = element("section", undefined, "editing-segment");
      card.append(element("h3", `Terminal ${index + 1} · ${syntax?.node.category || "category unresolved"}`), lexicalRow(id, occurrence));
      tree.appendChild(card);
    });
    columns.append(source, tree); controls.appendChild(columns); page.appendChild(controls);
  }
  window.addEventListener("beforeunload", event => {
    if (state.dirty) { event.preventDefault(); event.returnValue = ""; }
  });
  render(); run(refreshFiles);
})();
