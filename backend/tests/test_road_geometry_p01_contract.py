# -*- coding: utf-8 -*-
"""Road Geometry API - P01 contract tests (X4D-P01).

Validates the RoadGeometryRequest / RoadGeometryResult contract and the
facade skeleton shape. Full numeric evaluation is covered in P02/P03/P06.
"""
from __future__ import annotations

from dataclasses import replace

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import RoadElementRow
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.crosssection.model import (
    CrossSectionSegment,
    CrossfallInput,
    PivotDefinition,
)
from backend.rule_engine.road_geometry import (
    RoadGeometryAPI,
    RoadGeometryError,
    RoadGeometryRequest,
    RoadGeometryResult,
    road_geometry_api,
    validate_request,
)


def _straight_alignment(alignment_id: str = "r", length: float = 100.0):
    return build_alignment(
        alignment_id,
        [StraightElement(id="e0", length=length, start=Vec2D(0, 0), azimuth=0.0)],
        origin_station=0.0,
    )


class TestRequestContract:
    def test_minimal_rows_request_valid(self):
        request = RoadGeometryRequest(
            alignment_id="r",
            station=10.0,
            rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
        )
        validate_request(request)

    def test_prebuilt_alignment_valid(self):
        request = RoadGeometryRequest(
            alignment_id="r",
            station=10.0,
            alignment=_straight_alignment(),
        )
        validate_request(request)

    def test_empty_alignment_id_rejected(self):
        request = RoadGeometryRequest(alignment_id="", station=0.0,
                                      rows=[RoadElementRow(kind="straight", length=10.0)])
        with pytest.raises(RoadGeometryError):
            validate_request(request)

    def test_no_source_rejected(self):
        request = RoadGeometryRequest(alignment_id="r", station=0.0)
        with pytest.raises(RoadGeometryError):
            validate_request(request)

    def test_non_finite_station_rejected(self):
        request = RoadGeometryRequest(alignment_id="r", station=float("nan"),
                                      rows=[RoadElementRow(kind="straight", length=10.0)])
        with pytest.raises(RoadGeometryError):
            validate_request(request)

    def test_bad_bearing_units_rejected(self):
        request = RoadGeometryRequest(alignment_id="r", station=0.0,
                                      bearing_units="gon",
                                      rows=[RoadElementRow(kind="straight", length=10.0)])
        with pytest.raises(RoadGeometryError):
            validate_request(request)

    def test_negative_width_segment_rejected(self):
        request = RoadGeometryRequest(
            alignment_id="r",
            station=0.0,
            rows=[RoadElementRow(kind="straight", length=10.0)],
            left_segments=[CrossSectionSegment(segment_id="l0", side="LEFT", width=-1.0)],
        )
        with pytest.raises(RoadGeometryError):
            validate_request(request)


class TestFacadeSkeleton:
    def test_api_instance_exists(self):
        assert isinstance(road_geometry_api, RoadGeometryAPI)

    def test_skeleton_evaluate_center_pose(self):
        request = RoadGeometryRequest(
            alignment_id="r",
            station=10.0,
            rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
        )
        result = road_geometry_api.evaluate(request)
        assert result.ok
        assert result.x == 10.0

    def test_resolve_alignment_from_rows(self):
        api = RoadGeometryAPI()
        request = RoadGeometryRequest(
            alignment_id="r",
            station=10.0,
            rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
        )
        alignment = api._resolve_alignment(request)
        assert alignment.alignment_id == "r"
        assert alignment.total_length == 100.0

    def test_resolve_alignment_prebuilt_wins(self):
        api = RoadGeometryAPI()
        prebuilt = _straight_alignment("pb")
        request = RoadGeometryRequest(
            alignment_id="r",
            station=10.0,
            alignment=prebuilt,
            rows=[RoadElementRow(kind="straight", length=5.0, id="e0")],
        )
        alignment = api._resolve_alignment(request)
        assert alignment is prebuilt


class TestResultContract:
    def test_result_fields_exist(self):
        result = RoadGeometryResult(
            station=10.0,
            x=1.0, y=2.0, z=3.0,
            heading=0.0,
            tangent=None, normal=None,
            curvature=0.0,
            element_id="e0", element_type="straight",
            total_left_width=0.0, total_right_width=0.0,
            crossfall_left_percent=0.0, crossfall_right_percent=0.0,
            left_edge_xyz=None, right_edge_xyz=None,
        )
        assert result.ok
        assert result.station == 10.0
        assert result.z == 3.0
        assert result.x == 1.0 and result.y == 2.0

    def test_result_error_flag(self):
        result = RoadGeometryResult(
            station=0.0, x=0.0, y=0.0, z=None, heading=0.0,
            tangent=None, normal=None, curvature=0.0,
            element_id="", element_type="",
            total_left_width=0.0, total_right_width=0.0,
            crossfall_left_percent=0.0, crossfall_right_percent=0.0,
            left_edge_xyz=None, right_edge_xyz=None,
            errors=["boom"],
        )
        assert not result.ok
