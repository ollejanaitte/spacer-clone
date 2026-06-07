from __future__ import annotations

from typing import Any

from backend.engine import run_influence_analysis

from .assertions import assert_close
from .sample_models import E, I, L, cantilever_tip_load, simply_supported_center_load


def target_values(result: dict[str, Any], target_id: str) -> list[float]:
    rows = result["influenceResult"]["targetResults"]
    return next(row["values"] for row in rows if row["targetId"] == target_id)


def test_cantilever_influence_lines_match_closed_form_solution() -> None:
    project = cantilever_tip_load()
    station_count = 5
    result = run_influence_analysis(
        project,
        {
            "line": {
                "id": "cantilever-line",
                "memberId": "M1",
                "stationCount": station_count,
                "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                "magnitude": 1.0,
            },
            "targets": [
                {
                    "id": "tip-uy",
                    "type": "displacement",
                    "nodeId": "N2",
                    "component": "uy",
                },
                {
                    "id": "fixed-fy",
                    "type": "reaction",
                    "nodeId": "N1",
                    "component": "fy",
                },
                {
                    "id": "fixed-mz",
                    "type": "memberEndForce",
                    "memberId": "M1",
                    "component": "Mz",
                    "end": "i",
                },
            ],
        },
    )

    assert result["analysisSummary"]["status"] == "success"
    stations = [row["station"] for row in result["influenceResult"]["stations"]]
    tip_displacements = target_values(result, "tip-uy")
    fixed_reactions = target_values(result, "fixed-fy")
    fixed_moments = target_values(result, "fixed-mz")

    for station, displacement, reaction, moment in zip(
        stations, tip_displacements, fixed_reactions, fixed_moments, strict=True
    ):
        # Unit downward load at distance a from the fixed end:
        # R_y = 1, M_fixed = a,
        # delta_tip = -a^2 * (3L - a) / (6EI).
        assert_close(reaction, 1.0)
        assert_close(moment, station)
        assert_close(
            displacement,
            -(station**2 * (3.0 * L - station)) / (6.0 * E * I),
        )


def test_simply_supported_beam_influence_lines_match_triangular_solution() -> None:
    project = simply_supported_center_load()
    combined_stations: list[float] = []
    left_reactions: list[float] = []
    center_moments: list[float] = []

    for member_id, offset in (("M1", 0.0), ("M2", L / 2.0)):
        result = run_influence_analysis(
            project,
            {
                "line": {
                    "id": f"line-{member_id}",
                    "memberId": member_id,
                    "stationCount": 5,
                    "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                    "magnitude": 1.0,
                },
                "targets": [
                    {
                        "id": "left-reaction",
                        "type": "reaction",
                        "nodeId": "N1",
                        "component": "fy",
                    },
                    {
                        "id": "center-moment",
                        "type": "memberEndForce",
                        "memberId": "M1",
                        "component": "Mz",
                        "end": "j",
                    },
                ],
            },
        )
        local_stations = [
            row["station"] for row in result["influenceResult"]["stations"]
        ]
        values_reaction = target_values(result, "left-reaction")
        values_moment = target_values(result, "center-moment")
        start = 0 if member_id == "M1" else 1
        combined_stations.extend(offset + value for value in local_stations[start:])
        left_reactions.extend(values_reaction[start:])
        center_moments.extend(values_moment[start:])

    for station, reaction, moment in zip(
        combined_stations, left_reactions, center_moments, strict=True
    ):
        # Unit downward load at x on a simply supported span:
        # R_left = 1 - x/L.
        # M_center = x/2 for x <= L/2, and (L-x)/2 for x >= L/2.
        expected_moment = (
            station / 2.0 if station <= L / 2.0 else (L - station) / 2.0
        )
        assert_close(reaction, 1.0 - station / L)
        assert_close(moment, expected_moment)
