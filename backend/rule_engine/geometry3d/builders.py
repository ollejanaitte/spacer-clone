# -*- coding: utf-8 -*-
"""3D Geometry payload builder (STEP-2 S2-UX14).

Adapters that shape X4-D road geometry and bridge_geometry results into the
immutable BridgeGeometry3dPayload. No geometry computation here.
"""
from __future__ import annotations

from typing import List, Optional, Sequence

from backend.rule_engine.alignment import Alignment
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    RoadGeometryResult,
    road_geometry_api,
)

from .model import (
    BridgeGeometry3dPayload,
    Centerline3d,
    CrossSection3d,
    Edge3d,
    Girder3d,
    Node3d,
    Pier3d,
    build_payload,
)

__all__ = [
    "build_centerline",
    "build_edges",
    "build_pier3d",
    "build_girder3d",
    "build_node3d",
    "build_full_payload",
]


def _point(station: float, result: RoadGeometryResult) -> dict:
    return {
        "station": station,
        "x": result.x,
        "y": result.y,
        "z": result.z,
        "heading": result.heading,
        "curvature": result.curvature,
        "elementId": result.element_id,
    }


def _edge_point(station: float, result: RoadGeometryResult, side: str) -> dict:
    edge = result.left_edge_xyz if side == "left" else result.right_edge_xyz
    if edge is None:
        return {"station": station, "x": result.x, "y": result.y, "z": result.z}
    return {"station": station, "x": edge.x, "y": edge.y, "z": edge.z}


def build_centerline(
    alignment: Alignment,
    stations: Sequence[float],
) -> Centerline3d:
    points = []
    for station in stations:
        result = road_geometry_api.evaluate(RoadGeometryRequest(
            alignment_id=alignment.alignment_id,
            station=float(station),
            alignment=alignment,
        ))
        points.append(_point(float(station), result))
    return Centerline3d(points=points)


def build_edges(
    alignment: Alignment,
    stations: Sequence[float],
    *,
    left_width_m: float,
    right_width_m: float,
) -> dict:
    left_points = []
    right_points = []
    for station in stations:
        result = _with_edges(alignment, station, left_width_m, right_width_m)
        left_points.append(_edge_point(float(station), result, "left"))
        right_points.append(_edge_point(float(station), result, "right"))
    return {
        "left": Edge3d(points=left_points),
        "right": Edge3d(points=right_points),
    }


def _with_edges(
    alignment: Alignment,
    station: float,
    left_width_m: float,
    right_width_m: float,
) -> RoadGeometryResult:
    """Evaluate with edge offsets present (X4-C path)."""
    from backend.rule_engine.crosssection.model import CrossSectionSegment
    request = RoadGeometryRequest(
        alignment_id=alignment.alignment_id,
        station=station,
        alignment=alignment,
        left_segments=[CrossSectionSegment(
            segment_id="L0", side="LEFT", width=left_width_m)],
        right_segments=[CrossSectionSegment(
            segment_id="R0", side="RIGHT", width=right_width_m)],
    )
    return road_geometry_api.evaluate(request)


def build_pier3d(pier) -> Pier3d:
    return Pier3d(
        pier_id=pier.pier_id,
        station=pier.station,
        skew_deg=pier.skew_angle_deg,
        supports=[{"nodeId": f"{pier.pier_id}-{i}", "x": p.x, "y": p.y, "z": p.z}
                  for i, p in enumerate(pier.support_points)],
    )


def build_girder3d(girder) -> Girder3d:
    return Girder3d(
        girder_id=girder.girder_id,
        line_side=girder.line_side,
        transverse_offset=girder.transverse_offset_m,
        nodes=[{"nodeId": n.node_id, "x": n.xyz.x, "y": n.xyz.y, "z": n.xyz.z}
               for n in girder.nodes],
    )


def build_node3d(node) -> Node3d:
    return Node3d(
        node_id=node.node_id,
        girder_id=node.girder_id,
        pier_id=node.pier_id,
        station=node.station,
        x=node.xyz.x,
        y=node.xyz.y,
        z=node.xyz.z,
    )


def build_full_payload(
    *,
    alignment_id: str,
    alignment: Alignment,
    stations: Sequence[float],
    left_width_m: float = 3.0,
    right_width_m: float = 3.0,
    piers: Optional[Sequence] = None,
    girders: Optional[Sequence] = None,
    nodes: Optional[Sequence] = None,
    sections: Optional[List[CrossSection3d]] = None,
    provenance: Optional[dict] = None,
) -> BridgeGeometry3dPayload:
    """Build a full payload from road geometry + optional bridge geometry."""
    return build_payload(
        alignment_id=alignment_id,
        centerline=build_centerline(alignment, stations),
        edges=build_edges(alignment, stations, left_width_m=left_width_m,
                          right_width_m=right_width_m),
        sections=sections,
        piers=[build_pier3d(p) for p in piers] if piers else None,
        girders=[build_girder3d(g) for g in girders] if girders else None,
        nodes=[build_node3d(n) for n in nodes] if nodes else None,
        provenance=provenance,
    )
