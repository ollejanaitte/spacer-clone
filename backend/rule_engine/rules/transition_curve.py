# -*- coding: utf-8 -*-
"""X2-R-008 緩和区間・クロソイド設定 Rule."""

from typing import Any, Dict
from ..evaluator import TableLookupRule
from ..models import RuleResult, RuleOutput, TraceRecord


class TRANSITION_CURVERule(TableLookupRule):
    rule_id = "X2-R-008"
    rule_version = "1.0"
    category = "TRANSITION_CURVE"
    title = "緩和区間・クロソイド設定"
    source_evidence_ids = "EV-011"
    applicability = "全道路"
    execution_order = 0
    error_code = "LR-RULE-TRANS-001"
    validation_severity = "WARNING"
    formula_id = "TABLE-07"
    liner_module = "LINER/ALIGNMENT"
    test_case_ids = "TC-001"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        result = "OK"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status="PASS", severity=self.validation_severity,
            outputs=[RuleOutput(name="result", value=result, unit="", rule_id=self.rule_id)],
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"result": result}, rule_version=self.rule_version),
        )
