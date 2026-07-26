from __future__ import annotations

import copy
from pathlib import Path

import pytest

from backend.app.contract_document_store import (
    TARGET_FRAME_SCHEMA_ID,
    TARGET_SCHEMA_VERSION,
    ContractDocumentStore,
)
from backend.app.main import maybe_persist_linear_static_if3_result
from backend.engine.if3_checksum import sha256_content_checksum

from .sample_models import cantilever_tip_load
from .test_if3_persistence import normalized_resource
from .test_eigen_analysis import eigen_cantilever
from .test_response_spectrum_analysis import axial_cantilever_mass
from .test_time_history_api import _sdof_cantilever_project


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


SOURCE_DOCUMENT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


def frame_document_for_project(project: dict, tmp_path: Path) -> tuple[Path, str]:
    frame_path = tmp_path / "frame.json"
    analysis_settings = project["analysisSettings"]
    load_definitions = [
        {
            "id": load_case["id"],
            "sourceId": load_case["id"],
            "label": load_case["name"],
            "definition": load_case,
        }
        for load_case in project.get("loadCases", [])
    ]
    frame_document = {
        "schemaId": TARGET_FRAME_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "bridge-frame-analysis",
        "documentId": SOURCE_DOCUMENT_ID,
        "revisionId": 7,
        "contentChecksum": sha256_content_checksum({"binding": "frame"}),
        "analysisSettings": analysis_settings,
        "loadDefinitions": load_definitions,
    }
    store = ContractDocumentStore()
    saved = store.save_frame_document(frame_path, frame_document, create_only=True)
    return frame_path, saved.checksum


def if3_metadata(project: dict, *, frame_path: Path | None = None, frame_checksum: str | None = None) -> dict:
    load_cases = project.get("loadCases", [])
    metadata = {
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
    if frame_path is not None and frame_checksum is not None:
        metadata["frameDocumentPath"] = str(frame_path)
        metadata["frameDocumentChecksum"] = frame_checksum
    return metadata


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


def test_static_analysis_with_frame_context_persists_and_returns_ref(client, tmp_path: Path) -> None:
    project = cantilever_tip_load()
    frame_path, frame_checksum = frame_document_for_project(project, tmp_path)

    response = client.post(
        "/api/analysis/run",
        json={
            "project": project,
            "options": {"returnCsv": False},
            "if3": if3_metadata(project, frame_path=frame_path, frame_checksum=frame_checksum),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["result"]["analysisSummary"]["status"] == "success"
    assert body["if3Result"]["status"] == "SUCCEEDED"
    assert "persistedResultRef" in body
    assert body["persistedResultRef"]["documentId"] == body["if3Result"]["resultId"]
    assert body["persistedResultRef"]["uri"] == f"results/{body['if3Result']['resultId']}.if3.json"

    store = ContractDocumentStore()
    loaded_frame = store.read_document(frame_path)
    assert loaded_frame["persistedResultRefs"] == [body["persistedResultRef"]]
    loaded_sidecar = store.load_if3_result_resource(frame_path, body["if3Result"]["resultId"])
    assert loaded_sidecar["resultId"] == body["if3Result"]["resultId"]


def test_maybe_persist_with_frame_context_persists_failed_if3_result(tmp_path: Path) -> None:
    project = cantilever_tip_load()
    frame_path, frame_checksum = frame_document_for_project(project, tmp_path)
    resource = copy.deepcopy(normalized_resource())
    resource["status"] = "FAILED"
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)

    persisted_ref = maybe_persist_linear_static_if3_result(
        if3_metadata(project, frame_path=frame_path, frame_checksum=frame_checksum),
        resource,
    )

    assert persisted_ref is not None
    assert persisted_ref["documentId"] == resource["resultId"]
    store = ContractDocumentStore()
    loaded = store.load_if3_result_resource(frame_path, resource["resultId"])
    assert loaded["status"] == "FAILED"


def test_static_analysis_without_frame_context_remains_transient(client) -> None:
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
    assert body["if3Result"]["status"] == "SUCCEEDED"
    assert "persistedResultRef" not in body


def test_static_analysis_preserves_raw_fields_when_persisting(client, tmp_path: Path) -> None:
    project = cantilever_tip_load()
    frame_path, frame_checksum = frame_document_for_project(project, tmp_path)

    response = client.post(
        "/api/analysis/run",
        json={
            "project": project,
            "options": {"returnCsv": True},
            "if3": if3_metadata(project, frame_path=frame_path, frame_checksum=frame_checksum),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "result" in body
    assert "csv" in body
    assert "if3Result" in body
    assert body["result"]["displacements"]
    assert body["csv"] is not None
    assert body["persistedResultRef"]["documentId"] == body["if3Result"]["resultId"]


def test_static_analysis_persistence_failure_is_fail_closed(client, tmp_path: Path) -> None:
    project = cantilever_tip_load()
    frame_path, frame_checksum = frame_document_for_project(project, tmp_path)

    response = client.post(
        "/api/analysis/run",
        json={
            "project": project,
            "options": {"returnCsv": False},
            "if3": if3_metadata(
                project,
                frame_path=frame_path,
                frame_checksum="0" * 64,
            ),
        },
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "FRAME_CHECKSUM_MISMATCH"


def test_if3_availability_endpoint_returns_catalog(client, tmp_path: Path) -> None:
    project = cantilever_tip_load()
    frame_path, frame_checksum = frame_document_for_project(project, tmp_path)
    persisted = client.post(
        "/api/analysis/run",
        json={
            "project": project,
            "options": {"returnCsv": False},
            "if3": if3_metadata(project, frame_path=frame_path, frame_checksum=frame_checksum),
        },
    )
    assert persisted.status_code == 200
    frame_checksum = ContractDocumentStore().checksum_for(frame_path)

    response = client.post(
        "/api/if3/availability",
        json={"frameDocumentPath": str(frame_path)},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["catalog"]) == 1
    assert body["catalog"][0]["status"] == "STALE"


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
