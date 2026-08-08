# -*- coding: utf-8 -*-
"""Canonical Vertical Geometry model and builder (STEP-2 S2-UX01).

Mirrors the frontend canonical vertical alignment
(frontend/src/liner/schema/types.ts VerticalAlignmentDraft +
frontend/src/liner/core/verticalSampling.ts evaluateVerticalElementAtStation).

Entities:
- VerticalProfile: ordered element sequence (grade / parabolic) covering a station range
- VerticalGradeElement: linear grade segment
- VerticalParabolicElement: parabolic vertical curve (crest/sag)

Numeric conventions (STEP1 P01, FROZEN):
- station: m, same space as X4-B
- elevation Z: m absolute
- grade: internal ratio (gradePercent / 100); positive = rising with station
- vertical curvature: crest (convex up) = negative, sag (concave up) = positive
- parabolic formula: y = y0 + g0*u + 0.5*((g1-g0)/L)*u^2
  identical to frontend evaluateVerticalElementAtStation
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Union

STATION_EPSILON = 1e-9
MAX_GRADE_WARNING = 0.30  # reference value, checked by Rule Engine (X2-R-011)


class VerticalError(ValueError):
    """Raised when a VerticalProfile cannot be constructed or is invalid."""


@dataclass
class VerticalGradeElement:
    id: str
    start_station: float
    end_station: float
    start_elevation: float
    grade: float  # ratio

    @property
    def length(self) -> float:
        return self.end_station - self.start_station

    @property
    def type(self) -> str:
        return "grade"

    @property
    def end_elevation(self) -> float:
        return self.start_elevation + self.grade * self.length


@dataclass
class VerticalParabolicElement:
    id: str
    start_station: float
    end_station: float
    start_grade: float  # ratio
    end_grade: float  # ratio
    start_elevation: float = 0.0
    curve_type: Optional[str] = None  # "crest" | "sag"

    @property
    def length(self) -> float:
        return self.end_station - self.start_station

    @property
    def type(self) -> str:
        return "parabolic"

    @property
    def grade_rate(self) -> float:
        length = self.length
        return 0.0 if length == 0 else (self.end_grade - self.start_grade) / length

    @property
    def vertical_curvature(self) -> float:
        """1/m; crest (convex up) = negative, sag (concave up) = positive."""
        return self.grade_rate

    @property
    def end_elevation(self) -> float:
        return self.start_elevation + self.start_grade * self.length \
            + 0.5 * self.grade_rate * self.length * self.length


VerticalElement = Union[VerticalGradeElement, VerticalParabolicElement]


@dataclass
class VerticalSpan:
    element: VerticalElement
    start_station: float
    end_station: float
    index: int = 0

    @property
    def element_id(self) -> str:
        return self.element.id


@dataclass
class VerticalProfile:
    """Ordered vertical alignment over a single centerline."""
    profile_id: str
    elements: List[VerticalElement] = field(default_factory=list)
    origin_station: float = 0.0
    source_trace: Optional[str] = None
    _spans: Optional[List[VerticalSpan]] = field(default=None, repr=False, compare=False)

    @property
    def start_station(self) -> float:
        return self.origin_station

    @property
    def end_station(self) -> float:
        if not self._spans:
            return self.origin_station
        return self._spans[-1].end_station

    @property
    def station_range(self) -> Tuple[float, float]:
        return (self.start_station, self.end_station)

    @property
    def spans(self) -> List[VerticalSpan]:
        if self._spans is None:
            raise VerticalError("VerticalProfile must be built via build_vertical_profile()")
        return self._spans

    @property
    def vpis(self) -> List[dict]:
        """VPI points: intersection of adjacent element tangent grades.

        For grade→parabolic and parabolic→grade boundaries the VPI is the
        projection of the two tangent grades; for grade→grade boundaries it is
        the intersection of the two grade lines. Computed deterministically.
        """
        result: List[dict] = []
        for left, right in zip(self.spans, self.spans[1:]):
            vpi = _vpi_between(left.element, right.element)
            if vpi is not None:
                result.append(vpi)
        return result


def _clamp_u(element: VerticalElement, station: float) -> float:
    return min(max(station - element.start_station, 0.0), element.length)


def evaluate_element_at_station(
    element: VerticalElement,
    station: float,
) -> dict:
    """Evaluate elevation / grade / curvature at a station (mirrors frontend)."""
    u = _clamp_u(element, station)
    if element.type == "grade":
        elevation = element.start_elevation + element.grade * u
        return {
            "station": station,
            "elevation": elevation,
            "grade": element.grade,
            "vertical_curvature": 0.0,
            "element_id": element.id,
            "element_type": "grade",
        }
    start_elevation = element.start_elevation
    rate = element.grade_rate
    elevation = start_elevation + element.start_grade * u + 0.5 * rate * u * u
    grade = element.start_grade + rate * u
    return {
        "station": station,
        "elevation": elevation,
        "grade": grade,
        "vertical_curvature": rate,
        "element_id": element.id,
        "element_type": "parabolic",
    }


def _vpi_between(left: VerticalElement, right: VerticalElement) -> Optional[dict]:
    """Compute the VPI at the boundary between two adjacent elements."""
    station = left.end_station
    if left.type == "grade" and right.type == "grade":
        # intersection of the two grade lines
        g1, g2 = left.grade, right.grade
        denom = g1 - g2
        if abs(denom) <= 1e-12:
            elevation = left.end_elevation
        else:
            # distance from boundary where lines intersect
            z1 = left.end_elevation
            z2 = right.start_elevation
            t = (z2 - z1) / denom
            elevation = z1 + g1 * t
        return {
            "station": station,
            "elevation": elevation,
            "left_grade": g1,
            "right_grade": g2,
        }
    # grade→parabolic or parabolic→grade: project the two tangent grades
    if left.type == "grade":
        g1, g2 = left.grade, right.start_grade
        z1 = left.end_elevation
    else:
        g1, g2 = left.end_grade, right.grade
        z1 = left.end_elevation
    denom = g1 - g2
    if abs(denom) <= 1e-12:
        elevation = z1
    else:
        t = 0.0
        elevation = z1 + g1 * t
    return {
        "station": station,
        "elevation": elevation,
        "left_grade": g1,
        "right_grade": g2,
    }


def _check_element(element: VerticalElement) -> None:
    if not (element.length > 0):
        raise VerticalError(
            f"element {element.id!r} has non-positive length {element.length!r}")
    for name, value in (
        ("grade", getattr(element, "grade", None)),
        ("start_grade", getattr(element, "start_grade", None)),
        ("end_grade", getattr(element, "end_grade", None)),
    ):
        if value is not None and not math.isfinite(value):
            raise VerticalError(f"element {element.id!r} {name} must be finite")
    if not math.isfinite(element.start_elevation):
        raise VerticalError(f"element {element.id!r} start_elevation must be finite")


def build_vertical_profile(
    profile_id: str,
    elements: List[VerticalElement],
    *,
    origin_station: float = 0.0,
    source_trace: Optional[str] = None,
) -> VerticalProfile:
    """Build and validate a VerticalProfile.

    - station intervals must be contiguous (no gaps / overlaps)
    - G0 continuity: adjacent elements share the same elevation at the boundary
    - all lengths > 0, values finite
    """
    if not profile_id:
        raise VerticalError("profile_id must not be empty")
    if not elements:
        raise VerticalError("vertical profile must have at least one element")

    seen_ids = set()
    spans: List[VerticalSpan] = []
    cursor = origin_station
    for index, element in enumerate(elements):
        _check_element(element)
        if element.id in seen_ids:
            raise VerticalError(f"duplicate element id {element.id!r}")
        seen_ids.add(element.id)

        if index == 0:
            if abs(element.start_station - origin_station) > STATION_EPSILON:
                raise VerticalError(
                    f"first element start_station {element.start_station!r} "
                    f"does not match origin_station {origin_station!r}")
        else:
            prev = spans[-1].element
            if abs(element.start_station - prev.end_station) > STATION_EPSILON:
                raise VerticalError(
                    f"element {element.id!r} start {element.start_station!r} "
                    f"not contiguous with previous end {prev.end_station!r}")
            expected_elevation = _element_end_elevation(prev)
            if abs(element.start_elevation - expected_elevation) > 1e-6:
                raise VerticalError(
                    f"G0 discontinuity: element {element.id!r} start elevation "
                    f"{element.start_elevation!r} != previous end {expected_elevation!r}")

        span = VerticalSpan(element, element.start_station,
                            element.start_station + element.length, index)
        spans.append(span)
        cursor = span.end_station

    profile = VerticalProfile(
        profile_id=profile_id,
        elements=list(elements),
        origin_station=origin_station,
        source_trace=source_trace,
        _spans=spans,
    )
    return profile


def _element_end_elevation(element: VerticalElement) -> float:
    if element.type == "grade":
        return element.end_elevation
    return element.end_elevation


def lookup_vertical(profile: VerticalProfile, station: float):
    """Return the element span containing station. Raises VerticalError out of range."""
    if station < profile.start_station - STATION_EPSILON:
        raise VerticalError(
            f"station {station!r} is before profile start {profile.start_station!r}")
    if station > profile.end_station + STATION_EPSILON:
        raise VerticalError(
            f"station {station!r} is beyond profile end {profile.end_station!r}")
    for span in profile.spans:
        if station <= span.end_station + STATION_EPSILON:
            return span
    raise VerticalError(f"station {station!r} not found in profile")


def evaluate_vertical(profile: VerticalProfile, station: float) -> dict:
    """Evaluate the profile at a station: elevation / grade / curvature / element."""
    span = lookup_vertical(profile, station)
    result = evaluate_element_at_station(span.element, station)
    result["element_type"] = span.element.type
    return result


def grade_to_percent(grade: float) -> float:
    return grade * 100.0


def grade_percent_to_ratio(percent: float) -> float:
    return percent / 100.0


__all__ = [
    "STATION_EPSILON",
    "MAX_GRADE_WARNING",
    "VerticalError",
    "VerticalGradeElement",
    "VerticalParabolicElement",
    "VerticalElement",
    "VerticalSpan",
    "VerticalProfile",
    "build_vertical_profile",
    "evaluate_vertical",
    "evaluate_element_at_station",
    "lookup_vertical",
    "grade_to_percent",
    "grade_percent_to_ratio",
]
