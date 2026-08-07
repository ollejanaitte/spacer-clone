# -*- coding: utf-8 -*-
"""Focused tests for the Phase X4-A P03 clothoid module.

Covers backend.rule_engine.geometry.clothoid, mirroring
frontend/src/liner/core/geometry/clothoid.ts (Simpson integration).
"""
import math
import pytest
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.clothoid import (
    ClothoidElement, SIMPSON_INTERVALS,
    clothoid_curvature_at, evaluate_clothoid_element, is_phase0_clothoid_approximation,
)
from backend.rule_engine.geometry.line_arc import ElementEvaluation


class TestClothoidCurvature:
    def test_curvature_at_length_uses_end_radius(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=100,
            startRadius=None, endRadius=50, turn="left", length=50,
        )
        assert abs(clothoid_curvature_at(element, element.length) - 0.02) < 1e-12

    def test_curvature_at_start_uses_start_radius(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=100,
            startRadius=200, endRadius=50, turn="left", length=50,
        )
        assert abs(clothoid_curvature_at(element, 0) - 0.005) < 1e-12

    def test_right_turn_negative(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=100,
            startRadius=None, endRadius=50, turn="right", length=50,
        )
        assert clothoid_curvature_at(element, element.length) < 0


class TestClothoidEvaluation:
    def test_returns_element_evaluation(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=200,
            startRadius=None, endRadius=100, turn="left", length=100,
        )
        result = evaluate_clothoid_element(element, 20)
        assert isinstance(result, ElementEvaluation)
        assert result.elementId == "c"
        assert abs(result.localDistance - 20.0) < 1e-9

    def test_chord_length_within_arc_length(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=200,
            startRadius=None, endRadius=100, turn="left", length=100,
        )
        result = evaluate_clothoid_element(element, 20)
        assert result.point.length() <= 20.0 + 1e-9

    def test_constant_azimuth_yields_straight_advance(self):
        element = ClothoidElement(
            id="c", start=Vec2D(0, 0), azimuth=0, clothoidParameter=1e18,
            startRadius=1e18, endRadius=1e18, turn="left", length=50,
        )
        result = evaluate_clothoid_element(element, 50)
        # very large radius => near-zero curvature => advance along +X
        assert abs(result.point.x - 50.0) < 1e-3
        assert abs(result.point.y) < 1e-3

    def test_phase0_approximation_flag(self):
        assert is_phase0_clothoid_approximation() is True

    def test_simpson_intervals_valid(self):
        assert SIMPSON_INTERVALS >= 16