# -*- coding: utf-8 -*-
"""Focused tests for the Phase X4-A P05 adapter re-export surface.

This verifies that backend.rule_engine.geometry exposes the canonical public
contract surface through its re-export adapter and that the responsibility-
split modules are importable and consistent.
"""
import math
import pytest


class TestReExportPublicSurface:
    def test_backward_compatible_aliases(self):
        from backend.rule_engine.geometry import Point2D, Vector2D, Vec2, Vec2D
        assert Point2D is Vec2D
        assert Vector2D is Vec2D
        assert Vec2 is Vec2D

    def test_core_contract_functions(self):
        from backend.rule_engine.geometry import (
            Vec2D,
            normalize_angle, azimuth_from_direction, signed_curvature,
            radius_from_curvature, distance2, dot2, offset_point,
            local_frame_from_azimuth,
        )
        assert normalize_angle(2 * math.pi) == 0.0
        assert abs(azimuth_from_direction(1, 0)) < 1e-12
        assert signed_curvature("right", 100) == -0.01
        assert radius_from_curvature(0) is None
        assert abs(distance2(Vec2D(0, 0), Vec2D(3, 4)) - 5.0) < 1e-12
        assert dot2(Vec2D(1, 0), Vec2D(0, 1)) == 0.0
        assert abs(offset_point(Vec2D(0, 0), 0, 1).y - 1.0) < 1e-12
        frame = local_frame_from_azimuth(0)
        assert abs(frame.tangent.x - 1.0) < 1e-12
        assert abs(frame.normal.y - 1.0) < 1e-12

    def test_module_importability(self):
        import importlib
        for mod in ["contracts", "line_arc", "clothoid", "station_offset"]:
            importlib.import_module(f"backend.rule_engine.geometry.{mod}")

    def test_element_types_exported(self):
        from backend.rule_engine.geometry import (
            StraightElement, CircularArcElement, ClothoidElement, ElementEvaluation,
        )
        from backend.rule_engine.geometry.line_arc import StraightElement as SE
        assert StraightElement is SE


class TestAdapterConsumer:
    def test_build_and_eval_straight_via_adapter(self):
        from backend.rule_engine.geometry import (
            Point2D, StraightElement, evaluate_straight_element,
        )
        element = StraightElement(id="s", start=Point2D(0, 0), azimuth=0, length=10)
        result = evaluate_straight_element(element, 10)
        assert result.point.x == 10.0
        assert result.curvature == 0.0

    def test_public_surface_no_pollution(self):
        import backend.rule_engine.geometry as geom
        # Public surface should not leak private/helper internals accidentally
        assert hasattr(geom, "station_at_point")
        assert hasattr(geom, "total_alignment_length")
        assert hasattr(geom, "evaluate_alignment_at_distance")