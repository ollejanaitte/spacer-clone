# -*- coding: utf-8 -*-
"""Focused tests for X4-B-P02: station progression and element lookup."""
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement, CircularArcElement

from backend.rule_engine.alignment.model import build_alignment
from backend.rule_engine.alignment.station import (
    AlignmentRangeError, StationLookup, STATION_EPSILON, lookup_station, station_at,
)


def _mix():
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30),
            CircularArcElement(id="a1", start=Vec2D(0, 0), azimuth=0.0,
                               radius=100.0, turn="left", length=50),
            StraightElement(id="s2", start=Vec2D(0, 0), azimuth=0.0, length=20),
        ],
    )


class TestStationAt:
    def test_rejects_before_range(self):
        with pytest.raises(AlignmentRangeError):
            station_at(_mix(), -1.0)

    def test_rejects_after_range(self):
        with pytest.raises(AlignmentRangeError):
            station_at(_mix(), 500.0)

    def test_first_station(self):
        assert station_at(_mix(), 0.0).element_id == "s0"

    def test_interior_element(self):
        assert station_at(_mix(), 45.0).element_id == "a1"

    def test_exact_boundary_to_next_element(self):
        assert station_at(_mix(), 30.0).element_id == "a1"

    def test_last_station(self):
        assert station_at(_mix(), 100.0).element_id == "s2"

    def test_just_below_boundary_stays_in_current(self):
        # a hair below the boundary remains in s0 (resolution to next only AT boundary)
        assert station_at(_mix(), 30.0 - STATION_EPSILON / 2).element_id == "s0"


class TestLocalStation:
    def test_interior_local(self):
        lookup = lookup_station(_mix(), 35.0)
        assert lookup.element_id == "a1"
        assert abs(lookup.local_station - 5.0) < 1e-9

    def test_first_element_local(self):
        lookup = lookup_station(_mix(), 10.0)
        assert lookup.element_id == "s0"
        assert abs(lookup.local_station - 10.0) < 1e-9

    def test_boundary_local_zero(self):
        lookup = lookup_station(_mix(), 30.0)
        assert lookup.element_id == "a1"
        assert lookup.local_station == 0.0
        assert lookup.is_boundary is True

    def test_end_local(self):
        lookup = lookup_station(_mix(), 100.0)
        assert lookup.element_id == "s2"
        assert abs(lookup.local_station - 20.0) < 1e-9

    def test_lookup_type(self):
        assert isinstance(lookup_station(_mix(), 50.0), StationLookup)

    def test_metadata_fields(self):
        lookup = lookup_station(_mix(), 50.0)
        assert lookup.element_type == "arc"
        assert abs(lookup.element_start - 30.0) < 1e-9
        assert abs(lookup.element_end - 80.0) < 1e-9