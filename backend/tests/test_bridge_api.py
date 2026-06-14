from __future__ import annotations

import pytest


@pytest.fixture(scope="session")
def client(api_app):
    testclient = pytest.importorskip("fastapi.testclient", reason="FastAPI is required for API tests.")
    return testclient.TestClient(api_app)


def test_bridge_template_endpoint(client) -> None:
    response = client.get("/api/bridge/template")
    assert response.status_code == 200
    body = response.json()
    assert "project" in body
    project = body["project"]
    assert project["schemaVersion"] == "0.1.0"
    assert project["crossSection"]["lane_count"] >= 1


def test_bridge_crud_lifecycle(client) -> None:
    # Get template
    template_resp = client.get("/api/bridge/template")
    assert template_resp.status_code == 200
    bridge = template_resp.json()["project"]
    bridge_id = "bridge-crud-test"

    # Create
    create = client.post("/api/bridge", json={"id": bridge_id, "project": bridge})
    assert create.status_code == 200, create.text
    assert create.json()["id"] == bridge_id

    # Get
    get_resp = client.get(f"/api/bridge/{bridge_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == bridge_id

    # Update
    updated = {**bridge, "name": "Updated"}
    update_resp = client.put(f"/api/bridge/{bridge_id}", json={"project": updated})
    assert update_resp.status_code == 200
    assert update_resp.json()["project"]["name"] == "Updated"

    # Delete
    delete = client.delete(f"/api/bridge/{bridge_id}")
    assert delete.status_code == 200

    # 404 after delete
    after = client.get(f"/api/bridge/{bridge_id}")
    assert after.status_code == 404


def test_bridge_404(client) -> None:
    response = client.get("/api/bridge/no-such-bridge")
    assert response.status_code == 404


def test_bridge_invalid_payload(client) -> None:
    response = client.post("/api/bridge", json={"id": "bad", "project": {"foo": "bar"}})
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "BRIDGE_DOMAIN_ERROR"


def test_fem_generate_endpoint(client) -> None:
    template = client.get("/api/bridge/template").json()["project"]
    bridge_id = "bridge-fem-test"
    client.post("/api/bridge", json={"id": bridge_id, "project": template})
    try:
        resp = client.post(
            "/api/fem/generate",
            json={"bridge_id": bridge_id, "runAnalysis": True},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["summary"]["nodeCount"] > 0
        assert body["summary"]["memberCount"] > 0
        assert body["summary"]["supportCount"] >= 2
        assert body["analysis"] is not None
        assert body["analysis"]["analysisSummary"]["status"] in ("success", "warning", "failed")
    finally:
        client.delete(f"/api/bridge/{bridge_id}")


def test_fem_generate_inline_bridge(client) -> None:
    template = client.get("/api/bridge/template").json()["project"]
    resp = client.post(
        "/api/fem/generate",
        json={"bridge": template, "runAnalysis": False},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["summary"]["nodeCount"] > 0


def test_fem_generate_404(client) -> None:
    resp = client.post(
        "/api/fem/generate",
        json={"bridge_id": "no-such-bridge", "runAnalysis": False},
    )
    assert resp.status_code == 404


def test_viewer_bridge_endpoint(client) -> None:
    template = client.get("/api/bridge/template").json()["project"]
    bridge_id = "bridge-viewer-test"
    client.post("/api/bridge", json={"id": bridge_id, "project": template})
    try:
        resp = client.get(f"/api/viewer/bridge/{bridge_id}")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "nodes" in body
        assert "edges" in body
        assert "lines" in body
        assert "loads" in body
        assert len(body["nodes"]) == body["summary"]["nodeCount"]
    finally:
        client.delete(f"/api/bridge/{bridge_id}")


def test_viewer_bridge_404(client) -> None:
    resp = client.get("/api/viewer/bridge/no-such-bridge")
    assert resp.status_code == 404


def test_bridge_list(client) -> None:
    resp = client.get("/api/bridge")
    assert resp.status_code == 200
    assert "bridges" in resp.json()
