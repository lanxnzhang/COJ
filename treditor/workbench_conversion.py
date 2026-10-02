from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from coj.core.kana import _KANA_RAW

RULES = json.loads((Path(__file__).parent / "conversion_rules.json").read_text(encoding="utf-8"))
SYSTEMS = {
    "fw": "Old Japanese · Frellesvig–Whitman",
    "historical-katakana": "Old Japanese · historical katakana",
    "hepburn": "Modern Japanese · Hepburn",
    "hiragana": "Modern Japanese · hiragana",
    "katakana": "Modern Japanese · katakana",
}
MODERN = {kana: roman for row, readings in RULES["hepburn_rows"] for kana, roman in zip(row, readings)}
MODERN.update(RULES["hepburn_pairs"])
MODERN.update(RULES["project_hepburn_overrides"])
PAIRS = {
    ("fw", "historical-katakana"), ("historical-katakana", "fw"),
    ("hepburn", "hiragana"), ("hepburn", "katakana"),
    ("hiragana", "hepburn"), ("katakana", "hepburn"),
    ("hiragana", "katakana"), ("katakana", "hiragana"),
}


def conversion_catalog():
    return {"systems": SYSTEMS, "pairs": sorted(PAIRS), "rule_sets": RULES["rule_sets"],
            "version": RULES["version"]}


def kana_script(text: str, katakana: bool) -> str:
    result = []
    for character in text:
        code = ord(character)
        if katakana and 0x3041 <= code <= 0x3096:
            character = chr(code + 0x60)
        elif not katakana and 0x30A1 <= code <= 0x30F6:
            character = chr(code - 0x60)
        result.append(character)
    return "".join(result)


def reverse_map(table):
    result = {}
    for source, target in table:
        result.setdefault(target, [])
        if source not in result[target]:
            result[target].append(source)
    return result


def detect_system(text: str, target: str) -> str:
    if re.search(r"[ぁ-ゖ]", text) and not re.search(r"[ァ-ヺ]", text):
        return "hiragana"
    if re.search(r"[ァ-ヺ]", text) and not re.search(r"[ぁ-ゖ]", text):
        if target == "fw":
            raise ValueError("Katakana alone cannot establish a historical transcription system. Select historical katakana explicitly.")
        return "katakana"
    raise ValueError("The input system cannot be detected reliably. Select it explicitly.")


