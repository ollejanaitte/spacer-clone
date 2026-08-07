# -*- coding: utf-8 -*-
"""Focused tests for X4-B-P01 Alignment model and builder."""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement, CircularArcElement
from backend.rule_engine.geometry.clothoid import ClothoidElement

from backend.rule_engine.alignment.model import (
    Alignment, AlignmentError, AlignmentSpan, build_alignment,
)


def straight(i="_s", length=100.0, start=None, azimuth=0.0):
    return StraightElement(id=i, start=start or Vec2D(0, 0), azimuth=azimuth, length=length)


def arc(turn="left", i="_a", length=50.0, radius=100.0):
    return CircularArcElement(id=i, start=Vec2D(0, 0), azimuth=0.0, radius=radius, turn=turn, length=length)


def clothoid(length=50.0, i="_c"):
    return ClothoidElement(
        id=i, start=Vec2D(0, 0), azimuth=0.0, clothoidParameter=200.0,
        startRadius=None, endRadius=100.0, turn="left", length=length,
    )


class TestBuildAlignment:
    def test_empty_rejected(self):
        with pytest.raises(AlignmentError):
            build_alignment("A", [])

    def test_blank_id_rejected(self):
        with pytest.raises(AlignmentError):
            build_alignment("", [straight()])

    def test_zero_length_rejected(self):
        with pytest.raises(AlignmentError):
            build_alignment("A", [straight(length=0)])

    def test_negative_length_rejected(self):
        with pytest.raises(AlignmentError):
            build_alignment("A", [straight(length=-5)])

    def test_duplicate_id_rejected(self):
        with pytest.raises(AlignmentError):
            build_alignment("A", [straight(i="x"), straight(i="x")])

    def test_single_line(self):
        a = build_alignment("A", [straight(length=100)])
        assert a.total_length == 100.0
        assert a.station_range == (0.0, 100.0)
        assert len(a.spans) == 1
        assert a.spans[0].element_id == "_s"

    def test_line_arc_origin(self):
        a = build_alignment("A", [straight(length=40), arc(length=60)], origin_station=100.0)
        assert a.total_length == 100.0
        assert a.start_station == 100.0
        assert a.end_station == 200.0
        s0, s1 = a.spans
        assert s0.start_station == 100.0 and s0.end_station == 140.0
        assert s1.start_station == 140.0 and s1.end_station == 200.0

    def test_line_clothoid_arc_deterministic(self):
        a = build_alignment(
            "A",
            [straight(length=30), clothoid(length=20), arc(length=50)],
        )
        assert a.total_length == 100.0
        starts = [s.start_station for s in a.spans]
        ends = [s.end_station for s in a.spans]
        assert starts == [0.0, 30.0, 50.0]
        assert ends == [30.0, 50.0, 100.0]
        # spans are contiguous
        for i in range(len(ends) - 1):
            assert ends[i] == starts[i + 1]

    def test_source_trace_recorded(self):
        a = build_alignment("A", [straight()], source_trace="la:L100/R")
        assert a.source_trace == "la:L100/R"

    def test_span_type(self):
        a = build_alignment("A", [arc()])
        assert isinstance(a.spans[0], AlignmentSpan)
        assert a.spans[0].element_type == "arc"


class TestAlignmentProperties:
    def test_empty_spans_via_raw(self):
        # construct via dataclass directly (spans unbuilt)
        a = Alignment(alignment_id="A", elements=[straight()])
        assert a.total_length == 0.0
        with pytest.raises(AlignmentError):
            _ = a.spans