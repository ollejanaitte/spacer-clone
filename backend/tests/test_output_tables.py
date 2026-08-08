# -*- coding: utf-8 -*-
"""Output - table builder tests (STEP-2 S2-UX12)."""
from __future__ import annotations

import pytest

from backend.rule_engine.bridge_geometry import Girder, Node, Pier
from backend.rule_engine.geometry.contracts import Vec3
from backend.rule_engine.output import (
    crossfall_table,
    element_table,
    girder_table,
    key_point_table,
    node_table,
    pier_table,
    road_edge_table,
    station_coordinate_table,
    vertical_table,
)


class TestElementTable:
    def test_build(self):
        t = element_table([
            {"type": "arc", "id": "a1", "start": 0.0, "end": 50.0,
             "length": 50.0, "curvature": 0.01, "a": None}])
        assert t.title == "線形要素表"
        assert t.rows[0].columns[0] == "arc"
        assert t.rows[0].columns[5] == "100"  # R=1/0.01


class TestKeyPointTable:
    def test_build(self):
        t = key_point_table([
            {"name": "BP", "station": 0.0, "x": 0.0, "y": 0.0, "z": 10.0,
             "curvature": 0.0, "a": None, "length": 0.0}])
        assert t.rows[0].columns[0] == "BP"
        assert t.rows[0].columns[3] == "0.000"


class TestStationTable:
    def test_build(self):
        t = station_coordinate_table([
            {"station": 20.0, "x": 20.0, "y": 0.0, "z": 10.0,
             "heading": 0.0, "curvature": 0.0, "element_id": "e0"}])
        assert t.rows[0].columns[0] == "20.000"


class TestVerticalTable:
    def test_build(self):
        t = vertical_table([
            {"station": 0.0, "z": 17.6595, "grade": 0.0,
             "vertical_curvature": 0.0, "element_id": "v0"}])
        assert t.rows[0].columns[2] == "0.000"  # grade %


class TestCrossfallTable:
    def test_build(self):
        t = crossfall_table([
            {"station": 0.0, "left": -0.02, "right": -0.02, "widening": 0.5}])
        assert t.rows[0].columns[1] == "-2.000"


class TestRoadEdgeTable:
    def test_build(self):
        t = road_edge_table([
            {"station": 0.0, "side": "LEFT", "x": 0.0, "y": -3.0, "z": 10.0}])
        assert t.rows[0].columns[1] == "LEFT"


class TestBridgeTables:
    def test_pier_table(self):
        pier = Pier(pier_id="K1", station=0.0, alignment_id="road")
        pier.support_points = [Vec3(0, 0, 10.0), Vec3(0, 6, 10.0)]
        t = pier_table([pier])
        assert len(t.rows) == 2
        assert t.rows[0].columns[0] == "K1"

    def test_girder_table(self):
        t = girder_table([Girder(girder_id="G1", line_side="center",
                                 transverse_offset_m=0.0)])
        assert t.rows[0].columns[0] == "G1"

    def test_node_table(self):
        t = node_table([
            Node(node_id="G1-K1", girder_id="G1", pier_id="K1",
                 station=0.0, offset_m=0.0, xyz=Vec3(0, 0, 10.0))])
        assert t.rows[0].columns[0] == "G1-K1"
        assert t.rows[0].columns[6] == "0.000"  # X
