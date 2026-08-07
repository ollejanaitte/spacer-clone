# -*- coding: utf-8 -*-
"""X2-R-007 最小曲線半径照査 Rule."""

from typing import Any, Dict
from ..evaluator import FormulaRule
from ..models import RuleResult, RuleOutput, ValidationResult, TraceRecord
from ..lookup import CurveRadiusTable
from ..validator import ConstraintValidator


class CurveRadiusRule(FormulaRule):
    rule_id = "X2-R-007"
    rule_version = "1.0"
    category = "CURVE_RADIUS"
    title = "最小曲線半径照査"
    source_evidence_ids = "EV-011"
    applicability = "曲線部"
    execution_order = 7
    dependencies = ["X2-R-002"]
    error_code = "LR-RULE-RADIUS-001"
    validation_severity = "ERROR"
    formula_id = "TABLE-07"
    liner_module = "LINER/ALIGNMENT"
    geometry_interface = "ALIGNMENT_ELEMENT"
    test_case_ids = "TC-004,TC-005,TC-006,TC-007,TC-018,TC-019,TC-020"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        design_speed = inputs.get("design_speed", 0)
        curve_radius = inputs.get("curve_radius", 0)
        min_radius = CurveRadiusTable.get_min(design_speed)
        desirable = CurveRadiusTable.get_desirable(design_speed)
        outputs = [
            RuleOutput(name="min_radius", value=min_radius, unit="m", rule_id=self.rule_id),
            RuleOutput(name="desirable_radius", value=desirable, unit="m", rule_id=self.rule_id),
        ]
        validations = []
        errors = []
        if curve_radius > 0 and min_radius > 0:
            v = ConstraintValidator.validate_min(
                "曲線半径", float(curve_radius), float(min_radius),
                self.error_code, self.rule_id, self.validation_severity)
            if v:
                validations.append(v)
                errors.append(v)
            if curve_radius < desirable:
                w = ValidationResult(
                    severity="WARNING", status="WARNING", rule_id=self.rule_id,
                    error_code=self.error_code,
                    message=f"曲線半径 ({curve_radius}) < 望ましい値 ({desirable})",
                    developer_message="曲線半径が望ましい値を下回っています",
                    recommended_action="曲線半径を拡大することを検討"
                )
                validations.append(w)
        status = "PASS"
        if errors:
            status = "ERROR"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status=status, severity=self.validation_severity,
            outputs=outputs, validations=validations,
            error_code=self.error_code if errors else "",
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"min_radius": min_radius, "desirable": desirable},
                              validation_result=status, rule_version=self.rule_version),
        )