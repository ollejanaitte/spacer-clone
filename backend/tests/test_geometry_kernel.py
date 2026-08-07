# -*- coding: utf-8 -*-
"""Tests for Geometry Kernel contracts and adapter."""
import math, pytest
from backend.rule_engine.geometry import (
    Point2D, Vector2D, normalize_angle, azimuth_from_direction, signed_curvature,
    evaluate_straight_element, evaluate_circular_arc_element, signed_arc_curvature,
    clothoid_curvature_at, evaluate_clothoid_element,
    station_at_point, evaluate_alignment_at_distance, total_alignment_length,
)
from backend.rule_engine.geometry.line_arc import StraightElement, CircularArcElement
from backend.rule_engine.geometry.clothoid import ClothoidElement
from backend.rule_engine.geometry.station_offset import (
    LinearAlignment, StationProjection,
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


class TestStraightEvaluation:
    def test_end_point_matches_azimuth(self):
        element = StraightElement(
            id="S1", start=Point2D(10, 20), azimuth=math.pi / 4, length=100,
        )
        result = evaluate_straight_element(element, 100)
        assert abs(result.point.x - (10 + math.cos(math.pi / 4) * 100)) < 1e-9
        assert abs(result.point.y - (20 + math.sin(math.pi / 4) * 100)) < 1e-9
        assert abs(result.azimuth - math.pi / 4) < 1e-12
        assert result.curvature == 0.0

    def test_clamps_beyond_length(self):
        element = StraightElement(id="s", start=Point2D(0, 0), azimuth=0, length=50)
        result = evaluate_straight_element(element, 999)
        assert result.point.x == 50.0
        assert result.localDistance == 50.0


class TestCircularArcEvaluation:
    def test_left_arc_end_point(self):
        element = CircularArcElement(
            id="a", start=Point2D(0, 0), azimuth=0, radius=100,
            turn="left", length=50,
        )
        result = evaluate_circular_arc_element(element, 50)
        delta = 50 / 100
        assert result.azimuth == delta
        assert abs(result.point.x - 100 * math.sin(delta)) < 1e-9
        assert abs(result.point.y - 100 * (1 - math.cos(delta))) < 1e-9

    def test_signed_arc_curvature(self):
        left = CircularArcElement(id="l", start=Point2D(0, 0), azimuth=0, radius=100, turn="left", length=10)
        right = CircularArcElement(id="r", start=Point2D(0, 0), azimuth=0, radius=100, turn="right", length=10)
        assert signed_arc_curvature(left) == 0.01
        assert signed_arc_curvature(right) == -0.01


class TestClothoidEvaluation:
    def test_curvature_at_length_uses_end_radius(self):
        element = ClothoidElement(
            id="c", start=Point2D(0, 0), azimuth=0, clothoidParameter=100,
            startRadius=None, endRadius=50, turn="left", length=50,
        )
        assert abs(clothoid_curvature_at(element, element.length) - 0.02) < 1e-12

    def test_arc_length_integration_is_roughly_consistent(self):
        element = ClothoidElement(
            id="c", start=Point2D(0, 0), azimuth=0, clothoidParameter=200,
            startRadius=None, endRadius=100, turn="left", length=100,
        )
        result = evaluate_clothoid_element(element, 20)
        # chord length must not exceed arc length
        assert result.point.length() <= 20.0 + 1e-9


class TestStationAtPoint:
    def _straight_alignment(self):
        return LinearAlignment(elements=[StraightElement(id="s", start=Point2D(0, 0), azimuth=0, length=100)])

    def test_projection_onto_straight(self):
        from backend.rule_engine.geometry.station_offset import station_at_point
        alignment = self._straight_alignment()
        projection = station_at_point(Point2D(30, 5), alignment)
        assert isinstance(projection, StationProjection)
        assert abs(projection.physicalDistance - 30.0) < 1e-9
        assert abs(projection.offset - 5.0) < 1e-9
        assert projection.elementId == "s"

    def test_negative_station_clamps_to_start(self):
        from backend.rule_engine.geometry.station_offset import station_at_point
        alignment = self._straight_alignment()
        projection = station_at_point(Point2D(-10, 0), alignment)
        assert abs(projection.physicalDistance - 0.0) < 1e-9

    def test_alignment_total_length(self):
        alignment = LinearAlignment(elements=[
            StraightElement(id="s", start=Point2D(0, 0), azimuth=0, length=40),
            CircularArcElement(id="a", start=Point2D(40, 0), azimuth=0, radius=100, turn="left", length=60),
        ])
        assert abs(total_alignment_length(alignment) - 100.0) < 1e-12