#!/usr/bin/env python3
"""Phase 7-02 WP-G: /api/design/analyze AnalysisDocument envelope API tests.

R1 regression: the new envelope `{analysisDocument}` must return a successful
linear-static analysis with a valid IF3 resource (was SCHEMA_ERROR).
"""

import pytest

from backend.tests.test_solver_input import _analysis_document


@pytest.fixture
def client(api_app):
    from starlette import testclient

    return testclient.TestClient(api_app)


def test_design_analyze_analysis_document_succeeds(client) -> None:
    payload = {"analysisDocument": _analysis_document()}
    response = client.post("/api/design/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert len(body["result"]["displacements"]) == 2
    assert len(body["result"]["reactions"]) == 1
    assert body["if3Result"]["status"] == "SUCCEEDED"
    assert "resultChecksum" in body["if3Result"]


def test_design_analyze_rejects_malformed_analysis_document(client) -> None:
    doc = _analysis_document()
    doc["nodes"][1]["x"] = None
    response = client.post("/api/design/analyze", json={"analysisDocument": doc})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ANALYSIS_DOCUMENT_INVALID"


def test_design_analyze_legacy_grillage_compat(client) -> None:
    # COMPATIBILITY: legacy {grillage} envelope still runs (R1 fixed).
    grillage = {
        "bridgeId": "B-1",
        "nodes": [
            {"id": "N1", "x": 0, "y": 0, "z": 0},
            {"id": "N2", "x": 4, "y": 0, "z": 0},
        ],
        "members": [
            {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "sectionId": "SEC1"},
        ],
        "supports": [{"nodeId": "N1", "ux": True, "uy": True, "uz": True}],
        "loadCases": [],
    }
    response = client.post("/api/design/analyze", json={"grillage": grillage})
    assert response.status_code == 200
    body = response.json()
    assert body["authorization"] == "NOT_GRANTED"
    assert body["analysisSummary"]["status"] in ("success", "warning")
