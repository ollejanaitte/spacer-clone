from __future__ import annotations

import math
from typing import Any, Literal

import numpy as np
from numpy.typing import NDArray
from scipy.sparse import csr_matrix

from .assembly import Assembly, assemble_stiffness
from .dof import build_dof_map, constrained_dofs
from .eigen import run_eigen_analysis
from .element import transformation
from .errors import AnalysisError, error_result
from .model import parse_model
from .results import clean, iso_now

Direction = Literal["X", "Y", "Z"]
CombinationMethod = Literal["SRSS", "CQC"]
InterpolationMethod = Literal["linear", "logLog"]
DIRECTION_DOF: dict[str, str] = {"X": "ux", "Y": "uy", "Z": "uz"}
ALL_DIRECTIONS: tuple[Direction, ...] = ("X", "Y", "Z")

DEFAULT_SPECTRUM = [
    {"period": 0.0, "value": 1.0},
    {"period": 0.1, "value": 1.0},
    {"period": 1.0, "value": 1.0},
]

CQC_EPSILON = 1e-12


def run_response_spectrum_analysis(
    project_data: dict[str, Any],
    request: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run response spectrum analysis from the eigen result.

    Supported features:
    - pseudo acceleration spectrum Sa in m/s^2
    - linear interpolation (default) and log-log interpolation
    - out-of-range clamp
    - X/Y/Z direction
    - SRSS (default) and CQC combination
    - directionResults aggregates single-direction runs into a list
    - modal reactions and member section forces are computed from K*u
    """
    started_at = iso_now()
    request = request or {}
    try:
        mass_case_id = read_mass_case_id(project_data, request)
        mode_count = read_int(request, "modeCount", default_mode_count(project_data))
        if mode_count < 1:
            raise AnalysisError(
                "INVALID_VALUE",
                "modeCount must be at least 1.",
                path="/modeCount",
            )
        direction = read_direction(
            request.get("direction", default_direction(project_data))
        )
        damping_ratio = read_float(
            request, "dampingRatio", default_damping_ratio(project_data)
        )
        if damping_ratio < 0.0:
            raise AnalysisError(
                "INVALID_VALUE",
                "dampingRatio must be non-negative.",
                path="/dampingRatio",
            )
        spectrum_case_id = str(request.get("spectrumCaseId") or "spec-1")
        interpolation_method = read_interpolation_method(
            request.get("interpolationMethod", default_interpolation_method(project_data))
        )
        combination_method = read_combination_method(
            request.get("combinationMethod", default_combination_method(project_data))
        )
        spectrum_points = read_spectrum_points(
            request["spectrumPoints"]
            if "spectrumPoints" in request
            else DEFAULT_SPECTRUM
        )
        target_cumulative_mass_ratio = read_float(
            request,
            "targetCumulativeMassRatio",
            0.9,
        )
        if not 0.0 < target_cumulative_mass_ratio <= 1.0:
            raise AnalysisError(
                "INVALID_VALUE",
                "targetCumulativeMassRatio must be greater than 0 and at most 1.",
                path="/targetCumulativeMassRatio",
            )

        eigen_result = run_eigen_analysis(
            project_data,
            mass_case_id=mass_case_id,
            mode_count=mode_count,
        )
        if eigen_result.get("errors"):
            eigen_result["analysisSummary"]["analysisType"] = "response_spectrum"
            return eigen_result

        # Try to assemble the stiffness matrix from the original model so that
        # modal reactions / member forces can be computed.
        internal = _try_build_internal(project_data, eigen_result)

        response = build_response_spectrum_result(
            eigen_result,
            spectrum_case_id=spectrum_case_id,
            direction=direction,
            damping_ratio=damping_ratio,
            spectrum_points=spectrum_points,
            target_cumulative_mass_ratio=target_cumulative_mass_ratio,
            combination_method=combination_method,
            interpolation_method=interpolation_method,
            internal=internal,
        )
        finished_at = iso_now()
        eigen_result["analysisSummary"]["analysisType"] = "response_spectrum"
        eigen_result["analysisSummary"]["startedAt"] = started_at
        eigen_result["analysisSummary"]["finishedAt"] = finished_at
        eigen_result["analysisSummary"]["durationMs"] = clean(
            duration_ms(started_at, finished_at)
        )
        eigen_result["responseSpectrumResult"] = response
        return eigen_result
    except AnalysisError as exc:
        project = project_data.get("project", {})
        project_id = project.get("id", "") if isinstance(project, dict) else ""
        result = error_result(project_id, exc.detail)
        result["analysisSummary"]["analysisType"] = "response_spectrum"
        return result
    except Exception as exc:
        project = project_data.get("project", {})
        project_id = project.get("id", "") if isinstance(project, dict) else ""
        detail = AnalysisError(
            "SOLVER_ERROR",
            f"Unexpected response spectrum analysis failure: {exc}",
        ).detail
        result = error_result(project_id, detail)
        result["analysisSummary"]["analysisType"] = "response_spectrum"
        return result


def _try_build_internal(
    project_data: dict[str, Any], eigen_result: dict[str, Any]
) -> dict[str, Any] | None:
    """Rebuild dof_map / assembly from the project. Returns None on failure."""
    try:
        model = parse_model(project_data)
        dof_map = build_dof_map(model)
        assembly = assemble_stiffness(model, dof_map)
        constrained = constrained_dofs(model, dof_map)
    except Exception:
        return None
    return {
        "model": model,
        "dof_map": dof_map,
        "assembly": assembly,
        "constrained": constrained,
    }


def build_response_spectrum_result(
    result: dict[str, Any],
    *,
    spectrum_case_id: str,
    direction: Direction,
    damping_ratio: float,
    spectrum_points: list[dict[str, float]],
    target_cumulative_mass_ratio: float,
    combination_method: CombinationMethod = "SRSS",
    interpolation_method: InterpolationMethod = "linear",
    internal: dict[str, Any] | None = None,
) -> dict[str, Any]:
    eigen = result.get("eigenResult")
    if not isinstance(eigen, dict):
        raise AnalysisError(
            "SOLVER_ERROR", "Eigen result is required for response spectrum analysis."
        )
    modes = eigen.get("modes")
    if not isinstance(modes, list) or not modes:
        raise AnalysisError(
            "SOLVER_ERROR", "Eigen modes are required for response spectrum analysis."
        )

    used_modes = select_used_modes(modes, direction, target_cumulative_mass_ratio)
    modal_results = [
        modal_response(
            mode,
            direction,
            spectrum_points,
            interpolation_method=interpolation_method,
            internal=internal,
        )
        for mode in used_modes
    ]
    combined = combine_modal(
        modal_results,
        combination_method=combination_method,
        damping_ratio=damping_ratio,
        modes=used_modes,
    )
    reached_cumulative_mass_ratio = directional_value(
        used_modes[-1].get("cumulativeEffectiveMassRatios", []),
        direction,
    )
    if reached_cumulative_mass_ratio < target_cumulative_mass_ratio:
        result["analysisSummary"]["status"] = "warning"
        result.setdefault("warnings", []).append(
            {
                "code": "INSUFFICIENT_MODES",
                "message": (
                    "INSUFFICIENT_MODES: cumulative effective mass ratio "
                    f"{reached_cumulative_mass_ratio:.6g} did not reach target "
                    f"{target_cumulative_mass_ratio:.6g}; used {len(used_modes)} "
                    f"mode(s) for direction {direction}."
                ),
                "path": "/modeCount",
                "entityType": None,
                "entityId": None,
            }
        )

    direction_entry: dict[str, Any] = {
        "direction": direction,
        "combinationMethod": combination_method,
        "dampingRatio": clean(damping_ratio),
        "interpolationMethod": interpolation_method,
        "usedModes": [int(mode["modeNo"]) for mode in used_modes],
        "modalResults": modal_results,
        "combinedResult": combined,
    }
    # directionResults stores an entry per direction. For single-direction runs
    # this contains only the requested direction. This keeps the schema forward
    # compatible with future multi-direction composition.
    direction_results: list[dict[str, Any]] = [direction_entry]

    return {
        "spectrumCaseId": spectrum_case_id,
        "direction": direction,
        "dampingRatio": clean(damping_ratio),
        "combinationMethod": combination_method,
        "interpolationMethod": interpolation_method,
        "targetCumulativeMassRatio": clean(target_cumulative_mass_ratio),
        "usedModes": [int(mode["modeNo"]) for mode in used_modes],
        "modalResults": modal_results,
        "combinedResult": combined,
        "directionResults": direction_results,
    }


def modal_response(
    mode: dict[str, Any],
    direction: Direction,
    spectrum_points: list[dict[str, float]],
    *,
    interpolation_method: InterpolationMethod = "linear",
    internal: dict[str, Any] | None = None,
) -> dict[str, Any]:
    period = float(mode.get("period", 0.0))
    omega = float(mode.get("circularFrequency", 0.0))
    if omega <= 0.0 or not math.isfinite(omega):
        raise AnalysisError("SOLVER_ERROR", "Invalid circular frequency in eigen mode.")
    sa = interpolate_spectrum(period, spectrum_points, interpolation_method)
    gamma = directional_value(mode.get("participationFactors", []), direction)
    scale = gamma * sa / (omega * omega)
    displacements = [scale_shape_item(item, scale) for item in mode.get("shape", [])]
    reactions: list[dict[str, Any]] = []
    member_section_forces: list[dict[str, Any]] = []
    if internal is not None:
        try:
            reactions = compute_reactions(internal, displacements)
            member_section_forces = compute_member_section_forces(
                internal, displacements
            )
        except AnalysisError:
            reactions = []
            member_section_forces = []
    return {
        "modeNo": int(mode["modeNo"]),
        "spectralAcceleration": clean(sa),
        "participationFactor": clean(gamma),
        "modalCoordinate": clean(scale),
        "displacements": displacements,
        "reactions": reactions,
        "memberSectionForces": member_section_forces,
    }


def combine_modal(
    modal_results: list[dict[str, Any]],
    *,
    combination_method: CombinationMethod,
    damping_ratio: float,
    modes: list[dict[str, Any]],
) -> dict[str, Any]:
    if combination_method == "CQC":
        combined_disp = combine_cqc(modal_results, damping_ratio, modes, key="displacements", components=DEFAULT_DISP_COMPONENTS)
        combined_react = combine_cqc(modal_results, damping_ratio, modes, key="reactions", components=DEFAULT_REACT_COMPONENTS)
        combined_member = combine_cqc_member(
            modal_results, damping_ratio, modes
        )
    else:
        combined_disp = combine_srss(modal_results, key="displacements", components=DEFAULT_DISP_COMPONENTS, wrap=False)
        combined_react = combine_srss(modal_results, key="reactions", components=DEFAULT_REACT_COMPONENTS, wrap=False)
        combined_member = combine_srss_member(modal_results)

    return {
        "method": combination_method,
        "displacements": combined_disp,
        "reactions": combined_react,
        "memberSectionForces": combined_member,
    }


DEFAULT_DISP_COMPONENTS = ("ux", "uy", "uz", "rx", "ry", "rz")
DEFAULT_REACT_COMPONENTS = ("fx", "fy", "fz", "mx", "my", "mz")


def combine_srss(
    modal_results: list[dict[str, Any]],
    *legacy_args: Any,
    **kwargs: Any,
) -> Any:
    """Backwards-compatible SRSS combiner.

    Legacy positional call: ``combine_srss(modal_results)`` returns a dict with
    the keys ``{"method", "displacements", "reactions", "memberSectionForces"}``.

    Modern call: ``combine_srss(modal_results, *, key=..., components=...,
    id_key=..., wrap=...)``. ``wrap=False`` returns the raw list of items.
    """
    # Legacy positional call: ``combine_srss(modal_results)`` returns a dict.
    # If any keyword argument is provided we treat the call as modern and
    # return a raw list (wrap=False by default unless explicitly requested).
    if legacy_args:
        # Unexpected positional arguments; fall back to legacy behaviour.
        wrap = kwargs.pop("wrap", True)
    elif kwargs:
        wrap = kwargs.pop("wrap", False)
    else:
        wrap = True
    key = kwargs.pop("key", "displacements")
    components = kwargs.pop("components", DEFAULT_DISP_COMPONENTS)
    id_key = kwargs.pop("id_key", "nodeId")
    bucket: dict[str, dict[str, float]] = {}
    for modal in modal_results:
        for item in modal.get(key, []) or []:
            entry = bucket.setdefault(
                str(item[id_key]),
                {component: 0.0 for component in components},
            )
            for component in components:
                value = float(item.get(component, 0.0))
                entry[component] += value * value
    out: list[dict[str, Any]] = []
    for node_id, values in sorted(bucket.items()):
        record: dict[str, Any] = {id_key: node_id}
        for component, value in values.items():
            record[component] = clean(math.sqrt(value))
        out.append(record)
    if wrap:
        return {
            "method": "SRSS",
            key: out,
            "reactions": [],
            "memberSectionForces": [],
        }
    return out


def combine_srss_member(
    modal_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    bucket: dict[tuple[str, float], dict[str, float]] = {}
    for modal in modal_results:
        for item in modal.get("memberSectionForces", []) or []:
            key = (str(item["memberId"]), float(item["station"]))
            entry = bucket.setdefault(
                key,
                {"N": 0.0, "Qy": 0.0, "Qz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0},
            )
            component = str(item.get("component", ""))
            value = float(item.get("value", 0.0))
            if component in entry:
                entry[component] += value * value
    return [
        {
            "memberId": member_id,
            "station": station,
            "component": component,
            "value": clean(math.sqrt(value)),
        }
        for (member_id, station), values in sorted(bucket.items())
        for component, value in values.items()
    ]


def combine_cqc(
    modal_results: list[dict[str, Any]],
    damping_ratio: float,
    modes: list[dict[str, Any]],
    *,
    key: str = "displacements",
    components: tuple[str, ...] = DEFAULT_DISP_COMPONENTS,
    id_key: str = "nodeId",
) -> list[dict[str, Any]]:
    """Apply CQC combination to per-node vectors.

    Returns a raw list of items. The legacy dict wrapper is not used here
    because the public ``combine_modal`` function always wraps the result
    explicitly.
    """
    n = len(modal_results)
    if n == 0:
        return []
    if n != len(modes):
        return combine_srss(modal_results, key=key, components=components, id_key=id_key, wrap=False)
    omegas = [float(m.get("circularFrequency", 0.0)) for m in modes]
    rho = cqc_cross_correlation_matrix(omegas, damping_ratio)
    bucket: dict[str, dict[str, float]] = {}
    for i, modal_i in enumerate(modal_results):
        for item in modal_i.get(key, []) or []:
            entry = bucket.setdefault(
                str(item[id_key]),
                {component: 0.0 for component in components},
            )
            vi = {component: float(item.get(component, 0.0)) for component in components}
            for j, modal_j in enumerate(modal_results):
                vj_items = {
                    str(x[id_key]): x
                    for x in modal_j.get(key, []) or []
                }
                vj_entry = vj_items.get(str(item[id_key]))
                if vj_entry is None:
                    continue
                vj = {
                    component: float(vj_entry.get(component, 0.0))
                    for component in components
                }
                weight = rho[i][j]
                for component in components:
                    entry[component] += weight * vi[component] * vj[component]
    out: list[dict[str, Any]] = []
    for node_id, values in sorted(bucket.items()):
        record: dict[str, Any] = {id_key: node_id}
        for component, value in values.items():
            record[component] = clean(math.sqrt(max(value, 0.0)))
        out.append(record)
    return out


def combine_cqc_member(
    modal_results: list[dict[str, Any]],
    damping_ratio: float,
    modes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    n = len(modal_results)
    if n == 0:
        return []
    if n != len(modes):
        return combine_srss_member(modal_results)
    omegas = [float(m.get("circularFrequency", 0.0)) for m in modes]
    rho = cqc_cross_correlation_matrix(omegas, damping_ratio)
    bucket: dict[tuple[str, float], dict[str, float]] = {}
    for i, modal_i in enumerate(modal_results):
        for item in modal_i.get("memberSectionForces", []) or []:
            station_key = float(item["station"])
            key = (str(item["memberId"]), station_key)
            entry = bucket.setdefault(
                key,
                {"N": 0.0, "Qy": 0.0, "Qz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0},
            )
            component = str(item.get("component", ""))
            if component not in entry:
                continue
            value_i = float(item.get("value", 0.0))
            for j, modal_j in enumerate(modal_results):
                target = next(
                    (
                        x
                        for x in modal_j.get("memberSectionForces", []) or []
                        if str(x.get("memberId", "")) == key[0]
                        and float(x.get("station", 0.0)) == station_key
                        and str(x.get("component", "")) == component
                    ),
                    None,
                )
                if target is None:
                    continue
                value_j = float(target.get("value", 0.0))
                entry[component] += rho[i][j] * value_i * value_j
    return [
        {
            "memberId": member_id,
            "station": station,
            "component": component,
            "value": clean(math.sqrt(max(value, 0.0))),
        }
        for (member_id, station), values in sorted(bucket.items())
        for component, value in values.items()
    ]


def cqc_cross_correlation_matrix(
    omegas: list[float], damping_ratio: float
) -> list[list[float]]:
    """Compute the CQC cross-correlation matrix.

    rho_ij = (8 * sqrt(h_i * h_j) * (beta_ij + h_i * h_j) * beta_ij**1.5) /
             ((1 - beta_ij**2)**2 + 4 * h_i * h_j * beta_ij * (1 + beta_ij**2) +
              4 * (h_i**2 + h_j**2) * beta_ij**2)
    beta_ij = omega_j / omega_i, with rho_ij = rho_ji to keep symmetry.
    Self terms (i == j) reduce to 1.
    """
    n = len(omegas)
    h = max(float(damping_ratio), 0.0)
    matrix: list[list[float]] = [[0.0] * n for _ in range(n)]
    for i in range(n):
        matrix[i][i] = 1.0
        wi = omegas[i]
        if not math.isfinite(wi) or wi <= 0.0:
            continue
        for j in range(i + 1, n):
            wj = omegas[j]
            if not math.isfinite(wj) or wj <= 0.0:
                continue
            beta = wj / wi
            if abs(beta - 1.0) < 1e-9:
                # Coincident frequencies: modes are perfectly correlated.
                rho = 1.0
            else:
                num = 8.0 * math.sqrt(h * h) * (beta + h * h) * (beta ** 1.5)
                denom = (
                    (1.0 - beta ** 2) ** 2
                    + 4.0 * h * h * beta * (1.0 + beta ** 2)
                    + 4.0 * (h * h + h * h) * beta ** 2
                )
                if abs(denom) < CQC_EPSILON:
                    rho = 0.0
                else:
                    rho = num / denom
                if not math.isfinite(rho):
                    rho = 0.0
            # Clamp into the valid correlation range.
            rho = max(-1.0, min(1.0, rho))
            matrix[i][j] = rho
            matrix[j][i] = rho
    return matrix


def select_used_modes(
    modes: list[dict[str, Any]],
    direction: Direction,
    target_cumulative_mass_ratio: float,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for mode in modes:
        selected.append(mode)
        cumulative = directional_value(
            mode.get("cumulativeEffectiveMassRatios", []), direction
        )
        if cumulative >= target_cumulative_mass_ratio:
            break
    return selected


def interpolate_spectrum(
    period: float,
    points: list[dict[str, float]],
    method: InterpolationMethod = "linear",
) -> float:
    if method == "logLog":
        return _interpolate_log_log(period, points)
    return _interpolate_linear(period, points)


def _interpolate_linear(period: float, points: list[dict[str, float]]) -> float:
    if period <= points[0]["period"]:
        return points[0]["value"]
    if period >= points[-1]["period"]:
        return points[-1]["value"]
    for i in range(1, len(points)):
        if period <= points[i]["period"]:
            left = points[i - 1]
            right = points[i]
            ratio = (period - left["period"]) / (right["period"] - left["period"])
            return left["value"] + ratio * (right["value"] - left["value"])
    return points[-1]["value"]


def _interpolate_log_log(period: float, points: list[dict[str, float]]) -> float:
    """Log-log interpolation. Requires period > 0 and value > 0; otherwise
    fall back to linear interpolation. This avoids log(0) blowups for
    periods or values at the lower bound.
    """
    if period <= 0.0 or points[0]["value"] <= 0.0 or points[-1]["value"] <= 0.0:
        return _interpolate_linear(period, points)
    if period <= points[0]["period"]:
        return points[0]["value"]
    if period >= points[-1]["period"]:
        return points[-1]["value"]
    for i in range(1, len(points)):
        if period <= points[i]["period"]:
            left = points[i - 1]
            right = points[i]
            if left["value"] <= 0.0 or right["value"] <= 0.0:
                return _interpolate_linear(period, points)
            log_period = math.log(period)
            log_left_period = math.log(left["period"])
            log_right_period = math.log(right["period"])
            log_left_value = math.log(left["value"])
            log_right_value = math.log(right["value"])
            ratio = (log_period - log_left_period) / (
                log_right_period - log_left_period
            )
            log_value = log_left_value + ratio * (log_right_value - log_left_value)
            return math.exp(log_value)
    return points[-1]["value"]


def _full_dof_vector(
    dof_map: Any,
    model: Any,
    displacements: list[dict[str, Any]],
) -> NDArray[np.float64]:
    """Build a full-DOF displacement vector from a per-node modal shape."""
    vector = np.zeros(dof_map.total_dof, dtype=float)
    by_node = {str(item["nodeId"]): item for item in displacements}
    for node in model.nodes:
        item = by_node.get(node.id)
        if item is None:
            continue
        dofs = dof_map.node_dofs(node.id)
        values = np.asarray(
            [
                float(item.get("ux", 0.0)),
                float(item.get("uy", 0.0)),
                float(item.get("uz", 0.0)),
                float(item.get("rx", 0.0)),
                float(item.get("ry", 0.0)),
                float(item.get("rz", 0.0)),
            ]
        )
        vector[dofs] = values
    return vector


def compute_reactions(
    internal: dict[str, Any],
    displacements: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    dof_map = internal["dof_map"]
    assembly: Assembly = internal["assembly"]
    model = internal["model"]
    constrained = internal["constrained"]
    u_full = _full_dof_vector(dof_map, model, displacements)
    stiffness: csr_matrix = assembly.stiffness
    reaction_full = stiffness @ u_full
    constrained_set = set(constrained)
    nodes_by_id = {node.id: node for node in model.nodes}
    reactions: list[dict[str, Any]] = []
    for node in model.supports:
        if node.nodeId not in nodes_by_id:
            continue
        dofs = dof_map.node_dofs(node.nodeId)
        values = reaction_full[dofs]
        reactions.append(
            {
                "nodeId": node.nodeId,
                "fx": clean(float(values[0])),
                "fy": clean(float(values[1])),
                "fz": clean(float(values[2])),
                "mx": clean(float(values[3])),
                "my": clean(float(values[4])),
                "mz": clean(float(values[5])),
                "constrainedDofs": [
                    name
                    for index, name in enumerate(("ux", "uy", "uz", "rx", "ry", "rz"))
                    if dofs[index] in constrained_set
                ],
            }
        )
    return reactions


def compute_member_section_forces(
    internal: dict[str, Any],
    displacements: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    dof_map = internal["dof_map"]
    assembly = internal["assembly"]
    model = internal["model"]
    u_full = _full_dof_vector(dof_map, model, displacements)
    out: list[dict[str, Any]] = []
    for state in assembly.element_states:
        u_local = transformation(state.rotation) @ u_full[state.dofs]
        forces = state.k_local @ u_local
        # For a response spectrum result there is no equivalent static load.
        # We report i-end and j-end forces at station 0 and 1 in the local
        # coordinate system.
        out.append(
            {
                "memberId": state.member.id,
                "station": 0.0,
                "component": "N",
                "value": clean(float(forces[0])),
            }
        )
        out.append(
            {
                "memberId": state.member.id,
                "station": 0.0,
                "component": "My",
                "value": clean(float(forces[4])),
            }
        )
        out.append(
            {
                "memberId": state.member.id,
                "station": 0.0,
                "component": "Mz",
                "value": clean(float(forces[5])),
            }
        )
        out.append(
            {
                "memberId": state.member.id,
                "station": 1.0,
                "component": "N",
                "value": clean(float(forces[6])),
            }
        )
        out.append(
            {
                "memberId": state.member.id,
                "station": 1.0,
                "component": "My",
                "value": clean(float(forces[10])),
            }
        )
        out.append(
            {
                "memberId": state.member.id,
                "station": 1.0,
                "component": "Mz",
                "value": clean(float(forces[11])),
            }
        )
    return out


def scale_shape_item(item: dict[str, Any], scale: float) -> dict[str, Any]:
    return {
        "nodeId": str(item["nodeId"]),
        "ux": clean(float(item.get("ux", 0.0)) * scale),
        "uy": clean(float(item.get("uy", 0.0)) * scale),
        "uz": clean(float(item.get("uz", 0.0)) * scale),
        "rx": clean(float(item.get("rx", 0.0)) * scale),
        "ry": clean(float(item.get("ry", 0.0)) * scale),
        "rz": clean(float(item.get("rz", 0.0)) * scale),
    }


def directional_value(items: Any, direction: str) -> float:
    if not isinstance(items, list):
        return 0.0
    for item in items:
        if isinstance(item, dict) and item.get("direction") == direction:
            return float(item.get("value", 0.0))
    return 0.0


def read_spectrum_points(raw: Any) -> list[dict[str, float]]:
    if not isinstance(raw, list) or len(raw) < 2:
        raise AnalysisError(
            "INVALID_VALUE",
            "spectrumPoints must contain at least two points.",
            path="/spectrumPoints",
        )
    points: list[dict[str, float]] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise AnalysisError(
                "INVALID_VALUE",
                "Each spectrum point must be an object.",
                path=f"/spectrumPoints/{index}",
            )
        try:
            period = float(item.get("period"))
            value = float(item.get("value", item.get("sa", 0.0)))
        except (TypeError, ValueError) as exc:
            raise AnalysisError(
                "INVALID_VALUE",
                "Spectrum period and value must be numbers.",
                path=f"/spectrumPoints/{index}",
            ) from exc
        if (
            period < 0.0
            or value < 0.0
            or not math.isfinite(period)
            or not math.isfinite(value)
        ):
            raise AnalysisError(
                "INVALID_VALUE",
                "Spectrum period and value must be finite non-negative numbers.",
                path=f"/spectrumPoints/{index}",
            )
        if points and period <= points[-1]["period"]:
            raise AnalysisError(
                "INVALID_VALUE",
                "Spectrum periods must be in strictly ascending order.",
                path=f"/spectrumPoints/{index}/period",
            )
        points.append({"period": period, "value": value})
    return points


def read_direction(value: Any) -> Direction:
    if value not in ("X", "Y", "Z"):
        raise AnalysisError(
            "INVALID_VALUE", "direction must be one of X, Y, or Z.", path="/direction"
        )
    return value  # type: ignore[return-value]


def read_combination_method(value: Any) -> CombinationMethod:
    if value == "SRSS" or value is None:
        return "SRSS"
    if value == "CQC":
        return "CQC"
    raise AnalysisError(
        "INVALID_VALUE",
        "combinationMethod must be either 'SRSS' or 'CQC'.",
        path="/combinationMethod",
    )


def read_interpolation_method(value: Any) -> InterpolationMethod:
    if value == "linear" or value is None:
        return "linear"
    if value == "logLog":
        return "logLog"
    raise AnalysisError(
        "INVALID_VALUE",
        "interpolationMethod must be either 'linear' or 'logLog'.",
        path="/interpolationMethod",
    )


def read_float(request: dict[str, Any], key: str, default: float) -> float:
    value = float(request.get(key, default))
    if not math.isfinite(value):
        raise AnalysisError("INVALID_VALUE", f"{key} must be finite.", path=f"/{key}")
    return value


def read_int(request: dict[str, Any], key: str, default: int) -> int:
    value = request.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int):
        raise AnalysisError(
            "INVALID_VALUE", f"{key} must be an integer.", path=f"/{key}"
        )
    return value


def default_mode_count(project_data: dict[str, Any]) -> int:
    settings = project_data.get("analysisSettings", {})
    eigen = settings.get("eigen", {}) if isinstance(settings, dict) else {}
    return int(eigen.get("modeCount", 6)) if isinstance(eigen, dict) else 6


def read_mass_case_id(
    project_data: dict[str, Any], request: dict[str, Any]
) -> str | None:
    if "massCaseId" in request:
        value = request.get("massCaseId")
        return str(value) if value is not None else None
    settings = project_data.get("analysisSettings", {})
    eigen = settings.get("eigen", {}) if isinstance(settings, dict) else {}
    if isinstance(eigen, dict) and eigen.get("massCaseId"):
        return str(eigen["massCaseId"])
    return None


def default_direction(project_data: dict[str, Any]) -> str:
    settings = project_data.get("analysisSettings", {})
    response = (
        settings.get("responseSpectrum", {}) if isinstance(settings, dict) else {}
    )
    return str(response.get("direction", "X")) if isinstance(response, dict) else "X"


def default_damping_ratio(project_data: dict[str, Any]) -> float:
    settings = project_data.get("analysisSettings", {})
    response = (
        settings.get("responseSpectrum", {}) if isinstance(settings, dict) else {}
    )
    return (
        float(response.get("dampingRatio", 0.05))
        if isinstance(response, dict)
        else 0.05
    )


def default_combination_method(project_data: dict[str, Any]) -> str:
    settings = project_data.get("analysisSettings", {})
    response = (
        settings.get("responseSpectrum", {}) if isinstance(settings, dict) else {}
    )
    if isinstance(response, dict) and response.get("combinationMethod") in ("SRSS", "CQC"):
        return str(response["combinationMethod"])
    return "SRSS"


def default_interpolation_method(project_data: dict[str, Any]) -> str:
    settings = project_data.get("analysisSettings", {})
    response = (
        settings.get("responseSpectrum", {}) if isinstance(settings, dict) else {}
    )
    if isinstance(response, dict) and response.get("interpolationMethod") in (
        "linear",
        "logLog",
    ):
        return str(response["interpolationMethod"])
    return "linear"


def duration_ms(started_at: str, finished_at: str) -> float:
    from datetime import datetime

    started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    finished = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
    return (finished - started).total_seconds() * 1000.0
