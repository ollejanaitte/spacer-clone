# -*- coding: utf-8 -*-
"""X2-R-004 車線幅員決定 Rule."""

from typing import Any, Dict
from ..evaluator import TableLookupRule
from ..models import RuleResult, RuleOutput, ValidationResult, TraceRecord


class LaneWidthRule(TableLookupRule):
    rule_id = "X2-R-004"
    rule_version = "1.0"
    category = "LANE_WIDTH"
    title = "車線幅員決定"
    source_evidence_ids = "EV-011"
    applicability = "全道路"
    execution_order = 4
    dependencies = ["X2-R-001"]
    error_code = "LR-RULE-LANE-001"
    validation_severity = "INFO"
    formula_id = "TABLE-04"
    liner_module = "LINER/CROSS-SECTION"
    geometry_interface = "CROSS_SECTION"
    test_case_ids = "TC-004"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        road_class = inputs.get("road_class", "")
        lanes = {
            "第1種第1級": 3.50, "第1種第2級": 3.50, "第1種第3級": 3.25, "第1種第4級": 3.25,
            "第2種第1級": 3.50, "第2種第2級": 3.25,
            "第3種第1級": 3.50, "第3種第2級": 3.25, "第3種第3級": 3.00, "第3種第4級": 2.75,
            "第3種第5級": 2.75,
            "第4種第1級": 3.25, "第4種第2級": 3.00, "第4種第3級": 3.00, "第4種第4級": 2.75,
        }
        width = lanes.get(road_class, 0)
        status = "PASS" if width > 0 else "ERROR"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status=status, severity=self.validation_severity,
            outputs=[RuleOutput(name="lane_width", value=width, unit="m", rule_id=self.rule_id)],
            error_code="" if status == "PASS" else self.error_code,
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"lane_width": width}, rule_version=self.rule_version),
        )