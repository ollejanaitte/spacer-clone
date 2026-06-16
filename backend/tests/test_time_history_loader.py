"""Loader tests for the time history analysis schema.

These tests verify that the project loader:

* Accepts projects without any time history fields (backward compatibility).
* Accepts projects with ``analysisSettings.timeHistory`` and ``groundMotions``.
* Does not crash on unknown fields.
* Reuses the TH-1a model validation for the typed entry points.
"""

from __future__ import annotations

import copy

import pytest

from backend.engine import (
    Model,
    TimeHistoryModelError,
    parse_ground_motions,
    parse_model,
    parse_time_history_settings,
)
from backend.engine.model import AnalysisSettings

from .conftest import EXAMPLES_DIR, load_json
from .sample_models import base_project


# ---------------------------------------------------------------------------
# Loader success: project shape
# ---------------------------------------------------------------------------


def test_parse_model_with_empty_project_does_not_set_time_history() -> None:
    project = base_project("loader-empty")
    # Replace the default analysisSettings with an empty block to make
    # the assertion explicit.
    project["analysisSettings"] = {}

    model = parse_model(project)

    assert isinstance(model, Model)
    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


def test_parse_model_with_minimal_analysis_settings_keeps_time_history_none() -> None:
    project = base_project("loader-minimal")
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
    }

    model = parse_model(project)

    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


def test_parse_model_with_time_history_block_keeps_dict_shape() -> None:
    project = base_project("loader-time-history-block")
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "timeHistory": {
            "enabled": True,
            "method": "newmark-beta",
            "timeStep": 0.01,
            "duration": 30.0,
            "beta": 0.25,
            "gamma": 0.5,
        },
    }

    model = parse_model(project)

    assert model.analysisSettings.timeHistory == {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }
    assert model.groundMotions == []


def test_parse_model_with_ground_motions_keeps_list_shape() -> None:
    project = base_project("loader-ground-motions")
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

    assert model.groundMotions == [
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
    assert model.analysisSettings.timeHistory is None


def test_parse_model_with_multiple_ground_motions() -> None:
    project = base_project("loader-multi-ground")
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

    model = parse_model(project)

    assert len(model.groundMotions) == 2
    assert model.groundMotions[0]["id"] == "gm-001"
    assert model.groundMotions[1]["unit"] == "gal"


def test_parse_model_with_time_history_and_ground_motions_combined() -> None:
    project = base_project("loader-combined")
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
            "samples": [0.0],
        }
    ]

    model = parse_model(project)

    assert model.analysisSettings.timeHistory is not None
    assert model.analysisSettings.timeHistory["timeStep"] == 0.005
    assert len(model.groundMotions) == 1
    assert model.groundMotions[0]["id"] == "gm-1"


def test_parse_model_ignores_unknown_fields_in_time_history_block() -> None:
    project = base_project("loader-unknown-th")
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

    # The unknown keys are preserved in the dict (the loader keeps raw
    # values; the TH-1a conversion would drop them, but the loader only
    # stores the block).
    assert model.analysisSettings.timeHistory is not None
    assert model.analysisSettings.timeHistory["futureField"] == "reserved"


def test_parse_model_ignores_unknown_fields_in_ground_motions() -> None:
    project = base_project("loader-unknown-gm")
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

    assert model.groundMotions[0]["futureAnnotation"] == "tbd"


# ---------------------------------------------------------------------------
# Loader failure: structural errors raised by parse_model
# ---------------------------------------------------------------------------


def test_parse_model_rejects_non_list_ground_motions() -> None:
    project = base_project("loader-bad-gm-type")
    project["groundMotions"] = {"id": "gm-1"}

    from backend.engine.errors import AnalysisError

    with pytest.raises(AnalysisError):
        parse_model(project)


# ---------------------------------------------------------------------------
# Backward compatibility: existing examples and factory projects
# ---------------------------------------------------------------------------


def test_existing_example_project_still_loads() -> None:
    project = load_json(EXAMPLES_DIR / "project.json")
    # The example must not contain time history fields. Sanity check.
    assert "groundMotions" not in project
    if "analysisSettings" in project:
        assert "timeHistory" not in project["analysisSettings"]

    model = parse_model(project)

    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


def test_existing_cantilever_eigen_example_still_loads() -> None:
    project = load_json(EXAMPLES_DIR / "cantilever_eigen.json")
    model = parse_model(project)
    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


def test_existing_response_spectrum_example_still_loads() -> None:
    project = load_json(EXAMPLES_DIR / "cantilever_response_spectrum.json")
    model = parse_model(project)
    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


# ---------------------------------------------------------------------------
# TH-1a helpers exposed by the package
# ---------------------------------------------------------------------------


def test_parse_time_history_settings_returns_none_for_missing() -> None:
    assert parse_time_history_settings(None) is None


def test_parse_time_history_settings_returns_none_for_empty() -> None:
    assert parse_time_history_settings({}) is None


def test_parse_time_history_settings_returns_none_for_non_dict() -> None:
    assert parse_time_history_settings("enabled") is None
    assert parse_time_history_settings(42) is None
    assert parse_time_history_settings([1, 2, 3]) is None


def test_parse_time_history_settings_creates_settings_for_valid_block() -> None:
    payload = {
        "enabled": True,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
    }
    settings = parse_time_history_settings(payload)
    assert settings is not None
    assert settings.enabled is True
    assert settings.method == "newmark-beta"
    assert settings.timeStep == pytest.approx(0.01)
    assert settings.duration == pytest.approx(30.0)


