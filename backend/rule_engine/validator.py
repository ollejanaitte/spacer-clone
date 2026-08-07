# -*- coding: utf-8 -*-
"""Constraint Validator - validates outputs against constraints."""

from typing import Any, Dict, List, Optional
from .models import RuleResult, ValidationResult, Severity


class ConstraintValidator:
    """Validates rule outputs against constraints."""

    @staticmethod
    def validate_min(name: str, value: float, min_val: float,
                     error_code: str, rule_id: str, severity: Severity = "ERROR") -> Optional[ValidationResult]:
        if value < min_val:
            return ValidationResult(
                severity=severity, status="ERROR" if severity == "ERROR" else "WARNING",
                rule_id=rule_id, error_code=error_code,
                message=f"{name} ({value}) < 最小値 ({min_val})",
                developer_message=f"{name}={value} below minimum {min_val}",
                recommended_action=f"Increase {name} to at least {min_val}"
            )
        return None

    @staticmethod
    def validate_max(name: str, value: float, max_val: float,
                     error_code: str, rule_id: str, severity: Severity = "ERROR") -> Optional[ValidationResult]:
        if value > max_val:
            return ValidationResult(
                severity=severity, status="ERROR" if severity == "ERROR" else "WARNING",
                rule_id=rule_id, error_code=error_code,
                message=f"{name} ({value}) > 最大値 ({max_val})",
                developer_message=f"{name}={value} exceeds maximum {max_val}",
                recommended_action=f"Reduce {name} to at most {max_val}"
            )
        return None