from __future__ import annotations

import math
import warnings
from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy.sparse.linalg import MatrixRankWarning, spsolve

from .assembly import Assembly, ElementState, assemble_stiffness
from .dof import DOF_NAMES, DofMap, build_dof_map, constrained_dofs
from .element import transformation
from .errors import AnalysisError
from .model import Model, parse_model
from .results import clean, force_dict, iso_now

MEMBER_COMPONENTS = {
    "N": "fx",
    "My": "my",
    "Mz": "mz",
}

REACTION_COMPONENT_INDEX = {
    "fx": 0,
    "fy": 1,
    "fz": 2,
    "mx": 3,
    "my": 4,
    "mz": 5,
}


def run_influence_analysis(project_data: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    started_at = iso_now()
    try:
        model = parse_model(project_data)
        return solve_influence_model(model, request, started_at)
    except AnalysisError as exc:
        return influence_error_result(project_data, started_at, exc.detail.to_dict())
    except Exception as exc:
        detail = AnalysisError("SOLVER_ERROR", f"Unexpected influence analysis failure: {exc}").detail
        return influence_error_result(project_data, started_at, detail.to_dict())


def solve_influence_model(model: Model, request: dict[str, Any], started_at: str | None = None) -> dict[str, Any]:
    started = started_at or iso_now()
    dof_map = build_dof_map(model)
    assembly = assemble_stiffness(model, dof_map)
    constrained = constrained_dofs(model, dof_map)
    free = np.array([dof for dof in range(dof_map.total_dof) if dof not in set(constrained)], dtype=int)
    if free.size == 0:
        raise AnalysisError("MODEL_UNSTABLE", "No free degrees of freedom remain.", path="/supports", entity_type="support")
    if not constrained:
        raise AnalysisError("MODEL_UNSTABLE", "The model has no support constraints.", path="/supports", entity_type="support")

    line = parse_line_request(model, assembly, request)
    targets = parse_targets(model, request.get("targets"), line["memberId"])
    stations = generate_stations(line["length"], line["stationCount"])
    kff = assembly.stiffness[free, :][:, free]
    target_values = {target["id"]: [] for target in targets}
    station_rows: list[dict[str, Any]] = []

    for index, station in enumerate(stations):
        load = unit_load_vector(dof_map, assembly, line["memberId"], station, line["direction"], line["magnitude"])
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", MatrixRankWarning)
                free_u = spsolve(kff, load[free])
        except MatrixRankWarning as exc:
            raise AnalysisError("MODEL_UNSTABLE", "The stiffness matrix is singular.", path="/supports", entity_type="support") from exc
        except Exception as exc:
            raise AnalysisError("SOLVER_ERROR", f"Sparse solve failed: {exc}") from exc
        if np.any(~np.isfinite(free_u)):
            raise AnalysisError("MODEL_UNSTABLE", "The stiffness matrix is singular.", path="/supports", entity_type="support")

        u_full = np.zeros(dof_map.total_dof, dtype=float)
        u_full[free] = free_u
        reaction_full = assembly.stiffness @ u_full - load
        member_forces = member_end_forces(assembly, u_full)
        for target in targets:
            target_values[target["id"]].append(clean(extract_target_value(target, dof_map, u_full, reaction_full, member_forces)))
        station_rows.append(
            {
                "station": clean(station),
                "ratio": clean(station / line["length"] if line["length"] else 0.0),
                "position": station_position(line, station),
                "stationIndex": index,
            }
        )

    finished = iso_now()
    duration_ms = duration(started, finished)
    return {
        "projectId": model.project.id,
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "influence_line",
            "status": "success",
            "startedAt": started,
            "finishedAt": finished,
            "durationMs": clean(duration_ms),
            "nodeCount": len(model.nodes),
            "memberCount": len(model.members),
            "loadCaseCount": 1,
            "totalDof": dof_map.total_dof,
            "freeDof": dof_map.total_dof - len(constrained),
            "constrainedDof": len(constrained),
            "solver": "scipy_sparse",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "influenceResult": {
            "caseId": str(request.get("caseId") or "influence-line-1"),
            "line": {
                "id": line["id"],
                "memberId": line["memberId"],
                "stationCount": len(station_rows),
                "loadDirection": {
                    "x": clean(line["direction"][0]),
                    "y": clean(line["direction"][1]),
                    "z": clean(line["direction"][2]),
                },
                "loadMagnitude": clean(line["magnitude"]),
            },
            "stations": station_rows,
            "targets": targets,
            "targetResults": [
                {"targetId": target["id"], "values": target_values[target["id"]]}
                for target in targets
            ],
        },
        "warnings": [],
        "errors": [],
    }


def parse_line_request(model: Model, assembly: Assembly, request: dict[str, Any]) -> dict[str, Any]:
    line = request.get("line") if isinstance(request.get("line"), dict) else {}
    member_id = str(line.get("memberId") or request.get("memberId") or (model.members[0].id if model.members else ""))
    state = element_state_by_member(assembly, member_id)
    if state is None:
        raise AnalysisError("INVALID_REFERENCE", f"Loading member does not exist: {member_id}", path="/line/memberId", entity_type="member", entity_id=member_id)
    station_count = int(line.get("stationCount") or request.get("stationCount") or 21)
    station_count = min(max(station_count, 2), 201)
    direction_input = line.get("direction") or request.get("direction") or {"x": 0.0, "y": -1.0, "z": 0.0}
    direction = np.array(
        [
            float(direction_input.get("x", 0.0)),
            float(direction_input.get("y", -1.0)),
            float(direction_input.get("z", 0.0)),
        ],
        dtype=float,
    )
    norm = float(np.linalg.norm(direction))
    if norm < 1e-12:
        raise AnalysisError("INVALID_VALUE", "Influence load direction must not be zero.", path="/line/direction")
    return {
        "id": str(line.get("id") or "line-1"),
        "memberId": member_id,
        "length": state.length,
        "stationCount": station_count,
        "direction": direction / norm,
        "magnitude": float(line.get("magnitude") or request.get("magnitude") or 1.0),
    }


def parse_targets(model: Model, targets_input: Any, member_id: str) -> list[dict[str, Any]]:
    if isinstance(targets_input, list) and targets_input:
        return [normalize_target(item, index) for index, item in enumerate(targets_input) if isinstance(item, dict)]
    targets: list[dict[str, Any]] = []
    for node in model.nodes:
        targets.append({"id": f"disp:{node.id}:uy", "type": "displacement", "nodeId": node.id, "component": "uy"})
    for support in model.supports:
        targets.append({"id": f"react:{support.nodeId}:fy", "type": "reaction", "nodeId": support.nodeId, "component": "fy"})
    for component in MEMBER_COMPONENTS:
        for end in ("i", "j"):
            targets.append(
                {
                    "id": f"member:{member_id}:{component}:{end}",
                    "type": "memberEndForce",
                    "memberId": member_id,
                    "component": component,
                    "end": end,
                }
            )
    return targets


def normalize_target(item: dict[str, Any], index: int) -> dict[str, Any]:
    target_type = str(item.get("type") or "")
    target = {
        "id": str(item.get("id") or f"target-{index + 1}"),
        "type": target_type,
        "component": str(item.get("component") or ""),
    }
    if target_type in {"displacement", "reaction"}:
        target["nodeId"] = str(item.get("nodeId") or "")
    if target_type == "memberEndForce":
        target["memberId"] = str(item.get("memberId") or "")
        target["end"] = str(item.get("end") or "i")
    return target


def generate_stations(length: float, station_count: int) -> list[float]:
    if station_count <= 1:
        return [0.0, length]
    return [length * index / (station_count - 1) for index in range(station_count)]


def unit_load_vector(
    dof_map: DofMap,
    assembly: Assembly,
    member_id: str,
    station: float,
    direction: NDArray[np.float64],
    magnitude: float,
) -> NDArray[np.float64]:
    state = element_state_by_member(assembly, member_id)
    if state is None:
        raise AnalysisError("INVALID_REFERENCE", f"Loading member does not exist: {member_id}", path="/line/memberId", entity_type="member", entity_id=member_id)
    global_force = direction * magnitude
    local_force = state.rotation @ global_force
    local = equivalent_point_load_local(state.length, station, local_force)
    vector = np.zeros(dof_map.total_dof, dtype=float)
    vector[state.dofs] += transformation(state.rotation).T @ local
    return vector


def equivalent_point_load_local(length: float, station: float, force: NDArray[np.float64]) -> NDArray[np.float64]:
    span = length
    ratio = 0.0 if span <= 0 else min(max(station / span, 0.0), 1.0)
    n1 = 1.0 - ratio
    n2 = ratio
    h1 = 1.0 - 3.0 * ratio * ratio + 2.0 * ratio * ratio * ratio
    h2 = span * (ratio - 2.0 * ratio * ratio + ratio * ratio * ratio)
    h3 = 3.0 * ratio * ratio - 2.0 * ratio * ratio * ratio
    h4 = span * (-ratio * ratio + ratio * ratio * ratio)
    load = np.zeros(12, dtype=float)
    load[0] = force[0] * n1
    load[6] = force[0] * n2
    load[1] = force[1] * h1
    load[5] = force[1] * h2
    load[7] = force[1] * h3
    load[11] = force[1] * h4
    load[2] = force[2] * h1
    load[4] = -force[2] * h2
    load[8] = force[2] * h3
    load[10] = -force[2] * h4
    return load


def member_end_forces(assembly: Assembly, u_full: NDArray[np.float64]) -> dict[str, dict[str, dict[str, float]]]:
    values: dict[str, dict[str, dict[str, float]]] = {}
    for state in assembly.element_states:
        transform = transformation(state.rotation)
        u_local = transform @ u_full[state.dofs]
        forces = state.k_local @ u_local
        values[state.member.id] = {"i": force_dict(forces[:6]), "j": force_dict(forces[6:])}
    return values


def extract_target_value(
    target: dict[str, Any],
    dof_map: DofMap,
    u_full: NDArray[np.float64],
    reaction_full: NDArray[np.float64],
    member_forces: dict[str, dict[str, dict[str, float]]],
) -> float:
    target_type = target.get("type")
    component = str(target.get("component"))
    if target_type == "displacement":
        node_id = str(target.get("nodeId"))
        return float(u_full[dof_map.dof(node_id, component)])
    if target_type == "reaction":
        node_id = str(target.get("nodeId"))
        dofs = dof_map.node_dofs(node_id)
        if component not in REACTION_COMPONENT_INDEX:
            raise AnalysisError("INVALID_VALUE", f"Unsupported reaction component: {component}", path="/targets")
        return float(reaction_full[dofs[REACTION_COMPONENT_INDEX[component]]])
    if target_type == "memberEndForce":
        member_id = str(target.get("memberId"))
        end = "j" if target.get("end") == "j" else "i"
        key = MEMBER_COMPONENTS.get(component)
        if key is None:
            raise AnalysisError("INVALID_VALUE", f"Unsupported member force component: {component}", path="/targets")
        return float(member_forces[member_id][end][key])
    raise AnalysisError("INVALID_VALUE", f"Unsupported influence target type: {target_type}", path="/targets")


def station_position(line: dict[str, Any], station: float) -> dict[str, float]:
    # MVP loading lines are member-aligned; frontend uses station and ratio for display.
    return {"x": clean(station), "y": 0.0, "z": 0.0}


def element_state_by_member(assembly: Assembly, member_id: str) -> ElementState | None:
    return next((state for state in assembly.element_states if state.member.id == member_id), None)


def duration(started_at: str, finished_at: str) -> float:
    from datetime import datetime

    return (
        datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
        - datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    ).total_seconds() * 1000.0


def influence_error_result(project_data: dict[str, Any], started_at: str, error: dict[str, Any]) -> dict[str, Any]:
    project_info = project_data.get("project", {})
    project_id = project_info.get("id", "") if isinstance(project_info, dict) else ""
    finished_at = iso_now()
    return {
        "projectId": project_id,
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "influence_line",
            "status": "failed",
            "startedAt": started_at,
            "finishedAt": finished_at,
            "durationMs": clean(duration(started_at, finished_at)),
            "nodeCount": len(project_data.get("nodes", [])),
            "memberCount": len(project_data.get("members", [])),
            "loadCaseCount": 1,
            "totalDof": 0,
            "freeDof": 0,
            "constrainedDof": 0,
            "solver": "scipy_sparse",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "influenceResult": {
            "caseId": "influence-line-1",
            "line": {"id": "line-1", "memberId": "", "stationCount": 0, "loadDirection": {"x": 0.0, "y": -1.0, "z": 0.0}, "loadMagnitude": 1.0},
            "stations": [],
            "targets": [],
            "targetResults": [],
        },
        "warnings": [],
        "errors": [error],
    }
