from __future__ import annotations

import math
import warnings
from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import LinAlgError, LinAlgWarning, eigh, solve

from .assembly import assemble_stiffness
from .dof import DOF_NAMES, build_dof_map, constrained_dofs
from .errors import AnalysisError, error_result
from .model import MassCase, Model, parse_model
from .results import clean, iso_now


def run_eigen_analysis(
    project_data: dict[str, Any],
    *,
    mass_case_id: str | None = None,
    mode_count: int = 6,
) -> dict[str, Any]:
    started_at = iso_now()
    try:
        model = parse_model(project_data)
        return solve_eigen_model(model, started_at, mass_case_id, mode_count)
    except AnalysisError as exc:
        project = project_data.get("project", {})
        project_id = project.get("id", "") if isinstance(project, dict) else ""
        result = error_result(project_id, exc.detail)
        result["analysisSummary"]["analysisType"] = "eigen"
        return result
    except Exception as exc:
        project = project_data.get("project", {})
        project_id = project.get("id", "") if isinstance(project, dict) else ""
        detail = AnalysisError("SOLVER_ERROR", f"Unexpected eigen analysis failure: {exc}").detail
        result = error_result(project_id, detail)
        result["analysisSummary"]["analysisType"] = "eigen"
        return result


def solve_eigen_model(
    model: Model,
    started_at: str,
    mass_case_id: str | None,
    mode_count: int,
) -> dict[str, Any]:
    if mode_count <= 0:
        raise AnalysisError(
            "INVALID_VALUE",
            "modeCount must be greater than zero.",
            path="/modeCount",
        )

    mass_case = select_mass_case(model, mass_case_id)
    dof_map = build_dof_map(model)
    assembly = assemble_stiffness(model, dof_map)
    constrained = constrained_dofs(model, dof_map)
    constrained_set = set(constrained)
    mass_diag = lumped_mass_vector(model, mass_case, dof_map)
    master_dofs = np.array(
        [
            dof
            for dof in range(dof_map.total_dof)
            if dof not in constrained_set and mass_diag[dof] > 0.0
        ],
        dtype=int,
    )
    slave_dofs = np.array(
        [
            dof
            for dof in range(dof_map.total_dof)
            if dof not in constrained_set and mass_diag[dof] == 0.0
        ],
        dtype=int,
    )
    if master_dofs.size == 0:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "No unconstrained positive-mass degrees of freedom remain.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    if mode_count > master_dofs.size:
        raise AnalysisError(
            "INVALID_VALUE",
            "modeCount exceeds the number of positive-mass degrees of freedom.",
            path="/modeCount",
            entity_type="massCase",
            entity_id=mass_case.id,
        )

    kmm = assembly.stiffness[master_dofs, :][:, master_dofs].toarray()
    recovery = slave_recovery_matrix(
        assembly.stiffness,
        master_dofs,
        slave_dofs,
        mass_case,
    )
    if slave_dofs.size > 0:
        kms = assembly.stiffness[master_dofs, :][:, slave_dofs].toarray()
        reduced_stiffness = kmm + kms @ recovery
    else:
        reduced_stiffness = kmm
    reduced_stiffness = 0.5 * (reduced_stiffness + reduced_stiffness.T)
    if np.any(~np.isfinite(reduced_stiffness)):
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "Static condensation produced a non-finite reduced stiffness matrix.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )

    m_diag = mass_diag[master_dofs]
    if np.any(m_diag <= 0.0) or np.any(~np.isfinite(m_diag)):
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "The mass matrix must be positive definite.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    mmm = np.diag(m_diag)

    try:
        eigenvalues, eigenvectors = eigh(reduced_stiffness, mmm, check_finite=True)
    except LinAlgError as exc:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "The stiffness or mass matrix is not suitable for eigen analysis.",
            path="/supports",
        ) from exc

    tolerance = max(model.analysisSettings.tolerance, 1e-12)
    if eigenvalues.size == 0 or np.any(~np.isfinite(eigenvalues)):
        raise AnalysisError("SOLVER_ERROR", "Eigen solver returned invalid values.")
    if float(np.min(eigenvalues)) <= tolerance:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "Zero or negative eigenvalues were detected.",
            path="/supports",
        )

    order = np.argsort(eigenvalues)[:mode_count]
    total_mass_by_direction = total_mass_values(mmm, master_dofs)
    modes = [
        build_mode_result(
            int(index) + 1,
            float(eigenvalues[index]),
            eigenvectors[:, index],
            mmm,
            master_dofs,
            slave_dofs,
            recovery,
            dof_map,
            model,
            total_mass_by_direction,
        )
        for index in order
    ]
    apply_cumulative_effective_mass_ratios(modes)
    finished_at = iso_now()
    return {
        "projectId": model.project.id,
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "eigen",
            "status": "success",
            "startedAt": started_at,
            "finishedAt": finished_at,
            "durationMs": clean(duration_ms(started_at, finished_at)),
            "nodeCount": len(model.nodes),
            "memberCount": len(model.members),
            "loadCaseCount": len(model.loadCases),
            "totalDof": dof_map.total_dof,
            "freeDof": dof_map.total_dof - len(constrained),
            "constrainedDof": len(constrained),
            "solver": "scipy_eigh",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "eigenResult": {
            "massCaseId": mass_case.id,
            "normalization": "mass",
            "totalMassByDirection": total_mass_by_direction,
            "modes": modes,
        },
        "warnings": [],
        "errors": [],
    }


