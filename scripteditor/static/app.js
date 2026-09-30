"use strict";

const $ = id => document.getElementById(id);
let descriptors = [];
let scopeDocuments = [];
let allLines = [];
let allDictionaryEntries = [];
let currentFilteredLines = [];
let currentPageLines = [];
let currentDictionaryPage = [];
let filteredLineCount = 0;
let currentRunId = null;
let editingEntryOriginalId = null;
let dictionaryTags = [];
const deletedAddedEntries = new Set();

async function json(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.description || `HTTP ${response.status}`);
  return data;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function linkLemmaIds(value) {
  return escapeHtml(value).replace(
    /\b[A-Za-z]+\d{6}[a-z]*\b/g,
    id => `<button type="button" class="lemma-link" data-lemma="${id}">${id}</button>`,
  );
}

function scopeNodeHtml(node, depth = 0) {
  const children = node.children || [];
  const open = depth === 0 ? "open" : "";
  const checkbox = `<input type="checkbox" data-scope-id="${escapeHtml(node.id)}" aria-label="Select ${escapeHtml(node.label)}">`;
  const isDocument = Boolean(
    node.value
    && children.length
    && children.every(child => child.kind === "item")
  );
  const label = `<span>${escapeHtml(node.label)}</span>`;
  if (!children.length) {
    return `<label class="scope-node scope-leaf" style="--depth:${depth}">${checkbox}${label}</label>`;
  }
  return `<details class="scope-branch scope-${escapeHtml(node.kind)}${isDocument ? " scope-document" : ""}" data-scope-branch="${escapeHtml(node.id)}" ${open}>
    <summary style="--depth:${depth}">${checkbox}${label}<small>${children.length}</small></summary>
    <div>${children.map(child => scopeNodeHtml(child, depth + 1)).join("")}</div>
  </details>`;
}

function renderScope() {
  $("scope-tree").innerHTML = scopeDocuments.map(node => scopeNodeHtml(node)).join("");
  updateScopeStates();
}

function scopeDescendants(branch) {
  return [...branch.querySelectorAll("input[data-scope-id]")];
}

function updateScopeStates() {
  const branches = [...document.querySelectorAll("[data-scope-branch]")].reverse();
  branches.forEach(branch => {
    const own = branch.querySelector(":scope > summary input[data-scope-id]");
    const descendants = scopeDescendants(branch).filter(input => input !== own);
    const checked = descendants.filter(input => input.checked).length;
    own.checked = descendants.length > 0 && checked === descendants.length;
    own.indeterminate = checked > 0 && checked < descendants.length;
    branch.classList.toggle("scope-selected", own.checked);
    branch.classList.toggle("scope-partial", own.indeterminate);
  });
  document.querySelectorAll(".scope-leaf").forEach(leaf => {
    leaf.classList.toggle("scope-selected", leaf.querySelector("input").checked);
  });
  const selectedPassages = [
    ...document.querySelectorAll(".scope-leaf input[data-scope-id]:checked"),
  ].map(input => findScopeNode(input.dataset.scopeId, scopeDocuments))
    .filter(node => node?.value?.includes("#"));
  const selectedDocuments = new Set(
    selectedPassages.map(node => node.value.split("#", 1)[0])
  );
  $("scope-count").textContent =
    `${selectedDocuments.size.toLocaleString()} document${selectedDocuments.size === 1 ? "" : "s"} · `
    + `${selectedPassages.length.toLocaleString()} passage${selectedPassages.length === 1 ? "" : "s"} selected`;
}

function selectedProcessFiles() {
  const values = [];
  document.querySelectorAll(".scope-tree input[data-scope-id]:checked").forEach(input => {
    const node = findScopeNode(input.dataset.scopeId, scopeDocuments);
    if (!node?.value) return;
    const branch = input.closest("[data-scope-branch]");
    const descendants = branch ? scopeDescendants(branch).filter(item => item !== input) : [];
    if (!descendants.length || descendants.every(item => item.checked)) values.push(node.value);
  });
  // A selected file/collection value supersedes its selected passage values.
  return [...new Set(values)].filter(value => {
    if (!value.includes("#")) return true;
    return !values.includes(value.split("#", 1)[0]);
  });
}

function findScopeNode(id, nodes) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const match = findScopeNode(id, node.children || []);
    if (match) return match;
  }
  return null;
}

