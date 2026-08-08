# -*- coding: utf-8 -*-
"""Road Design Rules - X2-R-020 widening tests (STEP-2 S2-UX02)."""
from __future__ import annotations

import pytest

from backend.rule_engine.rules import load_all_rules
from backend.rule_engine.rules.widening import WIDENINGRule


def _rule():
    for rule in load_all_rules():
        if rule.rule_id == "X2-R-020":
            return rule
    raise AssertionError("X2-R-020 not registered")


class TestWideningRule:
    def test_registered_in_load_all(self):
        rule = _rule()
        assert rule.category == "WIDENING"

    def test_small_radius_requires_widening(self):
        result = _rule().evaluate({"radius": 100.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["wideningRequired"] is True
        assert outputs["officialTableStatus"] == "NEEDS_RESEARCH"
        assert result.status == "WARNING"  # amount deferred

    def test_large_radius_no_widening(self):
        result = _rule().evaluate({"radius": 500.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["wideningRequired"] is False
        assert result.status == "PASS"

    def test_explicit_widening_amount_accepted(self):
        result = _rule().evaluate({"radius": 100.0, "wideningAmount": 0.5}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["wideningAmount"] == 0.5

    def test_zero_widening_on_required_radius_warns(self):
        result = _rule().evaluate({"radius": 100.0, "wideningAmount": 0.0}, {})
        assert result.status == "WARNING"

    def test_negative_radius_error(self):
        result = _rule().evaluate({"radius": -10.0}, {})
        assert result.status == "ERROR"

    def test_negative_widening_amount_error(self):
        result = _rule().evaluate({"radius": 100.0, "wideningAmount": -0.5}, {})
        assert result.status == "ERROR"

    def test_radius_from_context(self):
        result = _rule().evaluate({}, {"radius": 100.0})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["wideningRequired"] is True

    def test_not_applicable_for_straight(self):
        rule = WIDENINGRule()
        assert rule.is_applicable({"radius": None}) is False
