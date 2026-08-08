# -*- coding: utf-8 -*-
"""Explicit crossfall evaluation for a Cross Section at a station (X-C-P2).

Mirrors the LINER canonical crossfall resolution (frontend crossfallResolution.ts):
  - crossfall percents and pivot are consumed as explicit inputs
  - delta_z = -(slope% / 100) * (offset - pivot_offset)
  - offset < pivot uses left slope, offset > pivot uses right slope
  - |offset - pivot| within offset tolerance -> delta_z = 0 (clamp)

Interpolation between intervals is linear ONLY when pivot matches (mirrors
buildTransitionState); otherwise the transition is unresolved (flat fallback
remains explicit — never an automatic hidden default).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from .model import CrossfallInput

OFFSET_TOLERANCE = 1e-4


class CrossfallMode(str, Enum):
    FLAT = "flat"
    ONE_WAY_LEFT = "one_way_left"
    ONE_WAY_RIGHT = "one_way_right"
    CROWN = "crown"
    INDEPENDENT = "independent"


class CrossfallError(ValueError):
    """Raised when crossfall inputs are invalid."""


@dataclass
class ResolvedCrossfallState:
    physical_distance: float
    mode: CrossfallMode = CrossfallMode.FLAT
    left_slope_percent: float = 0.0
    right_slope_percent: float = 0.0
    pivot_offset: float = 0.0
    source: str = "explicit"
    interval_id: Optional[str] = None


def crossfall_delta_z(
    state: ResolvedCrossfallState,
    offset: float,
) -> float:
    """Compute the relative-Z contribution of crossfall at a given offset.

    Mirrors frontend resolveCrossfallOffset exactly:
      dz = -(slope%/100) * (offset - pivot_offset)
    """
    if not math.isfinite(offset):
        raise CrossfallError(f"offset must be finite, got {offset!r}")
    relative = offset - state.pivot_offset
    if abs(relative) <= OFFSET_TOLERANCE:
        return 0.0
    slope_percent = state.left_slope_percent if relative < 0 else state.right_slope_percent
    result = -(slope_percent / 100.0) * relative
    return 0.0 if result == 0 else result


def resolve_crossfall_input(
    crossfall: CrossfallInput,
    physical_distance: float = 0.0,
) -> ResolvedCrossfallState:
    """Resolve an explicit CrossfallInput into an evaluation state."""
    for name, value in (
        ("left_slope_percent", crossfall.left_slope_percent),
        ("right_slope_percent", crossfall.right_slope_percent),
        ("pivot_offset", crossfall.pivot_offset),
    ):
        if not math.isfinite(value):
            raise CrossfallError(f"crossfall.{name} must be finite, got {value!r}")
    mode = _derive_mode(
        crossfall.left_slope_percent,
        crossfall.right_slope_percent,
        crossfall.pivot_offset,
    )
    return ResolvedCrossfallState(
        physical_distance=physical_distance,
        mode=mode,
        left_slope_percent=crossfall.left_slope_percent,
        right_slope_percent=crossfall.right_slope_percent,
        pivot_offset=crossfall.pivot_offset,
        source=crossfall.source,
    )


def _derive_mode(left: float, right: float, pivot: float) -> CrossfallMode:
    if abs(left) <= OFFSET_TOLERANCE and abs(right) <= OFFSET_TOLERANCE:
        return CrossfallMode.FLAT
    if abs(left - right) <= OFFSET_TOLERANCE:
        if left < 0:
            return CrossfallMode.ONE_WAY_LEFT
        if left > 0:
            return CrossfallMode.ONE_WAY_RIGHT
    return CrossfallMode.INDEPENDENT


@dataclass
class CrossfallInterval:
    """Explicit crossfall interval (analog of CrossSlopeIntervalDraft)."""
    id: str
    start: float
    end: float
    left_slope_percent: float
    right_slope_percent: float
    pivot_offset: float = 0.0


def resolve_crossfall_at(
    intervals: Optional[List[CrossfallInterval]],
    physical_distance: float,
    fallback: ResolvedCrossfallState,
) -> ResolvedCrossfallState:
    """Resolve the crossfall state at a station.

    Mirrors frontend resolveCrossfallState: exact interval match wins;
    otherwise the explicit fallback (flat/legacy) state is returned.
    Transitions between intervals are NOT silently interpolated in the backend
    generic model — callers that require interpolation must provide resolved
    states upstream (crossfall interpolation ownership is out of scope).
    """
    if not intervals:
        return fallback
    for interval in sorted(intervals, key=lambda item: item.start):
        lo = interval.start
        hi = interval.end
        inside = (
            (physical_distance >= lo - OFFSET_TOLERANCE)
            and (physical_distance < hi - OFFSET_TOLERANCE)
        ) or (
            math.isclose(physical_distance, hi, abs_tol=OFFSET_TOLERANCE)
            and interval is intervals[-1]
        )
        if inside:
            state = ResolvedCrossfallState(
                physical_distance=physical_distance,
                mode=_derive_mode(
                    interval.left_slope_percent,
                    interval.right_slope_percent,
                    interval.pivot_offset,
                ),
                left_slope_percent=interval.left_slope_percent,
                right_slope_percent=interval.right_slope_percent,
                pivot_offset=interval.pivot_offset,
                source="interval",
                interval_id=interval.id,
            )
            return state
    return fallback


__all__ = [
    "CrossfallError",
    "CrossfallInterval",
    "CrossfallMode",
    "OFFSET_TOLERANCE",
    "ResolvedCrossfallState",
    "crossfall_delta_z",
    "resolve_crossfall_at",
    "resolve_crossfall_input",
]