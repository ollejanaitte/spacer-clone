"""Saver tests for the time history analysis schema.

These tests verify that the project saver:

* Preserves ``analysisSettings.timeHistory`` on the saved payload.
* Preserves ``groundMotions`` on the saved payload.
* Supports a full load -> save -> load round trip.
* Does not mutate the in-memory Model.
* Produces a deterministic output.
* Preserves unknown nested fields inside the time history blocks.
"""

from __future__ import annotations

import copy
import json

import pytest

from backend.engine import (
    Model,
    model_to_project_dict,
    parse_model,
)
from backend.engine.model import AnalysisSettings

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Saver success: project shape
# ---------------------------------------------------------------------------


def test_save_project_without_time_history_omits_time_history_key() -> None:
    """When the model has no time history block, the saver omits the key.

    This mirrors the existing optional-block convention used for the
    other analysisSettings sub-blocks (``eigen``, ``influence``,
    ``responseSpectrum``).
    """
    project = base_project("saver-empty")
    project["analysisSettings"] = {}

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert "timeHistory" not in saved["analysisSettings"]


def test_save_project_without_ground_motions_omits_or_keeps_empty_list() -> None:
    """When there are no ground motions, the saver keeps an empty list.

    The empty list is preserved because the loader treats a missing
    block as ``[]`` and an explicit empty list as ``[]``; round-tripping
    an empty list is therefore safe and avoids round-trip ambiguity.
    """
    project = base_project("saver-empty-ground")
    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["groundMotions"] == []


def test_save_project_with_time_history_preserves_block() -> None:
    project = base_project("saver-th-block")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["analysisSettings"]["timeHistory"] == {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }


def test_save_project_with_ground_motions_preserves_records() -> None:
    project = base_project("saver-gm")
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

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["groundMotions"] == [
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


def test_save_project_with_both_time_history_and_ground_motions() -> None:
    project = base_project("saver-both")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.005,
        "duration": 10.0,
        "beta": 0.25,
        "gamma": 0.5,
    }
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.005,
            "duration": 10.0,
            "unit": "m/s2",
            "samples": [0.0, 1.0, 2.0],
        }
    ]

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["analysisSettings"]["timeHistory"] == project["analysisSettings"]["timeHistory"]
    assert saved["groundMotions"] == project["groundMotions"]


def test_save_project_with_multiple_ground_motions_preserves_order() -> None:
    project = base_project("saver-multi-gm")
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
        {
            "id": "gm-003",
            "name": "Z record",
            "direction": "Z",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, 0.0, 0.0],
        },
    ]

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert len(saved["groundMotions"]) == 3
    assert [gm["id"] for gm in saved["groundMotions"]] == ["gm-001", "gm-002", "gm-003"]


# ---------------------------------------------------------------------------
# Round trip
# ---------------------------------------------------------------------------


def test_round_trip_preserves_time_history_block() -> None:
    project = base_project("saver-round-trip-th")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
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
    }

    model = parse_model(project)
    saved = model_to_project_dict(model)
    reloaded = parse_model(saved)

    assert reloaded.analysisSettings.timeHistory == project["analysisSettings"]["timeHistory"]


def test_round_trip_preserves_ground_motions() -> None:
    project = base_project("saver-round-trip-gm")
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

    model = parse_model(project)
    saved = model_to_project_dict(model)
    reloaded = parse_model(saved)

    assert reloaded.groundMotions == project["groundMotions"]


def test_round_trip_preserves_both_time_history_and_ground_motions() -> None:
    project = base_project("saver-round-trip-both")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.005,
        "duration": 10.0,
        "beta": 0.25,
        "gamma": 0.5,
    }
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "X",
            "direction": "X",
            "timeStep": 0.005,
            "duration": 10.0,
            "unit": "m/s2",
            "samples": [0.0, 1.0, 2.0],
        },
        {
            "id": "gm-2",
            "name": "Y",
            "direction": "Y",
            "timeStep": 0.005,
            "duration": 10.0,
            "unit": "gal",
            "samples": [0.0, 50.0, -25.0],
        },
    ]

    model = parse_model(project)
    saved = model_to_project_dict(model)
    reloaded = parse_model(saved)

    assert reloaded.analysisSettings.timeHistory == project["analysisSettings"]["timeHistory"]
    assert reloaded.groundMotions == project["groundMotions"]


def test_saved_payload_is_json_serializable() -> None:
    """The output of model_to_project_dict must be JSON-serializable.

    The MVP serializer must not embed non-JSON-friendly values such as
    dataclass instances, sets, or NaN.
    """
    project = base_project("saver-json-serial")
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
            "name": "X",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, 0.1],
        }
    ]

    model = parse_model(project)
    saved = model_to_project_dict(model)

    # Round-trip through json.dumps / json.loads without losing structure.
    encoded = json.dumps(saved, allow_nan=False)
    decoded = json.loads(encoded)
    assert decoded == saved


# ---------------------------------------------------------------------------
# Future compatibility: unknown nested fields
# ---------------------------------------------------------------------------


def test_unknown_nested_fields_inside_time_history_are_preserved() -> None:
    """The loader stores the time history block as a dict, so any
    future-compatible keys must survive a save round trip."""
    project = base_project("saver-unknown-th")
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

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["analysisSettings"]["timeHistory"]["futureField"] == "reserved"
    assert saved["analysisSettings"]["timeHistory"]["extraNumber"] == 42


def test_unknown_nested_fields_inside_ground_motion_are_preserved() -> None:
    project = base_project("saver-unknown-gm")
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

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert saved["groundMotions"][0]["futureAnnotation"] == "tbd"


# ---------------------------------------------------------------------------
# No mutation
# ---------------------------------------------------------------------------


