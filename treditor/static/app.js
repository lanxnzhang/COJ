"use strict";

const $ = id => document.getElementById(id);
let documentGroups = [];
let activeDocument = null;
let activePassage = null;
let currentTreeData = null;
let dictionaryTimer = null;

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

function renderDocuments() {
  const query = $("document-search").value.trim().toLocaleLowerCase();
  const container = $("document-groups");
  container.innerHTML = "";

  documentGroups.forEach((group, groupIndex) => {
    const documents = group.documents.filter(document =>
      !query || [
        document.label,
        document.document_id,
        document.collection,
        document.filename,
      ].some(value => value.toLocaleLowerCase().includes(query))
    );
    if (!documents.length) return;

    const section = document.createElement("details");
    section.className = "document-source";
    section.open = query !== "" || groupIndex === 0;

    const summary = document.createElement("summary");
    const summaryText = document.createElement("span");
    summaryText.innerHTML = `<strong>${group.label}</strong><small>${group.description}</small>`;
    const count = document.createElement("span");
    count.className = "count-badge";
    count.textContent = documents.length;
    summary.append(summaryText, count);
    section.appendChild(summary);

    const collectionContainer = document.createElement("div");
    collectionContainer.className = "collection-list";
    groupByCollection(documents).forEach((items, collection) => {
      const collectionBlock = document.createElement("section");
      collectionBlock.className = "collection-block";
      const heading = document.createElement("div");
      heading.className = "collection-heading";
      heading.innerHTML = `<span>${collection}</span><small>${items.length}</small>`;
      collectionBlock.appendChild(heading);

      items.forEach(documentData => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "document-item";
        button.classList.toggle("active", activeDocument?.id === documentData.id);
        button.innerHTML = `<span>${documentData.label}</span><small>${documentData.utterance_count.toLocaleString()} passages</small>`;
        button.addEventListener("click", () => selectDocument(documentData));
        collectionBlock.appendChild(button);
      });
      collectionContainer.appendChild(collectionBlock);
    });
    section.appendChild(collectionContainer);
    container.appendChild(section);
  });

  if (!container.children.length) {
    container.innerHTML = '<div class="empty-state small">No documents match this filter.</div>';
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

$("document-search").addEventListener("input", renderDocuments);

async function selectDocument(documentData) {
  if (activeDocument?.id === documentData.id) return;
  clearError();
  activeDocument = documentData;
  activePassage = null;
  currentTreeData = null;
  renderDocuments();
  $("selected-document").textContent = documentData.label;
  $("passage-count").textContent = "Loading passages…";
  $("detail-breadcrumb").textContent =
    `${documentData.source === "text" ? "TEXTS UNDER EDITING" : "UPLOADED TREES"} · ${documentData.collection}`;
  $("detail-title").textContent = "Select a passage";
  $("tree-stats").classList.add("hidden");
  $("passage-context").classList.add("hidden");
  $("tree-container").innerHTML = `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">⌘</span>
      <strong>No passage selected</strong>
      <p>Choose a passage from ${documentData.label} to inspect its syntax tree.</p>
    </div>`;

  try {
    const passages = await apiFetch(
      `/api/documents/${encodeURIComponent(documentData.source)}/${encodeURIComponent(documentData.document_id)}`
    );
    renderPassages(passages);
  } catch (error) {
    showError(error);
    $("passage-count").textContent = "Unable to load passages.";
  }
}

function renderPassages(passages) {
  $("passage-count").textContent =
    `${passages.length.toLocaleString()} passage${passages.length === 1 ? "" : "s"}`;
  const container = $("passage-list");
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
    button.addEventListener("click", () => selectPassage(passage, button));
    container.appendChild(button);
  });
}

