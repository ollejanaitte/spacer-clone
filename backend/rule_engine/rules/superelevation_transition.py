# -*- coding: utf-8 -*-
"""X2-R-022 片勾配すり付け（superelevation transition）Rule (STEP-2 S2-UX04).

Mirrors the frontend canonical crossfall transition
(frontend/src/liner/core/grid/crossfallResolution.ts buildTransitionState):
  - between two cross-slope intervals, the transverse slope is linearly
    interpolated across the transition gap when both intervals share the same
    pivot distance.
  - t = (x - gapStart) / (gapEnd - gapStart), clamped to [0,1]
  - leftSlope/rightSlope lerped with t; mode = independent if modes differ

This rule computes the resolved crossfall state at a physical distance and
checks consistency (pivot match required; otherwise transition is unresolved).
"""
from typing import Any, Dict, List

from ..evaluator import FormulaRule
from ..models import RuleResult, RuleOutput, TraceRecord, ValidationResult

STATION_EPSILON = 1e-9


def _lerp(left: float, right: float, t: float) -> float:
    return left + (right - left) * t


def resolve_transition(
    gap_start: float,
    gap_end: float,
    station: float,
    left_slope: float,
    right_slope: float,
    left_mode: str,
    right_mode: str,
    left_pivot: float,
    right_pivot: float,
) -> dict:
    """Resolve the transition crossfall at station. Returns dict with resolved state.

    Raises ValueError when the transition is invalid (pivot mismatch or zero gap).
    """
    if abs(left_pivot - right_pivot) > STATION_EPSILON:
        raise ValueError("transition requires matching pivot distance between intervals")
    gap_length = gap_end - gap_start
    if gap_length <= STATION_EPSILON:
        raise ValueError("transition gap must have positive length")

    t = max(0.0, min(1.0, (station - gap_start) / gap_length))
    mode = left_mode if left_mode == right_mode else "independent"
    return {
        "station": station,
        "mode": mode,
        "left_slope_percent": _lerp(left_slope, right_slope, t),
        "right_slope_percent": _lerp(left_slope, right_slope, t),
        "pivot_distance": left_pivot,
        "t": t,
        "source": "transition",
    }


class SUPERELEVATION_TRANSITIONRule(FormulaRule):
    rule_id = "X2-R-022"
    rule_version = "1.0"
    category = "SUPERELEVATION_TRANSITION"
    title = "片勾配すり付け（横断勾配遷移）"
    source_evidence_ids = "SRC-007;RULE-08;RULE-10"
    applicability = "すり付け区間"
    execution_order = 0
    error_code = "LR-RULE-SUPER-TRANS-001"
    validation_severity = "WARNING"
    formula_id = "TRANSITION-LERP"  # frontend buildTransitionState と同一
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "TC-SUPER-TRANS-001"

    def get_expected_inputs(self) -> Dict[str, tuple]:
        return {
            "gapStart": (float, True),
            "gapEnd": (float, True),
            "station": (float, True),
            "leftSlopePercent": (float, True),
            "rightSlopePercent": (float, True),
            "leftMode": (str, False),
            "rightMode": (str, False),
            "leftPivot": (float, True),
            "rightPivot": (float, True),
        }

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        errors: list = []
        outputs: list = []
        try:
            state = resolve_transition(
                gap_start=float(inputs.get("gapStart")),
                gap_end=float(inputs.get("gapEnd")),
                station=float(inputs.get("station")),
                left_slope=float(inputs.get("leftSlopePercent")),
                right_slope=float(inputs.get("rightSlopePercent")),
                left_mode=str(inputs.get("leftMode", "flat")),
                right_mode=str(inputs.get("rightMode", "flat")),
                left_pivot=float(inputs.get("leftPivot", 0.0)),
                right_pivot=float(inputs.get("rightPivot", 0.0)),
            )
        except (TypeError, ValueError) as exc:
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="ERROR", severity=self.validation_severity,
                errors=[ValidationResult(
                    severity="ERROR", status="ERROR", rule_id=self.rule_id,
                    error_code=self.error_code, message=str(exc))],
                trace=TraceRecord(rule_id=self.rule_id,
                                  source_evidence_ids=self.source_evidence_ids,
                                  input_snapshot=dict(inputs), formula_id=self.formula_id),
            )

        for key, unit in (("station", "m"), ("left_slope_percent", "%"),
                          ("right_slope_percent", "%"), ("pivot_distance", "m")):
            outputs.append(RuleOutput(name=key, value=state[key], unit=unit,
                                      rule_id=self.rule_id))
        outputs.append(RuleOutput(name="mode", value=state["mode"], unit="",
                                  rule_id=self.rule_id))
        outputs.append(RuleOutput(name="t", value=state["t"], unit="", rule_id=self.rule_id))

        status = "PASS"
        if state["mode"] == "independent":
            errors.append(ValidationResult(
                severity="ERROR", status="ERROR", rule_id=self.rule_id,
                error_code=self.error_code,
                message="隣接区間のモードが異なるため遷移は unresolved（independent）"))
            status = "ERROR"

        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version,
            title=self.title, status=status, severity=self.validation_severity,
            outputs=outputs, errors=errors,
            trace=TraceRecord(rule_id=self.rule_id,
                              source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={o.name: o.value for o in outputs}),
        )
