/* Display-only segmentation. Source trees, forms and search offsets stay intact. */
(function (root) {
  "use strict";
  const words = ["WH-ADJ", "PRO-ADV", "WH-ADV", "PRO-N", "WH-NUM", "WH-N",
    "VB", "ADJ", "COP", "N", "DVN", "PEN", "PLN", "ADV", "INTJ", "NUM",
    "P", "XTN", "MK", "WORD", "ACP", "VAX", "PFX", "SFX", "CL"];
  const phrases = ["NP", "PP", "IP", "CP", "CONJP"];
  function category(tag, reference) {
    tag = String(tag || "").replace(/;@\d+$/, "");
    if (tag === "multi-sentence") return "phrase";
    const base = [...phrases, ...words].find(base => tag === base || tag.startsWith(base + "-"));
    if (!base) return "unknown";
    const suffix = tag.slice(base.length).replace(/^-/, "");
    if (suffix && suffix.split("-").some(part => !reference.suffixes?.[part]
      && !reference.clause_suffixes?.[part] && part !== "FRM")) {
      return "unknown";
    }
    return phrases.includes(base) ? "phrase" : "word";
  }
  function tokens(roots, mode = "word", reference = {}) {
    function terminals(node) {
      if (node.children?.length) return node.children.flatMap(terminals);
      return node.form ? [{text: node.form, phon: node.phon || "", lemma: node.lemma || "",
        gloss: node.gloss || "", parts: (node.parts?.length ? node.parts :
          [{form: node.form, phon: node.phon || ""}]).map(part => ({...part})),
        atoms: [node], annotations: [{start: 0, end: node.form.length,
          gloss: node.gloss || "", phon: node.parts?.length
            ? node.parts.map(part => part.phon).filter(Boolean).join(" + ")
            : node.phon || "", source: node}]}] : [];
    }
    function visit(node) {
      const kind = category(node.tag, reference);
      const special = /^(NULL|ILL)$/.test(node.phon || "") || kind === "unknown"
        || node.parts?.some(part => /^(NULL|ILL)$/.test(part.phon || ""));
      if (!node.children?.length || special || mode === "terminal") {
        return {tokens: terminals(node), stop: special};
      }
      const children = node.children.map(visit);
      const units = children.flatMap(child => child.tokens);
      const stop = kind === "phrase" || children.some(child => child.stop);
      if (stop || !units.length) return {tokens: units, stop};
      const parts = [];
      const annotations = [];
      let position = 0;
      units.forEach((unit, index) => {
        if (index && mode === "hyphenated") {
          parts.push({form: "-", phon: "", separator: true});
          position += 1;
        }
        annotations.push(...unit.annotations.map(annotation => ({...annotation,
          start: annotation.start + position, end: annotation.end + position})));
        parts.push(...unit.parts);
        position += unit.text.length;
      });
      if (node.gloss) {
        // A represented parent gloss replaces descendant display glosses;
        // original node annotations and writing-mode parts remain untouched.
        annotations.forEach(annotation => { annotation.gloss = ""; });
        annotations.push({start: 0, end: position,
          gloss: node.gloss, phon: "", source: node});
      }
      return {stop: false, tokens: [{text: parts.map(part => part.form).join(""),
        phon: "", lemma: node.lemma || "", gloss: node.gloss || "", parts, annotations,
        atoms: units.flatMap(unit => unit.atoms)}]};
    }
    return roots.flatMap(node => visit(node).tokens);
  }
  // Match characters strictly before translating old search offsets. A mismatch
  // keeps the old display, rather than guessing a correspondence.
  function format(roots, segments, mode, preserveRows, reference) {
    const terminal = tokens(roots, "terminal", reference);
    const positions = [];
    let sourceText = "";
    segments.forEach((segment, index) => {
      const text = segment.transcription || "";
      for (let offset = 0; offset < text.length; offset += 1) {
        if (/\s/.test(text[offset])) continue;
        sourceText += text[offset];
        positions.push({segment: index, offset});
      }
    });
    if (!roots.length || terminal.map(token => token.text).join("") !== sourceText) return null;
    const locations = new Map();
    let cursor = 0;
    terminal.forEach(token => {
      locations.set(token.atoms[0], positions.slice(cursor, cursor + token.text.length));
      cursor += token.text.length;
    });
    const output = preserveRows ? segments.map(segment => ({...segment, text: "", chars: [], tokens: []}))
      : [{text: "", chars: [], tokens: []}];
    tokens(roots, mode, reference).forEach(token => {
      let fragment = null;
      let previousAtom = null;
      token.atoms.forEach(atom => {
        const mapped = locations.get(atom) || [];
        let offset = 0;
        const parts = atom.parts?.length ? atom.parts : [{form: atom.form, phon: atom.phon || ""}];
        parts.forEach(part => {
          for (const char of part.form.split("")) {
            const position = mapped[offset++];
            if (!position) continue;
            const row = preserveRows ? position.segment : 0;
            if (!fragment || fragment.row !== row) {
              fragment = {row, text: "", parts: [], chars: [], lemma: token.lemma, gloss: token.gloss};
              output[row].tokens.push(fragment);
              previousAtom = null;
            }
            if (previousAtom && previousAtom !== atom && mode === "hyphenated") {
              fragment.text += "-";
              fragment.parts.push({form: "-", phon: ""});
              fragment.chars.push(null);
            }
            fragment.text += char;
            const last = fragment.parts.at(-1);
            if (last && last.phon === (part.phon || "")) last.form += char;
            else fragment.parts.push({form: char, phon: part.phon || ""});
            fragment.chars.push(position);
            previousAtom = atom;
          }
        });
      });
    });
    output.forEach(row => row.tokens.forEach((token, index) => {
      if (index) { row.text += " "; row.chars.push(null); }
      row.text += token.text;
      row.chars.push(...token.chars);
    }));
    return output;
  }
  function ranges(row, sourceRanges) {
    const result = [];
    row.chars.forEach((position, index) => {
      if (!position || !sourceRanges.some(range => range.segment === position.segment
        && position.offset >= range.start && position.offset < range.end)) return;
      const previous = result.at(-1);
      if (previous?.end === index) previous.end += 1;
      else result.push({start: index, end: index + 1});
    });
    return result;
  }
  const api = {tokens, format, ranges};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.COJSegmentation = api;
})(globalThis);
