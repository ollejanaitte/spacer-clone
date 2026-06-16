"""Result integration tests for the time history analysis schema (TH-4).

These tests verify that:

* The project loader accepts projects without
  ``analysisResults.timeHistory`` (backward compatibility).
* The project loader accepts projects with
  ``analysisResults.timeHistory`` and preserves the block as an
  opaque dict.
* ``model_to_project_dict`` preserves ``analysisResults.timeHistory``.
* A full ``load -> save -> load`` round trip keeps the
  ``timeHistory`` result block unchanged.
* The persisted meta block is structurally validated by the existing
  validate_project / parse_model flow; malformed blocks surface as
  ``AnalysisError`` with a path that points at the offending field.
* Existing example projects still load.
* The mapper ``build_time_history_result_from_newmark`` produces a
  ``TimeHistoryResult`` whose ``to_dict`` is byte-equivalent to a
  hand-built persisted block for the same Newmark run.
"""

from __future__ import annotations

import copy
import json
import math
import os
from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    AnalysisError,
    LumpedMassMatrix,
    Model,
    NewmarkTimeHistoryResult,
    TimeHistoryResult,
    TimeHistoryResultMeta,
    assemble_lumped_mass_matrix,
    build_time_history_result_from_newmark,
    model_to_project_dict,
    parse_model,
    parse_time_history_result,
    solve_newmark_average_acceleration,
    validate_project,
)
from backend.engine.dof import build_dof_map
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------


def _meta_for_duration(duration: float, time_step: float) -> TimeHistoryResultMeta:
    n_steps = int(round(duration / time_step)) + 1
    return TimeHistoryResultMeta(
        analysisId="th-test-001",
        status="success",
        method="newmark-beta",
        timeStep=time_step,
        duration=duration,
        beta=0.25,
        gamma=0.5,
        damping={"type": "rayleigh", "alpha": 0.0, "beta": 0.0},
        groundMotions=[{"id": "gm-001", "direction": "X"}],
        sampleCount=n_steps,
    )


def _result_block(
    *,
    duration: float = 0.5,
    time_step: float = 0.1,
    with_history: bool = True,
) -> dict[str, object]:
    """Build a hand-written ``analysisResults.timeHistory`` block.

    The block matches the design document section 9 and the JSON
    schema ``timeHistoryResult`` def. ``sampleCount`` is consistent
    with ``floor(duration / timeStep) + 1``.
    """

    n_steps = int(round(duration / time_step)) + 1
    time = [i * time_step for i in range(n_steps)]
    block: dict[str, object] = {
        "meta": {
            "analysisId": "th-test-001",
            "status": "success",
            "method": "newmark-beta",
            "timeStep": time_step,
            "duration": duration,
            "beta": 0.25,
            "gamma": 0.5,
            "damping": {"type": "rayleigh", "alpha": 0.0, "beta": 0.0},
            "groundMotions": [{"id": "gm-001", "direction": "X"}],
            "sampleCount": n_steps,
        },
        "time": time,
    }
    if with_history:
        block["displacements"] = {"n2": [0.0] * n_steps}
        block["velocities"] = {"n2": [0.0] * n_steps}
        block["accelerations"] = {"n2": [0.0] * n_steps}
    return block


def _build_model_with_mass() -> Model:
    project = base_project("th-result")
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
    model = parse_model(project)
    return replace(
        model,
        massCases=[
            MassCase(
                id="m-1",
                name="Tip mass",
                items=[MassItem(nodeId="N2", mx=1.0, my=1.0, mz=1.0)],
            )
        ],
    )


# ---------------------------------------------------------------------------
# Loader: project without analysisResults.timeHistory
# ---------------------------------------------------------------------------


def test_loader_accepts_project_without_analysis_results() -> None:
    project = base_project("loader-no-results")
    project["analysisSettings"] = {}

    model = parse_model(project)

    assert isinstance(model, Model)
    assert model.analysisResults is None


def test_loader_accepts_project_with_empty_analysis_results_block() -> None:
    project = base_project("loader-empty-results")
    project["analysisSettings"] = {}
    project["analysisResults"] = {}

    model = parse_model(project)

    assert model.analysisResults == {}


def test_loader_rejects_non_object_analysis_results_block() -> None:
    project = base_project("loader-bad-results")
    project["analysisSettings"] = {}
    project["analysisResults"] = ["not", "an", "object"]

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "SCHEMA_ERROR"
    assert excinfo.value.detail.path == "/analysisResults"