def convert(text: str, source: str, target: str) -> dict:
    detected = source == "auto"
    if detected:
        source = detect_system(text, target)
    if (source, target) not in PAIRS:
        raise ValueError("This conversion direction is not registered. Select a supported source/result pair.")
    if source in {"hiragana", "katakana"} and target in {"hiragana", "katakana"}:
        output = kana_script(unicodedata.normalize("NFC", text), target == "katakana")
        return {"source": source, "target": target, "detected": detected,
                "segments": [{"text": output, "kind": "plain", "rule": "hepburn"}],
                "rule_sets": RULES["rule_sets"], "version": RULES["version"]}
    rule = "fw" if source == "fw" or target == "fw" else "hepburn"
    segments = []
    kana_input = source in {"historical-katakana", "hiragana", "katakana"}
    normalized = unicodedata.normalize("NFC", text)
    normalized = kana_script(normalized, target == "fw") if kana_input else normalized.lower()
    if source == "fw":
        mapping = {roman: [kana] for roman, kana in _KANA_RAW}
    elif target == "fw":
        mapping = reverse_map(_KANA_RAW)
    elif kana_input:
        mapping = {kana: [roman] for kana, roman in MODERN.items()}
        macrons = dict(zip("aiueo", "āīūēō"))
        for kana, roman in MODERN.items():
            if roman[-1:] in macrons:
                mapping[kana + "ー"] = [roman[:-1] + macrons[roman[-1]]]
                endings = {"a": "あ", "i": "い", "u": "う", "e": "えい", "o": "おう"}[roman[-1]]
                for ending in endings:
                    mapping[kana + ending] = [roman[:-1] + macrons[roman[-1]], roman + MODERN[ending]]
    else:
        mapping = reverse_map(MODERN.items())
        extensions = {"a": ["あ"], "i": ["い"], "u": ["う"],
                      "e": ["え", "い"], "o": ["う", "お"]}
        macrons = dict(zip("aiueo", "āīūēō"))
        for roman, choices in list(mapping.items()):
            if roman[-1:] in macrons:
                mapping[roman[:-1] + macrons[roman[-1]]] = [
                    kana + ending for kana in choices for ending in extensions[roman[-1]]
                ]
    keys = sorted(mapping, key=len, reverse=True)

    def emit(value, original, alternatives=None, preferred=None, reason="", rule_id=rule):
        alternatives = alternatives or []
        if target in {"katakana", "historical-katakana"}:
            value = kana_script(value, True)
            alternatives = [kana_script(item, True) for item in alternatives]
        segments.append({"text": value, "input": original, "alternatives": alternatives,
                         "kind": "ambiguous" if preferred else "unresolved" if alternatives or reason else "plain",
                         "reason": reason, "rule": rule_id})

    position = 0
    while position < len(normalized):
        character = normalized[position]
        if character.isspace() or unicodedata.category(character).startswith(("P", "N")):
            if character not in {"'", "’"}:
                emit(character, character)
                position += 1
                continue
        if source == "hepburn" and character == "n":
            following = normalized[position + 1:position + 2]
            if following in {"'", "’"} or not following or following not in "aiueoyn":
                emit("ん", normalized[position:position + 2] if following in {"'", "’"} else "n")
                position += 2 if following in {"'", "’"} else 1
                continue
        if source == "hepburn" and position + 1 < len(normalized):
            doubled = character == normalized[position + 1] and character in "kstpchfgzbdr"
            if doubled or normalized[position:position + 3] == "tch":
                emit("っ", character)
                position += 1
                continue
        if kana_input and rule == "hepburn" and character == "っ":
            next_key = next((key for key in keys if normalized.startswith(key, position + 1)), None)
            following = mapping[next_key][0] if next_key else ""
            if following and following[0] in "kstpchfgzbdr":
                emit("t" if following.startswith("ch") else following[0], character)
            else:
                emit("□", character, reason="Small tsu has no supported following consonant.")
            position += 1
            continue
        if kana_input and rule == "hepburn" and character == "ー":
            previous = segments[-1]["text"] if segments else ""
            vowels = re.findall(r"[aeiou]", previous)
            emit(vowels[-1] if vowels else "□", character,
                 reason="The prolonged sound mark needs a preceding vowel." if not vowels else "")
            position += 1
            continue
        key = next((key for key in keys if normalized.startswith(key, position)), None)
        if key is None:
            emit("□", character, reason="No registered rule covers this character.")
            position += 1
            continue
        choices = mapping[key]
        preferred = None
        rule_id = rule
        if target == "fw" and len(choices) > 1:
            policy = RULES["rule_sets"]["fw_defaults"]
            preferred = policy["defaults"].get(key)
            if preferred not in choices and policy["prefer_unmarked_vowels"]:
                candidates = [value for value in choices if not re.search(r"[wy][ieo]", value)]
                preferred = candidates[0] if len(candidates) == 1 else None
            if preferred:
                rule_id = "fw_defaults"
        if len(choices) > 1:
            emit(preferred or "□", key, choices, preferred,
                 "The source does not distinguish these readings; review the alternatives.", rule_id)
        else:
            value = choices[0]
            if rule == "hepburn" and kana_input and key == "ん":
                next_key = next((item for item in keys if normalized.startswith(item, position + len(key))), None)
                if next_key and mapping[next_key][0].startswith(tuple("aiueoy")):
                    value = "n'"
            emit(value, key)
        position += len(key)
    return {"source": source, "target": target, "detected": detected, "segments": segments,
            "rule_sets": RULES["rule_sets"], "version": RULES["version"]}
