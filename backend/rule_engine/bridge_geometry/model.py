# -*- coding: utf-8 -*-
"""Bridge Geometry - shared model and contracts (STEP-2 S2-UX07).

Road -> Bridge geometry boundary. All bridge geometry is generated from road
geometry (X4-D) + explicit pier/span/girder configuration. This package never
re-implements road geometry; it consumes RoadGeometryResult / pose and builds
Pier / Span / Girder / Node with skew / transforms / distances / overhang.

Conventions (STEP1 P03, FROZEN):
- station: m, same space as X4-B
- skew angle: angle between bridge axis (alignment tangent) and the support
  line, in degrees, positive counterclockwise, range (0, 180)
- support points: global XYZ from station + transverse offset via X4-D
- coordinate transform: global = center_global + tangent*u + normal*v + binormal*z
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional

from backend.rule_engine.geometry.contracts import Vec3

SKEW_MIN_DEG = 0.0
SKEW_MAX_DEG = 180.0


class BridgeGeometryError(ValueError):
    """Raised when bridge geometry cannot be constructed or is invalid."""


@dataclass
class Pier:
    """A support (pier / abutment) defined on the bridge axis."""
    pier_id: str
    station: float
    alignment_id: str
    skew_angle_deg: float = 90.0
    source: str = "explicit"
    bearing_offsets_m: List[float] = field(default_factory=list)
    _support_points: Optional[List[Vec3]] = field(default=None, repr=False, compare=False)

    @property
    def support_points(self) -> List[Vec3]:
        """Global XYZ support points (bearing positions)."""
        if self._support_points is None:
            raise BridgeGeometryError(
                "Pier must be resolved via resolve_pier() before reading support_points")
        return self._support_points

    @support_points.setter
    def support_points(self, points: List[Vec3]) -> None:
        self._support_points = points


@dataclass
class Span:
    """A bridge span between two piers."""
    span_id: str
    start_pier_id: str
    end_pier_id: str
    start_station: float
    end_station: float
    alignment_id: str = ""

    @property
    def span_length(self) -> float:
        return self.end_station - self.start_station

    @property
    def start_pier(self) -> Optional[Pier]:
        return self._start_pier

    @property
    def end_pier(self) -> Optional[Pier]:
        return self._end_pier

    _start_pier: Optional[Pier] = field(default=None, repr=False, compare=False)
    _end_pier: Optional[Pier] = field(default=None, repr=False, compare=False)

    def bind(self, start_pier: Pier, end_pier: Pier) -> "Span":
        """Bind the span to its start/end piers."""
        self._start_pier = start_pier
        self._end_pier = end_pier
        return self


def validate_span(
    span: Span,
    piers: Optional[List[Pier]] = None,
) -> List[str]:
    """Validate a Span. Returns a list of issues (empty when valid)."""
    issues: list = []
    if not span.span_id:
        issues.append("span_id must not be empty")
    if not span.start_pier_id or not span.end_pier_id:
        issues.append("start_pier_id and end_pier_id are required")
    if not math.isfinite(span.start_station) or not math.isfinite(span.end_station):
        issues.append(f"span {span.span_id!r} stations must be finite")
    if span.end_station <= span.start_station:
        issues.append(
            f"span {span.span_id!r} end_station must be > start_station "
            f"({span.start_station!r}->{span.end_station!r})")
    if span.start_pier_id == span.end_pier_id:
        issues.append(f"span {span.span_id!r} start/end pier must differ")
    if piers is not None:
        ids = {p.pier_id for p in piers}
        if span.start_pier_id not in ids:
            issues.append(f"span {span.span_id!r} start pier {span.start_pier_id!r} not found")
        if span.end_pier_id not in ids:
            issues.append(f"span {span.span_id!r} end pier {span.end_pier_id!r} not found")
    return issues


def validate_span_sequence(spans: List[Span]) -> List[str]:
    """Validate a sequence of spans: contiguous, monotonic, no overlap."""
    issues: list = []
    seen: set = set()
    ordered = sorted(spans, key=lambda s: s.start_station)
    for index, span in enumerate(ordered):
        if span.span_id in seen:
            issues.append(f"duplicate span_id {span.span_id!r}")
        seen.add(span.span_id)
        if index == 0:
            continue
        prev = ordered[index - 1]
        if abs(span.start_station - prev.end_station) > 1e-6:
            issues.append(
                f"span {span.span_id!r} start {span.start_station!r} not contiguous "
                f"with previous span end {prev.end_station!r}")
    return issues


@dataclass
class Girder:
    """A longitudinal girder line on one side of the bridge."""
    girder_id: str
    line_side: str = "center"  # "left" | "right" | "center"
    transverse_offset_m: float = 0.0
    spans: List[str] = field(default_factory=list)  # span_ids covered
    alignment_id: str = ""
    _nodes: Optional[List["Node"]] = field(default=None, repr=False, compare=False)

    @property
    def nodes(self) -> List["Node"]:
        if self._nodes is None:
            raise BridgeGeometryError(
                "Girder must be resolved via generate_girder_nodes() before reading nodes")
        return self._nodes

    @nodes.setter
    def nodes(self, value: List["Node"]) -> None:
        self._nodes = value


@dataclass
class Node:
    """A girder node (grid point) at a pier on a girder line."""
    node_id: str
    girder_id: str
    pier_id: str
    station: float
    offset_m: float
    xyz: Vec3
    z_plan: float = 0.0


def validate_girder(girder: Girder) -> List[str]:
    issues: list = []
    if not girder.girder_id:
        issues.append("girder_id must not be empty")
    if girder.line_side not in ("left", "right", "center"):
        issues.append(f"girder {girder.girder_id!r} line_side must be left/right/center")
    if not math.isfinite(girder.transverse_offset_m):
        issues.append(f"girder {girder.girder_id!r} transverse_offset_m must be finite")
    return issues


def validate_pier(
    pier: Pier,
    *,
    alignment_start: Optional[float] = None,
    alignment_end: Optional[float] = None,
) -> List[str]:
    """Validate a Pier. Returns a list of issues (empty when valid)."""
    issues: list = []
    if not pier.pier_id:
        issues.append("pier_id must not be empty")
    if not math.isfinite(pier.station):
        issues.append(f"pier {pier.pier_id!r} station must be finite")
    if not math.isfinite(pier.skew_angle_deg):
        issues.append(f"pier {pier.pier_id!r} skew_angle_deg must be finite")
    elif not (SKEW_MIN_DEG < pier.skew_angle_deg < SKEW_MAX_DEG):
        issues.append(
            f"pier {pier.pier_id!r} skew_angle_deg {pier.skew_angle_deg!r} "
            f"outside ({SKEW_MIN_DEG}, {SKEW_MAX_DEG})")
    if alignment_start is not None and pier.station < alignment_start:
        issues.append(
            f"pier {pier.pier_id!r} station {pier.station!r} before alignment start "
            f"{alignment_start!r}")
    if alignment_end is not None and pier.station > alignment_end:
        issues.append(
            f"pier {pier.pier_id!r} station {pier.station!r} beyond alignment end "
            f"{alignment_end!r}")
    for offset in pier.bearing_offsets_m:
        if not math.isfinite(offset):
            issues.append(f"pier {pier.pier_id!r} has non-finite bearing offset")
    return issues


__all__ = [
    "SKEW_MIN_DEG",
    "SKEW_MAX_DEG",
    "BridgeGeometryError",
    "Pier",
    "Span",
    "Girder",
    "Node",
    "validate_pier",
    "validate_span",
    "validate_span_sequence",
    "validate_girder",
]