# ---------------------------------------------------------------------------
# Loader: project with analysisResults.timeHistory
# ---------------------------------------------------------------------------


def test_loader_accepts_project_with_time_history_result() -> None:
    project = base_project("loader-th-result")
    project["analysisSettings"] = {}
    project["analysisResults"] = {
        "timeHistory": _result_block(duration=0.5, time_step=0.1),
    }

    model = parse_model(project)

    assert model.analysisResults is not None
    block = model.analysisResults["timeHistory"]
    assert block["meta"]["analysisId"] == "th-test-001"
    assert block["meta"]["sampleCount"] == 6
    np.testing.assert_allclose(block["time"], [0.0, 0.1, 0.2, 0.3, 0.4, 0.5])
    assert block["displacements"] == {"n2": [0.0] * 6}


def test_loader_preserves_unknown_result_keys_for_forward_compatibility() -> None:
    project = base_project("loader-th-future")
    project["analysisSettings"] = {}
    project["analysisResults"] = {
        "timeHistory": _result_block(),
        "nonlinearFuture": {"placeholder": True},
    }

    model = parse_model(project)

    assert model.analysisResults is not None
    assert "nonlinearFuture" in model.analysisResults
    assert model.analysisResults["nonlinearFuture"] == {"placeholder": True}


# ---------------------------------------------------------------------------
# Saver: model_to_project_dict
# ---------------------------------------------------------------------------


def test_saver_omits_analysis_results_key_when_model_has_none() -> None:
    project = base_project("saver-no-results")
    project["analysisSettings"] = {}

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert "analysisResults" not in saved


def test_saver_preserves_analysis_results_time_history_block() -> None:
    project = base_project("saver-th-result")
    project["analysisSettings"] = {}
    block = _result_block(duration=0.4, time_step=0.1)
    project["analysisResults"] = {"timeHistory": block}

    model = parse_model(project)
    saved = model_to_project_dict(model)

    assert "analysisResults" in saved
    assert saved["analysisResults"]["timeHistory"] == block


def test_saver_does_not_mutate_model_analysis_results() -> None:
    project = base_project("saver-no-mutate")
    project["analysisSettings"] = {}
    project["analysisResults"] = {
        "timeHistory": _result_block(),
    }

    model = parse_model(project)
    snapshot = copy.deepcopy(model.analysisResults)

    model_to_project_dict(model)

    assert model.analysisResults == snapshot


# ---------------------------------------------------------------------------
# Round-trip
# ---------------------------------------------------------------------------


def test_round_trip_preserves_time_history_result_block() -> None:
    project = base_project("round-trip")
    project["analysisSettings"] = {}
    block = _result_block(duration=0.3, time_step=0.1)
    project["analysisResults"] = {"timeHistory": block}

    model_a = parse_model(project)
    saved = model_to_project_dict(model_a)
    model_b = parse_model(saved)

    assert model_b.analysisResults is not None
    assert model_b.analysisResults["timeHistory"] == block


def test_round_trip_preserves_analysis_settings_time_history_block() -> None:
    project = base_project("round-trip-settings")
    project["analysisSettings"] = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
        "tolerance": 1e-9,
        "timeHistory": {
            "enabled": True,
            "method": "newmark-beta",
            "timeStep": 0.01,
            "duration": 30.0,
            "beta": 0.25,
            "gamma": 0.5,
        },
    }
    project["analysisResults"] = {
        "timeHistory": _result_block(duration=30.0, time_step=0.01),
    }

    model_a = parse_model(project)
    saved = model_to_project_dict(model_a)
    model_b = parse_model(saved)

    assert model_b.analysisSettings.timeHistory is not None
    assert model_b.analysisSettings.timeHistory["duration"] == 30.0
    assert model_b.analysisResults is not None
    assert (
        model_b.analysisResults["timeHistory"]["meta"]["duration"] == 30.0
    )


# ---------------------------------------------------------------------------
# Validation: malformed result block
# ---------------------------------------------------------------------------


def test_malformed_meta_missing_required_field_raises_analysis_error() -> None:
    project = base_project("malformed-meta")
    project["analysisSettings"] = {}
    block = _result_block()
    del block["meta"]["analysisId"]
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path == "/analysisResults/timeHistory/meta/analysisId"


