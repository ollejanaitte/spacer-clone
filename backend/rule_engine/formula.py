# -*- coding: utf-8 -*-
"""Formula Executor - executes formulas and lookup tables."""

from typing import Any, Dict, List
from .models import FormulaType, RuleResult, ValidationResult, TraceRecord, Severity


class FormulaExecutor:
    """Executes formulas for rules."""

    @staticmethod
    def execute(formula_id: str, formula_type: FormulaType, inputs: Dict[str, Any],
                table: Dict = None) -> Any:
        if formula_type == "TABLE_LOOKUP":
            return FormulaExecutor._lookup(formula_id, table, inputs)
        elif formula_type == "DIRECT_FORMULA":
            return FormulaExecutor._compute(formula_id, inputs)
        elif formula_type == "CONDITIONAL":
            return FormulaExecutor._conditional(formula_id, inputs)
        raise ValueError(f"Unknown formula type: {formula_type}")

    @staticmethod
    def _lookup(formula_id: str, table: Dict, inputs: Dict[str, Any]) -> Any:
        if not table:
            raise ValueError(f"Table not provided for {formula_id}")
        key = tuple(inputs.get(k) for k in table.get("_keys", []))
        return table.get("_data", {}).get(key)

    @staticmethod
    def _compute(formula_id: str, inputs: Dict[str, Any]) -> Any:
        raise NotImplementedError(f"Formula {formula_id} not implemented")

    @staticmethod
    def _conditional(formula_id: str, inputs: Dict[str, Any]) -> Any:
        raise NotImplementedError(f"Conditional {formula_id} not implemented")