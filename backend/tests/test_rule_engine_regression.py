# -*- coding: utf-8 -*-
"""Regression tests for Rule Engine - verifies no regressions from R1."""
import pytest
from backend.rule_engine.loader import load_rules, get_registry
from backend.rule_engine.rules.road_classification import RoadClassificationRule
from backend.rule_engine.rules.design_speed import DesignSpeedRule
from backend.rule_engine.rules.curve_radius import CurveRadiusRule


class TestRegression:
    def setup_method(self):
        load_rules()

    def test_registry_loaded(self):
        reg = get_registry()
        assert reg.size() >= 18

    def test_core_rules_available(self):
        reg = get_registry()
        for rid in ["X2-R-001", "X2-R-002", "X2-R-007"]:
            assert reg.get(rid) is not None

    def test_all_rules_categories(self):
        reg = get_registry()
        assert len(reg.get_by_category("ROAD_CLASSIFICATION")) >= 1
        assert len(reg.get_by_category("DESIGN_SPEED")) >= 1
        assert len(reg.get_by_category("CURVE_RADIUS")) >= 1

    def test_deterministic_results(self):
        rule = CurveRadiusRule()
        r1 = rule.evaluate({"design_speed": 120, "curve_radius": 710}, {})
        r2 = rule.evaluate({"design_speed": 120, "curve_radius": 710}, {})
        assert r1.status == r2.status
        assert r1.outputs[0].value == r2.outputs[0].value

    def test_road_classification_chain(self):
        rc = RoadClassificationRule()
        ds = DesignSpeedRule()
        res1 = rc.evaluate({"road_type": "高速自動車国道", "region": "地方部", "terrain": "平地", "traffic": "30,000以上"}, {})
        assert res1.status == "PASS"
        road_class = res1.outputs[0].value
        assert road_class == "第1種第1級"
        res2 = ds.evaluate({"road_class": road_class, "terrain": "平地"}, {})
        assert res2.status == "PASS"
        assert res2.outputs[0].value == 120