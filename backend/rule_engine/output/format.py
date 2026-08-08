# -*- coding: utf-8 -*-
"""Output - formatting / rounding / units (STEP-2 S2-UX11).

STEP1 P04 FROZEN display precision rules. Internal computation values are
NEVER rounded here; formatting is the display/report layer only.

| field         | unit | display digits |
|---------------|------|----------------|
| station       | m    | 3              |
| X / Y         | m    | 3              |
| Z (plan hgt)  | m    | 3              |
| grade         | %    | 3              |
| curvature     | 1/m  | 6              |
| R             | m    | from 1/curvature, no fixed digits (integer display common) |
| distance      | m    | 3              |
| angle         | rad/deg | 4          |
"""
from __future__ import annotations

import math
from typing import Optional

__all__ = [
    "format_length",
    "format_station",
    "format_grade_percent",
    "format_curvature",
    "format_angle",
    "curvature_to_radius",
    "format_radius",
]


def format_length(value: Optional[float], digits: int = 3) -> str:
    """Format a length (m) with fixed display digits. Non-finite -> empty."""
    if value is None or not math.isfinite(value):
        return ""
    return f"{value:.{digits}f}"


def format_station(value: Optional[float], digits: int = 3) -> str:
    return format_length(value, digits)


def format_grade_percent(grade_ratio: Optional[float], digits: int = 3) -> str:
    """Format an internal grade ratio as display % (grade * 100)."""
    if grade_ratio is None or not math.isfinite(grade_ratio):
        return ""
    return f"{grade_ratio * 100.0:.{digits}f}"


def format_curvature(value: Optional[float], digits: int = 6) -> str:
    if value is None or not math.isfinite(value):
        return ""
    return f"{value:.{digits}f}"


def curvature_to_radius(curvature: Optional[float]) -> Optional[float]:
    """Inverse of signed_curvature. None for straight / invalid curvature."""
    if curvature is None or not math.isfinite(curvature) or abs(curvature) <= 1e-12:
        return None
    return 1.0 / abs(curvature)


def format_radius(curvature: Optional[float]) -> str:
    """Display radius as integer meters from curvature (P04: from 1/R)."""
    radius = curvature_to_radius(curvature)
    if radius is None:
        return ""
    return f"{radius:.0f}"


def format_angle(value: Optional[float], digits: int = 4) -> str:
    if value is None or not math.isfinite(value):
        return ""
    return f"{value:.{digits}f}"
