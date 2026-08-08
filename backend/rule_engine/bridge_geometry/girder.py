# -*- coding: utf-8 -*-
"""Bridge Geometry - Girder / Node resolution (STEP-2 S2-UX09).

Generates girder nodes (grid points) at every pier station along a girder line.

Node placement:
  - for each pier the girder passes over, the node station = pier station
  - the node transverse offset = girder.transverse_offset_m (signed)
  - global XYZ via X4-D (center XY + normal * offset + Z)
"""
from __future__ import annotations

from typing import List, Sequence

from backend.rule_engine.geometry.contracts import Vec3
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)

from .model import (
    BridgeGeometryError,
    Girder,
    Node,
    Pier,
    validate_girder,
)

__all__ = ["generate_girder_nodes"]


def generate_girder_nodes(
    girder: Girder,
    piers: Sequence[Pier],
    *,
    alignment,
    z_plan: float = 0.0,
) -> Girder:
    """Resolve girder nodes at each pier. Returns the girder with nodes set.

    For each pier, evaluates the road geometry at pier.station with the girder's
    transverse offset, producing a Node at the girder line on that pier.
    """
    issues = validate_girder(girder)
    if issues:
        raise BridgeGeometryError("; ".join(issues))

    nodes: List[Node] = []
    for pier in piers:
        request = RoadGeometryRequest(
            alignment_id=girder.alignment_id or pier.alignment_id,
            station=pier.station,
            alignment=alignment,
            left_segments=[],
            right_segments=[],
        )
        try:
            pose = road_geometry_api.evaluate(request)
        except (RoadGeometryError, ValueError) as exc:
            raise BridgeGeometryError(f"girder {girder.girder_id!r} at pier "
                                      f"{pier.pier_id!r}: {exc}") from exc

        # normal = (-sin(heading), cos(heading), 0); offset is signed (right=+)
        import math
        heading = pose.heading
        nx = -math.sin(heading)
        ny = math.cos(heading)
        center_z = pose.z if pose.z is not None else z_plan

        node = Node(
            node_id=f"{girder.girder_id}-{pier.pier_id}",
            girder_id=girder.girder_id,
            pier_id=pier.pier_id,
            station=pier.station,
            offset_m=girder.transverse_offset_m,
            xyz=Vec3(
                x=pose.x + nx * girder.transverse_offset_m,
                y=pose.y + ny * girder.transverse_offset_m,
                z=center_z,
            ),
            z_plan=center_z,
        )
        nodes.append(node)

    girder.nodes = nodes
    return girder


__all__ = ["generate_girder_nodes"]
