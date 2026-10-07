"""Deterministic COJ XML presentation, not the W3C XML C14N protocol.

Attribute names sort alphabetically; children never sort. Element-only layout
uses two spaces. Mixed content, inline whitespace, leaf text and xml:space are
preserved. DTDs are rejected rather than silently losing declarations/entities.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from xml.dom import Node, minidom
from xml.parsers.expat import ExpatError, ParserCreate
from xml.sax.saxutils import escape

FORMAT_VERSION = "coj-xml-format-1"


def _preserve(node, inherited: bool) -> bool:
    if node.nodeType == Node.ELEMENT_NODE and node.hasAttribute("xml:space"):
        return node.getAttribute("xml:space") == "preserve"
    return inherited


def _layout(node, preserve: bool) -> bool:
    children = list(node.childNodes)
    texts = [child.data for child in children if child.nodeType in (Node.TEXT_NODE, Node.CDATA_SECTION_NODE)]
    # Spaces between inline elements may be real word separators. Keep them.
    return (not preserve and not any(child.nodeType == Node.CDATA_SECTION_NODE for child in children)
            and any(child.nodeType in (Node.ELEMENT_NODE, Node.COMMENT_NODE,
                                                    Node.PROCESSING_INSTRUCTION_NODE) for child in children)
            and all(not text.strip() and (not text or "\n" in text) for text in texts))


def _signature(node, inherited=False):
    """Parsed meaning including comments/PIs and text, excluding layout slots."""
    preserve = _preserve(node, inherited)
    layout = _layout(node, preserve) if node.nodeType == Node.ELEMENT_NODE else False
    if node.nodeType in (Node.TEXT_NODE, Node.CDATA_SECTION_NODE):
        return ("text", node.data)
    if node.nodeType in (Node.COMMENT_NODE, Node.PROCESSING_INSTRUCTION_NODE):
        return (node.nodeType, node.nodeName, node.data)
    children = []
    for child in node.childNodes:
        if layout and child.nodeType == Node.TEXT_NODE and not child.data.strip():
            continue
        value = _signature(child, preserve)
        if children and value[0] == "text" and children[-1][0] == "text":
            children[-1] = ("text", children[-1][1] + value[1])
        else:
            children.append(value)
    attrs = tuple(sorted((name, node.getAttribute(name)) for name in node.attributes.keys())) if node.nodeType == Node.ELEMENT_NODE else ()
    return (node.nodeName, attrs, tuple(children))


def _text(value: str) -> str:
    return escape(value).replace("\r", "&#13;")


def _render(node, depth=0, inherited=False):
    if node.nodeType == Node.CDATA_SECTION_NODE:
        return "<![CDATA[" + node.data + "]]>"
    if node.nodeType == Node.TEXT_NODE:
        return _text(node.data)
    if node.nodeType == Node.COMMENT_NODE:
        return "<!--" + node.data + "-->"
    if node.nodeType == Node.PROCESSING_INSTRUCTION_NODE:
        return "<?" + node.target + (" " + node.data if node.data else "") + "?>"
    if node.nodeType != Node.ELEMENT_NODE:
        raise ValueError(f"Unsupported XML node: {node.nodeType}")
    preserve = _preserve(node, inherited)
    attributes = []
    for name in sorted(node.attributes.keys()):
        value = _text(node.getAttribute(name)).replace('"', "&quot;").replace("\n", "&#10;").replace("\t", "&#9;")
        attributes.append(f' {name}="{value}"')
    start = "<" + node.tagName + "".join(attributes)
    if not node.childNodes:
        return start + " />"
    if _layout(node, preserve):
        children = [child for child in node.childNodes if not (child.nodeType == Node.TEXT_NODE and not child.data.strip())]
        body = "\n".join("  " * (depth + 1) + _render(child, depth + 1, preserve) for child in children)
        return start + ">\n" + body + "\n" + "  " * depth + "</" + node.tagName + ">"
    return start + ">" + "".join(_render(child, depth + 1, preserve) for child in node.childNodes) + "</" + node.tagName + ">"


def canonical_xml(content: bytes | str, *, declaration=True) -> bytes:
    """Format XML and verify preservation of parsed content and child order."""
    # Avoid parsing external/internal entity declarations; no corpus DTD is used.
    probe = content.replace(b"\0", b"").upper() if isinstance(content, bytes) else content.upper().encode("utf-8")
    if b"<!DOCTYPE" in probe:
        def reject_doctype(*args):
            raise ValueError("DOCTYPE is not supported by the COJ XML formatter")
        guard = ParserCreate()
        guard.StartDoctypeDeclHandler = reject_doctype
        try:
            guard.Parse(content, True)
        except ExpatError as error:
            raise ValueError(f"Cannot parse XML: {error}") from error
    try:
        doc = minidom.parseString(content)
    except ExpatError as error:
        raise ValueError(f"Cannot parse XML: {error}") from error
    with doc:
        nodes = [node for node in doc.childNodes if node.nodeType != Node.TEXT_NODE]
        body = "\n".join(_render(node) for node in nodes)
        result = (( '<?xml version="1.0" encoding="utf-8"?>\n' if declaration else "") + body + "\n").encode("utf-8")
        with minidom.parseString(result) as check:
            if _signature(doc) != _signature(check):
                raise ValueError("Canonical XML changed parsed content")
        return result


def element_to_xml(element: ET.Element, *, declaration=True) -> str:
    """Serialize an ElementTree element without mutating the caller's tree."""
    return canonical_xml(ET.tostring(element, encoding="utf-8"), declaration=declaration).decode("utf-8")
