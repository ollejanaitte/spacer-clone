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
