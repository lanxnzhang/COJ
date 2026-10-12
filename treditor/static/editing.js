"use strict";

(() => {
  const state = new COJEditing.State();
  let files = [], busy = false, mode = "start", message = "", focusNext = null;
  const pendingComponents = new Map(), focusFields = new Map();
  let statusNode, saveButton, undoButton;
  const page = document.createElement("section");
  page.id = "editor-page-editing"; page.className = "editor-page editing-page hidden";
  document.querySelector(".detail-pane").appendChild(page);

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(label, action, primary = false) {
    const node = element("button", label, primary ? "primary-button" : "tool-button");
    node.type = "button"; node.addEventListener("click", () => run(action)); return node;
  }
  async function run(action) {
    if (busy) return;
    try { await action(); } catch (error) { message = error.message; }
    finally { busy = false; render(); }
  }
  function updateStatus() {
    if (statusNode) statusNode.textContent = message || (state.dirty ? "Unsaved changes" : state.savedFilename ? "All changes saved" : "Not saved yet");
    if (saveButton) saveButton.disabled = busy || !state.document.text_id.trim();
    if (undoButton) undoButton.disabled = !state.removal;
  }
  function field(label, value, change, key, multiline = false, disabled = false) {
    const wrapper = element("label", undefined, "editing-field");
    const node = element(multiline ? "textarea" : "input");
    if (!multiline) node.type = "text";
    node.value = value || ""; node.disabled = disabled;
    node.setAttribute("aria-label", label); focusFields.set(key, node);
    node.addEventListener("input", () => {
      try { change(node.value); message = ""; } catch (error) { message = error.message; }
      updateStatus();
    });
    wrapper.append(element("span", label), node); return wrapper;
  }
  function details(label) {
    const node = element("details"); node.appendChild(element("summary", label)); return node;
  }
  async function refreshFiles() { files = await apiFetch("/api/authoring/files"); }
  function mayReplace() { return !state.dirty || window.confirm("Discard unsaved changes to this text?"); }
  function startText() {
    if (!mayReplace()) return;
    state.reset(); pendingComponents.clear(); mode = "edit"; message = ""; focusNext = "text-id";
  }
  async function openPicker() {
    busy = true; mode = "open"; render(); await refreshFiles();
  }
  async function load(filename) {
    if (!mayReplace()) return;
    busy = true; render();
    const data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`);
    state.open(data.document, data.filename, data.revision);
    pendingComponents.clear(); mode = "edit"; message = "Text opened. Edit its source and components, then Save.";
  }
  function addPending(id) {
    const text = pendingComponents.get(id) || "";
    text.split(/\r?\n/).filter(form => form.trim()).forEach(form => state.addComponent(id, form.trim()));
    pendingComponents.delete(id);
  }
  function commitPending() { [...pendingComponents.keys()].forEach(addPending); }
  async function save() {
    const filename = COJEditing.filenameForText(state.document.text_id);
    state.document.text_id = state.document.text_id.trim(); state.filename = filename;
    commitPending(); busy = true; render();
    const data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`, {
      method: "PUT", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({document: state.document, expected_revision: state.expectedRevision()}),
    });
    state.saved(data.filename, data.revision); message = "Saved. You can close this text and reopen it later.";
    await refreshFiles();
  }
  function addSegment() {
    commitPending(); const id = state.addSegment(); focusNext = `source:${id}`; message = "";
  }
  function addComponent(id) {
    addPending(id); const ref = state.addComponent(id); focusNext = `form:${ref}`; message = "";
  }
  function renderSegment(id, index, parent) {
    const segment = state.document.segments[id], card = element("section", undefined, "editing-segment");
    const heading = element("div", undefined, "editing-toolbar");
    heading.append(element("h2", `Segment ${index + 1}`), button("Remove segment", () => {
      commitPending(); state.removeSegment(id); message = "Segment removed. Undo removal is available.";
    }));
    card.appendChild(heading);
    card.appendChild(field(`Source text for segment ${index + 1}`, segment.text, value => {
      segment.text = value; state.markDirty();
    }, `source:${id}`, true));
    card.append(element("h3", "Transcription components"), element("p", "Enter one component in each row. Press Enter to continue.", "editing-hint"));
    segment.occurrences.forEach((ref, position) => {
      const occurrence = state.document.occurrences[ref], row = element("div", undefined, "editing-component");
      const form = field(`Component ${position + 1} in segment ${index + 1}`, occurrence.form,
        value => state.editOccurrence(ref, "form", value), `form:${ref}`, false, occurrence.parts.length > 0);
      focusFields.get(`form:${ref}`).addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault();
          const next = segment.occurrences[position + 1];
          if (next) focusFields.get(`form:${next}`)?.focus();
          else run(() => addComponent(id));
        }
      });
      row.append(form, button("Remove component", () => {
        commitPending(); state.removeComponent(id, ref); message = "Component removed. Undo removal is available.";
      }));
      const annotations = details("Lemma and script");
      annotations.append(field("Lemma (optional)", occurrence.lemma,
        value => state.editOccurrence(ref, "lemma", value), `lemma:${ref}`),
      field("Script (optional)", occurrence.script,
        value => state.editOccurrence(ref, "script", value), `script:${ref}`, false, occurrence.parts.length > 0));
      row.appendChild(annotations); card.appendChild(row);
    });
    card.appendChild(button("Add component", () => addComponent(id)));
    const paste = details("Paste several components");
    const entry = element("textarea");
    entry.setAttribute("aria-label", `Paste components for segment ${index + 1}`);
    entry.placeholder = "One component per line"; entry.value = pendingComponents.get(id) || "";
    entry.addEventListener("input", () => {
      pendingComponents.set(id, entry.value); state.markDirty(); message = ""; updateStatus();
    });
    paste.append(entry, button("Add pasted components", () => addPending(id))); card.appendChild(paste);
    parent.appendChild(card);
  }
  function render() {
    focusFields.clear(); page.replaceChildren();
    page.append(element("h1", "Editing"));
    const controls = element("fieldset"); controls.disabled = busy;
    const nav = element("div", undefined, "editing-toolbar");
    nav.append(button("New text", startText, mode === "start"), button("Open existing text", openPicker));
    controls.appendChild(nav);
    statusNode = element("p", undefined, "editing-status"); statusNode.setAttribute("role", "status");
    controls.appendChild(statusNode); saveButton = null; undoButton = null;
    if (mode === "start") {
      const welcome = element("section", undefined, "editing-welcome");
      welcome.append(element("h2", "Start a new text or continue a saved text"),
        element("p", "New text → add source segments → enter transcription components → Save."));
      controls.appendChild(welcome);
    } else if (mode === "open") {
      controls.append(element("h2", "Open existing text"), element("p", "Choose a saved text to continue editing."));
      if (!files.length) controls.appendChild(element("p", "No saved texts yet. Choose New text to begin."));
      files.forEach(filename => controls.appendChild(button(filename.replace(/\.syn\.json$/, ""), () => load(filename))));
      controls.appendChild(button("Refresh list", refreshFiles));
      if (state.document.segment_order.length || state.savedFilename || state.dirty) {
        controls.appendChild(button("Back to text", () => { mode = "edit"; }));
      }
    } else {
      const meta = element("div", undefined, "editing-text-heading");
      meta.appendChild(field("Text ID", state.document.text_id, value => {
        state.document.text_id = value; state.markDirty();
      }, "text-id"));
      meta.appendChild(element("p", "For example, KK.67. This identifies your text and names its saved file.", "editing-hint"));
      saveButton = button("Save", save, true); meta.appendChild(saveButton);
      if (state.removal) {
        undoButton = button("Undo removal", () => { state.undoRemoval(); message = "Removal undone."; });
        meta.appendChild(undoButton);
      }
      controls.appendChild(meta);
      const header = details("Header (optional)");
      header.appendChild(field("Header", state.document.header, value => { state.document.header = value; state.markDirty(); }, "header"));
      controls.appendChild(header);
      if (!state.document.segment_order.length) {
        const empty = element("section", undefined, "editing-welcome");
        empty.append(element("h2", "Add your first source segment"),
          element("p", "Enter its original text, then add transcription components."));
        controls.appendChild(empty);
      }
      state.document.segment_order.forEach((id, index) => renderSegment(id, index, controls));
      controls.appendChild(button("Add segment", addSegment, true));
    }
    const tools = details("More options");
    tools.className = "editing-file-tools";
    if (state.savedFilename) tools.appendChild(element("p", `Saved file: data/authoring/${state.savedFilename}`));
    const uploadLabel = element("label", "Import a .syn.json file");
    const upload = element("input"); upload.type = "file"; upload.accept = ".json";
    upload.setAttribute("aria-label", "Import a saved text from computer");
    upload.addEventListener("change", () => run(async () => {
      const file = upload.files[0]; if (!file || !mayReplace()) return;
      if (file.size > 2000000) throw new Error("The file is too large (maximum 2 MB).");
      busy = true; render();
      const data = await apiFetch("/api/authoring/validate", {method: "POST",
        headers: {"Content-Type": "application/json"}, body: JSON.stringify({content: await file.text()})});
      state.open(data.document, file.name); pendingComponents.clear(); mode = "edit";
      message = "Imported text. Set a new Text ID to save a copy.";
    }));
    uploadLabel.appendChild(upload); tools.appendChild(uploadLabel); controls.appendChild(tools);
    page.appendChild(controls); updateStatus();
    if (focusNext && !busy) { focusFields.get(focusNext)?.focus(); focusNext = null; }
  }
  window.addEventListener("beforeunload", event => {
    if (state.dirty) { event.preventDefault(); event.returnValue = ""; }
  });
  render();
  refreshFiles().catch(error => { message = error.message; if (mode === "start") updateStatus(); });
})();
