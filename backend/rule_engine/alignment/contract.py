# -*- coding: utf-8 -*-
"""Rule Engine <-> LINER Alignment contract and Road->Bridge adapter.

This module is the glue between the Rule Engine (backend.rule_engine) and the
canonical LINER Alignment solver (backend.rule_engine.alignment). It provides:

- type bridges reusing RuleEvaluationRequest / RuleEvaluationResponse contracts
- build_alignment_from_roadmap(): raw road element rows -> canonical Alignment
- ALIGNMENTGeometryRule: a Geometry-delegated rule that evaluates a station
  through the X4-A kernel via evaluate_alignment (no math re-implemented here)

No numeric geometry is duplicated; everything delegates to the alignment solver.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

from backend.rule_engine.models import (
    RuleEvaluationRequest, RuleEvaluationResponse, RuleResult,
    RuleOutput, RuleStatus, TraceRecord,
)
from backend.rule_engine.registry import registry

from .model import Alignment, AlignmentElement, build_alignment
from .evaluate import evaluate_alignment
from .station import AlignmentRangeError


ALIGNMENT_RULE_ID = "X4B-R-001"
ALIGNMENT_RULE_VERSION = "1.0"


class RoadAlignmentError(ValueError):
    """Raised when a raw road element row cannot be adapted into an Alignment."""


@dataclass
class RoadElementRow:
    """Raw road element row (canonical minimal shape accepted by the bridge)."""
    kind: str            # "straight" | "arc" | "clothoid"
    length: float
    parameters: Dict[str, Any] = field(default_factory=dict)
    id: str = ""


# Accept both a dataclass row and a plain dict input for robustness.
RoadRow = Union[RoadElementRow, Dict[str, Any]]


def _coerce_kind(kind: str) -> str:
    normalized = kind.strip().lower()
    mapping = {
        "straight": "straight",
        "line": "straight",
        "arc": "arc",
        "circular": "arc",
        "circulararc": "arc",
        "clothoid": "clothoid",
        "spiral": "clothoid",
    }
    if normalized not in mapping:
        raise RoadAlignmentError(f"unsupported road element kind: {kind!r}")
    return mapping[normalized]


def _to_row(row: RoadRow) -> RoadElementRow:
    if isinstance(row, RoadElementRow):
        return row
    if isinstance(row, dict):
        return RoadElementRow(
            kind=str(row.get("kind", "")),
            length=float(row.get("length", 0.0)),
            parameters=dict(row.get("parameters", {}) or {}),
            id=str(row.get("id", row.get("name", ""))),
        )
    raise RoadAlignmentError(f"unsupported road element row type: {type(row).__name__}")


def build_alignment_from_roadmap(
    alignment_id: str,
    rows: List[RoadRow],
    *,
    origin_station: float = 0.0,
    source_trace: str = "roadmap-bridge",
) -> Alignment:
    """Convert raw road element rows into a canonical Alignment.

    Each row's `parameters` must contain the fields required by the X4-A
    kernel element, e.g. for an arc: {"radius":..., "turn":...} and for a
    clothoid: {"clothoidParameter":..., "startRadius":..., "endRadius":...,
    "turn":...}. Straight rows need no geometry parameters.
    """
    elements: List[AlignmentElement] = []
    for index, raw in enumerate(rows):
        row = _to_row(raw)
        kind = _coerce_kind(row.kind)
        if not row.id:
            row.id = f"e{index}"

        if kind == "straight":
            elements.append(_straight_row(row))
        elif kind == "arc":
            elements.append(_arc_row(row))
        elif kind == "clothoid":
            elements.append(_clothoid_row(row))

    return build_alignment(
        alignment_id,
        elements,
        origin_station=origin_station,
        source_trace=source_trace,
    )

## -- kernel element builders ------------------------------------------------


def _straight_row(row: RoadElementRow) -> AlignmentElement:
    from backend.rule_engine.geometry.line_arc import StraightElement
    from backend.rule_engine.geometry.contracts import Vec2D
    p = row.parameters
    return StraightElement(
        id=row.id, length=row.length,
        start=Vec2D(x=float(p.get("startX", 0.0)), y=float(p.get("startY", 0.0))),
        azimuth=float(p.get("azimuth", 0.0)),
    )


def _arc_row(row: RoadElementRow) -> AlignmentElement:
    from backend.rule_engine.geometry.line_arc import CircularArcElement
    from backend.rule_engine.geometry.contracts import Vec2D
    p = row.parameters
    return CircularArcElement(
        id=row.id, length=row.length,
        start=Vec2D(x=float(p.get("startX", 0.0)), y=float(p.get("startY", 0.0))),
        azimuth=float(p.get("azimuth", 0.0)),
        radius=float(p.get("radius", 0.0)),
        turn=str(p.get("turn", "left")),
    )


def _clothoid_row(row: RoadElementRow) -> AlignmentElement:
    from backend.rule_engine.geometry.clothoid import ClothoidElement
    from backend.rule_engine.geometry.contracts import Vec2D
    p = row.parameters
    start_radius = p.get("startRadius")
    end_radius = p.get("endRadius")
    return ClothoidElement(
        id=row.id, length=row.length,
        start=Vec2D(x=float(p.get("startX", 0.0)), y=float(p.get("startY", 0.0))),
        azimuth=float(p.get("azimuth", 0.0)),
        clothoidParameter=float(p.get("clothoidParameter", 0.0)),
        startRadius=None if start_radius is None else float(start_radius),
        endRadius=None if end_radius is None else float(end_radius),
        turn=str(p.get("turn", "left")),
    )


## -- RuleEngine bridging ----------------------------------------------------


class AlignmentGeometryRule:
    """Geometry-delegated rule evaluating the Alignment at a station.

    Registered into the global RuleRegistry under ALIGNMENT_RULE_ID. All
    numeric work is delegated to the canonical X4 kernel.
    """

    rule_id = ALIGNMENT_RULE_ID
    rule_version = ALIGNMENT_RULE_VERSION
    category = "ALIGNMENT"
    title = "中心線 測点評価（位置/方位/曲率）"
    source_evidence_ids = "X4A-GEOMETRY"
    applicability = "単一中心線"
    execution_order = 0
    error_code = "LR-RULE-ALIGNMENT-001"
    validation_severity = "INFO"
    formula_id = "GEOMETRY_DELEGATED"
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "X4B-TC-P05"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        alignment: Alignment = context.get("alignment")
        if alignment is None:
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="CONTRACT_ERROR", severity="CONTRACT_ERROR",
                errors=[]
            )
        station = float(inputs.get("station", 0.0))
        bearing_units = str(inputs.get("bearingUnits", "radian"))
        try:
            ev = evaluate_alignment(alignment, station, bearing_units=bearing_units)
        except AlignmentRangeError as exc:
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="ERROR", severity="ERROR",
                errors=[]
            )
        outputs = [
            RuleOutput(name="pointX", value=ev.point.x, unit="m"),
            RuleOutput(name="pointY", value=ev.point.y, unit="m"),
            RuleOutput(name="azimuth", value=ev.azimuth, unit=bearing_units),
            RuleOutput(name="curvature", value=ev.curvature, unit="1/m"),
            RuleOutput(name="elementId", value=ev.element_id, unit=""),
        ]
        trace = TraceRecord(
            rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
            input_snapshot={"station": station}
        )
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version,
            title=self.title, status="PASS", severity=self.validation_severity,
            outputs=outputs, errors=[], trace=trace,
        )


_ALIGNMENT_RULE = AlignmentGeometryRule()


def evaluate_alignment_for_rule(
    alignment: Alignment,
    station: float,
    bearing_units: str = "radian",
) -> RuleResult:
    """Evaluate the alignment at a station through the registered rule."""
    return _ALIGNMENT_RULE.evaluate({"station": station, "bearing_units": bearing_units},
                                    {"alignment": alignment})


__all__ = [
    "ALIGNMENT_RULE_ID",
    "ALIGNMENT_RULE_VERSION",
    "AlignmentGeometryRule",
    "RoadAlignmentError",
    "RoadElementRow",
    "build_alignment_from_roadmap",
    "evaluate_alignment_for_rule",
]