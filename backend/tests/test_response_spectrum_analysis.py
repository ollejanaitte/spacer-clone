from __future__ import annotations

import math
from typing import Any

import pytest

from backend.engine import run_response_spectrum_analysis

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
        json={"project": project, "massCaseId": "mass-1", "modeCount": 1, "direction": "X"},
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
