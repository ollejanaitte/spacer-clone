# -*- coding: utf-8 -*-
"""X4-C-P6 focused Cross Section pipeline verification.

Locks the full P01-P05 pipeline behavior across representative section shapes.
Values are hand-inspected invariants (independent oracle), not self-generated.
"""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.crosssection.global_xyz import generate_global_section
from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput,
    PivotDefinition, PivotType, SegmentType,
)


def _alignment(length=200.0):
    return build_alignment(
        "A",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=length)],
        origin_station=0.0,
    )


def _seg(side, width, sid, kind=SegmentType.LANE):
    return CrossSectionSegment(
        segment_id=sid, side=side, segment_type=kind,
        width=width, crossfall=0.0, start_offset=0.0, end_offset=width)


def _request(station=50.0, **kwargs):
    defaults = {
        "alignment_id": "A", "station": station, "center_elevation": 10.0,
        "left_segments": [_seg("LEFT", 3.0, "L0")],
        "right_segments": [_seg("RIGHT", 3.0, "R0")],
        "crossfall": CrossfallInput(),
    }
    defaults.update(kwargs)
    return CrossSectionRequest(**defaults)


class TestFocusedShapes:
    def test_flat(self):
        result = generate_global_section(_alignment(), _request())
        assert result.total_left_width == 3.0
        assert result.total_right_width == 3.0
        for p in result.section_points:
            assert p.elevation == pytest.approx(10.0)

    def test_symmetric(self):
        r = generate_global_section(_alignment(), _request(left_segments=[_seg("LEFT", 4.0, "L0")],
                                                right_segments=[_seg("RIGHT", 4.0, "R0")]))
        assert r.left_edge_offset == -4.0
        assert r.right_edge_offset == 4.0

    def test_asymmetric_width(self):
        r = generate_global_section(_alignment(), _request(left_segments=[_seg("LEFT", 2.0, "L0")],
                                                     right_segments=[_seg("RIGHT", 5.0, "R0")]))
        assert r.total_left_width == 2.0
        assert r.total_right_width == 5.0
        assert r.left_edge_offset == -2.0
        assert r.right_edge_offset == 5.0

    def test_opposite_crossfalls(self):
        cf = CrossfallInput(left_slope_percent=-2.0, right_slope_percent=3.0)
        r = generate_global_section(_alignment(), _request(crossfall=cf))
        left = next(p for p in r.section_points if p.point_id == "L0")
        right = next(p for p in r.section_points if p.point_id == "R0")
        # canonical dz = -(slope%/100)*(offset-pivot); left src=-2%, offset=-3 -> dz = -(-.02)*(-3) = -0.06
        assert left.elevation == pytest.approx(10.0 - 0.06)
        # right slope +3% -> dz = -(0.03)*(+3) = -0.09
        assert right.elevation == pytest.approx(10.0 - 0.09)

    def test_multiple_segments(self):
        r = generate_global_section(_alignment(), _request(
            left_segments=[_seg("LEFT", 1.5, "a"), _seg("LEFT", 1.5, "b")],
            right_segments=[_seg("RIGHT", 1.0, "c")]))
        ids = [p.point_id for p in r.section_points]
        assert "a" in ids and "c" in ids
        assert r.total_left_width == 3.0

    def test_pivot_custom_offset(self):
        cf = CrossfallInput(left_slope_percent=2.0, right_slope_percent=2.0,
                            pivot_offset=1.0)
        r = generate_global_section(_alignment(), _request(crossfall=cf))
        center = next(p for p in r.section_points if p.point_id == "center")
        assert center.elevation == pytest.approx(10.0 + 0.02 * 1.0)

    def test_invalid_input_rejected(self):
        with pytest.raises(Exception):
            generate_global_section(_alignment(), _request(station=float("nan")))

    def test_station_out_of_range(self):
        with pytest.raises(Exception):
            generate_global_section(_alignment(length=100.0), _request(station=150.0))

    def test_deterministic(self):
        a = generate_global_section(_alignment(), _request())
        b = generate_global_section(_alignment(), _request())
        assert a.section_points == b.section_points
        assert a.trace == b.trace


class TestEdges:
    def test_left_right_edge_xyz(self):
        r = generate_global_section(_alignment(), _request())
        pts = {p.point_id: p.xyz for p in r.section_points}
        assert pts["L0"].y == pytest.approx(-3.0)
        assert pts["R0"].y == pytest.approx(3.0)
        assert pts["L0"].z == pytest.approx(10.0)


class TestGlobalXyzRoundTrip:
    def test_center_global(self):
        r = generate_global_section(_alignment(), _request(center_elevation=12.0))
        assert r.center_point_xyz.x == pytest.approx(50.0)
        assert r.center_point_xyz.y == pytest.approx(0.0)
        assert r.center_point_xyz.z == pytest.approx(12.0)


__all__ = []