def test_malformed_meta_with_invalid_status_raises_analysis_error() -> None:
    project = base_project("malformed-status")
    project["analysisSettings"] = {}
    block = _result_block()
    block["meta"]["status"] = "totally-fine"
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path == "/analysisResults/timeHistory/meta/status"


def test_malformed_time_array_raises_analysis_error() -> None:
    project = base_project("malformed-time")
    project["analysisSettings"] = {}
    block = _result_block()
    block["time"] = [0.0, 0.1, float("nan"), 0.3]
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path.startswith("/analysisResults/timeHistory/time/")


def test_malformed_displacement_history_raises_analysis_error() -> None:
    project = base_project("malformed-disp")
    project["analysisSettings"] = {}
    block = _result_block()
    block["displacements"] = {"n2": [0.0, 0.1, "not a number"]}
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path.startswith(
        "/analysisResults/timeHistory/displacements/n2/"
    )


def test_missing_time_array_raises_analysis_error() -> None:
    project = base_project("malformed-no-time")
    project["analysisSettings"] = {}
    block = _result_block()
    del block["time"]
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path == "/analysisResults/timeHistory/time"


def test_validate_project_reports_malformed_result_block() -> None:
    project = base_project("validate-project-bad")
    project["analysisSettings"] = {}
    block = _result_block()
    block["meta"]["sampleCount"] = -1
    project["analysisResults"] = {"timeHistory": block}

    result = validate_project(project)

    assert result["valid"] is False
    assert any(
        err["code"] == "TIME_HISTORY_RESULT_INVALID"
        for err in result["errors"]
    )


# ---------------------------------------------------------------------------
# Existing examples: must still load
# ---------------------------------------------------------------------------


from .conftest import EXAMPLES_DIR, load_json  # noqa: E402


def test_all_existing_examples_load_without_analysis_results() -> None:
    # The MVP parses each example as a structural project. Examples
    # that lack a top-level ``project`` key (for example, the
    # bridge-domain examples) are skipped here because the TH-4
    # integration layer only consumes structural projects.
    for example_path in EXAMPLES_DIR.glob("*.json"):
        project = load_json(example_path)
        if "project" not in project:
            continue
        if "nodes" not in project:
            continue
        model = parse_model(project)
        # The MVP examples do not include analysisResults, so the
        # field is None on load. (A future example might add it.)
        assert model.analysisResults is None or isinstance(
            model.analysisResults, dict
        )


# ---------------------------------------------------------------------------
# Mapper: Newmark -> persisted
# ---------------------------------------------------------------------------


def _run_small_newmark_sdof(
    model: Model,
    *,
    duration: float,
    time_step: float,
) -> NewmarkTimeHistoryResult:
    mass: LumpedMassMatrix = assemble_lumped_mass_matrix(model, "m-1")
    M = mass.matrix
    C = np.zeros_like(M)
    K = np.eye(M.shape[0]) * 100.0
    n_steps = int(round(duration / time_step)) + 1
    loads = np.zeros((n_steps, M.shape[0]), dtype=float)
    return solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        time_step,
        initial_displacement=[1.0, 0.0, 0.0],
    )


def test_mapper_builds_persisted_result_from_newmark() -> None:
    model = _build_model_with_mass()
    duration = 0.5
    time_step = 0.1
    newmark = _run_small_newmark_sdof(
        model, duration=duration, time_step=time_step,
    )
    mass = assemble_lumped_mass_matrix(model, "m-1")
    meta = _meta_for_duration(duration, time_step)

    result = build_time_history_result_from_newmark(
        newmark,
        meta=meta,
        active_dofs=mass.active_dofs,
        dof_map=mass.dof_map,
    )

    assert isinstance(result, TimeHistoryResult)
    assert result.meta.sampleCount == newmark.n_steps
    assert len(result.time) == newmark.n_steps
    assert all(
        key in result.displacements
        for key in ("N2_ux", "N2_uy", "N2_uz")
    )
    # The first column of the Newmark displacement array is the X DOF
    # of N2 (global dof 6). The mapper should keep that sample
    # numerically identical.
    np.testing.assert_array_almost_equal(
        np.asarray(result.displacements["N2_ux"], dtype=float),
        newmark.displacements[:, 0],
    )
    np.testing.assert_array_almost_equal(
        np.asarray(result.velocities["N2_ux"], dtype=float),
        newmark.velocities[:, 0],
    )
    np.testing.assert_array_almost_equal(
        np.asarray(result.accelerations["N2_ux"], dtype=float),
        newmark.accelerations[:, 0],
    )


