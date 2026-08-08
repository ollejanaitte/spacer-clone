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
    "validate_pier",
]
