# -*- coding: utf-8 -*-
"""Data models for Rule Engine."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Literal
from enum import Enum

Severity = Literal["INFO", "WARNING", "ERROR", "FATAL", "NOT_APPLICABLE", "UNRESOLVED", "CONTRACT_ERROR"]
RuleStatus = Literal["PASS", "WARNING", "ERROR", "FATAL", "NOT_APPLICABLE", "UNRESOLVED", "CONTRACT_ERROR"]
FormulaType = Literal["DIRECT_FORMULA", "TABLE_LOOKUP", "CONDITIONAL", "BOUNDARY_CHECK", "NO_CALC_RULE", "GEOMETRY_DELEGATED"]


@dataclass
class RuleInput:
    name: str
    value: Any
    unit: str = ""
    required: bool = True


@dataclass
class RuleOutput:
    name: str
    value: Any
    unit: str = ""
    rule_id: str = ""


@dataclass
class ValidationResult:
    severity: Severity
    status: RuleStatus
    rule_id: str
    error_code: str = ""
    message: str = ""
    developer_message: str = ""
    recommended_action: str = ""


@dataclass
class TraceRecord:
    rule_id: str
    source_evidence_ids: str
    input_snapshot: Dict[str, Any]
    formula_id: str = ""
    output_snapshot: Dict[str, Any] = field(default_factory=dict)
    validation_result: str = ""
    downstream_consumer: str = ""
    rule_version: str = "1.0"


@dataclass
class RuleResult:
    rule_id: str
    rule_version: str
    title: str
    status: RuleStatus
    severity: Severity
    outputs: List[RuleOutput] = field(default_factory=list)
    validations: List[ValidationResult] = field(default_factory=list)
    warnings: List[ValidationResult] = field(default_factory=list)
    errors: List[ValidationResult] = field(default_factory=list)
    trace: Optional[TraceRecord] = None
    execution_order: int = 0
    error_code: str = ""


@dataclass
class RuleEvaluationRequest:
    project_context: Dict[str, Any]
    inputs: Dict[str, Any]
    geometry_context: Dict[str, Any] = field(default_factory=dict)
    rule_ids: List[str] = field(default_factory=list)
    rule_version: str = "1.0"


@dataclass
class RuleEvaluationResponse:
    version: str
    results: List[RuleResult] = field(default_factory=list)
    warnings: List[ValidationResult] = field(default_factory=list)
    errors: List[ValidationResult] = field(default_factory=list)
    trace: List[TraceRecord] = field(default_factory=list)