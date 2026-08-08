# -*- coding: utf-8 -*-
"""Focused tests for X4-C-P01: Cross Section model and contracts."""
import math
import pytest

from backend.rule_engine.crosssection.model import (
    CrossSectionError,
    CrossSectionPoint,
    CrossSectionRequest,
    CrossSectionResult,
    CrossSectionSegment,
    CrossfallInput,
    PivotDefinition,
    PivotType,
    SegmentType,
    validate_request,
)


def _valid_request():
    return CrossSectionRequest(
        alignment_id="A-0",
        station=100.0,
        center_elevation=12.5,
        left_segments=[CrossSectionSegment(
            segment_id="L0", side="LEFT", segment_type=SegmentType.LANE,
            width=3.0, crossfall=2.0, start_offset=-3.0, end_offset=0.0)],
        right_segments=[CrossSectionSegment(
            segment_id="R0", side="RIGHT", segment_type=SegmentType.LANE,
            width=3.0, crossfall=2.0, start_offset=0.0, end_offset=3.0)],
    )


class TestValidateRequest:
    def test_valid_request(self):
        assert validate_request(_valid_request()) == []

    def test_empty_alignment_id(self):
        req = _valid_request()
        req.alignment_id = ""
        assert "alignment_id must be non-empty" in validate_request(req)

    def test_nonfinite_station(self):
        req = _valid_request()
        req.station = math.nan
        assert "station must be a finite number" in validate_request(req)

    def test_missing_elevation(self):
        req = _valid_request()
        req.center_elevation = math.nan
        errors = validate_request(req)
        assert any("center_elevation" in e for e in errors)

    def test_negative_width(self):
        req = _valid_request()
        req.right_segments[0].width = -1.0
        errors = validate_request(req)
        assert any("width" in e and ">= 0" in e for e in errors)

    def test_infinite_crossfall(self):
        req = _valid_request()
        req.left_segments[0].crossfall = math.inf
        errors = validate_request(req)
        assert any("crossfall" in e for e in errors)

    def test_empty_segments_rejected(self):
        req = CrossSectionRequest(alignment_id="A", station=0.0, center_elevation=1.0)
        assert "at least one segment is required" in validate_request(req)

    def test_missing_segment_id(self):
        req = _valid_request()
        req.right_segments[0].segment_id = ""
        errors = validate_request(req)
        assert any("segment_id" in e for e in errors)

    def test_segment_type_enum(self):
        assert SegmentType.SHOULDER.value == "SHOULDER"
        assert PivotType.CENTERLINE.value == "CENTERLINE"


class TestModelShape:
    def test_point_carries_xyz_none_until_evaluated(self):
        pt = CrossSectionPoint(point_id="p0", side="LEFT", segment_id="L0", offset=-1.5)
        assert pt.xyz is None
        assert pt.elevation == 0.0

    def test_result_defaults(self):
        result = CrossSectionResult(alignment_id="A", station=10.0)
        assert result.errors == []
        assert result.total_left_width == 0.0
        assert result.left_edge_offset is None

    def test_crossfall_input_pivot_default(self):
        cf = CrossfallInput()
        assert cf.pivot_offset == 0.0
        assert cf.pivot_type == PivotType.CENTERLINE
        assert cf.left_slope_percent == 0.0

    def test_pivot_resolved(self):
        pivot = PivotDefinition(pivot_type=PivotType.CUSTOM_OFFSET, pivot_offset=1.5)
        assert pivot.resolved is True
        assert pivot.pivot_offset == 1.5

    def test_rich_request_serializes_deterministic(self):
        req = _valid_request()
        pair = (req.left_segments[0], req.right_segments[0])
        assert len(pair) == 2
        assert all(p.width == 3.0 for p in pair)