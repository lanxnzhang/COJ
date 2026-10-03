"use strict";

const WorkbenchCore = (() => {
  function characters(text, options) {
    if (!globalThis.Intl?.Segmenter) throw new Error("This browser needs Unicode grapheme support (Intl.Segmenter). Please update it.");
    const segmenter = new Intl.Segmenter(undefined, {granularity: "grapheme"});
    return Array.from(segmenter.segment(text), entry => {
      const newline = /[\r\n\u2028\u2029]/u.test(entry.segment);
      const space = /^\p{White_Space}+$/u.test(entry.segment) && !newline;
      return {text: entry.segment, value: entry.segment.normalize("NFC"),
        ignored: (newline && !options.lineBreaks) || (space && !options.spaces), kind: "plain"};
    });
  }

  function edits(left, right) {
    if (left.length + right.length > 100000) throw new Error("Comparison is limited to 100,000 visible characters in total.");
    let frontier = new Map([[1, 0]]);
    const trace = [];
    const maximum = Math.min(left.length + right.length, 1000);
    for (let distance = 0; distance <= maximum; distance++) {
      trace.push(new Map(frontier));
      for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
        const before = frontier.get(diagonal - 1) ?? -Infinity;
        const after = frontier.get(diagonal + 1) ?? -Infinity;
        let position = diagonal === -distance || (diagonal !== distance && before < after)
          ? after : before + 1;
        let other = position - diagonal;
        while (position < left.length && other < right.length && left[position] === right[other]) {
          position++;
          other++;
        }
        frontier.set(diagonal, position);
        if (position >= left.length && other >= right.length) {
          const operations = [];
          let leftPosition = left.length;
          let rightPosition = right.length;
          for (let step = distance; step >= 0; step--) {
            const previous = trace[step];
            const currentDiagonal = leftPosition - rightPosition;
            const priorDiagonal = currentDiagonal === -step || (currentDiagonal !== step
              && (previous.get(currentDiagonal - 1) ?? -Infinity) < (previous.get(currentDiagonal + 1) ?? -Infinity))
              ? currentDiagonal + 1 : currentDiagonal - 1;
            const priorLeft = previous.get(priorDiagonal) ?? 0;
            const priorRight = priorLeft - priorDiagonal;
            while (leftPosition > priorLeft && rightPosition > priorRight) {
              operations.push({kind: "equal", left: --leftPosition, right: --rightPosition});
            }
            if (step === 0) break;
            if (leftPosition === priorLeft) operations.push({kind: "add", right: --rightPosition});
            else operations.push({kind: "delete", left: --leftPosition});
          }
          return operations.reverse();
        }
      }
    }
    throw new Error("These inputs contain too many differences for interactive comparison. Compare smaller sections.");
  }

  function compareText(leftText, rightText, options = {}) {
    const left = characters(leftText, options);
    const right = characters(rightText, options);
    const leftIndexes = left.map((item, index) => item.ignored ? null : index).filter(index => index !== null);
    const rightIndexes = right.map((item, index) => item.ignored ? null : index).filter(index => index !== null);
    const operations = edits(leftIndexes.map(index => left[index].value), rightIndexes.map(index => right[index].value));
    let group = [];
    let changes = 0;
    const groups = [];
    let leftCursor = 0;
    let rightCursor = 0;
    function flush() {
      if (!group.length) return;
      changes++;
      const leftPositions = group.filter(item => item.kind === "delete").map(item => leftIndexes[item.left]);
      const rightPositions = group.filter(item => item.kind === "add").map(item => rightIndexes[item.right]);
      const range = (positions, indexes, cursor, length) => positions.length
        ? [positions[0], positions.at(-1) + 1] : [indexes[cursor] ?? length, indexes[cursor] ?? length];
      groups.push({id: groups.length,
        left: range(leftPositions, leftIndexes, leftCursor, left.length),
        right: range(rightPositions, rightIndexes, rightCursor, right.length)});
      const replacement = group.some(item => item.kind === "add") && group.some(item => item.kind === "delete");
      for (const item of group) {
        const character = item.kind === "add" ? right[rightIndexes[item.right]] : left[leftIndexes[item.left]];
        character.kind = replacement ? "change" : item.kind;
        character.group = groups.length - 1;
      }
      group = [];
    }
    for (const operation of operations) {
      if (operation.kind === "equal") flush();
      else group.push(operation);
      if (operation.left !== undefined) leftCursor = operation.left + 1;
      if (operation.right !== undefined) rightCursor = operation.right + 1;
    }
    flush();
    return {left, right, changes, groups};
  }

  function extractKanji(text) {
    return (text.match(/[\p{Unified_Ideograph}\u3007](?:[\p{Unified_Ideograph}\u3007]|\p{Variation_Selector})*/gu) || []).join(" ");
  }

  function resolveText(comparison, choices) {
    if (comparison.groups.some(group => !["left", "right"].includes(choices[group.id]))) return null;
    let position = 0;
    let text = "";
    const slice = (items, start, end) => items.slice(start, end).map(item => item.text).join("");
    for (const group of comparison.groups) {
      text += slice(comparison.left, position, group.left[0]);
      const side = choices[group.id];
      if (side === "left") text += slice(comparison.left, ...group.left);
      else {
        const selected = comparison.right.slice(...group.right).filter(item => !item.ignored);
        const spacing = new Map();
        let index = 0;
        for (const item of comparison.left.slice(...group.left)) {
          if (item.ignored) {
            const boundary = Math.min(index, selected.length);
            spacing.set(boundary, (spacing.get(boundary) || "") + item.text);
          } else index++;
        }
        for (let index = 0; index <= selected.length; index++) {
          text += (spacing.get(index) || "") + (selected[index]?.text || "");
        }
      }
      position = group.left[1];
    }
    return text + slice(comparison.left, position, comparison.left.length);
  }

  const fields = ["tag", "form", "lemma", "phon", "parts", "annotations"];
  function fieldValue(node, field) {
    if (field === "parts") return JSON.stringify((node.parts || []).map(part => Object.entries(part).sort()));
    if (field === "annotations") return JSON.stringify(Object.entries(node.annotations || {}).sort());
    return String(node[field] || "");
  }

  function compareTrees(leftRoots, rightRoots) {
    const left = new Map();
    const right = new Map();
    let changes = 0;
    function mark(nodes, map, kind) {
      for (const node of nodes) {
        map.set(node, {kind, fields: new Set()});
        mark(node.children || [], map, kind);
      }
    }
    function align(leftNodes, rightNodes) {
      if (leftNodes.length * rightNodes.length > 1000000) throw new Error("Too many sibling nodes to compare interactively.");
      const costs = Array.from({length: leftNodes.length + 1}, () => new Uint32Array(rightNodes.length + 1));
      const gap = 4;
      for (let row = 0; row <= leftNodes.length; row++) costs[row][0] = row * gap;
      for (let column = 0; column <= rightNodes.length; column++) costs[0][column] = column * gap;
      // Prefer a shared lexical form over a merely shared category when siblings repeat.
      const weights = {form: 3, lemma: 1, phon: 1, parts: 3, annotations: 1};
      const substitution = (nodeA, nodeB) => nodeA.tag !== nodeB.tag ? gap * 2
        : Math.min(gap * 2 - 1, Object.entries(weights).reduce((cost, [field, weight]) =>
          cost + (fieldValue(nodeA, field) === fieldValue(nodeB, field) ? 0 : weight), 0));
      for (let row = 1; row <= leftNodes.length; row++) {
        for (let column = 1; column <= rightNodes.length; column++) {
          costs[row][column] = Math.min(costs[row - 1][column] + gap, costs[row][column - 1] + gap,
            costs[row - 1][column - 1] + substitution(leftNodes[row - 1], rightNodes[column - 1]));
        }
      }
      let row = leftNodes.length;
      let column = rightNodes.length;
      const pairs = [];
      while (row || column) {
        if (row && column && costs[row][column] === costs[row - 1][column - 1]
          + substitution(leftNodes[row - 1], rightNodes[column - 1])) {
          pairs.push([leftNodes[--row], rightNodes[--column]]);
        } else if (row && costs[row][column] === costs[row - 1][column] + gap) {
          pairs.push([leftNodes[--row], null]);
        } else pairs.push([null, rightNodes[--column]]);
      }
      for (const [nodeA, nodeB] of pairs.reverse()) {
        if (!nodeA) { mark([nodeB], right, "add"); changes++; continue; }
        if (!nodeB) { mark([nodeA], left, "delete"); changes++; continue; }
        const changed = new Set(fields.filter(field => fieldValue(nodeA, field) !== fieldValue(nodeB, field)));
        if (changed.size) {
          left.set(nodeA, {kind: "change", fields: changed});
          right.set(nodeB, {kind: "change", fields: changed});
          changes++;
        }
        align(nodeA.children || [], nodeB.children || []);
      }
    }
    align(leftRoots, rightRoots);
    return {left, right, changes};
  }
  return {compareText, compareTrees, fieldValue, extractKanji, resolveText};
})();

if (typeof module !== "undefined") module.exports = WorkbenchCore;
