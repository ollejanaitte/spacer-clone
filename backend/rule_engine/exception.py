# -*- coding: utf-8 -*-
"""Exception Resolver - resolves exception conditions."""

from typing import Any, Dict


class ExceptionResolver:
    """Resolves whether exception conditions apply to a rule."""

    @staticmethod
    def check(exception_rules: Dict[str, bool], context: Dict[str, Any]) -> bool:
        """Return True if any exception applies."""
        for key, condition in exception_rules.items():
            if condition:
                return True
        return False