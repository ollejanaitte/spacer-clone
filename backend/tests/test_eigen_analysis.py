from __future__ import annotations

import math
from typing import Any

import pytest

from backend.engine import run_eigen_analysis

from .assertions import assert_close
from .sample_models import E, I, L, base_project


TIP_MASS = 2.5


@pytest.fixture(scope="module")
def eigen_client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def test_single_dof_axial_mass_matches_spring_mass_frequency() -> None:
    project = eigen_cantilever("single-dof-eigen", mass_x=TIP_MASS)
    constrain_tip_dofs(project, "uy", "uz", "rx", "ry", "rz")

    result = run_eigen_analysis(project, mass_case_id="mass-1", mode_count=1)

    assert result["analysisSummary"]["status"] == "success"
    mode = result["eigenResult"]["modes"][0]
    axial_stiffness = E * project["sections"][0]["area"] / L
    expected_frequency = math.sqrt(axial_stiffness / TIP_MASS) / (2.0 * math.pi)
    assert_close(mode["frequency"], expected_frequency)
    assert_close(mode["modalMass"], 1.0)


def test_cantilever_tip_mass_matches_condensed_bending_frequency_and_rotation(
) -> None:
    project = eigen_cantilever("cantilever-bending-eigen", mass_y=TIP_MASS)

    result = run_eigen_analysis(project, mass_case_id="mass-1", mode_count=1)

    assert result["analysisSummary"]["status"] == "success"
    mode = result["eigenResult"]["modes"][0]
    expected_frequency = math.sqrt(3.0 * E * I / (TIP_MASS * L**3)) / (
        2.0 * math.pi
    )
    assert_close(mode["frequency"], expected_frequency)

    fixed = mode_shape(mode, "N1")
    tip = mode_shape(mode, "N2")
    assert all(
        fixed[name] == 0.0 for name in ("ux", "uy", "uz", "rx", "ry", "rz")
    )
    assert abs(tip["rz"]) > 0.0
    assert_close(abs(tip["rz"] / tip["uy"]), 3.0 / (2.0 * L))


def test_recovered_mode_remains_mass_normalized() -> None:
    project = eigen_cantilever("mass-normalized-eigen", mass_y=TIP_MASS)

    result = run_eigen_analysis(project, mass_case_id="mass-1", mode_count=1)

    mode = result["eigenResult"]["modes"][0]
    shape_by_node = {item["nodeId"]: item for item in mode["shape"]}
    modal_mass = sum(
        item["mx"] * shape_by_node[item["nodeId"]]["ux"] ** 2
        + item["my"] * shape_by_node[item["nodeId"]]["uy"] ** 2
        + item["mz"] * shape_by_node[item["nodeId"]]["uz"] ** 2
        for item in project["massCases"][0]["items"]
    )
    assert_close(modal_mass, 1.0)
    assert_close(mode["modalMass"], 1.0)
    assert_close(directional_value(mode["effectiveMassRatios"], "Y"), 1.0)


def test_singular_zero_mass_slave_partition_returns_model_unstable() -> None:
    project = eigen_cantilever("singular-slave-eigen", mass_x=TIP_MASS)
    constrain_tip_dofs(project, "uy", "uz", "rx", "ry", "rz")
    project["nodes"].append({"id": "N3", "x": 2.0 * L, "y": 0.0, "z": 0.0})

    result = run_eigen_analysis(project, mass_case_id="mass-1", mode_count=1)

    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"][0]["code"] == "MODEL_UNSTABLE"
    assert "Kss" in result["errors"][0]["message"]


def test_eigen_result_matches_existing_result_schema(
    result_schema: dict[str, Any],
) -> None:
    jsonschema = pytest.importorskip(
        "jsonschema", reason="jsonschema is required for result schema tests."
    )
    project = eigen_cantilever("eigen-schema-regression", mass_y=TIP_MASS)
    result = run_eigen_analysis(project, mass_case_id="mass-1", mode_count=1)

    errors = list(jsonschema.Draft202012Validator(result_schema).iter_errors(result))

    assert errors == []


def test_eigen_api_returns_recovered_slave_rotation(eigen_client) -> None:
    project = eigen_cantilever("eigen-api-regression", mass_y=TIP_MASS)

    response = eigen_client.post(
        "/api/analysis/eigen",
        json={"project": project, "massCaseId": "mass-1", "modeCount": 1},
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["analysisSummary"]["status"] == "success"
    assert abs(mode_shape(result["eigenResult"]["modes"][0], "N2")["rz"]) > 0.0


def eigen_cantilever(
    project_id: str,
    *,
    mass_x: float = 0.0,
    mass_y: float = 0.0,
    mass_z: float = 0.0,
) -> dict[str, Any]:
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
        }
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
                    "mx": mass_x,
                    "my": mass_y,
                    "mz": mass_z,
                    "irx": 0.0,
                    "iry": 0.0,
                    "irz": 0.0,
                }
            ],
        }
    ]
    project["analysisSettings"]["eigen"] = {
        "massCaseId": "mass-1",
        "modeCount": 1,
    }
    return project


def constrain_tip_dofs(project: dict[str, Any], *dof_names: str) -> None:
    support = {
        "nodeId": "N2",
        "ux": False,
        "uy": False,
        "uz": False,
        "rx": False,
        "ry": False,
        "rz": False,
    }
    for name in dof_names:
        support[name] = True
    project["supports"].append(support)


def mode_shape(mode: dict[str, Any], node_id: str) -> dict[str, Any]:
    return next(item for item in mode["shape"] if item["nodeId"] == node_id)


def directional_value(items: list[dict[str, Any]], direction: str) -> float:
    return next(item["value"] for item in items if item["direction"] == direction)
