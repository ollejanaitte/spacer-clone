from __future__ import annotations

import copy

import pytest

from .sample_models import cantilever_tip_load, invalid_member_reference


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def test_health_endpoint(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_validate_endpoint_accepts_valid_project(client) -> None:
    response = client.post(
        "/api/projects/validate", json={"project": cantilever_tip_load()}
    )

    assert response.status_code in {200, 422}
    if response.status_code == 200:
        body = response.json()
        assert body["valid"] is True
        assert body["errors"] == []


def test_validate_endpoint_rejects_invalid_reference(client) -> None:
    response = client.post(
        "/api/projects/validate", json={"project": invalid_member_reference()}
    )

    assert response.status_code in {200, 422}
    if response.status_code == 200:
        body = response.json()
        assert body["valid"] is False
        assert any(error["code"] == "INVALID_REFERENCE" for error in body["errors"])


def test_analysis_run_endpoint_returns_structured_result(client) -> None:
    response = client.post(
        "/api/analysis/run",
        json={"project": cantilever_tip_load(), "options": {"returnCsv": False}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["csv"] is None
    assert body["result"]["analysisSummary"]["status"] in {
        "success",
        "warning",
        "failed",
    }
    assert {
        "displacements",
        "reactions",
        "memberEndForces",
        "warnings",
        "errors",
    } <= set(body["result"])


def test_analysis_run_endpoint_returns_failure_for_unstable_model(client) -> None:
    project = cantilever_tip_load()
    project["supports"] = []

    response = client.post(
        "/api/analysis/run",
        json={"project": project, "options": {"returnCsv": False}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "failed"
    assert any(
        error["code"] in {"MODEL_UNSTABLE", "SOLVER_ERROR"}
        for error in body["result"]["errors"]
    )


def test_save_endpoint_rejects_path_traversal(client) -> None:
    response = client.post(
        "/api/projects/save",
        json={"fileName": "../escape.project.json", "project": cantilever_tip_load()},
    )

    assert response.status_code in {400, 422}


def test_load_endpoint_handles_missing_file(client) -> None:
    response = client.post(
        "/api/projects/load", json={"fileName": "missing.project.json"}
    )

    assert response.status_code in {400, 404, 422}


def test_examples_endpoint_returns_required_examples(client) -> None:
    response = client.get("/api/examples")

    assert response.status_code == 200
    body = response.json()
    ids = {example["id"] for example in body["examples"]}
    assert {
        "cantilever_tip_load",
        "simple_beam_center_load",
        "simple_beam_uniform_load",
        "cantilever_torsion",
    } <= ids


def test_api_does_not_mutate_request_project(client) -> None:
    project = cantilever_tip_load()
    before = copy.deepcopy(project)

    client.post("/api/projects/validate", json={"project": project})

    assert project == before
