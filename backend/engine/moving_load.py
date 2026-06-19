from __future__ import annotations

import math
from typing import Any

from .errors import AnalysisError
from .influence import duration, run_influence_analysis
from .results import clean, iso_now

VECTOR_EPSILON = 1e-12
DIRECTION_DOT_TOLERANCE = 0.999999


def run_moving_load_analysis(project_data: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    started_at = iso_now()
    try:
        moving_case = parse_moving_load_case(request)
        influence_request = build_influence_request(moving_case)
        influence_result = run_influence_analysis(project_data, influence_request)
        if influence_failed(influence_result):
            return moving_load_error_result(
                project_data,
                started_at,
                first_error(influence_result),
                moving_case=moving_case,
                influence_result=influence_result.get("influenceResult"),
            )

        influence = influence_result.get("influenceResult")
        if not isinstance(influence, dict):
            raise AnalysisError("SOLVER_ERROR", "Influence result is missing.", path="/influenceResult")

        history = build_moving_load_history(influence, moving_case["liveLoad"])
        envelope = build_envelope_result(moving_case["id"], influence.get("targets", []), history)
        worst_cases = build_worst_case_positions(envelope, influence)
        finished_at = iso_now()

        include_influence = bool(moving_case["options"].get("includeInfluenceResult", True))
        include_history = bool(moving_case["options"].get("includeHistory", True))
        return {
            "projectId": str(influence_result.get("projectId", project_id(project_data))),
            "schemaVersion": "1.0.0",
            "analysisSummary": moving_summary_from_influence(
                influence_result,
                started_at,
                finished_at,
                status="success",
            ),
            "movingLoadResult": {
                "caseId": moving_case["id"],
                "caseName": moving_case.get("name", ""),
                "liveLoad": moving_case["liveLoad"],
                "line": moving_line_snapshot(influence),
                "influenceResult": influence if include_influence else None,
                "movingLoadHistory": history if include_history else None,
                "envelopeResult": envelope,
                "worstCaseLoadingPositions": worst_cases,
            },
            "warnings": list(influence_result.get("warnings", [])),
            "errors": [],
        }
    except AnalysisError as exc:
        return moving_load_error_result(project_data, started_at, exc.detail.to_dict())
    except Exception as exc:
        detail = AnalysisError("SOLVER_ERROR", f"Unexpected moving load analysis failure: {exc}").detail
        return moving_load_error_result(project_data, started_at, detail.to_dict())


def parse_moving_load_case(request: dict[str, Any]) -> dict[str, Any]:
    case = request.get("movingLoadCase") if isinstance(request.get("movingLoadCase"), dict) else request
    if not isinstance(case, dict):
        raise AnalysisError("SCHEMA_ERROR", "movingLoadCase must be an object.", path="/movingLoadCase")

    case_id = str(case.get("id") or "").strip()
    if not case_id:
        raise AnalysisError("INVALID_VALUE", "movingLoadCase.id is required.", path="/movingLoadCase/id")

    line = case.get("line") if isinstance(case.get("line"), dict) else {}
    member_id = str(line.get("memberId") or "").strip()
    if not member_id:
        raise AnalysisError("INVALID_VALUE", "movingLoadCase.line.memberId is required.", path="/movingLoadCase/line/memberId")
    station_count = int(line.get("stationCount") or 0)
    if station_count < 2 or station_count > 201:
        raise AnalysisError("INVALID_VALUE", "movingLoadCase.line.stationCount must be between 2 and 201.", path="/movingLoadCase/line/stationCount")

    line_direction = parse_vector(line.get("direction"), "/movingLoadCase/line/direction")
    live_load = case.get("liveLoad") if isinstance(case.get("liveLoad"), dict) else {}
    if live_load.get("type") != "singlePoint":
        raise AnalysisError("INVALID_VALUE", "Only singlePoint live load is supported in the MVP.", path="/movingLoadCase/liveLoad/type")
    magnitude = float(live_load.get("magnitude", 0.0))
    if magnitude <= 0.0:
        raise AnalysisError("INVALID_VALUE", "liveLoad.magnitude must be greater than zero.", path="/movingLoadCase/liveLoad/magnitude")
    if str(live_load.get("unit") or "kN") != "kN":
        raise AnalysisError("INVALID_VALUE", "Only kN live load unit is supported.", path="/movingLoadCase/liveLoad/unit")
    load_direction = parse_vector(live_load.get("direction"), "/movingLoadCase/liveLoad/direction")
    validate_direction_compatibility(line_direction, load_direction)

    targets = case.get("targets")
    if not isinstance(targets, list) or len(targets) == 0:
        raise AnalysisError("INVALID_VALUE", "movingLoadCase.targets must contain at least one target.", path="/movingLoadCase/targets")
    normalized_targets = [normalize_target(item, index) for index, item in enumerate(targets)]

    return {
        "id": case_id,
        "name": str(case.get("name") or ""),
        "influenceCaseId": str(case.get("influenceCaseId") or f"{case_id}-influence"),
        "line": {
            "id": str(line.get("id") or f"line-{member_id}"),
            "memberId": member_id,
            "stationCount": station_count,
            "direction": line_direction,
        },
        "liveLoad": {
            "id": str(live_load.get("id") or "P1"),
            "type": "singlePoint",
            "name": str(live_load.get("name") or ""),
            "magnitude": clean(magnitude),
            "unit": "kN",
            "direction": load_direction,
        },
        "targets": normalized_targets,
        "options": case.get("options") if isinstance(case.get("options"), dict) else {},
    }


def parse_vector(value: Any, path: str) -> dict[str, float]:
    if not isinstance(value, dict):
        raise AnalysisError("INVALID_VALUE", "Direction must be an object.", path=path)
    vector = {
        "x": float(value.get("x", 0.0)),
        "y": float(value.get("y", 0.0)),
        "z": float(value.get("z", 0.0)),
    }
    norm = math.sqrt(vector["x"] ** 2 + vector["y"] ** 2 + vector["z"] ** 2)
    if norm < VECTOR_EPSILON:
        raise AnalysisError("INVALID_VALUE", "Direction must not be zero.", path=path)
    return {axis: clean(component / norm) for axis, component in vector.items()}


def validate_direction_compatibility(line_direction: dict[str, float], load_direction: dict[str, float]) -> None:
    dot = sum(float(line_direction[axis]) * float(load_direction[axis]) for axis in ("x", "y", "z"))
    if dot < DIRECTION_DOT_TOLERANCE:
        raise AnalysisError(
            "INVALID_VALUE",
            "liveLoad.direction must match movingLoadCase.line.direction in the MVP.",
            path="/movingLoadCase/liveLoad/direction",
        )


def normalize_target(item: Any, index: int) -> dict[str, Any]:
    if not isinstance(item, dict):
        raise AnalysisError("SCHEMA_ERROR", "Influence target must be an object.", path=f"/movingLoadCase/targets/{index}")
    target_type = str(item.get("type") or "")
    if target_type not in {"displacement", "reaction", "memberEndForce"}:
        raise AnalysisError("INVALID_VALUE", f"Unsupported target type: {target_type}", path=f"/movingLoadCase/targets/{index}/type")
    component = str(item.get("component") or "").strip()
    if not component:
        raise AnalysisError("INVALID_VALUE", "Influence target component is required.", path=f"/movingLoadCase/targets/{index}/component")
    target = {
        "id": str(item.get("id") or f"target-{index + 1}"),
        "type": target_type,
        "component": component,
    }
    if target_type in {"displacement", "reaction"}:
        node_id = str(item.get("nodeId") or "").strip()
        if not node_id:
            raise AnalysisError("INVALID_VALUE", "nodeId is required for displacement and reaction targets.", path=f"/movingLoadCase/targets/{index}/nodeId")
        target["nodeId"] = node_id
    if target_type == "memberEndForce":
        member_id = str(item.get("memberId") or "").strip()
        if not member_id:
            raise AnalysisError("INVALID_VALUE", "memberId is required for memberEndForce targets.", path=f"/movingLoadCase/targets/{index}/memberId")
        target["memberId"] = member_id
        target["end"] = "j" if item.get("end") == "j" else "i"
    return target


def build_influence_request(moving_case: dict[str, Any]) -> dict[str, Any]:
    line = moving_case["line"]
    return {
        "caseId": moving_case["influenceCaseId"],
        "line": {
            "id": line["id"],
            "memberId": line["memberId"],
            "stationCount": line["stationCount"],
            "direction": line["direction"],
            "magnitude": 1.0,
        },
        "targets": moving_case["targets"],
    }


def influence_failed(result: dict[str, Any]) -> bool:
    summary = result.get("analysisSummary", {}) if isinstance(result, dict) else {}
    return summary.get("status") == "failed" or bool(result.get("errors"))


def first_error(result: dict[str, Any]) -> dict[str, Any]:
    errors = result.get("errors", []) if isinstance(result, dict) else []
    if errors and isinstance(errors[0], dict):
        return errors[0]
    return AnalysisError("SOLVER_ERROR", "Influence analysis failed.").detail.to_dict()


def build_moving_load_history(influence: dict[str, Any], live_load: dict[str, Any]) -> list[dict[str, Any]]:
    stations = influence.get("stations", [])
    target_results = influence.get("targetResults", [])
    magnitude = float(live_load["magnitude"])
    history: list[dict[str, Any]] = []
    for station_index, station in enumerate(stations):
        position = station.get("position", {}) if isinstance(station, dict) else {}
        load_position = {
            "loadId": live_load["id"],
            "station": clean(station.get("station", 0.0)),
            "ratio": clean(station.get("ratio", 0.0)),
            "position": position,
            "magnitude": clean(magnitude),
            "unit": live_load.get("unit", "kN"),
        }
        responses = []
        for target_result in target_results:
            values = target_result.get("values", [])
            if station_index >= len(values):
                raise AnalysisError("SOLVER_ERROR", "Influence target result values length must match stations length.", path="/influenceResult/targetResults")
            responses.append({
                "targetId": str(target_result.get("targetId", "")),
                "value": clean(float(values[station_index]) * magnitude),
            })
        history.append({
            "station": clean(station.get("station", 0.0)),
            "ratio": clean(station.get("ratio", 0.0)),
            "position": position,
            "loadPositions": [load_position],
            "responses": responses,
        })
    return history


def build_envelope_result(case_id: str, targets: list[dict[str, Any]], history: list[dict[str, Any]]) -> dict[str, Any]:
    items = []
    response_by_station = [
        {str(response.get("targetId", "")): response.get("value", 0.0) for response in row.get("responses", [])}
        for row in history
    ]
    for target in targets:
        target_id = str(target.get("id", ""))
        rows = [
            (index, float(responses[target_id]), history[index])
            for index, responses in enumerate(response_by_station)
            if target_id in responses
        ]
        if not rows:
            continue
        max_row = max(rows, key=lambda row: row[1])
        min_row = min(rows, key=lambda row: row[1])
        abs_row = max(rows, key=lambda row: abs(row[1]))
        items.append({
            "targetId": target_id,
            "target": target,
            "max": extreme_from_row(max_row),
            "min": extreme_from_row(min_row),
            "absMax": extreme_from_row(abs_row),
        })
    return {"caseId": case_id, "items": items}


def extreme_from_row(row: tuple[int, float, dict[str, Any]]) -> dict[str, Any]:
    station_index, value, history_item = row
    return {
        "value": clean(value),
        "station": clean(history_item.get("station", 0.0)),
        "ratio": clean(history_item.get("ratio", 0.0)),
        "position": history_item.get("position", {}),
        "stationIndex": station_index,
        "loadPositions": history_item.get("loadPositions", []),
    }


def build_worst_case_positions(envelope: dict[str, Any], influence: dict[str, Any]) -> list[dict[str, Any]]:
    influence_lookup = influence_values_by_target(influence)
    rows: list[dict[str, Any]] = []
    for item in envelope.get("items", []):
        target_id = str(item.get("targetId", ""))
        for criterion in ("max", "min", "absMax"):
            extreme = item.get(criterion, {})
            station_index = int(extreme.get("stationIndex", 0))
            rows.append({
                "targetId": target_id,
                "criterion": criterion,
                "value": extreme.get("value", 0.0),
                "station": extreme.get("station", 0.0),
                "ratio": extreme.get("ratio", 0.0),
                "position": extreme.get("position", {}),
                "stationIndex": station_index,
                "loadPositions": extreme.get("loadPositions", []),
                "influenceValue": clean(influence_lookup.get(target_id, [0.0])[station_index]),
            })
    return rows


def influence_values_by_target(influence: dict[str, Any]) -> dict[str, list[float]]:
    return {
        str(row.get("targetId", "")): [float(value) for value in row.get("values", [])]
        for row in influence.get("targetResults", [])
        if isinstance(row, dict)
    }


def moving_line_snapshot(influence: dict[str, Any]) -> dict[str, Any]:
    line = influence.get("line", {})
    return {
        "id": line.get("id", ""),
        "memberId": line.get("memberId", ""),
        "stationCount": line.get("stationCount", 0),
        "loadDirection": line.get("loadDirection", {"x": 0.0, "y": -1.0, "z": 0.0}),
    }


def moving_summary_from_influence(
    influence_result: dict[str, Any],
    started_at: str,
    finished_at: str,
    *,
    status: str,
) -> dict[str, Any]:
    summary = influence_result.get("analysisSummary", {}) if isinstance(influence_result, dict) else {}
    return {
        "analysisType": "moving_load",
        "status": status,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "durationMs": clean(duration(started_at, finished_at)),
        "nodeCount": summary.get("nodeCount", 0),
        "memberCount": summary.get("memberCount", 0),
        "loadCaseCount": 1,
        "totalDof": summary.get("totalDof", 0),
        "freeDof": summary.get("freeDof", 0),
        "constrainedDof": summary.get("constrainedDof", 0),
        "solver": "influence_line_reuse",
    }


def moving_load_error_result(
    project_data: dict[str, Any],
    started_at: str,
    error: dict[str, Any],
    *,
    moving_case: dict[str, Any] | None = None,
    influence_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    finished_at = iso_now()
    return {
        "projectId": project_id(project_data),
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "moving_load",
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
            "solver": "influence_line_reuse",
        },
        "movingLoadResult": empty_moving_load_result(moving_case, influence_result),
        "warnings": [],
        "errors": [error],
    }


def empty_moving_load_result(
    moving_case: dict[str, Any] | None,
    influence_result: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "caseId": str((moving_case or {}).get("id", "")),
        "caseName": str((moving_case or {}).get("name", "")),
        "liveLoad": (moving_case or {}).get("liveLoad"),
        "line": moving_line_snapshot(influence_result or {"line": {}}),
        "influenceResult": influence_result,
        "movingLoadHistory": None,
        "envelopeResult": {"caseId": str((moving_case or {}).get("id", "")), "items": []},
        "worstCaseLoadingPositions": [],
    }


def project_id(project_data: dict[str, Any]) -> str:
    info = project_data.get("project", {})
    return str(info.get("id", "")) if isinstance(info, dict) else ""