def select_mass_case(model: Model, mass_case_id: str | None) -> MassCase:
    if not model.massCases:
        raise AnalysisError("SCHEMA_ERROR", "At least one mass case is required.", path="/massCases")
    if mass_case_id is None:
        return model.massCases[0]
    for mass_case in model.massCases:
        if mass_case.id == mass_case_id:
            return mass_case
    raise AnalysisError(
        "INVALID_REFERENCE",
        f"Referenced massCaseId does not exist: {mass_case_id}.",
        path="/massCaseId",
        entity_type="massCase",
        entity_id=mass_case_id,
    )


def lumped_mass_vector(
    model: Model, mass_case: MassCase, dof_map: Any
) -> NDArray[np.float64]:
    mass = np.zeros(dof_map.total_dof, dtype=float)
    for item in mass_case.items or []:
        dofs = dof_map.node_dofs(item.nodeId)
        mass[dofs[0]] += item.mx
        mass[dofs[1]] += item.my
        mass[dofs[2]] += item.mz
    return mass


def slave_recovery_matrix(
    stiffness: Any,
    master_dofs: NDArray[np.int_],
    slave_dofs: NDArray[np.int_],
    mass_case: MassCase,
) -> NDArray[np.float64]:
    if slave_dofs.size == 0:
        return np.zeros((0, master_dofs.size), dtype=float)

    kss = stiffness[slave_dofs, :][:, slave_dofs].toarray()
    ksm = stiffness[slave_dofs, :][:, master_dofs].toarray()
    if np.any(~np.isfinite(kss)) or np.any(~np.isfinite(ksm)):
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "The zero-mass slave stiffness partition contains non-finite values.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", LinAlgWarning)
            recovery = -solve(kss, ksm, assume_a="sym", check_finite=False)
    except (LinAlgError, LinAlgWarning, ValueError) as exc:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            (
                "The zero-mass slave stiffness matrix Kss is singular "
                "or numerically singular."
            ),
            path="/supports",
            entity_type="massCase",
            entity_id=mass_case.id,
        ) from exc
    if np.any(~np.isfinite(recovery)):
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "Static condensation produced non-finite zero-mass slave recovery coefficients.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    return recovery


