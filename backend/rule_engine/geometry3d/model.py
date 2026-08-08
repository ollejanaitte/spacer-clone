# -*- coding: utf-8 -*-
"""3D Geometry payload contract (STEP-2 S2-UX14).

STEP1 P05 FROZEN: immutable, JSON-compatible payload that feeds the Step3
Three.js UI. All coordinates are in meters in the global coordinate system.

This module only *shapes* results from X4-D / Vertical / Bridge Geometry into
the payload; it performs no geometry computation itself.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

__all__ = [
    "Centerline3d",
    "Edge3d",
    "CrossSection3d",
    "Pier3d",
    "Girder3d",
    "Node3d",
    "BridgeGeometry3dPayload",
    "build_payload",
]
@dataclass
class Centerline3d:
    points: List[Dict] = field(default_factory=list)
    units: str = "m"


@dataclass
class Edge3d:
    points: List[Dict] = field(default_factory=list)
    units: str = "m"


@dataclass
class CrossSection3d:
    station: float = 0.0
    points: List[Dict] = field(default_factory=list)


@dataclass
class Pier3d:
    pier_id: str = ""
    station: float = 0.0
    skew_deg: float = 90.0
    supports: List[Dict] = field(default_factory=list)


@dataclass
class Girder3d:
    girder_id: str = ""
    line_side: str = "center"
    transverse_offset: float = 0.0
    nodes: List[Dict] = field(default_factory=list)


@dataclass
class Node3d:
    node_id: str = ""
    girder_id: str = ""
    pier_id: str = ""
    station: float = 0.0
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


@dataclass
class BridgeGeometry3dPayload:
    coordinate_system: str = "global"
    units: str = "m"
    alignment_id: str = ""
    centerline: Optional[Centerline3d] = None
    edges: Optional[Dict] = None
    sections: List[CrossSection3d] = field(default_factory=list)
    piers: List[Pier3d] = field(default_factory=list)
    girders: List[Girder3d] = field(default_factory=list)
    nodes: List[Node3d] = field(default_factory=list)
    provenance: Dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "coordinateSystem": self.coordinate_system,
            "units": self.units,
            "alignmentId": self.alignment_id,
            "centerline": self.centerline.__dict__ if self.centerline else None,
            "edges": {k: v.__dict__ for k, v in self.edges.items()}
            if self.edges else None,
            "sections": [s.__dict__ for s in self.sections],
            "piers": [p.__dict__ for p in self.piers],
            "girders": [g.__dict__ for g in self.girders],
            "nodes": [n.__dict__ for n in self.nodes],
            "provenance": self.provenance,
        }

    def to_json(self) -> str:
        import json
        return json.dumps(self.to_dict(), ensure_ascii=False)


def build_payload(
    *,
    alignment_id: str,
    centerline: Optional[Centerline3d] = None,
    edges: Optional[Dict[str, Edge3d]] = None,
    sections: Optional[List[CrossSection3d]] = None,
    piers: Optional[List[Pier3d]] = None,
    girders: Optional[List[Girder3d]] = None,
    nodes: Optional[List[Node3d]] = None,
    provenance: Optional[Dict] = None,
) -> BridgeGeometry3dPayload:
    """Build a payload; provenance defaults to generators list."""
    return BridgeGeometry3dPayload(
        alignment_id=alignment_id,
        centerline=centerline,
        edges=edges,
        sections=list(sections or []),
        piers=list(piers or []),
        girders=list(girders or []),
        nodes=list(nodes or []),
        provenance=provenance or {
            "generators": ["x4d", "vertical", "bridge-geometry"],
        },
    )
