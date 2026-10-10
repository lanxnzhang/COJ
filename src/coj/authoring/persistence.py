"""Deterministic codec and atomic, revision-checked file storage."""

import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import threading

from .model import validate

MAX_BYTES = 2_000_000


class Conflict(ValueError):
    """A disk revision changed since this draft was opened."""


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def loads(content):
    if isinstance(content, bytes):
        require_size = len(content)
        content = content.decode("utf-8")
    else:
        require_size = len(content.encode("utf-8"))
    if require_size > MAX_BYTES:
        raise ValueError("Authoring files are limited to 2 MB.")
    try:
        document = json.loads(content, object_pairs_hook=_object,
                              parse_constant=lambda value: (_ for _ in ()).throw(ValueError("Non-finite JSON value.")))
        return validate(document)
    except (RecursionError, TypeError) as error:
        raise ValueError("Invalid or excessively nested authoring document.") from error


def dumps(document):
    validate(document)
    result = (json.dumps(document, ensure_ascii=False, sort_keys=True,
                         indent=2, allow_nan=False) + "\n").encode("utf-8")
    if len(result) > MAX_BYTES:
        raise ValueError("Authoring files are limited to 2 MB.")
    return result


def fingerprint(content):
    return hashlib.sha256(content).hexdigest()


class AuthoringStore:
    def __init__(self, root):
        self.root = Path(root)
        self.lock = threading.Lock()

    def path(self, filename):
        if not isinstance(filename, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\.syn\.json", filename):
            raise ValueError("Use a simple filename ending in .syn.json (letters, numbers, dots, underscores or hyphens).")
        base = filename.split(".", 1)[0].upper()
        if base in {"CON", "PRN", "AUX", "NUL"} or re.fullmatch(r"(?:COM|LPT)[1-9]", base):
            raise ValueError("Reserved Windows device names cannot be used as authoring filenames.")
        target = self.root / filename
        if self.root.is_symlink() or target.is_symlink() or target.resolve().parent != self.root.resolve():
            raise ValueError("Authoring files must stay inside the authoring directory.")
        return target

    def list_files(self):
        if not self.root.exists():
            return []
        return sorted(p.name for p in self.root.glob("*.syn.json") if p.is_file() and not p.is_symlink())

    def load(self, filename):
        with self.path(filename).open("rb") as stream:
            content = stream.read(MAX_BYTES + 1)
        return {"document": loads(content), "revision": fingerprint(content), "filename": filename}

    def save(self, filename, document, expected_revision):
        content = dumps(document)
        target = self.path(filename)
        with self.lock:
            current = fingerprint(target.read_bytes()) if target.exists() else None
            if current != expected_revision:
                raise Conflict("This file changed or already exists. Reopen it, or save with a new filename.")
            self.root.mkdir(parents=True, exist_ok=True)
            descriptor, temporary = tempfile.mkstemp(prefix=".authoring-", dir=self.root)
            try:
                with os.fdopen(descriptor, "wb") as stream:
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temporary, target)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
        return {"filename": filename, "revision": fingerprint(content)}
