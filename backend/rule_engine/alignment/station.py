# -*- coding: utf-8 -*-
"""Alignment station progression and element lookup.

Provides canonical, deterministic station handling for a single-centerline
Alignment built on the X4-A Geometry Kernel. Boundaries are resolved to the
following element at its local station 0 (exact-boundary policy).

Boundary / out-of-range policy (used consistently by evaluation too):
- station < alignment.start_station  -> AlignmentRangeError
- station > alignment.end_station    -> AlignmentRangeError
- interior: find element i with start <= station <= end
- exact boundary at span end: resolved to the NEXT element (local station 0)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .model import Alignment, AlignmentSpan


class AlignmentRangeError(ValueError):
    """Raised when a station is outside the Alignment [start, end] range."""


# Boundary equality tolerance (m). Matches X4-A station tolerance convention.
STATION_EPSILON = 1e-6


def station_at(alignment: Alignment, station: float) -> AlignmentSpan:
    """Return the AlignmentSpan containing the given station.

    Exact boundary at element end resolves to the following element (its local
    station 0). Raises AlignmentRangeError for stations outside [start, end].
    """
    if station < alignment.start_station - STATION_EPSILON:
        raise AlignmentRangeError(
            f"station {station} is before alignment start {alignment.start_station}"
        )
    if station > alignment.end_station + STATION_EPSILON:
        raise AlignmentRangeError(
            f"station {station} is beyond alignment end {alignment.end_station}"
        )

    clamped = max(station, alignment.start_station)
    clamped = min(clamped, alignment.end_station)

    for span in alignment.spans:
        if span.start_station <= clamped < span.end_station:
            return span
    # clamped == end_station: resolve to last span (its end)
    return alignment.spans[-1]


@dataclass
class StationLookup:
    """Result of resolving a station to a local position within the Alignment."""
    station: float
    element: AlignmentSpan
    element_id: str
    element_type: str
    local_station: float
    element_start: float
    element_end: float
    is_boundary: bool

    @property
    def on_alignment(self) -> bool:
        return True


def lookup_station(alignment: Alignment, station: float) -> StationLookup:
    """Resolve a station to its containing element + local station.

    Clamps station to [start, end] (boundary-tolerant). For a value within
    tolerance of the end boundary, resolves to the last element at its end.
    """
    span = station_at(alignment, station)
    local = station - span.start_station
    # Guard against tiny negative/overshoot at boundaries
    if local < 0:
        local = 0.0
    if local > span.end_station - span.start_station:
        local = span.end_station - span.start_station

    on_boundary = (
        abs(station - span.start_station) <= STATION_EPSILON
        or abs(station - span.end_station) <= STATION_EPSILON
    )
    return StationLookup(
        station=station,
        element=span,
        element_id=span.element_id,
        element_type=span.element_type,
        local_station=local,
        element_start=span.start_station,
        element_end=span.end_station,
        is_boundary=on_boundary,
    )


__all__ = [
    "STATION_EPSILON",
    "AlignmentRangeError",
    "StationLookup",
    "lookup_station",
    "station_at",
]