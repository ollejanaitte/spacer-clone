# -*- coding: utf-8 -*-
"""Global XYZ generation for a Cross Section (X-C-P4).

Converts the local section (offset / local elevation) into global coordinates:
  - XY: center_xy + normal(azimuth) * offset  (canonical kernel offset_point)
  - Z : center elevation (explicit input) + elevation delta from crossfall

Elevation contract: the backend has no vertical-alignment evaluator; the
center/pivot elevation is an EXPLICIT INPUT (producer DEFERRED in X4-C). If an
upstream profile producer appears later, it feeds center_elevation through an
adapter — no geometry is duplicated here.
"""
from __future__ import annotations

from dataclasses import replace
from typing import List

from backend.rule_engine.geometry.contracts import Vec2D, Vec3, offset_point
from backend.rule_engine.alignment import Alignment

from .model import CrossSectionRequest, CrossSectionResult
from .geometry import generate_local_section, pose_at


class GlobalXyzError(ValueError):
    """Raised when global XYZ cannot be generated."""


def point_global(
    center_xy,
    azimuth: float,
    offset: float,
    local_z: float,
) -> Vec3:
    """Global XYZ at a signed transverse offset.

    Mirrors frontend canonical offsetPoint: x/y through the geometry kernel,
    z as the locally accumulated elevation.
    """
    plan = offset_point(center_xy, azimuth, offset)
    return Vec3(x=plan.x, y=plan.y, z=local_z)


def center_point_global(
    center_xy,
    center_elevation: float,
) -> Vec3:
    return Vec3(x=center_xy.x, y=center_xy.y, z=center_elevation)


def generate_global_section(
    alignment: Alignment,
    request: CrossSectionRequest,
) -> CrossSectionResult:
    """Generate the full global Cross Section (XYZ filled for every point)."""
    local = generate_local_section(alignment, request)
    pose = pose_at(alignment, request.station)
    center_xyz = center_point_global(pose.center_xy, request.center_elevation)

    result = replace(
        local,
        center_point_xyz=center_xyz,
        trace={**local.trace, "global_xyz": True, "elevation_source": "explicit_input"},
    )

    for point in result.section_points:
        point.xyz = point_global(pose.center_xy, pose.azimuth, point.offset, point.elevation)

    return result


def elevation_contract_status() -> str:
    """Explicit elevation producer contract status (recorded in X4-C)."""
    return "EXPLICIT_INPUT: DEFERRED (backend has no vertical profile solver)"


__all__ = [
    "GlobalXyzError",
    "center_point_global",
    "elevation_contract_status",
    "generate_global_section",
    "point_global",
]