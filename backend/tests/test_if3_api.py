from __future__ import annotations

import pytest

from backend.engine.if3_checksum import sha256_content_checksum

from .sample_models import cantilever_tip_load
from .test_eigen_analysis import eigen_cantilever
from .test_response_spectrum_analysis import axial_cantilever_mass
from .test_time_history_api import _sdof_cantilever_project


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


def if3_metadata(project: dict) -> dict:
    load_cases = project.get("loadCases", [])
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
                for load_case in load_cases
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


@pytest.mark.parametrize(
    ("endpoint", "request_body", "raw_result_key", "result_kind"),
    [
        (
            "/api/analysis/eigen",
            lambda: {
                "project": eigen_cantilever("if3-api-eigen", mass_y=2.5),
                "massCaseId": "mass-1",
                "modeCount": 1,
            },
            "eigenResult",
            "eigen",
        ),
        (
            "/api/analysis/response-spectrum",
            lambda: {
                "project": axial_cantilever_mass("if3-api-response-spectrum"),
                "massCaseId": "mass-1",
                "modeCount": 1,
                "direction": "X",
                "spectrumPoints": [
                    {"period": 0.0, "value": 1.0},
                    {"period": 10.0, "value": 1.0},
                ],
            },
            "responseSpectrumResult",
            "responseSpectrum",
        ),
        (
            "/api/analysis/time-history",
            lambda: {"project": _sdof_cantilever_project("if3-api-time-history")},
            "timeHistoryResult",
            "timeHistory",
        ),
        (
            "/api/influence/run",
            lambda: {
                "project": cantilever_tip_load(),
                "line": {"id": "line-1", "memberId": "M1", "stationCount": 5},
                "targets": [
                    {
                        "id": "disp-n2-uy",
                        "type": "displacement",
                        "nodeId": "N2",
                        "component": "uy",
                    }
                ],
            },
            "influenceResult",
            "influenceLine",
        ),
        (
            "/api/moving-load/run",
            lambda: {
                "project": cantilever_tip_load(),
                "movingLoadCase": {
                    "id": "mlc-if3-1",
                    "name": "IF3 moving load",
                    "line": {
                        "id": "line-M1",
                        "memberId": "M1",
                        "stationCount": 5,
                        "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                    },
                    "liveLoad": {
                        "id": "P1",
                        "type": "singlePoint",
                        "magnitude": 100.0,
                        "unit": "kN",
                        "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                    },
                    "targets": [
                        {
                            "id": "member-m1-mz-i",
                            "type": "memberEndForce",
                            "memberId": "M1",
                            "component": "Mz",
                            "end": "i",
                        }
                    ],
                    "options": {
                        "includeHistory": False,
                        "includeInfluenceResult": False,
                        "returnCsv": False,
                    },
                },
            },
            "movingLoadResult",
            "movingLoad",
        ),
    ],
)
def test_non_linear_static_endpoints_add_unsupported_if3_result_with_metadata(
    client,
    endpoint: str,
    request_body,
    raw_result_key: str,
    result_kind: str,
) -> None:
    payload = request_body()
    project = payload["project"]
    payload["if3"] = if3_metadata(project)

    response = client.post(endpoint, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert raw_result_key in body["result"]
    assert body["if3Result"]["status"] == "UNSUPPORTED"
    assert body["if3Result"]["payload"] == {}
    assert body["if3Result"]["resultKinds"] == []
    assert any(
        diagnostic["code"] == "UNSUPPORTED_RESULT_KIND"
        and diagnostic.get("resultKind") == result_kind
        for diagnostic in body["if3Result"]["diagnostics"]
    )


@pytest.mark.parametrize(
    ("endpoint", "request_body", "raw_result_key"),
    [
        (
            "/api/analysis/eigen",
            lambda: {
                "project": eigen_cantilever("if3-api-eigen-missing", mass_y=2.5),
                "massCaseId": "mass-1",
                "modeCount": 1,
            },
            "eigenResult",
        ),
        (
            "/api/analysis/response-spectrum",
            lambda: {
                "project": axial_cantilever_mass("if3-api-response-spectrum-missing"),
                "massCaseId": "mass-1",
                "modeCount": 1,
                "direction": "X",
                "spectrumPoints": [
                    {"period": 0.0, "value": 1.0},
                    {"period": 10.0, "value": 1.0},
                ],
            },
            "responseSpectrumResult",
        ),
        (
            "/api/analysis/time-history",
            lambda: {"project": _sdof_cantilever_project("if3-api-time-history-missing")},
            "timeHistoryResult",
        ),
        (
            "/api/influence/run",
            lambda: {
                "project": cantilever_tip_load(),
                "line": {"id": "line-1", "memberId": "M1", "stationCount": 5},
                "targets": [
                    {
                        "id": "disp-n2-uy",
                        "type": "displacement",
                        "nodeId": "N2",
                        "component": "uy",
                    }
                ],
            },
            "influenceResult",
        ),
        (
            "/api/moving-load/run",
            lambda: {
                "project": cantilever_tip_load(),
                "movingLoadCase": {
                    "id": "mlc-if3-missing",
                    "name": "IF3 moving load",
                    "line": {
                        "id": "line-M1",
                        "memberId": "M1",
                        "stationCount": 5,
                        "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                    },
                    "liveLoad": {
                        "id": "P1",
                        "type": "singlePoint",
                        "magnitude": 100.0,
                        "unit": "kN",
                        "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
                    },
                    "targets": [
                        {
                            "id": "member-m1-mz-i",
                            "type": "memberEndForce",
                            "memberId": "M1",
                            "component": "Mz",
                            "end": "i",
                        }
                    ],
                    "options": {
                        "includeHistory": False,
                        "includeInfluenceResult": False,
                        "returnCsv": False,
                    },
                },
            },
            "movingLoadResult",
        ),
    ],
)
def test_non_linear_static_endpoints_fail_if3_closed_when_metadata_missing(
    client,
    endpoint: str,
    request_body,
    raw_result_key: str,
) -> None:
    response = client.post(endpoint, json=request_body())

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert raw_result_key in body["result"]
    assert body["if3Result"]["status"] == "INVALID"
    assert any(
        diagnostic["code"] == "MISSING_SOURCE_BINDING"
        for diagnostic in body["if3Result"]["diagnostics"]
    )
