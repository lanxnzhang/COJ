"""Read-only corpus adapter. No export, migration, or linguistic inference."""

import hashlib
from pathlib import Path
import xml.etree.ElementTree as ET
from uuid import NAMESPACE_URL, uuid5

from .model import compact, new_document, new_passage, new_text, validate

METADATA = {"raw-text", "roundtrip-data", "comment", "form-parts"}


def stable(base, address):
    return str(uuid5(NAMESPACE_URL, base + ":" + address))


class LegacyCorpus:
    def __init__(self, root):
        self.root = Path(root)
        self.cache = {}

    def paths(self):
        result = {}
        for source in ("trees", "text"):
            folder = self.root / "xml" / source
            for path in sorted(folder.glob("*.xml")):
                if not path.is_symlink() and path.resolve().is_relative_to(self.root.resolve()):
                    result[source + ":" + path.stem] = path
        return result

    def inventory(self):
        result = []
        for key, path in self.paths().items():
            stamp = (path.stat().st_mtime_ns, path.stat().st_size)
            if self.cache.get(key, (None,))[0] != stamp:
                root = ET.parse(path).getroot()
                texts = [{"key": str(i), "text_id": b.get("id", "")}
                         for i, b in enumerate(root.findall("block"))]
                self.cache[key] = (stamp, texts)
            result.append({"key": key, "name": path.stem, "texts": self.cache[key][1]})
        return result

    def open(self, key):
        path = self.paths().get(key)
        if path is None:
            raise FileNotFoundError("Corpus Document not found.")
        content = path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        base = key + ":" + digest
        document = new_document(path.stem, stable(base, "document"))
        document["compatibility"] = {"origin": key, "xml_sha256": digest,
                                     "original_xml": content.decode("utf-8-sig")}
        source = key.split(":", 1)[0]
        txt_path = self.root / "txt" / source / (path.stem + ".txt")
        if txt_path.is_file() and not txt_path.is_symlink() and txt_path.resolve().is_relative_to(self.root.resolve()):
            txt = txt_path.read_bytes()
            document["compatibility"].update(original_txt=txt.decode("utf-8-sig"),
                                              txt_sha256=hashlib.sha256(txt).hexdigest())
        for index, block in enumerate(ET.fromstring(content).findall("block")):
            text_key = stable(base, f"text:{index}")
            text = new_text(block.get("id", ""))
            text["historical_header"] = block.get("header")
            text["compatibility"] = {"block_attributes": dict(block.attrib),
                                     "original_block_xml": ET.tostring(block, encoding="unicode"),
                                     "issues": []}
            document["texts"][text_key] = text
            document["text_order"].append(text_key)
            atoms = []

            def node(element, address):
                node_id = stable(base, f"text:{index}:node:{address}")
                children = [c for c in element if c.tag not in METADATA]
                record = {"category": element.get("raw_tag") or element.tag,
                          "lemma": element.get("lemma"), "form": None if children else element.get("form", ""),
                          "script": element.get("phon"), "children": [], "parts": [],
                          "annotations": {k: v for k, v in element.attrib.items()
                                          if k not in {"lemma", "form", "phon"}}}
                text["nodes"][node_id] = record
                for part_index, part in enumerate(element.findall("./form-parts/part")):
                    part_id = stable(base, f"text:{index}:part:{address}:{part_index}")
                    record["parts"].append({"id": part_id, "form": part.get("form", ""),
                                            "script": part.get("phon"),
                                            "annotations": {k: v for k, v in part.attrib.items() if k not in {"form", "phon"}}})
                if not children:
                    if record["parts"]:
                        atoms.extend((node_id, part["id"], part["form"]) for part in record["parts"])
                    elif record["form"]:
                        atoms.append((node_id, None, record["form"]))
                for child_index, child in enumerate(children):
                    record["children"].append(node(child, address + "." + str(child_index)))
                return node_id

            for root_index, element in enumerate(c for c in block if c.tag not in METADATA):
                text["roots"].append(node(element, str(root_index)))
            for passage_index, sentence in enumerate(block.findall("./raw-text/sentence")):
                passage_id = stable(base, f"text:{index}:passage:{passage_index}")
                passage = new_passage(sentence.findtext("kanji", ""), sentence.findtext("transcription", ""))
                passage["annotations"]["legacy_number"] = sentence.get("n", "")
                text["passages"][passage_id] = passage
                text["passage_order"].append(passage_id)
            material = "".join(compact(text["passages"][p]["transcription"]) for p in text["passage_order"])
            matches = material == "".join(compact(form) for _, _, form in atoms)
            if not matches:
                text["compatibility"]["issues"].append("Stored transcription and hierarchy content differ; alignment is unresolved.")
            if text["historical_header"] is not None and compact(text["historical_header"]) != material:
                text["compatibility"]["issues"].append("Historical header and passage transcription content differ; both are preserved.")
            atom_position = 0
            atom_start = 0
            for passage_id in text["passage_order"]:
                passage = text["passages"][passage_id]
                size = len(compact(passage["transcription"]))
                position = 0
                if matches:
                    while position < size and atom_position < len(atoms):
                        node_id, part_id, form = atoms[atom_position]
                        consumed = min(size - position, len(compact(form)) - atom_start)
                        link_id = stable(base, f"link:{index}:{passage_id}:{position}")
                        text["links"][link_id] = make_link(passage_id, node_id, part_id, passage,
                                                          position, position + consumed)
                        position += consumed
                        atom_start += consumed
                        if atom_start == len(compact(form)):
                            atom_position += 1
                            atom_start = 0
                elif text["roots"]:
                    # Scope-level unresolved relationship; no guessed token binding.
                    link_id = stable(base, f"link:{index}:{passage_id}:unresolved")
                    text["links"][link_id] = make_link(passage_id, text["roots"][0], None, passage, 0, size,
                                                       "unresolved", "Imported content does not establish a reliable alignment.")
        return validate(document)


def make_link(passage_id, node_id, part_id, passage, start, end, status="valid", reason=""):
    return {"passage": passage_id, "node": node_id, "part": part_id,
            "start": start, "end": end, "status": status, "reason": reason,
            "evidence": {"original": passage["original"], "transcription": passage["transcription"],
                         "status": status, "reason": reason}}
