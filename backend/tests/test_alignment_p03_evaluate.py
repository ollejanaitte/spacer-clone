# -*- coding: utf-8 -*-
"""Focused tests for X4-B-P03: alignment evaluation."""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement, CircularArcElement
from backend.rule_engine.geometry.clothoid import ClothoidElement

from backend.rule_engine.alignment.model import build_alignment
from backend.rule_engine.alignment.evaluate import evaluate_alignment, AlignmentEvaluation
from backend.rule_engine.alignment.station import AlignmentRangeError


def _straight_only():
    return build_alignment(
        "A",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=100)],
    )


def _arc_mix():
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30),
            CircularArcElement(id="a1", start=Vec2D(30, 0), azimuth=0.0,
                               radius=100.0, turn="left", length=50),
        ],
        origin_station=1000.0,
    )


def _clothoid_mix():
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=10),
            ClothoidElement(id="c1", start=Vec2D(10, 0), azimuth=0.0, length=40,
                            clothoidParameter=40.0, startRadius=None, endRadius=40.0,
                            turn="left"),
        ],
    )


class TestEvaluate:
    def test_returns_evaluation_type(self):
        result = evaluate_alignment(_straight_only(), 50.0)
        assert isinstance(result, AlignmentEvaluation)

    def test_straight_point(self):
        result = evaluate_alignment(_straight_only(), 50.0)
        assert abs(result.point.x - 50.0) < 1e-9
        assert abs(result.point.y - 0.0) < 1e-9

    def test_straight_azimuth_curvature(self):
        result = evaluate_alignment(_straight_only(), 50.0)
        assert abs(result.azimuth - 0.0) < 1e-9
        assert abs(result.curvature - 0.0) < 1e-9

    def test_straight_at_start(self):
        result = evaluate_alignment(_straight_only(), 0.0)
        assert result.point.x == 0.0
        assert result.is_boundary is True

    def test_arc_station_uses_absolute(self):
        # station 35 -> local 5 into the arc (start at abs 30)
        result = evaluate_alignment(_arc_mix(), 1000.0 + 35.0)
        assert result.element_id == "a1"
        assert abs(result.local_station - 5.0) < 1e-9

    def test_arc_curvature_positive_left(self):
        result = evaluate_alignment(_arc_mix(), 1000.0 + 35.0)
        assert abs(result.curvature - 0.01) < 1e-9

    def test_arc_bearing_increases(self):
        r0 = evaluate_alignment(_arc_mix(), 1000.0 + 31.0)
        r1 = evaluate_alignment(_arc_mix(), 1000.0 + 40.0)
        # left turn => bearing increases
        assert r1.azimuth > r0.azimuth

    def test_bearing_degrees_conversion(self):
        # arc of radius 100, length 50 sweeps 0.5 rad. local ~0 => 0 rad
        result = evaluate_alignment(_arc_mix(), 1000.0 + 30.0, bearing_units="degree")
        assert abs(result.azimuth - 0.0) < 1e-6

    def test_clothoid_curvature_nonzero(self):
        result = evaluate_alignment(_clothoid_mix(), 20.0)
        assert result.element_type == "clothoid"
        assert result.curvature != 0.0

    def test_out_of_range_rejected(self):
        with pytest.raises(AlignmentRangeError):
            evaluate_alignment(_straight_only(), 500.0)
        with pytest.raises(AlignmentRangeError):
            evaluate_alignment(_straight_only(), -5.0)