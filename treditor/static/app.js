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
let popupDictionaryTimer = null;
let currentSearchPayload = null;
let editMode = false;
let currentEditorPage = null;
let activeSidebarView = "explorer";
let dictionaryTags = [];
let selectedDictionaryEntryId = null;
let dictionaryEditorMode = "create";
const corpusSearchState = {
  mode: "text",
  query: "",
  page: 1,
  perPage: 25,
  lemmaId: "",
};
const openEditorPages = new Set();
const collapsedNodeIds = new Set();
const passageCache = new Map();

async function apiFetch(path, options = {}) {
  const response = await fetch(path, options);
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

function showSidebarView(name) {
  activeSidebarView = name;
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
  if (name === "search") {
    (corpusSearchState.mode === "tgrep"
      ? $("tgrep-search")
      : $("global-search")).focus();
  }
  if (name === "dictionary") $("dictionary-sidebar-input").focus();
}

document.querySelectorAll("[data-sidebar-view]").forEach(button => {
  button.addEventListener("click", () => {
    const workspace = document.querySelector(".workspace");
    const alreadyActive = button.classList.contains("active");
    if (alreadyActive && !workspace.classList.contains("sidebar-collapsed")) {
      if (
        button.dataset.openEditor
        && !openEditorPages.has(button.dataset.openEditor)
      ) {
        showEditorPage(button.dataset.openEditor);
        return;
      }
      workspace.classList.add("sidebar-collapsed");
      button.setAttribute("aria-pressed", "false");
      return;
    }
    showSidebarView(button.dataset.sidebarView);
    if (button.dataset.openEditor) {
      showEditorPage(button.dataset.openEditor);
      $("dict-input").focus();
    }
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
  document.querySelectorAll("[data-sidebar-view]").forEach(button => {
    const active = button.dataset.sidebarView === activeSidebarView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
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
    document.querySelectorAll("[data-sidebar-view]").forEach(button => {
      const active = button.dataset.sidebarView === activeSidebarView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
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

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(input => input.value);
}

function corpusSearchParameters(page = 1) {
  const fields = checkedValues("corpus-field");
  const parameters = new URLSearchParams({
    q: corpusSearchState.query,
    sources: $("corpus-search-scope").value,
    fields: fields.join(","),
    match: $("corpus-search-match").value,
    case_sensitive: String($("corpus-search-case").checked),
    page: String(page),
    per_page: String(corpusSearchState.perPage),
  });
  if (corpusSearchState.lemmaId) {
    parameters.set("lemma_id", corpusSearchState.lemmaId);
  }
  return parameters;
}

function tgrepSearchParameters(page = 1) {
  return new URLSearchParams({
    q: corpusSearchState.query,
    sources: $("tgrep-search-scope").value,
    page: String(page),
    per_page: String(corpusSearchState.perPage),
  });
}

function setSearchMode(mode, focus = true) {
  corpusSearchState.mode = mode;
  const structural = mode === "tgrep";
  $("text-search-controls").classList.toggle("hidden", structural);
  $("tgrep-search-controls").classList.toggle("hidden", !structural);
  $("search-mode-text").classList.toggle("active", !structural);
  $("search-mode-tgrep").classList.toggle("active", structural);
  $("search-mode-text").setAttribute("aria-selected", String(!structural));
  $("search-mode-tgrep").setAttribute("aria-selected", String(structural));
  corpusSearchState.query = (structural
    ? $("tgrep-search").value
    : $("global-search").value).trim();
  $("global-search-message").textContent = structural
    ? "Search syntax-tree relationships with a TGrep2 pattern."
    : "Search transcriptions, kanji, word forms, and lemma IDs.";
  if (focus) (structural ? $("tgrep-search") : $("global-search")).focus();
}

function corpusFieldLabel(field) {
  return ({
    lemma_ids: "lemma IDs",
    syntax_tree: "syntax tree",
  })[field] || field.replaceAll("_", " ");
}

function updateSearchResultDisplay() {
  const container = $("search-results");
  container.classList.toggle(
    "show-kanji",
    $("search-show-kanji").checked,
  );
  container.classList.toggle(
    "show-sentence-numbers",
    $("search-show-sentence-numbers").checked,
  );
  if (currentSearchPayload) renderCorpusSearchResults(currentSearchPayload);
}

["search-show-kanji", "search-show-sentence-numbers"].forEach(id => {
  $(id).addEventListener("change", updateSearchResultDisplay);
});
updateSearchResultDisplay();

function appendRangedText(container, text, ranges) {
  const normalized = (ranges || [])
    .map(range => ({
      start: Math.max(0, Math.min(text.length, Number(range.start))),
      end: Math.max(0, Math.min(text.length, Number(range.end))),
    }))
    .filter(range => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .reduce((merged, range) => {
      const previous = merged.at(-1);
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push(range);
      }
      return merged;
    }, []);
  let cursor = 0;
  normalized.forEach(range => {
    container.append(document.createTextNode(text.slice(cursor, range.start)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(range.start, range.end);
    container.appendChild(mark);
    cursor = range.end;
  });
  container.append(document.createTextNode(text.slice(cursor)));
}

function appendSearchResultText(container, segments, field, fallback, ranges) {
  const available = (segments || [])
    .map((segment, index) => ({segment, index}))
    .filter(item => item.segment[field]);
  const appendVersion = (target, showNumbers) => {
    if (!available.length) {
      appendRangedText(target, fallback, []);
      return;
    }
    available.forEach((item, position) => {
      if (position) target.append(" ");
      if (showNumbers) {
        const number = document.createElement("span");
        number.className = "search-segment-number";
        number.textContent = `[${item.segment.number}] `;
        target.appendChild(number);
      }
      appendRangedText(
        target,
        item.segment[field],
        (ranges || []).filter(range => range.segment === item.index),
      );
    });
  };

  const plain = document.createElement("span");
  plain.className = "search-text-without-numbers";
  appendVersion(plain, false);
  const numbered = document.createElement("span");
  numbered.className = "search-text-with-numbers";
  appendVersion(numbered, true);
  container.append(plain, numbered);
}

function renderCorpusSearchResults(payload) {
  currentSearchPayload = payload;
  const {results, query, total, page, pages, per_page: perPage} = payload;
  const container = $("search-results");
  container.innerHTML = "";
  $("search-results-title").textContent = payload.lemma_id
    ? `Occurrences: ${payload.lemma_id}`
    : payload.search_type === "tgrep2"
      ? `TGrep2: ${query}`
      : `Search: ${query}`;
  $("search-result-count").textContent = payload.lemma_id
    ? `${payload.occurrence_total.toLocaleString()} occurrence${payload.occurrence_total === 1 ? "" : "s"} in ${total.toLocaleString()} passage${total === 1 ? "" : "s"}`
    : `${total.toLocaleString()} result${total === 1 ? "" : "s"}`;
  $("search-results-message").textContent = total
    ? "Select a result to open its syntax tree."
    : payload.search_type === "tgrep2"
      ? "No syntax tree matched this pattern."
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
    const transcription = document.createElement("span");
    transcription.className = "corpus-search-preview corpus-search-transcription";
    const transcriptionHighlights = [
      ...(result.highlights?.transcription || []),
      ...($("search-show-kanji").checked
        ? []
        : result.highlights?.transcription_when_kanji_hidden || []),
    ];
    appendSearchResultText(
      transcription,
      result.text_segments,
      "transcription",
      result.transcription || result.preview || result.header || "No transcription",
      transcriptionHighlights,
    );
    const kanji = document.createElement("span");
    kanji.className = "corpus-search-kanji";
    appendSearchResultText(
      kanji,
      result.text_segments,
      "kanji",
      result.kanji || "No kanji text",
      result.highlights?.kanji || [],
    );
    const fields = document.createElement("span");
    fields.className = "corpus-search-fields";
    fields.textContent = result.matching_fields
      .map(corpusFieldLabel)
      .concat(result.match_count
        ? [`${result.match_count} matching node${result.match_count === 1 ? "" : "s"}`]
        : [])
      .join(" · ");
    button.append(heading, transcription, kanji, fields);
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

  corpusSearchState.page = page;
  corpusSearchState.perPage = perPage;
  const pagination = $("search-pagination");
  pagination.classList.toggle("hidden", total <= 10);
  $("search-page-status").textContent = `Page ${page} of ${Math.max(pages, 1)}`;
  $("search-page-previous").disabled = page <= 1;
  $("search-page-next").disabled = page >= pages;
  $("search-page-size").value = String(perPage);
}

async function performCorpusSearch(query, page = 1, preserveLemma = false) {
  const normalized = query.trim();
  setSearchMode("text", false);
  corpusSearchState.query = normalized;
  if (!preserveLemma) corpusSearchState.lemmaId = "";
  showEditorPage("search");
  currentSearchPayload = null;
  $("search-results").innerHTML = "";
  if (!normalized) {
    $("global-search-message").textContent =
      "Search transcriptions, kanji, word forms, and lemma IDs.";
    $("search-results-title").textContent = "Search results";
    $("search-result-count").textContent = "";
    $("search-results-message").textContent = "Enter a search in the sidebar.";
    $("search-pagination").classList.add("hidden");
    return;
  }
  clearError();
  $("global-search-message").textContent = "Searching…";
  $("search-results-message").textContent = "Searching the current corpus…";
  try {
    const payload = await apiFetch(`/api/search?${corpusSearchParameters(page)}`);
    $("global-search-message").textContent =
      `${payload.total.toLocaleString()} result${payload.total === 1 ? "" : "s"}.`;
    renderCorpusSearchResults(payload);
  } catch (error) {
    showError(error);
    $("global-search-message").textContent = "Search failed.";
    $("search-results-message").textContent = "The corpus search could not be completed.";
  }
}

async function performTgrepSearch(query, page = 1) {
  const normalized = query.trim();
  setSearchMode("tgrep", false);
  corpusSearchState.query = normalized;
  corpusSearchState.lemmaId = "";
  showEditorPage("search");
  currentSearchPayload = null;
  $("search-results").innerHTML = "";
  if (!normalized) {
    $("global-search-message").textContent =
      "Enter a TGrep2 pattern such as IP-MAT << NP.";
    $("search-results-title").textContent = "TGrep2 results";
    $("search-result-count").textContent = "";
    $("search-results-message").textContent =
      "Enter a structural pattern in the sidebar.";
    $("search-pagination").classList.add("hidden");
    return;
  }
  clearError();
  $("global-search-message").textContent = "Searching tree structure…";
  $("search-results-message").textContent = "Evaluating the TGrep2 pattern…";
  try {
    const payload = await apiFetch(`/api/tgrep?${tgrepSearchParameters(page)}`);
    $("global-search-message").textContent =
      `${payload.total.toLocaleString()} matching passage${payload.total === 1 ? "" : "s"}.`;
    renderCorpusSearchResults(payload);
  } catch (error) {
    showError(error);
    $("global-search-message").textContent = error.message;
    $("search-results-message").textContent =
      "The structural search could not be completed.";
  }
}

function performActiveSearch(page) {
  return corpusSearchState.mode === "tgrep"
    ? performTgrepSearch(corpusSearchState.query, page)
    : performCorpusSearch(corpusSearchState.query, page, true);
}

$("search-mode-text").addEventListener("click", () => setSearchMode("text"));
$("search-mode-tgrep").addEventListener("click", () => setSearchMode("tgrep"));

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

$("tgrep-search-form").addEventListener("submit", event => {
  event.preventDefault();
  performTgrepSearch($("tgrep-search").value);
});

$("tgrep-search-scope").addEventListener("change", () => {
  if (corpusSearchState.mode === "tgrep" && corpusSearchState.query) {
    performTgrepSearch(corpusSearchState.query, 1);
  }
});

document.querySelectorAll("[data-tgrep-example]").forEach(button => {
  button.addEventListener("click", () => {
    $("tgrep-search").value = button.dataset.tgrepExample;
    performTgrepSearch(button.dataset.tgrepExample);
  });
});

$("search-page-previous").addEventListener("click", () => {
  performActiveSearch(corpusSearchState.page - 1);
});

$("search-page-next").addEventListener("click", () => {
  performActiveSearch(corpusSearchState.page + 1);
});

$("search-page-size").addEventListener("change", event => {
  corpusSearchState.perPage = Number(event.target.value);
  performActiveSearch(1);
});

[
  "corpus-search-scope",
  "corpus-search-match",
  "corpus-search-case",
].forEach(id => {
  $(id).addEventListener("change", () => {
    if (corpusSearchState.mode === "text" && corpusSearchState.query) {
      performCorpusSearch(corpusSearchState.query, 1);
    }
  });
});

document.querySelectorAll('input[name="corpus-field"]').forEach(input => {
  input.addEventListener("change", () => {
    if (corpusSearchState.mode === "text" && corpusSearchState.query) {
      performCorpusSearch(corpusSearchState.query, 1);
    }
  });
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
        class: `${scriptStyleClass(token.phon, true)} interactive-form`,
        "data-dictionary-query": token.lemma || token.text,
        ...(token.lemma ? {"data-lemma": token.lemma} : {}),
        role: "link",
        tabindex: "0",
      }, token.text));
    });
    svg.appendChild(combined);
  } else if (node.form) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: `form-label ${scriptStyleClass(node.phon, true)} interactive-form`,
      "data-dictionary-query": node.lemma || node.form,
      ...(node.lemma ? {"data-lemma": node.lemma} : {}),
      role: "link",
      tabindex: "0",
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
    openDictionaryPopupEntry(lemma);
    return;
  }
  const dictionaryQuery = event.target.closest("[data-dictionary-query]")
    ?.dataset.dictionaryQuery;
  if (dictionaryQuery) {
    openDictionaryPopupLookup(dictionaryQuery);
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
    openDictionaryPopupEntry(lemma);
    return;
  }
  const dictionaryQuery = event.target.closest("[data-dictionary-query]")
    ?.dataset.dictionaryQuery;
  if (dictionaryQuery) {
    event.preventDefault();
    openDictionaryPopupLookup(dictionaryQuery);
    return;
  }
  const nodeId = event.target.closest("[data-node-id]")?.dataset.nodeId;
  if (!nodeId) return;
  event.preventDefault();
  toggleTreeNode(nodeId);
});

function dictionarySearchParameters(query, useAdvanced) {
  const parameters = new URLSearchParams({q: query});
  if (useAdvanced) {
    parameters.set("fields", checkedValues("dictionary-field").join(","));
    parameters.set("match", $("dictionary-search-match").value);
    parameters.set(
      "case_sensitive", String($("dictionary-search-case").checked)
    );
  } else {
    parameters.set("fields", "lemma,.KANA,.FORM");
    parameters.set("match", "contains");
  }
  return parameters;
}

function renderDictionaryResults(results, container, target) {
  container.innerHTML = "";
  const isPopup = target === "popup";
  results.forEach(entry => {
    const card = document.createElement("article");
    card.className = `dictionary-result${isPopup ? " popup-result" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dictionary-result-main";
    const heading = document.createElement("span");
    heading.className = "dictionary-result-primary";
    const forms = document.createElement("strong");
    forms.textContent = entry.forms.join(", ") || "No word form";
    const id = document.createElement("strong");
    id.className = "dictionary-result-id";
    id.textContent = entry.id;
    heading.append(forms, id);
    const linguistic = document.createElement("span");
    linguistic.className = "dictionary-result-linguistic";
    const pos = document.createElement("span");
    pos.className = "dictionary-result-pos";
    pos.textContent = entry.pos.join(" · ") || "POS not recorded";
    const gloss = document.createElement("span");
    gloss.className = "dictionary-result-gloss";
    gloss.textContent = entry.gloss || "Gloss not recorded";
    linguistic.append(pos, gloss);
    button.append(heading, linguistic);
    button.addEventListener("click", () => showDictionaryEntry(entry.id, target));
    card.appendChild(button);
    if (!isPopup) {
      const supplemental = document.createElement("footer");
      supplemental.className = "dictionary-result-supplemental";
      const kana = document.createElement("span");
      kana.className = "dictionary-result-kana";
      kana.textContent = entry.kana.join(" · ") || "Kana not recorded";
      const frequency = document.createElement("button");
      frequency.type = "button";
      frequency.className = "dictionary-frequency";
      frequency.textContent = `Frequency: ${entry.frequency.toLocaleString()}`;
      frequency.title = `Run whole-corpus TGrep2 search lemma=${entry.id}`;
      frequency.addEventListener("click", () => {
        openLemmaFrequency(entry);
      });
      supplemental.append(kana, frequency);
      card.appendChild(supplemental);
    }
    container.appendChild(card);
  });
}

function setSelectedDictionaryEntry(entryId) {
  selectedDictionaryEntryId = entryId;
  $("dictionary-selected-entry").textContent = entryId || "None selected";
  $("edit-dictionary-entry").disabled = !entryId;
}

function openLemmaFrequency(entry) {
  const query = `lemma=${entry.id}`;
  setSearchMode("tgrep", false);
  corpusSearchState.lemmaId = "";
  corpusSearchState.query = query;
  $("tgrep-search").value = query;
  $("tgrep-search-scope").value = "text,trees";
  showSidebarView("search");
  performTgrepSearch(query, 1);
}

function renderDictionaryEntry(entry, article) {
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
}

async function searchDictionary(query, target = "workspace") {
  const isPopup = target === "popup";
  const message = $(isPopup ? "popup-dict-message" : "dict-message");
  const resultsContainer = $(isPopup ? "popup-dict-results" : "dict-results");
  const entryContainer = $(isPopup ? "popup-dict-entry" : "dict-entry");
  if (!query.trim()) {
    resultsContainer.innerHTML = "";
    entryContainer.classList.add("hidden");
    message.textContent = "Enter a search term to read the current dictionary.";
    return;
  }
  clearError();
  message.textContent = "Searching…";
  try {
    const results = await apiFetch(
      `/api/dictionary?${dictionarySearchParameters(query.trim(), !isPopup)}`
    );
    message.textContent =
      `${results.length} result${results.length === 1 ? "" : "s"}${results.length === 100 ? " (first 100)" : ""}`;
    entryContainer.classList.add("hidden");
    renderDictionaryResults(results, resultsContainer, target);
  } catch (error) {
    showError(error);
    message.textContent = "Search failed.";
  }
}

async function showDictionaryEntry(entryId, target = "workspace") {
  const isPopup = target === "popup";
  const message = $(isPopup ? "popup-dict-message" : "dict-message");
  const article = $(isPopup ? "popup-dict-entry" : "dict-entry");
  clearError();
  if (!isPopup) showEditorPage("dictionary");
  message.textContent = `Opening ${entryId}…`;
  try {
    const entry = await apiFetch(
      `/api/dictionary/${encodeURIComponent(entryId)}`
    );
    $(isPopup ? "popup-dict-input" : "dict-input").value = entry.id;
    message.textContent = "Complete dictionary entry";
    if (isPopup) $("popup-dict-results").innerHTML = "";
    setSelectedDictionaryEntry(entry.id);
    renderDictionaryEntry(entry, article);
  } catch (error) {
    showError(error);
    message.textContent = "Entry could not be opened.";
  }
}

function openDictionaryPopup() {
  $("dictionary-popup").classList.remove("hidden", "collapsed");
  $("collapse-dictionary-popup").textContent = "›";
  $("collapse-dictionary-popup").setAttribute(
    "aria-label", "Collapse dictionary popup"
  );
  $("toggle-dictionary-popup").textContent = "Dictionary popup is open";
}

function closeDictionaryPopup() {
  $("dictionary-popup").classList.add("hidden");
  $("toggle-dictionary-popup").textContent = "Open side popup";
}

function openDictionaryPopupEntry(entryId) {
  openDictionaryPopup();
  showDictionaryEntry(entryId, "popup");
}

function openDictionaryPopupLookup(query) {
  openDictionaryPopup();
  $("popup-dict-input").value = query;
  searchDictionary(query, "popup");
}

function dictionaryTagLabel(tag) {
  return dictionaryTags.find(item => item.id === tag)?.label
    || tag.replace(/^\./, "").replaceAll("_", " ");
}

async function loadDictionaryTags() {
  try {
    dictionaryTags = await apiFetch("/api/dictionary/tags");
    const options = $("dictionary-field-options");
    options.innerHTML = "";
    const defaultFields = new Set([
      "lemma", ".FORM", ".GLOSS", ".MEANING",
    ]);
    dictionaryTags.forEach(tag => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "dictionary-field";
      input.value = tag.id;
      input.checked = defaultFields.has(tag.id);
      label.title = `${tag.entry_count.toLocaleString()} entries use this field`;
      label.append(input, ` ${tag.label}`);
      options.appendChild(label);
    });
    $("dictionary-sidebar-summary").textContent =
      `${dictionaryTags.length - 1} searchable XML tags`;
    refreshDictionaryAddFieldOptions();
  } catch (error) {
    showError(error);
    $("dictionary-field-options").textContent =
      "Dictionary tags could not be loaded.";
  }
}

function refreshDictionaryAddFieldOptions() {
  const select = $("dictionary-add-field");
  const present = new Set(
    [...document.querySelectorAll("[data-dictionary-editor-tag]")]
      .map(row => row.dataset.dictionaryEditorTag)
  );
  select.innerHTML = "";
  dictionaryTags
    .filter(tag => tag.id !== "lemma" && !present.has(tag.id))
    .forEach(tag => {
      const option = document.createElement("option");
      option.value = tag.id;
      option.textContent = tag.label;
      select.appendChild(option);
    });
  $("add-dictionary-field").disabled = !select.options.length;
}

function addDictionaryEditorField(tag, values = []) {
  if (!tag || document.querySelector(
    `[data-dictionary-editor-tag="${CSS.escape(tag)}"]`
  )) return;
  const row = document.createElement("label");
  row.className = "dictionary-editor-field";
  row.dataset.dictionaryEditorTag = tag;
  const heading = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = dictionaryTagLabel(tag);
  const code = document.createElement("code");
  code.textContent = tag;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "dictionary-editor-remove";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    row.remove();
    refreshDictionaryAddFieldOptions();
  });
  heading.append(name, code, remove);
  const input = document.createElement("textarea");
  input.rows = Math.min(Math.max(values.length, 2), 6);
  input.value = values.join("\n");
  input.placeholder = "Enter a value; use one line per value";
  row.append(heading, input);
  $("dictionary-entry-fields").appendChild(row);
  refreshDictionaryAddFieldOptions();
}

function openDictionaryEntryEditor(entry = null) {
  dictionaryEditorMode = entry ? "edit" : "create";
  $("dictionary-entry-editor-title").textContent = entry
    ? `Edit ${entry.id}`
    : "New dictionary entry";
  $("dictionary-entry-id").value = entry?.id || "";
  $("dictionary-entry-id").disabled = Boolean(entry);
  $("dictionary-entry-fields").innerHTML = "";
  const fields = entry?.fields || [
    {tag: ".FORM", values: []},
    {tag: ".KANA", values: []},
    {tag: ".POS", values: []},
    {tag: ".GLOSS", values: []},
    {tag: ".MEANING", values: []},
  ];
  fields.forEach(field => addDictionaryEditorField(field.tag, field.values));
  refreshDictionaryAddFieldOptions();
  $("dictionary-editor-message").textContent =
    "One value per line for fields that accept multiple values.";
  $("dictionary-entry-editor").classList.remove("hidden");
  $("dictionary-entry-id").focus();
}

function closeDictionaryEntryEditor() {
  $("dictionary-entry-editor").classList.add("hidden");
}

async function editSelectedDictionaryEntry() {
  if (!selectedDictionaryEntryId) return;
  try {
    const entry = await apiFetch(
      `/api/dictionary/${encodeURIComponent(selectedDictionaryEntryId)}`
    );
    showEditorPage("dictionary");
    openDictionaryEntryEditor(entry);
  } catch (error) {
    showError(error);
  }
}

$("dictionary-sidebar-search").addEventListener("submit", event => {
  event.preventDefault();
  const query = $("dictionary-sidebar-input").value.trim();
  showEditorPage("dictionary");
  $("dict-input").value = query;
  searchDictionary(query, "workspace");
});

$("new-dictionary-entry").addEventListener("click", () => {
  showEditorPage("dictionary");
  openDictionaryEntryEditor();
});

$("edit-dictionary-entry").addEventListener(
  "click", editSelectedDictionaryEntry
);

$("close-dictionary-entry-editor").addEventListener(
  "click", closeDictionaryEntryEditor
);

$("add-dictionary-field").addEventListener("click", () => {
  addDictionaryEditorField($("dictionary-add-field").value);
});

$("dictionary-entry-form").addEventListener("submit", async event => {
  event.preventDefault();
  const entryId = $("dictionary-entry-id").value.trim();
  const fields = {};
  document.querySelectorAll("[data-dictionary-editor-tag]").forEach(row => {
    fields[row.dataset.dictionaryEditorTag] = row.querySelector("textarea")
      .value.split("\n").map(value => value.trim());
  });
  $("dictionary-editor-message").textContent = "Saving dictionary XML…";
  try {
    const isCreate = dictionaryEditorMode === "create";
    const path = isCreate
      ? "/api/dictionary"
      : `/api/dictionary/${encodeURIComponent(entryId)}`;
    await apiFetch(path, {
      method: isCreate ? "POST" : "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id: entryId, fields}),
    });
    closeDictionaryEntryEditor();
    setSelectedDictionaryEntry(entryId);
    await loadDictionaryTags();
    await showDictionaryEntry(entryId, "workspace");
  } catch (error) {
    $("dictionary-editor-message").textContent = error.message;
  }
});

$("dictionary-search-form").addEventListener("submit", event => {
  event.preventDefault();
  clearTimeout(dictionaryTimer);
  searchDictionary($("dict-input").value, "workspace");
});

$("dict-input").addEventListener("input", event => {
  clearTimeout(dictionaryTimer);
  dictionaryTimer = setTimeout(
    () => searchDictionary(event.target.value, "workspace"), 250
  );
});

$("popup-dictionary-form").addEventListener("submit", event => {
  event.preventDefault();
  clearTimeout(popupDictionaryTimer);
  searchDictionary($("popup-dict-input").value, "popup");
});

$("popup-dict-input").addEventListener("input", event => {
  clearTimeout(popupDictionaryTimer);
  popupDictionaryTimer = setTimeout(
    () => searchDictionary(event.target.value, "popup"), 250
  );
});

$("toggle-dictionary-popup").addEventListener("click", () => {
  if ($("dictionary-popup").classList.contains("hidden")) {
    openDictionaryPopup();
    $("popup-dict-input").focus();
  } else {
    closeDictionaryPopup();
  }
});

$("close-dictionary-popup").addEventListener("click", closeDictionaryPopup);

$("collapse-dictionary-popup").addEventListener("click", event => {
  const collapsed = $("dictionary-popup").classList.toggle("collapsed");
  event.currentTarget.textContent = collapsed ? "‹" : "›";
  event.currentTarget.setAttribute(
    "aria-label",
    `${collapsed ? "Expand" : "Collapse"} dictionary popup`,
  );
});

loadDictionaryTags();
loadDocuments();
