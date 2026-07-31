"use strict";

const $ = id => document.getElementById(id);
let documentGroups = [];
let activeDocument = null;
let activePassage = null;
let currentPassages = [];
let currentTreeData = null;
let selectedNodeId = null;
let dictionaryTimer = null;
let documentSearchTimer = null;
let globalSearchTimer = null;
let editMode = false;
let currentEditorPage = null;
const openEditorPages = new Set();
const collapsedNodeIds = new Set();
const passageCache = new Map();

async function apiFetch(path) {
  const response = await fetch(path);
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

function showError(error) {
  $("app-message").textContent = error.message || String(error);
  $("app-message").classList.remove("hidden");
}

function clearError() {
  $("app-message").classList.add("hidden");
  $("app-message").textContent = "";
}

function setTab(name) {
  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("hidden", content.id !== `tab-${name}`);
  });
}

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

function showSidebarView(name) {
  const workspace = document.querySelector(".workspace");
  workspace.classList.remove("sidebar-collapsed");
  document.querySelectorAll("[data-sidebar-view]").forEach(button => {
    const active = button.dataset.sidebarView === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll(".sidebar-view").forEach(view => {
    view.classList.toggle("hidden", view.id !== `sidebar-${name}`);
  });
  if (name === "search") $("global-search").focus();
}

document.querySelectorAll("[data-sidebar-view]").forEach(button => {
  button.addEventListener("click", () => {
    const workspace = document.querySelector(".workspace");
    const alreadyActive = button.classList.contains("active");
    if (alreadyActive && !workspace.classList.contains("sidebar-collapsed")) {
      workspace.classList.add("sidebar-collapsed");
      button.setAttribute("aria-pressed", "false");
      return;
    }
    showSidebarView(button.dataset.sidebarView);
  });
});

function showEditorPage(name) {
  openEditorPages.add(name);
  currentEditorPage = name;
  $("editor-tabs").classList.remove("hidden");
  document.querySelectorAll("[data-editor-tab]").forEach(tab => {
    const pageName = tab.dataset.editorTab;
    tab.classList.toggle("hidden", !openEditorPages.has(pageName));
    tab.classList.toggle("active", pageName === name);
  });
  document.querySelectorAll(".editor-page").forEach(page => {
    page.classList.toggle("hidden", page.id !== `editor-page-${name}`);
  });
  $("editor-empty").classList.add("hidden");
}

function closeEditorPage(name) {
  openEditorPages.delete(name);
  $(`editor-tab-${name}`).classList.add("hidden");
  $(`editor-page-${name}`).classList.add("hidden");
  if (name === "tree") closeNodeEditor();
  if (currentEditorPage !== name) return;
  const nextPage = [...openEditorPages].at(-1);
  if (nextPage) {
    showEditorPage(nextPage);
  } else {
    currentEditorPage = null;
    $("editor-tabs").classList.add("hidden");
    $("editor-empty").classList.remove("hidden");
  }
}

document.querySelectorAll("[data-editor-page]").forEach(button => {
  button.addEventListener("click", () => showEditorPage(button.dataset.editorPage));
});

document.querySelectorAll("[data-close-editor]").forEach(button => {
  button.addEventListener("click", () => closeEditorPage(button.dataset.closeEditor));
});

$("toggle-text").addEventListener("click", event => {
  const panel = $("text-panel");
  const collapsed = panel.classList.toggle("collapsed");
  event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  event.currentTarget.querySelector(".disclosure-icon").textContent =
    collapsed ? "›" : "⌄";
});

$("toggle-tree-panel").addEventListener("click", event => {
  const panel = $("tree-panel");
  const collapsed = panel.classList.toggle("collapsed");
  $("tab-tree").classList.toggle("tree-collapsed", collapsed);
  event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  event.currentTarget.querySelector(".disclosure-icon").textContent =
    collapsed ? "›" : "⌄";
});

document.querySelectorAll("[data-text-layout]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-text-layout]").forEach(item => {
      item.classList.toggle("active", item === button);
    });
    $("raw-text-lines").classList.toggle(
      "two-column", button.dataset.textLayout === "two-column"
    );
  });
});

function findDocument(source, documentId) {
  return documentGroups
    .flatMap(group => group.documents)
    .find(documentData =>
      documentData.source === source
      && documentData.document_id === documentId
    );
}

function groupByCollection(documents) {
  const collections = new Map();
  documents.forEach(document => {
    if (!collections.has(document.collection)) {
      collections.set(document.collection, []);
    }
    collections.get(document.collection).push(document);
  });
  return collections;
}

