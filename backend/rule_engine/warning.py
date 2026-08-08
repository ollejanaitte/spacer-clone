# -*- coding: utf-8 -*-
"""Warning Generator - generates warning results."""

from typing import Any, Dict
from .models import ValidationResult


class WarningGenerator:
    """Generates warning results for rule violations."""

    @staticmethod
    def warn(rule_id: str, error_code: str, message: str,
             developer_message: str = "", recommended_action: str = "") -> ValidationResult:
        return ValidationResult(
            severity="WARNING", status="WARNING", rule_id=rule_id,
            error_code=error_code, message=message,
            developer_message=developer_message or message,
            recommended_action=recommended_action
        )


class ErrorGenerator:
    """Generates error results for rule violations."""

    @staticmethod
    def error(rule_id: str, error_code: str, message: str,
              developer_message: str = "", recommended_action: str = "") -> ValidationResult:
        return ValidationResult(
            severity="ERROR", status="ERROR", rule_id=rule_id,
            error_code=error_code, message=message,
            developer_message=developer_message or message,
            recommended_action=recommended_action
        )