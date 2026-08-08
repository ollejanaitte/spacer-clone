# -*- coding: utf-8 -*-
"""Local Cross Section geometry over the X4-B Alignment Solver (X-C-P3).

Builds the local transverse section at a station:
  - station pose (center XY + tangent) from the canonical Alignment Solver
  - local normal from the canonical Geometry Kernel
  - segment boundary offsets (signed, centerline base, right positive)
  - crossfall delta-Z contribution per offset
  - left/right road edges (signed offsets)

No design rules are implemented. All numbers come from the Alignment Solver,
the Geometry Kernel, and the explicit width/crossfall inputs.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple

from backend.rule_engine.geometry.contracts import Vec2D, Vec3, angle_to_normal
from backend.rule_engine.alignment import evaluate_alignment, Alignment

from .model import (
    CrossSectionPoint,
    CrossSectionRequest,
    CrossSectionResult,
    validate_request,
)
from .width import ResolvedWidthExtents, evaluate_request_width
from .crossfall import ResolvedCrossfallState, crossfall_delta_z, resolve_crossfall_input


class SectionGeometryError(ValueError):
    """Raised when local section geometry cannot be generated."""


@dataclass
class StationPose:
    """Center pose of the alignment at a station."""
    station: float
    center_xy: Vec2D
    azimuth: float
    curvature: float
    element_id: str


def pose_at(alignment: Alignment, station: float) -> StationPose:
    """Fetch the canonical station pose from the Alignment Solver."""
    evaluation = evaluate_alignment(alignment, station)
    return StationPose(
        station=evaluation.station,
        center_xy=evaluation.point,
        azimuth=evaluation.azimuth,
        curvature=evaluation.curvature,
        element_id=evaluation.element_id,
    )


def local_normal(azimuth: float) -> Vec3:
    """Canonical local normal (left/right signed transverse direction)."""
    return angle_to_normal(azimuth)


def _segment_boundary_offsets(
    segments: List,
    side: str,
) -> List[Tuple[str, float]]:
    """Cumulative signed offsets for each segment boundary on one side.

    Left side offsets are negative; right side offsets are positive.
    Returns [(segment_id, signed_offset), ...].
    """
    result: List[Tuple[str, float]] = []
    sign = -1.0 if side == "LEFT" else 1.0
    cumulative = 0.0
    for segment in segments:
        if segment.side != side:
            continue
        cumulative += segment.width
        result.append((segment.segment_id, sign * cumulative))
    return result


def generate_local_section(
    alignment: Alignment,
    request: CrossSectionRequest,
) -> CrossSectionResult:
    """Generate the local transverse section at request.station.

    Fills section_points (offset + local elevation) and left/right edges.
    Global XYZ (P04) is intentionally left as None here.
    """
    request_errors = validate_request(request)
    if request_errors:
        raise SectionGeometryError("; ".join(request_errors))

    pose = pose_at(alignment, request.station)
    normal = local_normal(pose.azimuth)

    width_extents: ResolvedWidthExtents = evaluate_request_width(request)
    crossfall_state: ResolvedCrossfallState = resolve_crossfall_input(request.crossfall)

    section_points: List[CrossSectionPoint] = []
    # center point (offset 0)
    section_points.append(
        _point(request, "center", "CENTER", pose, crossfall_state, request.center_elevation, 0.0)
    )

    for side in ("LEFT", "RIGHT"):
        segments = request.left_segments if side == "LEFT" else request.right_segments
        for segment_id, signed_offset in _segment_boundary_offsets(segments, side):
            section_points.append(
                _point(request, segment_id, side, pose, crossfall_state,
                       request.center_elevation, signed_offset)
            )

    left_edge_offset = -width_extents.left_half_width
    right_edge_offset = width_extents.right_half_width

    return CrossSectionResult(
        alignment_id=request.alignment_id,
        station=request.station,
        alignment_element_id=pose.element_id,
        center_point_xyz=None,  # filled in P04
        pivot=request.pivot,
        segments=[*request.left_segments, *request.right_segments],
        section_points=section_points,
        left_edge_offset=left_edge_offset,
        right_edge_offset=right_edge_offset,
        total_left_width=width_extents.left_half_width,
        total_right_width=width_extents.right_half_width,
        warnings=_warnings_for(crossfall_state),
        errors=[],
        trace={
            "alignment_id": request.alignment_id,
            "station": str(request.station),
            "element_id": pose.element_id,
        },
    )


def _point(
    request: CrossSectionRequest,
    point_id: str,
    side: str,
    pose: StationPose,
    crossfall_state: ResolvedCrossfallState,
    center_elevation: float,
    offset: float,
) -> CrossSectionPoint:
    delta_z = crossfall_delta_z(crossfall_state, offset)
    local_elevation = center_elevation + delta_z
    return CrossSectionPoint(
        point_id=point_id,
        side=side,
        segment_id=point_id,
        offset=offset,
        elevation=local_elevation,
        xyz=None,  # global XYZ in P04
        source_trace={
            "center_elevation": str(center_elevation),
            "crossfall_state_source": crossfall_state.source,
            "pivot_offset": str(crossfall_state.pivot_offset),
        },
    )


def _warnings_for(state: ResolvedCrossfallState) -> List[str]:
    warnings: List[str] = []
    if state.source != "explicit":
        warnings.append(f"crossfall resolved from {state.source} (not explicit input)")
    return warnings


__all__ = [
    "SectionGeometryError",
    "StationPose",
    "generate_local_section",
    "local_normal",
    "pose_at",
]