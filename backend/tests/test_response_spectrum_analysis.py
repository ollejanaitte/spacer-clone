from __future__ import annotations

from typing import Any

import pytest

from backend.engine import run_response_spectrum_analysis
from backend.engine import response_spectrum
from backend.engine.response_spectrum import (
    combine_srss,
    interpolate_spectrum,
    modal_response,
)

from .assertions import assert_close
from .sample_models import E, L, base_project

TIP_MASS = 2.5


@pytest.fixture(scope="module")
def response_spectrum_client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def test_single_dof_response_spectrum_matches_static_spring_response() -> None:
    project = axial_cantilever_mass("response-spectrum-single-dof")

    result = run_response_spectrum_analysis(
        project,
        {
            "massCaseId": "mass-1",
            "modeCount": 1,
            "direction": "X",
            "spectrumPoints": [
                {"period": 0.0, "value": 1.0},
                {"period": 10.0, "value": 1.0},
            ],
        },
    )

    assert result["analysisSummary"]["status"] == "success"
    response = result["responseSpectrumResult"]
    assert response["combinationMethod"] == "SRSS"
    assert response["usedModes"] == [1]
    tip = displacement_by_node(response["combinedResult"]["displacements"], "N2")
    axial_stiffness = E * project["sections"][0]["area"] / L
    expected = TIP_MASS * 1.0 / axial_stiffness
    assert_close(tip["ux"], expected)


def test_spectrum_interpolation_clamps_outside_period_range() -> None:
    project = axial_cantilever_mass("response-spectrum-clamp")

    result = run_response_spectrum_analysis(
        project,
        {
            "massCaseId": "mass-1",
            "modeCount": 1,
            "direction": "X",
            "spectrumPoints": [
                {"period": 100.0, "value": 2.0},
                {"period": 200.0, "value": 3.0},
            ],
        },
    )

    assert result["analysisSummary"]["status"] == "success"
    modal = result["responseSpectrumResult"]["modalResults"][0]
    assert_close(modal["spectralAcceleration"], 2.0)


def test_linear_spectrum_interpolation_and_endpoint_clamping() -> None:
    points = [
        {"period": 1.0, "value": 10.0},
        {"period": 3.0, "value": 30.0},
    ]

    assert_close(interpolate_spectrum(2.0, points), 20.0)
    assert_close(interpolate_spectrum(0.5, points), 10.0)
    assert_close(interpolate_spectrum(4.0, points), 30.0)


def test_modal_displacement_uses_participation_shape_sa_over_omega_squared() -> None:
    mode = {
        "modeNo": 1,
        "period": 1.0,
        "circularFrequency": 4.0,
        "participationFactors": [{"direction": "X", "value": 2.0}],
        "shape": [
            {
                "nodeId": "N1",
                "ux": 3.0,
                "uy": 0.0,
                "uz": 0.0,
                "rx": 0.0,
                "ry": 0.0,
                "rz": 0.0,
            }
        ],
    }

    modal = modal_response(
        mode,
        "X",
        [
            {"period": 0.0, "value": 2.0},
            {"period": 2.0, "value": 2.0},
        ],
    )

    expected_modal_coordinate = 2.0 * 2.0 / (4.0**2)
    assert_close(modal["modalCoordinate"], expected_modal_coordinate)
    assert_close(modal["displacements"][0]["ux"], 3.0 * expected_modal_coordinate)


def test_srss_combines_each_displacement_component_by_square_sum() -> None:
    modal_results = [
        {
            "displacements": [
                {
                    "nodeId": "N1",
                    "ux": 3.0,
                    "uy": -5.0,
                    "uz": 0.0,
                    "rx": 0.0,
                    "ry": 0.0,
                    "rz": 0.0,
                }
            ]
        },
        {
            "displacements": [
                {
                    "nodeId": "N1",
                    "ux": -4.0,
                    "uy": 12.0,
                    "uz": 0.0,
                    "rx": 0.0,
                    "ry": 0.0,
                    "rz": 0.0,
                }
            ]
        },
    ]

    combined = combine_srss(modal_results)
    displacement = displacement_by_node(combined["displacements"], "N1")

    assert_close(displacement["ux"], 5.0)
    assert_close(displacement["uy"], 13.0)


@pytest.mark.parametrize(
    ("request_update", "expected_path"),
    [
        ({"spectrumPoints": [{"period": 0.0, "value": 1.0}]}, "/spectrumPoints"),
        (
            {
                "spectrumPoints": [
                    {"period": -1.0, "value": 1.0},
                    {"period": 1.0, "value": 1.0},
                ]
            },
            "/spectrumPoints/0",
        ),
        (
            {
                "spectrumPoints": [
                    {"period": 0.0, "value": -1.0},
                    {"period": 1.0, "value": 1.0},
                ]
            },
            "/spectrumPoints/0",
        ),
        (
            {
                "spectrumPoints": [
                    {"period": 1.0, "value": 1.0},
                    {"period": 0.5, "value": 2.0},
                ]
            },
            "/spectrumPoints/1/period",
        ),
        ({"direction": "XY"}, "/direction"),
        ({"modeCount": 0}, "/modeCount"),
        ({"targetCumulativeMassRatio": 0.0}, "/targetCumulativeMassRatio"),
        ({"targetCumulativeMassRatio": 1.1}, "/targetCumulativeMassRatio"),
        ({"dampingRatio": -0.01}, "/dampingRatio"),
    ],
)
def test_response_spectrum_rejects_invalid_inputs(
    request_update: dict[str, Any],
    expected_path: str,
) -> None:
    project = axial_cantilever_mass("response-spectrum-invalid-input")
    request = {
        "massCaseId": "mass-1",
        "modeCount": 1,
        "direction": "X",
        "dampingRatio": 0.05,
        "targetCumulativeMassRatio": 0.9,
        "spectrumPoints": [
            {"period": 0.0, "value": 1.0},
            {"period": 1.0, "value": 1.0},
        ],
    }
    request.update(request_update)

    result = run_response_spectrum_analysis(project, request)

    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"][0]["code"] == "INVALID_VALUE"
    assert result["errors"][0]["path"] == expected_path