async function loadScripts() {
  const [scripts, documents, tags] = await Promise.all([
    json("/api/scripts"),
    json("/api/documents"),
    json("/api/dictionary/tags"),
  ]);
  $("script").innerHTML = scripts.map(script => `<option value="${script.id}">${escapeHtml(script.name)}</option>`).join("");
  scopeDocuments = documents;
  dictionaryTags = tags;
  renderScope();
  await loadSettings();
}

async function loadSettings() {
  descriptors = await json(`/api/scripts/${$("script").value}/settings`);
  const renderSetting = descriptor => {
    const id = `setting-${descriptor.name}`;
    let input;
    if (descriptor.type === "bool") {
      input = `<input id="${id}" type="checkbox" ${descriptor.value ? "checked" : ""}>`;
    } else if (descriptor.choices) {
      input = `<select id="${id}">${descriptor.choices.map(value => `<option ${value === descriptor.value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select>`;
    } else {
      input = `<input id="${id}" type="${descriptor.type === "int" ? "number" : "text"}" value="${escapeHtml(descriptor.value)}">`;
    }
    return `<label class="setting ${descriptor.type === "bool" ? "boolean" : ""}"><span>${descriptor.name.replaceAll("_", " ")} <i class="help" title="${escapeHtml(descriptor.description)}">?</i></span>${input}</label>`;
  };
  const general = descriptors.filter(item => !item.advanced).map(renderSetting).join("");
  const advanced = descriptors.filter(item => item.advanced).map(renderSetting).join("");
  $("settings").innerHTML = `${general}${advanced ? `<details class="advanced"><summary>Advanced settings</summary>${advanced}</details>` : ""}`;
}

function settings() {
  return Object.fromEntries(descriptors.map(descriptor => {
    const element = $(`setting-${descriptor.name}`);
    const value = descriptor.type === "bool" ? element.checked : descriptor.type === "int" ? Number(element.value) : element.value;
    return [descriptor.name, value];
  }));
}

function entryForms(entry) {
  return entry.fields
    .filter(field => field.tag.toUpperCase() === ".FORM")
    .flatMap(field => field.values)
    .map(value => String(value).trim().toLocaleLowerCase())
    .filter(Boolean);
}

function manualEntriesForForm(form) {
  const normalized = String(form || "").trim().toLocaleLowerCase();
  return allDictionaryEntries.filter(
    entry => entry.manual && entryForms(entry).includes(normalized),
  );
}

function candidateIds(row) {
  return [...new Set([
    ...(row.candidates || []),
    row.new_lemma,
    ...manualEntriesForForm(row.form).map(entry => entry.id),
  ].filter(Boolean))];
}

function hasMultipleCandidates(row) {
  return candidateIds(row).length > 1;
}

function selectedEntryState(row) {
  if (!row.selectedLemma || deletedAddedEntries.has(row.selectedLemma)) return "invalid";
  const addedEntry = allDictionaryEntries.find(
    entry => entry.id === row.selectedLemma && entry.category === "added",
  );
  if (addedEntry && !addedEntry.confirmed) return "unconfirmed";
  return candidateIds(row).includes(row.selectedLemma) ? "valid" : "invalid";
}

function choiceOptions(row) {
  const ids = candidateIds(row);
  if (row.selectedLemma && !ids.includes(row.selectedLemma)) {
    ids.unshift(row.selectedLemma);
  }
  return ids.map(id => {
    const unavailable = deletedAddedEntries.has(id) || !candidateIds(row).includes(id);
    const suffix = unavailable ? " (unavailable)" : "";
    return `<option value="${escapeHtml(id)}" ${id === row.selectedLemma ? "selected" : ""} ${unavailable ? "disabled" : ""}>${escapeHtml(id + suffix)}</option>`;
  }).join("");
}

function lineIssue(row) {
  const state = selectedEntryState(row);
  if (state === "invalid") return "This lemma is unavailable. Choose a valid value before creating final output.";
  if (state === "unconfirmed") return "This new dictionary entry is not included in final output. This line will be excluded unless the entry is confirmed.";
  return "";
}

function updatePageSelection() {
  const checkbox = $("select-page");
  const checked = currentPageLines.filter(row => row.confirmed).length;
  checkbox.disabled = currentPageLines.length === 0;
  checkbox.checked = currentPageLines.length > 0 && checked === currentPageLines.length;
  checkbox.indeterminate = checked > 0 && checked < currentPageLines.length;
  checkbox.nextElementSibling.textContent = currentPageLines.length
    ? `Select current page (${currentPageLines.length})`
    : "Select current page";
}

function updateReviewIssues(extraIssues = []) {
  const invalid = allLines.filter(row => row.confirmed && selectedEntryState(row) === "invalid");
  const pending = allLines.filter(row => row.confirmed && selectedEntryState(row) === "unconfirmed");
  const messages = [];
  if (invalid.length) messages.push(`${invalid.length} confirmed line${invalid.length === 1 ? "" : "s"} need a valid lemma selection.`);
  if (pending.length) messages.push(`${pending.length} confirmed line${pending.length === 1 ? "" : "s"} use unconfirmed new entries and will be excluded.`);
  extraIssues.forEach(issue => messages.push(issue.message));
  $("review-issues").classList.toggle("hidden", messages.length === 0);
  $("review-issues").innerHTML = messages.map(message => `<p>${escapeHtml(message)}</p>`).join("");
  return {invalid, pending};
}

function applyLineFilters() {
  const category = $("filter-category").value;
  const candidates = $("filter-candidates").value;
  const file = $("filter-file").value;
  const limit = Math.max(1, Math.min(10000, Number($("filter-limit").value) || 200));
  const requestedStart = Math.max(1, Number($("filter-start").value) || 1);
  const filtered = allLines.filter(row =>
    (category === "all" || row.category === category) &&
    (file === "all" || row.file === file) &&
    (candidates === "all" || (candidates === "multiple") === hasMultipleCandidates(row)) &&
    (!$("hide-confirmed").checked || !row.confirmed)
  );
  currentFilteredLines = filtered;
  filteredLineCount = filtered.length;
  const start = filtered.length ? Math.min(requestedStart, filtered.length) : 1;
  if (start !== requestedStart) $("filter-start").value = start;
  currentPageLines = filtered.slice(start - 1, start - 1 + limit);
  renderLines(currentPageLines, filtered.length);
  const end = currentPageLines.length ? start + currentPageLines.length - 1 : 0;
  $("visible-count").textContent = currentPageLines.length
    ? `${start.toLocaleString()}–${end.toLocaleString()} of ${filtered.length.toLocaleString()} matched`
    : "0 matched";
  updatePageSelection();
  updateConfirmationCount();
  updateReviewIssues();
}

function renderLines(lines, total) {
  $("lines").innerHTML = total ? `${total > lines.length ? `<div class="notice">Browsing ${lines.length.toLocaleString()} of ${total.toLocaleString()} matching changes.</div>` : ""}${lines.map(row => {
    const issue = lineIssue(row);
    const candidates = candidateIds(row);
    const multiple = candidates.length > 1;
    return `<article class="${row.confirmed ? "result-confirmed" : ""} ${issue ? "result-problem" : ""}">
      <div class="card-head">
        <label class="result-confirm"><input type="checkbox" data-review-confirm="${escapeHtml(row.reviewId)}" ${row.confirmed ? "checked" : ""}><span class="sr-only">Confirm ${escapeHtml(row.form)}</span></label>
        <button type="button" class="context-word" data-context-result="${escapeHtml(row.reviewId)}" title="Show this word in its passage">${escapeHtml(row.form)}</button>
        <span class="badge ${row.category}">${escapeHtml(row.category)}</span>
        ${multiple ? '<span class="badge multiple">multiple candidates</span>' : ""}
      </div>
      <p>${escapeHtml(row.file)} · ${escapeHtml(row.utterance)} · line ${row.position}</p>
      <div class="path">${row.path.map(escapeHtml).join(" <b>›</b> ")}</div>
      ${multiple ? `<p class="candidates">Candidates: ${candidates.map(id => `<button type="button" class="candidate-link" data-lemma="${escapeHtml(id)}">${escapeHtml(id)}</button>`).join(", ")}</p>` : ""}
      <div class="lemma-choice">
        <label><span>Chosen lemma</span><select data-review-choice="${escapeHtml(row.reviewId)}">${choiceOptions(row)}</select></label>
        ${issue ? `<p class="selection-warning">${escapeHtml(issue)}</p>` : ""}
      </div>
    </article>`;
  }).join("")}` : '<div class="empty">No processed text lines.</div>';
}

function renderDictionary(entries) {
  $("dict-count").textContent = allDictionaryEntries.length;
  $("dictionary").innerHTML = entries.length ? entries.map(entry => `<article class="${entry.confirmed ? "result-confirmed" : ""}">
    <div class="card-head">
      <label class="dictionary-review-select" title="Select for final output"><input type="checkbox" data-dictionary-confirm="${escapeHtml(entry.id)}" ${entry.confirmed ? "checked" : ""}><span class="sr-only">Select ${escapeHtml(entry.id)} for final output</span></label>
      <strong>${escapeHtml(entry.id)}</strong>
      <span class="badge ${entry.category}">${escapeHtml(entry.category)}</span>
      <span class="badge ${entry.manual ? "user" : "machine"}">${entry.manual ? "USER" : "MACHINE"}</span>
      <div class="dictionary-card-actions"><button type="button" data-edit-entry="${escapeHtml(entry.id)}">Edit</button><button type="button" class="danger-link" data-delete-entry="${escapeHtml(entry.id)}">Delete</button></div>
    </div>
    <dl>${entry.fields.map(field => `<dt>${escapeHtml(field.tag)}</dt><dd>${field.values.map(escapeHtml).join(" · ")}</dd>`).join("")}</dl>
  </article>`).join("") : '<div class="empty">No dictionary changes.</div>';
}

function updateDictionaryPageSelection() {
  const checkbox = $("select-dictionary-page");
  const checked = currentDictionaryPage.filter(entry => entry.confirmed).length;
  checkbox.disabled = currentDictionaryPage.length === 0;
  checkbox.checked = currentDictionaryPage.length > 0 && checked === currentDictionaryPage.length;
  checkbox.indeterminate = checked > 0 && checked < currentDictionaryPage.length;
  checkbox.nextElementSibling.textContent = currentDictionaryPage.length
    ? `Select current page (${currentDictionaryPage.length})`
    : "Select current page";
}

function applyDictionaryFilters() {
  const source = $("dictionary-filter-source").value;
  const category = $("dictionary-filter-category").value;
  currentDictionaryPage = allDictionaryEntries.filter(entry =>
    (source === "all" || (source === "user") === Boolean(entry.manual)) &&
    (category === "all" || entry.category === category) &&
    (!$("hide-confirmed-dictionary").checked || !entry.confirmed)
  );
  $("dictionary-visible-count").textContent =
    `${currentDictionaryPage.length.toLocaleString()} of ${allDictionaryEntries.length.toLocaleString()} entries`;
  renderDictionary(currentDictionaryPage);
  updateDictionaryPageSelection();
  updateConfirmationCount();
}

function updateConfirmationCount() {
  const lines = allLines.filter(row => row.confirmed).length;
  const entries = allDictionaryEntries.filter(entry => entry.confirmed).length;
  $("confirmation-count").textContent = `${lines} line${lines === 1 ? "" : "s"} · ${entries} dictionary entr${entries === 1 ? "y" : "ies"} included`;
}

function openDictionary() {
  closeContext();
  $("dictionary-drawer").classList.remove("hidden");
  $("dictionary-query").focus();
}

function closeDictionary() {
  $("dictionary-drawer").classList.add("hidden");
}

function closeContext() {
  $("context-drawer").classList.add("hidden");
}

async function openContext(reviewId) {
  if (!currentRunId) return;
  const row = allLines.find(item => item.reviewId === reviewId);
  if (!row) return;
  closeDictionary();
  $("context-drawer").classList.remove("hidden");
  $("context-location").textContent = `${row.file} · ${row.utterance}`;
  $("context-message").textContent = "Loading passage…";
  $("context-content").classList.add("hidden");
  const params = new URLSearchParams({file: row.file, utterance: row.utterance, position: row.position});
  try {
    const context = await json(`/api/runs/${currentRunId}/context?${params}`);
    $("context-location").textContent = `${context.file} · ${context.utterance}`;
    $("context-transcription").innerHTML = context.tokens.map(token =>
      `<span class="context-token ${token.highlighted ? "selected" : ""}">${escapeHtml(token.text)}</span>`
    ).join(" ");
    $("context-kanji").textContent = context.kanji || "No kanji text is recorded for this passage.";
    $("context-message").textContent = "";
    $("context-content").classList.remove("hidden");
    $("context-transcription").querySelector(".selected")?.scrollIntoView({block: "center", inline: "center"});
  } catch (error) {
    $("context-message").textContent = error.message;
  }
}

function dictionarySearchFields() {
  return [...document.querySelectorAll("#dictionary-search-fields input:checked")].map(input => input.value);
}

async function searchDictionary() {
  const query = $("dictionary-query").value.trim();
  const fields = dictionarySearchFields();
  if (!query) {
    $("dictionary-message").textContent = "Enter a form, lemma ID, or other search term.";
    return;
  }
  if (!fields.length) {
    $("dictionary-message").textContent = "Select at least one search field.";
    return;
  }
  const params = new URLSearchParams({q: query});
  fields.forEach(field => params.append("field", field));
  $("dictionary-message").textContent = "Searching…";
  try {
    const matches = await json(`/api/dictionary/search?${params}`);
    $("dictionary-message").textContent = `${matches.length} result${matches.length === 1 ? "" : "s"}${matches.length === 100 ? " (first 100)" : ""}.`;
    $("dictionary-reader-entry").classList.add("hidden");
    $("dictionary-results").innerHTML = matches.map(entry => `<button type="button" class="dictionary-result" data-lemma="${escapeHtml(entry.id)}"><strong>${escapeHtml(entry.id)}</strong> ${escapeHtml(entry.gloss)}<span>${escapeHtml(entry.forms.join(", "))}${entry.pos.length ? ` · ${escapeHtml(entry.pos.join(", "))}` : ""}</span></button>`).join("");
  } catch (error) {
    $("dictionary-message").textContent = error.message;
  }
}

async function openDictionaryEntry(entryId) {
  const pending = allDictionaryEntries.find(entry => entry.id === entryId);
  if (pending) {
    editDictionaryEntry(entryId);
    return;
  }
  openDictionary();
  $("dictionary-message").textContent = `Opening ${entryId}…`;
  try {
    const entry = await json(`/api/dictionary/${encodeURIComponent(entryId)}`);
    $("dictionary-query").value = entry.id;
    $("dictionary-message").textContent = "Complete dictionary entry";
    $("dictionary-reader-entry").innerHTML = `<h3>${escapeHtml(entry.id)}</h3><dl class="dictionary-fields">${entry.fields.map(field => `<dt>${escapeHtml(field.label)}</dt><dd>${field.values.map(value => `<div class="dictionary-field-value">${linkLemmaIds(value)}</div>`).join("")}</dd>`).join("")}</dl>`;
    $("dictionary-reader-entry").classList.remove("hidden");
  } catch (error) {
    $("dictionary-message").textContent = error.message;
  }
}

function entryFieldRow(tag = "", value = "") {
  const choices = dictionaryTags.map(choice =>
    `<button type="button" data-entry-tag-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`
  ).join("");
  return `<div class="entry-field-row">
    <div class="entry-tag-picker">
      <input class="entry-tag" value="${escapeHtml(tag)}" placeholder=".TAG">
      <button type="button" class="entry-tag-toggle" aria-label="Choose an existing dictionary tag" aria-expanded="false">▾</button>
      <div class="entry-tag-menu hidden">${choices}</div>
    </div>
    <input class="entry-value" value="${escapeHtml(value)}" placeholder="Value">
    <button type="button" class="remove-entry-field" aria-label="Remove field">×</button>
  </div>`;
}

async function validateNewEntryId() {
  const id = $("new-entry-id").value.trim();
  const message = $("new-entry-id-message");
  if (!currentRunId || !id) {
    message.textContent = "";
    return false;
  }
  const numeric = (id.match(/\d+/) || [])[0];
  const pendingConflict = allDictionaryEntries.find(
    entry => entry.id !== editingEntryOriginalId &&
      (entry.id.match(/\d+/) || [])[0] === numeric,
  );
  const result = await json(`/api/runs/${currentRunId}/dictionary/check-id/${encodeURIComponent(id)}`);
  const serverConflicts = (result.conflicts || []).filter(
    conflictId => !(id === editingEntryOriginalId && conflictId === editingEntryOriginalId),
  );
  const conflict = serverConflicts.length > 0 || Boolean(pendingConflict);
  message.classList.toggle("conflict", conflict || !result.valid);
  message.textContent = pendingConflict
    ? `Numeric portion already used by pending entry ${pendingConflict.id}.`
    : serverConflicts.length
      ? `Numeric portion already used by ${serverConflicts.join(", ")}.`
      : result.valid ? "ID is available." : result.message;
  return result.valid && !conflict;
}

async function generateEntryId() {
  if (!currentRunId) return;
  const start = Math.max(1, Number($("new-entry-start").value) || 1);
  $("new-entry-start").value = start;
  const suggestion = await json(`/api/runs/${currentRunId}/dictionary/suggest-id`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({start}),
  });
  $("new-entry-id").value = suggestion.id;
  $("new-entry-id-message").textContent =
    `Generated the first unused ID at or after ${start.toLocaleString()}.`;
  $("new-entry-id-message").classList.remove("conflict");
}

async function generateEntryKana() {
  if (!currentRunId) return;
  const forms = [...document.querySelectorAll("#new-entry-fields .entry-field-row")]
    .filter(row => row.querySelector(".entry-tag").value.trim().toUpperCase() === ".FORM")
    .map(row => row.querySelector(".entry-value").value);
  if (!forms.length) {
    $("new-entry-id-message").textContent = "Add at least one .FORM field before generating .KANA.";
    $("new-entry-id-message").classList.add("conflict");
    return;
  }
  const result = await json(`/api/runs/${currentRunId}/dictionary/generate-kana`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({forms}),
  });
  document.querySelectorAll("#new-entry-fields .entry-field-row").forEach(row => {
    if (row.querySelector(".entry-tag").value.trim().toUpperCase() === ".KANA") row.remove();
  });
  result.values.forEach(value =>
    $("new-entry-fields").insertAdjacentHTML("beforeend", entryFieldRow(".KANA", value))
  );
  $("new-entry-id-message").textContent = `Generated ${result.values.length} .KANA value${result.values.length === 1 ? "" : "s"} from .FORM.`;
  $("new-entry-id-message").classList.remove("conflict");
}

async function openNewEntryEditor() {
  if (!currentRunId) {
    $("status").textContent = "Run a processor before adding a dictionary entry.";
    return;
  }
  editingEntryOriginalId = null;
  openDictionary();
  $("dictionary-reader-entry").classList.add("hidden");
  $("new-entry-editor").classList.remove("hidden");
  $("new-entry-title").textContent = "New dictionary entry";
  $("new-entry-start").value = 1;
  await generateEntryId();
  $("new-entry-fields").innerHTML = [
    [".GLOSS", ""], [".MEANING", ""], [".FORM", ""], [".KANA", ""], [".POS", ""],
  ].map(([tag, value]) => entryFieldRow(tag, value)).join("");
}

function editDictionaryEntry(entryId) {
  const entry = allDictionaryEntries.find(item => item.id === entryId);
  if (!entry) return;
  editingEntryOriginalId = entryId;
  openDictionary();
  $("dictionary-reader-entry").classList.add("hidden");
  $("new-entry-editor").classList.remove("hidden");
  $("new-entry-title").textContent = "Edit dictionary entry";
  $("new-entry-start").value = 1;
  $("new-entry-id").value = entry.id;
  $("new-entry-id-message").textContent = "Changing this ID updates every current selection that uses it.";
  $("new-entry-id-message").classList.remove("conflict");
  $("new-entry-fields").innerHTML = entry.fields.flatMap(field =>
    (field.values.length ? field.values : [""]).map(value => entryFieldRow(field.tag, value))
  ).join("");
}

function deleteDictionaryEntry(entryId) {
  const entry = allDictionaryEntries.find(item => item.id === entryId);
  if (!entry) return;
  allDictionaryEntries = allDictionaryEntries.filter(item => item !== entry);
  if (entry.category === "added") deletedAddedEntries.add(entryId);
  applyDictionaryFilters();
  applyLineFilters();
}

function closeNewEntryEditor() {
  editingEntryOriginalId = null;
  $("new-entry-editor").classList.add("hidden");
}

async function saveNewEntry() {
  if (!await validateNewEntryId()) return;
  const id = $("new-entry-id").value.trim();
  const grouped = new Map();
  document.querySelectorAll("#new-entry-fields .entry-field-row").forEach(row => {
    const tag = row.querySelector(".entry-tag").value.trim().toUpperCase();
    const value = row.querySelector(".entry-value").value;
    if (tag) grouped.set(tag, [...(grouped.get(tag) || []), value]);
  });
  const fields = [...grouped].map(([tag, values]) => ({tag, values}));
  const previous = allDictionaryEntries.find(item => item.id === editingEntryOriginalId);
  const entry = {
    id,
    category: previous && previous.id === id ? previous.category : "added",
    fields,
    confirmed: previous?.confirmed || false,
    manual: previous?.manual ?? true,
  };
  if (editingEntryOriginalId && editingEntryOriginalId !== id) {
    allLines.forEach(result => {
      result.candidates = result.candidates.map(candidate => candidate === editingEntryOriginalId ? id : candidate);
      if (result.new_lemma === editingEntryOriginalId) result.new_lemma = id;
      if (result.selectedLemma === editingEntryOriginalId) result.selectedLemma = id;
    });
    if (previous?.category === "added") deletedAddedEntries.add(editingEntryOriginalId);
  }
  deletedAddedEntries.delete(id);
  allDictionaryEntries = allDictionaryEntries.filter(item => item.id !== id && item.id !== editingEntryOriginalId);
  allDictionaryEntries.push(entry);
  applyDictionaryFilters();
  closeNewEntryEditor();
  applyLineFilters();
}

async function finalizeReview() {
  if (!currentRunId) {
    $("status").textContent = "Run a processor before creating final output.";
    return;
  }
  const problems = updateReviewIssues();
  if (problems.invalid.length) {
    $("status").textContent = "Choose valid lemmas for all confirmed lines before creating final output.";
    return;
  }
  const lines = allLines.map(row => ({
    reviewId: row.reviewId,
    file: row.file,
    utterance: row.utterance,
    position: row.position,
    before: row.before,
    lemma: row.selectedLemma,
    confirmed: row.confirmed,
  }));
  $("finalize-review").disabled = true;
  $("status").textContent = "Creating reviewed final output…";
  try {
    const result = await json(`/api/runs/${currentRunId}/finalize`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({lines, dictionary: allDictionaryEntries}),
    });
    $("files").innerHTML = `<div class="notice">Reviewed output: ${result.confirmed_lines} confirmed lines, ${result.confirmed_dictionary_entries} confirmed dictionary entries${result.excluded_lines ? `, and ${result.excluded_lines} excluded line selections` : ""}.</div>` + result.files.map(file => `<a target="_blank" href="/api/runs/${currentRunId}/final/${encodeURIComponent(file)}">FINAL · ${escapeHtml(file)}</a>`).join("");
    updateReviewIssues(result.issues || []);
    $("status").textContent = result.excluded_lines
      ? "Final output created with warnings. Review the indicated selections."
      : "Reviewed final output created. Unconfirmed proposals were excluded.";
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    $("finalize-review").disabled = false;
  }
}

async function run() {
  const files = selectedProcessFiles();
  if (!files.length) {
    $("status").textContent = "Select at least one XML document or passage to process.";
    return;
  }
  $("run").disabled = true;
  $("status").textContent = "Running…";
  try {
    const data = await json("/api/run", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({script: $("script").value, settings: settings(), files}),
    });
    $("line-count").textContent = data.lines.length;
    $("dict-count").textContent = data.dictionary.length;
    currentRunId = data.run_id;
    deletedAddedEntries.clear();
    allLines = data.lines.map((row, index) => {
      const candidates = [...new Set((row.candidates?.length ? row.candidates : [row.new_lemma]).filter(Boolean))];
      return {
        ...row,
        reviewId: `result-${index}`,
        confirmed: false,
        selectedLemma: row.new_lemma || candidates[0] || "",
        candidates,
      };
    });
    allDictionaryEntries = data.dictionary.map(entry => ({...entry, confirmed: false, manual: false}));
    const resultFiles = [...new Set(data.lines.map(row => row.file))].sort();
    $("filter-file").innerHTML = '<option value="all">All processed files</option>' + resultFiles.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    applyLineFilters();
    applyDictionaryFilters();
    $("files").innerHTML = data.files.length ? data.files.map(file => `<a target="_blank" href="/api/runs/${data.run_id}/files/${encodeURIComponent(file)}">${escapeHtml(file)}</a>`).join("") : '<div class="empty">No output files.</div>';
    $("status").textContent = `Completed run ${data.run_id}. Repository data was not changed.`;
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    $("run").disabled = false;
  }
}

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== button.dataset.tab));
    $("line-tools").classList.toggle("hidden", button.dataset.tab !== "lines");
    $("dictionary-tools").classList.toggle("hidden", button.dataset.tab !== "dictionary");
  };
});

[$("filter-category"), $("filter-candidates"), $("filter-file")].forEach(control => {
  control.oninput = () => {
    $("filter-start").value = 1;
    applyLineFilters();
  };
});
[$("filter-start"), $("filter-limit")].forEach(control => control.oninput = applyLineFilters);
$("range-prev").onclick = () => {
  const size = Math.max(1, Number($("filter-limit").value) || 200);
  $("filter-start").value = Math.max(1, Number($("filter-start").value) - size);
  applyLineFilters();
};
$("range-next").onclick = () => {
  const size = Math.max(1, Number($("filter-limit").value) || 200);
  const next = Number($("filter-start").value) + size;
  if (next <= filteredLineCount) $("filter-start").value = next;
  applyLineFilters();
};

$("scope-tree").addEventListener("click", event => {
  if (event.target.matches("input[data-scope-id]")) event.stopPropagation();
});
$("scope-tree").addEventListener("change", event => {
  const input = event.target.closest("input[data-scope-id]");
  if (!input) return;
  const branch = input.closest("[data-scope-branch]");
  if (branch && branch.querySelector(":scope > summary input") === input) {
    scopeDescendants(branch).forEach(descendant => {
      descendant.checked = input.checked;
      descendant.indeterminate = false;
    });
  }
  updateScopeStates();
});

$("select-page").onchange = event => {
  currentPageLines.forEach(row => {
    row.confirmed = event.target.checked;
  });
  applyLineFilters();
};
$("hide-confirmed").onchange = applyLineFilters;
$("select-dictionary-page").onchange = event => {
  currentDictionaryPage.forEach(entry => {
    entry.confirmed = event.target.checked;
  });
  applyDictionaryFilters();
  applyLineFilters();
};
$("hide-confirmed-dictionary").onchange = applyDictionaryFilters;
[$("dictionary-filter-source"), $("dictionary-filter-category")].forEach(
  control => control.oninput = applyDictionaryFilters,
);
$("open-dictionary").onclick = openDictionary;
$("close-dictionary").onclick = closeDictionary;
$("close-context").onclick = closeContext;
$("dictionary-search-button").onclick = searchDictionary;
$("dictionary-query").onkeydown = event => {
  if (event.key === "Enter") searchDictionary();
};
$("add-global-entry").onclick = openNewEntryEditor;
$("finalize-review").onclick = finalizeReview;
$("cancel-new-entry").onclick = closeNewEntryEditor;
$("add-entry-field").onclick = () => $("new-entry-fields").insertAdjacentHTML("beforeend", entryFieldRow());
$("generate-entry-id").onclick = generateEntryId;
$("generate-entry-kana").onclick = generateEntryKana;
$("save-new-entry").onclick = saveNewEntry;
$("new-entry-id").oninput = () => {
  clearTimeout($("new-entry-id")._timer);
  $("new-entry-id")._timer = setTimeout(validateNewEntryId, 250);
};
$("script").onchange = loadSettings;
$("run").onclick = run;

document.addEventListener("click", event => {
  const contextWord = event.target.closest("[data-context-result]");
  if (contextWord) {
    openContext(contextWord.dataset.contextResult);
    return;
  }
  const editEntry = event.target.closest("[data-edit-entry]");
  if (editEntry) {
    editDictionaryEntry(editEntry.dataset.editEntry);
    return;
  }
  const deleteEntry = event.target.closest("[data-delete-entry]");
  if (deleteEntry) {
    deleteDictionaryEntry(deleteEntry.dataset.deleteEntry);
    return;
  }
  const tagChoice = event.target.closest("[data-entry-tag-choice]");
  if (tagChoice) {
    const picker = tagChoice.closest(".entry-tag-picker");
    picker.querySelector(".entry-tag").value = tagChoice.dataset.entryTagChoice;
    picker.querySelector(".entry-tag-menu").classList.add("hidden");
    picker.querySelector(".entry-tag-toggle").setAttribute("aria-expanded", "false");
    return;
  }
  const tagToggle = event.target.closest(".entry-tag-toggle");
  if (tagToggle) {
    const menu = tagToggle.closest(".entry-tag-picker").querySelector(".entry-tag-menu");
    document.querySelectorAll(".entry-tag-menu").forEach(other => {
      if (other !== menu) other.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
    tagToggle.setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));
    return;
  }
  const removeField = event.target.closest(".remove-entry-field");
  if (removeField) {
    removeField.closest(".entry-field-row").remove();
    return;
  }
  const link = event.target.closest("[data-lemma]");
  if (link) {
    openDictionaryEntry(link.dataset.lemma);
    return;
  }
  document.querySelectorAll(".entry-tag-menu").forEach(menu => menu.classList.add("hidden"));
});

document.addEventListener("change", event => {
  if (event.target.matches("[data-review-confirm]")) {
    const row = allLines.find(item => item.reviewId === event.target.dataset.reviewConfirm);
    if (row) row.confirmed = event.target.checked;
    applyLineFilters();
  } else if (event.target.matches("[data-review-choice]")) {
    const row = allLines.find(item => item.reviewId === event.target.dataset.reviewChoice);
    if (row) {
      row.selectedLemma = event.target.value;
      row.confirmed = false;
    }
    applyLineFilters();
  } else if (event.target.matches("[data-dictionary-confirm]")) {
    const entry = allDictionaryEntries.find(item => item.id === event.target.dataset.dictionaryConfirm);
    if (entry) entry.confirmed = event.target.checked;
    applyLineFilters();
    applyDictionaryFilters();
  }
});

loadScripts();
