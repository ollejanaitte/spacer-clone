# -*- coding: utf-8 -*-
"""Rule Loader - loads and registers rules from the rules package."""

from .registry import registry
from .rules import load_all_rules


def load_rules() -> int:
    """Load all rules from the rules package into the global registry.

    Idempotent: rules already registered are skipped.
    """
    count = 0
    for rule in load_all_rules():
        if rule.rule_id not in registry._rules:
            registry.register(rule)
            count += 1
    return count


def get_rule(rule_id: str):
    return registry.get(rule_id)


def get_registry():
    return registry