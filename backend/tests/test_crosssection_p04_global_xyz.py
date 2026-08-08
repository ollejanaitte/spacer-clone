# -*- coding: utf-8 -*-
"""Focused tests for X4-C-P4: global XYZ and elevation adapter."""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D, Vec3
from backend.rule_engine.geometry.line_arc import StraightElement

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput, SegmentType,
)
from backend.rule_engine.crosssection.global_xyz import (
    GlobalXyzError, center_point_global, elevation_contract_status,
    generate_global_section, point_global,
)


def _alignment():
    return build_alignment(
        "A",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=200.0)],
        origin_station=0.0,
    )


def _segment(side, width, sid):
    return CrossSectionSegment(
        segment_id=sid, side=side, segment_type=SegmentType.LANE,
        width=width, crossfall=0.0, start_offset=0.0, end_offset=width)


def _request(left=3.0, right=3.0, center_elevation=10.0):
    return CrossSectionRequest(
        alignment_id="A", station=50.0, center_elevation=center_elevation,
        left_segments=[_segment("LEFT", left, "L0")],
        right_segments=[_segment("RIGHT", right, "R0")],
        crossfall=CrossfallInput(),
    )


class TestPointGlobal:
    def test_normal_axis(self):
        # azimuth 0 (straight +X): normal +Y; offset +m -> y increases
        p = point_global(Vec2D(0, 0), azimuth=0.0, offset=3.0, local_z=8.0)
        assert p.x == pytest.approx(0.0)
        assert p.y == pytest.approx(3.0)
        assert p.z == pytest.approx(8.0)

    def test_left_negative_offset(self):
        p = point_global(Vec2D(10, 20), azimuth=0.0, offset=-2.0, local_z=7.0)
        assert p.x == pytest.approx(10.0)
        assert p.y == pytest.approx(-2.0 + 20.0)
        assert p.z == pytest.approx(7.0)

    def test_nontrivial_azimuth(self):
        # azimuth = pi/2 -> normal = (-sin, cos) = (-1, 0); offset +4 => -x
        p = point_global(Vec2D(0, 0), azimuth=math.pi / 2, offset=4.0, local_z=5.0)
        assert p.x == pytest.approx(-4.0)
        assert p.y == pytest.approx(0.0)


class TestGenerateGlobalSection:
    def test_center_xyz(self):
        result = generate_global_section(_alignment(), _request(center_elevation=12.0))
        assert result.center_point_xyz is not None
        assert result.center_point_xyz.x == pytest.approx(50.0)
        assert result.center_point_xyz.y == pytest.approx(0.0)
        assert result.center_point_xyz.z == pytest.approx(12.0)

    def test_section_point_xyz_filled(self):
        result = generate_global_section(_alignment(), _request())
        assert all(p.xyz is not None for p in result.section_points)
        left = next(p for p in result.section_points if p.point_id == "L0")
        assert left.xyz.x == pytest.approx(50.0)
        assert left.xyz.y == pytest.approx(-3.0)

    def test_flat_section_z(self):
        result = generate_global_section(_alignment(), _request(center_elevation=10.0))
        for p in result.section_points:
            assert p.xyz.z == pytest.approx(10.0)

    def test_z_with_crossfall(self):
        req = _request(center_elevation=10.0)
        req.crossfall = CrossfallInput(left_slope_percent=2.0, right_slope_percent=2.0)
        result = generate_global_section(_alignment(), req)
        right = next(p for p in result.section_points if p.point_id == "R0")
        assert right.xyz.z == pytest.approx(10.0 - (2.0 / 100.0) * 3.0)

    def test_round_trip_centerline(self):
        result = generate_global_section(_alignment(), _request())
        center = next(p for p in result.section_points if p.point_id == "center")
        assert center.xyz.x == pytest.approx(50.0)
        assert center.xyz.y == pytest.approx(0.0)

    def test_elevation_contract_status(self):
        status = elevation_contract_status()
        assert "EXPLICIT_INPUT" in status and "DEFERRED" in status

    def test_exact_element_boundary(self):
        # alias boundary at 200 -> last span end
        req = _request()
        req.station = 200.0
        result = generate_global_section(_alignment(), req)
        assert result.station == 200.0
        assert result.center_point_xyz.x == pytest.approx(200.0)

    def test_reject_missing_elevation(self):
        req = _request(center_elevation=math.nan)
        with pytest.raises(Exception):
            generate_global_section(_alignment(), req)

    def test_output_is_vec3(self):
        result = generate_global_section(_alignment(), _request())
        assert isinstance(result.center_point_xyz, Vec3)