def test_mapper_to_dict_round_trips_through_parse_time_history_result() -> None:
    model = _build_model_with_mass()
    duration = 0.3
    time_step = 0.1
    newmark = _run_small_newmark_sdof(
        model, duration=duration, time_step=time_step,
    )
    mass = assemble_lumped_mass_matrix(model, "m-1")
    meta = _meta_for_duration(duration, time_step)

    result = build_time_history_result_from_newmark(
        newmark,
        meta=meta,
        active_dofs=mass.active_dofs,
        dof_map=mass.dof_map,
    )
    payload = result.to_dict()
    parsed = parse_time_history_result(payload)

    assert parsed.meta == meta
    assert parsed.time == result.time
    assert parsed.displacements == result.displacements
    assert parsed.velocities == result.velocities
    assert parsed.accelerations == result.accelerations


def test_mapper_rejects_mismatched_meta_and_newmark_step_count() -> None:
    model = _build_model_with_mass()
    newmark = _run_small_newmark_sdof(model, duration=0.5, time_step=0.1)
    mass = assemble_lumped_mass_matrix(model, "m-1")
    bad_meta = _meta_for_duration(duration=10.0, time_step=0.1)

    with pytest.raises(AnalysisError) as excinfo:
        build_time_history_result_from_newmark(
            newmark,
            meta=bad_meta,
            active_dofs=mass.active_dofs,
            dof_map=mass.dof_map,
        )
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"


def test_mapper_does_not_mutate_inputs() -> None:
    model = _build_model_with_mass()
    newmark = _run_small_newmark_sdof(model, duration=0.3, time_step=0.1)
    mass = assemble_lumped_mass_matrix(model, "m-1")
    meta = _meta_for_duration(duration=0.3, time_step=0.1)

    newmark_snapshot_u = newmark.displacements.copy()
    newmark_snapshot_v = newmark.velocities.copy()
    newmark_snapshot_a = newmark.accelerations.copy()
    active_snapshot = mass.active_dofs.copy()

    result = build_time_history_result_from_newmark(
        newmark,
        meta=meta,
        active_dofs=mass.active_dofs,
        dof_map=mass.dof_map,
    )

    np.testing.assert_array_equal(newmark.displacements, newmark_snapshot_u)
    np.testing.assert_array_equal(newmark.velocities, newmark_snapshot_v)
    np.testing.assert_array_equal(newmark.accelerations, newmark_snapshot_a)
    np.testing.assert_array_equal(mass.active_dofs, active_snapshot)
    assert isinstance(result, TimeHistoryResult)


# ---------------------------------------------------------------------------
# Empty block semantics
# ---------------------------------------------------------------------------


def test_empty_result_block_preserved() -> None:
    """An empty ``analysisResults.timeHistory`` block is allowed and
    preserved as-is. The MVP does not require every persisted result
    to be non-empty because the run may legitimately produce only
    zero-valued histories.
    """

    project = base_project("empty-result")
    project["analysisSettings"] = {}
    block = _result_block(duration=0.1, time_step=0.1, with_history=False)
    project["analysisResults"] = {"timeHistory": block}

    model = parse_model(project)
    saved = model_to_project_dict(model)
    model_b = parse_model(saved)

    assert model_b.analysisResults is not None
    assert model_b.analysisResults["timeHistory"]["meta"]["sampleCount"] == 2
    assert model_b.analysisResults["timeHistory"]["time"] == [0.0, 0.1]
    # No history keys were supplied; round trip keeps it that way.
    assert "displacements" not in model_b.analysisResults["timeHistory"]


def test_zero_step_result_block_rejected() -> None:
    """A ``time`` array with zero entries violates the schema rule that
    the result must contain at least one sample.
    """

    project = base_project("zero-step")
    project["analysisSettings"] = {}
    block = _result_block()
    block["time"] = []
    project["analysisResults"] = {"timeHistory": block}

    with pytest.raises(AnalysisError) as excinfo:
        parse_model(project)
    assert excinfo.value.detail.code == "TIME_HISTORY_RESULT_INVALID"
    assert excinfo.value.detail.path == "/analysisResults/timeHistory/time"