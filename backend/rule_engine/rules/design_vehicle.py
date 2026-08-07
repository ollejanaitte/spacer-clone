# -*- coding: utf-8 -*-
"""X2-R-003 設計車両諸元 Rule."""

from typing import Any, Dict
from ..evaluator import TableLookupRule
from ..models import RuleResult, RuleOutput, TraceRecord


class DesignVehicleRule(TableLookupRule):
    rule_id = "X2-R-003"
    rule_version = "1.0"
    category = "DESIGN_VEHICLE"
    title = "設計車両諸元"
    source_evidence_ids = "EV-011"
    applicability = "全道路"
    execution_order = 3
    error_code = "LR-RULE-VEHICLE-001"
    validation_severity = "ERROR"
    formula_id = "TABLE-03"
    liner_module = "LINER/INPUT"
    geometry_interface = "ALIGNMENT"
    test_case_ids = "TC-003"

    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        vehicle_type = inputs.get("vehicle_type", "")
        specs = {
            "小型自動車": {"length": 4.7, "width": 1.7, "wheelbase": 2.7, "min_radius": 6},
            "普通自動車": {"length": 12.0, "width": 2.5, "wheelbase": 6.5, "min_radius": 12},
            "セミトレーラ連結車": {"length": 16.5, "width": 2.5, "wheelbase": 4.1, "min_radius": 12},
        }
        result = specs.get(vehicle_type, {})
        status = "PASS" if result else "ERROR"
        return RuleResult(
            rule_id=self.rule_id, rule_version=self.rule_version, title=self.title,
            status=status, severity=self.validation_severity,
            outputs=[RuleOutput(name="vehicle_specs", value=result, unit="m", rule_id=self.rule_id)],
            error_code="" if status == "PASS" else self.error_code,
            trace=TraceRecord(rule_id=self.rule_id, source_evidence_ids=self.source_evidence_ids,
                              input_snapshot=dict(inputs), formula_id=self.formula_id,
                              output_snapshot={"vehicle_specs": result}, rule_version=self.rule_version),
        )