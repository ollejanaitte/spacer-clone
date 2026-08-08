# -*- coding: utf-8 -*-
"""Road Geometry API - P04 RuleRegistry registration tests (X4D-P04).

Verifies AlignmentGeometryRule (X4B-R-001) is part of the canonical rule load
set (backend.rule_engine.rules.load_all_rules) and that registering it into a
RuleRegistry makes it evaluable through the registry.

NOTE: This module does NOT call loader.load_rules() on the global registry so
it does not disturb the order-sensitive rule-engine loader tests. The global
registry verification is exercised in P07 final verification.
"""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import (
    ALIGNMENT_RULE_ID,
    evaluate_alignment_for_rule,
)
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.registry import RuleRegistry
from backend.rule_engine.rules import load_all_rules
from backend.rule_engine.road_geometry import (
    RoadGeometryRequest,
    road_geometry_api,
)


def _straight_alignment(length: float = 100.0, azimuth: float = 0.0):
    return build_alignment(
        "r",
        [StraightElement(id="e0", length=length, start=Vec2D(0, 0), azimuth=azimuth)],
        origin_station=0.0,
    )


def _alignment_rule_from_load_set():
    for rule in load_all_rules():
        if rule.rule_id == ALIGNMENT_RULE_ID:
            return rule
    raise AssertionError(f"{ALIGNMENT_RULE_ID} missing from load_all_rules()")


class TestRuleRegistration:
    def test_rule_in_load_all_rules(self):
        rule = _alignment_rule_from_load_set()
        assert rule.category == "ALIGNMENT"
        assert rule.title == "中心線 測点評価（位置/方位/曲率）"

    def test_register_into_registry(self):
        registry = RuleRegistry()
        rule = _alignment_rule_from_load_set()
        registry.register(rule)
        assert registry.get(ALIGNMENT_RULE_ID) is rule

    def test_rule_evaluates_via_registry(self):
        registry = RuleRegistry()
        registry.register(_alignment_rule_from_load_set())
        rule = registry.get(ALIGNMENT_RULE_ID)
        alignment = _straight_alignment()
        result = rule.evaluate({"station": 50.0, "bearing_units": "radian"},
                               {"alignment": alignment})
        assert result.status == "PASS"
        outputs = {out.name: out.value for out in result.outputs}
        assert outputs["pointX"] == pytest.approx(50.0)
        assert outputs["pointY"] == pytest.approx(0.0)

    def test_registry_rule_matches_helper(self):
        registry = RuleRegistry()
        registry.register(_alignment_rule_from_load_set())
        rule = registry.get(ALIGNMENT_RULE_ID)
        alignment = _straight_alignment()
        via_registry = rule.evaluate({"station": 25.0}, {"alignment": alignment})
        via_helper = evaluate_alignment_for_rule(alignment, 25.0)
        assert via_registry.status == via_helper.status
        assert (via_registry.outputs[0].value
                == pytest.approx(via_helper.outputs[0].value))


class TestFacadeRuleAgreement:
    def test_facade_matches_registered_rule(self):
        rule = _alignment_rule_from_load_set()
        alignment = _straight_alignment()
        rule_result = rule.evaluate({"station": 50.0}, {"alignment": alignment})
        rule_outputs = {out.name: out.value for out in rule_result.outputs}

        request = RoadGeometryRequest(alignment_id="r", station=50.0,
                                      alignment=alignment)
        facade_result = road_geometry_api.evaluate(request)
        assert facade_result.x == pytest.approx(rule_outputs["pointX"])
        assert facade_result.y == pytest.approx(rule_outputs["pointY"])
        assert facade_result.curvature == pytest.approx(rule_outputs["curvature"])
