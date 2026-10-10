"""Complete draft authoring data, independent of legacy corpus serialization."""

from .model import new_document, validate
from .persistence import loads, dumps, AuthoringStore, Conflict

__all__ = ["new_document", "validate", "loads", "dumps", "AuthoringStore", "Conflict"]
