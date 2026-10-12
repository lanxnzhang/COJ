"""Complete draft authoring data, independent of legacy corpus serialization."""

from .model import new_document, new_text, new_passage, validate
from .persistence import loads, dumps, AuthoringStore, Conflict

__all__ = ["new_document", "new_text", "new_passage", "validate", "loads", "dumps", "AuthoringStore", "Conflict"]
