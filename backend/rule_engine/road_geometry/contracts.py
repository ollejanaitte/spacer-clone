# -*- coding: utf-8 -*-
"""Road Geometry API - canonical data contracts (X4D-P01).

Single entry-point contract unifying the X4-A Geometry Kernel, X4-B Alignment
Solver and X4-C Cross Section Generator without re-implementing any geometry.

The request carries everything needed to evaluate one station of a road:
  - the alignment itself (prebuilt Alignment) or the raw road element rows
    (built lazily through the canonical Road->Alignment adapter)
  - the station to evaluate
  - explicit center elevation (elevation contract: EXPLICIT_INPUT / DEFERRED)
  - explicit cross section inputs (widths, crossfall, pivot)

The result carries the unified road geometry evaluation:
  station / X / Y / Z / heading / tangent / normal / curvature / width /
  crossfall / left-right road edges / cross-section points.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union

from backend.rule_engine.geometry.contracts import Vec3
from backend.rule_engine.alignment import Alignment
from backend.rule_engine.alignment.contract import RoadElementRow, RoadRow
from backend.rule_engine.crosssection.model import (
    CrossSectionPoint,
    CrossSectionSegment,
    CrossfallInput,
    PivotDefinition,
)
from backend.rule_engine.vertical import VerticalProfile

__all__ = [
    "RoadGeometryError",
    "RoadGeometryRequest",
    "RoadGeometryResult",
    "validate_request",
]


class RoadGeometryError(ValueError):
    """Raised when a Road Geometry request cannot be evaluated."""


@dataclass
class RoadGeometryRequest:
    """Everything needed to evaluate one station of a road.

    Provide either `alignment` (prebuilt) or `rows` (raw road element rows to
    build through the canonical adapter). When both are given, `alignment`
    wins and `rows` is ignored.

    Elevation: if `center_elevation` is given it wins (explicit input contract).
    Otherwise, if `vertical_profile` is given, Z is computed by the backend
    vertical solver. If neither is given, Z is None (deferred).
    """
    alignment_id: str
    station: float
    alignment: Optional[Alignment] = None
    rows: Optional[List[RoadRow]] = None
    origin_station: float = 0.0
    bearing_units: str = "radian"
    center_elevation: Optional[float] = None
    vertical_profile: Optional[VerticalProfile] = None
    left_segments: List[CrossSectionSegment] = field(default_factory=list)
    right_segments: List[CrossSectionSegment] = field(default_factory=list)
    crossfall: CrossfallInput = field(default_factory=CrossfallInput)
    pivot: PivotDefinition = field(default_factory=PivotDefinition)
    source_trace: Dict[str, str] = field(default_factory=dict)


@dataclass
class RoadGeometryResult:
    """Unified evaluation of a road geometry station."""
    station: float
    x: float
    y: float
    z: Optional[float]
    heading: float
    tangent: Vec3
    normal: Vec3
    curvature: float
    element_id: str
    element_type: str
    total_left_width: float
    total_right_width: float
    crossfall_left_percent: float
    crossfall_right_percent: float
    left_edge_xyz: Optional[Vec3]
    right_edge_xyz: Optional[Vec3]
    section_points: List[CrossSectionPoint] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    trace: Dict[str, str] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.errors


def _validate_station(station: float) -> None:
    if not math.isfinite(station):
        raise RoadGeometryError(f"station must be finite (got {station!r})")


def _validate_bearing_units(units: str) -> None:
    if units.strip().lower() not in {"radian", "degree", "degrees", "deg", "degre"}:
        raise RoadGeometryError(f"unsupported bearing_units {units!r}")


def validate_request(request: RoadGeometryRequest) -> None:
    """Validate a request before evaluation. Raises RoadGeometryError."""
    if not request.alignment_id:
        raise RoadGeometryError("alignment_id must not be empty")
    _validate_station(request.station)
    _validate_bearing_units(request.bearing_units)
    if request.alignment is None and not request.rows:
        raise RoadGeometryError(
            "either alignment or rows must be provided")
    if request.alignment is not None and not request.alignment.alignment_id:
        raise RoadGeometryError("alignment.alignment_id must not be empty")
    if request.center_elevation is not None:
        if not math.isfinite(request.center_elevation):
            raise RoadGeometryError(
                f"center_elevation must be finite (got {request.center_elevation!r})")
    if request.vertical_profile is not None:
        if not request.vertical_profile.profile_id:
            raise RoadGeometryError("vertical_profile.profile_id must not be empty")
        if request.station < request.vertical_profile.start_station - 1e-9 \
                or request.station > request.vertical_profile.end_station + 1e-9:
            raise RoadGeometryError(
                f"station {request.station!r} outside vertical_profile range "
                f"{request.vertical_profile.station_range}")
    for side_label, segments in (("left", request.left_segments),
                                 ("right", request.right_segments)):
        for segment in segments:
            if segment.width < 0:
                raise RoadGeometryError(
                    f"{side_label} segment {segment.segment_id!r} has "
                    f"negative width {segment.width!r}")
