# -*- coding: utf-8 -*-
"""Input Normalizer - validates and normalizes inputs."""

from typing import Any, Dict, List, Tuple
from .models import ValidationResult, Severity


class InputNormalizer:
    """Normalizes and validates input values."""

    @staticmethod
    def normalize(inputs: Dict[str, Any], expected: Dict[str, Tuple[str, bool, str]]) -> List[ValidationResult]:
        results = []
        for name, (typ, required, unit) in expected.items():
            if name not in inputs or inputs[name] is None:
                if required:
                    results.append(ValidationResult(
                        severity="ERROR", status="ERROR", rule_id="",
                        error_code="LR-RULE-INPUT-001",
                        message=f"Missing required input: {name}",
                        developer_message=f"Required input '{name}' not provided",
                        recommended_action=f"Provide '{name}'"
                    ))
                continue
            val = inputs[name]
            if typ == "int" and not isinstance(val, int):
                try:
                    inputs[name] = int(val)
                except (ValueError, TypeError):
                    results.append(ValidationResult(
                        severity="ERROR", status="ERROR", rule_id="",
                        error_code="LR-RULE-INPUT-002",
                        message=f"Invalid type for {name}: expected int",
                        developer_message=f"'{name}' value '{val}' is not int",
                        recommended_action=f"Fix '{name}' type"
                    ))
            elif typ == "float" and not isinstance(val, (int, float)):
                try:
                    inputs[name] = float(val)
                except (ValueError, TypeError):
                    results.append(ValidationResult(
                        severity="ERROR", status="ERROR", rule_id="",
                        error_code="LR-RULE-INPUT-002",
                        message=f"Invalid type for {name}: expected float",
                        developer_message=f"'{name}' value '{val}' is not float",
                        recommended_action=f"Fix '{name}' type"
                    ))
        return results