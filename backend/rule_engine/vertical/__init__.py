# -*- coding: utf-8 -*-
"""Vertical Geometry public API surface (STEP-2 S2-UX01).

Canonical vertical contracts over the frontend-mirrored math. Integrates into
the Road Geometry API as the elevation producer (replacing EXPLICIT_INPUT-only
with a backend-calculated Z path while preserving the explicit-input contract).
"""
from .model import (
    MAX_GRADE_WARNING,
    STATION_EPSILON,
    VerticalError,
    VerticalGradeElement,
    VerticalParabolicElement,
    VerticalProfile,
    build_vertical_profile,
    evaluate_element_at_station,
    evaluate_vertical,
    grade_percent_to_ratio,
    grade_to_percent,
    lookup_vertical,
)

__all__ = [
    "MAX_GRADE_WARNING",
    "STATION_EPSILON",
    "VerticalError",
    "VerticalGradeElement",
    "VerticalParabolicElement",
    "VerticalProfile",
    "build_vertical_profile",
    "evaluate_element_at_station",
    "evaluate_vertical",
    "lookup_vertical",
    "grade_to_percent",
    "grade_percent_to_ratio",
]
