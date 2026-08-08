# -*- coding: utf-8 -*-
"""Road Design Rules - X2-R-022 superelevation transition tests (STEP-2 S2-UX04)."""
from __future__ import annotations

import pytest

from backend.rule_engine.rules import load_all_rules
from backend.rule_engine.rules.superelevation_transition import resolve_transition


def _rule():
    for rule in load_all_rules():
        if rule.rule_id == "X2-R-022":
            return rule
    raise AssertionError("X2-R-022 not registered")


class TestResolveTransition:
    def test_midpoint_lerp(self):
        state = resolve_transition(
            gap_start=0.0, gap_end=100.0, station=50.0,
            left_slope=-2.0, right_slope=2.0,
            left_mode="one_way", right_mode="one_way",
            left_pivot=0.0, right_pivot=0.0)
        assert state["left_slope_percent"] == pytest.approx(0.0)
        assert state["right_slope_percent"] == pytest.approx(0.0)
        assert state["t"] == pytest.approx(0.5)
        assert state["source"] == "transition"

    def test_clamp_before_start(self):
        state = resolve_transition(10.0, 20.0, 5.0, 0.0, 4.0, "a", "a", 0.0, 0.0)
        assert state["t"] == 0.0
        assert state["left_slope_percent"] == 0.0

    def test_clamp_after_end(self):
        state = resolve_transition(10.0, 20.0, 30.0, 0.0, 4.0, "a", "a", 0.0, 0.0)
        assert state["t"] == 1.0
        assert state["left_slope_percent"] == 4.0

    def test_pivot_mismatch_raises(self):
        with pytest.raises(ValueError):
            resolve_transition(0.0, 10.0, 5.0, 0.0, 2.0, "a", "a", 0.0, 1.0)

    def test_zero_gap_raises(self):
        with pytest.raises(ValueError):
            resolve_transition(0.0, 0.0, 0.0, 0.0, 2.0, "a", "a", 0.0, 0.0)


class TestRule:
    def test_registered(self):
        assert _rule().category == "SUPERELEVATION_TRANSITION"

    def test_evaluate_pass(self):
        result = _rule().evaluate({
            "gapStart": 0.0, "gapEnd": 100.0, "station": 50.0,
            "leftSlopePercent": -2.0, "rightSlopePercent": 2.0,
            "leftMode": "one_way", "rightMode": "one_way",
            "leftPivot": 0.0, "rightPivot": 0.0,
        }, {})
        assert result.status == "PASS"
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["left_slope_percent"] == pytest.approx(0.0)

    def test_mode_mismatch_error(self):
        result = _rule().evaluate({
            "gapStart": 0.0, "gapEnd": 100.0, "station": 50.0,
            "leftSlopePercent": -2.0, "rightSlopePercent": 2.0,
            "leftMode": "one_way", "rightMode": "crown",
            "leftPivot": 0.0, "rightPivot": 0.0,
        }, {})
        assert result.status == "ERROR"

    def test_bad_inputs_error(self):
        result = _rule().evaluate({"gapStart": "x"}, {})
        assert result.status == "ERROR"
