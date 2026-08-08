# -*- coding: utf-8 -*-
"""Road Geometry API - P02 facade alignment integration tests (X4D-P02).

Verifies the facade center-pose evaluation through the X4-B Alignment Solver
and X4-A Geometry Kernel (tangent / normal derivation).
"""
from __future__ import annotations

import math

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import RoadElementRow
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
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


def _rows():
    return [RoadElementRow(kind="straight", length=100.0, id="e0")]


class TestCenterPose:
    def test_straight_azimuth_zero(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=50.0, rows=_rows())
        result = road_geometry_api.evaluate(request)
        assert result.ok
        assert result.station == 50.0
        assert result.x == 50.0
        assert result.y == 0.0
        assert result.heading == 0.0
        assert result.curvature == 0.0
        assert result.element_id == "e0"
        assert result.tangent.x == pytest.approx(1.0)
        assert result.normal.y == pytest.approx(1.0)

    def test_center_elevation_explicit(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=25.0, rows=_rows(),
            center_elevation=12.5)
        result = road_geometry_api.evaluate(request)
        assert result.z == 12.5

    def test_straight_azimuth_pi_over_2(self):
        alignment = _straight_alignment(azimuth=math.pi / 2)
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, alignment=alignment)
        result = road_geometry_api.evaluate(request)
        assert result.x == pytest.approx(0.0, abs=1e-9)
        assert result.y == pytest.approx(10.0, abs=1e-9)
        assert result.heading == pytest.approx(math.pi / 2)
        assert result.tangent.y == pytest.approx(1.0, abs=1e-9)
        assert result.normal.x == pytest.approx(-1.0, abs=1e-9)

    def test_degrees_bearing_units(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, rows=_rows(),
            bearing_units="degree")
        result = road_geometry_api.evaluate(request)
        assert result.heading == 0.0

    def test_prebuilt_alignment_wins(self):
        alignment = _straight_alignment()
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, alignment=alignment,
            rows=[RoadElementRow(kind="straight", length=5.0, id="x")])
        result = road_geometry_api.evaluate(request)
        assert result.x == 10.0

    def test_out_of_range_station_raises(self):
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=150.0, rows=_rows())
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_cross_section_inputs_still_deferred(self):
        from backend.rule_engine.crosssection.model import CrossSectionSegment
        request = RoadGeometryRequest(
            alignment_id=ROAD, station=10.0, rows=_rows(),
            left_segments=[CrossSectionSegment(segment_id="l0", side="LEFT", width=3.0)],
        )
        with pytest.raises(NotImplementedError):
            road_geometry_api.evaluate(request)
