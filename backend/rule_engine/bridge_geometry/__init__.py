# -*- coding: utf-8 -*-
"""Bridge Geometry public API surface (STEP-2)."""
from .model import (
    SKEW_MAX_DEG,
    SKEW_MIN_DEG,
    BridgeGeometryError,
    Girder,
    Node,
    Pier,
    Span,
    validate_girder,
    validate_pier,
    validate_span,
    validate_span_sequence,
)
from .pier import resolve_pier, support_line_direction
from .girder import generate_girder_nodes
from .measure import (
    BridgeLocalPoint,
    NodeDistance,
    OverhangLength,
    node_distances,
    overhang_length,
    to_bridge_local,
)

__all__ = [
    "SKEW_MAX_DEG",
    "SKEW_MIN_DEG",
    "BridgeGeometryError",
    "Pier",
    "Span",
    "Girder",
    "Node",
    "validate_pier",
    "validate_span",
    "validate_span_sequence",
    "validate_girder",
    "resolve_pier",
    "support_line_direction",
    "generate_girder_nodes",
    "BridgeLocalPoint",
    "NodeDistance",
    "OverhangLength",
    "node_distances",
    "overhang_length",
    "to_bridge_local",
]
