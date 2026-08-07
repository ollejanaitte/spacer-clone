# -*- coding: utf-8 -*-
"""Base Rule class that all rules inherit from."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from .models import RuleResult, RuleInput, RuleOutput, ValidationResult, TraceRecord, Severity


class BaseRule(ABC):
    """Abstract base class for all rules."""

    rule_id: str = ""
    rule_version: str = "1.0"
    category: str = ""
    title: str = ""
    source_evidence_ids: str = ""
    applicability: str = ""
    execution_order: int = 0
    dependencies: List[str] = []
    error_code: str = ""
    validation_severity: Severity = "ERROR"
    formula_id: str = ""
    liner_module: str = ""
    geometry_interface: str = ""
    test_case_ids: str = ""

    @abstractmethod
    def evaluate(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> RuleResult:
        ...

    def is_applicable(self, context: Dict[str, Any]) -> bool:
        return True

    def get_expected_inputs(self) -> Dict[str, tuple]:
        return {}


class TableLookupRule(BaseRule):
    """Base class for table-lookup rules."""

    table: Dict[str, Any] = {}

    def lookup(self, key: Any) -> Any:
        return self.table.get(key)


class FormulaRule(BaseRule):
    """Base class for formula-based rules."""

    def compute(self, inputs: Dict[str, Any]) -> Any:
        raise NotImplementedError


class ConditionalRule(BaseRule):
    """Base class for conditional rules."""
    pass