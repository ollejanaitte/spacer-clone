# -*- coding: utf-8 -*-
"""Canonical Cross Section data model and contracts (X4C-P01).

Defines the explicit input/output contract of the Cross Section Generator
without performing any geometry evaluation (delegated to later steps).

Grounding: mirrors the LINER domain structures audited in P00, in particular
  - CrossSectionOffsetLineDraft (centerline base, right=+ offset)
  - WidthChangePointDraft (left/right non-negative widths, piecewise-hold)
  - CrossSlopeIntervalDraft (slope % per side, pivotDistance)
  - resolveCrossfallOffset: dz = -(slope%/100) * (offset - pivotOffset)

Sign/side conventions are fixed here so P02-P05 never reinvent them.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Literal, Optional

from backend.rule_engine.geometry.contracts import Vec2D, Vec3

Side = Literal["CENTER", "LEFT", "RIGHT"]


class PivotType(str, Enum):
    """Reference axis for elevation (cross-range) computation."""
    CENTERLINE = "CENTERLINE"
    CUSTOM_OFFSET = "CUSTOM_OFFSET"


class PivotMode(str, Enum):
    """Unresolved pivot handling."""
    UNRESOLVED = "UNRESOLVED"


class SegmentType(str, Enum):
    CENTER = "CENTER"
    LANE = "LANE"
    SHOULDER = "SHOULDER"
    MEDIAN = "MEDIAN"
    SIDE_STRIP = "SIDE_STRIP"
    SIDEWALK = "SIDEWALK"
    OTHER = "OTHER"


class CrossSectionError(ValueError):
    """Raised when a Cross Section request cannot be constructed."""


@dataclass
class CrossSectionSegment:
    """One piece of the transverse cross section on one side of the centerline."""
    segment_id: str
    side: Side
    segment_type: SegmentType = SegmentType.OTHER
    width: float = 0.0
    crossfall: float = 0.0                # percent; positive = down to the side
    start_offset: float = 0.0
    end_offset: float = 0.0
    source: str = "explicit"


@dataclass
class CrossfallInput:
    """Per-side transverse slope of the section at the requested station."""
    left_slope_percent: float = 0.0
    right_slope_percent: float = 0.0
    pivot_offset: float = 0.0             # meters from centerline (right=positive)
    pivot_type: PivotType = PivotType.CENTERLINE
    source: str = "explicit"


@dataclass
class PivotDefinition:
    pivot_type: PivotType = PivotType.CENTERLINE
    pivot_offset: float = 0.0
    resolved: bool = True


@dataclass
class CrossSectionRequest:
    """Everything the generator needs to evaluate a station."""
    alignment_id: str
    station: float
    center_elevation: float = 0.0
    left_segments: List[CrossSectionSegment] = field(default_factory=list)
    right_segments: List[CrossSectionSegment] = field(default_factory=list)
    crossfall: CrossfallInput = field(default_factory=CrossfallInput)
    pivot: PivotDefinition = field(default_factory=PivotDefinition)
    source_trace: Dict[str, str] = field(default_factory=dict)


@dataclass
class CrossSectionPoint:
    """One offset point in the evaluated section (XYZ filled in P03/P04)."""
    point_id: str
    side: Side
    segment_id: str
    offset: float
    elevation: float = 0.0
    xyz: Optional[Vec3] = None
    source_trace: Dict[str, str] = field(default_factory=dict)


@dataclass
class CrossSectionResult:
    alignment_id: str
    station: float
    alignment_element_id: str = ""
    center_point_xyz: Optional[Vec3] = None
    pivot: PivotDefinition = field(default_factory=PivotDefinition)
    segments: List[CrossSectionSegment] = field(default_factory=list)
    section_points: List[CrossSectionPoint] = field(default_factory=list)
    left_edge_offset: Optional[float] = None
    right_edge_offset: Optional[float] = None
    total_left_width: float = 0.0
    total_right_width: float = 0.0
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    trace: Dict[str, str] = field(default_factory=dict)


@dataclass
class CrossSectionTrace:
    trace_id: str
    alignment_id: str
    station: float
    alignment_source: str = ""
    width_source_id: str = ""
    crossfall_source_id: str = ""
    elevation_source_id: str = ""
    pivot_definition: str = ""
    segment_id: Optional[str] = None
    input_snapshot: Dict[str, object] = field(default_factory=dict)
    output_snapshot: Dict[str, object] = field(default_factory=dict)
    downstream_consumer: str = ""


def validate_request(request: CrossSectionRequest) -> List[str]:
    """Fail-closed validation of a Cross Section request.

    Returns a list of error strings. An empty list means the request is valid
    and ready for evaluation.
    """
    errors: List[str] = []
    if not request.alignment_id:
        errors.append("alignment_id must be non-empty")
    if not _is_finite(request.station):
        errors.append("station must be a finite number")
    if not _is_finite(request.center_elevation):
        errors.append("center_elevation must be a finite number")
    if request.pivot is not None and not request.pivot.resolved:
        errors.append("pivot is unresolved (PIVOT_UNRESOLVED) — fail closed")

    for segment in [*request.left_segments, *request.right_segments]:
        if not segment.segment_id:
            errors.append("segment_id must be non-empty")
        if not _is_finite(segment.width) or segment.width < 0:
            errors.append(f"segment {segment.segment_id!r}: width must be finite and >= 0")
        if not _is_finite(segment.crossfall):
            errors.append(f"segment {segment.segment_id!r}: crossfall must be finite")

    if not errors and not request.left_segments and not request.right_segments:
        errors.append("at least one segment is required")
    return errors


def _is_finite(value) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


__all__ = [
    "CrossSectionError",
    "CrossSectionPoint",
    "CrossSectionRequest",
    "CrossSectionResult",
    "CrossSectionSegment",
    "CrossSectionTrace",
    "CrossfallInput",
    "PivotDefinition",
    "PivotMode",
    "PivotType",
    "SegmentType",
    "Side",
    "validate_request",
]