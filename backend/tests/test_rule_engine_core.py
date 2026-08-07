# -*- coding: utf-8 -*-
"""Tests for LINER Rule Engine core and vertical slice."""
import pytest
from backend.rule_engine.models import (
    RuleResult, RuleInput, RuleOutput, ValidationResult, TraceRecord,
    RuleEvaluationRequest, RuleEvaluationResponse,
)
from backend.rule_engine.registry import registry, RuleRegistry
from backend.rule_engine.lookup import RoadClassTable, DesignSpeedTable, CurveRadiusTable
from backend.rule_engine.normalizer import InputNormalizer
from backend.rule_engine.validator import ConstraintValidator
from backend.rule_engine.trace import TraceRecorder
from backend.rule_engine.aggregator import RuleResultAggregator
from backend.rule_engine.loader import load_rules, get_registry


class TestRegistry:
    def test_register_and_get(self):
        reg = RuleRegistry()
        mock = type("mock", (), {"rule_id": "X2-R-TEST"})()
        reg.register(mock)
        assert reg.get("X2-R-TEST") is not None

    def test_duplicate_rejection(self):
        reg = RuleRegistry()
        mock = type("mock", (), {"rule_id": "X2-R-DUP"})()
        reg.register(mock)
        with pytest.raises(ValueError, match="Duplicate"):
            reg.register(mock)

    def test_unknown_rule(self):
        reg = RuleRegistry()
        with pytest.raises(KeyError, match="Unknown"):
            reg.get("X2-R-NONEXIST")


class TestLookupTables:
    def test_road_classification(self):
        result = RoadClassTable.classify("高速自動車国道", "地方部", "平地", "30,000以上")
        assert result == "第1種第1級"

    def test_road_classification_unknown(self):
        result = RoadClassTable.classify("市道", "都市部", "平地", "100")
        assert result == "UNKNOWN"

    def test_design_speed(self):
        speed = DesignSpeedTable.get("第1種第1級", "平地")
        assert speed == 120

    def test_design_speed_mountain(self):
        speed = DesignSpeedTable.get("第1種第1級", "山地")
        assert speed == 100

    def test_design_speed_unknown(self):
        speed = DesignSpeedTable.get("第3種第5級", "山地")
        assert speed > 0

    def test_curve_radius_min(self):
        r = CurveRadiusTable.get_min(120)
        assert r == 710

    def test_curve_radius_desirable(self):
        r = CurveRadiusTable.get_desirable(120)
        assert r == 1000

    def test_curve_radius_min_20(self):
        r = CurveRadiusTable.get_min(20)
        assert r == 30


class TestNormalizer:
    def test_missing_required(self):
        results = InputNormalizer.normalize({}, {"speed": ("int", True, "km/h")})
        assert len(results) == 1
        assert results[0].severity == "ERROR"

    def test_type_conversion(self):
        inputs = {"speed": "120"}
        results = InputNormalizer.normalize(inputs, {"speed": ("int", True, "km/h")})
        assert len(results) == 0
        assert inputs["speed"] == 120


class TestValidator:
    def test_min_violation(self):
        v = ConstraintValidator.validate_min("R", 500, 710, "ERR", "TEST")
        assert v is not None
        assert v.severity == "ERROR"

    def test_min_pass(self):
        v = ConstraintValidator.validate_min("R", 800, 710, "ERR", "TEST")
        assert v is None

    def test_max_violation(self):
        v = ConstraintValidator.validate_max("grade", 12, 10, "ERR", "TEST")
        assert v is not None


class TestTrace:
    def test_record(self):
        tr = TraceRecorder()
        rec = tr.record("TEST", "EV-001", {"speed": 120})
        assert rec.rule_id == "TEST"
        assert rec.input_snapshot == {"speed": 120}
        assert len(tr.get_traces()) == 1


class TestAggregator:
    def test_aggregate(self):
        r1 = RuleResult(rule_id="R1", rule_version="1.0", title="Test", status="PASS", severity="INFO")
        resp = RuleResultAggregator.aggregate([r1])
        assert len(resp.results) == 1
        assert resp.version == "1.0"


class TestLoader:
    def test_load_rules(self):
        count = load_rules()
        assert count >= 18
        reg = get_registry()
        assert reg.size() >= 18

    def test_rule_ids(self):
        load_rules()
        reg = get_registry()
        ids = reg.get_ids()
        assert "X2-R-001" in ids
        assert "X2-R-002" in ids
        assert "X2-R-007" in ids

    def test_rule_categories(self):
        load_rules()
        reg = get_registry()
        road = reg.get_by_category("ROAD_CLASSIFICATION")
        assert len(road) >= 1