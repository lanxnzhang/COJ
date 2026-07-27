"use strict";

const $ = id => document.getElementById(id);
let documentGroups = [];
let activeDocument = null;
let activePassage = null;
let currentTreeData = null;
let dictionaryTimer = null;
const collapsedNodeIds = new Set();

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

$("toggle-navigation").addEventListener("click", event => {
  const workspace = document.querySelector(".workspace");
  workspace.classList.toggle("navigation-collapsed");
  const isCollapsed = workspace.classList.contains("navigation-collapsed");
  event.currentTarget.setAttribute("aria-expanded", String(!isCollapsed));
  event.currentTarget.querySelector("[aria-hidden]").textContent = isCollapsed ? "»" : "«";
  event.currentTarget.querySelector(".navigation-toggle-label").textContent =
    isCollapsed ? "Expand navigation" : "Collapse navigation";
});

$("toggle-text").addEventListener("click", event => {
  const panel = $("text-panel");
  const collapsed = panel.classList.toggle("collapsed");
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
  collapsedNodeIds.clear();
  renderDocuments();
  $("selected-document").textContent = documentData.label;
  $("passage-count").textContent = "Loading passages…";
  $("detail-breadcrumb").textContent =
    `${documentData.source === "text" ? "TEXTS UNDER EDITING" : "UPLOADED TREES"} · ${documentData.collection}`;
  $("detail-title").textContent = "Select a passage";
  $("tree-stats").classList.add("hidden");
  $("text-panel").classList.add("hidden");
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
    collapsedNodeIds.clear();
    prepareTreeData(data);
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
  };
}

$("slider-rowh").addEventListener("input", event => {
  $("slider-rowh-val").textContent = `${event.target.value} px`;
  if (currentTreeData) renderSvgTree(currentTreeData);
});

["tog-lemma", "tog-phon", "tog-tree-kanji", "tog-null", "tog-bottomup"]
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
      .map(leaf => ({text: leaf.form, phon: leaf.phon || ""}));
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
  const hasLemma = options.lemma && Boolean(node.lemma);
  const edgeOffset = hasLemma ? 22 : 9;

  if (node.tag) {
    svg.appendChild(svgElement("text", {
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
  if (node._toggleable) {
    svg.appendChild(svgElement("text", {
      x: centerX + Math.max(18, node.tag.length * 3.5 + 8),
      y: centerY + 5,
      class: "node-disclosure",
      "data-node-id": node._nodeId,
      role: "button",
      "aria-hidden": "true",
      "text-anchor": "middle",
    }, node._collapsed ? "+" : "−"));
  }
  if (hasLemma) {
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
        class: scriptStyleClass(token.phon, true),
      }, token.text));
    });
    svg.appendChild(combined);
  } else if (node.form) {
    svg.appendChild(svgElement("text", {
      x: centerX,
      y: offset,
      class: `form-label ${scriptStyleClass(node.phon, true)}`,
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
  }
}

function visibleLeafUnits(node) {
  if (!node.children) return [node];
  return node.children.flatMap(visibleLeafUnits);
}

function renderTreeKanji(data, tree, svg, columnWidth, maxRow, topPadding) {
  const units = visibleLeafUnits(tree);
  const baseY = yPosition(maxRow, topPadding) + 76;
  const groups = new Map();
  data.raw_text.forEach(sentence => {
    if (!sentence.kanji) return;
    const matches = units.filter(unit => {
      const numbers = unit._sentenceNumbers || [unit._sentenceNumber];
      return numbers.includes(sentence.number);
    });
    if (!matches.length) return;
    const left = xPosition(matches[0]._x, columnWidth);
    const right = xPosition(matches[matches.length - 1]._x, columnWidth);
    const key = `${left}:${right}`;
    if (!groups.has(key)) groups.set(key, {left, right, kanji: []});
    groups.get(key).kanji.push(sentence.kanji);
  });
  groups.forEach(group => {
    const {left, right} = group;
    if (right > left) {
      svg.appendChild(svgElement("line", {
        x1: left,
        y1: baseY - 12,
        x2: right,
        y2: baseY - 12,
        class: "kanji-span-line",
      }));
    }
    svg.appendChild(svgElement("text", {
      x: (left + right) / 2,
      y: baseY,
      class: "tree-kanji-label",
      "text-anchor": "middle",
    }, group.kanji.join("　")));
  });
}

function renderSvgTree(data) {
  const container = $("tree-container");
  container.innerHTML = "";
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

  const topPadding = 38;
  const width = counter.value * columnWidth + HORIZONTAL_PADDING * 2;
  const height = topPadding + maxRow * rowHeight() + ANNOTATION_HEIGHT
    + (options.treeKanji ? 28 : 0);
  const svg = svgElement("svg", {
    width,
    height,
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

$("tree-container").addEventListener("click", event => {
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
