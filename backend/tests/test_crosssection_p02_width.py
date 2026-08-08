# -*- coding: utf-8 -*-
"""Focused tests for X4-C-P2: width and crossfall evaluation."""
import math
import pytest

from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput, SegmentType,
)
from backend.rule_engine.crosssection.width import (
    WidthChangePoint, WidthError,
    evaluate_width_at_distance, evaluate_request_width,
    resolve_level_width, segment_total_width_left, segment_total_width_right,
    total_width_from_request,
)
from backend.rule_engine.crosssection.crossfall import (
    CrossfallMode, ResolvedCrossfallState, crossfall_delta_z,
    resolve_crossfall_input, OFFSET_TOLERANCE,
)


def _left(width=3.0, crossfall=2.0):
    return CrossSectionSegment(
        segment_id="L0", side="LEFT", segment_type=SegmentType.LANE,
        width=width, crossfall=crossfall, start_offset=-width, end_offset=0.0)


def _right(width=4.0, crossfall=2.0):
    return CrossSectionSegment(
        segment_id="R0", side="RIGHT", segment_type=SegmentType.LANE,
        width=width, crossfall=crossfall, start_offset=0.0, end_offset=width)


def _req(left=3.0, right=4.0, slope=2.0):
    return CrossSectionRequest(
        alignment_id="A", station=50.0, center_elevation=10.0,
        left_segments=[_left(left, slope)], right_segments=[_right(right, slope)],
    )


class TestWidthEvaluation:
    def test_symmetric_width(self):
        req = _req(left=3.0, right=3.0)
        extents = evaluate_request_width(req)
        assert extents.left_half_width == pytest.approx(3.0)
        assert extents.right_half_width == pytest.approx(3.0)
        assert extents.source == "explicit"

    def test_asymmetric_width(self):
        req = _req(left=2.0, right=5.0)
        extents = evaluate_request_width(req)
        assert extents.left_half_width == pytest.approx(2.0)
        assert extents.right_half_width == pytest.approx(5.0)

    def test_multi_segment_total(self):
        req = CrossSectionRequest(
            alignment_id="A", station=0.0, center_elevation=1.0,
            left_segments=[_left(2.0), _left(1.0)],
            right_segments=[_right(3.0), _right(1.0)],
        )
        assert segment_total_width_left(req.left_segments) == pytest.approx(3.0)
        assert segment_total_width_right(req.right_segments) == pytest.approx(4.0)
        assert total_width_from_request(req) == pytest.approx(7.0)

    def test_zero_width_allowed(self):
        assert evaluate_request_width(_req(left=0.0, right=0.0)).left_half_width == 0.0

    def test_negative_width_rejected(self):
        req = _req(left=-1.0)
        with pytest.raises(WidthError):
            evaluate_request_width(req)

    def test_width_change_hold(self):
        base = evaluate_request_width(_req(left=3.0, right=4.0))
        points = [
            {"physical_distance": 10.0, "left_offset": 5.0, "right_offset": 6.0, "id": "p1"},
            {"physical_distance": 40.0, "left_offset": 7.0, "right_offset": 8.0, "id": "p2"},
        ]
        points = [WidthChangePoint(**p) for p in points]
        at_20 = evaluate_width_at_distance(base, points, 20.0)
        assert at_20.left_half_width == pytest.approx(5.0)
        at_45 = evaluate_width_at_distance(base, points, 45.0)
        assert at_45.left_half_width == pytest.approx(7.0)
        # before first change point -> base
        at_5 = evaluate_width_at_distance(base, points, 5.0)
        assert at_5.left_half_width == pytest.approx(3.0)

    def test_negative_change_offset_rejected(self):
        base = evaluate_request_width(_req(3.0, 4.0))
        bad = [WidthChangePoint(0.0, -1.0, 2.0, "bad")]
        with pytest.raises(WidthError):
            evaluate_width_at_distance(base, bad, 10.0)


class TestCrossfallEvaluation:
    def test_flat_section_zero(self):
        state = resolve_crossfall_input(CrossfallInput())
        assert state.mode == CrossfallMode.FLAT
        assert crossfall_delta_z(state, 3.0) == 0.0

    def test_one_way_right_slope(self):
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=2.0, right_slope_percent=2.0))
        # right side (+offset): z drops as slope is positive
        assert crossfall_delta_z(state, 4.0) == pytest.approx(-(2.0 / 100.0) * 4.0)
        assert state.mode == CrossfallMode.ONE_WAY_RIGHT

    def test_opposite_left_right_slope(self):
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=-3.0, right_slope_percent=3.0))
        assert state.mode == CrossfallMode.INDEPENDENT
        assert crossfall_delta_z(state, -4.0) == pytest.approx(-(-3.0 / 100.0) * -4.0)
        assert crossfall_delta_z(state, 4.0) == pytest.approx(-(3.0 / 100.0) * 4.0)

    def test_pivot_offset_shifts_zero(self):
        # pivot at +2 => dz=0 at offset=2
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=2.0, right_slope_percent=2.0, pivot_offset=2.0))
        assert crossfall_delta_z(state, 2.0) == 0.0
        assert crossfall_delta_z(state, 6.0) == pytest.approx(-(2.0 / 100.0) * 4.0)

    def test_very_small_slope(self):
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=1e-9, right_slope_percent=1e-9))
        delta = crossfall_delta_z(state, 10.0)
        assert delta == pytest.approx(-(1e-9 / 100.0) * 10.0, rel=1e-6)

    def test_large_slope_validation(self):
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=999.0, right_slope_percent=999.0))
        delta = crossfall_delta_z(state, 4.0)
        assert delta == pytest.approx(-(999.0 / 100.0) * 4.0)

    def test_nan_offset_rejected(self):
        state = resolve_crossfall_input(CrossfallInput())
        with pytest.raises(Exception):
            crossfall_delta_z(state, math.nan)

    def test_nan_slope_rejected(self):
        with pytest.raises(Exception):
            resolve_crossfall_input(CrossfallInput(
                left_slope_percent=1.0, right_slope_percent=math.nan))

    def test_deterministic_repeat(self):
        state = resolve_crossfall_input(CrossfallInput(
            left_slope_percent=2.5, right_slope_percent=2.5))
        first = crossfall_delta_z(state, 6.0)
        second = crossfall_delta_z(state, 6.0)
        assert first == second