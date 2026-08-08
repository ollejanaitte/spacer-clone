# -*- coding: utf-8 -*-
"""Focused tests for X4-C-P3: local section geometry."""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput, SegmentType,
)
from backend.rule_engine.crosssection.geometry import (
    SectionGeometryError, StationPose, generate_local_section,
    local_normal, pose_at,
)


def _alignment():
    return build_alignment(
        "A",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=200.0)],
        origin_station=0.0,
    )


def _segment(side, width, crossfall, sid):
    return CrossSectionSegment(
        segment_id=sid, side=side, segment_type=SegmentType.LANE,
        width=width, crossfall=crossfall, start_offset=0.0, end_offset=width)


def _request(left_width=3.0, right_width=3.0, slope=2.0, center_elevation=10.0):
    return CrossSectionRequest(
        alignment_id="A", station=50.0, center_elevation=center_elevation,
        left_segments=[_segment("LEFT", left_width, slope, "L0")],
        right_segments=[_segment("RIGHT", right_width, slope, "R0")],
        crossfall=CrossfallInput(
            left_slope_percent=slope, right_slope_percent=slope),
    )


class TestStationPose:
    def test_pose_straight(self):
        pose = pose_at(_alignment(), 50.0)
        assert isinstance(pose, StationPose)
        assert pose.center_xy.x == pytest.approx(50.0)
        assert pose.center_xy.y == pytest.approx(0.0)
        assert pose.azimuth == 0.0

    def test_pose_element_id(self):
        pose = pose_at(_alignment(), 50.0)
        assert pose.element_id == "s0"

    def test_normal_straight(self):
        normal = local_normal(0.0)
        assert normal.x == pytest.approx(0.0)
        assert normal.y == pytest.approx(1.0)


class TestGenerateLocalSection:
    def test_flat_section(self):
        result = generate_local_section(_alignment(), _request(slope=0.0))
        assert result.station == 50.0
        assert result.alignment_element_id == "s0"
        center = next(p for p in result.section_points if p.point_id == "center")
        assert center.elevation == pytest.approx(10.0)

    def test_symmetric_crowned(self):
        # true crown: high at center, both edges lower; left=-2 / right=+2
        req = _request(slope=0.0)
        req.crossfall = CrossfallInput(left_slope_percent=-2.0, right_slope_percent=2.0)
        result = generate_local_section(_alignment(), req)
        center = next(p for p in result.section_points if p.point_id == "center")
        assert center.elevation == pytest.approx(10.0)
        left = next(p for p in result.section_points if p.point_id == "L0")
        right = next(p for p in result.section_points if p.point_id == "R0")
        # crown: both edges lower than center (toward the outside)
        assert left.elevation < center.elevation
        assert right.elevation < center.elevation
        # symmetric
        assert left.elevation == pytest.approx(right.elevation, abs=1e-9)

    def test_one_way_crossfall(self):
        # crown with left up / right down (independent)
        req = _request(slope=0.0)
        req.crossfall = CrossfallInput(left_slope_percent=-3.0, right_slope_percent=3.0)
        result = generate_local_section(_alignment(), req)
        left = next(p for p in result.section_points if p.point_id == "L0")
        right = next(p for p in result.section_points if p.point_id == "R0")
        # left slope -3 -> at negative offset, dz = -(-3/100)*(-3) = -0.09
        assert left.elevation == pytest.approx(10.0 - 0.09, abs=1e-9)
        # right slope +3 -> at +3 offset, dz = -(3/100)*3 = -0.09
        assert right.elevation == pytest.approx(10.0 - 0.09, abs=1e-9)

    def test_asymmetric_widths(self):
        req = _request(left_width=2.0, right_width=5.0, slope=0.0)
        result = generate_local_section(_alignment(), req)
        assert result.total_left_width == pytest.approx(2.0)
        assert result.total_right_width == pytest.approx(5.0)
        assert result.left_edge_offset == pytest.approx(-2.0)
        assert result.right_edge_offset == pytest.approx(5.0)

    def test_multiple_segments(self):
        req = CrossSectionRequest(
            alignment_id="A", station=10.0, center_elevation=5.0,
            left_segments=[_segment("LEFT", 1.0, 2.0, "L0"),
                           _segment("LEFT", 2.0, 2.0, "L1")],
            right_segments=[_segment("RIGHT", 1.5, 2.0, "R0"),
                            _segment("RIGHT", 1.5, 2.0, "R1")],
            crossfall=CrossfallInput(left_slope_percent=2.0, right_slope_percent=2.0),
        )
        result = generate_local_section(_alignment(), req)
        assert result.total_left_width == pytest.approx(3.0)
        assert result.total_right_width == pytest.approx(3.0)
        offsets = {p.point_id: p.offset for p in result.section_points}
        assert offsets["L1"] == pytest.approx(-3.0)
        assert offsets["R1"] == pytest.approx(3.0)

    def test_left_right_sign(self):
        req = _request(slope=0.0)
        result = generate_local_section(_alignment(), req)
        left = next(p for p in result.section_points if p.side == "LEFT")
        right = next(p for p in result.section_points if p.side == "RIGHT")
        assert left.offset < 0
        assert right.offset > 0

    def test_pivot_behavior(self):
        # pivot at +2.0 -> dz=0 at offset=2 (the right edge, R0 exactly at +2)
        req = _request(right_width=2.0, slope=0.0)
        req.crossfall = CrossfallInput(
            left_slope_percent=2.0, right_slope_percent=2.0, pivot_offset=2.0)
        result = generate_local_section(_alignment(), req)
        right = next(p for p in result.section_points if p.point_id == "R0")
        assert right.offset == pytest.approx(2.0)
        assert right.elevation == pytest.approx(10.0, abs=1e-9)

    def test_center_point_included(self):
        result = generate_local_section(_alignment(), _request())
        ids = {p.point_id for p in result.section_points}
        assert "center" in ids

    def test_errors_reported_on_invalid(self):
        req = _request()
        req.left_segments[0].width = -1.0
        with pytest.raises(SectionGeometryError):
            generate_local_section(_alignment(), req)

    def test_xyz_none_in_local(self):
        result = generate_local_section(_alignment(), _request())
        assert all(p.xyz is None for p in result.section_points)

    def test_deterministic(self):
        a = _alignment()
        r1 = generate_local_section(a, _request())
        r2 = generate_local_section(a, _request())
        assert [(p.point_id, p.offset, p.elevation) for p in r1.section_points] == \
               [(p.point_id, p.offset, p.elevation) for p in r2.section_points]