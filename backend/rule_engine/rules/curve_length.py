# -*- coding: utf-8 -*-
"""X2-R-021 最小曲線長（curve length）Rule (STEP-2 S2-UX03).

Road Structure Ordinance Article 15: the length of a curve shall be at least
the distance travelled in 2 seconds at the design speed.

  L_min [m] = (V/3.6) * 2 = V / 1.8   (V in km/h)

This is the canonical deterministic formula (no unconfirmed table lookup).
The rule compares an input curve length L against L_min and reports
PASS / WARNING / ERROR.
"""
from typing import Any, Dict

from ..evaluator import FormulaRule
from ..models import RuleResult, RuleOutput, TraceRecord, ValidationResult

SECONDS_PER_CURVE = 2.0
KMH_TO_MPS = 1.0 / 3.6


def minimum_curve_length(design_speed_kmh: float) -> float:
    """L_min = (V km/h -> m/s) * 2 seconds = V / 1.8."""
    if design_speed_kmh < 0:
        raise ValueError("design_speed_kmh must be non-negative")
    return design_speed_kmh * KMH_TO_MPS * SECONDS_PER_CURVE


class CURVE_LENGTHRule(FormulaRule):
    rule_id = "X2-R-021"
    rule_version = "1.0"
    category = "CURVE_LENGTH"
    title = "最小曲線長照査（2秒走行距離）"
    source_evidence_ids = "SRC-007;RULE-07;CAND-08"
    applicability = "曲線部"
    execution_order = 0
    error_code = "LR-RULE-CURLEN-001"
    validation_severity = "WARNING"
    formula_id = "ARTICLE-15"  # 道路構造令 第15条: 2秒走行距離
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "TC-CURLEN-001"

    def is_applicable(self, context: Dict[str, Any]) -> bool:
        return True

    def get_expected_inputs(self) -> Dict[str, tuple]:
        return {
            "designSpeed": (float, True),
            "curveLength": (float, True),
            "radius": (float, False),
        }

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        errors: list = []
        warnings: list = []
        outputs: list = []

        design_speed = inputs.get("designSpeed")
        curve_length = inputs.get("curveLength")
        if design_speed is None or curve_length is None:
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="CONTRACT_ERROR", severity="CONTRACT_ERROR",
                errors=[ValidationResult(
                    severity="CONTRACT_ERROR", status="CONTRACT_ERROR", rule_id=self.rule_id,
                    error_code=self.error_code,
                    message="designSpeed と curveLength は必須")],
                trace=TraceRecord(rule_id=self.rule_id,
                                  source_evidence_ids=self.source_evidence_ids,
                                  input_snapshot=dict(inputs), formula_id=self.formula_id),
            )

        l_min = minimum_curve_length(design_speed)
        outputs.append(RuleOutput(name="minimumCurveLength", value=l_min, unit="m",
                                  rule_id=self.rule_id))
        outputs.append(RuleOutput(name="curveLength", value=curve_length, unit="m",
                                  rule_id=self.rule_id))

        if curve_length < 0:
            errors.append(ValidationResult(
                severity="ERROR", status="ERROR", rule_id=self.rule_id,
                error_code=self.error_code, message="curveLength は負にできない"))
        elif curve_length + 1e-9 < l_min:
            warnings.append(ValidationResult(
                severity="WARNING", status="WARNING", rule_id=self.rule_id,
                error_code=self.error_code,
                message=f"曲線長 {curve_length:.3f} m が最小曲線長 {l_min:.3f} m 未満"))
            outputs.append(RuleOutput(name="sufficient", value=False, unit=""))
        else:
            outputs.append(RuleOutput(name="sufficient", value=True, unit=""))

        if errors:
            status = "ERROR"
        elif warnings:
            status = "WARNING"
        else:
            status = "PASS"

        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version,
            title=self.title, status=status, severity=self.validation_severity,
            outputs=outputs, errors=errors, warnings=warnings,
            trace=TraceRecord(rule_id=self.rule_id,
                              source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={o.name: o.value for o in outputs}),
        )
