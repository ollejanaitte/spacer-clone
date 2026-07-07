from __future__ import annotations

import copy
from pathlib import Path

import pytest

from .conftest import EXAMPLES_DIR, load_json
from .sample_models import VALIDATION_PROJECTS

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for schema validation tests."
)


def test_all_examples_match_project_json_schema(project_schema: dict) -> None:
    validator = jsonschema.Draft202012Validator(project_schema)
    for path in sorted(Path(EXAMPLES_DIR).glob("*.json")):
        # Skip bridge domain model samples (they use a separate schema)
        if path.name.startswith("bridge-"):
            continue
        errors = sorted(
            validator.iter_errors(load_json(path)), key=lambda error: error.path
        )
        assert errors == [], f"{path} failed schema validation: {errors}"


@pytest.mark.parametrize("project_factory", VALIDATION_PROJECTS)
def test_case_projects_match_project_json_schema(
    project_schema: dict, project_factory
) -> None:
    validator = jsonschema.Draft202012Validator(project_schema)
    errors = sorted(
        validator.iter_errors(project_factory()), key=lambda error: error.path
    )
    assert errors == []


def test_project_schema_rejects_missing_required_top_level_key(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    del project["analysisSettings"]

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))

    assert any("analysisSettings" in error.message for error in errors)


def test_project_schema_rejects_mvp_out_of_scope_field(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["movingLoads"] = []

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))

    assert any("Additional properties" in error.message for error in errors)


def test_project_schema_rejects_member_with_both_orientation_methods(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["members"][0]["orientationNode"] = "N2"

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))

    assert errors, (
        "orientationVector and orientationNode must not be accepted together."
    )


def test_project_schema_accepts_saved_eigen_and_influence_settings(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["massCases"] = [
        {
            "id": "mass-1",
            "name": "Manual Mass",
            "method": "lumped",
            "source": "manual",
            "items": [
                {
                    "nodeId": "N2",
                    "mx": 1.0,
                    "my": 1.0,
                    "mz": 1.0,
                    "irx": 0.0,
                    "iry": 0.0,
                    "irz": 0.0,
                }
            ],
        }
    ]
    project["analysisSettings"]["eigen"] = {
        "massCaseId": "mass-1",
        "modeCount": 2,
    }
    project["analysisSettings"]["influence"] = {
        "caseId": "influence-1",
        "line": {
            "id": "line-1",
            "memberId": "M1",
            "stationCount": 11,
            "direction": {"x": 0.0, "y": -1.0, "z": 0.0},
            "magnitude": 1.0,
        },
        "targets": [
            {
                "id": "reaction-1",
                "type": "reaction",
                "nodeId": "N1",
                "component": "fy",
            }
        ],
    }

    validator = jsonschema.Draft202012Validator(project_schema)

    assert list(validator.iter_errors(project)) == []


def test_project_schema_accepts_optional_liner_and_liner_trace(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["liner"] = {
        "schemaVersion": "0.1.0",
        "sourceRevision": "abc123",
        "linerModelId": "gc06",
        "coordinatePolicyId": "global",
        "intermediateSchemaVersion": "0.2.0",
        "generatedAt": "2026-01-01T00:00:00.000Z",
        "source": {
            "alignmentId": "alignment-1",
            "gridDefinitionId": "grid-1",
        },
    }
    project["linerTrace"] = [
        {
            "frameEntityId": "N_LINER_gc06_000_000",
            "frameEntityType": "node",
            "linerModelId": "gc06",
            "coordinatePolicyId": "global",
            "sourceRevision": "abc123",
            "gridPointId": "GP-gc06-000-000",
        }
    ]

    validator = jsonschema.Draft202012Validator(project_schema)

    assert list(validator.iter_errors(project)) == []


def test_project_schema_rejects_invalid_liner_trace_entity_type(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["linerTrace"] = [
        {
            "frameEntityId": "N_LINER_gc06_000_000",
            "frameEntityType": "beam",
            "linerModelId": "gc06",
            "coordinatePolicyId": "global",
            "sourceRevision": "abc123",
        }
    ]

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))

    assert errors
    assert any(
        list(error.path)[-1:] == ["frameEntityType"] and error.validator == "enum"
        for error in errors
    )


def test_project_schema_rejects_missing_liner_trace_source_revision(
    project_schema: dict, example_project: dict
) -> None:
    project = copy.deepcopy(example_project)
    project["linerTrace"] = [
        {
            "frameEntityId": "N_LINER_gc06_000_000",
            "frameEntityType": "node",
            "linerModelId": "gc06",
            "coordinatePolicyId": "global",
        }
    ]

    validator = jsonschema.Draft202012Validator(project_schema)
    errors = list(validator.iter_errors(project))

    assert errors
    assert any("sourceRevision" in error.message for error in errors)
