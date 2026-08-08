# -*- coding: utf-8 -*-
"""Rule -> RoadGeometry adapter tests (STEP-2 S2-UX06)."""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import RoadElementRow
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.crosssection.model import (
    CrossSectionSegment,
    CrossfallInput,
)
from backend.rule_engine.road_geometry import (
    DesignWarning,
    RoadGeometryError,
    RoadGeometryRequest,
    RuleDesignValues,
    apply_rule_design_values,
    road_geometry_api,
)


def _request():
    return RoadGeometryRequest(
        alignment_id="r",
        station=50.0,
        rows=[RoadElementRow(kind="straight", length=100.0, id="e0")],
        left_segments=[CrossSectionSegment(segment_id="L0", side="LEFT", width=3.0)],
        right_segments=[CrossSectionSegment(segment_id="R0", side="RIGHT", width=3.0)],
    )


class TestAdapter:
    def test_no_mutation(self):
        request = _request()
        design = RuleDesignValues()
        patched = apply_rule_design_values(request, design)
        assert patched is not request
        assert request.left_segments[0].width == 3.0

    def test_apply_width(self):
        request = _request()
        design = RuleDesignValues(left_width_m=4.5, right_width_m=2.0)
        patched = apply_rule_design_values(request, design)
        assert patched.left_segments[-1].width == 4.5
        assert patched.right_segments[-1].width == 2.0
        assert patched.source_trace["width_source"] == "rule-engine"

    def test_apply_width_creates_segments_when_empty(self):
        request = RoadGeometryRequest(
            alignment_id="r", station=10.0,
            rows=[RoadElementRow(kind="straight", length=100.0, id="e0")])
        design = RuleDesignValues(left_width_m=5.0)
        patched = apply_rule_design_values(request, design)
        assert len(patched.left_segments) == 1
        assert patched.left_segments[0].width == 5.0

    def test_apply_crossfall(self):
        request = _request()
        crossfall = CrossfallInput(left_slope_percent=-2.0, right_slope_percent=-2.0)
        design = RuleDesignValues(crossfall=crossfall)
        patched = apply_rule_design_values(request, design)
        assert patched.crossfall.left_slope_percent == -2.0
        assert patched.source_trace["crossfall_source"] == "rule-engine"

    def test_widening_trace(self):
        request = _request()
        design = RuleDesignValues(widening_amount_m=0.5)
        patched = apply_rule_design_values(request, design)
        assert patched.source_trace["widening_amount_m"] == "0.5"

    def test_negative_width_rejected(self):
        request = _request()
        design = RuleDesignValues(left_width_m=-1.0)
        with pytest.raises(RoadGeometryError):
            apply_rule_design_values(request, design)

    def test_warnings_carried(self):
        design = RuleDesignValues(
            warnings=[DesignWarning(rule_id="X2-R-020", message="widen",
                                    target_field="leftWidth")])
        assert design.warnings[0].target_field == "leftWidth"


class TestEndToEnd:
    def test_rule_design_flows_into_result(self):
        request = _request()
        design = RuleDesignValues(left_width_m=7.5, right_width_m=11.9)
        patched = apply_rule_design_values(request, design)
        result = road_geometry_api.evaluate(patched)
        assert result.total_left_width == pytest.approx(7.5)
        assert result.total_right_width == pytest.approx(11.9)
