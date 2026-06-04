from __future__ import annotations

from typing import Any

from .errors import AnalysisError
from .model import Model, parse_model
from .solver import run_analysis, solve_model


def validate_project(project_data: dict[str, Any]) -> dict[str, Any]:
    try:
        parse_model(project_data)
    except AnalysisError as exc:
        return {"valid": False, "errors": [exc.detail.to_dict()]}
    return {"valid": True, "errors": []}


__all__ = ["Model", "parse_model", "run_analysis", "solve_model", "validate_project"]
