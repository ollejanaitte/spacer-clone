from __future__ import annotations

from typing import Any

from .errors import AnalysisError
from .model import Model, parse_model
from .eigen import run_eigen_analysis, solve_eigen_model
from .influence import run_influence_analysis, solve_influence_model
from .response_spectrum import run_response_spectrum_analysis
from .solver import run_analysis, run_linear_static_analysis, solve_model


def validate_project(project_data: dict[str, Any]) -> dict[str, Any]:
    try:
        parse_model(project_data)
    except AnalysisError as exc:
        return {"valid": False, "errors": [exc.detail.to_dict()]}
    return {"valid": True, "errors": []}


__all__ = [
    "Model",
    "parse_model",
    "run_analysis",
    "run_eigen_analysis",
    "run_influence_analysis",
    "run_linear_static_analysis",
    "run_response_spectrum_analysis",
    "solve_eigen_model",
    "solve_influence_model",
    "solve_model",
    "validate_project",
]

from .bridge_model import (
    BridgeProject,
    CrossSection,
    Span,
    ImpactFactor,
    BridgeLine,
    BridgeLoad,
    BridgeGenerationSettings,
    BridgeDomainError,
    parse_bridge_project,
    bridge_default,
    compute_impact_factor,
)
from .bridge_fem_generator import (
    BridgeFemGenerationError,
    GenerationResult,
    generate_fem_model,
    analyze_generation,
)

__all__ = [
    "Model",
    "parse_model",
    "run_analysis",
    "run_eigen_analysis",
    "run_influence_analysis",
    "run_linear_static_analysis",
    "run_response_spectrum_analysis",
    "solve_eigen_model",
    "solve_influence_model",
    "solve_model",
    "validate_project",
    "BridgeProject",
    "CrossSection",
    "Span",
    "ImpactFactor",
    "BridgeLine",
    "BridgeLoad",
    "BridgeGenerationSettings",
    "BridgeDomainError",
    "parse_bridge_project",
    "bridge_default",
    "compute_impact_factor",
    "BridgeFemGenerationError",
    "GenerationResult",
    "generate_fem_model",
    "analyze_generation",
]
