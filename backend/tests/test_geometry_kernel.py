# -*- coding: utf-8 -*-
"""Tests for Geometry Kernel contracts and adapter."""
import math, pytest
from backend.rule_engine.geometry import (
    Point2D, Vector2D, normalize_angle, azimuth_from_direction, signed_curvature,
)


class TestPoint2D:
    def test_distance(self):
        a = Point2D(0, 0)
        b = Point2D(3, 4)
        assert abs(a.distance_to(b) - 5.0) < 1e-12

    def test_zero_distance(self):
        a = Point2D(1, 2)
        b = Point2D(1, 2)
        assert a.distance_to(b) == 0.0


class TestVector2D:
    def test_dot(self):
        v = Vector2D(1, 0)
        assert v.dot(Vector2D(0, 1)) == 0.0

    def test_length(self):
        v = Vector2D(3, 4)
        assert abs(v.length() - 5.0) < 1e-12

    def test_normalized(self):
        v = Vector2D(0, 5)
        n = v.normalized()
        assert abs(n.length() - 1.0) < 1e-12
        assert abs(n.y - 1.0) < 1e-12

    def test_zero_normalized(self):
        v = Vector2D(0, 0)
        n = v.normalized()
        assert n.x == 0.0
        assert n.y == 0.0


class TestAngle:
    def test_normalize_angle(self):
        assert normalize_angle(0) == 0.0
        assert normalize_angle(2 * math.pi) == 0.0
        assert abs(normalize_angle(-math.pi / 2) - (3 * math.pi / 2)) < 1e-12

    def test_azimuth(self):
        a = azimuth_from_direction(1, 0)
        assert abs(a) < 1e-12  # +X
        a = azimuth_from_direction(0, 1)
        assert abs(a - math.pi / 2) < 1e-12  # +Y

    def test_signed_curvature(self):
        assert signed_curvature("left", 100) == 0.01
        assert signed_curvature("right", 100) == -0.01
        assert signed_curvature("left", 0) == 0.0


class TestConventions:
    def test_left_positive_curvature(self):
        """Verify left-turn convention: curvature positive = left."""
        c = signed_curvature("left", 100)
        assert c > 0

    def test_right_negative_curvature(self):
        """Verify right-turn convention: curvature negative = right."""
        c = signed_curvature("right", 100)
        assert c < 0

    def test_azimuth_range(self):
        for deg in [0, 90, 180, 270, 360]:
            rad = math.radians(deg)
            n = normalize_angle(rad)
            assert 0 <= n < 2 * math.pi