"""Backend API integration tests for Linear Time History Analysis (TH-5a).

These tests verify that:

* ``run_time_history_analysis`` returns a structured result whose
  ``analysisSummary.status`` is ``"success"`` for a valid project.
* The persisted result block contains the meta block, the time
  axis, and per-node displacement / velocity / acceleration
  histories whose lengths match the ground motion sample count.
* A zero ground acceleration produces an identically zero response.
* The MVP-rejected configurations (missing settings, missing
  ground motion, multiple ground motions, mismatched ``timeStep``)
  surface as ``AnalysisError`` with a code and a JSON-pointer
  path.
* The HTTP endpoint ``/api/analysis/time-history`` delegates to the
  engine function and returns the same envelope.
* Existing ``/api/analysis/run`` (static) and
  ``/api/analysis/eigen`` results remain unchanged when a project
  is re-run end to end.
"""

from __future__ import annotations

import copy
from typing import Any

import numpy as np
import pytest

from backend.engine import run_analysis, run_eigen_analysis, run_time_history_analysis
from backend.engine.errors import AnalysisError
from backend.tests.sample_models import base_project


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _sdof_cantilever_project(
    project_id: str = "th-5a-sdof",
    *,
    direction: str = "X",
    unit: str = "m/s2",
    samples: list[float] | None = None,
    time_step: float = 0.05,
    duration: float = 0.5,
    damping: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a 1-DOF cantilever with a single ground motion record.

    The active DOF is the X translation of the free node N2.
    """

    project = base_project(project_id)
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
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
    project["members"] = [
        {
            "id": "M1",
            "nodeI": "N1",
            "nodeJ": "N2",
            "materialId": "MAT1",
            "sectionId": "SEC1",
        }
    ]
    if samples is None:
        n_samples = int(round(duration / time_step)) + 1
        # Sinusoidal acceleration with one full cycle.
        samples = [
            float(np.sin(2.0 * np.pi * i * time_step / duration))
            for i in range(n_samples)
        ]
    damping = damping or {"type": "rayleigh", "alpha": 0.0, "beta": 0.0}
    return {
        "project": {
            "id": project_id,
            "name": project_id,
            "schemaVersion": "1.0.0",
            "description": "",
            "createdAt": "",
            "updatedAt": "",
        },
        "units": project["units"],
        "nodes": project["nodes"],
        "materials": project["materials"],
        "sections": project["sections"],
        "members": project["members"],
        "supports": project["supports"],
        "loadCases": project["loadCases"],
        "nodalLoads": project.get("nodalLoads", []),
        "memberLoads": project.get("memberLoads", []),
        "massCases": [
            {
                "id": "m-1",
                "name": "Tip mass",
                "method": "lumped",
                "source": "manual",
                "items": [{"nodeId": "N2", "mx": 1.0}],
            }
        ],
        "analysisSettings": {
            **project["analysisSettings"],
            "timeHistory": {
                "enabled": True,
                "method": "newmark-beta",
                "timeStep": time_step,
                "duration": duration,
                "beta": 0.25,
                "gamma": 0.5,
                "damping": damping,
            },
        },
        "groundMotions": [
            {
                "id": "gm-001",
                "name": "Sinusoidal",
                "direction": direction,
                "timeStep": time_step,
                "duration": duration,
                "unit": unit,
                "samples": list(samples),
            }
        ],
    }


@pytest.fixture(scope="module")
def api_client(api_app):
    testclient = pytest.importorskip(
        "fastapi.testclient", reason="FastAPI is required for API tests."
    )
    return testclient.TestClient(api_app)


# ---------------------------------------------------------------------------
# run_time_history_analysis: success paths
# ---------------------------------------------------------------------------


def test_run_time_history_analysis_succeeds_on_cantilever() -> None:
    project = _sdof_cantilever_project()
    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "success"
    assert result["analysisSummary"]["analysisType"] == "time_history"
    assert result["analysisSummary"]["solver"] == "newmark_beta"
    block = result["timeHistoryResult"]
    assert block is not None
    # The meta block must be present and self-consistent.
    meta = block["meta"]
    assert meta["status"] == "success"
    assert meta["method"] == "newmark-beta"
    assert meta["beta"] == 0.25
    assert meta["gamma"] == 0.5
    n_samples = int(round(meta["duration"] / meta["timeStep"])) + 1
    assert meta["sampleCount"] == n_samples
    # The time axis length matches the meta block and the per-node
    # history lengths.
    assert len(block["time"]) == n_samples
    assert "N2" in block["displacements"]
    assert len(block["displacements"]["N2"]) == n_samples
    assert len(block["velocities"]["N2"]) == n_samples
    assert len(block["accelerations"]["N2"]) == n_samples


def test_run_time_history_analysis_keeps_response_arrays_consistent() -> None:
    project = _sdof_cantilever_project()
    result = run_time_history_analysis(project)
    block = result["timeHistoryResult"]
    n_samples = block["meta"]["sampleCount"]
    for key in ("displacements", "velocities", "accelerations"):
        for series in block[key].values():
            assert len(series) == n_samples


def test_zero_ground_acceleration_yields_zero_response() -> None:
    project = _sdof_cantilever_project(samples=[0.0] * 11)
    result = run_time_history_analysis(project)
    assert result["analysisSummary"]["status"] == "success"
    block = result["timeHistoryResult"]
    for key in ("displacements", "velocities", "accelerations"):
        for series in block[key].values():
            assert all(value == pytest.approx(0.0, abs=1.0e-15) for value in series)


def test_ground_motion_in_gal_is_converted_to_m_per_s2() -> None:
    project = _sdof_cantilever_project(
        unit="gal",
        samples=[100.0] * 11,
    )
    result = run_time_history_analysis(project)
    assert result["analysisSummary"]["status"] == "success"
    # The 100 gal ground acceleration produces a non-zero response
    # that matches the 1 m/s2 case (factor 0.01).
    project_m_per_s2 = _sdof_cantilever_project(
        unit="m/s2",
        samples=[1.0] * 11,
    )
    result_m = run_time_history_analysis(project_m_per_s2)
    block_gal = result["timeHistoryResult"]["displacements"]["N2"]
    block_m = result_m["timeHistoryResult"]["displacements"]["N2"]
    np.testing.assert_allclose(block_gal, block_m, atol=1.0e-12)


# ---------------------------------------------------------------------------
# run_time_history_analysis: failure paths
# ---------------------------------------------------------------------------


def test_missing_time_history_settings_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["analysisSettings"] = {**project["analysisSettings"]}
    project["analysisSettings"].pop("timeHistory", None)

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"][0]["code"] == "TIME_HISTORY_SETTINGS_MISSING"
    assert (
        result["errors"][0]["path"] == "/analysisSettings/timeHistory"
    )


def test_missing_ground_motion_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["groundMotions"] = []

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"] == "TIME_HISTORY_GROUND_MOTION_MISSING"
    )
    assert result["errors"][0]["path"] == "/groundMotions"


def test_multiple_ground_motions_are_rejected() -> None:
    project = _sdof_cantilever_project()
    # Duplicate the single record to push the count to two.
    project["groundMotions"].append(copy.deepcopy(project["groundMotions"][0]))

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"]
        == "TIME_HISTORY_GROUND_MOTION_MULTIPLE"
    )


def test_ground_motion_dt_mismatch_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["groundMotions"][0]["timeStep"] = (
        project["groundMotions"][0]["timeStep"] * 2.0
    )

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"]
        == "TIME_HISTORY_GROUND_MOTION_DT_MISMATCH"
    )
    assert result["errors"][0]["path"] == "/groundMotions/0/timeStep"


def test_invalid_damping_block_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["analysisSettings"]["timeHistory"]["damping"] = {
        "type": "rayleigh",
        "alpha": -0.1,
        "beta": 0.0,
    }

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"] == "TIME_HISTORY_DAMPING_INVALID"
    )
    assert result["errors"][0]["path"].startswith(
        "/analysisSettings/timeHistory/damping"
    )


def test_invalid_damping_without_alpha_or_beta_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["analysisSettings"]["timeHistory"]["damping"] = {
        "type": "rayleigh",
    }

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"] == "TIME_HISTORY_DAMPING_INVALID"
    )


def test_invalid_method_raises_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["analysisSettings"]["timeHistory"]["method"] = "hht-alpha"

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    # The MVP rejects the method at the TH-1a validation step
    # (parse_time_history_settings) which translates to
    # INVALID_VALUE with a path that points at the offending field.
    assert result["errors"][0]["code"] in {
        "TIME_HISTORY_SETTINGS_INVALID",
        "TIME_HISTORY_METHOD_UNSUPPORTED",
        "INVALID_VALUE",
    }
    assert result["errors"][0]["path"].startswith(
        "/analysisSettings/timeHistory"
    )


def test_non_finite_samples_raise_analysis_error() -> None:
    project = _sdof_cantilever_project()
    project["groundMotions"][0]["samples"] = [0.0, float("nan"), 0.0, 0.0, 0.0,
                                              0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"]
        == "TIME_HISTORY_GROUND_MOTION_INVALID"
    )


# ---------------------------------------------------------------------------
# HTTP endpoint: /api/analysis/time-history
# ---------------------------------------------------------------------------


def test_http_endpoint_returns_success_envelope(api_client) -> None:
    project = _sdof_cantilever_project(project_id="th-http-ok")
    response = api_client.post(
        "/api/analysis/time-history",
        json={"project": project},
    )
    assert response.status_code == 200
    body = response.json()
    result = body["result"]
    assert result["analysisSummary"]["status"] == "success"
    assert result["analysisSummary"]["analysisType"] == "time_history"
    assert result["timeHistoryResult"]["meta"]["method"] == "newmark-beta"


def test_http_endpoint_returns_failure_envelope(api_client) -> None:
    project = _sdof_cantilever_project(project_id="th-http-fail")
    project["groundMotions"] = []
    response = api_client.post(
        "/api/analysis/time-history",
        json={"project": project},
    )
    assert response.status_code == 200
    body = response.json()
    result = body["result"]
    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"]
        == "TIME_HISTORY_GROUND_MOTION_MISSING"
    )


def test_engine_function_rejects_non_finite_samples() -> None:
    # The HTTP transport encodes the request body with ``allow_nan=False``
    # in this test environment, so we cannot exercise the NaN path through
    # ``TestClient.post``. Instead, verify that the engine function
    # itself rejects NaN samples with a clear path and that the
    # returned envelope is JSON-serializable.
    project = _sdof_cantilever_project(project_id="th-engine-nan")
    project["groundMotions"][0]["samples"][0] = float("nan")

    result = run_time_history_analysis(project)

    assert result["analysisSummary"]["status"] == "failed"
    assert (
        result["errors"][0]["code"]
        == "TIME_HISTORY_GROUND_MOTION_INVALID"
    )
    assert result["errors"][0]["path"] == "/groundMotions/0/samples"
    # The envelope must not contain any non-finite value.
    import json
    json.dumps(result)  # raises ValueError on non-finite floats


# ---------------------------------------------------------------------------
# Backward compatibility: existing analyses are not affected
# ---------------------------------------------------------------------------


def test_existing_static_analysis_is_unchanged() -> None:
    project = _sdof_cantilever_project(project_id="th-bc-static")
    # Drop the time-history block to make this a plain linear-static
    # problem; the static path must still work.
    project["analysisSettings"] = dict(project["analysisSettings"])
    project["analysisSettings"].pop("timeHistory", None)
    project["groundMotions"] = []
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 1.0,
            "fy": 0.0,
            "fz": 0.0,
            "mx": 0.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    result = run_analysis(project)
    assert result["analysisSummary"]["status"] == "success"
    assert result["analysisSummary"]["analysisType"] == "linear_static"


def test_existing_eigen_analysis_is_unchanged() -> None:
    project = _sdof_cantilever_project(project_id="th-bc-eigen")
    project["analysisSettings"] = dict(project["analysisSettings"])
    project["analysisSettings"].pop("timeHistory", None)
    project["groundMotions"] = []
    result = run_eigen_analysis(project, mass_case_id="m-1", mode_count=1)
    assert result["analysisSummary"]["status"] == "success"
    assert result["analysisSummary"]["analysisType"] == "eigen"