function normalizedSearch(value) {
  return String(value || "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function isExactPassageId(value) {
  return /^[A-Za-z]+\.\d+(?:\.\d+)+$/.test(value.trim());
}

function matchingDocuments(query, pinnedDocumentId = null) {
  const normalized = normalizedSearch(query);
  return documentGroups.map(group => ({
    ...group,
    documents: group.documents.filter(documentData => {
      if (documentData.id === pinnedDocumentId) return true;
      if (!normalized) return true;
      return [
        documentData.label,
        documentData.document_id,
        documentData.collection,
        documentData.filename,
      ].some(value => normalizedSearch(value).includes(normalized));
    }),
  })).filter(group => group.documents.length);
}

function documentDetailsElement(documentId) {
  return [...document.querySelectorAll(".document-node")].find(
    item => item.dataset.documentId === documentId
  );
}

function renderDocuments(pinnedDocumentId = null) {
  const query = $("document-search").value.trim();
  const container = $("document-groups");
  container.innerHTML = "";
  const groups = matchingDocuments(query, pinnedDocumentId);
  const resultCount = groups.reduce(
    (total, group) => total + group.documents.length,
    0,
  );

  groups.forEach((group, groupIndex) => {
    const section = document.createElement("details");
    section.className = "document-source";
    section.open = Boolean(query)
      || activeDocument?.source === group.id
      || groupIndex === 0;

    const summary = document.createElement("summary");
    const summaryText = document.createElement("span");
    summaryText.innerHTML = `<strong>${group.label}</strong><small>${group.description}</small>`;
    const count = document.createElement("span");
    count.className = "count-badge";
    count.textContent = group.documents.length;
    summary.append(summaryText, count);
    section.appendChild(summary);

    const collectionContainer = document.createElement("div");
    collectionContainer.className = "collection-list";
    groupByCollection(group.documents).forEach((items, collection) => {
      const collectionBlock = document.createElement("details");
      collectionBlock.className = "collection-node";
      collectionBlock.open = Boolean(query)
        || (
          activeDocument?.source === group.id
          && activeDocument.collection === collection
        );
      const heading = document.createElement("summary");
      heading.className = "collection-heading";
      heading.innerHTML = `<strong>${collection}</strong><small>${items.length}</small>`;
      collectionBlock.appendChild(heading);

      const documents = document.createElement("div");
      documents.className = "document-node-list";

      items.forEach(documentData => {
        const documentNode = document.createElement("details");
        documentNode.className = "document-node";
        documentNode.dataset.documentId = documentData.id;
        documentNode.classList.toggle(
          "active", activeDocument?.id === documentData.id
        );
        documentNode.open = activeDocument?.id === documentData.id;

        const documentSummary = document.createElement("summary");
        documentSummary.innerHTML =
          `<strong>${documentData.label}</strong><small>${documentData.utterance_count.toLocaleString()} passages</small>`;
        const passageContainer = document.createElement("div");
        passageContainer.className = "inline-passage-list";
        passageContainer.innerHTML =
          '<div class="sidebar-loading">Expand to load passages…</div>';
        documentNode.append(documentSummary, passageContainer);
        documentNode.addEventListener("toggle", () => {
          if (documentNode.open) {
            selectDocument(documentData, null, passageContainer);
          }
        });
        documents.appendChild(documentNode);
      });
      collectionBlock.appendChild(documents);
      collectionContainer.appendChild(collectionBlock);
    });
    section.appendChild(collectionContainer);
    container.appendChild(section);
  });

  if (!container.children.length) {
    container.innerHTML = '<div class="empty-state small">No documents match this filter.</div>';
  }
  if (!query) {
    $("search-message").textContent =
      "Enter a passage ID to open it directly.";
  } else if (isExactPassageId(query)) {
    $("search-message").textContent = "Opening exact passage…";
  } else {
    $("search-message").textContent =
      `${resultCount} matching document${resultCount === 1 ? "" : "s"}. Expand a document to choose a passage.`;
  }

  if (query && resultCount === 1 && !isExactPassageId(query)) {
    const onlyDocument = groups[0].documents[0];
    const node = documentDetailsElement(onlyDocument.id);
    if (node) node.open = true;
  }
}

async function loadDocuments() {
  clearError();
  try {
    documentGroups = await apiFetch("/api/documents");
    const documentCount = documentGroups.reduce(
      (total, group) => total + group.document_count, 0
    );
    const passageCount = documentGroups.reduce(
      (total, group) => total + group.utterance_count, 0
    );
    $("data-summary").textContent =
      `${documentCount.toLocaleString()} documents · ${passageCount.toLocaleString()} passages`;
    renderDocuments();
  } catch (error) {
    showError(error);
    $("document-groups").innerHTML =
      '<div class="empty-state small">Documents could not be loaded.</div>';
  }
}

async function openExactPassage(query) {
  clearError();
  const match = await apiFetch(`/api/poems?q=${encodeURIComponent(query)}`);
  const documentData = findDocument(match.source, match.document_id);
  if (!documentData) throw new Error("The passage's document is unavailable.");
  $("document-search").value = match.sentence_id;
  renderDocuments(documentData.id);
  const documentNode = documentDetailsElement(documentData.id);
  if (!documentNode) throw new Error("The passage's document is unavailable.");
  documentNode.closest(".document-source").open = true;
  documentNode.closest(".collection-node").open = true;
  documentNode.open = true;
  await selectDocument(
    documentData,
    match.sentence_id,
    documentNode.querySelector(".inline-passage-list"),
  );
  documentNode.scrollIntoView({block: "nearest"});
  $("search-message").textContent = `Opened ${match.sentence_id}.`;
}

$("document-search").addEventListener("input", event => {
  clearTimeout(documentSearchTimer);
  const query = event.target.value.trim();
  renderDocuments();
  if (isExactPassageId(query)) {
    documentSearchTimer = setTimeout(() => {
      openExactPassage(query).catch(error => {
        $("search-message").textContent = error.message;
      });
    }, 120);
  }
});

$("document-search").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const query = event.currentTarget.value.trim();
  if (!isExactPassageId(query)) return;
  event.preventDefault();
  clearTimeout(documentSearchTimer);
  openExactPassage(query).catch(error => {
    $("search-message").textContent = error.message;
  });
});