def test_parse_time_history_settings_uses_mvp_defaults_when_partial() -> None:
    settings = parse_time_history_settings({"enabled": True})
    assert settings is not None
    assert settings.method == "newmark-beta"
    assert settings.timeStep == pytest.approx(0.01)
    assert settings.duration == pytest.approx(30.0)
    assert settings.beta == pytest.approx(0.25)
    assert settings.gamma == pytest.approx(0.5)


def test_parse_time_history_settings_rejects_invalid_method() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_time_history_settings({"method": "central-difference"})


def test_parse_time_history_settings_rejects_non_positive_time_step() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_time_history_settings({"timeStep": 0.0})


def test_parse_time_history_settings_rejects_non_boolean_enabled() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_time_history_settings({"enabled": "yes"})


def test_parse_ground_motions_returns_empty_list_for_missing() -> None:
    assert parse_ground_motions(None) == []


def test_parse_ground_motions_returns_empty_list_for_non_list() -> None:
    assert parse_ground_motions("not a list") == []
    assert parse_ground_motions({"id": "gm-1"}) == []


def test_parse_ground_motions_creates_records_for_valid_entries() -> None:
    records = parse_ground_motions(
        [
            {
                "id": "gm-001",
                "name": "El Centro 1940 NS",
                "direction": "X",
                "timeStep": 0.01,
                "duration": 30.0,
                "unit": "m/s2",
                "samples": [0.0, 0.1, 0.2],
            }
        ]
    )
    assert len(records) == 1
    assert records[0].id == "gm-001"
    assert records[0].direction == "X"
    assert records[0].unit == "m/s2"


def test_parse_ground_motions_accepts_gal_unit() -> None:
    records = parse_ground_motions(
        [
            {
                "id": "gm-1",
                "name": "Gal record",
                "direction": "Y",
                "timeStep": 0.01,
                "duration": 10.0,
                "unit": "gal",
                "samples": [0.0, 100.0, -50.0],
            }
        ]
    )
    assert records[0].unit == "gal"


def test_parse_ground_motions_rejects_non_dict_entry() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_ground_motions(["not a dict"])


def test_parse_ground_motions_rejects_invalid_direction() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_ground_motions(
            [
                {
                    "id": "gm-1",
                    "name": "Bad direction",
                    "direction": "W",
                    "timeStep": 0.01,
                    "duration": 10.0,
                    "unit": "m/s2",
                    "samples": [0.0],
                }
            ]
        )


def test_parse_ground_motions_rejects_invalid_unit() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_ground_motions(
            [
                {
                    "id": "gm-1",
                    "name": "Bad unit",
                    "direction": "X",
                    "timeStep": 0.01,
                    "duration": 10.0,
                    "unit": "m",
                    "samples": [0.0],
                }
            ]
        )


def test_parse_ground_motions_rejects_non_numeric_sample() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_ground_motions(
            [
                {
                    "id": "gm-1",
                    "name": "Bad sample",
                    "direction": "X",
                    "timeStep": 0.01,
                    "duration": 10.0,
                    "unit": "m/s2",
                    "samples": [0.0, "oops"],
                }
            ]
        )


def test_parse_ground_motions_rejects_non_positive_time_step() -> None:
    with pytest.raises(TimeHistoryModelError):
        parse_ground_motions(
            [
                {
                    "id": "gm-1",
                    "name": "Bad step",
                    "direction": "X",
                    "timeStep": 0.0,
                    "duration": 10.0,
                    "unit": "m/s2",
                    "samples": [0.0],
                }
            ]
        )


# ---------------------------------------------------------------------------
# AnalysisSettings defaults are preserved
# ---------------------------------------------------------------------------


def test_analysis_settings_default_time_history_is_none() -> None:
    settings = AnalysisSettings()
    assert settings.timeHistory is None


def test_analysis_settings_default_ground_motions_is_empty_list_on_model() -> None:
    project = base_project("loader-default-ground")
    project["groundMotions"] = None  # type: ignore[assignment]
    # ``data.get("groundMotions", [])`` returns None if the JSON has an
    # explicit null. The loader treats that as a malformed value.

    from backend.engine.errors import AnalysisError

    with pytest.raises(AnalysisError):
        parse_model(project)


def test_unknown_top_level_key_does_not_break_loader() -> None:
    """The loader should not crash on unknown top-level keys.

    This is a forward-compatibility check: the engine must keep
    loading the project even if a future schema version introduces
    new blocks.
    """
    project = base_project("loader-unknown-top")
    project["futureBlock"] = {"hello": "world"}

    model = parse_model(project)

    assert model.analysisSettings.timeHistory is None
    assert model.groundMotions == []


def test_loader_does_not_alter_existing_project_payload() -> None:
    """The loader must not mutate the input dict in a way that breaks
    repeated calls or downstream serializers."""
    project = base_project("loader-no-mutate")
    project["groundMotions"] = [
        {
            "id": "gm-1",
            "name": "Test",
            "direction": "X",
            "timeStep": 0.01,
            "duration": 30.0,
            "unit": "m/s2",
            "samples": [0.0, 1.0],
        }
    ]
    snapshot = copy.deepcopy(project)

    parse_model(project)
    parse_model(project)

    assert project == snapshot
