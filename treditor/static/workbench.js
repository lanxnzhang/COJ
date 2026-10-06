"use strict";

(() => {
  const modes = {
    compare: {label: "Text Compare", paneLabels: ["Text A", "Text B"]},
    convert: {label: "Convert", paneLabels: ["Source", "Result"]},
    tree: {label: "Syntax Trees", paneLabels: ["Tree A", "Tree B"]},
  };
  const makePane = () => ({text: "", hidden: false, format: "auto", origin: "User input",
    representations: [], selectedRepresentation: 0, parsed: null, view: "source", differences: null,
    revision: 0, scroll: 0, textareaScroll: 0, corpusId: "", preprocessing: "raw"});
  const states = Object.fromEntries(Object.keys(modes).map(mode => [mode, {
    panes: [makePane(), makePane()], spaces: false, lineBreaks: false, glosses: false,
    source: "kana", target: "hepburn", kanaStyle: "hiragana", result: null, resolving: false,
  }]));
  let mode = "compare";
  let catalog = null;
  let actionRevision = 0;
  const page = document.createElement("section");
  page.id = "editor-page-workbench";
  page.className = "editor-page wb-page hidden";
  document.querySelector(".detail-pane").appendChild(page);

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action) {
    const node = element("button", text);
    node.type = "button";
    node.addEventListener("click", event => Promise.resolve().then(() => action(event)).catch(error => status(error.message, true)));
    return node;
  }
  function status(message, error = false) {
    const node = page.querySelector(".wb-status");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", error);
  }
  function select(label, values, current, action) {
    const wrapper = element("label", label);
    const input = element("select");
    input.setAttribute("aria-label", label);
    for (const [value, name] of values) {
      const option = element("option", name);
      option.value = value;
      input.appendChild(option);
    }
    input.value = current;
    input.addEventListener("change", () => action(input.value));
    wrapper.appendChild(input);
    return wrapper;
  }
  function checkbox(label, checked, action) {
    const wrapper = element("label");
    const input = element("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => action(input.checked));
    wrapper.append(input, document.createTextNode(label));
    return wrapper;
  }
  function rememberScroll() {
    page.querySelectorAll(".wb-pane").forEach(node => {
      const pane = states[mode].panes[Number(node.dataset.pane)];
      pane.scroll = node.scrollTop;
      const input = node.querySelector("textarea");
      if (input) pane.textareaScroll = input.scrollTop;
    });
  }
  function touch(pane, text, origin = "User input") {
    pane.text = text;
    pane.origin = origin;
    pane.parsed = null;
    pane.differences = null;
    pane.representations = [];
    pane.selectedRepresentation = 0;
    pane.revision++;
    actionRevision++;
    states[mode].panes.forEach(item => { item.differences = null; });
    states[mode].result = null;
    states[mode].comparison = null;
    states[mode].selectionAnchor = null;
  }
  function outputText(state) {
    return state.result ? state.result.segments.map(segment => segment.text).join("") : "";
  }
  async function copy(text) {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable. Select the displayed text and copy it manually.");
    await navigator.clipboard.writeText(text);
    status("Copied.");
  }
  async function parsePane(pane) {
    const revision = pane.revision;
    const parsed = await apiFetch("/api/workbench/parse", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({content: pane.text, format: pane.format}),
    });
    if (pane.revision !== revision) throw new Error("Input changed during parsing. Parse again.");
    pane.parsed = parsed;
    pane.view = "tree";
    if (!pane.representations.length) {
      pane.representations.push({content: pane.text, format: parsed.format, origin: pane.origin});
    }
    if (!pane.representations.some(item => item.format === parsed.generated.format
      && item.content === parsed.generated.content)) pane.representations.push(parsed.generated);
    return parsed;
  }
  async function loadCorpus(pane, identifier) {
    const revision = pane.revision;
    const originalMode = mode;
    status("Loading corpus text…");
    const result = await apiFetch(`/api/workbench/text?id=${encodeURIComponent(identifier)}`);
    if (pane.revision !== revision || mode !== originalMode) return;
    const representation = result.representations[0];
    touch(pane, representation.content, representation.origin);
    pane.format = representation.format;
    pane.representations = result.representations;
    pane.selectedRepresentation = 0;
    pane.discrepancy = result.different ? "Source TXT and Stored XML differ. Inspect either using Representation." :
      result.source_txt_available ? "Source TXT and Stored XML agree after ignoring XML formatting and attribute order." :
        "Source TXT is unavailable. Showing Stored XML.";
    await parsePane(pane);
    if (mode === originalMode) { render(); status(`Loaded ${result.sentence_id}. ${pane.discrepancy}`); }
  }
  function renderCharacters(target, characters) {
    let current = null;
    for (const item of characters) {
      if (!current || current.dataset.kind !== item.kind) {
        current = element("span", "", item.kind === "plain" ? "" : `wb-${item.kind}`);
        current.dataset.kind = item.kind;
        target.appendChild(current);
      }
      current.appendChild(document.createTextNode(item.text));
    }
  }
  function chooseDifference(state, ids, side) {
    rememberScroll();
    for (const id of ids) state.choices[id] = side;
    render();
  }
  function renderChoices(target, state, side) {
    const comparison = state.comparison;
    const characters = comparison[side];
    const empty = new Map();
    const controls = [];
    for (const group of comparison.groups) {
      if (group[side][0] === group[side][1]) {
        const position = group[side][0];
        if (!empty.has(position)) empty.set(position, []);
        empty.get(position).push(group.id);
      }
    }
    function choice(items, ids, omitted = false) {
      if (!state.resolving && !omitted) { renderCharacters(target, items); return; }
      const index = controls.length;
      controls.push(ids);
      const control = state.resolving ? button("", event => {
        const anchor = state.selectionAnchor;
        const selectedIds = event.shiftKey && anchor?.side === side
          ? controls.slice(Math.min(anchor.index, index), Math.max(anchor.index, index) + 1).flat() : ids;
        if (!event.shiftKey || anchor?.side !== side) state.selectionAnchor = {side, index};
        chooseDifference(state, selectedIds, side);
      }) : element("span");
      if (state.resolving) {
        const selected = ids.every(id => state.choices[id] === side);
        control.className = `wb-choice${selected ? " wb-choice-selected" : ""}`;
        control.setAttribute("aria-pressed", String(selected));
        control.setAttribute("aria-label", `Keep ${side === "left" ? "A" : "B"}: ${omitted ? "nothing" : items.map(item => item.text).join("")}`);
      }
      if (omitted) control.appendChild(element("span", "∅", "wb-change wb-omission"));
      else renderCharacters(control, items);
      control.title = state.resolving
        ? "Keep this reading; Shift-click another difference on this side to select a range"
        : "No text on this side";
      target.appendChild(control);
    }
    let position = 0;
    const tokenKind = item => /^\s+$/u.test(item.text) ? "space"
      : /^[\p{Script=Latin}\p{Mark}\p{Number}'’\-]+$/u.test(item.text) ? "word"
        : item.group === undefined ? "plain" : `difference-${item.group}`;
    while (position <= characters.length) {
      for (const id of empty.get(position) || []) choice([], [id], true);
      if (position === characters.length) break;
      const start = position;
      const kind = tokenKind(characters[position]);
      position++;
      while (position < characters.length && !empty.has(position)
        && tokenKind(characters[position]) === kind) position++;
      const items = characters.slice(start, position);
      const ids = [...new Set(items.filter(item => item.group !== undefined).map(item => item.group))];
      if (ids.length) choice(items, ids);
      else renderCharacters(target, items);
    }
  }
  function renderTree(roots, differences, glosses) {
    const list = element("ul", undefined, "wb-tree");
    function addNodes(nodes, parent) {
      for (const node of nodes) {
        const record = differences?.get(node);
        const item = element("li", undefined, record?.kind && record.kind !== "change" ? `wb-${record.kind}` : "");
        const row = element("div", undefined, "wb-tree-row");
        const fields = ["tag", "form", "lemma", "phon", "parts", "annotations", ...(glosses ? ["gloss"] : [])];
        for (const field of fields) {
          let value = node[field];
          if (field === "parts") value = node.parts?.map(part => Object.entries(part).map(([key, item]) =>
            key === "form" ? item : `${key}=${item}`).join(" · ")).join(" / ");
          if (field === "annotations") value = Object.entries(node.annotations || {}).map(([key, item]) => `${key}=${item}`).join(" · ");
          if (!value && !record?.fields.has(field)) continue;
          const span = element(field === "lemma" && value ? "button" : "span", value || "∅",
            `wb-field-${field}${record?.fields.has(field) ? " wb-change" : ""}`);
          span.title = field === "tag" ? displayTag(node.tag, {fullTags: true}) : `${field}: ${value || "absent"}`;
          if (field === "lemma" && value) {
            span.type = "button";
            span.addEventListener("click", () => openDictionaryPopupEntry(value));
          }
          row.appendChild(span);
        }
        item.appendChild(row);
        if (node.children?.length) {
          const children = element("ul");
          addNodes(node.children, children);
          item.appendChild(children);
        }
        parent.appendChild(item);
      }
    }
    addNodes(roots, list);
    return list;
  }
  function renderConversion(container, state) {
    const result = element("pre", undefined, "wb-output");
    result.setAttribute("aria-label", "Converted result");
    const inspect = element("div", undefined, "wb-inspect hidden");
    for (const segment of state.result?.segments || []) {
      if (segment.kind === "plain") { result.appendChild(document.createTextNode(segment.text)); continue; }
      const part = button(segment.text, () => {
        inspect.replaceChildren(element("p", `${segment.input}: ${segment.reason}`));
        for (const ruleId of segment.rules || [segment.rule]) {
          const metadata = state.result.rule_sets[ruleId];
          inspect.appendChild(element("p", `${metadata.name} · ${metadata.status} · ${metadata.origin}`));
        }
        for (const alternative of segment.alternatives) {
          inspect.appendChild(button(`Use ${alternative}`, () => {
            segment.text = alternative;
            segment.kind = "ambiguous";
            segment.reason = "Selected manually for this session. " + segment.reason;
            render();
            status("Alternative selected for this result.");
          }));
        }
        inspect.classList.remove("hidden");
      });
      part.className = `wb-${segment.kind}`;
      part.title = `${segment.reason} Alternatives: ${segment.alternatives.join(" / ") || "none registered"}`;
      result.appendChild(part);
    }
    container.append(result, inspect);
  }
  function renderPane(index, state, grid) {
    const pane = state.panes[index];
    if (pane.hidden) return;
    const container = element("section", undefined, "wb-pane");
    container.dataset.pane = index;
    container.setAttribute("aria-label", modes[mode].paneLabels[index]);
    const heading = element("header", undefined, "wb-pane-heading");
    heading.append(element("h3", modes[mode].paneLabels[index]), button("Hide pane", () => {
      rememberScroll(); pane.hidden = true; render();
    }));
    container.appendChild(heading);
    const tools = element("div", undefined, "wb-pane-tools");
    if (mode === "convert" && index === 1) {
      tools.appendChild(button("Copy result", () => copy(outputText(state))));
      container.appendChild(tools);
      renderConversion(container, state);
      grid.appendChild(container);
      container.scrollTop = pane.scroll;
      return;
    }
    tools.append(button("Clear", () => {
      touch(pane, ""); pane.discrepancy = ""; pane.view = "source"; render();
    }));
    if (mode !== "tree") heading.appendChild(tools);
    if (mode === "tree") {
      tools.appendChild(select("Input format", [["auto", "Auto"], ["txt", "TXT"], ["xml", "XML"]], pane.format,
        value => {
          pane.format = value; pane.parsed = null; pane.revision++; actionRevision++;
          state.panes.forEach(item => { item.differences = null; });
          pane.view = "source"; render();
        }));
      const parseButton = button("Parse Tree", async () => {
        const originalMode = mode;
        await parsePane(pane);
        if (mode === originalMode) { render(); status("Parsed input. Original content is retained."); }
      });
      parseButton.className = "wb-primary-action";
      heading.appendChild(parseButton);
      const identifier = element("input");
      identifier.type = "text";
      identifier.placeholder = "MYS.1.1";
      identifier.value = pane.corpusId;
      identifier.addEventListener("input", () => { pane.corpusId = identifier.value; });
      identifier.setAttribute("aria-label", `Corpus text ID for ${modes[mode].paneLabels[index]}`);
      tools.append(identifier, button("Load text ID", () => loadCorpus(pane, identifier.value.trim())));
      if (pane.representations.length) {
        tools.appendChild(select("Representation", pane.representations.map((item, position) =>
          [String(position), `${item.origin} · ${item.format.toUpperCase()}`]), String(pane.selectedRepresentation), value => {
          const representation = pane.representations[Number(value)];
          pane.selectedRepresentation = Number(value);
          pane.text = representation.content;
          pane.format = representation.format;
          pane.origin = representation.origin;
          pane.parsed = null;
          pane.view = "source";
          pane.revision++;
          actionRevision++;
          state.panes.forEach(item => { item.differences = null; });
          render();
        }));
      }
      tools.appendChild(select("View", [["source", "Source"], ["tree", "Tree"]], pane.view, value => {
        if (value === "tree" && !pane.parsed) { status("Parse this input before showing its tree.", true); render(); return; }
        rememberScroll(); pane.view = value; render();
      }));
    }
    if (mode === "compare") tools.appendChild(select("Compare as", [["raw", "Original text"], ["kanji", "Kanji only"], ["lexical", "Lexical fields (TXT)"]], pane.preprocessing, value => {
      rememberScroll(); pane.preprocessing = value; state.comparison = null;
      state.panes.forEach(item => { item.differences = null; }); actionRevision++; render();
    }));
    if (mode === "tree") container.appendChild(tools);
    const origin = element("p", `${pane.origin}${pane.discrepancy ? " · " + pane.discrepancy : ""}`, "wb-origin");
    if (pane.origin === "User input" && !pane.discrepancy) origin.classList.add("hidden");
    container.appendChild(origin);
    if (pane.view === "tree" && mode === "tree" && pane.parsed) {
      container.appendChild(renderTree(pane.parsed.roots, pane.differences, state.glosses));
    } else {
      const input = element("textarea", undefined, "wb-input");
      input.value = pane.text;
      input.spellcheck = false;
      input.setAttribute("aria-label", `${modes[mode].paneLabels[index]} input`);
      input.placeholder = mode === "tree" ? "Paste one TXT text or XML block…" : "Enter or paste text…";
      input.addEventListener("input", () => {
        touch(pane, input.value);
        pane.discrepancy = "";
        page.querySelectorAll(".wb-output").forEach(node => node.remove());
        page.querySelector(".wb-resolution")?.remove();
        page.querySelectorAll(".wb-tree .wb-change, .wb-tree .wb-add, .wb-tree .wb-delete")
          .forEach(node => node.classList.remove("wb-change", "wb-add", "wb-delete"));
        container.querySelector(".wb-origin").textContent = "User input";
        container.querySelector('[aria-label="Representation"]')?.parentElement.remove();
        status("Input changed. Run the operation again to update results.");
      });
      container.appendChild(input);
      input.scrollTop = pane.textareaScroll;
      if (mode === "compare" && pane.differences) {
        const output = element("pre", undefined, "wb-output");
        output.setAttribute("aria-label", `${modes[mode].paneLabels[index]} differences`);
        renderChoices(output, state, index === 0 ? "left" : "right");
        container.appendChild(output);
      }
    }
    grid.appendChild(container);
    container.scrollTop = pane.scroll;
  }
  async function run() {
    rememberScroll();
    const state = states[mode];
    const originalMode = mode;
    const revision = ++actionRevision;
    status("Working…");
    if (mode === "compare") {
      const texts = await Promise.all(state.panes.map(async pane => {
        if (pane.preprocessing === "kanji") return WorkbenchCore.extractKanji(pane.text);
        if (pane.preprocessing === "lexical") return (await apiFetch("/api/workbench/extract", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({content: pane.text, mode: "lexical"}),
        })).content;
        return pane.text;
      }));
      if (mode !== originalMode || actionRevision !== revision) return;
      const result = WorkbenchCore.compareText(texts[0], texts[1], state);
      state.comparison = result;
      state.choices = {};
      state.selectionAnchor = null;
      state.panes[0].differences = result.left;
      state.panes[1].differences = result.right;
      render(); status(`${result.changes} difference group${result.changes === 1 ? "" : "s"}.${state.resolving ? " Select a preferred reading on either side." : ""}`);
    } else if (mode === "tree") {
      await Promise.all(state.panes.map(pane => pane.parsed ? Promise.resolve(pane.parsed) : parsePane(pane)));
      if (mode !== originalMode || actionRevision !== revision) return;
      const result = WorkbenchCore.compareTrees(state.panes[0].parsed.roots, state.panes[1].parsed.roots);
      state.panes[0].differences = result.left;
      state.panes[1].differences = result.right;
      render(); status(`${result.changes} changed node/subtree group${result.changes === 1 ? "" : "s"}. Branches are matched within their parents.`);
    } else {
      const result = await apiFetch("/api/workbench/convert", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: state.panes[0].text, source: state.source, target: state.target, kana_style: state.kanaStyle}),
      });
      if (mode !== originalMode || actionRevision !== revision) return;
      state.result = result;
      render();
      status(`${result.detected ? "Detected " + catalog.systems[result.source] + ". " : ""}Conversion complete. Select a marked result to inspect alternatives.`);
    }
  }
  function render() {
    const state = states[mode];
    page.replaceChildren();
    const header = element("header", undefined, "wb-header");
    header.append(element("h2", `Workbench · ${modes[mode].label}`));
    const toolbar = element("div", undefined, "wb-toolbar");
    if (mode === "compare") {
      const invalidate = () => { state.comparison = null; actionRevision++; state.panes.forEach(pane => { pane.differences = null; }); render(); };
      toolbar.append(checkbox("Compare spaces", state.spaces, value => { state.spaces = value; invalidate(); }),
        checkbox("Compare line breaks", state.lineBreaks, value => { state.lineBreaks = value; invalidate(); }));
    } else if (mode === "tree") {
      toolbar.appendChild(checkbox("Show glosses", state.glosses, value => { rememberScroll(); state.glosses = value; render(); }));
    } else if (catalog) {
      const swap = button("⇄", () => {
        const actualSource = state.source === "auto" ? state.result?.source : state.source;
        if (!actualSource || !catalog.pairs.some(pair => pair[0] === state.target && pair[1] === actualSource)) {
          throw new Error("The reverse direction is unavailable. Choose explicit systems first.");
        }
        const text = outputText(state);
        [state.source, state.target] = [state.target, actualSource];
        if (state.result) touch(state.panes[0], text, "Generated conversion result");
        state.result = null;
        actionRevision++;
        render();
      });
      swap.className = "wb-swap";
      swap.setAttribute("aria-label", "Swap representations");
      swap.title = "Swap source and target representations";
      toolbar.append(select("From", [["auto", "Auto detect"], ...Object.entries(catalog.systems)], state.source, value => {
        state.source = value;
        if (state.source === state.target) state.target = Object.keys(catalog.systems).find(key => key !== value);
        state.result = null; actionRevision++; render();
      }), swap, select("To", Object.entries(catalog.systems).filter(([key]) => key !== state.source), state.target, value => {
        state.target = value; state.result = null; actionRevision++; render();
      }));
      if (state.target === "kana") toolbar.appendChild(select("Kana script", Object.entries(catalog.kana_styles), state.kanaStyle, value => {
        state.kanaStyle = value; state.result = null; actionRevision++; render();
      }));
    }
    toolbar.appendChild(button(mode === "convert" ? "Convert" : "Compare", run));
    if (mode === "compare") {
      const resolveButton = button(state.resolving ? "Exit resolution" : "Resolve differences", () => {
        rememberScroll(); state.resolving = !state.resolving; state.selectionAnchor = null; render();
      });
      resolveButton.setAttribute("aria-pressed", String(state.resolving));
      toolbar.appendChild(resolveButton);
    }
    state.panes.forEach((pane, index) => {
      if (pane.hidden) toolbar.appendChild(button(`Restore ${modes[mode].paneLabels[index]}`, () => { pane.hidden = false; render(); }));
    });
    header.appendChild(toolbar);
    if (mode !== "convert") {
      const legend = element("div", undefined, "wb-legend");
      legend.append(element("span", "Removed", "wb-delete"), element("span", "Added", "wb-add"), element("span", "Changed", "wb-change"));
      header.appendChild(legend);
    } else {
      const legend = element("div", undefined, "wb-legend");
      legend.append(element("span", "Ambiguous: review", "wb-ambiguous"), element("span", "Unresolved: choose", "wb-unresolved"));
      header.appendChild(legend);
      if (catalog) {
        const details = element("details", undefined, "wb-rules");
        details.appendChild(element("summary", "Conversion rule origins"));
        for (const record of Object.values(catalog.rule_sets)) {
          details.appendChild(element("p", `${record.name}: ${record.status}. ${record.origin}`));
        }
        header.appendChild(details);
      }
    }
    header.appendChild(element("p", "", "wb-status"));
    page.appendChild(header);
    const grid = element("div", undefined, "wb-panes");
    grid.classList.toggle("single", state.panes.filter(pane => !pane.hidden).length < 2);
    state.panes.forEach((pane, index) => renderPane(index, state, grid));
    page.appendChild(grid);
    if (mode === "compare" && state.comparison && state.resolving) {
      const resolved = WorkbenchCore.resolveText(state.comparison, state.choices);
      const resolution = element("section", undefined, "wb-resolution");
      const remaining = state.comparison.groups.filter(group => !state.choices[group.id]).length;
      const copyButton = button("Copy Result", () => copy(WorkbenchCore.resolveText(state.comparison, state.choices)));
      copyButton.disabled = resolved === null;
      const heading = element("div", undefined, "wb-toolbar");
      heading.append(element("strong", "Resolved result"), copyButton,
        element("span", remaining ? `${remaining} choice${remaining === 1 ? "" : "s"} remaining` : "All differences resolved"));
      for (const [side, label] of [["left", "A"], ["right", "B"]]) {
        heading.appendChild(button(`Use all ${label}`, () => {
          state.selectionAnchor = null;
          chooseDifference(state, state.comparison.groups.map(group => group.id), side);
        }));
      }
      resolution.appendChild(element("p", "Click a reading to choose it. Shift-click another difference in the same pane to choose the whole range.", "wb-status"));
      resolution.append(heading, element("pre", resolved === null ? "Choose the highlighted reading for each difference. Ignored whitespace is retained from A." : resolved, "wb-resolved-text"));
      page.appendChild(resolution);
    }
  }
  document.querySelectorAll("[data-wb-mode]").forEach(control => {
    control.addEventListener("click", () => {
      rememberScroll();
      actionRevision++;
      mode = control.dataset.wbMode;
      document.querySelectorAll("[data-wb-mode]").forEach(item => item.setAttribute("aria-pressed", String(item === control)));
      showSidebarView("workbench"); showEditorPage("workbench"); render();
    });
  });
  render();
  apiFetch("/api/workbench/conversions").then(result => { catalog = result; if (mode === "convert") render(); })
    .catch(error => status(error.message, true));
})();
