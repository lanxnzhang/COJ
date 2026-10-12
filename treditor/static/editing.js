"use strict";
(() => {
  const state = new COJEditing.State();
  let files = [], corpus = [], busy = false, mode = "start", message = "", focusNext = null;
  let pasted = "", preview = null, statusNode, saveButton, warnings;
  const fields = new Map(), openedDetails = new Set();
  const page = document.createElement("section");
  page.id = "editor-page-editing"; page.className = "editor-page editing-page hidden";
  document.querySelector(".detail-pane").appendChild(page);
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
  async function run(action) {
    if (busy) return;
    try { await action(); } catch (error) { message = error.message; }
    finally { busy = false; render(); }
  }
  function updateStatus() {
    statusNode.textContent = message || (state.dirty || pasted ? "Unsaved changes" : state.savedFilename ? "All changes saved" : "Not saved yet");
    if (saveButton) saveButton.disabled = busy || !state.document.name.trim();
    if (warnings) {
      warnings.replaceChildren();
      const issues = state.unresolved();
      if (issues.length) {
        warnings.appendChild(el("p", "Review needed. Existing analysis and alignment evidence are preserved. You can save this draft."));
        const list = el("ul"); issues.forEach(issue => list.appendChild(el("li", issue))); warnings.appendChild(list);
        const retained = details("Preserved alignment evidence"), seen = new Set();
        Object.values(state.text.links).filter(link => link.status === "unresolved").forEach(link => {
          const key = JSON.stringify([link.passage, link.evidence]);
          if (seen.has(key)) return;
          seen.add(key);
          const index = state.text.passage_order.indexOf(link.passage);
          retained.append(el("p", index < 0 ? "Removed passage" : `Passage ${index + 1}`),
            el("p", link.evidence.original), el("p", link.evidence.transcription));
        });
        if (seen.size) warnings.appendChild(retained);
      }
    }
  }
  function field(label, value, change, key, multiline = false) {
    const wrap = el("label", undefined, "editing-field"), input = el(multiline ? "textarea" : "input");
    if (!multiline) input.type = "text";
    input.value = value || ""; input.setAttribute("aria-label", label); fields.set(key, input);
    input.addEventListener("input", () => {
      change(input.value); message = ""; updateStatus();
    });
    wrap.append(el("span", label), input); return wrap;
  }
  function details(label) {
    const node = el("details"); node.open = openedDetails.has(label);
    node.appendChild(el("summary", label));
    node.addEventListener("toggle", () => { if (node.open) openedDetails.add(label); else openedDetails.delete(label); });
    return node;
  }
  function mayReplace() { return !(state.dirty || pasted) || window.confirm("Discard unsaved changes to this Document?"); }
  function newText() {
    if (pasted.trim()) throw new Error("Add or clear the pasted passages before creating another Text.");
    mode = "edit"; pasted = ""; preview = null; state.addText(); state.addPassage(); focusNext = "text-id"; message = "";
  }
  function newDocument() {
    if (!mayReplace()) return;
    state.reset(); pasted = ""; newText(); focusNext = "document-name";
  }
  async function picker() {
    busy = true; mode = "open"; render();
    [files, corpus] = await Promise.all([apiFetch("/api/authoring/files"), apiFetch("/api/authoring/corpus")]);
  }
  async function load(filename) {
    if (!mayReplace()) return;
    busy = true; render();
    const data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`);
    state.open(data.document, data.filename, data.revision); mode = "edit"; pasted = ""; preview = null; message = "";
  }
  async function loadCorpus(key) {
    if (!mayReplace()) return;
    busy = true; render();
    const data = await apiFetch(`/api/authoring/corpus/${encodeURIComponent(key)}`);
    state.open(data.document); mode = "edit"; pasted = ""; preview = null;
    message = "Corpus Document opened as a draft copy. Save stores .syn.json; the corpus remains unchanged.";
  }
  async function save() {
    if (pasted.trim()) throw new Error("Preview and add the pasted passages, or clear the paste field before saving.");
    const filename = state.savedFilename || COJEditing.filenameForDocument(state.document.name);
    state.filename = filename; busy = true; render();
    let data;
    try {
      data = await apiFetch(`/api/authoring/files/${encodeURIComponent(filename)}`, {method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({document: state.document, expected_revision: state.expectedRevision()})});
    } catch (error) {
      if (/This file changed/.test(error.message)) throw new Error(state.expectedRevision() === null
        ? "A saved Document already uses this name. Choose another Document name or open the existing Document."
        : "This Document changed elsewhere. Your draft is retained; reopen it to reload, or use Save a copy.");
      throw error;
    }
    state.saved(data.filename, data.revision); message = "Saved complete Document.";
  }
  function addPassage() { const id = state.addPassage(); focusNext = `original:${id}`; message = ""; }
  function renderPassage(id, index, parent) {
    const passage = state.text.passages[id], card = el("section", undefined, "editing-passage");
    const heading = el("div", undefined, "editing-toolbar");
    heading.append(el("h2", `Passage ${index + 1}`), button("Remove passage", () => {
      state.removePassage(id); message = "Passage removed. Existing analysis is retained. Undo removal is available.";
    }));
    card.append(heading, field(`${index + 1}  Original text`, passage.original,
      value => state.editPassage(id, "original", value), `original:${id}`, true),
    field(`Spaced transcription for passage ${index + 1}`, passage.transcription,
      value => state.editPassage(id, "transcription", value), `transcription:${id}`));
    fields.get(`transcription:${id}`).addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        const next = state.text.passage_order[index + 1];
        if (next) fields.get(`original:${next}`)?.focus(); else run(addPassage);
      }
    });
    parent.appendChild(card);
  }
  function render() {
    fields.clear(); page.replaceChildren(); page.appendChild(el("h1", "Editing"));
    const controls = el("fieldset"); controls.disabled = busy;
    const nav = el("div", undefined, "editing-toolbar");
    nav.append(button("New Text", newText, mode === "start"), button("Open Text", picker), button("New Document", newDocument));
    controls.appendChild(nav);
    statusNode = el("p", undefined, "editing-status"); statusNode.setAttribute("role", "status");
    controls.appendChild(statusNode); saveButton = null; warnings = null;
    if (mode === "start") {
      controls.append(el("h2", "Create or open a Text"), el("p", "Keep related Texts in one Document. Enter numbered original text and spaced transcription, then Save."));
    } else if (mode === "open") {
      controls.append(el("h2", "Saved Documents"));
      if (!files.length) controls.appendChild(el("p", "No saved Documents yet."));
      files.forEach(filename => controls.appendChild(button(filename.replace(/\.syn\.json$/, ""), () => load(filename))));
      controls.append(el("h2", "Corpus Documents"), el("p", "Open a Document, then choose its Text. Original TXT/XML files remain unchanged."));
      corpus.forEach(item => controls.appendChild(button(`${item.name} (${item.texts.length} Texts)`, () => loadCorpus(item.key))));
      if (state.document.text_order.length) controls.appendChild(button("Back to Document", () => { mode = "edit"; }));
    } else {
      const meta = el("div", undefined, "editing-text-heading");
      meta.appendChild(field("Document name", state.document.name, value => {
        state.document.name = value; state.markDirty();
      }, "document-name"));
      meta.appendChild(el("p", state.savedFilename ? `Saved file: data/authoring/${state.savedFilename}` : "Name this Document to choose its .syn.json file.", "editing-hint"));
      saveButton = button("Save", save, true); meta.appendChild(saveButton);
      if (state.savedFilename) meta.appendChild(button("Save a copy", () => {
        const name = window.prompt("Name for the copied Document:", state.document.name + "-copy");
        if (!name) return;
        // Save a copy retains authored identities; storage identity is independent.
        COJEditing.filenameForDocument(name);
        state.document.name = name; state.filename = state.savedFilename = null; state.revision = null; state.markDirty();
        return save();
      }));
      controls.appendChild(meta);
      const selection = el("label", "Text in this Document"), select = el("select");
      select.setAttribute("aria-label", "Text in this Document");
      state.document.text_order.forEach((id, i) => {
        const option = el("option", `${i + 1}. ${state.document.texts[id].text_id || "Untitled Text"}`); option.value = id; select.appendChild(option);
      });
      select.value = state.activeText;
      select.addEventListener("change", () => run(() => {
        if (pasted.trim()) throw new Error("Add or clear the pasted passages before switching Texts.");
        state.selectText(select.value); preview = null; message = "";
      })); selection.appendChild(select); controls.appendChild(selection);
      if (state.text) {
        controls.appendChild(field("Text ID", state.text.text_id, value => {
          state.text.text_id = value; state.markDirty();
          const option = select.children[state.document.text_order.indexOf(state.activeText)];
          option.textContent = `${state.document.text_order.indexOf(state.activeText) + 1}. ${value || "Untitled Text"}`;
        }, "text-id"));
        warnings = el("section", undefined, "editing-warnings"); warnings.setAttribute("role", "status"); controls.appendChild(warnings);
        if (state.removal) controls.appendChild(button("Undo removal", () => { state.undoRemoval(); message = "Removal undone."; }));
        state.text.passage_order.forEach((id, i) => renderPassage(id, i, controls));
        controls.appendChild(button("Add passage", addPassage, true));
        const bulk = details("Paste paired passages");
        if (pasted || preview) bulk.open = true;
        bulk.appendChild(el("p", "Alternate original text and spaced transcription on separate lines. Optional original-line numbers must start at 1. Preview before adding."));
        const review = el("div", undefined, "editing-paste-preview");
        bulk.appendChild(field("Paste paired passages", pasted, value => {
          pasted = value; preview = null; review.replaceChildren();
        }, "paste", true));
        bulk.appendChild(button("Preview passages", () => { preview = COJEditing.parsePairs(pasted); }));
        bulk.appendChild(review);
        if (preview) {
          preview.forEach((pair, i) => review.append(el("p", `${state.text.passage_order.length + i + 1}  ${pair.original}`), el("p", pair.transcription)));
          review.appendChild(button("Add previewed passages", () => {
            state.appendPairs(preview); pasted = ""; preview = null; message = "Passages added.";
          }));
        }
        controls.appendChild(bulk);
        if (Object.keys(state.text.nodes).length) {
          const analysis = details("Preserved analysis (read only)");
          const list = el("ul");
          const stack = state.text.roots.slice().reverse().map(id => [id, 0]);
          while (stack.length) {
            const [id, depth] = stack.pop(), node = state.text.nodes[id];
            const item = el("li", [node.category, node.form, node.lemma, node.script].filter(Boolean).join(" "));
            item.setAttribute("style", `margin-left: ${depth * 16}px`); list.appendChild(item);
            for (const child of node.children.slice().reverse()) stack.push([child, depth + 1]);
          }
          if (state.text.historical_header !== null) analysis.appendChild(el("p", `Historical header: ${state.text.historical_header}`));
          analysis.appendChild(list); controls.appendChild(analysis);
        }
      }
    }
    const tools = details("Import a saved Document");
    const upload = el("input"); upload.type = "file"; upload.accept = ".json"; upload.setAttribute("aria-label", "Import .syn.json Document");
    upload.addEventListener("change", () => run(async () => {
      const file = upload.files[0]; if (!file || !mayReplace()) return;
      if (file.size > 32000000) throw new Error("The file is too large (maximum 32 MB).");
      busy = true; render();
      const data = await apiFetch("/api/authoring/validate", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({content: await file.text()})});
      state.open(data.document); pasted = ""; preview = null; mode = "edit"; message = "Imported Document. Choose a Document name and Save.";
    }));
    tools.appendChild(upload); controls.appendChild(tools); page.appendChild(controls); updateStatus();
    if (focusNext && !busy) { fields.get(focusNext)?.focus(); focusNext = null; }
  }
  window.addEventListener("beforeunload", event => {
    if (state.dirty || pasted.trim()) { event.preventDefault(); event.returnValue = ""; }
  });
  render();
})();
