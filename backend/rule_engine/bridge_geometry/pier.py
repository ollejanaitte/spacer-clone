# -*- coding: utf-8 -*-
"""Bridge Geometry - Pier resolution (STEP-2 S2-UX07).

Resolves a Pier's support points (bearing positions) from the road geometry.

Support points are computed as global XYZ at the pier station plus transverse
bearing offsets. The skew angle positions the support line: for a given skew,
the transverse offset is measured perpendicular to the support line, and the
support point moves along the bridge axis accordingly.

The geometry math is delegated to the X4-D RoadGeometryAPI (no re-implementation).
"""
from __future__ import annotations

import math
from typing import List, Optional

from backend.rule_engine.geometry.contracts import Vec3
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)

from .model import BridgeGeometryError, Pier, validate_pier

__all__ = [
    "resolve_pier",
    "support_line_direction",
]


def support_line_direction(azimuth: float, skew_angle_deg: float) -> Vec3:
    """Direction vector of the support line at a station.

    azimuth: bridge axis tangent azimuth (radians)
    skew_angle_deg: angle between bridge axis and support line (degrees).
    The support line runs perpendicular to the bridge axis plus the skew
    deviation, so its direction is:
      dir = (-sin(azimuth+δ), cos(azimuth+δ), 0)
    where δ = skew deviation from 90° (i.e. skew_angle_deg - 90).
    """
    delta = math.radians(skew_angle_deg - 90.0)
    angle = azimuth + delta
    return Vec3(x=-math.sin(angle), y=math.cos(angle), z=0.0)


def resolve_pier(
    pier: Pier,
    *,
    alignment,
    alignment_start: Optional[float] = None,
    alignment_end: Optional[float] = None,
) -> Pier:
    """Resolve pier.support_points from road geometry.

    Uses X4-D to get center XYZ / azimuth at the pier station, then places a
    support point at each bearing offset along the support line direction.
    Returns the same Pier with _support_points set.
    """
    issues = validate_pier(
        pier, alignment_start=alignment_start, alignment_end=alignment_end)
    if issues:
        raise BridgeGeometryError("; ".join(issues))

    request = RoadGeometryRequest(
        alignment_id=pier.alignment_id,
        station=pier.station,
        alignment=alignment,
    )
    try:
        pose = road_geometry_api.evaluate(request)
    except (RoadGeometryError, ValueError) as exc:
        raise BridgeGeometryError(f"pier {pier.pier_id!r}: {exc}") from exc

    azimuth = pose.heading  # radians (bearing_units default)
    direction = support_line_direction(azimuth, pier.skew_angle_deg)
    center = Vec3(x=pose.x, y=pose.y, z=pose.z if pose.z is not None else 0.0)

    offsets = list(pier.bearing_offsets_m) if pier.bearing_offsets_m else [0.0]
    points: List[Vec3] = []
    for offset in offsets:
        points.append(Vec3(
            x=center.x + direction.x * offset,
            y=center.y + direction.y * offset,
            z=center.z,
        ))

    pier.support_points = points
    return pier


__all__ = [
    "resolve_pier",
    "support_line_direction",
]
