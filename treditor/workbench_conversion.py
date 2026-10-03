from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from coj.core.kana import _KANA_RAW

RULES = json.loads((Path(__file__).parent / "conversion_rules.json").read_text(encoding="utf-8"))
SYSTEMS = {
    "kana": "Japanese kana",
    "hepburn": "Modern Hepburn",
    "fw": "Frellesvig–Whitman",
}
MODERN = {kana: roman for row, readings in RULES["hepburn_rows"] for kana, roman in zip(row, readings)}
MODERN.update(RULES["hepburn_pairs"])
MODERN.update(RULES["project_hepburn_overrides"])
DIRECT_PAIRS = {
    ("fw", "historical-katakana"), ("historical-katakana", "fw"),
    ("hepburn", "hiragana"), ("hepburn", "katakana"),
    ("hiragana", "hepburn"), ("katakana", "hepburn"),
    ("hiragana", "katakana"), ("katakana", "hiragana"),
}
PAIRS = {(source, target) for source in SYSTEMS for target in SYSTEMS if source != target}


def conversion_catalog():
    return {"systems": SYSTEMS, "pairs": sorted(PAIRS), "rule_sets": RULES["rule_sets"],
            "version": RULES["version"], "kana_styles": {"hiragana": "Hiragana", "katakana": "Katakana"}}


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
    if re.search(r"[ぁ-ゖァ-ヺ]", text) and not re.search(r"[A-Za-z]", text):
        return "kana"
    raise ValueError("The input system cannot be detected reliably. Select it explicitly.")


def _convert_direct(text: str, source: str, target: str) -> dict:
    detected = False
    if (source, target) not in DIRECT_PAIRS:
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


def _compose(text: str, source: str, target: str) -> dict:
    """Compose existing spelling mappings via kana, retaining stage uncertainty."""
    intermediate = _convert_direct(text, source, "historical-katakana" if source == "fw" else "katakana")
    kana = "".join(segment["text"] for segment in intermediate["segments"])
    final = _convert_direct(kana, "historical-katakana" if target == "fw" else "katakana", target)
    ranges = []
    position = 0
    for segment in intermediate["segments"]:
        ranges.append((position, position + len(segment["text"]), segment))
        position += len(segment["text"])
    position = 0
    cursor = 0
    for segment in final["segments"]:
        end = position + len(segment["input"])
        while cursor < len(ranges) and ranges[cursor][1] <= position:
            cursor += 1
        origins = []
        current = cursor
        while current < len(ranges) and ranges[current][0] < end:
            origins.append(ranges[current][2])
            current += 1
        position = end
        segment["rules"] = list(dict.fromkeys([item["rule"] for item in origins] + [segment["rule"]]))
        segment["input"] = "".join(item["input"] for item in origins)
        uncertain = [item for item in origins if item["kind"] != "plain"]
        if uncertain:
            alternatives = []
            # An unresolved first-stage syllable stays unresolved; never feed its
            # placeholder back into the tokenizer as though it were source data.
            for item in uncertain:
                for alternative in item["alternatives"]:
                    converted = _convert_direct(alternative, "historical-katakana" if target == "fw" else "katakana", target)
                    if len(converted["segments"]) == 1 and converted["segments"][0]["alternatives"]:
                        alternatives.extend(converted["segments"][0]["alternatives"])
                    else:
                        value = "".join(part["text"] for part in converted["segments"])
                        if "□" not in value:
                            alternatives.append(value)
            segment["alternatives"] = list(dict.fromkeys(alternatives))
            segment["kind"] = "unresolved"
            segment["text"] = "□"
            segment["reason"] = "The source spelling leaves the kana reading unresolved. " + uncertain[0]["reason"]
    return final


def convert(text: str, source: str, target: str, kana_style: str = "hiragana") -> dict:
    if not isinstance(source, str) or not isinstance(target, str):
        raise ValueError("Select source and target representations.")
    if not isinstance(kana_style, str) or kana_style not in {"hiragana", "katakana"}:
        raise ValueError("Kana output must use Hiragana or Katakana.")
    detected = source == "auto"
    if detected:
        source = detect_system(text, target)
    if source in {"fw", "hepburn"} and target in {"fw", "hepburn"} and source != target:
        result = _compose(text, source, target)
    elif source == "kana" and target in {"fw", "hepburn"}:
        result = _convert_direct(text, "historical-katakana" if target == "fw" else "hiragana", target)
    elif target == "kana" and source in {"fw", "hepburn"}:
        result = _convert_direct(text, source, "historical-katakana" if source == "fw" else kana_style)
        if source == "fw" and kana_style == "hiragana":
            for segment in result["segments"]:
                segment["text"] = kana_script(segment["text"], False)
                segment["alternatives"] = [kana_script(item, False) for item in segment["alternatives"]]
    else:
        # Retain the first version's API spellings for compatibility, without
        # presenting them as additional linguistic systems in the interface.
        result = _convert_direct(text, source, target)
    result.update(source=source, target=target, detected=detected, kana_style=kana_style)
    return result
