# -*- coding: utf-8 -*-
"""Bridge Geometry - measures (STEP-2 S2-UX10).

Computes derived quantities over resolved bridge geometry:

- node distance: 3D distance between adjacent nodes of the same girder
  (bridge-axis node spacing, i.e. 支間内格点間距離).
- overhang length: transverse distance from the outermost girder line to the
  road edge (張出し長).
- bridge-local coordinates: transform global XYZ to bridge axis (u = along
  tangent, v = transverse normal, z = elevation).

All math is derived from existing resolved geometry (no re-implementation of
road geometry; uses tangent/normal from the road pose).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

from backend.rule_engine.geometry.contracts import Vec3
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)

from .model import BridgeGeometryError, Girder, Node

__all__ = [
    "NodeDistance",
    "OverhangLength",
    "BridgeLocalPoint",
    "node_distances",
    "overhang_length",
    "to_bridge_local",
]


@dataclass
class NodeDistance:
    from_node_id: str
    to_node_id: str
    girder_id: str
    distance_m: float
    station_delta_m: float


@dataclass
class OverhangLength:
    girder_id: str
    side: str
    overhang_m: float
    edge_offset_m: float
    girder_offset_m: float


@dataclass
class BridgeLocalPoint:
    u_m: float
    v_m: float
    z_m: float


def node_distances(girder: Girder) -> List[NodeDistance]:
    """Compute 3D distance between adjacent nodes of a girder."""
    nodes = girder.nodes
    if not nodes:
        raise BridgeGeometryError(f"girder {girder.girder_id!r} has no resolved nodes")
    ordered = sorted(nodes, key=lambda n: n.station)
    result: List[NodeDistance] = []
    for left, right in zip(ordered, ordered[1:]):
        dx = right.xyz.x - left.xyz.x
        dy = right.xyz.y - left.xyz.y
        dz = right.xyz.z - left.xyz.z
        result.append(NodeDistance(
            from_node_id=left.node_id,
            to_node_id=right.node_id,
            girder_id=girder.girder_id,
            distance_m=math.hypot(dx, dy, dz),
            station_delta_m=right.station - left.station,
        ))
    return result


def overhang_length(
    girders: Sequence[Girder],
    *,
    alignment,
    station: float,
    road_edge_offset_m: float,
    alignment_id: str = "road",
) -> Optional[OverhangLength]:
    """Compute the overhang length at a station.

    The outermost girder's transverse offset vs the road edge offset:
      overhang = |road_edge_offset_m| - |outermost girder offset|

    Returns None when there are no girders at this station.
    """
    candidates: List[Tuple[str, str, float]] = []
    for girder in girders:
        nodes = girder.nodes
        if not nodes:
            continue
        closest = min(nodes, key=lambda n: abs(n.station - station))
        candidates.append((girder.girder_id, girder.line_side, abs(closest.offset_m)))

    if not candidates:
        return None

    outermost = max(candidates, key=lambda c: c[2])
    girder_id, side, girder_offset = outermost
    edge_abs = abs(road_edge_offset_m)
    overhang = max(0.0, edge_abs - girder_offset)
    return OverhangLength(
        girder_id=girder_id,
        side=side,
        overhang_m=overhang,
        edge_offset_m=edge_abs,
        girder_offset_m=girder_offset,
    )


def to_bridge_local(
    point: Vec3,
    *,
    alignment,
    station: float,
    alignment_id: str = "road",
) -> BridgeLocalPoint:
    """Transform a global point to bridge-axis local coordinates (u, v, z).

    u = distance along the bridge axis (tangent direction) from the station
        origin projection; v = signed transverse distance (right = +).
    """
    request = RoadGeometryRequest(
        alignment_id=alignment_id,
        station=station,
        alignment=alignment,
    )
    try:
        pose = road_geometry_api.evaluate(request)
    except (RoadGeometryError, ValueError) as exc:
        raise BridgeGeometryError(f"bridge-local transform at station "
                                  f"{station!r}: {exc}") from exc

    heading = pose.heading
    tangent = (math.cos(heading), math.sin(heading), 0.0)
    normal = (-math.sin(heading), math.cos(heading), 0.0)

    dx = point.x - pose.x
    dy = point.y - pose.y
    u = dx * tangent[0] + dy * tangent[1]
    v = dx * normal[0] + dy * normal[1]
    z = point.z - (pose.z if pose.z is not None else 0.0)
    return BridgeLocalPoint(u_m=u, v_m=v, z_m=z)