function renderCorpusSearchResults(results, query) {
  const container = $("search-results");
  container.innerHTML = "";
  $("search-results-title").textContent = `Search: ${query}`;
  $("search-result-count").textContent =
    `${results.length}${results.length === 200 ? "+" : ""} result${results.length === 1 ? "" : "s"}`;
  $("search-results-message").textContent = results.length
    ? "Select a result to open its syntax tree."
    : "No corpus text matched this search.";
  results.forEach(result => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "corpus-search-result";
    const heading = document.createElement("span");
    heading.className = "corpus-search-result-heading";
    const sentence = document.createElement("strong");
    sentence.textContent = result.sentence_id;
    const location = document.createElement("span");
    location.textContent =
      `${result.label} · ${result.source === "text" ? "Texts under editing" : "Uploaded trees"}`;
    heading.append(sentence, location);
    const preview = document.createElement("span");
    preview.className = "corpus-search-preview";
    preview.textContent = result.preview || result.header || "No text preview";
    button.append(heading, preview);
    button.addEventListener("click", async () => {
      const documentData = findDocument(result.source, result.document_id);
      if (!documentData) {
        showError(new Error("This result's document is unavailable."));
        return;
      }
      await selectDocument(documentData, result.sentence_id);
    });
    container.appendChild(button);
  });
}

async function performCorpusSearch(query) {
  const normalized = query.trim();
  showEditorPage("search");
  $("search-results").innerHTML = "";
  if (!normalized) {
    $("global-search-message").textContent =
      "Search transcriptions, kanji, headers, and word forms.";
    $("search-results-title").textContent = "Search results";
    $("search-result-count").textContent = "";
    $("search-results-message").textContent = "Enter a search in the sidebar.";
    return;
  }
  clearError();
  $("global-search-message").textContent = "Searching…";
  $("search-results-message").textContent = "Searching the current corpus…";
  try {
    const results = await apiFetch(
      `/api/search?q=${encodeURIComponent(normalized)}`
    );
    $("global-search-message").textContent =
      `${results.length}${results.length === 200 ? "+" : ""} result${results.length === 1 ? "" : "s"}.`;
    renderCorpusSearchResults(results, normalized);
  } catch (error) {
    showError(error);
    $("global-search-message").textContent = "Search failed.";
    $("search-results-message").textContent = "The corpus search could not be completed.";
  }
}

$("global-search-form").addEventListener("submit", event => {
  event.preventDefault();
  clearTimeout(globalSearchTimer);
  performCorpusSearch($("global-search").value);
});

$("global-search").addEventListener("input", event => {
  clearTimeout(globalSearchTimer);
  globalSearchTimer = setTimeout(
    () => performCorpusSearch(event.target.value),
    300,
  );
});

async function loadPassages(documentData) {
  if (!passageCache.has(documentData.id)) {
    passageCache.set(
      documentData.id,
      apiFetch(
        `/api/documents/${encodeURIComponent(documentData.source)}/${encodeURIComponent(documentData.document_id)}`
      ),
    );
  }
  return passageCache.get(documentData.id);
}

