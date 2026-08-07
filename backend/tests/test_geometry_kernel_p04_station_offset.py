# -*- coding: utf-8 -*-
"""Focused tests for the Phase X4-A P04 station/offset module.

Covers backend.rule_engine.geometry.station_offset (stationAtPoint / offset
projection / alignment evaluation), mirroring frontend/src/liner/core/
{stationAtPoint.ts, geometry/horizontal.ts, station/stationRules.ts}.
"""
import math
import pytest
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import (
    StraightElement, CircularArcElement, ElementEvaluation,
)
from backend.rule_engine.geometry.clothoid import ClothoidElement
from backend.rule_engine.geometry.station_offset import (
    LinearAlignment, StationDefinition, StationProjection,
    displayed_station_at_physical_distance, element_length,
    evaluate_alignment_at_distance, evaluate_element_at_distance,
    station_at_point, total_alignment_length,
)


def _straight_alignment(length=100.0):
    return LinearAlignment(elements=[
        StraightElement(id="s", start=Vec2D(0, 0), azimuth=0, length=length),
    ])


class TestAlignmentLength:
    def test_total_alignment_length(self):
        alignment = LinearAlignment(elements=[
            StraightElement(id="s", start=Vec2D(0, 0), azimuth=0, length=40),
            CircularArcElement(id="a", start=Vec2D(40, 0), azimuth=0, radius=100, turn="left", length=60),
        ])
        assert abs(total_alignment_length(alignment) - 100.0) < 1e-12

    def test_element_length(self):
        element = StraightElement(id="s", start=Vec2D(0, 0), azimuth=0, length=50)
        assert element_length(element) == 50.0


class TestElementEvaluation:
    def test_dispatch_straight(self):
        alignment = _straight_alignment()
        result = evaluate_element_at_distance(alignment.elements[0], 30)
        assert result.point.x == 30.0

    def test_dispatch_arc(self):
        element = CircularArcElement(id="a", start=Vec2D(0, 0), azimuth=0, radius=100, turn="left", length=50)
        result = evaluate_element_at_distance(element, 50)
        assert abs(result.point.y - 100 * (1 - math.cos(0.5))) < 1e-9


class TestEvaluateAlignmentAtDistance:
    def test_within_first_element(self):
        alignment = _straight_alignment()
        result = evaluate_alignment_at_distance(alignment, 30)
        assert result.point.x == 30.0
        assert result.physicalDistance == 30.0

    def test_beyond_end_clamps(self):
        alignment = _straight_alignment(length=100)
        result = evaluate_alignment_at_distance(alignment, 500)
        assert result.physicalDistance == 100.0
        assert result.point.x == 100.0

    def test_empty_alignment(self):
        result = evaluate_alignment_at_distance(LinearAlignment(), 10)
        assert result.point.x == 0.0
        assert result.physicalDistance == 0.0


class TestDisplayedStation:
    def test_origin_offset(self):
        definition = StationDefinition(originDisplayedStation=1000)
        assert abs(displayed_station_at_physical_distance(50, definition) - 1050.0) < 1e-9


class TestStationAtPoint:
    def test_projection_onto_straight(self):
        alignment = _straight_alignment()
        projection = station_at_point(Vec2D(30, 5), alignment)
        assert isinstance(projection, StationProjection)
        assert abs(projection.physicalDistance - 30.0) < 1e-9
        assert abs(projection.offset - 5.0) < 1e-9
        assert projection.elementId == "s"

    def test_negative_station_clamps_to_start(self):
        alignment = _straight_alignment()
        projection = station_at_point(Vec2D(-10, 0), alignment)
        assert abs(projection.physicalDistance - 0.0) < 1e-9

    def test_beyond_end_clamps_to_length(self):
        alignment = _straight_alignment()
        projection = station_at_point(Vec2D(500, 0), alignment)
        assert abs(projection.physicalDistance - 100.0) < 1e-9

    def test_empty_alignment_returns_none(self):
        assert station_at_point(Vec2D(0, 0), LinearAlignment()) is None

    def test_offset_sign_uses_local_normal(self):
        alignment = _straight_alignment()
        # +Y offset (left of azimuth 0) => positive offset
        projection = station_at_point(Vec2D(50, 5), alignment)
        assert projection.offset > 0