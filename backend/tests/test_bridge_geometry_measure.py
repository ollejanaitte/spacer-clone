# -*- coding: utf-8 -*-
"""Bridge Geometry - measures tests (STEP-2 S2-UX10)."""
from __future__ import annotations

import math

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D, Vec3
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.bridge_geometry import (
    Girder,
    Node,
    generate_girder_nodes,
    node_distances,
    overhang_length,
    to_bridge_local,
)


def _alignment(length=200.0, azimuth=0.0):
    return build_alignment(
        "road",
        [StraightElement(id="e0", start=Vec2D(0, 0), azimuth=azimuth,
                         length=length)],
        origin_station=0.0,
    )


def _piers():
    from backend.rule_engine.bridge_geometry import Pier
    return [Pier(pier_id=f"K{i}", station=float(i) * 50.0, alignment_id="road")
            for i in range(4)]


def _girder(offset=0.0, side="center"):
    return generate_girder_nodes(
        Girder(girder_id="G301", line_side=side, transverse_offset_m=offset,
               alignment_id="road"),
        _piers(), alignment=_alignment(), z_plan=10.0)


class TestNodeDistances:
    def test_span_distances(self):
        girder = _girder()
        distances = node_distances(girder)
        assert len(distances) == 3
        assert distances[0].from_node_id == "G301-K0"
        assert distances[0].to_node_id == "G301-K1"
        assert distances[0].station_delta_m == 50.0
        assert distances[0].distance_m == pytest.approx(50.0)

    def test_no_nodes_raises(self):
        with pytest.raises(Exception):
            node_distances(Girder(girder_id="G", line_side="center"))


class TestOverhangLength:
    def test_center_girder_overhang(self):
        girder = _girder(offset=0.0)
        overhang = overhang_length(
            [girder], alignment=_alignment(), station=25.0,
            road_edge_offset_m=7.5)
        assert overhang is not None
        assert overhang.overhang_m == pytest.approx(7.5)

    def test_outer_girder_reduces_overhang(self):
        girders = [_girder(offset=0.0), _girder(offset=6.0, side="right")]
        overhang = overhang_length(
            girders, alignment=_alignment(), station=25.0,
            road_edge_offset_m=7.5)
        assert overhang.girder_id == "G301"
        assert overhang.overhang_m == pytest.approx(1.5)

    def test_no_girders_returns_none(self):
        assert overhang_length([], alignment=_alignment(), station=0.0,
                               road_edge_offset_m=7.5) is None


class TestBridgeLocal:
    def test_center_projection(self):
        # point on the bridge axis at station 50 -> u=50, v=0
        local = to_bridge_local(Vec3(50, 0, 10.0), alignment=_alignment(),
                                station=0.0)
        assert local.u_m == pytest.approx(50.0)
        assert local.v_m == pytest.approx(0.0)

    def test_transverse_offset(self):
        # point offset +6 from axis at station 50
        local = to_bridge_local(Vec3(50, 6, 10.0), alignment=_alignment(),
                                station=0.0)
        assert local.u_m == pytest.approx(50.0)
        assert local.v_m == pytest.approx(6.0)

    def test_azimuth_north(self):
        # azimuth 90°: axis along Y, so (0,50) -> u=50
        local = to_bridge_local(Vec3(0, 50, 10.0),
                                alignment=_alignment(azimuth=math.pi / 2),
                                station=0.0)
        assert local.u_m == pytest.approx(50.0, abs=1e-9)
