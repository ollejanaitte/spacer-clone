# -*- coding: utf-8 -*-
"""Road Design Rules - X2-R-021 curve length tests (STEP-2 S2-UX03)."""
from __future__ import annotations

import pytest

from backend.rule_engine.rules import load_all_rules
from backend.rule_engine.rules.curve_length import minimum_curve_length


def _rule():
    for rule in load_all_rules():
        if rule.rule_id == "X2-R-021":
            return rule
    raise AssertionError("X2-R-021 not registered")


class TestMinimumCurveLength:
    def test_formula(self):
        # V/1.8 = 2 sec travel distance
        assert minimum_curve_length(60.0) == pytest.approx(60.0 / 1.8)
        assert minimum_curve_length(100.0) == pytest.approx(100.0 / 1.8)
        assert minimum_curve_length(40.0) == pytest.approx(40.0 / 1.8)


class TestCurveLengthRule:
    def test_registered(self):
        assert _rule().category == "CURVE_LENGTH"

    def test_sufficient_curve(self):
        result = _rule().evaluate({"designSpeed": 60.0, "curveLength": 40.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["sufficient"] is True
        assert outputs["minimumCurveLength"] == pytest.approx(60.0 / 1.8)
        assert result.status == "PASS"

    def test_insufficient_curve(self):
        result = _rule().evaluate({"designSpeed": 100.0, "curveLength": 40.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["sufficient"] is False
        assert result.status == "WARNING"

    def test_missing_inputs_contract_error(self):
        result = _rule().evaluate({"designSpeed": 60.0}, {})
        assert result.status == "CONTRACT_ERROR"

    def test_negative_curve_error(self):
        result = _rule().evaluate({"designSpeed": 60.0, "curveLength": -5.0}, {})
        assert result.status == "ERROR"
