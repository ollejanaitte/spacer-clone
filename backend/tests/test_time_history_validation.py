"""Validation tests for the time history analysis schema.

These tests verify that:

* ``validate_project`` accepts projects without time history fields.
* ``validate_project`` accepts projects with valid timeHistory and
  groundMotions blocks.
* ``validate_project`` rejects projects with invalid time history
  fields and translates the TH-1a TimeHistoryModelError into the
  project-standard AnalysisError format.
* Existing example projects continue to be valid.
* Unknown future-compatible fields do not trigger validation errors.
"""

from __future__ import annotations

import pytest

from backend.engine import parse_model, validate_project
from backend.engine.errors import AnalysisError

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Validation success
# ---------------------------------------------------------------------------


def test_validate_project_without_time_history_is_valid() -> None:
    project = base_project("validation-empty")
    project["analysisSettings"] = {}

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_minimal_analysis_settings_is_valid() -> None:
    project = base_project("validation-minimal")
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
    }

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_eigen_only_is_valid() -> None:
    project = base_project("validation-eigen-only")
    # Provide a valid mass case so the eigen block validation accepts
    # the project.
    project["massCases"] = [
        {
            "id": "mass-1",
            "name": "Tip Mass",
            "method": "lumped",
            "source": "manual",
            "items": [],
        }
    ]
    project["analysisSettings"]["eigen"] = {"massCaseId": "mass-1", "modeCount": 3}

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_valid_time_history_is_valid() -> None:
    project = base_project("validation-th-valid")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_valid_ground_motions_is_valid() -> None:
    project = base_project("validation-gm-valid")
    project["groundMotions"] = [
        {
            "id": "gm-001",
            "name": "El Centro 1940 NS",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, 0.012, 0.018, -0.003],
        }
    ]

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_multiple_ground_motions_is_valid() -> None:
    project = base_project("validation-gm-multi")
    project["groundMotions"] = [
        {
            "id": "gm-001",
            "name": "X record",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, 0.1],
        },
        {
            "id": "gm-002",
            "name": "Y record",
            "direction": "Y",
            "timeStep": 0.02,
            "duration": 15.0,
            "unit": "gal",
            "samples": [0.0, 50.0, -25.0],
        },
    ]

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_with_time_history_and_ground_motions_is_valid() -> None:
    project = base_project("validation-both")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0],
        }
    ]

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


# ---------------------------------------------------------------------------
# Validation failure: AnalysisError translation
# ---------------------------------------------------------------------------


def test_validate_project_rejects_invalid_time_history_method() -> None:
    project = base_project("validation-bad-method")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "central-difference",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    result = validate_project(project)

    assert result["valid"] is False
    assert len(result["errors"]) == 1
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/method"
    assert "method" in error["message"].lower()


def test_validate_project_rejects_non_positive_time_step() -> None:
    project = base_project("validation-bad-timestep")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.0,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/timeStep"


def test_validate_project_rejects_non_positive_beta() -> None:
    project = base_project("validation-bad-beta")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.0,
        "gamma": 0.5,
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/beta"


def test_validate_project_rejects_non_positive_gamma() -> None:
    project = base_project("validation-bad-gamma")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.0,
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/gamma"


def test_validate_project_rejects_negative_duration() -> None:
    project = base_project("validation-bad-duration")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": -1.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/duration"


def test_validate_project_rejects_invalid_damping_ratio() -> None:
    project = base_project("validation-bad-damping")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
        "damping": {
            "type": "rayleigh",
            "targetDampingRatio1": 1.0,
            "targetDampingRatio2": 0.05,
        },
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/damping/targetDampingRatio1"


def test_validate_project_rejects_invalid_damping_type() -> None:
    project = base_project("validation-bad-damping-type")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
        "damping": {
            "type": "viscous-fluid",
        },
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/analysisSettings/timeHistory/damping/type"


