from __future__ import annotations

import copy

import pytest

from .conftest import EXAMPLES_DIR
from .sample_models import VALIDATION_PROJECTS

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for schema validation tests."
)


def _base_project(example_project: dict) -> dict:
    project = copy.deepcopy(example_project)
    # Strip optional blocks that we are going to exercise.
    project.pop("massCases", None)
    project.pop("analysisSettings", None)
    return project


def _has_path_error(errors, target_path) -> bool:
    for error in errors:
        if list(error.absolute_path) == target_path:
            return True
    return False


def test_project_without_time_history_fields_is_valid(
    project_schema: dict, example_project: dict
) -> None:
    # Backward compatibility: a project that has no time history fields
    # at all must still pass the JSON Schema validation.
    project = _base_project(example_project)
    # Re-attach a minimal analysisSettings without timeHistory.
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert errors == []


def test_project_accepts_time_history_settings(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
        "timeHistory": {
            "method": "newmark-beta",
            "timeStep": 0.01,
            "duration": 30.0,
            "beta": 0.25,
            "gamma": 0.5,
            "damping": {
                "type": "rayleigh",
                "mode1Frequency": 1.5,
                "mode2Frequency": 8.0,
                "targetDampingRatio1": 0.05,
                "targetDampingRatio2": 0.05,
            },
            "initialConditions": {
                "displacement": "zero",
                "velocity": "zero",
            },
        },
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert errors == []


def test_project_accepts_ground_motions(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
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
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert errors == []


def test_project_rejects_invalid_ground_motion_direction(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["groundMotions"] = [
        {
            "id": "gm-001",
            "name": "Invalid direction",
            "direction": "W",  # Not X, Y, or Z
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0],
        }
    ]
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert _has_path_error(errors, ["groundMotions", 0, "direction"])


def test_project_rejects_invalid_ground_motion_unit(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["groundMotions"] = [
        {
            "id": "gm-001",
            "name": "Invalid unit",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m",  # Not m/s2 or gal
            "samples": [0.0],
        }
    ]
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert _has_path_error(errors, ["groundMotions", 0, "unit"])


def test_project_accepts_gal_unit(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["groundMotions"] = [
        {
            "id": "gm-001",
            "name": "Gal unit",
            "direction": "Y",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "gal",
            "samples": [0.0, 1.0, 2.0],
        }
    ]
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert errors == []


def test_project_accepts_time_history_result_block(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
    }
    project["analysisResults"] = {
        "timeHistory": {
            "meta": {
                "analysisId": "th-test-001",
                "status": "success",
                "method": "newmark-beta",
                "timeStep": 0.01,
                "duration": 30.0,
                "beta": 0.25,
                "gamma": 0.5,
                "damping": {"type": "rayleigh", "alpha": 0.6283, "beta": 0.00159},
                "groundMotions": [{"id": "gm-001", "direction": "X"}],
                "sampleCount": 3001,
            },
            "time": [0.0, 0.01, 0.02],
            "displacements": {"n1": [0.0, 1e-6, 2e-6]},
            "velocities": {"n1": [0.0, 2e-5, 4e-5]},
            "accelerations": {"n1": [0.0, 0.4, 0.8]},
            "memberForces": {
                "m1": {
                    "N":  [0.0, 1.0, 2.0],
                    "Vy": [0.0, 0.5, 1.0],
                    "Vz": [0.0, 0.3, 0.6],
                    "Mx": [0.0, 0.0, 0.0],
                    "My": [0.0, 0.1, 0.2],
                    "Mz": [0.0, 0.05, 0.1],
                }
            },
            "reactions": {"s1": [0.0, 1.5, 3.0]},
            "envelopes": {
                "displacements": {
                    "n1": {
                        "max": {"value": 0.012, "time": 4.32},
                        "min": {"value": -0.011, "time": 7.85},
                    }
                }
            },
        }
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert errors == []


def test_project_rejects_invalid_time_history_method(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
        "timeHistory": {
            "method": "explicit-central-difference",  # not in MVP enum
            "timeStep": 0.01,
            "duration": 30.0,
            "beta": 0.25,
            "gamma": 0.5,
        },
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert _has_path_error(
        errors, ["analysisSettings", "timeHistory", "method"]
    )


def test_project_rejects_non_positive_time_step(
    project_schema: dict, example_project: dict
) -> None:
    project = _base_project(example_project)
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
        "timeHistory": {
            "method": "newmark-beta",
            "timeStep": 0.0,  # exclusiveMinimum 0
            "duration": 30.0,
            "beta": 0.25,
            "gamma": 0.5,
        },
    }

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))
    assert _has_path_error(
        errors, ["analysisSettings", "timeHistory", "timeStep"]
    )


def test_existing_example_projects_remain_valid(
    project_schema: dict, example_project: dict
) -> None:
    # The existing example project must still validate against the
    # updated schema, even with the new optional time history blocks.
    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(example_project))
    assert errors == []