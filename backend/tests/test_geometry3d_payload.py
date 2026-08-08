# -*- coding: utf-8 -*-
"""3D Geometry payload tests (STEP-2 S2-UX14)."""
from __future__ import annotations

import json

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.bridge_geometry import (
    Girder,
    Pier,
    generate_girder_nodes,
    resolve_pier,
)
from backend.rule_engine.geometry3d import (
    build_centerline,
    build_edges,
    build_full_payload,
    build_girder3d,
    build_node3d,
    build_pier3d,
)


def _alignment():
    return build_alignment(
        "road",
        [StraightElement(id="e0", start=Vec2D(0, 0), azimuth=0.0, length=100.0)],
        origin_station=0.0,
    )


class TestCenterline:
    def test_build(self):
        centerline = build_centerline(_alignment(), [0.0, 50.0, 100.0])
        assert len(centerline.points) == 3
        assert centerline.points[1]["x"] == 50.0
        assert centerline.points[1]["y"] == 0.0


class TestEdges:
    def test_build(self):
        edges = build_edges(_alignment(), [0.0, 100.0],
                            left_width_m=3.0, right_width_m=3.0)
        assert edges["left"].points[0]["y"] == pytest.approx(-3.0)
        assert edges["right"].points[0]["y"] == pytest.approx(3.0)


class TestBridgeShaping:
    def test_pier3d(self):
        pier = resolve_pier(Pier(pier_id="K1", station=50.0, alignment_id="road",
                                 skew_angle_deg=90.0), alignment=_alignment())
        p3d = build_pier3d(pier)
        assert p3d.pier_id == "K1"
        assert p3d.skew_deg == 90.0
        assert p3d.supports[0]["x"] == 50.0

    def test_girder3d_and_node3d(self):
        piers = [Pier(pier_id="K1", station=0.0, alignment_id="road"),
                 Pier(pier_id="K2", station=50.0, alignment_id="road")]
        girder = generate_girder_nodes(
            Girder(girder_id="G1", line_side="center", alignment_id="road"),
            piers, alignment=_alignment(), z_plan=10.0)
        g3d = build_girder3d(girder)
        assert len(g3d.nodes) == 2
        n3d = build_node3d(girder.nodes[0])
        assert n3d.x == 0.0


class TestFullPayload:
    def test_to_dict_json(self):
        payload = build_full_payload(
            alignment_id="road",
            alignment=_alignment(),
            stations=[0.0, 50.0, 100.0],
        )
        data = payload.to_dict()
        assert data["coordinateSystem"] == "global"
        assert data["units"] == "m"
        assert data["centerline"] is not None
        assert data["edges"]["left"]["points"][1]["y"] == pytest.approx(-3.0)
        json_text = payload.to_json()
        parsed = json.loads(json_text)
        assert parsed["alignmentId"] == "road"

    def test_provenance_default(self):
        payload = build_full_payload(
            alignment_id="road", alignment=_alignment(), stations=[0.0])
        assert "generators" in payload.provenance
