# -*- coding: utf-8 -*-
"""Vertical Geometry - S2-UX01 tests (backend implementation).

Mirrors STEP1_P01_TEST_VECTORS (hand-computed oracles) and validates
Road Geometry API integration (vertical_profile as elevation producer).
"""
from __future__ import annotations

import pytest

from backend.rule_engine.vertical import (
    VerticalError,
    VerticalGradeElement,
    VerticalParabolicElement,
    build_vertical_profile,
    evaluate_vertical,
    grade_percent_to_ratio,
    grade_to_percent,
)
from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)


def _grade(start=0.0, end=100.0, z0=10.0, g=0.02, i="g0"):
    return VerticalGradeElement(
        id=i, start_station=start, end_station=end,
        start_elevation=z0, grade=g)


def _parab(start=0.0, end=200.0, g0=0.03, g1=-0.03, z0=5.0, i="p0"):
    return VerticalParabolicElement(
        id=i, start_station=start, end_station=end,
        start_grade=g0, end_grade=g1, start_elevation=z0, curve_type="crest")


class TestGradeElement:
    def test_tv_v01_single_grade(self):
        profile = build_vertical_profile("p", [_grade()])
        ev = evaluate_vertical(profile, 50.0)
        assert ev["elevation"] == pytest.approx(11.0)
        assert ev["grade"] == pytest.approx(0.02)
        ev_end = evaluate_vertical(profile, 100.0)
        assert ev_end["elevation"] == pytest.approx(12.0)

    def test_tv_v02_negative_grade_and_range(self):
        profile = build_vertical_profile("p", [
            _grade(z0=25.0, g=-0.03, end=80.0)])
        ev = evaluate_vertical(profile, 40.0)
        assert ev["elevation"] == pytest.approx(23.8)
        with pytest.raises(VerticalError):
            evaluate_vertical(profile, 81.0)


class TestParabolicElement:
    def test_tv_v03_crest(self):
        profile = build_vertical_profile("p", [_parab()])
        ev = evaluate_vertical(profile, 100.0)
        assert ev["elevation"] == pytest.approx(6.5)
        assert ev["grade"] == pytest.approx(0.0)
        assert ev["vertical_curvature"] == pytest.approx(-0.0003)
        assert evaluate_vertical(profile, 200.0)["elevation"] == pytest.approx(5.0)

    def test_tv_v04_sag(self):
        profile = build_vertical_profile("p", [
            VerticalParabolicElement(
                id="s0", start_station=0.0, end_station=100.0,
                start_grade=-0.02, end_grade=0.02, start_elevation=8.0,
                curve_type="sag")])
        ev = evaluate_vertical(profile, 50.0)
        assert ev["elevation"] == pytest.approx(7.5)
        assert ev["vertical_curvature"] == pytest.approx(0.0004)


class TestContinuityValidation:
    def test_tv_v05_g0_boundary(self):
        # grade [0,100] -> parabolic [100,200]; parabolic start elevation must match
        grade = _grade(end=100.0, z0=10.0, g=0.01)  # end elevation = 11.0
        parabola = VerticalParabolicElement(
            id="p0", start_station=100.0, end_station=200.0,
            start_grade=0.01, end_grade=-0.01, start_elevation=11.0)
        profile = build_vertical_profile("p", [grade, parabola])
        assert evaluate_vertical(profile, 100.0)["elevation"] == pytest.approx(11.0)

    def test_tv_v06_discontinuity_rejected(self):
        grade = _grade(end=100.0, z0=10.0, g=0.01)  # end elevation = 11.0
        parabola = VerticalParabolicElement(
            id="p0", start_station=100.0, end_station=200.0,
            start_grade=0.0, end_grade=0.0, start_elevation=99.0)  # mismatch
        with pytest.raises(VerticalError):
            build_vertical_profile("p", [grade, parabola])

    def test_tv_v06_non_contiguous_rejected(self):
        with pytest.raises(VerticalError):
            build_vertical_profile("p", [_grade(end=50.0), _grade(start=60.0)])

    def test_tv_v06_non_positive_length_rejected(self):
        with pytest.raises(VerticalError):
            build_vertical_profile("p", [
                VerticalGradeElement(id="g", start_station=0.0, end_station=0.0,
                                     start_elevation=0.0, grade=0.0)])

    def test_tv_v06_non_finite_rejected(self):
        with pytest.raises(VerticalError):
            build_vertical_profile("p", [
                VerticalGradeElement(id="g", start_station=0.0, end_station=10.0,
                                     start_elevation=0.0, grade=float("nan"))])


class TestVpi:
    def test_grade_grade_vpi(self):
        profile = build_vertical_profile("p", [
            _grade(end=100.0, z0=0.0, g=0.02),
            VerticalGradeElement(id="g1", start_station=100.0, end_station=200.0,
                                 start_elevation=2.0, grade=-0.02),
        ])
        vpis = profile.vpis
        assert len(vpis) == 1
        assert vpis[0]["station"] == pytest.approx(100.0)
        assert vpis[0]["left_grade"] == pytest.approx(0.02)
        assert vpis[0]["right_grade"] == pytest.approx(-0.02)


class TestUnitConversion:
    def test_grade_percent(self):
        assert grade_to_percent(0.02) == pytest.approx(2.0)
        assert grade_percent_to_ratio(2.0) == pytest.approx(0.02)


class TestRoadGeometryIntegration:
    HCL_LENGTH = 164.2476

    def _alignment(self):
        return build_alignment(
            "HCL",
            [StraightElement(id="hcl", start=Vec2D(0, 0), azimuth=0.0,
                             length=self.HCL_LENGTH)],
            origin_station=0.0)

    def _profile(self):
        # flat grade at PDF design elevation 17.6595
        return build_vertical_profile(
            "HCL-V", [VerticalGradeElement(
                id="v0", start_station=0.0, end_station=self.HCL_LENGTH,
                start_elevation=17.6595, grade=0.0)])

    def test_tv_v07_z_from_profile(self):
        request = RoadGeometryRequest(
            alignment_id="HCL", station=32.1547,
            alignment=self._alignment(), vertical_profile=self._profile())
        result = road_geometry_api.evaluate(request)
        assert result.z == pytest.approx(17.6595)
        assert result.trace["elevation_source"] == "vertical_profile"

    def test_explicit_elevation_wins(self):
        request = RoadGeometryRequest(
            alignment_id="HCL", station=32.1547, center_elevation=99.0,
            alignment=self._alignment(), vertical_profile=self._profile())
        result = road_geometry_api.evaluate(request)
        assert result.z == pytest.approx(99.0)
        assert result.trace["elevation_source"] == "explicit_input"

    def test_out_of_profile_range_rejected(self):
        request = RoadGeometryRequest(
            alignment_id="HCL", station=300.0,
            alignment=self._alignment(), vertical_profile=self._profile())
        with pytest.raises(RoadGeometryError):
            road_geometry_api.evaluate(request)

    def test_z_flows_to_edges(self):
        from backend.rule_engine.crosssection.model import CrossSectionSegment
        request = RoadGeometryRequest(
            alignment_id="HCL", station=50.0,
            alignment=self._alignment(), vertical_profile=self._profile(),
            left_segments=[CrossSectionSegment(segment_id="L0", side="LEFT", width=3.0)],
            right_segments=[CrossSectionSegment(segment_id="R0", side="RIGHT", width=3.0)],
        )
        result = road_geometry_api.evaluate(request)
        assert result.z == pytest.approx(17.6595)
        assert result.left_edge_xyz.z == pytest.approx(17.6595)
        assert result.right_edge_xyz.z == pytest.approx(17.6595)
