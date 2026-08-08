# -*- coding: utf-8 -*-
"""Focused tests for X4-B-P05: RuleEngine / Road->Bridge adapter contract."""
import pytest

from backend.rule_engine.alignment.model import Alignment
from backend.rule_engine.alignment.contract import (
    ALIGNMENT_RULE_ID, AlignmentGeometryRule, RoadAlignmentError, RoadElementRow,
    build_alignment_from_roadmap, evaluate_alignment_for_rule,
)


def _road_rows():
    return [
        {"kind": "straight", "length": 30.0,
         "parameters": {"startX": 0, "startY": 0, "azimuth": 0}, "id": "s0"},
        {"kind": "arc", "length": 50.0,
         "parameters": {"radius": 100.0, "turn": "left",
                        "startX": 30, "startY": 0, "azimuth": 0}, "id": "a1"},
    ]


class TestRoadToAlignment:
    def test_builds_alignment(self):
        a = build_alignment_from_roadmap("B", _road_rows())
        assert isinstance(a, Alignment)
        assert a.alignment_id == "B"
        assert len(a.spans) == 2
        assert a.total_length == 80.0

    def test_element_types_preserved(self):
        a = build_alignment_from_roadmap("B", _road_rows())
        assert a.spans[0].element_type == "straight"
        assert a.spans[1].element_type == "arc"

    def test_auto_id_when_missing(self):
        rows = [{"kind": "straight", "length": 10.0, "parameters": {}}]
        a = build_alignment_from_roadmap("B", rows)
        assert a.spans[0].element_id == "e0"

    def test_unsupported_kind_rejected(self):
        rows = [{"kind": "parabola", "length": 10.0, "parameters": {}}]
        with pytest.raises(RoadAlignmentError):
            build_alignment_from_roadmap("B", rows)

    def test_dataclass_rows_accepted(self):
        rows = [RoadElementRow(kind="straight", length=10.0, parameters={})]
        a = build_alignment_from_roadmap("B", rows)
        assert a.total_length == 10.0

    def test_origin_station_respected(self):
        a = build_alignment_from_roadmap("B", _road_rows(), origin_station=1000.0)
        assert a.start_station == 1000.0
        assert abs(a.end_station - 1080.0) < 1e-9


class TestRuleBridge:
    def test_rule_evaluation(self):
        a = build_alignment_from_roadmap("B", _road_rows())
        result = evaluate_alignment_for_rule(a, 35.0)
        assert result.rule_id == ALIGNMENT_RULE_ID
        assert result.status == "PASS"
        names = {o.name for o in result.outputs}
        assert {"pointX", "pointY", "azimuth", "curvature", "elementId"} <= names

    def test_rule_delegates_curvature(self):
        a = build_alignment_from_roadmap("B", _road_rows())
        result = evaluate_alignment_for_rule(a, 35.0)
        curvature = next(o for o in result.outputs if o.name == "curvature")
        assert abs(curvature.value - 0.01) < 1e-9

    def test_rule_without_alignment_returns_contract_error(self):
        rule = AlignmentGeometryRule()
        result = rule.evaluate({"station": 0.0}, {"alignment": None})
        assert result.status == "CONTRACT_ERROR"

    def test_rule_out_of_range_error(self):
        a = build_alignment_from_roadmap("B", _road_rows())
        result = evaluate_alignment_for_rule(a, 9999.0)
        assert result.status == "ERROR"