async function selectPassage(passage) {
  if (!activeDocument) return;
  clearError();
  activePassage = passage;
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

function renderRawText(sentences) {
  if (!sentences.length) {
    $("passage-context").classList.add("hidden");
    return;
  }
  $("raw-text-lines").innerHTML = "";
  sentences.forEach(sentence => {
    const line = document.createElement("div");
    line.className = "raw-text-line";
    const number = document.createElement("span");
    number.className = "raw-text-number";
    number.textContent = sentence.number;
    const content = document.createElement("div");
    const transcription = document.createElement("p");
    transcription.className = "raw-transcription";
    transcription.textContent = sentence.transcription;
    const kanji = document.createElement("p");
    kanji.className = "raw-kanji";
    kanji.textContent = sentence.kanji || "—";
    content.append(transcription, kanji);
    line.append(number, content);
    $("raw-text-lines").appendChild(line);
  });
  $("passage-context").classList.remove("hidden");
}

function rowHeight() {
  return Number($("slider-rowh").value);
}

function treeOptions() {
  return {
    lemma: $("tog-lemma").checked,
    phon: $("tog-phon").checked,
    metadata: $("tog-meta").checked,
    nullNodes: $("tog-null").checked,
    comments: $("tog-comments").checked,
    bottomUp: $("tog-bottomup").checked,
  };
}

$("slider-rowh").addEventListener("input", event => {
  $("slider-rowh-val").textContent = `${event.target.value} px`;
  if (currentTreeData) renderSvgTree(currentTreeData);
});

["tog-lemma", "tog-phon", "tog-meta", "tog-null", "tog-comments", "tog-bottomup"]
  .forEach(id => {
    $(id).addEventListener("change", () => {
      if (currentTreeData) renderSvgTree(currentTreeData);
    });
  });

const SVG_NS = "http://www.w3.org/2000/svg";
const HORIZONTAL_PADDING = 38;
const ANNOTATION_HEIGHT = 92;
const CHARACTER_WIDTH = 7.4;
const MINIMUM_COLUMN = 68;

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

function pruneNode(node, options) {
  if (!options.nullNodes && isNullNode(node)) return null;
  if (!node.children) return {...node};
  const children = node.children
    .map(child => pruneNode(child, options))
    .filter(Boolean);
  if (!children.length) return null;
  return {...node, children};
}

function metadataText(node) {
  return Object.entries(node.attributes || {})
    .map(([key, value]) => `${key}=${value}`)
    .join(" · ");
}

function labelWidth(node, options) {
  let width = node.tag.length * CHARACTER_WIDTH;
  const metadata = metadataText(node);
  if (options.metadata && metadata) {
    width = Math.max(width, metadata.length * 6.2);
  }
  if (!node.children) {
    if (node.form) width = Math.max(width, node.form.length * CHARACTER_WIDTH);
    if (options.phon && node.phon) {
      width = Math.max(width, node.phon.length * CHARACTER_WIDTH);
    }
    if (options.lemma && node.lemma) {
      width = Math.max(width, node.lemma.length * CHARACTER_WIDTH);
    }
  }
  return width + 20;
}

function widestLeafLabel(node, options) {
  if (!node.children) return labelWidth(node, options);
  return Math.max(...node.children.map(child => widestLeafLabel(child, options)));
}

function leafPositions(node) {
  if (!node.children) return [node._x];
  return node.children.flatMap(leafPositions);
}

function assignHorizontalPosition(node, counter) {
  if (!node.children) {
    node._x = counter.value++;
    return;
  }
  node.children.forEach(child => assignHorizontalPosition(child, counter));
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

function xPosition(value, columnWidth) {
  return HORIZONTAL_PADDING + (value + 0.5) * columnWidth;
}

function yPosition(row, topPadding) {
  return topPadding + row * rowHeight();
}

function renderNode(node, svg, columnWidth, maxRow, topPadding, options) {
  const centerX = xPosition(node._x, columnWidth);
  const centerY = yPosition(node._row, topPadding);
  const metadata = metadataText(node);

  if (node.tag) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: centerY + 5,
      class: "tree-label",
      "text-anchor": "middle",
    }, node.tag));
  }
  if (options.metadata && metadata) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: centerY + 18,
      class: "metadata-label",
      "text-anchor": "middle",
    }, metadata));
  }
  if (node.children && options.lemma && node.lemma) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: centerY + (options.metadata && metadata ? 31 : 19),
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
        y1: centerY + (options.metadata && metadata ? 21 : 9),
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
      y1: centerY + (options.metadata && metadata ? 21 : 9),
      x2: centerX,
      y2: annotationY - 17,
      class: "tree-edge leaf-edge",
    }));
  }
  let offset = annotationY;
  if (node.form) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: "form-label",
      "text-anchor": "middle",
    }, node.form));
  }
  offset += 17;
  if (options.phon && node.phon) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: "phon-label",
      "text-anchor": "middle",
    }, node.phon));
    offset += 16;
  }
  if (options.lemma && node.lemma) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: "lemma-label interactive-lemma",
      "data-lemma": node.lemma,
      "text-anchor": "middle",
    }, node.lemma));
  }
}

function renderSvgTree(data) {
  const container = $("tree-container");
  container.innerHTML = "";
  const options = treeOptions();
  const roots = data.roots
    .map(root => pruneNode(root, options))
    .filter(Boolean);
  if (!roots.length) {
    container.innerHTML = '<div class="empty-state">Nothing matches the current display settings.</div>';
    return;
  }

  const tree = roots.length === 1
    ? roots[0]
    : {tag: "", attributes: {}, children: roots};
  const columnWidth = Math.max(
    MINIMUM_COLUMN, widestLeafLabel(tree, options)
  );
  const counter = {value: 0};
  assignHorizontalPosition(tree, counter);

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

  const visibleComments = options.comments ? data.comments || [] : [];
  const topPadding = 38 + visibleComments.length * 14;
  const width = counter.value * columnWidth + HORIZONTAL_PADDING * 2;
  const height = topPadding + maxRow * rowHeight() + ANNOTATION_HEIGHT;
  const svg = svgElement("svg", {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    class: "tree-svg",
    role: "img",
    "aria-label": `Syntax tree for ${data.sentence_id}`,
  });

  visibleComments.forEach((comment, index) => {
    svg.appendChild(svgElement("text", {
      x: HORIZONTAL_PADDING,
      y: 17 + index * 14,
      class: "comment-label",
    }, `# ${comment}`));
  });
  renderNode(tree, svg, columnWidth, maxRow, topPadding, options);
  container.appendChild(svg);
}

$("tree-container").addEventListener("click", event => {
  const lemma = event.target.closest("[data-lemma]")?.dataset.lemma;
  if (!lemma) return;
  setTab("dict");
  $("dict-input").value = lemma;
  showDictionaryEntry(lemma);
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
