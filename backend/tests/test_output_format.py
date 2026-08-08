# -*- coding: utf-8 -*-
"""Output - formatting tests (STEP-2 S2-UX11)."""
from __future__ import annotations

import pytest

from backend.rule_engine.output import (
    curvature_to_radius,
    format_angle,
    format_curvature,
    format_grade_percent,
    format_length,
    format_radius,
    format_station,
)


class TestFormat:
    def test_length_3dp(self):
        assert format_length(12.34567) == "12.346"
        assert format_length(12.0) == "12.000"

    def test_length_non_finite(self):
        assert format_length(float("nan")) == ""
        assert format_length(None) == ""

    def test_station(self):
        assert format_station(24.1995) == "24.200"

    def test_grade_percent(self):
        assert format_grade_percent(0.02) == "2.000"
        assert format_grade_percent(-0.0125) == "-1.250"

    def test_curvature(self):
        assert format_curvature(0.001) == "0.001000"

    def test_radius_from_curvature(self):
        assert curvature_to_radius(0.01) == pytest.approx(100.0)
        assert curvature_to_radius(0.0) is None
        assert curvature_to_radius(-0.005) == pytest.approx(200.0)
        assert format_radius(0.01) == "100"

    def test_angle(self):
        assert format_angle(1.5707963) == "1.5708"
