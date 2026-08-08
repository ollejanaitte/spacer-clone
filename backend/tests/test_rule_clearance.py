# -*- coding: utf-8 -*-
"""Road Design Rules - X2-R-023 clearance tests (STEP-2 S2-UX05)."""
from __future__ import annotations

import pytest

from backend.rule_engine.rules import load_all_rules


def _rule():
    for rule in load_all_rules():
        if rule.rule_id == "X2-R-023":
            return rule
    raise AssertionError("X2-R-023 not registered")


class TestClearanceRule:
    def test_registered(self):
        assert _rule().category == "CLEARANCE"

    def test_sufficient_height_canonical_default(self):
        result = _rule().evaluate({"providedClearanceHeight": 5.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["requiredClearanceHeight"] == 4.5
        assert outputs["heightSufficient"] is True
        assert result.status == "PASS"

    def test_insufficient_height_error(self):
        result = _rule().evaluate({"providedClearanceHeight": 4.2}, {})
        assert result.status == "ERROR"

    def test_explicit_required_height(self):
        result = _rule().evaluate(
            {"providedClearanceHeight": 6.0, "requiredClearanceHeight": 6.5}, {})
        assert result.status == "ERROR"

    def test_width_check(self):
        result = _rule().evaluate({
            "providedClearanceHeight": 5.0,
            "providedClearanceWidth": 10.0,
            "requiredClearanceWidth": 11.0,
        }, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert outputs["widthSufficient"] is False
        assert result.status == "ERROR"

    def test_width_partial_warns(self):
        result = _rule().evaluate({
            "providedClearanceHeight": 5.0,
            "providedClearanceWidth": 10.0,
        }, {})
        assert result.status == "WARNING"

    def test_missing_height_contract_error(self):
        result = _rule().evaluate({}, {})
        assert result.status == "CONTRACT_ERROR"

    def test_deferred_detail_marked(self):
        result = _rule().evaluate({"providedClearanceHeight": 5.0}, {})
        outputs = {o.name: o.value for o in result.outputs}
        assert "DEFERRED" in str(outputs["detailedArticleTable"])
