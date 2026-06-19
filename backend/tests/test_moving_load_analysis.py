from __future__ import annotations

from typing import Any

from backend.engine import run_moving_load_analysis

from .assertions import assert_close
from .sample_models import cantilever_tip_load


def moving_case(*, magnitude: float = 100.0, include_history: bool = True, return_csv: bool = False) -> dict[str, Any]:
    return {
        "id": "mlc-1",
        "name": "Single point moving load",
        "line": {
            "id": "line-M1",
            "memberId": "M1",
            "stationCount": 5,
            "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
        },
        "liveLoad": {
            "id": "P1",
            "type": "singlePoint",
            "name": "Point load P1",
            "magnitude": magnitude,
            "unit": "kN",
            "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
        },
        "targets": [
            {
                "id": "fixed-reaction",
                "type": "reaction",
                "nodeId": "N1",
                "component": "fy",
            },
            {
                "id": "fixed-moment",
                "type": "memberEndForce",
                "memberId": "M1",
                "component": "Mz",
                "end": "i",
            },
        ],
        "options": {
            "includeInfluenceResult": True,
            "includeHistory": include_history,
            "returnCsv": return_csv,
        },
    }


def target_item(result: dict[str, Any], target_id: str) -> dict[str, Any]:
    items = result["movingLoadResult"]["envelopeResult"]["items"]
    return next(item for item in items if item["targetId"] == target_id)


def test_single_point_moving_load_builds_history_and_envelope() -> None:
    result = run_moving_load_analysis(
        cantilever_tip_load(),
        {"movingLoadCase": moving_case(magnitude=100.0)},
    )

    assert result["analysisSummary"]["analysisType"] == "moving_load"
    assert result["analysisSummary"]["status"] == "success"
    moving = result["movingLoadResult"]
    assert moving["caseId"] == "mlc-1"
    assert moving["liveLoad"]["magnitude"] == 100.0
    assert len(moving["movingLoadHistory"]) == 5
    assert len(moving["envelopeResult"]["items"]) == 2
    moment = target_item(result, "fixed-moment")
    assert_close(moment["max"]["value"], 400.0)
    assert_close(moment["max"]["station"], 4.0)
    assert_close(moment["absMax"]["value"], 400.0)
    reaction = target_item(result, "fixed-reaction")
    assert_close(reaction["max"]["value"], 100.0)
    assert len(moving["worstCaseLoadingPositions"]) == 6


def test_single_point_moving_load_is_linear_to_magnitude() -> None:
    result_100 = run_moving_load_analysis(cantilever_tip_load(), {"movingLoadCase": moving_case(magnitude=100.0)})
    result_200 = run_moving_load_analysis(cantilever_tip_load(), {"movingLoadCase": moving_case(magnitude=200.0)})

    max_100 = target_item(result_100, "fixed-moment")["max"]["value"]
    max_200 = target_item(result_200, "fixed-moment")["max"]["value"]
    assert_close(max_200, max_100 * 2.0)


def test_single_point_moving_load_can_omit_history_but_keeps_envelope() -> None:
    result = run_moving_load_analysis(
        cantilever_tip_load(),
        {"movingLoadCase": moving_case(include_history=False)},
    )

    moving = result["movingLoadResult"]
    assert moving["movingLoadHistory"] is None
    assert moving["envelopeResult"]["items"]
    assert moving["worstCaseLoadingPositions"]


def test_single_point_moving_load_rejects_direction_mismatch() -> None:
    case = moving_case()
    case["liveLoad"]["direction"] = {"x": 1.0, "y": 0.0, "z": 0.0}

    result = run_moving_load_analysis(cantilever_tip_load(), {"movingLoadCase": case})

    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"][0]["code"] == "INVALID_VALUE"


def test_single_point_moving_load_rejects_non_positive_magnitude() -> None:
    case = moving_case(magnitude=0.0)

    result = run_moving_load_analysis(cantilever_tip_load(), {"movingLoadCase": case})

    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"][0]["code"] == "INVALID_VALUE"
