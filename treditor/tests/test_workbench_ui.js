"use strict";
// A small DOM double exercises the real UI script without a browser dependency.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {};
    this.events = {}; this.className = ""; this.value = ""; this.scrollTop = 0;
    this.ownText = "";
  }
  set textContent(value) { this.ownText = value; this.children = []; }
  get textContent() { return this.ownText + this.children.map(node => node.textContent).join(""); }
  get classList() {
    const node = this;
    return {
      add(...items) { node.className = [...new Set([...node.className.split(" ").filter(Boolean), ...items])].join(" "); },
      remove(...items) { node.className = node.className.split(" ").filter(item => !items.includes(item)).join(" "); },
      toggle(item, enabled) {
        if (enabled ?? !node.className.split(" ").includes(item)) this.add(item); else this.remove(item);
      },
    };
  }
  append(...items) { for (const item of items) { item.parentElement = this; this.children.push(item); } }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this.children = []; this.ownText = ""; this.append(...items); }
  remove() { this.parentElement.children = this.parentElement.children.filter(item => item !== this); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  async dispatch(type, properties = {}) { for (const callback of this.events[type] || []) await callback({target: this, ...properties}); }
  matches(selector) {
    if (selector.startsWith(".")) return this.className.split(" ").includes(selector.slice(1));
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute) {
      const value = attribute[1].startsWith("data-")
        ? this.dataset[attribute[1].slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]
        : this.attributes[attribute[1]];
      return attribute[2] === undefined ? value !== undefined : value === attribute[2];
    }
    return this.tag === selector;
  }
  querySelectorAll(selector) {
    const result = [];
    for (const child of this.children) {
      if (child.matches(selector)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

async function main() {
  const body = new Element("body");
  const detail = new Element("section"); detail.className = "detail-pane"; body.append(detail);
  const controls = ["compare", "convert", "tree"].map(mode => {
    const button = new Element("button"); button.dataset.wbMode = mode; body.append(button); return button;
  });
  const requests = [];
  const copied = [];
  const context = vm.createContext({
    document: {
      createElement: tag => new Element(tag),
      createTextNode: text => { const node = new Element("#text"); node.textContent = text; return node; },
      querySelector: selector => body.querySelector(selector),
      querySelectorAll: selector => body.querySelectorAll(selector),
    },
    navigator: {clipboard: {writeText: async text => { copied.push(text); }}},
    WorkbenchCore: require("../static/workbench-core.js"),
    showSidebarView() {}, showEditorPage() {}, displayTag: tag => tag,
    openDictionaryPopupEntry() {},
    apiFetch: async (url, options) => {
      if (url.endsWith("conversions")) return {
        systems: {kana: "Japanese kana", hepburn: "Modern Hepburn", fw: "Frellesvig–Whitman"},
        pairs: [["kana", "hepburn"], ["hepburn", "kana"], ["fw", "kana"], ["kana", "fw"], ["fw", "hepburn"], ["hepburn", "fw"]],
        kana_styles: {hiragana: "Hiragana", katakana: "Katakana"}, rule_sets: {},
      };
      const request = JSON.parse(options.body); requests.push(request);
      if (url.endsWith("extract")) return {content: "paru saraba kazasi"};
      return {source: request.source, target: request.target, rule_sets: {}, segments: [{text: "tarachishi", kind: "plain"}]};
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../static/workbench.js"), "utf8"), context);
  await Promise.resolve();
  const page = detail.children[0];
  const button = label => page.querySelectorAll("button").find(item => item.textContent === label);
  const field = label => page.querySelector(`[aria-label="${label}"]`);
  assert.equal(page.querySelectorAll("input").some(item => item.type === "file"), false);
  assert.equal(button("Copy input"), undefined);
  assert.equal(page.querySelectorAll("button").filter(item => item.textContent === "Clear").length, 2);
  await controls[1].dispatch("click");
  field("Source input").value = "たらちし";
  await field("Source input").dispatch("input");
  await button("Convert").dispatch("click");
  assert.equal(requests[0].source, "kana");
  assert.equal(requests[0].target, "hepburn");
  const toolbar = page.querySelector(".wb-toolbar");
  assert.deepEqual(toolbar.children.slice(0, 3).map(item => item.tag), ["label", "button", "label"]);
  assert.equal(toolbar.children[1].attributes["aria-label"], "Swap representations");
  await toolbar.children[1].dispatch("click");
  assert.equal(field("From").value, "hepburn");
  assert.equal(field("To").value, "kana");
  assert.equal(field("Source input").value, "tarachishi");
  field("Kana script").value = "katakana";
  await field("Kana script").dispatch("change");
  await button("Convert").dispatch("click");
  assert.equal(requests[1].kana_style, "katakana");
  await controls[0].dispatch("click");
  await controls[1].dispatch("click");
  assert.equal(field("Source input").value, "tarachishi");
  assert.equal(button("Load file"), undefined);
  await controls[0].dispatch("click");
  field("Text A input").value = "CP,N,LOG,paru\nCP,N,LOG,saraba\nCP,N,LOG,kazasi";
  await field("Text A input").dispatch("input");
  const preprocessing = page.querySelectorAll('[aria-label="Compare as"]')[0];
  preprocessing.value = "lexical";
  await preprocessing.dispatch("change");
  field("Text B input").value = "paru saraba kasasi";
  await field("Text B input").dispatch("input");
  await button("Compare").dispatch("click");
  assert.equal(button("Copy Result"), undefined);
  assert.equal(page.querySelector(".wb-resolution"), null);
  assert.equal(page.querySelectorAll(".wb-choice").length, 0);
  await button("Resolve differences").dispatch("click");
  assert.equal(button("Copy Result").disabled, true);
  await button("kasasi").dispatch("click");
  assert.equal(button("Copy Result").disabled, false);
  assert.equal(button("kasasi").attributes["aria-pressed"], "true");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "paru saraba kasasi");
  await button("kazasi").dispatch("click");
  assert.equal(button("kazasi").attributes["aria-pressed"], "true");
  assert.equal(button("kasasi").attributes["aria-pressed"], "false");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "paru saraba kazasi");
  assert.equal(field("Text A input").value, "CP,N,LOG,paru\nCP,N,LOG,saraba\nCP,N,LOG,kazasi");
  const originalMode = page.querySelectorAll('[aria-label="Compare as"]')[0];
  originalMode.value = "raw";
  await originalMode.dispatch("change");
  field("Text A input").value = "春去者挿頭";
  await field("Text A input").dispatch("input");
  field("Text B input").value = "秋去者插頭";
  await field("Text B input").dispatch("input");
  await button("Compare").dispatch("click");
  await button("秋").dispatch("click");
  assert.equal(button("Copy Result").disabled, true);
  await button("插").dispatch("click");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "秋去者插頭");
  await button("Exit resolution").dispatch("click");
  field("Text A input").value = "warapagami";
  await field("Text A input").dispatch("input");
  field("Text B input").value = "warapagamwi";
  await field("Text B input").dispatch("input");
  await button("Compare").dispatch("click");
  assert.equal(button("Copy Result"), undefined);
  assert.equal(page.querySelectorAll(".wb-choice").length, 0);
  assert.equal(page.querySelector(".wb-omission").textContent, "∅");
  assert.ok(page.querySelector(".wb-omission").className.includes("wb-change"));
  await button("Resolve differences").dispatch("click");
  await field("Keep A: nothing").dispatch("click");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "warapagami");
  await button("Use all B").dispatch("click");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "warapagamwi");
  field("Text A input").value = "alpha beta gamma";
  await field("Text A input").dispatch("input");
  field("Text B input").value = "alphi beto gammo";
  await field("Text B input").dispatch("input");
  await button("Compare").dispatch("click");
  await button("alphi").dispatch("click");
  assert.equal(button("Copy Result").disabled, true);
  await button("gammo").dispatch("click", {shiftKey: true});
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "alphi beto gammo");
  await button("Exit resolution").dispatch("click");
  assert.equal(button("Copy Result"), undefined);
  assert.equal(page.querySelectorAll(".wb-choice").length, 0);
  await button("Resolve differences").dispatch("click");
  assert.equal(button("Copy Result").disabled, false);
  await button("Compare").dispatch("click");
  await button("alpha").dispatch("click");
  await button("gammo").dispatch("click", {shiftKey: true});
  assert.equal(button("Copy Result").disabled, true); // A's anchor does not select a range in B.
  await button("beto").dispatch("click", {shiftKey: true});
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "alpha beto gammo");
  await button("Use all A").dispatch("click");
  await button("Copy Result").dispatch("click");
  assert.equal(copied.at(-1), "alpha beta gamma");
  await controls[2].dispatch("click");
  assert.ok(button("Parse Tree"));
  assert.equal(button("Parse Tree").className, "wb-primary-action");
  const css = fs.readFileSync(path.join(__dirname, "../static/workbench.css"), "utf8");
  assert.match(css, /#sidebar-workbench \.search-message \{ margin: 20px/);
  assert.match(css, /\.wb-tree ul > li::after/);
  assert.match(css, /\.wb-tree ul > li:last-child::before/);
  console.log("Workbench controls, opt-in resolution, range/bulk choices, omissions, copying, and session state passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
