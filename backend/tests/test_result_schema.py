from __future__ import annotations

import copy

import pytest

from .assertions import assert_no_non_finite_numbers

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for result schema tests."
)


def valid_result() -> dict:
    return {
        "projectId": "project-001",
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "linear_static",
            "status": "success",
            "startedAt": "2026-01-01T00:00:00Z",
            "finishedAt": "2026-01-01T00:00:01Z",
            "durationMs": 1000.0,
            "nodeCount": 2,
            "memberCount": 1,
            "loadCaseCount": 1,
            "totalDof": 12,
            "freeDof": 6,
            "constrainedDof": 6,
            "solver": "scipy_sparse",
        },
        "displacements": [
            {
                "loadCaseId": "LC1",
                "nodeId": "N2",
                "ux": 0.0,
                "uy": -0.01040650406504065,
                "uz": 0.0,
                "rx": 0.0,
                "ry": 0.0,
                "rz": -0.003902439024390244,
            }
        ],
        "reactions": [
            {
                "loadCaseId": "LC1",
                "nodeId": "N1",
                "fx": 0.0,
                "fy": 10.0,
                "fz": 0.0,
                "mx": 0.0,
                "my": 0.0,
                "mz": 40.0,
                "constrainedDofs": ["ux", "uy", "uz", "rx", "ry", "rz"],
            }
        ],
        "memberEndForces": [
            {
                "loadCaseId": "LC1",
                "memberId": "M1",
                "coordinateSystem": "local",
                "i": {
                    "fx": 0.0,
                    "fy": 10.0,
                    "fz": 0.0,
                    "mx": 0.0,
                    "my": 0.0,
                    "mz": 40.0,
                },
                "j": {
                    "fx": 0.0,
                    "fy": -10.0,
                    "fz": 0.0,
                    "mx": 0.0,
                    "my": 0.0,
                    "mz": 0.0,
                },
            }
        ],
        "warnings": [],
        "errors": [],
    }


def test_success_result_matches_result_json_schema(result_schema: dict) -> None:
    result = valid_result()
    assert_no_non_finite_numbers(result)

    validator = jsonschema.Draft202012Validator(result_schema)
    errors = sorted(validator.iter_errors(result), key=lambda error: error.path)

    assert errors == []


def test_failed_result_matches_result_json_schema(result_schema: dict) -> None:
    result = valid_result()
    result["analysisSummary"]["status"] = "failed"
    result["displacements"] = []
    result["reactions"] = []
    result["memberEndForces"] = []
    result["errors"] = [
        {
            "code": "MODEL_UNSTABLE",
            "message": "The model has insufficient support constraints.",
            "path": "/supports",
            "entityType": "support",
            "entityId": None,
        }
    ]

    validator = jsonschema.Draft202012Validator(result_schema)
    errors = sorted(validator.iter_errors(result), key=lambda error: error.path)

    assert errors == []


def test_result_schema_rejects_missing_required_result_array(
    result_schema: dict,
) -> None:
    result = valid_result()
    del result["memberEndForces"]

    validator = jsonschema.Draft202012Validator(result_schema)
    errors = list(validator.iter_errors(result))

    assert any("memberEndForces" in error.message for error in errors)


def test_result_non_finite_numbers_are_rejected_before_json_output() -> None:
    result = copy.deepcopy(valid_result())
    result["displacements"][0]["uy"] = float("nan")

    with pytest.raises(AssertionError, match="Non-finite number"):
        assert_no_non_finite_numbers(result)
