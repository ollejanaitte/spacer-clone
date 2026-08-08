# -*- coding: utf-8 -*-
"""X2-R-002 設計速度決定 Rule."""

from typing import Any, Dict
from ..evaluator import TableLookupRule
from ..models import RuleResult, RuleOutput, TraceRecord
from ..lookup import DesignSpeedTable


class DesignSpeedRule(TableLookupRule):
    rule_id = "X2-R-002"
    rule_version = "1.0"
    category = "DESIGN_SPEED"
    title = "設計速度決定"
    source_evidence_ids = "EV-011"
    applicability = "全道路"
    execution_order = 2
    dependencies = ["X2-R-001"]
    error_code = "LR-RULE-SPEED-001"
    validation_severity = "ERROR"
    formula_id = "TABLE-02"
    liner_module = "LINER/INPUT"
    geometry_interface = "ALIGNMENT"
    test_case_ids = "TC-002,TC-003"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        road_class = inputs.get("road_class", "")
        terrain = inputs.get("terrain", "")
        speed = DesignSpeedTable.get(road_class, terrain)
        status = "PASS" if speed > 0 else "ERROR"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status=status, severity=self.validation_severity,
            outputs=[RuleOutput(name="design_speed", value=speed, unit="km/h", rule_id=self.rule_id)],
            error_code="" if status == "PASS" else self.error_code,
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"design_speed": speed}, rule_version=self.rule_version),
        )