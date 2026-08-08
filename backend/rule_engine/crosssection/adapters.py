# -*- coding: utf-8 -*-
"""Cross Section <-> external system adapters and contract glue (X4C-P05).

Connects the canonical Cross Section Generator (P01-P04) to:
  - X3 Rule Engine         (rule payload -> CrossSectionRequest)
  - X4-B Alignment Solver  (station pose intake)
  - Road->Bridge interface  (read-only review payload)

This step performs NO geometry evaluation and NO design logic. Every value
flows through the canonical width / crossfall / local- / global-Geometry
pipeline via generate_global_section. This module only adapts shapes,
validates units, and propagates provenance/trace.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from backend.rule_engine.geometry.contracts import Vec2D, Vec3, angle_to_normal, offset_point
from backend.rule_engine.alignment import Alignment
from backend.rule_engine.models import (
    RuleEvaluationRequest, RuleResult, TraceRecord,
)

from .model import (
    CrossSectionRequest,
    CrossSectionResult,
    CrossSectionSegment,
    CrossSectionTrace,
    CrossfallInput,
    PivotDefinition,
    PivotType,
    Side,
)
from .geometry import pose_at
from .global_xyz import generate_global_section

# Public API (exported by the package __init__ as well).
__all__ = [
    "CrossSectionAdapterError",
    "RoadBridgePoint",
    "RoadBridgeResult",
    "RoadWidthSegment",
    "RuleCrossfallInput",
    "RuleCrossSectionInput",
    "adapt_rule_request",
    "build_road_bridge",
    "cross_rule_from_inputs",
    "cross_section_result",
    "cross_section_trace",
    "rule_result_bridge",
    "validate_road_bridge",
]


class CrossSectionAdapterError(ValueError):
    """Raised when an external payload cannot be adapted."""


# --------------------------------------------------------------------------
# Rule Engine input shapes
# --------------------------------------------------------------------------


@dataclass
class RoadWidthSegment:
    """Per-side width input from the Rule Engine (unit: meters)."""
    segment_id: str
    side: Side
    width_m: float
    segment_type: str = "LANE"
    source: str = "rule-engine"


@dataclass
class RuleCrossfallInput:
    left_slope_percent: float = 0.0
    right_slope_percent: float = 0.0
    pivot_offset_m: float = 0.0
    pivot_type: PivotType = PivotType.CENTERLINE
    source: str = "rule-engine"


@dataclass
class RuleCrossSectionInput:
    """Everything the Rule Engine can hand to the Cross Section pipeline."""
    station_m: float
    center_elevation_m: float
    left_width_m: Optional[float] = None
    right_width_m: Optional[float] = None
    left_segments: List[RoadWidthSegment] = field(default_factory=list)
    right_segments: List[RoadWidthSegment] = field(default_factory=list)
    crossfall: Optional[RuleCrossfallInput] = None
    unit: str = "m"
    source_trace: Dict[str, str] = field(default_factory=dict)


def _meters(value: Any, name: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed):
        raise CrossSectionAdapterError(f"{name} must be finite (got {value!r})")
    return parsed


def _check_unit(inputs: RuleCrossSectionInput) -> None:
    unit = str(inputs.unit).strip().lower()
    if unit and unit not in ("m", "meter", "meters"):
        raise CrossSectionAdapterError(
            f"unsupported length unit {inputs.unit!r}; only meters are accepted")


def _to_segments(items: List[RoadWidthSegment], side: Side) -> List[CrossSectionSegment]:
    segments: List[CrossSectionSegment] = []
    cumulative = 0.0
    for item in items:
        if item.side != side:
            continue
        width = _meters(item.width_m, f"segment {item.segment_id!r}.width_m")
        if width < 0:
            raise CrossSectionAdapterError(
                f"segment {item.segment_id!r} width_m must be >= 0")
        segments.append(
            CrossSectionSegment(
                segment_id=item.segment_id,
                side=side,
                segment_type=item.segment_type or "LANE",
                width=width,
                start_offset=cumulative,
                end_offset=cumulative + width,
                source=item.source,
            )
        )
        cumulative += width
    return segments


def cross_rule_from_inputs(inputs: RuleCrossSectionInput) -> CrossSectionRequest:
    """Adapt Rule Engine width/crossfall/elevation into a canonical request.

    Single-segment fallback: when only total left/right widths are given (no
    per-segment breakdown), one LANE segment per side is synthesized. All
    semantic validation is delegated to the canonical pipeline.
    """
    _check_unit(inputs)
    left = list(inputs.left_segments)
    right = list(inputs.right_segments)
    if not left and inputs.left_width_m is not None:
        left = [RoadWidthSegment("L-1", "LEFT", _meters(inputs.left_width_m, "left_width_m"))]
    if not right and inputs.right_width_m is not None:
        right = [RoadWidthSegment("R-1", "RIGHT", _meters(inputs.right_width_m, "right_width_m"))]

    crossfall = inputs.crossfall or RuleCrossfallInput()
    return CrossSectionRequest(
        alignment_id="",
        station=_meters(inputs.station_m, "station_m"),
        center_elevation=_meters(inputs.center_elevation_m, "center_elevation_m"),
        left_segments=_to_segments(left, "LEFT"),
        right_segments=_to_segments(right, "RIGHT"),
        crossfall=CrossfallInput(
            left_slope_percent=crossfall.left_slope_percent,
            right_slope_percent=crossfall.right_slope_percent,
            pivot_offset=crossfall.pivot_offset_m,
            pivot_type=crossfall.pivot_type,
            source=crossfall.source,
        ),
        pivot=PivotDefinition(),
        source_trace=dict(inputs.source_trace),
    )


def validate_request_units(request: CrossSectionRequest) -> List[str]:
    """Adapter-facing unit guard: only meter-based lengths are accepted."""
    errors: List[str] = []
    for station_m in (request.station,):
        if isinstance(station_m, str) and station_m.strip().endswith(("cm", "mm", "km")):
            errors.append(f"station uses a non-meter unit: {station_m!r}")
    for value in (request.center_elevation,):
        if isinstance(value, str) and value.strip().endswith(("cm", "mm", "km")):
            errors.append(f"center_elevation uses a non-meter unit: {value!r}")
    return errors


# --------------------------------------------------------------------------
# Rule Engine <-> Cross Section contract bridges
# --------------------------------------------------------------------------


def cross_section_result(
    alignment: Alignment,
    request: CrossSectionRequest,
) -> CrossSectionResult:
    """Run the canonical P01-P04 pipeline for a request (no new math)."""
    return generate_global_section(alignment, request)


def adapt_rule_request(
    alignment: Alignment,
    request: CrossSectionRequest,
) -> RuleEvaluationRequest:
    """Provide the request payload as a RuleEvaluationRequest for the X3 engine."""
    return RuleEvaluationRequest(
        project_context={},
        inputs={
            "alignment_id": request.alignment_id,
            "station": request.station,
            "center_elevation": request.center_elevation,
            "left_segments": [s.segment_id for s in request.left_segments],
            "right_segments": [s.segment_id for s in request.right_segments],
        },
    )


def rule_result_bridge(
    rule_result: RuleResult,
    request: CrossSectionRequest,
) -> RuleResult:
    """Attach Cross Section provenance onto a rule result (pass-through)."""
    if rule_result.trace is not None:
        rule_result.trace.input_snapshot["station"] = request.station
        rule_result.trace.downstream_consumer = "cross-section-generator"
    return rule_result


# --------------------------------------------------------------------------
# Road->Bridge read-only payload
# --------------------------------------------------------------------------


@dataclass
class RoadBridgePoint:
    point_id: str
    side: Side
    offset_m: float
    elevation_m: float
    xyz: Vec3
    source_trace: Dict[str, str] = field(default_factory=dict)


@dataclass
class RoadBridgeResult:
    """Read-only candidate payload for the Road->Bridge review interface."""
    station: float
    alignment_id: str
    element_id: str
    centerline_xyz: Vec3
    tangent: Vec3
    normal: Vec3
    left_edge_xyz: Vec3
    right_edge_xyz: Vec3
    total_left_width: float
    total_right_width: float
    crossfall_left_percent: float
    crossfall_right_percent: float
    section_points: List[RoadBridgePoint] = field(default_factory=list)
    elevation_provenance: Dict[str, str] = field(default_factory=dict)
    trace: Dict[str, str] = field(default_factory=dict)


def _tangent(pose) -> Vec3:
    import math
    azimuth = pose.azimuth
    return Vec3(x=math.cos(azimuth), y=math.sin(azimuth), z=0.0)


def _normal(pose) -> Vec3:
    return angle_to_normal(pose.azimuth)


def build_road_bridge(
    alignment: Alignment,
    request: CrossSectionRequest,
) -> RoadBridgeResult:
    """Adapt a CrossSectionResult into the Road->Bridge read-only payload.

    No structural or bridge design appears here: only the road-aligned section
    geometry (edges, widths, crossfall, XYZ), consumed read-only downstream.
    """
    result = cross_section_result(alignment, request)
    pose = pose_at(alignment, request.station)
    center_xyz = result.center_point_xyz
    if center_xyz is None:
        raise CrossSectionAdapterError("center_point_xyz missing from pipeline")

    section_points = [
        RoadBridgePoint(
            point_id=p.point_id,
            side=p.side,
            offset_m=p.offset,
            elevation_m=p.elevation,
            xyz=p.xyz if p.xyz is not None else center_xyz,
            source_trace=dict(p.source_trace),
        )
        for p in result.section_points
    ]

    provenance = {
        "center_elevation": result.trace.get("elevation_source", "explicit_input"),
        "crossfall": request.crossfall.source,
        "width": "explicit",
        "alignment": "x4-b-alignment-solver",
    }
    return RoadBridgeResult(
        station=result.station,
        alignment_id=request.alignment_id,
        element_id=result.alignment_element_id,
        centerline_xyz=center_xyz,
        tangent=_tangent(pose),
        normal=_normal(pose),
        left_edge_xyz=_edge_point_for(result, "LEFT", pose, center_xyz),
        right_edge_xyz=_edge_point_for(result, "RIGHT", pose, center_xyz),
        total_left_width=result.total_left_width,
        total_right_width=result.total_right_width,
        crossfall_left_percent=request.crossfall.left_slope_percent,
        crossfall_right_percent=request.crossfall.right_slope_percent,
        section_points=section_points,
        elevation_provenance=provenance,
        trace=dict(result.trace),
    )


def _edge_result_point(result: CrossSectionResult, side: Side) -> Optional[Vec3]:
    target = result.left_edge_offset if side == "LEFT" else result.right_edge_offset
    if target is None:
        return None
    for point in result.section_points:
        if point.side == side and abs(point.offset - target) < 1e-9:
            return point.xyz
    return None


def _edge_point_for(result, side, pose, center_xyz) -> Vec3:
    edge = _edge_result_point(result, side)
    if edge is not None:
        return edge
    offset = result.left_edge_offset if side == "LEFT" else result.right_edge_offset
    off = offset if offset is not None else 0.0
    plan = offset_point(Vec2D(center_xyz.x, center_xyz.y), pose.azimuth, off)
    return Vec3(x=plan.x, y=plan.y, z=center_xyz.z)


def validate_road_bridge(bridge: "RoadBridgeResult") -> None:
    """Fail-closed contract check on the Road->Bridge payload."""
    if not math.isfinite(bridge.station):
        raise CrossSectionAdapterError("road-bridge station must be finite")
    for label, vec in (
        ("centerline", bridge.centerline_xyz),
        ("left_edge", bridge.left_edge_xyz),
        ("right_edge", bridge.right_edge_xyz),
        ("tangent", bridge.tangent),
        ("normal", bridge.normal),
    ):
        if vec is None or not all(math.isfinite(v) for v in (vec.x, vec.y, vec.z)):
            raise CrossSectionAdapterError(f"{label}_xyz missing/non-finite")
    if not bridge.section_points:
        raise CrossSectionAdapterError("road-bridge payload has no section_points")


# --------------------------------------------------------------------------
# Trace / provenance
# --------------------------------------------------------------------------


def cross_section_trace(
    result: CrossSectionResult,
    downstream_consumer: str = "road-bridge",
) -> CrossSectionTrace:
    """Build a contract trace from the evaluated result."""
    return CrossSectionTrace(
        trace_id=f"{result.alignment_id}:{result.station}",
        alignment_id=result.alignment_id,
        station=result.station,
        alignment_source="x4-b-alignment-solver",
        width_source_id=result.trace.get("width_source", "explicit"),
        crossfall_source_id=result.trace.get("crossfall_source", "explicit"),
        elevation_source_id=result.trace.get("elevation_source", "explicit_input"),
        pivot_definition=result.pivot.pivot_type.value if result.pivot else "",
        downstream_consumer=downstream_consumer,
        input_snapshot={"station": result.station},
        output_snapshot={
            "total_width_m": result.total_left_width + result.total_right_width,
            "points": len(result.section_points),
        },
    )