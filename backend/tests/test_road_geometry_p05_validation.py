# -*- coding: utf-8 -*-
"""Road Geometry API - P05 result / validation / error contract tests (X4D-P05).

Verifies unified RoadGeometryError contract and elevation contract exposure.
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
    RoadGeometryAPI,
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)

ROAD = "r"


def _straight_alignment(length: float = 100.0):
    return build_alignment(
        ROAD,
        [StraightElement(id="e0", length=length, start=Vec2D(0, 0), azimuth=0.0)],
        origin_station=0.0,
    )


def _segments(left=3.0, right=3.0):
    return (
        [CrossSectionSegment(segment_id="l0", side="LEFT", width=left)],
        [CrossSectionSegment(segment_id="r0", side="RIGHT", width=right)],
    )


class TestElevationContract:
    def test_status_exposed(self):
        status = RoadGeometryAPI.elevation_contract_status()
        assert "EXPLICIT_INPUT" in status
        assert "DEFERRED" in status

    def test_trace_records_contract(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right, center_elevation=10.0)
        result = road_geometry_api.evaluate(request)
        assert "EXPLICIT_INPUT" in result.trace["elevation_contract"]


class TestErrorContract:
    def test_out_of_range_wrapped(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=150.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")])
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_bad_kind_row_wrapped(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0,
            rows=[RoadElementRow(kind="circle", length=10.0, id="e0")])
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_non_finite_crossfall_wrapped(self):
        left, right = _segments()
        crossfall = CrossfallInput(left_slope_percent=float("nan"), right_slope_percent=0.0)
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right, crossfall=crossfall)
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_non_finite_center_elevation_rejected(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, center_elevation=float("inf"),
            rows=[RoadElementRow(kind="straight", length=100.0, id="e0")])
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_invalid_pivot_wrapped(self):
        from backend.rule_engine.crosssection.model import PivotMode
        from backend.rule_engine.crosssection.model import PivotType, PivotDefinition
        left, right = _segments()
        pivot = PivotDefinition(pivot_type=PivotType.CENTERLINE, pivot_offset=0.0,
                                resolved=False)
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right, pivot=pivot)
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)


class TestResultUniformity:
    def test_result_fields_stable(self):
        left, right = _segments()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
            left_segments=left, right_segments=right)
        result = road_geometry_api.evaluate(request)
        assert result.station == 50.0
        assert result.x == 50.0
        assert result.y == 0.0
        assert result.heading == 0.0
        assert result.curvature == 0.0
        assert result.tangent is not None
        assert result.normal is not None
        assert result.left_edge_xyz is not None
        assert result.right_edge_xyz is not None
        assert result.total_left_width == 3.0
        assert result.total_right_width == 3.0
        assert len(result.section_points) >= 3