def test_saver_does_not_mutate_input_model() -> None:
    project = base_project("saver-no-mutate")
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
            "samples": [0.0, 0.1],
        }
    ]

    model = parse_model(project)
    settings_before = copy.deepcopy(model.analysisSettings)
    ground_motions_before = copy.deepcopy(model.groundMotions)

    saved1 = model_to_project_dict(model)
    saved2 = model_to_project_dict(model)

    # Determinism: same input -> same output.
    assert saved1 == saved2

    # No mutation: model is unchanged.
    assert model.analysisSettings == settings_before
    assert model.groundMotions == ground_motions_before


def test_saver_does_not_mutate_input_settings_or_ground_motion_dicts() -> None:
    project = base_project("saver-no-mutate-2")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }

    model = parse_model(project)
    time_history_dict = model.analysisSettings.timeHistory
    assert time_history_dict is not None

    # The dict is a reference into the in-memory model; mutating the
    # saved output must not affect it.
    saved = model_to_project_dict(model)
    saved["analysisSettings"]["timeHistory"]["method"] = "central-difference"

    assert time_history_dict["method"] == "newmark-beta"


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


def test_saved_payload_key_order_is_stable() -> None:
    """The saved payload must have a stable top-level key order across calls."""
    project = base_project("saver-determinism")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
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

    model = parse_model(project)
    saved1 = model_to_project_dict(model)
    saved2 = model_to_project_dict(model)

    assert list(saved1.keys()) == list(saved2.keys())
    assert list(saved1["analysisSettings"].keys()) == list(saved2["analysisSettings"].keys())


def test_saved_analysis_settings_contains_known_sub_blocks_only_when_set() -> None:
    """The analysisSettings dict in the saved payload should only include
    the sub-blocks that are present on the in-memory settings.
    """
    project = base_project("saver-subblocks")
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
    }

    model = parse_model(project)
    saved = model_to_project_dict(model)
    settings_dict = saved["analysisSettings"]

    assert "timeHistory" in settings_dict
    assert "eigen" not in settings_dict
    assert "influence" not in settings_dict
    assert "responseSpectrum" not in settings_dict


def test_saved_analysis_settings_includes_other_sub_blocks_when_set() -> None:
    project = base_project("saver-subblocks-2")
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
    project["analysisSettings"]["responseSpectrum"] = {"damping": 0.05}
    project["analysisSettings"]["timeHistory"] = {
        "enabled": True,
        "method": "newmark-beta",
    }

    model = parse_model(project)
    saved = model_to_project_dict(model)
    settings_dict = saved["analysisSettings"]

    assert settings_dict["eigen"] == {"massCaseId": "mass-1", "modeCount": 3}
    assert settings_dict["responseSpectrum"] == {"damping": 0.05}
    assert settings_dict["timeHistory"]["method"] == "newmark-beta"


# ---------------------------------------------------------------------------
# Backward compatibility: existing example projects
# ---------------------------------------------------------------------------


def test_existing_example_projects_can_be_saved() -> None:
    """Existing examples must be savable without losing data.

    The MVP saver only requires the schema-conformant fields. Examples
    that contain non-modeled fields (e.g. ``units``) drop those fields
    in the saved payload; this is acceptable because the API save
    endpoint is the primary path for full preservation.
    """
    from .conftest import EXAMPLES_DIR, load_json

    project = load_json(EXAMPLES_DIR / "cantilever_tip_load.json")
    model = parse_model(project)
    saved = model_to_project_dict(model)

    # Round trip: parsing the saved payload reproduces the same Model.
    reloaded = parse_model(saved)
    assert isinstance(reloaded, Model)
    assert reloaded.analysisSettings.timeHistory is None
    assert reloaded.groundMotions == []


def test_existing_example_projects_have_no_time_history_in_saved_payload() -> None:
    from .conftest import EXAMPLES_DIR, load_json

    for name in [
        "project.json",
        "cantilever_tip_load.json",
        "cantilever_eigen.json",
        "cantilever_response_spectrum.json",
    ]:
        project = load_json(EXAMPLES_DIR / name)
        model = parse_model(project)
        saved = model_to_project_dict(model)
        assert "timeHistory" not in saved["analysisSettings"], name
        assert saved["groundMotions"] == [], name


# ---------------------------------------------------------------------------
# AnalysisSettings default field
# ---------------------------------------------------------------------------


def test_analysis_settings_default_time_history_is_none() -> None:
    settings = AnalysisSettings()
    assert settings.timeHistory is None


def test_saver_with_default_settings_omits_all_sub_blocks() -> None:
    project = base_project("saver-default-settings")
    project["analysisSettings"] = {}

    model = parse_model(project)
    saved = model_to_project_dict(model)
    settings_dict = saved["analysisSettings"]

    # Only the standard scalar fields are present, no optional sub-blocks.
    assert "analysisType" in settings_dict
    assert "solver" in settings_dict
    assert "eigen" not in settings_dict
    assert "influence" not in settings_dict
    assert "responseSpectrum" not in settings_dict
    assert "timeHistory" not in settings_dict


# ---------------------------------------------------------------------------
# Type contract
# ---------------------------------------------------------------------------


def test_saver_returns_dict() -> None:
    project = base_project("saver-type-check")
    model = parse_model(project)
    saved = model_to_project_dict(model)
    assert isinstance(saved, dict)


def test_saved_top_level_has_required_keys() -> None:
    project = base_project("saver-top-level-keys")
    model = parse_model(project)
    saved = model_to_project_dict(model)

    for key in (
        "project",
        "nodes",
        "materials",
        "sections",
        "members",
        "supports",
        "loadCases",
        "nodalLoads",
        "memberLoads",
        "massCases",
        "analysisSettings",
        "groundMotions",
    ):
        assert key in saved, key
