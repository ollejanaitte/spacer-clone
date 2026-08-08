# -*- coding: utf-8 -*-
"""X2-R-020 曲線部拡幅（widening）Rule (STEP-2 S2-UX02).

Judgment / check rule for curve widening, based on STEP1 P02 design.

Status of the widening formula table:
  NEEDS_RESEARCH (道路構造令解説 PDF 第17条 拡幅量算定式は OCR 不明瞭,
  RULE_ENGINE_CANDIDATES.csv RULE-09 needs_body_review=YES).
Per the Step2 principle "do not implement unconfirmed values by guess",
this rule does NOT fabricate widening amounts. It:
  1. validates inputs (R, design vehicle, lane count, design speed)
  2. checks applicability (curve radius within widening-relevant range)
  3. reports whether widening must be applied and how the amount should be
     sourced (explicit input) until the official formula table is acquired.
  4. emits a WARNING stating widening_amount is DEFERRED (needs research).

When `inputs["wideningAmount"]` is provided explicitly it is accepted and
checked against the curve radius range; no self-derived expected value is used.
"""
from typing import Any, Dict

from ..evaluator import FormulaRule
from ..models import RuleResult, RuleOutput, TraceRecord, ValidationResult

# Widening-relevant radius threshold (urban: widening usually required
# below ~ 150 m for large vehicles). This threshold itself is a design
# convention; the official table is NEEDS_RESEARCH.
WIDENING_RADIUS_THRESHOLD_M = 150.0
OFFICIAL_TABLE_STATUS = "NEEDS_RESEARCH"


class WIDENINGRule(FormulaRule):
    rule_id = "X2-R-020"
    rule_version = "1.0"
    category = "WIDENING"
    title = "曲線部拡幅（照査・拡幅要否判定）"
    source_evidence_ids = "SRC-007;RULE-09"
    applicability = "曲線部"
    execution_order = 0
    error_code = "LR-RULE-WIDENING-001"
    validation_severity = "WARNING"
    formula_id = "TABLE-17"  # 道路構造令 第17条（数値表はNEEDS_RESEARCH）
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "TC-WIDEN-001"

    def is_applicable(self, context: Dict[str, Any]) -> bool:
        radius = context.get("radius")
        return radius is not None and radius > 0

    def get_expected_inputs(self) -> Dict[str, tuple]:
        return {
            "radius": (float, True),
            "designSpeed": (float, False),
            "designVehicle": (str, False),
            "laneCount": (int, False),
            "wideningAmount": (float, False),
        }

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        errors: list = []
        warnings: list = []
        outputs: list = []

        radius = inputs.get("radius")
        if radius is None:
            radius = context.get("radius")
        if radius is None or radius <= 0:
            errors.append(ValidationResult(
                severity="ERROR", status="ERROR",
                rule_id=self.rule_id, error_code=self.error_code,
                message="radius は正の値が必要"))
            return RuleResult(
                rule_id=self.rule_id, rule_version=self.rule_version,
                title=self.title, status="ERROR", severity=self.validation_severity,
                errors=errors, outputs=outputs,
                trace=TraceRecord(rule_id=self.rule_id,
                                  source_evidence_ids=self.source_evidence_ids,
                                  input_snapshot=dict(inputs), formula_id=self.formula_id),
            )

        widening_required = radius <= WIDENING_RADIUS_THRESHOLD_M
        outputs.append(RuleOutput(name="wideningRequired", value=widening_required, unit=""))
        outputs.append(RuleOutput(name="radius", value=radius, unit="m", rule_id=self.rule_id))
        outputs.append(
            RuleOutput(name="officialTableStatus", value=OFFICIAL_TABLE_STATUS, unit=""))

        # Explicit widening amount (from user / downstream design), checked only.
        explicit = inputs.get("wideningAmount")
        if explicit is not None:
            if explicit < 0:
                errors.append(ValidationResult(
                    severity="ERROR", status="ERROR", rule_id=self.rule_id,
                    error_code=self.error_code, message="wideningAmount は負にできない"))
            else:
                outputs.append(RuleOutput(name="wideningAmount", value=explicit, unit="m",
                                          rule_id=self.rule_id))
                if widening_required and explicit == 0:
                    warnings.append(ValidationResult(
                        severity="WARNING", status="WARNING", rule_id=self.rule_id,
                        error_code=self.error_code,
                        message="拡幅が必要な R で拡幅量が 0（要確認）"))
        elif widening_required:
            warnings.append(ValidationResult(
                severity="WARNING", status="WARNING", rule_id=self.rule_id,
                error_code=self.error_code,
                message="拡幅量は設計書上 NEEDS_RESEARCH（算定式未確定）。"
                        "official 数値表取得までは explicit 入力を使用"))

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
