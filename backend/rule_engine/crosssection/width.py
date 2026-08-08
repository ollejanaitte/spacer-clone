# -*- coding: utf-8 -*-
"""Explicit width evaluation for a Cross Section at a station (X-C-P2).

Mirrors the LINER canonical width resolution (frontend widthResolution.ts):
  - segment widths are explicit inputs
  - width-change points use piecewise-hold (latest change point at or before
    the station becomes active; NO linear interpolation default)
  - left/right widths are independent non-negative values
  - total width = sum of segments on each side

No width design rule is implemented (widening design = prohibited).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

from .model import CrossSectionRequest, CrossSectionSegment

WIDTH_TOLERANCE = 1e-9


class WidthError(ValueError):
    """Raised when width inputs are invalid."""


@dataclass
class WidthChangePoint:
    """An explicit width change point (analog of WidthChangePointDraft)."""
    physical_distance: float
    left_offset: float
    right_offset: float
    id: str = ""


@dataclass
class ResolvedWidthExtents:
    left_half_width: float
    right_half_width: float
    source: str = "explicit"
    width_change_point_id: Optional[str] = None


def segment_total_width_left(segments: List[CrossSectionSegment]) -> float:
    """Sum of non-negative widths on the LEFT side."""
    return _total_side(segments, side_tag="LEFT")


def segment_total_width_right(segments: List[CrossSectionSegment]) -> float:
    return _total_side(segments, side_tag="RIGHT")


def _total_side(segments: List[CrossSectionSegment], side_tag: str) -> float:
    total = 0.0
    for segment in segments:
        if segment.side != side_tag:
            continue
        if not math.isfinite(segment.width) or segment.width < 0:
            raise WidthError(
                f"segment {segment.segment_id!r} width={segment.width!r} must be finite and >= 0"
            )
        total += segment.width
    return total


def resolve_level_width(segments: List[CrossSectionSegment]) -> ResolvedWidthExtents:
    """Resolve the section half widths directly from explicit segments."""
    return ResolvedWidthExtents(
        left_half_width=segment_total_width_left(segments),
        right_half_width=segment_total_width_right(segments),
        source="explicit",
    )


def evaluate_width_at_distance(
    base: ResolvedWidthExtents,
    change_points: Optional[List[WidthChangePoint]],
    physical_distance: float,
) -> ResolvedWidthExtents:
    """Apply piecewise-hold width change points over base extents.

    Mirrors frontend resolveWidthAtDistance: the latest change point at or
    before the station becomes the active extents. Linear interpolation is
    intentionally NOT applied.
    """
    if not change_points:
        return base
    ordered = sorted(change_points, key=lambda p: (p.physical_distance, p.id))
    active: Optional[WidthChangePoint] = None
    for point in ordered:
        if point.physical_distance <= physical_distance + WIDTH_TOLERANCE:
            active = point
            continue
        break
    if active is None:
        return base
    if active.left_offset < 0 or active.right_offset < 0:
        raise WidthError("width change offsets must be non-negative")
    return ResolvedWidthExtents(
        left_half_width=active.left_offset,
        right_half_width=active.right_offset,
        source="width_change_point",
        width_change_point_id=active.id,
    )


def evaluate_request_width(request: CrossSectionRequest) -> ResolvedWidthExtents:
    """Derive resolved width extents from a CrossSectionRequest (explicit)."""
    return resolve_level_width(
        [*request.left_segments, *request.right_segments]
    )


def total_width_from_request(request: CrossSectionRequest) -> float:
    """Total (left + right) road width from a request's explicit segments."""
    return (
        segment_total_width_left(request.left_segments)
        + segment_total_width_right(request.right_segments)
    )


__all__ = [
    "ResolvedWidthExtents",
    "WIDTH_TOLERANCE",
    "WidthChangePoint",
    "WidthError",
    "evaluate_request_width",
    "evaluate_width_at_distance",
    "resolve_level_width",
    "segment_total_width_left",
    "segment_total_width_right",
    "total_width_from_request",
]