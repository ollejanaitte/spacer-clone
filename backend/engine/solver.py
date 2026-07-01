from __future__ import annotations

import warnings
from typing import Any

import numpy as np
from scipy.sparse import issparse
from scipy.sparse.linalg import MatrixRankWarning, spsolve

from .assembly import assemble_stiffness, load_vector
from .dof import build_dof_map, constrained_dofs
from .errors import AnalysisError, AnalysisErrorDetail, error_result
from .model import Model, parse_model
from .results import build_success_result, iso_now

NEAR_SINGULAR_CONDITION_LIMIT = 1.0e17
NEAR_ZERO_EIGENVALUE_RELATIVE_LIMIT = 1.0e-17
LARGE_DISPLACEMENT_ABSOLUTE_LIMIT = 1.0e3
LARGE_DISPLACEMENT_SPAN_RATIO_LIMIT = 1.0e3


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


def run_linear_static_analysis(project: dict[str, Any]) -> dict[str, Any]:
    return run_analysis(project)


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
    result_warnings = stiffness_health_warnings(kff)
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
    result_warnings.extend(displacement_health_warnings(model, dof_map, displacements_by_case))
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
        result_warnings,
    )


def stiffness_health_warnings(kff: Any) -> list[AnalysisErrorDetail]:
    try:
        dense = kff.toarray() if issparse(kff) else np.asarray(kff, dtype=float)
        if dense.size == 0:
            return []
        eigenvalues = np.linalg.eigvalsh((dense + dense.T) * 0.5)
        max_abs = float(np.max(np.abs(eigenvalues)))
        min_abs = float(np.min(np.abs(eigenvalues)))
        if max_abs <= 0.0:
            return [
                AnalysisErrorDetail(
                    "NEAR_SINGULAR_STIFFNESS",
                    "Stiffness matrix has no positive scale; model may be under-constrained.",
                    path="/supports",
                    entityType="support",
                    entityId=None,
                )
            ]
        condition = max_abs / max(min_abs, np.finfo(float).tiny)
        if (
            condition > NEAR_SINGULAR_CONDITION_LIMIT
            or min_abs < max_abs * NEAR_ZERO_EIGENVALUE_RELATIVE_LIMIT
        ):
            return [
                AnalysisErrorDetail(
                    "NEAR_SINGULAR_STIFFNESS",
                    (
                        "Stiffness matrix is near singular; model may be under-constrained. "
                        f"Estimated condition number: {condition:.3e}."
                    ),
                    path="/supports",
                    entityType="support",
                    entityId=None,
                )
            ]
    except Exception:
        return []
    return []


def displacement_health_warnings(
    model: Model,
    dof_map: Any,
    displacements_by_case: dict[str, np.ndarray],
) -> list[AnalysisErrorDetail]:
    span = model_span(model)
    threshold = max(
        LARGE_DISPLACEMENT_ABSOLUTE_LIMIT,
        span * LARGE_DISPLACEMENT_SPAN_RATIO_LIMIT,
    )
    max_item: tuple[str, str, float] | None = None
    for case_id, values in displacements_by_case.items():
        for node in model.nodes:
            dofs = dof_map.node_dofs(node.id)
            magnitude = float(np.linalg.norm(values[dofs[:3]]))
            if max_item is None or magnitude > max_item[2]:
                max_item = (case_id, node.id, magnitude)
    if max_item and max_item[2] > threshold:
        case_id, node_id, magnitude = max_item
        return [
            AnalysisErrorDetail(
                "LARGE_DISPLACEMENT",
                (
                    "Large displacement detected; check support conditions and releases. "
                    f"Max translation {magnitude:.3e} at node {node_id} in load case {case_id}."
                ),
                path="/supports",
                entityType="node",
                entityId=node_id,
            )
        ]
    return []


def model_span(model: Model) -> float:
    if not model.nodes:
        return 1.0
    coords = np.array([[node.x, node.y, node.z] for node in model.nodes], dtype=float)
    size = np.max(coords, axis=0) - np.min(coords, axis=0)
    return max(float(np.linalg.norm(size)), 1.0)