def test_validate_project_rejects_invalid_ground_motion_direction() -> None:
    project = base_project("validation-bad-direction")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "W",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0],
        }
    ]

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/groundMotions/*/direction"


def test_validate_project_rejects_invalid_ground_motion_unit() -> None:
    project = base_project("validation-bad-unit")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m",
            "samples": [0.0],
        }
    ]

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/groundMotions/*/unit"


def test_validate_project_rejects_empty_ground_motion_id() -> None:
    project = base_project("validation-empty-id")
    project["groundMotions"] = [
        {
            "id": "",
            "name": "No id",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0],
        }
    ]

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    assert error["path"] == "/groundMotions/*/id"


def test_validate_project_rejects_non_numeric_sample_with_index_path() -> None:
    project = base_project("validation-bad-sample")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, "oops"],
        }
    ]

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "INVALID_VALUE"
    # parse_ground_motions emits per-record index paths.
    assert error["path"] == "/groundMotions/0/samples[1]"


# ---------------------------------------------------------------------------
# Future compatibility
# ---------------------------------------------------------------------------


def test_validate_project_accepts_unknown_nested_field_in_time_history() -> None:
    project = base_project("validation-unknown-th")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
        "futureField": "reserved",
        "extraNumber": 42,
    }

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_accepts_unknown_nested_field_in_ground_motion() -> None:
    project = base_project("validation-unknown-gm")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0],
            "futureAnnotation": "tbd",
        }
    ]

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


# ---------------------------------------------------------------------------
# Backward compatibility
# ---------------------------------------------------------------------------


def test_existing_example_projects_remain_valid() -> None:
    from .conftest import EXAMPLES_DIR, load_json

    for name in [
        "project.json",
        "cantilever_tip_load.json",
        "cantilever_eigen.json",
        "cantilever_response_spectrum.json",
    ]:
        project = load_json(EXAMPLES_DIR / name)
        result = validate_project(project)
        assert result["valid"] is True, name


def test_validate_project_does_not_change_existing_eigen_validation() -> None:
    """Re-running the project validator with an existing project that
    only sets eigen must not introduce new time history errors.
    """
    project = base_project("validation-eigen-only-2")
    project["massCases"] = [
        {
            "id": "mass-1",
            "name": "Tip Mass",
            "method": "lumped",
            "source": "manual",
            "items": [],
        }
    ]
    project["analysisSettings"]["eigen"] = {"massCaseId": "mass-1", "modeCount": 3}

    result = validate_project(project)

    assert result == {"valid": True, "errors": []}


def test_validate_project_does_not_change_existing_influence_validation() -> None:
    """The existing influence validator must continue to work. The
    influence block requires a valid line; an invalid influence
    project must still report the influence error and not be
    masked by time history validation.
    """
    project = base_project("validation-influence")
    project["analysisSettings"]["influence"] = {}  # Missing required line

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    assert error["code"] == "SCHEMA_ERROR"
    assert "influence" in error["path"]


# ---------------------------------------------------------------------------
# Direct function tests
# ---------------------------------------------------------------------------


def test_parse_model_raises_analysis_error_for_invalid_time_history() -> None:
    project = base_project("validation-direct")
    project["analysisSettings"]["timeHistory"] = {
        "method": "central-difference",
    }

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)

    assert excinfo.value.detail.code == "INVALID_VALUE"
    assert excinfo.value.detail.path == "/analysisSettings/timeHistory/method"


def test_parse_model_raises_analysis_error_for_invalid_ground_motion() -> None:
    project = base_project("validation-direct-gm")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "invalid",
            "samples": [0.0],
        }
    ]

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)

    assert excinfo.value.detail.code == "INVALID_VALUE"
    assert excinfo.value.detail.path == "/groundMotions/*/unit"


def test_validation_error_includes_original_message() -> None:
    project = base_project("validation-message")
    project["analysisSettings"]["timeHistory"] = {
        "timeStep": -1.0,
    }

    result = validate_project(project)

    assert result["valid"] is False
    error = result["errors"][0]
    # The original TH-1a message must be preserved.
    assert "timeStep" in error["message"]
    assert "positive" in error["message"]
