from __future__ import annotations

import warnings
from typing import Any

import numpy as np
from scipy.sparse.linalg import MatrixRankWarning, spsolve

from .assembly import assemble_stiffness, load_vector
from .dof import build_dof_map, constrained_dofs
from .errors import AnalysisError, error_result
from .model import Model, parse_model
from .results import build_success_result, iso_now


def run_analysis(project_data: dict[str, Any]) -> dict[str, Any]:
    started_at = iso_now()
    try:
        model = parse_model(project_data)
        return solve_model(model, started_at)
    except AnalysisError as exc:
        return error_result(
            project_data.get("project", {}).get("id")
            if isinstance(project_data.get("project"), dict)
            else "",
            exc.detail,
        )
    except Exception as exc:
        detail = AnalysisError(
            "SOLVER_ERROR", f"Unexpected analysis failure: {exc}"
        ).detail
        return error_result(
            project_data.get("project", {}).get("id")
            if isinstance(project_data.get("project"), dict)
            else "",
            detail,
        )


def solve_model(model: Model, started_at: str | None = None) -> dict[str, Any]:
    started = started_at or iso_now()
    dof_map = build_dof_map(model)
    assembly = assemble_stiffness(model, dof_map)
    constrained = constrained_dofs(model, dof_map)
    free = np.array(
        [dof for dof in range(dof_map.total_dof) if dof not in set(constrained)],
        dtype=int,
    )
    if free.size == 0:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "No free degrees of freedom remain.",
            path="/supports",
            entity_type="support",
        )
    if not constrained:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "The model has no support constraints.",
            path="/supports",
            entity_type="support",
        )
    displacements_by_case: dict[str, np.ndarray] = {}
    load_vectors_by_case: dict[str, np.ndarray] = {}
    kff = assembly.stiffness[free, :][:, free]
    for case in model.loadCases:
        full_load = load_vector(model, dof_map, assembly, case.id)
        load_vectors_by_case[case.id] = full_load
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", MatrixRankWarning)
                free_u = spsolve(kff, full_load[free])
        except MatrixRankWarning as exc:
            raise AnalysisError(
                "MODEL_UNSTABLE",
                "The stiffness matrix is singular.",
                path="/supports",
                entity_type="support",
            ) from exc
        except Exception as exc:
            raise AnalysisError("SOLVER_ERROR", f"Sparse solve failed: {exc}") from exc
        if np.any(~np.isfinite(free_u)):
            raise AnalysisError(
                "MODEL_UNSTABLE",
                "The stiffness matrix is singular.",
                path="/supports",
                entity_type="support",
            )
        u_full = np.zeros(dof_map.total_dof, dtype=float)
        u_full[free] = free_u
        displacements_by_case[case.id] = u_full
    finished = iso_now()
    return build_success_result(
        model,
        dof_map,
        assembly,
        started,
        finished,
        displacements_by_case,
        load_vectors_by_case,
        constrained,
    )
