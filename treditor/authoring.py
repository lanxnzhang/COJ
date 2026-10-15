"""File-backed multi-Text Editing; never writes legacy corpus or dictionary."""

import xml.etree.ElementTree as ET

from flask import Blueprint, abort, jsonify, request

from coj.authoring import AuthoringStore, Conflict, loads
from coj.authoring.persistence import MAX_BYTES
from coj.authoring.legacy import LegacyCorpus
from coj.authoring.evidence import EvidenceIndex
from coj.authoring.model import validate


def create_blueprint(root, attestation_results=None):
    blueprint = Blueprint("authoring", __name__)
    store = AuthoringStore(root)
    corpus = LegacyCorpus(store.root.parent)
    evidence = EvidenceIndex(store.root.parent)

    def body():
        if request.content_length is not None and request.content_length > MAX_BYTES + 10000:
            abort(413, description="Authoring requests are limited to 32 MB.")
        value = request.get_json(silent=True)
        if not isinstance(value, dict):
            abort(400, description="Supply a JSON object.")
        return value

    @blueprint.post("/api/authoring/attestations")
    def attestations():
        if attestation_results is None:
            abort(404)
        try:
            return jsonify(attestation_results(evidence, body()))
        except (ET.ParseError, ValueError, UnicodeError, OSError) as error:
            abort(400, description=str(error))

    @blueprint.get("/api/authoring/files")
    def files():
        return jsonify(store.list_files())

    @blueprint.get("/api/authoring/corpus")
    def corpus_documents():
        try:
            return jsonify(corpus.inventory())
        except (ET.ParseError, ValueError, UnicodeError) as error:
            abort(400, description=str(error))

    @blueprint.get("/api/authoring/corpus/<key>")
    def open_corpus_document(key):
        try:
            return jsonify(document=corpus.open(key))
        except FileNotFoundError:
            abort(404, description="Corpus Document not found.")
        except (ET.ParseError, ValueError, UnicodeError, RecursionError) as error:
            abort(400, description=str(error))

    @blueprint.get("/api/authoring/files/<filename>")
    def load_file(filename):
        try:
            return jsonify(store.load(filename))
        except FileNotFoundError:
            abort(404, description="Authoring file not found.")
        except (ValueError, UnicodeError, RecursionError) as error:
            abort(400, description=str(error))

    @blueprint.put("/api/authoring/files/<filename>")
    def save_file(filename):
        data = body()
        if "document" not in data or "expected_revision" not in data:
            abort(400, description="Supply a complete document and expected_revision (null for a new file).")
        try:
            return jsonify(store.save(filename, data["document"], data["expected_revision"]))
        except Conflict as error:
            abort(409, description=str(error))
        except (ValueError, TypeError, RecursionError) as error:
            abort(400, description=str(error))

    @blueprint.post("/api/authoring/validate")
    def validate_file():
        data = body()
        if not isinstance(data.get("content"), str):
            abort(400, description="Supply file content as text.")
        try:
            return jsonify({"document": loads(data["content"])})
        except (ET.ParseError, ValueError, UnicodeError, RecursionError) as error:
            abort(400, description=str(error))

    @blueprint.post("/api/authoring/analyse")
    def analyse():
        data = body()
        try:
            document = validate(data.get("document"))
            key = data.get("text_key")
            if not isinstance(key, str) or key not in document["texts"]:
                raise ValueError("Choose a Text to analyse.")
            settings = data.get("settings", {})
            if not isinstance(settings, dict):
                raise ValueError("Supply suggestion settings as an object.")
            return jsonify(evidence.analyse(document["texts"][key],
                                           settings.get("support", .95), settings.get("min_texts", 3)))
        except (ET.ParseError, ValueError, UnicodeError, RecursionError) as error:
            abort(400, description=str(error))

    return blueprint
