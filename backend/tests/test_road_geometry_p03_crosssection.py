# -*- coding: utf-8 -*-
"""Road Geometry API - P03 facade cross section integration tests (X4D-P03).

Verifies the facade merges width / crossfall / road edges / section points /
Z through the X4-C Cross Section Generator.
"""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import RoadElementRow
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.crosssection.model import (
    CrossSectionSegment,
    CrossfallInput,
)
from backend.rule_engine.road_geometry import (
    RoadGeometryRequest,
    road_geometry_api,
)

ROAD = "r"


def _straight_alignment(length: float = 100.0, azimuth: float = 0.0):
    return build_alignment(
        ROAD,
        [StraightElement(id="e0", length=length, start=Vec2D(0, 0), azimuth=azimuth)],
        origin_station=0.0,
    )


def _segments(left=3.0, right=3.0):
    return (
        [CrossSectionSegment(segment_id="l0", side="LEFT", width=left)],
        [CrossSectionSegment(segment_id="r0", side="RIGHT", width=right)],
    )


class TestCrossSectionMerge:
    def test_widths_merged(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        assert result.ok
        assert result.total_left_width == 3.0
        assert result.total_right_width == 3.0

    def test_edges_on_straight_azimuth_zero(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        assert result.left_edge_xyz is not None
        assert result.right_edge_xyz is not None
        assert result.left_edge_xyz.x == pytest.approx(50.0)
        assert result.left_edge_xyz.y == pytest.approx(-3.0)
        assert result.right_edge_xyz.x == pytest.approx(50.0)
        assert result.right_edge_xyz.y == pytest.approx(3.0)

    def test_section_points_filled(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        point_ids = {p.point_id for p in result.section_points}
        assert "center" in point_ids
        assert "l0" in point_ids
        assert "r0" in point_ids
        for point in result.section_points:
            assert point.xyz is not None

    def test_crossfall_applied_to_edges(self):
        left, right = _segments()
        crossfall = CrossfallInput(left_slope_percent=-2.0, right_slope_percent=-2.0)
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right, crossfall=crossfall,
            center_elevation=10.0)
        result = road_geometry_api.evaluate(request)
        assert result.crossfall_left_percent == pytest.approx(-2.0)
        assert result.crossfall_right_percent == pytest.approx(-2.0)
        # dz = -(slope%/100) * (offset - pivot): left offset -3 -> -0.06, right +3 -> +0.06
        assert result.left_edge_xyz.z == pytest.approx(10.0 - 0.06)
        assert result.right_edge_xyz.z == pytest.approx(10.0 + 0.06)

    def test_z_from_center_elevation(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right, center_elevation=7.25)
        result = road_geometry_api.evaluate(request)
        assert result.z == pytest.approx(7.25)

    def test_asymmetric_widths(self):
        left, right = _segments(left=4.5, right=2.0)
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        assert result.total_left_width == pytest.approx(4.5)
        assert result.total_right_width == pytest.approx(2.0)
        assert result.left_edge_xyz.y == pytest.approx(-4.5)
        assert result.right_edge_xyz.y == pytest.approx(2.0)

    def test_trace_records_cross_section(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        assert result.trace.get("cross_section") == "X4C-CROSS-SECTION"
