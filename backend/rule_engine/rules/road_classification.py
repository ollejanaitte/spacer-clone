# -*- coding: utf-8 -*-
"""X2-R-001 道路区分決定 Rule."""

from typing import Any, Dict
from ..evaluator import TableLookupRule
from ..models import RuleResult, RuleOutput, TraceRecord
from ..lookup import RoadClassTable


class RoadClassificationRule(TableLookupRule):
    rule_id = "X2-R-001"
    rule_version = "1.0"
    category = "ROAD_CLASSIFICATION"
    title = "道路区分決定"
    source_evidence_ids = "EV-011"
    applicability = "全道路"
    execution_order = 1
    dependencies = []
    error_code = "LR-RULE-CLASS-001"
    validation_severity = "ERROR"
    formula_id = "TABLE-01"
    liner_module = "LINER/INPUT"
    geometry_interface = "ALIGNMENT"
    test_case_ids = "TC-001"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        road_type = inputs.get("road_type", "")
        region = inputs.get("region", "")
        terrain = inputs.get("terrain", "")
        traffic = inputs.get("traffic", "")
        result = RoadClassTable.classify(road_type, region, terrain, traffic)
        status = "PASS" if result != "UNKNOWN" else "ERROR"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status=status, severity=self.validation_severity,
            outputs=[RuleOutput(name="road_class", value=result, unit="-", rule_id=self.rule_id)],
            error_code="" if status == "PASS" else self.error_code,
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"road_class": result}, rule_version=self.rule_version),
        )