def build_mode_result(
    mode_no: int,
    eigenvalue: float,
    vector: NDArray[np.float64],
    mass_matrix: NDArray[np.float64],
    master_dofs: NDArray[np.int_],
    slave_dofs: NDArray[np.int_],
    recovery: NDArray[np.float64],
    dof_map: Any,
    model: Model,
    total_mass_by_direction: list[dict[str, float | str]],
) -> dict[str, Any]:
    modal_mass = float(vector.T @ mass_matrix @ vector)
    if modal_mass <= 0.0 or not math.isfinite(modal_mass):
        raise AnalysisError("SOLVER_ERROR", "Invalid modal mass was detected.")
    normalized = vector / math.sqrt(modal_mass)
    modal_mass = float(normalized.T @ mass_matrix @ normalized)
    omega = math.sqrt(eigenvalue)
    full = np.zeros(dof_map.total_dof, dtype=float)
    full[master_dofs] = normalized
    if slave_dofs.size > 0:
        full[slave_dofs] = recovery @ normalized
    return {
        "modeNo": mode_no,
        "eigenvalue": clean(eigenvalue),
        "circularFrequency": clean(omega),
        "frequency": clean(omega / (2.0 * math.pi)),
        "period": clean((2.0 * math.pi) / omega),
        "modalMass": clean(modal_mass),
        "participationFactors": participation_values(
            normalized, mass_matrix, master_dofs
        ),
        "effectiveMassRatios": effective_mass_ratios(
            normalized, mass_matrix, master_dofs
        ),
        "effectiveMasses": effective_masses(
            normalized, mass_matrix, master_dofs, total_mass_by_direction
        ),
        "cumulativeEffectiveMassRatios": [],
        "shape": [
            {"nodeId": node.id}
            | dict(
                zip(
                    DOF_NAMES,
                    [clean(value) for value in full[dof_map.node_dofs(node.id)]],
                )
            )
            for node in model.nodes
        ],
    }


def total_mass_values(
    mass_matrix: NDArray[np.float64],
    mass_dofs: NDArray[np.int_],
) -> list[dict[str, float | str]]:
    result: list[dict[str, float | str]] = []
    for direction, offset in (("X", 0), ("Y", 1), ("Z", 2)):
        r = direction_vector(mass_dofs, offset)
        total_mass = float(r.T @ mass_matrix @ r)
        result.append({"direction": direction, "value": clean(total_mass)})
    return result


def effective_masses(
    vector: NDArray[np.float64],
    mass_matrix: NDArray[np.float64],
    mass_dofs: NDArray[np.int_],
    total_mass_by_direction: list[dict[str, float | str]],
) -> list[dict[str, float | str]]:
    totals = {str(item["direction"]): float(item["value"]) for item in total_mass_by_direction}
    ratios = effective_mass_ratios(vector, mass_matrix, mass_dofs)
    return [
        {
            "direction": item["direction"],
            "value": clean(float(item["value"]) * totals.get(str(item["direction"]), 0.0)),
        }
        for item in ratios
    ]


def apply_cumulative_effective_mass_ratios(modes: list[dict[str, Any]]) -> None:
    cumulative = {"X": 0.0, "Y": 0.0, "Z": 0.0}
    for mode in modes:
        values: list[dict[str, float | str]] = []
        ratios = {
            str(item.get("direction", "")): float(item.get("value", 0.0))
            for item in mode.get("effectiveMassRatios", [])
            if isinstance(item, dict)
        }
        for direction in ("X", "Y", "Z"):
            cumulative[direction] += ratios.get(direction, 0.0)
            values.append({"direction": direction, "value": clean(cumulative[direction])})
        mode["cumulativeEffectiveMassRatios"] = values


def participation_values(
    vector: NDArray[np.float64],
    mass_matrix: NDArray[np.float64],
    mass_dofs: NDArray[np.int_],
) -> list[dict[str, float | str]]:
    result: list[dict[str, float | str]] = []
    for direction, offset in (("X", 0), ("Y", 1), ("Z", 2)):
        r = direction_vector(mass_dofs, offset)
        gamma = float(vector.T @ mass_matrix @ r)
        result.append({"direction": direction, "value": clean(gamma)})
    return result


def effective_mass_ratios(
    vector: NDArray[np.float64],
    mass_matrix: NDArray[np.float64],
    mass_dofs: NDArray[np.int_],
) -> list[dict[str, float | str]]:
    result: list[dict[str, float | str]] = []
    for direction, offset in (("X", 0), ("Y", 1), ("Z", 2)):
        r = direction_vector(mass_dofs, offset)
        denominator = float(r.T @ mass_matrix @ r)
        gamma = float(vector.T @ mass_matrix @ r)
        ratio = 0.0 if denominator <= 0.0 else (gamma * gamma) / denominator
        result.append({"direction": direction, "value": clean(ratio)})
    return result


def direction_vector(mass_dofs: NDArray[np.int_], offset: int) -> NDArray[np.float64]:
    return np.array([1.0 if int(dof) % 6 == offset else 0.0 for dof in mass_dofs], dtype=float)


def duration_ms(started_at: str, finished_at: str) -> float:
    from datetime import datetime

    started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    finished = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
    return (finished - started).total_seconds() * 1000.0
