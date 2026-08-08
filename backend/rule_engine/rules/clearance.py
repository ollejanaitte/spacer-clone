# -*- coding: utf-8 -*-
"""X2-R-023 建築限界（clearance）Rule (STEP-2 S2-UX05).

Road Structure Ordinance: minimum vertical clearance under structures is a
canonical 4.5 m (建築限界 高さ). Width depends on the carriageway/lane
composition and is taken as explicit input here.

This rule checks:
  - requiredClearanceHeight (from road class / design speed, default 4.5 m)
  - providedClearanceHeight (actual headroom under the structure / girder)
  - requiredClearanceWidth vs providedClearanceWidth

Per Step1 P02 the official detailed article table (道示 建築限界) is marked
DEFERRED (needs article OCR). Only the canonical 4.5 m minimum standard is
used; no fabricated per-class values.
"""
from typing import Any, Dict

from ..evaluator import FormulaRule
from ..models import RuleResult, RuleOutput, TraceRecord, ValidationResult

CANONICAL_MIN_CLEARANCE_HEIGHT_M = 4.5


class CLEARANCERule(FormulaRule):
    rule_id = "X2-R-023"
    rule_version = "1.0"
    category = "CLEARANCE"
    title = "建築限界照査（高さ・幅）"
    source_evidence_ids = "SRC-007;RULE-16"
    applicability = "橋梁・門型構造"
    execution_order = 0
    error_code = "LR-RULE-CLEAR-001"
    validation_severity = "ERROR"
    formula_id = "ARTICLE-18"  # 道路構造令 建築限界（標準高さ4.5m）
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "TC-CLEAR-001"

    def get_expected_inputs(self) -> Dict[str, tuple]:
        return {
            "providedClearanceHeight": (float, True),
            "requiredClearanceHeight": (float, False),
            "providedClearanceWidth": (float, False),
            "requiredClearanceWidth": (float, False),
        }

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        errors: list = []
        warnings: list = []
        outputs: list = []

        provided_height = inputs.get("providedClearanceHeight")
        if provided_height is None:
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="CONTRACT_ERROR", severity="CONTRACT_ERROR",
                errors=[ValidationResult(
                    severity="CONTRACT_ERROR", status="CONTRACT_ERROR", rule_id=self.rule_id,
                    error_code=self.error_code,
                    message="providedClearanceHeight は必須")],
                trace=TraceRecord(rule_id=self.rule_id,
                                  source_evidence_ids=self.source_evidence_ids,
                                  input_snapshot=dict(inputs), formula_id=self.formula_id),
            )

        required_height = inputs.get("requiredClearanceHeight")
        if required_height is None:
            required_height = CANONICAL_MIN_CLEARANCE_HEIGHT_M
            outputs.append(RuleOutput(
                name="clearanceHeightSource", value="canonical-min-4.5m", unit="",
                rule_id=self.rule_id))
        else:
            outputs.append(RuleOutput(
                name="clearanceHeightSource", value="explicit-input", unit="",
                rule_id=self.rule_id))

        outputs.append(RuleOutput(name="requiredClearanceHeight", value=required_height,
                                  unit="m", rule_id=self.rule_id))
        outputs.append(RuleOutput(name="providedClearanceHeight", value=provided_height,
                                  unit="m", rule_id=self.rule_id))

        if provided_height < 0:
            errors.append(ValidationResult(
                severity="ERROR", status="ERROR", rule_id=self.rule_id,
                error_code=self.error_code, message="providedClearanceHeight は負にできない"))
        elif provided_height + 1e-9 < required_height:
            errors.append(ValidationResult(
                severity="ERROR", status="ERROR", rule_id=self.rule_id,
                error_code=self.error_code,
                message=f"建築限界高さ {provided_height:.3f} m が基準 {required_height:.3f} m 未満"))
            outputs.append(RuleOutput(name="heightSufficient", value=False, unit=""))
        else:
            outputs.append(RuleOutput(name="heightSufficient", value=True, unit=""))

        provided_width = inputs.get("providedClearanceWidth")
        required_width = inputs.get("requiredClearanceWidth")
        if provided_width is not None and required_width is not None:
            outputs.append(RuleOutput(name="requiredClearanceWidth", value=required_width,
                                      unit="m", rule_id=self.rule_id))
            outputs.append(RuleOutput(name="providedClearanceWidth", value=provided_width,
                                      unit="m", rule_id=self.rule_id))
            if provided_width + 1e-9 < required_width:
                errors.append(ValidationResult(
                    severity="ERROR", status="ERROR", rule_id=self.rule_id,
                    error_code=self.error_code,
                    message=f"建築限界幅 {provided_width:.3f} m が基準 {required_width:.3f} m 未満"))
                outputs.append(RuleOutput(name="widthSufficient", value=False, unit=""))
            else:
                outputs.append(RuleOutput(name="widthSufficient", value=True, unit=""))
        elif provided_width is not None or required_width is not None:
            warnings.append(ValidationResult(
                severity="WARNING", status="WARNING", rule_id=self.rule_id,
                error_code=self.error_code,
                message="幅員照査には provided と required の両方が必要"))

        # 道示の詳細条文数値は DEFERRED である旨を明示
        outputs.append(RuleOutput(
            name="detailedArticleTable", value="DEFERRED (道示条文OCR要)", unit="",
            rule_id=self.rule_id))

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
