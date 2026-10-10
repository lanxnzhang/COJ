"""File-backed Editing prototype; never writes legacy corpus or dictionary."""

from flask import Blueprint, abort, jsonify, request

from coj.authoring import AuthoringStore, Conflict, loads
from coj.authoring.persistence import MAX_BYTES


def create_blueprint(root):
    blueprint = Blueprint("authoring", __name__)
    store = AuthoringStore(root)

    def body():
        if request.content_length is not None and request.content_length > MAX_BYTES + 10000:
            abort(413, description="Authoring requests are limited to 2 MB.")
        value = request.get_json(silent=True)
        if not isinstance(value, dict):
            abort(400, description="Supply a JSON object.")
        return value

    @blueprint.get("/api/authoring/files")
    def files():
        return jsonify(store.list_files())

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
        except (ValueError, UnicodeError) as error:
            abort(400, description=str(error))

    return blueprint