async function selectDocument(
  documentData,
  targetSentenceId = null,
  passageContainer = null,
) {
  clearError();
  const changedDocument = activeDocument?.id !== documentData.id;
  activeDocument = documentData;
  document.querySelectorAll(".document-node").forEach(node => {
    node.classList.toggle("active", node.dataset.documentId === documentData.id);
  });
  if (changedDocument && !targetSentenceId) {
    activePassage = null;
    currentTreeData = null;
    collapsedNodeIds.clear();
    closeNodeEditor();
    $("detail-breadcrumb").textContent =
      `${documentData.source === "text" ? "TEXTS UNDER EDITING" : "UPLOADED TREES"} · ${documentData.collection}`;
    $("detail-title").textContent = "Select a passage";
    $("tree-stats").classList.add("hidden");
    $("text-panel").classList.add("hidden");
    $("tree-container").innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">⌘</span>
        <strong>No passage selected</strong>
        <p>Choose a passage under ${documentData.label} to inspect its syntax tree.</p>
      </div>`;
  }
  const documentNode =
    documentDetailsElement(documentData.id);
  const container = passageContainer
    || documentNode?.querySelector(".inline-passage-list");
  if (container) {
    container.innerHTML = '<div class="sidebar-loading">Loading passages…</div>';
  }
  try {
    currentPassages = await loadPassages(documentData);
    if (container) renderPassages(documentData, currentPassages, container);
    if (targetSentenceId) {
      const target = currentPassages.find(
        passage => passage.sentence_id === targetSentenceId
      );
      if (!target) throw new Error(`Poem '${targetSentenceId}' was not found.`);
      await selectPassage(target);
    }
  } catch (error) {
    showError(error);
    if (container) {
      container.innerHTML =
        '<div class="sidebar-loading">Unable to load passages.</div>';
    }
  }
}

function renderPassages(documentData, passages, container) {
  container.innerHTML = "";
  passages.forEach((passage, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "passage-item";
    button.classList.toggle(
      "active", activePassage?.sentence_id === passage.sentence_id
    );

    const position = document.createElement("span");
    position.className = "passage-position";
    position.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.className = "passage-item-text";
    const title = document.createElement("strong");
    title.textContent = passage.sentence_id || `Passage ${index + 1}`;
    const header = document.createElement("span");
    header.textContent = passage.header || "No transcription header";
    const meta = document.createElement("small");
    meta.textContent =
      `${passage.token_count} tokens · ${passage.raw_sentence_count} text segment${passage.raw_sentence_count === 1 ? "" : "s"}`;
    text.append(title, header, meta);
    button.append(position, text);
    button.addEventListener("click", () => {
      activeDocument = documentData;
      selectPassage(passage);
    });
    container.appendChild(button);
  });
}

function draftStorageKey() {
  if (!activeDocument || !activePassage) return "";
  return [
    "coj-tree-draft",
    activeDocument.source,
    activeDocument.document_id,
    activePassage.sentence_id,
  ].join(":");
}

function editableNodeCopy(node) {
  const copy = {tag: String(node.tag || "NEW")};
  if (node.lemma) copy.lemma = String(node.lemma);
  if (node.children?.length) {
    copy.children = node.children.map(editableNodeCopy);
  } else {
    copy.form = String(node.form || "");
    copy.phon = String(node.phon || "");
  }
  return copy;
}

function restoreTreeDraft(data) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(draftStorageKey()) || "null");
  } catch {
    saved = null;
  }
  if (Array.isArray(saved)) {
    data.roots = saved.map(editableNodeCopy);
    $("reset-tree-draft").classList.remove("hidden");
  } else {
    $("reset-tree-draft").classList.add("hidden");
  }
}

function saveTreeDraft() {
  if (!currentTreeData) return;
  localStorage.setItem(
    draftStorageKey(),
    JSON.stringify(currentTreeData.roots.map(editableNodeCopy)),
  );
  $("reset-tree-draft").classList.remove("hidden");
}

function calculateTreeStats(roots) {
  let nodes = 0;
  let leaves = 0;
  const visit = node => {
    nodes += 1;
    if (node.children?.length) node.children.forEach(visit);
    else leaves += 1;
  };
  roots.forEach(visit);
  return {nodes, leaves};
}

async function selectPassage(passage) {
  if (!activeDocument) return;
  clearError();
  setEditMode(false);
  activePassage = passage;
  $("editor-tree-label").textContent = passage.sentence_id || "Syntax tree";
  showEditorPage("tree");
  document.querySelectorAll(".passage-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.querySelector("strong")?.textContent === passage.sentence_id,
    );
  });
  $("detail-title").textContent = passage.sentence_id;
  $("detail-breadcrumb").textContent =
    `${activeDocument.label} · ${passage.token_count} tokens`;
  $("tree-container").innerHTML = '<div class="loading-card">Rendering syntax tree…</div>';
  setTab("tree");

  try {
    const data = await apiFetch(
      `/api/utterances/${encodeURIComponent(activeDocument.source)}/${encodeURIComponent(activeDocument.document_id)}/${encodeURIComponent(passage.sentence_id)}/tree`
    );
    collapsedNodeIds.clear();
    closeNodeEditor();
    restoreTreeDraft(data);
    prepareTreeData(data);
    data.stats = calculateTreeStats(data.roots);
    currentTreeData = data;
    $("node-count").textContent = data.stats.nodes.toLocaleString();
    $("leaf-count").textContent = data.stats.leaves.toLocaleString();
    $("tree-stats").classList.remove("hidden");
    renderRawText(data.raw_text);
    renderSvgTree(data);
  } catch (error) {
    showError(error);
    $("tree-container").innerHTML =
      '<div class="empty-state">This tree could not be rendered.</div>';
  }
}

function scriptStyleClass(phon, svg = false) {
  const normalized = String(phon || "").toUpperCase();
  if (normalized.includes("PHON")) return svg ? "svg-script-phon" : "script-phon";
  if (normalized === "NLOG") return svg ? "svg-script-nlog" : "script-nlog";
  return svg ? "svg-script-plain" : "script-plain";
}

function renderRawText(sentences) {
  if (!sentences.length) {
    $("text-panel").classList.add("hidden");
    return;
  }
  $("raw-text-lines").innerHTML = "";
  sentences.forEach(sentence => {
    const line = document.createElement("div");
    line.className = "raw-text-line";
    const number = document.createElement("span");
    number.className = "raw-text-number";
    number.textContent = sentence.number;
    const kanji = document.createElement("p");
    kanji.className = "raw-kanji";
    kanji.textContent = sentence.kanji || "—";
    const transcription = document.createElement("p");
    transcription.className = "raw-transcription";
    const tokens = sentence.tokens?.length
      ? sentence.tokens
      : sentence.transcription.split().map(text => ({text, phon: ""}));
    tokens.forEach((token, index) => {
      if (index) transcription.append(" ");
      const word = document.createElement("span");
      word.className = `transcription-word ${scriptStyleClass(token.phon)}`;
      word.textContent = token.text;
      if (token.phon) word.title = token.phon;
      transcription.appendChild(word);
    });
    line.append(number, kanji, transcription);
    $("raw-text-lines").appendChild(line);
  });
  $("text-panel").classList.remove("hidden");
}

function rowHeight() {
  return Number($("slider-rowh").value);
}

function columnSpacing() {
  return Number($("slider-colw").value);
}

function treeScale() {
  return Number($("slider-scale").value) / 100;
}

function prepareTreeData(data) {
  const leaves = [];
  const assignIds = (node, path) => {
    node._nodeId = path;
    if (node.children?.length) {
      node.children.forEach((child, index) => {
        assignIds(child, `${path}.${index}`);
      });
    } else if (node.form) {
      leaves.push(node);
    }
  };
  data.roots.forEach((root, index) => assignIds(root, String(index)));

  let leafIndex = 0;
  data.raw_text.forEach(sentence => {
    (sentence.tokens || []).forEach(() => {
      if (leafIndex < leaves.length) {
        leaves[leafIndex]._sentenceNumber = sentence.number;
      }
      leafIndex += 1;
    });
  });
}

function treeOptions() {
  return {
    lemma: $("tog-lemma").checked,
    phon: $("tog-phon").checked,
    treeKanji: $("tog-tree-kanji").checked,
    nullNodes: $("tog-null").checked,
    bottomUp: $("tog-bottomup").checked,
    lemmaPosition: $("lemma-position").value,
  };
}

[
  ["slider-rowh", "slider-rowh-val", value => `${value} px`],
  ["slider-colw", "slider-colw-val", value => `${value} px`],
  ["slider-scale", "slider-scale-val", value => `${value}%`],
].forEach(([sliderId, outputId, format]) => {
  $(sliderId).addEventListener("input", event => {
    $(outputId).textContent = format(event.target.value);
    if (currentTreeData) renderSvgTree(currentTreeData);
  });
});

["tog-lemma", "lemma-position", "tog-phon", "tog-tree-kanji", "tog-null", "tog-bottomup"]
  .forEach(id => {
    $(id).addEventListener("change", () => {
      $("lemma-position").disabled = !$("tog-lemma").checked;
      if (currentTreeData) renderSvgTree(currentTreeData);
    });
  });

$("expand-all").addEventListener("click", () => {
  collapsedNodeIds.clear();
  if (currentTreeData) renderSvgTree(currentTreeData);
});

function updateFullscreenButton() {
  $("toggle-fullscreen").textContent =
    document.fullscreenElement === $("tab-tree")
      ? "Exit full screen"
      : "Full screen";
}

$("toggle-fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await $("tab-tree").requestFullscreen();
    }
  } catch (error) {
    showError(new Error(`Full-screen mode is unavailable: ${error.message}`));
  }
});
document.addEventListener("fullscreenchange", updateFullscreenButton);

const SVG_NS = "http://www.w3.org/2000/svg";
const HORIZONTAL_PADDING = 38;
const ANNOTATION_HEIGHT = 112;
const CHARACTER_WIDTH = 7.4;

function svgElement(tag, attributes = {}, text = null) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  if (text !== null) element.textContent = text;
  return element;
}

function isNullNode(node) {
  return node.form !== undefined && node.form === "" && node.phon === "";
}

function descendantLeaves(node, options) {
  if (!node.children?.length) {
    return !options.nullNodes && isNullNode(node) ? [] : [node];
  }
  return node.children.flatMap(child => descendantLeaves(child, options));
}

function buildDisplayNode(node, options) {
  if (!options.nullNodes && isNullNode(node)) return null;
  if (!node.children) return {...node};
  const leaves = descendantLeaves(node, options);
  if (collapsedNodeIds.has(node._nodeId)) {
    const collapsedTokens = leaves
      .filter(leaf => leaf.form)
      .map(leaf => ({
        text: leaf.form,
        phon: leaf.phon || "",
        lemma: leaf.lemma || "",
      }));
    return {
      ...node,
      children: undefined,
      form: collapsedTokens.map(token => token.text).join(""),
      phon: "",
      _toggleable: true,
      _collapsed: true,
      _collapsedTokens: collapsedTokens,
      _sentenceNumbers: [
        ...new Set(leaves.map(leaf => leaf._sentenceNumber).filter(Boolean)),
      ],
    };
  }
  const children = node.children
    .map(child => buildDisplayNode(child, options))
    .filter(Boolean);
  if (!children.length) return null;
  return {
    ...node,
    children,
    _toggleable: true,
    _sentenceNumbers: [
      ...new Set(children.flatMap(child =>
        child._sentenceNumbers || [child._sentenceNumber].filter(Boolean)
      )),
    ],
  };
}

function labelWidth(node, options) {
  let width = node.tag.length * CHARACTER_WIDTH;
  if (!node.children) {
    if (node.form) {
      width = Math.max(width, node.form.length * CHARACTER_WIDTH);
    }
    if (options.phon && node.phon) {
      width = Math.max(width, node.phon.length * CHARACTER_WIDTH);
    }
    if (options.lemma && node.lemma) {
      width = Math.max(width, node.lemma.length * CHARACTER_WIDTH);
    }
    if (options.treeKanji && node._kanjiWidth) {
      width = Math.max(width, node._kanjiWidth);
    }
  }
  return width + 20;
}

function leafPositions(node) {
  if (!node.children) return [node._x];
  return node.children.flatMap(leafPositions);
}

function assignHorizontalPosition(node, counter, options) {
  if (!node.children) {
    const extraSpacing = Math.max(0, columnSpacing() - 28);
    node._slotWidth = labelWidth(node, options) + extraSpacing;
    node._x = counter.value + node._slotWidth / 2;
    counter.value += node._slotWidth;
    return;
  }
  node.children.forEach(child =>
    assignHorizontalPosition(child, counter, options)
  );
  const positions = leafPositions(node);
  node._x = positions.reduce((total, value) => total + value, 0) / positions.length;
}

function assignDepth(node, depth = 0) {
  node._row = depth;
  node.children?.forEach(child => assignDepth(child, depth + 1));
}

function assignHeight(node) {
  if (!node.children) {
    node._height = 0;
    return 0;
  }
  node._height = Math.max(...node.children.map(assignHeight)) + 1;
  return node._height;
}

function alignRowsFromBottom(node, totalHeight) {
  node._row = totalHeight - node._height;
  node.children?.forEach(child => alignRowsFromBottom(child, totalHeight));
}

function xPosition(value) {
  return HORIZONTAL_PADDING + value;
}

function yPosition(row, topPadding) {
  return topPadding + row * rowHeight();
}

function renderNode(node, svg, columnWidth, maxRow, topPadding, options) {
  const centerX = xPosition(node._x, columnWidth);
  const centerY = yPosition(node._row, topPadding);
  const hasLemma = options.lemma && Boolean(node.lemma);
  const lemmaUnderForm = hasLemma
    && options.lemmaPosition === "form"
    && !node.children
    && !node._collapsed;
  const lemmaUnderTag = hasLemma && !lemmaUnderForm;
  const edgeOffset = lemmaUnderTag ? 22 : 9;
  const controls = svgElement("g", {class: "tree-node-controls"});

  if (node.tag) {
    controls.appendChild(svgElement("text", {
      x: centerX,
      y: centerY + 5,
      class: `tree-label${node._toggleable ? " node-toggle" : ""}${node._collapsed ? " collapsed" : ""}`,
      ...(node._toggleable ? {
        "data-node-id": node._nodeId,
        role: "button",
        tabindex: "0",
        "aria-label": `${node._collapsed ? "Expand" : "Collapse"} ${node.tag}`,
      } : {}),
      "text-anchor": "middle",
    }, node.tag));
  }
  if (editMode && node._nodeId !== undefined) {
    controls.appendChild(svgElement("text", {
      x: centerX - Math.max(18, node.tag.length * 3.5 + 10),
      y: centerY + 5,
      class: "node-edit",
      "data-edit-node-id": node._nodeId,
      role: "button",
      tabindex: "0",
      "aria-label": `Edit ${node.tag || "node"}`,
      "text-anchor": "middle",
    }, "✎"));
  }
  if (node._toggleable) {
    controls.appendChild(svgElement("text", {
      x: centerX + Math.max(18, node.tag.length * 3.5 + 8),
      y: centerY + 5,
      class: `node-disclosure ${node._collapsed ? "collapsed" : "expanded"}`,
      "data-node-id": node._nodeId,
      role: "button",
      "aria-hidden": "true",
      "text-anchor": "middle",
    }, node._collapsed ? "+" : "−"));
  }
  svg.appendChild(controls);
  if (lemmaUnderTag) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: centerY + 19,
      class: "lemma-label interactive-lemma",
      "data-lemma": node.lemma,
      "text-anchor": "middle",
    }, node.lemma));
  }

  if (node.children) {
    node.children.forEach(child => {
      const childX = xPosition(child._x, columnWidth);
      const childY = yPosition(child._row, topPadding);
      svg.appendChild(svgElement("line", {
        x1: centerX,
        y1: centerY + edgeOffset,
        x2: childX,
        y2: childY - 7,
        class: "tree-edge",
      }));
      renderNode(
        child, svg, columnWidth, maxRow, topPadding, options
      );
    });
    return;
  }

  const annotationY = yPosition(maxRow, topPadding) + 30;
  if (node._row < maxRow) {
    svg.appendChild(svgElement("line", {
      x1: centerX,
      y1: centerY + edgeOffset,
      x2: centerX,
      y2: annotationY - 17,
      class: "tree-edge leaf-edge",
    }));
  }
  let offset = annotationY;
  if (node._collapsedTokens?.length) {
    const combined = svgElement("text", {
      x: centerX,
      y: offset,
      class: "form-label",
      "text-anchor": "middle",
    });
    node._collapsedTokens.forEach(token => {
      combined.appendChild(svgElement("tspan", {
        class: `${scriptStyleClass(token.phon, true)}${token.lemma ? " interactive-form" : ""}`,
        ...(token.lemma ? {
          "data-lemma": token.lemma,
          role: "link",
          tabindex: "0",
        } : {}),
      }, token.text));
    });
    svg.appendChild(combined);
  } else if (node.form) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: `form-label ${scriptStyleClass(node.phon, true)}${node.lemma ? " interactive-form" : ""}`,
      ...(node.lemma ? {
        "data-lemma": node.lemma,
        role: "link",
        tabindex: "0",
      } : {}),
      "text-anchor": "middle",
    }, node.form));
  }
  offset += 17;
  if (lemmaUnderForm) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: "lemma-label interactive-lemma",
      "data-lemma": node.lemma,
      "text-anchor": "middle",
    }, node.lemma));
    offset += 17;
  }
  if (options.phon && node.phon) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: "phon-label",
      "text-anchor": "middle",
    }, node.phon));
  }
}

function visibleLeafUnits(node) {
  if (!node.children) return [node];
  return node.children.flatMap(visibleLeafUnits);
}

function assignCollapsedKanjiWidths(data, tree) {
  const kanjiByNumber = new Map(
    data.raw_text
      .filter(sentence => sentence.kanji)
      .map(sentence => [sentence.number, sentence.kanji]),
  );
  visibleLeafUnits(tree).forEach(unit => {
    delete unit._kanjiWidth;
    if (!unit._collapsed) return;
    const numbers = unit._sentenceNumbers || [unit._sentenceNumber];
    const text = numbers
      .map(number => kanjiByNumber.get(number))
      .filter(Boolean)
      .join("　");
    if (text) unit._kanjiWidth = Array.from(text).length * 16 + 24;
  });
}

function renderTreeKanji(data, tree, svg, columnWidth, maxRow, topPadding) {
  const units = visibleLeafUnits(tree);
  const baseY = yPosition(maxRow, topPadding) + 86;
  const groups = new Map();
  data.raw_text.forEach(sentence => {
    if (!sentence.kanji) return;
    const matches = units.filter(unit => {
      const numbers = unit._sentenceNumbers || [unit._sentenceNumber];
      return numbers.includes(sentence.number);
    });
    if (!matches.length) return;
    const first = matches[0];
    const last = matches[matches.length - 1];
    const left = xPosition(
      first._x - (first._slotWidth || columnSpacing()) / 2 + 10
    );
    const right = xPosition(
      last._x + (last._slotWidth || columnSpacing()) / 2 - 10
    );
    const key = `${left}:${right}`;
    if (!groups.has(key)) groups.set(key, {left, right, kanji: []});
    groups.get(key).kanji.push(sentence.kanji);
  });
  groups.forEach(group => {
    const {left, right} = group;
    const text = group.kanji.join("　");
    const center = (left + right) / 2;
    svg.appendChild(svgElement("line", {
      x1: left,
      y1: baseY - 19,
      x2: right,
      y2: baseY - 19,
      class: "kanji-span-line",
    }));
    svg.appendChild(svgElement("text", {
      x: center,
      y: baseY,
      class: "tree-kanji-label",
      "text-anchor": "middle",
    }, text));
  });
}

function renderSvgTree(data) {
  const container = $("tree-container");
  container.innerHTML = "";
  $("expand-all").disabled = collapsedNodeIds.size === 0;
  const options = treeOptions();
  const roots = data.roots
    .map(root => buildDisplayNode(root, options))
    .filter(Boolean);
  if (!roots.length) {
    container.innerHTML = '<div class="empty-state">Nothing matches the current display settings.</div>';
    return;
  }

  const tree = roots.length === 1
    ? roots[0]
    : {
        tag: "",
        children: roots,
        _sentenceNumbers: [
          ...new Set(roots.flatMap(root => root._sentenceNumbers || [])),
        ],
      };
  assignCollapsedKanjiWidths(data, tree);
  const columnWidth = columnSpacing();
  const counter = {value: 0};
  assignHorizontalPosition(tree, counter, options);

  let maxRow;
  if (options.bottomUp) {
    maxRow = assignHeight(tree);
    alignRowsFromBottom(tree, maxRow);
  } else {
    assignDepth(tree);
    maxRow = 0;
    const findMax = node => {
      maxRow = Math.max(maxRow, node._row);
      node.children?.forEach(findMax);
    };
    findMax(tree);
  }

  const topPadding = 38;
  const width = counter.value + HORIZONTAL_PADDING * 2;
  const height = topPadding + maxRow * rowHeight() + ANNOTATION_HEIGHT
    + (options.treeKanji ? 48 : 0);
  const scale = treeScale();
  const svg = svgElement("svg", {
    width: width * scale,
    height: height * scale,
    viewBox: `0 0 ${width} ${height}`,
    class: "tree-svg",
    role: "img",
    "aria-label": `Syntax tree for ${data.sentence_id}`,
  });

  renderNode(tree, svg, columnWidth, maxRow, topPadding, options);
  if (options.treeKanji) {
    renderTreeKanji(data, tree, svg, columnWidth, maxRow, topPadding);
  }
  container.appendChild(svg);
}

function toggleTreeNode(nodeId) {
  if (!nodeId) return;
  if (collapsedNodeIds.has(nodeId)) {
    collapsedNodeIds.delete(nodeId);
  } else {
    collapsedNodeIds.add(nodeId);
  }
  renderSvgTree(currentTreeData);
}

function findNodeLocation(nodeId, nodes = currentTreeData?.roots || []) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node._nodeId === nodeId) return {node, nodes, index};
    const nested = findNodeLocation(nodeId, node.children || []);
    if (nested) return nested;
  }
  return null;
}

function setEditMode(enabled) {
  editMode = Boolean(enabled);
  const button = $("toggle-edit-mode");
  button.setAttribute("aria-pressed", String(editMode));
  button.classList.toggle("active", editMode);
  button.textContent = editMode ? "Done editing" : "Edit";
  if (!editMode) closeNodeEditor();
  if (currentTreeData) renderSvgTree(currentTreeData);
}

$("toggle-edit-mode").addEventListener("click", () => {
  setEditMode(!editMode);
});

function closeNodeEditor() {
  selectedNodeId = null;
  $("node-editor").classList.add("hidden");
}

function openNodeEditor(nodeId) {
  if (!editMode) return;
  const location = findNodeLocation(nodeId);
  if (!location) return;
  selectedNodeId = nodeId;
  const {node} = location;
  const isLeaf = !node.children?.length;
  $("node-tag").value = node.tag || "";
  $("node-form").value = isLeaf ? node.form || "" : "";
  $("node-phon").value = isLeaf ? node.phon || "" : "";
  $("node-lemma").value = node.lemma || "";
  $("leaf-fields").classList.toggle("hidden", !isLeaf);
  $("node-kind-note").textContent = isLeaf
    ? "This is a leaf node; its word, script tag, and lemma can be edited."
    : `This branch has ${node.children.length} child node${node.children.length === 1 ? "" : "s"}.`;
  $("node-editor").classList.remove("hidden");
  $("node-tag").focus();
}

function refreshEditedTree() {
  collapsedNodeIds.clear();
  prepareTreeData(currentTreeData);
  currentTreeData.stats = calculateTreeStats(currentTreeData.roots);
  $("node-count").textContent = currentTreeData.stats.nodes.toLocaleString();
  $("leaf-count").textContent = currentTreeData.stats.leaves.toLocaleString();
  saveTreeDraft();
  renderSvgTree(currentTreeData);
}

$("close-node-editor").addEventListener("click", closeNodeEditor);

$("node-editor-form").addEventListener("submit", event => {
  event.preventDefault();
  const location = findNodeLocation(selectedNodeId);
  if (!location) return;
  const {node} = location;
  node.tag = $("node-tag").value.trim() || "NEW";
  const lemma = $("node-lemma").value.trim();
  if (lemma) node.lemma = lemma;
  else delete node.lemma;
  if (!node.children?.length) {
    node.form = $("node-form").value;
    node.phon = $("node-phon").value.trim();
  }
  refreshEditedTree();
  openNodeEditor(node._nodeId);
});

$("add-child").addEventListener("click", () => {
  const location = findNodeLocation(selectedNodeId);
  if (!location) return;
  const {node} = location;
  if (node.children?.length) {
    node.children.push({tag: "NEW", form: "", phon: ""});
  } else {
    const child = {
      tag: node.tag || "NEW",
      form: node.form || "",
      phon: node.phon || "",
    };
    if (node.lemma) child.lemma = node.lemma;
    node.children = [child];
    delete node.form;
    delete node.phon;
    delete node.lemma;
  }
  refreshEditedTree();
  openNodeEditor(node._nodeId);
});

$("add-sibling").addEventListener("click", () => {
  const location = findNodeLocation(selectedNodeId);
  if (!location) return;
  location.nodes.splice(
    location.index + 1,
    0,
    {tag: "NEW", form: "", phon: ""},
  );
  refreshEditedTree();
  openNodeEditor(selectedNodeId);
});

$("delete-node").addEventListener("click", () => {
  const location = findNodeLocation(selectedNodeId);
  if (!location) return;
  location.nodes.splice(location.index, 1);
  closeNodeEditor();
  refreshEditedTree();
});

$("reset-tree-draft").addEventListener("click", async () => {
  localStorage.removeItem(draftStorageKey());
  $("reset-tree-draft").classList.add("hidden");
  closeNodeEditor();
  if (activePassage) await selectPassage(activePassage);
});

$("tree-container").addEventListener("click", event => {
  const editNodeId = event.target.closest("[data-edit-node-id]")?.dataset.editNodeId;
  if (editNodeId !== undefined) {
    openNodeEditor(editNodeId);
    return;
  }
  const lemma = event.target.closest("[data-lemma]")?.dataset.lemma;
  if (lemma) {
    setTab("dict");
    $("dict-input").value = lemma;
    showDictionaryEntry(lemma);
    return;
  }
  toggleTreeNode(event.target.closest("[data-node-id]")?.dataset.nodeId);
});

$("tree-container").addEventListener("keydown", event => {
  if (!["Enter", " "].includes(event.key)) return;
  const editNodeId = event.target.closest("[data-edit-node-id]")?.dataset.editNodeId;
  if (editNodeId !== undefined) {
    event.preventDefault();
    openNodeEditor(editNodeId);
    return;
  }
  const lemma = event.target.closest("[data-lemma]")?.dataset.lemma;
  if (lemma) {
    event.preventDefault();
    showDictionaryEntry(lemma);
    return;
  }
  const nodeId = event.target.closest("[data-node-id]")?.dataset.nodeId;
  if (!nodeId) return;
  event.preventDefault();
  toggleTreeNode(nodeId);
});

$("dict-input").addEventListener("input", event => {
  clearTimeout(dictionaryTimer);
  const query = event.target.value.trim();
  if (!query) {
    $("dict-results").innerHTML = "";
    $("dict-entry").classList.add("hidden");
    $("dict-message").textContent =
      "Enter a search term to read the current dictionary.";
    return;
  }
  dictionaryTimer = setTimeout(() => searchDictionary(query), 250);
});

async function searchDictionary(query) {
  clearError();
  $("dict-message").textContent = "Searching…";
  try {
    const results = await apiFetch(
      `/api/dictionary?q=${encodeURIComponent(query)}`
    );
    $("dict-message").textContent =
      `${results.length} result${results.length === 1 ? "" : "s"}${results.length === 50 ? " (first 50)" : ""}`;
    $("dict-entry").classList.add("hidden");
    const container = $("dict-results");
    container.innerHTML = "";
    results.forEach(entry => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dictionary-result";
      const heading = document.createElement("span");
      heading.className = "dictionary-result-heading";
      const id = document.createElement("strong");
      id.textContent = entry.id;
      const gloss = document.createElement("span");
      gloss.textContent = entry.gloss;
      heading.append(id, gloss);
      const forms = document.createElement("span");
      forms.className = "dictionary-result-forms";
      forms.textContent = entry.forms.join(", ") || "No form";
      const pos = document.createElement("small");
      pos.textContent = entry.pos.join(" · ") || "No part of speech";
      button.append(heading, forms, pos);
      button.addEventListener("click", () => showDictionaryEntry(entry.id));
      container.appendChild(button);
    });
  } catch (error) {
    showError(error);
    $("dict-message").textContent = "Search failed.";
  }
}

async function showDictionaryEntry(entryId) {
  clearError();
  setTab("dict");
  $("dict-message").textContent = `Opening ${entryId}…`;
  try {
    const entry = await apiFetch(
      `/api/dictionary/${encodeURIComponent(entryId)}`
    );
    $("dict-input").value = entry.id;
    $("dict-message").textContent = "Complete dictionary entry";
    const article = $("dict-entry");
    article.innerHTML = "";
    const header = document.createElement("div");
    header.className = "dictionary-entry-heading";
    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "LEMMA";
    const title = document.createElement("h3");
    title.textContent = entry.id;
    header.append(eyebrow, title);
    const fields = document.createElement("dl");
    fields.className = "dictionary-fields";
    entry.fields.forEach(field => {
      const term = document.createElement("dt");
      term.textContent = field.label;
      const description = document.createElement("dd");
      if (field.values.length) {
        field.values.forEach(value => {
          const item = document.createElement("div");
          item.textContent = value || "—";
          description.appendChild(item);
        });
      } else {
        description.textContent = "—";
      }
      fields.append(term, description);
    });
    article.append(header, fields);
    article.classList.remove("hidden");
  } catch (error) {
    showError(error);
    $("dict-message").textContent = "Entry could not be opened.";
  }
}

loadDocuments();
