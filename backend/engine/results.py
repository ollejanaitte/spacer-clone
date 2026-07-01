from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import numpy as np
from numpy.typing import NDArray

from .assembly import Assembly
from .dof import DOF_NAMES, DofMap
from .element import transformation
from .errors import AnalysisError, AnalysisErrorDetail
from .model import Model


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def clean(value: float) -> float:
    if not math.isfinite(value):
        raise AnalysisError("POSTPROCESS_ERROR", "Result contains NaN or Infinity.")
    if abs(value) < 1e-14:
        return 0.0
    return float(value)


def build_success_result(
    model: Model,
    dof_map: DofMap,
    assembly: Assembly,
    started_at: str,
    finished_at: str,
    displacements_by_case: dict[str, NDArray[np.float64]],
    load_vectors_by_case: dict[str, NDArray[np.float64]],
    constrained: list[int],
    warnings: list[AnalysisErrorDetail] | None = None,
) -> dict[str, Any]:
    displacements: list[dict[str, Any]] = []
    reactions: list[dict[str, Any]] = []
    member_forces: list[dict[str, Any]] = []
    constrained_set = set(constrained)
    for case in model.loadCases:
        u_full = displacements_by_case[case.id]
        f_full = load_vectors_by_case[case.id]
        reaction_full = assembly.stiffness @ u_full - f_full
        for node in model.nodes:
            dofs = dof_map.node_dofs(node.id)
            values = u_full[dofs]
            displacements.append(
                {"loadCaseId": case.id, "nodeId": node.id}
                | dict(zip(DOF_NAMES, map(clean, values)))
            )
        for support in model.supports:
            dofs = dof_map.node_dofs(support.nodeId)
            values = reaction_full[dofs]
            reactions.append(
                {
                    "loadCaseId": case.id,
                    "nodeId": support.nodeId,
                    "fx": clean(values[0]),
                    "fy": clean(values[1]),
                    "fz": clean(values[2]),
                    "mx": clean(values[3]),
                    "my": clean(values[4]),
                    "mz": clean(values[5]),
                    "constrainedDofs": [
                        name
                        for index, name in enumerate(DOF_NAMES)
                        if dofs[index] in constrained_set
                    ],
                }
            )
        for state in assembly.element_states:
            transform = transformation(state.rotation)
            u_local = transform @ u_full[state.dofs]
            equiv = state.f_equiv_local_by_case.get(case.id, np.zeros(12, dtype=float))
            forces = state.k_local @ u_local - equiv
            member_forces.append(
                {
                    "loadCaseId": case.id,
                    "memberId": state.member.id,
                    "coordinateSystem": "local",
                    "i": force_dict(forces[:6]),
                    "j": force_dict(forces[6:]),
                }
            )
    duration = (
        datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
        - datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    ).total_seconds()
    warning_dicts = [warning.to_dict() for warning in warnings or []]
    return {
        "projectId": model.project.id,
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "linear_static",
            "status": "warning" if warning_dicts else "success",
            "startedAt": started_at,
            "finishedAt": finished_at,
            "durationMs": clean(duration * 1000.0),
            "nodeCount": len(model.nodes),
            "memberCount": len(model.members),
            "loadCaseCount": len(model.loadCases),
            "totalDof": dof_map.total_dof,
            "freeDof": dof_map.total_dof - len(constrained),
            "constrainedDof": len(constrained),
            "solver": "scipy_sparse",
        },
        "displacements": displacements,
        "reactions": reactions,
        "memberEndForces": member_forces,
        "warnings": warning_dicts,
        "errors": [],
    }


def force_dict(values: NDArray[np.float64]) -> dict[str, float]:
    return {
        "fx": clean(values[0]),
        "fy": clean(values[1]),
        "fz": clean(values[2]),
        "mx": clean(values[3]),
        "my": clean(values[4]),
        "mz": clean(values[5]),
    }
