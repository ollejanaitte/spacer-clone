# -*- coding: utf-8 -*-
"""Bridge Geometry - Span tests (STEP-2 S2-UX08)."""
from __future__ import annotations

import pytest

from backend.rule_engine.bridge_geometry import (
    Pier,
    Span,
    validate_span,
    validate_span_sequence,
)


def _pier(pid, station):
    return Pier(pier_id=pid, station=station, alignment_id="road")


def _span(sid, a, b, sa, sb):
    return Span(span_id=sid, start_pier_id=a, end_pier_id=b,
                start_station=sa, end_station=sb, alignment_id="road")


class TestValidateSpan:
    def test_valid(self):
        assert validate_span(_span("S1", "K1", "K2", 0.0, 50.0)) == []

    def test_reversed_stations(self):
        assert validate_span(_span("S1", "K1", "K2", 50.0, 0.0))

    def test_empty_id(self):
        assert validate_span(_span("", "K1", "K2", 0.0, 50.0))

    def test_same_pier(self):
        assert validate_span(_span("S1", "K1", "K1", 0.0, 50.0))

    def test_pier_lookup(self):
        piers = [_pier("K1", 0.0), _pier("K2", 50.0)]
        assert validate_span(_span("S1", "K1", "K3", 0.0, 50.0), piers=piers)

    def test_span_length(self):
        span = _span("S1", "K1", "K2", 10.0, 60.0)
        assert span.span_length == 50.0


class TestValidateSpanSequence:
    def test_contiguous(self):
        spans = [_span("S1", "K1", "K2", 0.0, 50.0),
                 _span("S2", "K2", "K3", 50.0, 100.0)]
        assert validate_span_sequence(spans) == []

    def test_gap(self):
        spans = [_span("S1", "K1", "K2", 0.0, 50.0),
                 _span("S2", "K2", "K3", 60.0, 100.0)]
        assert validate_span_sequence(spans)

    def test_duplicate_id(self):
        spans = [_span("S1", "K1", "K2", 0.0, 50.0),
                 _span("S1", "K2", "K3", 50.0, 100.0)]
        assert validate_span_sequence(spans)

    def test_bind(self):
        k1, k2 = _pier("K1", 0.0), _pier("K2", 50.0)
        span = _span("S1", "K1", "K2", 0.0, 50.0).bind(k1, k2)
        assert span.start_pier is k1
        assert span.end_pier is k2
