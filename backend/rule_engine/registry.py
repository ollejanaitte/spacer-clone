# -*- coding: utf-8 -*-
"""Rule Registry - holds all registered rules."""

from typing import Dict, List, Optional, Any
from .models import RuleResult


class RuleRegistry:
    """Registry of all rules. Rules register themselves by ID."""

    def __init__(self):
        self._rules: Dict[str, Any] = {}

    def register(self, rule: Any) -> None:
        rid = rule.rule_id
        if rid in self._rules:
            raise ValueError(f"Duplicate rule_id: {rid}")
        self._rules[rid] = rule

    def get(self, rule_id: str) -> Any:
        if rule_id not in self._rules:
            raise KeyError(f"Unknown rule: {rule_id}")
        return self._rules[rule_id]

    def get_all(self) -> List[Any]:
        return list(self._rules.values())

    def get_ids(self) -> List[str]:
        return list(self._rules.keys())

    def get_by_category(self, category: str) -> List[Any]:
        return [r for r in self._rules.values() if r.category == category]

    def size(self) -> int:
        return len(self._rules)


# Global registry instance
registry = RuleRegistry()