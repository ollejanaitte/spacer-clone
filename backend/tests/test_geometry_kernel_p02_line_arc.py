# -*- coding: utf-8 -*-
"""Focused tests for the Phase X4-A P02 line/arc module split.

This covers backend.rule_engine.geometry.contracts (core vector contracts)
and backend.rule_engine.geometry.line_arc (straight & circular arc eval),
which are introduced by this step. Clothoid and station/offset modules are
covered by their own later steps.
"""
import math
import pytest
from backend.rule_engine.geometry.contracts import (
    Vec2D, Vec3, LocalFrame, distance2, dot2, normalize2,
    normalize_angle, azimuth_from_direction, signed_curvature,
)
from backend.rule_engine.geometry.line_arc import (
    StraightElement, CircularArcElement, ElementEvaluation,
    evaluate_straight_element, evaluate_circular_arc_element, signed_arc_curvature,
)


class TestContracts:
    def test_distance2(self):
        assert abs(distance2(Vec2D(0, 0), Vec2D(3, 4)) - 5.0) < 1e-12

    def test_dot2(self):
        assert dot2(Vec2D(1, 0), Vec2D(0, 1)) == 0.0

    def test_normalize2_zero(self):
        n = normalize2(Vec2D(0, 0))
        assert n.x == 0.0 and n.y == 0.0

    def test_normalize_angle_wraps(self):
        assert normalize_angle(2 * math.pi) == 0.0
        assert abs(normalize_angle(-math.pi / 2) - (3 * math.pi / 2)) < 1e-12

    def test_azimuth(self):
        assert abs(azimuth_from_direction(1, 0)) < 1e-12
        assert abs(azimuth_from_direction(0, 1) - math.pi / 2) < 1e-12

    def test_signed_curvature(self):
        assert signed_curvature("left", 100) == 0.01
        assert signed_curvature("right", 100) == -0.01


class TestStraight:
    def test_end_point_matches_azimuth(self):
        element = StraightElement(
            id="S1", start=Vec2D(10, 20), azimuth=math.pi / 4, length=100,
        )
        result = evaluate_straight_element(element, 100)
        assert abs(result.point.x - (10 + math.cos(math.pi / 4) * 100)) < 1e-9
        assert abs(result.point.y - (20 + math.sin(math.pi / 4) * 100)) < 1e-9
        assert abs(result.azimuth - math.pi / 4) < 1e-12
        assert result.curvature == 0.0
        assert isinstance(result, ElementEvaluation)

    def test_clamp_beyond_length(self):
        element = StraightElement(id="s", start=Vec2D(0, 0), azimuth=0, length=50)
        result = evaluate_straight_element(element, 999)
        assert result.point.x == 50.0
        assert result.localDistance == 50.0


class TestCircularArc:
    def test_left_arc_end_point(self):
        element = CircularArcElement(
            id="a", start=Vec2D(0, 0), azimuth=0, radius=100,
            turn="left", length=50,
        )
        result = evaluate_circular_arc_element(element, 50)
        delta = 50 / 100
        assert result.azimuth == delta
        assert abs(result.point.x - 100 * math.sin(delta)) < 1e-9
        assert abs(result.point.y - 100 * (1 - math.cos(delta))) < 1e-9

    def test_signed_arc_curvature(self):
        left = CircularArcElement(id="l", start=Vec2D(0, 0), azimuth=0, radius=100, turn="left", length=10)
        right = CircularArcElement(id="r", start=Vec2D(0, 0), azimuth=0, radius=100, turn="right", length=10)
        assert signed_arc_curvature(left) == 0.01
        assert signed_arc_curvature(right) == -0.01