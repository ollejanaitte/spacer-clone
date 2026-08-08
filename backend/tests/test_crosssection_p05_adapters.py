# -*- coding: utf-8 -*-
"""Contract tests for X4-C-P5: Rule Engine / Alignment / Road->Bridge adapters.

No new geometry is introduced on this step; the adapters only wire the
canonical P01-P04 pipeline. These tests are contract checks.
"""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.models import RuleResult, TraceRecord

from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput, SegmentType,
)
from backend.rule_engine.crosssection.adapters import (
    CrossSectionAdapterError,
    RoadBridgeResult,
    RoadWidthSegment,
    RuleCrossfallInput,
    RuleCrossSectionInput,
    adapt_rule_request,
    build_road_bridge,
    cross_rule_from_inputs,
    cross_section_result,
    cross_section_trace,
    validate_road_bridge,
)


def _alignment():
    return build_alignment(
        "A",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=200.0)],
        origin_station=0.0,
    )


def _rule_inputs(**overrides):
    values = {
        "station_m": 50.0,
        "center_elevation_m": 10.0,
        "left_width_m": 3.0,
        "right_width_m": 3.0,
    }
    values.update(overrides)
    return RuleCrossSectionInput(**values)


class TestRuleToCrossSection:
    def test_valid_request(self):
        request = cross_rule_from_inputs(_rule_inputs())
        assert request.station == 50.0
        assert request.center_elevation == 10.0
        assert len(request.left_segments) == 1
        assert len(request.right_segments) == 1
        assert request.left_segments[0].width == 3.0
        assert request.right_segments[0].side == "RIGHT"

    def test_missing_required_width_fails_closed(self):
        inputs = _rule_inputs(left_width_m=None, right_width_m=None)
        request = cross_rule_from_inputs(inputs)
        request.alignment_id = "A"
        from backend.rule_engine.crosssection.model import validate_request
        errors = validate_request(request)
        assert any("segment" in error for error in errors)

    def test_missing_elevation_fails(self):
        with pytest.raises(Exception):
            cross_rule_from_inputs(_rule_inputs(center_elevation_m=math.nan))

    def test_invalid_unit_rejected(self):
        with pytest.raises(CrossSectionAdapterError):
            cross_rule_from_inputs(RuleCrossSectionInput(
                station_m=50.0, center_elevation_m=10.0,
                left_width_m=3.0, right_width_m=3.0, unit="cm"))

    def test_per_segment_breakdown(self):
        inputs = _rule_inputs(left_segments=[
            RoadWidthSegment("L-a", "LEFT", 1.5),
            RoadWidthSegment("L-b", "LEFT", 1.5),
        ])
        request = cross_rule_from_inputs(inputs)
        assert len(request.left_segments) == 2
        assert request.left_segments[0].end_offset == 1.5
        assert request.left_segments[1].start_offset == 1.5
        assert request.left_segments[1].end_offset == 3.0

    def test_negative_width_rejected(self):
        inputs = _rule_inputs(left_width_m=-1.0)
        with pytest.raises(CrossSectionAdapterError):
            cross_rule_from_inputs(inputs)

    def test_rejects_non_meter_string_unit(self):
        inputs = _rule_inputs()
        inputs.unit = "fe"
        with pytest.raises(CrossSectionAdapterError):
            cross_rule_from_inputs(inputs)


class TestAlignmentToCrossSection:
    def test_station_pose_intake(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        result = cross_section_result(alignment, request)
        assert result.station == 50.0
        assert result.alignment_element_id == "s0"
        assert result.center_point_xyz.x == pytest.approx(50.0)

    def test_out_of_range_station_raises(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs(station_m=500.0))
        request.alignment_id = "A"
        with pytest.raises(Exception):
            cross_section_result(alignment, request)


class TestCrossSectionToRoadBridge:
    def test_payload_shape(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        bridge = build_road_bridge(alignment, request)
        assert isinstance(bridge, RoadBridgeResult)
        assert bridge.centerline_xyz.z == pytest.approx(10.0)
        assert bridge.total_left_width == 3.0
        assert bridge.total_right_width == 3.0
        assert bridge.section_points

    def test_edge_propagation(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        bridge = build_road_bridge(alignment, request)
        left = bridge.left_edge_xyz
        right = bridge.right_edge_xyz
        assert left.y == pytest.approx(-3.0)
        assert right.y == pytest.approx(3.0)
        assert left.z == pytest.approx(10.0)

    def test_no_design_payload(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        bridge = build_road_bridge(alignment, request)
        payload = bridge_dict(bridge)
        assert "girder" not in payload and "deck" not in payload

    def test_validate_payload(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        bridge = build_road_bridge(alignment, request)
        validate_road_bridge(bridge)  # should not raise


def bridge_dict(bridge):
    import dataclasses
    return {f.name: f.default if not f.name else None for f in dataclasses.fields(bridge)}


class TestTraceAndDeterminism:
    def test_trace_propagation(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        result = cross_section_result(alignment, request)
        trace = cross_section_trace(result)
        assert trace.alignment_id == "A"
        assert trace.station == 50.0
        assert "EXPLICIT_INPUT" in trace.elevation_source_id or "explicit" in trace.elevation_source_id

    def test_deterministic_repeat(self):
        alignment = _alignment()
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        first = build_road_bridge(alignment, request)
        second = build_road_bridge(alignment, request)
        assert first.centerline_xyz == second.centerline_xyz
        assert first.left_edge_xyz == second.left_edge_xyz
        assert first.trace == second.trace


class TestRuleEngineContract:
    def test_rule_request_shape(self):
        request = cross_rule_from_inputs(_rule_inputs())
        request.alignment_id = "A"
        rule_request = adapt_rule_request(_alignment(), request)
        assert rule_request.inputs["station"] == 50.0
        assert rule_request.inputs["left_segments"] == ["L-1"]