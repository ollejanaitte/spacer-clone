from __future__ import annotations

import pytest

from backend.engine.if3_checksum import sha256_content_checksum

from .sample_models import cantilever_tip_load


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def if3_metadata(project: dict) -> dict:
    return {
        "sourceDocumentId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "sourceDocumentVersion": 1,
        "sourceContentChecksum": sha256_content_checksum(project),
        "analysisSettings": project["analysisSettings"],
        "loadContext": {
            "entries": [
                {
                    "kind": "loadCase",
                    "sourceId": load_case["id"],
                    "label": load_case["name"],
                    "definition": load_case,
                }
                for load_case in project["loadCases"]
            ]
        },
        "solverName": "scipy_sparse",
        "solverVersion": "0.3.0",
    }


def test_static_analysis_response_adds_if3_result_without_removing_raw_result(client) -> None:
    project = cantilever_tip_load()

    response = client.post(
        "/api/analysis/run",
        json={
            "project": project,
            "options": {"returnCsv": False},
            "if3": if3_metadata(project),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert body["csv"] is None
    assert body["if3Result"]["status"] == "SUCCEEDED"
    assert body["if3Result"]["payload"]["nodeDisplacement"]["rows"]


def test_static_analysis_response_fails_if3_closed_when_metadata_missing(client) -> None:
    response = client.post(
        "/api/analysis/run",
        json={"project": cantilever_tip_load(), "options": {"returnCsv": False}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert body["if3Result"]["status"] == "INVALID"
    assert any(
        diagnostic["code"] == "MISSING_SOURCE_BINDING"
        for diagnostic in body["if3Result"]["diagnostics"]
    )
