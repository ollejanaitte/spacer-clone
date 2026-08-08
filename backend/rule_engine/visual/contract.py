# -*- coding: utf-8 -*-
"""Diagram Data Contract (STEP-2 S2-UX17).

Production data contract that feeds the Step3 schematic UI.

Establishes:
- VisualObject: a diagram element with a stable ID that corresponds 1:1 to a
  real computation entity (alignment element id, profile element id, section
  element id, pier id, girder id, node id, rule diagnostic id).
- VisualState: INPUT / VALIDATED / CALCULATED (UX-P06 FROZEN).
- FieldToDiagramMapping: unique mapping between an input field and a diagram
  object (used for bidirectional field <-> diagram highlight).
- VisualHighlight / VisualWarning / VisualError: UI state payloads.
- DiagramPayload: per-plane (PLAN / PROFILE / SECTION / BRIDGE) immutable
  payload containing geometry references, selection and diagnostic targets.

This contract never computes geometry; it only carries stable identifiers and
state for the UI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

__all__ = [
    "VisualState",
    "VisualObject",
    "FieldToDiagramMapping",
    "VisualHighlight",
    "VisualWarning",
    "VisualError",
    "DiagramPayload",
    "VISUAL_STATES",
]
VISUAL_STATES = ("INPUT", "VALIDATED", "CALCULATED")

VisualState = str  # one of VISUAL_STATES (INPUT | VALIDATED | CALCULATED)


@dataclass
class VisualObject:
    """A diagram object tied to a real computation entity via stable id."""
    object_id: str
    kind: str          # "alignment-element" | "profile-element" | "section-element" | "pier" | "girder" | "node" | "rule-diagnostic"
    entity_id: str     # real entity id (element id, pier id, node id, ...)
    label: str = ""
    plane: str = "PLAN"  # PLAN | PROFILE | SECTION | MIXED


@dataclass
class FieldToDiagramMapping:
    """Unique mapping input field <-> diagram object (bidirectional)."""
    field_name: str
    object_id: str
    direction: str = "BOTH"  # "FIELD_TO_DIAGRAM" | "DIAGRAM_TO_FIELD" | "BOTH"


@dataclass
class VisualHighlight:
    object_id: str
    state: str = "CALCULATED"   # VISUAL_STATES value
    reason: str = ""


@dataclass
class VisualWarning:
    object_id: str
    rule_id: str
    message: str
    diagnostic_code: str = ""


@dataclass
class VisualError:
    object_id: str
    error_type: str = "GEOMETRY"  # FIELD_ERROR | GEOMETRY_ERROR
    message: str = ""
    diagnostic_code: str = ""


@dataclass
class DiagramPayload:
    """Immutable payload consumed by the schematic UI for one plane."""
    plane: str
    objects: List[VisualObject] = field(default_factory=list)
    mappings: List[FieldToDiagramMapping] = field(default_factory=list)
    highlights: List[VisualHighlight] = field(default_factory=list)
    warnings: List[VisualWarning] = field(default_factory=list)
    errors: List[VisualError] = field(default_factory=list)
    selected_object_id: Optional[str] = None
    geometry_ref: Dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "plane": self.plane,
            "objects": [o.__dict__ for o in self.objects],
            "mappings": [m.__dict__ for m in self.mappings],
            "highlights": [h.__dict__ for h in self.highlights],
            "warnings": [w.__dict__ for w in self.warnings],
            "errors": [e.__dict__ for e in self.errors],
            "selectedObjectId": self.selected_object_id,
            "geometryRef": self.geometry_ref,
        }
