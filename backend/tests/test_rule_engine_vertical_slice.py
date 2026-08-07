# -*- coding: utf-8 -*-
"""Vertical slice tests for Rule Engine."""
import pytest
from backend.rule_engine.loader import load_rules, get_registry
from backend.rule_engine.rules.road_classification import RoadClassificationRule
from backend.rule_engine.rules.design_speed import DesignSpeedRule
from backend.rule_engine.rules.curve_radius import CurveRadiusRule


class TestVerticalSlice:
    def setup_method(self):
        load_rules()

    def test_road_classification_evaluate(self):
        rule = RoadClassificationRule()
        res = rule.evaluate({"road_type": "高速自動車国道", "region": "地方部", "terrain": "平地", "traffic": "30,000以上"}, {})
        assert res.status == "PASS"
        assert res.outputs[0].value == "第1種第1級"
        assert res.trace is not None
        assert res.trace.source_evidence_ids == "EV-011"

    def test_design_speed_evaluate(self):
        rule = DesignSpeedRule()
        res = rule.evaluate({"road_class": "第1種第1級", "terrain": "平地"}, {})
        assert res.status == "PASS"
        assert res.outputs[0].value == 120
        assert res.outputs[0].unit == "km/h"

    def test_design_speed_error(self):
        rule = DesignSpeedRule()
        res = rule.evaluate({"road_class": "UNKNOWN", "terrain": "平地"}, {})
        assert res.status == "ERROR"

    def test_curve_radius_pass(self):
        rule = CurveRadiusRule()
        res = rule.evaluate({"design_speed": 120, "curve_radius": 710}, {})
        assert res.status == "PASS"
        assert res.outputs[0].value == 710

    def test_curve_radius_error(self):
        rule = CurveRadiusRule()
        res = rule.evaluate({"design_speed": 120, "curve_radius": 500}, {})
        assert res.status == "ERROR"

    def test_curve_radius_warning(self):
        rule = CurveRadiusRule()
        res = rule.evaluate({"design_speed": 120, "curve_radius": 800}, {})
        assert res.status == "PASS"

    def test_project_replay_mainline(self):
        rule = CurveRadiusRule()
        # 実案件 本線 R=1900, 設計速度120
        res = rule.evaluate({"design_speed": 120, "curve_radius": 1900}, {})
        assert res.status == "PASS"

    def test_project_replay_ramp(self):
        rule = CurveRadiusRule()
        # 実案件 ランプ R=320, 設計速度60
        res = rule.evaluate({"design_speed": 60, "curve_radius": 320}, {})
        assert res.status == "PASS"

    def test_traceability(self):
        rule = CurveRadiusRule()
        res = rule.evaluate({"design_speed": 120, "curve_radius": 710}, {})
        assert res.trace.rule_id == "X2-R-007"
        assert res.trace.formula_id == "TABLE-07"
        assert res.trace.validation_result == "PASS"