def test_insufficient_modes_returns_warning_with_reached_ratio_and_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    eigen_result = {
        "projectId": "insufficient-modes",
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "eigen",
            "status": "success",
            "startedAt": "",
            "finishedAt": "",
            "durationMs": 0.0,
            "nodeCount": 1,
            "memberCount": 0,
            "loadCaseCount": 0,
            "totalDof": 6,
            "freeDof": 1,
            "constrainedDof": 5,
            "solver": "scipy_eigh",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "eigenResult": {
            "massCaseId": "mass-1",
            "normalization": "mass",
            "modes": [
                {
                    "modeNo": 1,
                    "period": 1.0,
                    "circularFrequency": 2.0,
                    "participationFactors": [{"direction": "X", "value": 1.0}],
                    "cumulativeEffectiveMassRatios": [{"direction": "X", "value": 0.4}],
                    "shape": [
                        {
                            "nodeId": "N1",
                            "ux": 1.0,
                            "uy": 0.0,
                            "uz": 0.0,
                            "rx": 0.0,
                            "ry": 0.0,
                            "rz": 0.0,
                        }
                    ],
                }
            ],
        },
        "warnings": [],
        "errors": [],
    }
    monkeypatch.setattr(
        response_spectrum,
        "run_eigen_analysis",
        lambda *_args, **_kwargs: eigen_result,
    )

    result = run_response_spectrum_analysis(
        {"project": {"id": "insufficient-modes"}},
        {
            "modeCount": 1,
            "direction": "X",
            "targetCumulativeMassRatio": 0.9,
            "spectrumPoints": [
                {"period": 0.0, "value": 1.0},
                {"period": 2.0, "value": 1.0},
            ],
        },
    )

    assert result["analysisSummary"]["status"] == "warning"
    assert result["errors"] == []
    warning = result["warnings"][0]
    assert warning["code"] == "INSUFFICIENT_MODES"
    assert "0.4" in warning["message"]
    assert "0.9" in warning["message"]
    assert "1 mode(s)" in warning["message"]
    assert "direction X" in warning["message"]


def test_response_spectrum_result_matches_schema(result_schema: dict[str, Any]) -> None:
    jsonschema = pytest.importorskip(
        "jsonschema", reason="jsonschema is required for result schema tests."
    )
    project = axial_cantilever_mass("response-spectrum-schema")

    result = run_response_spectrum_analysis(
        project,
        {"massCaseId": "mass-1", "modeCount": 1, "direction": "X"},
    )

    errors = list(jsonschema.Draft202012Validator(result_schema).iter_errors(result))
    assert errors == []


def test_response_spectrum_api(response_spectrum_client) -> None:
    project = axial_cantilever_mass("response-spectrum-api")

    response = response_spectrum_client.post(
        "/api/analysis/response-spectrum",
        json={
            "project": project,
            "massCaseId": "mass-1",
            "modeCount": 1,
            "direction": "X",
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["analysisSummary"]["status"] == "success"
    assert result["responseSpectrumResult"]["direction"] == "X"


def axial_cantilever_mass(project_id: str) -> dict[str, Any]:
    project = base_project(project_id)
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": L, "y": 0.0, "z": 0.0},
    ]
    project["members"] = [
        {
            "id": "M1",
            "nodeI": "N1",
            "nodeJ": "N2",
            "materialId": "MAT1",
            "sectionId": "SEC1",
            "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
        }
    ]
    project["supports"] = [
        {
            "nodeId": "N1",
            "ux": True,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": True,
            "rz": True,
        },
        {
            "nodeId": "N2",
            "ux": False,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": True,
            "rz": True,
        },
    ]
    project["massCases"] = [
        {
            "id": "mass-1",
            "name": "Tip mass",
            "method": "lumped",
            "source": "manual",
            "items": [
                {
                    "nodeId": "N2",
                    "mx": TIP_MASS,
                    "my": 0.0,
                    "mz": 0.0,
                    "irx": 0.0,
                    "iry": 0.0,
                    "irz": 0.0,
                }
            ],
        }
    ]
    return project


def displacement_by_node(items: list[dict[str, Any]], node_id: str) -> dict[str, Any]:
    for item in items:
        if item["nodeId"] == node_id:
            return item
    raise AssertionError(f"Missing displacement for node {node_id}")
