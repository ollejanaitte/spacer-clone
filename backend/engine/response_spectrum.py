from __future__ import annotations

import math
from typing import Any, Literal

from .eigen import run_eigen_analysis
from .errors import AnalysisError, error_result
from .results import clean, iso_now

Direction = Literal["X", "Y", "Z"]
DIRECTION_DOF: dict[str, str] = {"X": "ux", "Y": "uy", "Z": "uz"}

DEFAULT_SPECTRUM = [
    {"period": 0.0, "value": 1.0},
    {"period": 0.1, "value": 1.0},
    {"period": 1.0, "value": 1.0},
]


def run_response_spectrum_analysis(
    project_data: dict[str, Any],
    request: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run MVP response spectrum analysis from the eigen result.

    MVP scope:
    - pseudo acceleration spectrum Sa in m/s^2
    - linear interpolation
    - out-of-range clamp
    - X/Y/Z direction
    - SRSS displacement envelope
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

        response = build_response_spectrum_result(
            eigen_result,
            spectrum_case_id=spectrum_case_id,
            direction=direction,
            damping_ratio=damping_ratio,
            spectrum_points=spectrum_points,
            target_cumulative_mass_ratio=target_cumulative_mass_ratio,
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


def build_response_spectrum_result(
    result: dict[str, Any],
    *,
    spectrum_case_id: str,
    direction: Direction,
    damping_ratio: float,
    spectrum_points: list[dict[str, float]],
    target_cumulative_mass_ratio: float,
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
        modal_response(mode, direction, spectrum_points) for mode in used_modes
    ]
    combined = combine_srss(modal_results)
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
    return {
        "spectrumCaseId": spectrum_case_id,
        "direction": direction,
        "dampingRatio": clean(damping_ratio),
        "combinationMethod": "SRSS",
        "targetCumulativeMassRatio": clean(target_cumulative_mass_ratio),
        "usedModes": [int(mode["modeNo"]) for mode in used_modes],
        "modalResults": modal_results,
        "combinedResult": combined,
    }


def modal_response(
    mode: dict[str, Any],
    direction: Direction,
    spectrum_points: list[dict[str, float]],
) -> dict[str, Any]:
    period = float(mode.get("period", 0.0))
    omega = float(mode.get("circularFrequency", 0.0))
    if omega <= 0.0 or not math.isfinite(omega):
        raise AnalysisError("SOLVER_ERROR", "Invalid circular frequency in eigen mode.")
    sa = interpolate_spectrum(period, spectrum_points)
    gamma = directional_value(mode.get("participationFactors", []), direction)
    scale = gamma * sa / (omega * omega)
    displacements = [scale_shape_item(item, scale) for item in mode.get("shape", [])]
    return {
        "modeNo": int(mode["modeNo"]),
        "spectralAcceleration": clean(sa),
        "participationFactor": clean(gamma),
        "modalCoordinate": clean(scale),
        "displacements": displacements,
        "reactions": [],
        "memberSectionForces": [],
    }


def combine_srss(modal_results: list[dict[str, Any]]) -> dict[str, Any]:
    node_values: dict[str, dict[str, float]] = {}
    for modal in modal_results:
        for disp in modal["displacements"]:
            node_id = str(disp["nodeId"])
            accum = node_values.setdefault(
                node_id,
                {"ux": 0.0, "uy": 0.0, "uz": 0.0, "rx": 0.0, "ry": 0.0, "rz": 0.0},
            )
            for key in ("ux", "uy", "uz", "rx", "ry", "rz"):
                value = float(disp[key])
                accum[key] += value * value
    return {
        "method": "SRSS",
        "displacements": [
            {"nodeId": node_id}
            | {key: clean(math.sqrt(value)) for key, value in values.items()}
            for node_id, values in sorted(node_values.items())
        ],
        "reactions": [],
        "memberSectionForces": [],
    }


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


def interpolate_spectrum(period: float, points: list[dict[str, float]]) -> float:
    if period <= points[0]["period"]:
        return points[0]["value"]
    if period >= points[-1]["period"]:
        return points[-1]["value"]
    for left, right in zip(points, points[1:]):
        t0 = left["period"]
        t1 = right["period"]
        if t0 <= period <= t1:
            ratio = (period - t0) / (t1 - t0)
            return left["value"] + ratio * (right["value"] - left["value"])
    return points[-1]["value"]


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
    return value


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


def duration_ms(started_at: str, finished_at: str) -> float:
    from datetime import datetime

    started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    finished = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
    return (finished - started).total_seconds() * 1000.0
