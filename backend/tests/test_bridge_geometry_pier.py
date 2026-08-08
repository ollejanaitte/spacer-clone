# -*- coding: utf-8 -*-
"""Bridge Geometry - Pier tests (STEP-2 S2-UX07)."""
from __future__ import annotations

import math

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.bridge_geometry import (
    BridgeGeometryError,
    Pier,
    resolve_pier,
    support_line_direction,
    validate_pier,
)


def _alignment(length=200.0):
    return build_alignment(
        "road",
        [StraightElement(id="e0", start=Vec2D(0, 0), azimuth=0.0, length=length)],
        origin_station=0.0,
    )


class TestValidatePier:
    def test_valid(self):
        assert validate_pier(Pier(pier_id="K10", station=100.0, alignment_id="road"),
                             alignment_start=0.0, alignment_end=200.0) == []

    def test_empty_id(self):
        assert validate_pier(Pier(pier_id="", station=100.0, alignment_id="road"))

    def test_skew_range(self):
        assert validate_pier(Pier(pier_id="K", station=100.0, alignment_id="road",
                                  skew_angle_deg=0.0))
        assert validate_pier(Pier(pier_id="K", station=100.0, alignment_id="road",
                                  skew_angle_deg=180.0))
        assert not validate_pier(Pier(pier_id="K", station=100.0, alignment_id="road",
                                      skew_angle_deg=90.0))

    def test_station_out_of_alignment(self):
        assert validate_pier(Pier(pier_id="K", station=250.0, alignment_id="road"),
                             alignment_start=0.0, alignment_end=200.0)


class TestSupportLineDirection:
    def test_perpendicular_at_90_deg(self):
        # azimuth=0, skew=90 -> support line along Y axis
        d = support_line_direction(0.0, 90.0)
        assert d.x == pytest.approx(0.0, abs=1e-12)
        assert d.y == pytest.approx(1.0)

    def test_skew_deviation(self):
        # azimuth=0, skew=45 -> direction = (-sin(-45), cos(-45))
        d = support_line_direction(0.0, 45.0)
        assert d.x == pytest.approx(math.sin(math.pi / 4))
        assert d.y == pytest.approx(math.cos(math.pi / 4))


class TestResolvePier:
    def test_center_support(self):
        pier = Pier(pier_id="K10", station=100.0, alignment_id="road",
                    skew_angle_deg=90.0)
        resolved = resolve_pier(pier, alignment=_alignment())
        assert len(resolved.support_points) == 1
        pt = resolved.support_points[0]
        assert pt.x == pytest.approx(100.0)
        assert pt.y == pytest.approx(0.0)

    def test_offset_support(self):
        pier = Pier(pier_id="K10", station=100.0, alignment_id="road",
                    skew_angle_deg=90.0, bearing_offsets_m=[-3.0, 3.0])
        resolved = resolve_pier(pier, alignment=_alignment())
        assert len(resolved.support_points) == 2
        assert resolved.support_points[0].y == pytest.approx(-3.0)
        assert resolved.support_points[1].y == pytest.approx(3.0)

    def test_out_of_range_raises(self):
        pier = Pier(pier_id="K10", station=250.0, alignment_id="road")
        with pytest.raises(BridgeGeometryError):
            resolve_pier(pier, alignment=_alignment(),
                         alignment_start=0.0, alignment_end=200.0)

    def test_invalid_skew_raises(self):
        pier = Pier(pier_id="K10", station=100.0, alignment_id="road",
                    skew_angle_deg=0.0)
        with pytest.raises(BridgeGeometryError):
            resolve_pier(pier, alignment=_alignment())

    def test_support_points_require_resolution(self):
        pier = Pier(pier_id="K10", station=100.0, alignment_id="road")
        with pytest.raises(BridgeGeometryError):
            _ = pier.support_points
