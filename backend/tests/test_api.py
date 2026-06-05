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


def test_validate_endpoint_accepts_material_without_shear_modulus(client) -> None:
    project = cantilever_tip_load()
    del project["materials"][0]["shearModulus"]

    response = client.post("/api/projects/validate", json={"project": project})

    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["errors"] == []


def test_validate_endpoint_returns_400_for_unexpected_schema_error(client) -> None:
    project = cantilever_tip_load()
    del project["materials"][0]["id"]

    response = client.post("/api/projects/validate", json={"project": project})

    assert response.status_code == 400
    body = response.json()
    assert body["valid"] is False
    assert body["errors"][0]["code"] == "SCHEMA_ERROR"


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


def test_influence_run_endpoint_returns_influence_result(client) -> None:
    response = client.post(
        "/api/influence/run",
        json={
            "project": cantilever_tip_load(),
            "line": {"id": "line-1", "memberId": "M1", "stationCount": 5},
            "targets": [
                {"id": "disp-n2-uy", "type": "displacement", "nodeId": "N2", "component": "uy"},
                {"id": "react-n1-fy", "type": "reaction", "nodeId": "N1", "component": "fy"},
                {"id": "member-m1-mz-i", "type": "memberEndForce", "memberId": "M1", "component": "Mz", "end": "i"},
            ],
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["analysisSummary"]["analysisType"] == "influence_line"
    assert result["analysisSummary"]["status"] == "success"
    influence = result["influenceResult"]
    assert influence["line"]["memberId"] == "M1"
    assert len(influence["stations"]) == 5
    assert influence["stations"][0]["station"] == 0.0
    assert influence["stations"][-1]["ratio"] == 1.0
    assert [item["targetId"] for item in influence["targetResults"]] == [
        "disp-n2-uy",
        "react-n1-fy",
        "member-m1-mz-i",
    ]
    assert all(len(item["values"]) == 5 for item in influence["targetResults"])


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


def test_save_load_then_analysis_run_succeeds(client, tmp_path, monkeypatch) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    project = cantilever_tip_load()

    save_response = client.post(
        "/api/projects/save",
        json={"fileName": "project.json", "project": project},
    )
    assert save_response.status_code == 200
    assert save_response.json() == {"saved": True, "fileName": "project.json"}

    load_response = client.post(
        "/api/projects/load", json={"fileName": "project.json"}
    )
    assert load_response.status_code == 200
    loaded = load_response.json()["project"]
    assert loaded == project

    analysis_response = client.post(
        "/api/analysis/run",
        json={"project": loaded, "options": {"returnCsv": False}},
    )
    assert analysis_response.status_code == 200
    assert analysis_response.json()["result"]["analysisSummary"]["status"] == "success"


@pytest.mark.parametrize(
    "file_name",
    [
        "",
        "../escape.project.json",
        "..\\escape.project.json",
        "C:\\temp\\escape.project.json",
        "/tmp/escape.project.json",
        "project.exe",
        "project.json.bak",
    ],
)
def test_save_endpoint_rejects_unsafe_file_names(client, file_name) -> None:
    response = client.post(
        "/api/projects/save",
        json={"fileName": file_name, "project": cantilever_tip_load()},
    )

    assert response.status_code in {400, 422}


def test_load_endpoint_handles_missing_file(client) -> None:
    response = client.post(
        "/api/projects/load", json={"fileName": "missing.project.json"}
    )

    assert response.status_code in {400, 404, 422}


def test_analysis_run_can_return_csv_headers_for_empty_results(client) -> None:
    project = cantilever_tip_load()
    project["supports"] = []

    response = client.post(
        "/api/analysis/run",
        json={"project": project, "options": {"returnCsv": True}},
    )

    assert response.status_code == 200
    csv_exports = response.json()["csv"]
    assert csv_exports["displacements.csv"].splitlines() == [
        "case_id,node_id,ux,uy,uz,rx,ry,rz"
    ]
    assert csv_exports["reactions.csv"].splitlines() == [
        "case_id,node_id,fx,fy,fz,mx,my,mz"
    ]
    assert csv_exports["member_section_forces.csv"].splitlines() == [
        "case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz"
    ]


def test_member_end_force_csv_expands_i_and_j_rows(client) -> None:
    response = client.post(
        "/api/analysis/run",
        json={"project": cantilever_tip_load(), "options": {"returnCsv": True}},
    )

    assert response.status_code == 200
    lines = response.json()["csv"]["member_section_forces.csv"].splitlines()
    assert lines[0] == "case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz"
    assert len(lines) == 3
    assert lines[1].split(",")[2:4] == ["0", "0"]
    assert lines[2].split(",")[2:4] == ["1", "1"]


def test_result_csv_exports_include_eigen_mode_shapes() -> None:
    from backend.app.reports import build_result_exports

    csv_exports = build_result_exports(
        {
            "projectId": "p1",
            "schemaVersion": "1.0.0",
            "analysisSummary": {"analysisType": "eigen"},
            "displacements": [],
            "reactions": [],
            "memberEndForces": [],
            "eigenResult": {
                "massCaseId": "mass-1",
                "normalization": "mass",
                "modes": [
                    {
                        "modeNo": 1,
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
    )

    assert csv_exports["displacements.csv"].splitlines() == [
        "case_id,node_id,ux,uy,uz,rx,ry,rz",
        "Mode 1,N1,1.0,0.0,0.0,0.0,0.0,0.0",
    ]
    assert csv_exports["reactions.csv"].splitlines() == [
        "case_id,node_id,fx,fy,fz,mx,my,mz"
    ]
    assert csv_exports["member_section_forces.csv"].splitlines() == [
        "case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz"
    ]


def test_result_csv_exports_include_response_spectrum_results() -> None:
    from backend.app.reports import build_result_exports

    csv_exports = build_result_exports(
        {
            "projectId": "p1",
            "schemaVersion": "1.0.0",
            "analysisSummary": {"analysisType": "response_spectrum"},
            "displacements": [],
            "reactions": [],
            "memberEndForces": [],
            "responseSpectrumResult": {
                "spectrumCaseId": "spec-1",
                "direction": "X",
                "dampingRatio": 0.05,
                "combinationMethod": "SRSS",
                "modalResults": [
                    {
                        "modeNo": 1,
                        "spectralAcceleration": 1.2,
                        "displacements": [
                            {
                                "nodeId": "N1",
                                "ux": 0.1,
                                "uy": 0.0,
                                "uz": 0.0,
                                "rx": 0.0,
                                "ry": 0.0,
                                "rz": 0.0,
                            }
                        ],
                        "reactions": [
                            {
                                "nodeId": "N1",
                                "fx": 10.0,
                                "fy": 0.0,
                                "fz": 0.0,
                                "mx": 0.0,
                                "my": 0.0,
                                "mz": 0.0,
                            }
                        ],
                        "memberSectionForces": [
                            {"memberId": "M1", "station": 0.5, "component": "N", "value": 2.0},
                            {"memberId": "M1", "station": 0.5, "component": "My", "value": 3.0},
                        ],
                    }
                ],
                "combinedResult": {
                    "method": "SRSS",
                    "displacements": [
                        {
                            "nodeId": "N1",
                            "ux": 0.2,
                            "uy": 0.0,
                            "uz": 0.0,
                            "rx": 0.0,
                            "ry": 0.0,
                            "rz": 0.0,
                        }
                    ],
                    "reactions": [],
                    "memberSectionForces": [],
                },
            },
            "warnings": [],
            "errors": [],
        }
    )

    assert csv_exports["displacements.csv"].splitlines() == [
        "case_id,node_id,ux,uy,uz,rx,ry,rz",
        "Mode 1,N1,0.1,0.0,0.0,0.0,0.0,0.0",
        "SRSS,N1,0.2,0.0,0.0,0.0,0.0,0.0",
    ]
    assert csv_exports["reactions.csv"].splitlines()[1] == "Mode 1,N1,10.0,0.0,0.0,0.0,0.0,0.0"
    assert csv_exports["member_section_forces.csv"].splitlines()[1] == "Mode 1,M1,0.5,0.5,2.0,,,,3.0,"


def test_autosave_endpoint_is_separate_from_project_save(client, tmp_path, monkeypatch) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "PROJECT_STORAGE_DIR", tmp_path)
    project = cantilever_tip_load()

    missing_response = client.get("/api/projects/autosave")
    assert missing_response.status_code == 200
    assert missing_response.json() == {
        "exists": False,
        "fileName": "autosave.json",
        "project": None,
    }

    save_response = client.post(
        "/api/projects/autosave",
        json={"project": project},
    )
    assert save_response.status_code == 200
    assert save_response.json() == {"saved": True, "fileName": "autosave.json"}
    assert (tmp_path / "autosave.json").exists()

    load_response = client.get("/api/projects/autosave")
    assert load_response.status_code == 200
    body = load_response.json()
    assert body["exists"] is True
    assert body["fileName"] == "autosave.json"
    assert body["project"] == project


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
