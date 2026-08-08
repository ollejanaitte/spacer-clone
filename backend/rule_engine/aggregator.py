# -*- coding: utf-8 -*-
"""Rule Result Aggregator - aggregates results from multiple rules."""

from typing import List
from .models import RuleResult, RuleEvaluationResponse, ValidationResult, TraceRecord


class RuleResultAggregator:
    """Aggregates results from multiple rule evaluations."""

    @staticmethod
    def aggregate(results: List[RuleResult], traces: List[TraceRecord] = None) -> RuleEvaluationResponse:
        warnings = []
        errors = []
        for r in results:
            if r.severity == "WARNING":
                warnings.append(ValidationResult(
                    severity="WARNING", status="WARNING", rule_id=r.rule_id,
                    error_code=r.error_code, message=r.title
                ))
            elif r.severity == "ERROR":
                errors.append(ValidationResult(
                    severity="ERROR", status="ERROR", rule_id=r.rule_id,
                    error_code=r.error_code, message=r.title
                ))
        return RuleEvaluationResponse(
            version="1.0",
            results=results,
            warnings=warnings,
            errors=errors,
            trace=traces or [],
        )