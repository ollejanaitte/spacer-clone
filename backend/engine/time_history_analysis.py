"""Backend integration for Linear Time History Analysis (TH-5a).

This module is the TH-5a wiring layer that connects the pure engine
parts produced by TH-1 through TH-4 into a single backend analysis
function:

1. Parse and validate the project model.
2. Read the time history settings, damping parameters, and ground
   motion record from the project payload.
3. Assemble the global lumped mass matrix (TH-2a).
4. Reuse the existing structural stiffness assembly path.
5. Reduce the full stiffness matrix to the active DOF set used by
   TH-2a so that the Newmark solver and the rest of the dynamics
   chain share a consistent DOF definition.
6. Assemble the Rayleigh damping matrix (TH-2b).
7. Build the effective seismic load history (TH-2c).
8. Integrate the linear system with the Newmark-beta average
   acceleration method (TH-2d).
9. Convert the Newmark result to the persisted
   :class:`TimeHistoryResult` shape defined in TH-4.
10. Return the analysis result in the same envelope used by
    ``run_eigen_analysis`` and ``run_response_spectrum_analysis``.

The MVP scope is intentionally narrow:

* One ground motion record per run. Multiple records are rejected
  with a clear ``AnalysisError`` at the API boundary.
* The ground motion record time step must equal the analysis time
  step. Interpolation and resampling are out of scope.
* Rayleigh damping uses the ``alpha`` and ``beta`` coefficients
  provided in the project schema. Modal-damping-ratio-based
  estimation is out of scope.
* Member forces, reaction histories, and envelopes are not
  generated. The result block persists displacements, velocities,
  accelerations, and the time axis only.

This module does NOT:

* Touch the frontend, the UI, the CSV export, the PDF report,
  the result viewer, the response animation, or the bridge
  viewer.
* Implement a result post-processing layer. Envelopes and member
  forces are reserved for a future task.
* Re-run the Newmark solver from the persisted result. The MVP
  exposes a single ``run_time_history_analysis`` function that
  always executes the solver on a fresh project payload.
"""

from __future__ import annotations

import copy
from typing import Any, Mapping

import numpy as np
from numpy.typing import NDArray

from .assembly import assemble_stiffness
from .dof import build_dof_map, constrained_dofs
from .errors import AnalysisError
from .model import Model, parse_model
from .response_spectrum import (
    clean,
    duration_ms,
    error_result,
    iso_now,
)
from .time_history_damping import assemble_rayleigh_damping_matrix
from .time_history_load import assemble_effective_seismic_load_history
from .time_history_mass import assemble_lumped_mass_matrix
from .time_history_models import (
    GroundMotion,
    parse_ground_motions,
    parse_time_history_settings,
    TimeHistoryModelError,
)
from .time_history_newmark import solve_newmark_average_acceleration
from .time_history_result import (
    TimeHistoryResultMeta,
    build_time_history_result_from_newmark,
)


# MVP ground motion axis set. The MVP analysis supports only one
# ground motion record per run.
ALLOWED_GROUND_MOTION_DIRECTIONS: tuple[str, ...] = ("X", "Y", "Z")

# ---------------------------------------------------------------------------
# TH-5c: API response contract freeze
# ---------------------------------------------------------------------------
# The Linear Time History Analysis API returns a single envelope whose
# top-level key set, result-block key set, and meta-block key set are
# frozen by this module. The contract is enforced at runtime by
# :func:`_assert_envelope_contract` and at test time by the contract
# validation tests in ``backend/tests/test_time_history_api.py``.
#
# Freeze policy:
# * Top-level envelope keys are an exact set. Adding, removing, or
#   renaming a key is a breaking change and must be reflected in the
#   documentation at ``docs/design/time-history-api-contract.md``.
# * ``timeHistoryResult`` is required on both success and failure; on
#   failure the value is ``None`` so the consumer can rely on a
#   single shape.
# * ``timeHistoryResult.meta`` is required and must contain the frozen
#   set of fields below.
TIME_HISTORY_ENVELOPE_KEYS: frozenset[str] = frozenset(
    {
        "projectId",
        "schemaVersion",
        "analysisSummary",
        "displacements",
        "reactions",
        "memberEndForces",
        "warnings",
        "errors",
        "timeHistoryResult",
    }
)
TIME_HISTORY_RESULT_KEYS: frozenset[str] = frozenset(
    {"meta", "time", "displacements", "velocities", "accelerations"}
)
TIME_HISTORY_RESULT_META_KEYS: frozenset[str] = frozenset(
    {
        "analysisId",
        "status",
        "method",
        "timeStep",
        "duration",
        "beta",
        "gamma",
        "damping",
        "groundMotions",
        "sampleCount",
    }
)
TIME_HISTORY_RESULT_REQUIRED_META_KEYS: frozenset[str] = frozenset(
    {"analysisId", "method", "timeStep", "duration", "sampleCount"}
)


def _assert_envelope_contract(envelope: Mapping[str, Any]) -> None:
    """Validate that ``envelope`` matches the TH-5c frozen contract.

    The check is performed at runtime so any accidental key
    renames or removals are caught immediately. The same assertions
    are duplicated in the test suite.
    """

    if set(envelope.keys()) != TIME_HISTORY_ENVELOPE_KEYS:
        raise AssertionError(
            "Time history envelope key set does not match the TH-5c "
            f"contract. expected={sorted(TIME_HISTORY_ENVELOPE_KEYS)} "
            f"actual={sorted(envelope.keys())}"
        )
    if "analysisSummary" not in envelope:
        raise AssertionError("Envelope is missing 'analysisSummary'.")
    summary = envelope["analysisSummary"]
    for key in ("analysisType", "status", "startedAt", "finishedAt",
                "durationMs", "solver"):
        if key not in summary:
            raise AssertionError(
                f"analysisSummary is missing required key {key!r}."
            )
    if summary.get("analysisType") != "time_history":
        raise AssertionError(
            "analysisSummary.analysisType must be 'time_history' for "
            f"the time history endpoint; got {summary.get('analysisType')!r}."
        )
    if summary.get("solver") != "newmark_beta":
        raise AssertionError(
            "analysisSummary.solver must be 'newmark_beta' for the "
            f"time history endpoint; got {summary.get('solver')!r}."
        )
    if "timeHistoryResult" not in envelope:
        raise AssertionError("Envelope is missing 'timeHistoryResult'.")
    block = envelope["timeHistoryResult"]
    if block is None:
        # Failure envelope: the meta block is intentionally absent.
        return
    if set(block.keys()) != TIME_HISTORY_RESULT_KEYS:
        raise AssertionError(
            "timeHistoryResult key set does not match the TH-5c "
            f"contract. expected={sorted(TIME_HISTORY_RESULT_KEYS)} "
            f"actual={sorted(block.keys())}"
        )
    if "meta" not in block:
        raise AssertionError("timeHistoryResult is missing 'meta'.")
    meta = block["meta"]
    missing = TIME_HISTORY_RESULT_REQUIRED_META_KEYS - set(meta.keys())
    if missing:
        raise AssertionError(
            f"timeHistoryResult.meta is missing required keys: "
            f"{sorted(missing)}."
        )


def _analysis_settings_section(project_data: Mapping[str, Any]) -> dict[str, Any]:
    settings = project_data.get("analysisSettings")
    if not isinstance(settings, Mapping):
        return {}
    time_history = settings.get("timeHistory")
    if not isinstance(time_history, Mapping):
        return {}
    return dict(time_history)


def _damping_section(time_history_settings: Mapping[str, Any]) -> dict[str, Any]:
    damping = time_history_settings.get("damping")
    if not isinstance(damping, Mapping):
        return {}
    return dict(damping)


def _select_ground_motion(
    project_data: Mapping[str, Any],
) -> GroundMotion:
    """Return the single ground motion record that drives this run.

    The MVP rejects projects that declare zero or more than one
    ground motion. This decision matches
    ``docs/design/time-history-schema.md`` section 7 which states
    that the MVP supports one record per direction; combining
    multiple records into a single response is reserved for a
    future implementation.
    """

    ground_motions_raw = project_data.get("groundMotions", [])
    try:
        ground_motions = parse_ground_motions(ground_motions_raw)
    except TimeHistoryModelError as exc:
        # Surface the schema-level failure with a JSON-pointer path so
        # that the API layer can convert it into a structured
        # failed envelope. ``groundMotions[0]`` is the only record
        # the MVP ever inspects, so any field-level error maps to
        # the same prefix.
        raise AnalysisError(
            "TIME_HISTORY_GROUND_MOTION_INVALID",
            str(exc),
            path="/groundMotions/0",
        ) from exc
    if len(ground_motions) == 0:
        raise AnalysisError(
            "TIME_HISTORY_GROUND_MOTION_MISSING",
            "Time history analysis requires a single ground motion record.",
            path="/groundMotions",
        )
    if len(ground_motions) > 1:
        raise AnalysisError(
            "TIME_HISTORY_GROUND_MOTION_MULTIPLE",
            (
                "Time history analysis MVP supports exactly one ground "
                "motion record; received "
                f"{len(ground_motions)}."
            ),
            path="/groundMotions",
        )
    return ground_motions[0]


def _resolve_excitation_direction(
    time_history_settings: Mapping[str, Any],
    ground_motion: GroundMotion,
) -> str:
    """Resolve one authoritative excitation direction for the run.

    New projects persist the direction in both the analysis settings and
    the selected ground-motion record. Legacy projects may omit the
    settings field, in which case the ground-motion direction remains
    authoritative for backward compatibility. A disagreement is rejected
    rather than silently running in a direction different from the UI.
    """

    settings_direction = time_history_settings.get("direction")
    if settings_direction is None:
        return ground_motion.direction
    if settings_direction != ground_motion.direction:
        raise AnalysisError(
            "TIME_HISTORY_DIRECTION_MISMATCH",
            (
                "analysisSettings.timeHistory.direction "
                f"{settings_direction!r} does not match "
                f"groundMotions[0].direction {ground_motion.direction!r}."
            ),
            path="/analysisSettings/timeHistory/direction",
        )
    return str(settings_direction)


def _validate_damping_coefficients(damping: Mapping[str, Any]) -> tuple[float, float]:
    """Read the Rayleigh ``alpha`` and ``beta`` coefficients.

    The MVP requires both coefficients to be present and finite.
    Negative coefficients are rejected because the Newmark solver
    cannot integrate with a non-positive-definite damping matrix.
    """

    if "alpha" not in damping or "beta" not in damping:
        raise AnalysisError(
            "TIME_HISTORY_DAMPING_INVALID",
            (
                "Rayleigh damping requires both alpha and beta coefficients; "
                "see docs/design/time-history-schema.md section 6."
            ),
            path="/analysisSettings/timeHistory/damping",
        )
    alpha_raw = damping.get("alpha")
    beta_raw = damping.get("beta")
    if not isinstance(alpha_raw, (int, float)) or isinstance(alpha_raw, bool):
        raise AnalysisError(
            "TIME_HISTORY_DAMPING_INVALID",
            "Rayleigh alpha must be a finite number.",
            path="/analysisSettings/timeHistory/damping/alpha",
        )
    if not isinstance(beta_raw, (int, float)) or isinstance(beta_raw, bool):
        raise AnalysisError(
            "TIME_HISTORY_DAMPING_INVALID",
            "Rayleigh beta must be a finite number.",
            path="/analysisSettings/timeHistory/damping/beta",
        )
    alpha = float(alpha_raw)
    beta = float(beta_raw)
    if not (np.isfinite(alpha) and np.isfinite(beta)):
        raise AnalysisError(
            "TIME_HISTORY_DAMPING_INVALID",
            "Rayleigh coefficients must be finite.",
            path="/analysisSettings/timeHistory/damping",
        )
    if alpha < 0.0 or beta < 0.0:
        raise AnalysisError(
            "TIME_HISTORY_DAMPING_INVALID",
            "Rayleigh coefficients must be non-negative.",
            path="/analysisSettings/timeHistory/damping",
        )
    return alpha, beta


def _reduced_stiffness(
    model: Model,
    active_dofs: NDArray[np.int_],
) -> NDArray[np.float64]:
    """Assemble the global stiffness and reduce it to ``active_dofs``.

    The full stiffness matrix is the same one consumed by the
    static, eigen, and response spectrum analyses. The reduction
    follows the same convention as :func:`assemble_lumped_mass_matrix`:
    only the rows and columns that correspond to unconstrained
    positive-mass DOFs are retained, in the same order as
    ``active_dofs``.
    """

    dof_map = build_dof_map(model)
    assembly = assemble_stiffness(model, dof_map)
    full_K = assembly.stiffness.toarray() if hasattr(
        assembly.stiffness, "toarray"
    ) else np.asarray(assembly.stiffness, dtype=float)
    if full_K.shape[0] != dof_map.total_dof:
        raise AnalysisError(
            "TIME_HISTORY_STIFFNESS_INVALID",
            (
                "Stiffness matrix shape "
                f"{full_K.shape} does not match the total DOF count "
                f"{dof_map.total_dof}."
            ),
            path="/analysisSettings/timeHistory",
        )
    return full_K[np.ix_(active_dofs, active_dofs)]


def _empty_summary(node_count: int, member_count: int, load_case_count: int) -> dict[str, Any]:
    return {
        "analysisType": "time_history",
        "status": "failed",
        "startedAt": "",
        "finishedAt": "",
        "durationMs": 0.0,
        "nodeCount": node_count,
        "memberCount": member_count,
        "loadCaseCount": load_case_count,
        "totalDof": 0,
        "freeDof": 0,
        "constrainedDof": 0,
        "solver": "newmark_beta",
    }


def _success_summary(
    model: Model,
    started_at: str,
    finished_at: str,
    *,
    total_dof: int,
    free_dof: int,
    constrained_dof: int,
) -> dict[str, Any]:
    return {
        "analysisType": "time_history",
        "status": "success",
        "startedAt": started_at,
        "finishedAt": finished_at,
        "durationMs": clean(duration_ms(started_at, finished_at)),
        "nodeCount": len(model.nodes),
        "memberCount": len(model.members),
        "loadCaseCount": len(model.loadCases),
        "totalDof": total_dof,
        "freeDof": free_dof,
        "constrainedDof": constrained_dof,
        "solver": "newmark_beta",
    }


def _result_envelope(
    model: Model,
    project_id: str,
    time_history_result: dict[str, Any],
    summary: dict[str, Any],
) -> dict[str, Any]:
    """Build the JSON envelope that the backend returns.

    The envelope matches the shape used by ``run_eigen_analysis`` and
    ``run_response_spectrum_analysis``. The persisted time history
    result is stored under ``timeHistoryResult`` so the frontend
    can pick it up without having to interpret the project payload
    directly.
    """

    envelope = {
        "projectId": project_id,
        "schemaVersion": "1.0.0",
        "analysisSummary": summary,
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "warnings": [],
        "errors": [],
        "timeHistoryResult": time_history_result,
    }
    # TH-5c: enforce the frozen API response contract before returning.
    _assert_envelope_contract(envelope)
    return envelope


def _build_failed_envelope(
    project: Mapping[str, Any],
    exc: AnalysisError,
) -> dict[str, Any]:
    project_info = project.get("project", {}) if isinstance(project, Mapping) else {}
    project_id = project_info.get("id", "") if isinstance(project_info, Mapping) else ""
    nodes = project.get("nodes", []) if isinstance(project, Mapping) else []
    members = project.get("members", []) if isinstance(project, Mapping) else []
    load_cases = project.get("loadCases", []) if isinstance(project, Mapping) else []
    result = error_result(
        project_id,
        exc.detail,
        node_count=len(nodes) if isinstance(nodes, list) else 0,
        member_count=len(members) if isinstance(members, list) else 0,
        load_case_count=len(load_cases) if isinstance(load_cases, list) else 0,
        total_dof=0,
    )
    result["analysisSummary"]["analysisType"] = "time_history"
    result["analysisSummary"]["solver"] = "newmark_beta"
    # TH-5c: the failure envelope must share the same top-level key
    # set as the success envelope so consumers can rely on a single
    # shape. The result block is ``None`` because the solver did not
    # produce one.
    result["timeHistoryResult"] = None
    _assert_envelope_contract(result)
    return result


def run_time_history_analysis(
    project_data: dict[str, Any],
    request: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run Linear Time History Analysis on the supplied project.

    Parameters
    ----------
    project_data:
        The project payload. Must include
        ``analysisSettings.timeHistory``, ``groundMotions``, and
        ``massCases`` consistent with the TH-1 schema.
    request:
        Optional per-call overrides. The MVP supports an empty
        payload; future fields (for example, ``analysisId`` or
        ``direction``) are reserved for later integration passes.

    Returns
    -------
    dict
        The standard analysis envelope with the persisted time
        history result stored under ``timeHistoryResult``. On
        failure the ``analysisSummary.status`` is set to
        ``"failed"`` and the first error is reported under
        ``errors``.
    """

    request = request or {}
    project = copy.deepcopy(project_data) if isinstance(project_data, Mapping) else {}
    started_at = iso_now()
    project_id = ""
    if isinstance(project, Mapping):
        project_info = project.get("project", {})
        if isinstance(project_info, Mapping):
            project_id = str(project_info.get("id", ""))

    try:
        if not isinstance(project, Mapping):
            raise AnalysisError(
                "SCHEMA_ERROR",
                "Project payload must be an object.",
                path="/project",
            )

        # 1. parse the model (full validation, including the TH-1
        # time history blocks).
        model = parse_model(project)
        dof_map = build_dof_map(model)
        total_dof = dof_map.total_dof
        constrained = set(constrained_dofs(model, dof_map))

        # 2. read and validate the time history settings.
        time_history_settings = _analysis_settings_section(project)
        if not time_history_settings:
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_MISSING",
                (
                    "analysisSettings.timeHistory is required for Linear "
                    "Time History Analysis."
                ),
                path="/analysisSettings/timeHistory",
            )
        # Reuse the TH-1a parser for full structural validation.
        try:
            parse_time_history_settings(time_history_settings)
        except Exception as exc:  # parse_time_history_settings raises ValueError
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                str(exc),
                path="/analysisSettings/timeHistory",
            ) from exc

        method = time_history_settings.get("method", "newmark-beta")
        if method != "newmark-beta":
            raise AnalysisError(
                "TIME_HISTORY_METHOD_UNSUPPORTED",
                (
                    f"Unsupported time history method: {method!r}. "
                    "The MVP only supports 'newmark-beta'."
                ),
                path="/analysisSettings/timeHistory/method",
            )
        time_step = time_history_settings.get("timeStep")
        duration = time_history_settings.get("duration")
        beta = time_history_settings.get("beta")
        gamma = time_history_settings.get("gamma")
        if not isinstance(time_step, (int, float)) or isinstance(time_step, bool):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "timeStep must be a finite number.",
                path="/analysisSettings/timeHistory/timeStep",
            )
        if not isinstance(duration, (int, float)) or isinstance(duration, bool):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "duration must be a finite number.",
                path="/analysisSettings/timeHistory/duration",
            )
        if not isinstance(beta, (int, float)) or isinstance(beta, bool):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "beta must be a finite number.",
                path="/analysisSettings/timeHistory/beta",
            )
        if not isinstance(gamma, (int, float)) or isinstance(gamma, bool):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "gamma must be a finite number.",
                path="/analysisSettings/timeHistory/gamma",
            )
        time_step = float(time_step)
        duration = float(duration)
        beta = float(beta)
        gamma = float(gamma)
        if time_step <= 0.0 or not np.isfinite(time_step):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "timeStep must be strictly positive and finite.",
                path="/analysisSettings/timeHistory/timeStep",
            )
        if duration <= 0.0 or not np.isfinite(duration):
            raise AnalysisError(
                "TIME_HISTORY_SETTINGS_INVALID",
                "duration must be strictly positive and finite.",
                path="/analysisSettings/timeHistory/duration",
            )

        # 3. read the damping block.
        damping = _damping_section(time_history_settings)
        alpha, beta_d = _validate_damping_coefficients(damping)

        # 4. select the ground motion.
        ground_motion = _select_ground_motion(project)
        excitation_direction = _resolve_excitation_direction(
            time_history_settings,
            ground_motion,
        )
        if ground_motion.direction not in ALLOWED_GROUND_MOTION_DIRECTIONS:
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_INVALID",
                (
                    f"Ground motion direction {ground_motion.direction!r} is not "
                    f"one of {list(ALLOWED_GROUND_MOTION_DIRECTIONS)}."
                ),
                path="/groundMotions/0/direction",
            )
        if ground_motion.unit not in ("m/s2", "gal"):
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_INVALID",
                (
                    f"Ground motion unit {ground_motion.unit!r} is not "
                    "supported; expected 'm/s2' or 'gal'."
                ),
                path="/groundMotions/0/unit",
            )
        # Convert gal to m/s2 once. 1 gal = 0.01 m/s^2.
        unit_factor = 1.0 if ground_motion.unit == "m/s2" else 0.01
        if abs(float(ground_motion.timeStep) - time_step) > 1.0e-9:
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_DT_MISMATCH",
                (
                    "Ground motion timeStep "
                    f"{ground_motion.timeStep} s does not match the analysis "
                    f"timeStep {time_step} s. Interpolation is not supported in "
                    "the MVP."
                ),
                path="/groundMotions/0/timeStep",
            )
        accelerations = np.asarray(
            [float(value) * unit_factor for value in ground_motion.samples],
            dtype=float,
        )
        if accelerations.size < 2:
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_INVALID",
                "Ground motion record must contain at least two samples.",
                path="/groundMotions/0/samples",
            )
        if not np.all(np.isfinite(accelerations)):
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_INVALID",
                "Ground motion samples must be finite.",
                path="/groundMotions/0/samples",
            )
        # duration must match sample count (off-by-one is accepted).
        n_samples = accelerations.size
        expected_samples = int(round(duration / time_step)) + 1
        if abs(n_samples - expected_samples) > 1:
            raise AnalysisError(
                "TIME_HISTORY_GROUND_MOTION_DURATION_MISMATCH",
                (
                    f"Ground motion has {n_samples} samples but the analysis "
                    f"duration / timeStep implies {expected_samples} samples."
                ),
                path="/groundMotions/0/samples",
            )

        # 5. read the mass case. The MVP uses the first mass case.
        if not model.massCases:
            raise AnalysisError(
                "MASS_CASE_NOT_FOUND",
                "Time history analysis requires at least one mass case.",
                path="/massCases",
            )
        mass_case_id = model.massCases[0].id

        # 6. assemble the mass matrix (TH-2a).
        mass = assemble_lumped_mass_matrix(model, mass_case_id, dof_map=dof_map)
        if set(map(int, mass.active_dofs.tolist())) & constrained:
            raise AnalysisError(
                "TIME_HISTORY_MASS_INVALID",
                "Mass matrix active DOF set includes a constrained DOF.",
                path="/massCases",
            )
        free_dof = mass.active_dof_count

        # 7. assemble the stiffness matrix and reduce it.
        stiffness_reduced = _reduced_stiffness(model, mass.active_dofs)

        # 8. assemble the Rayleigh damping matrix.
        damping_matrix = assemble_rayleigh_damping_matrix(
            mass,
            stiffness_reduced,
            alpha=alpha,
            beta=beta_d,
        )

        # 9. build the effective seismic load history.
        load_history = assemble_effective_seismic_load_history(
            mass,
            accelerations,
            direction=excitation_direction.lower(),
        )

        # 10. integrate via the Newmark-beta average acceleration method.
        newmark = solve_newmark_average_acceleration(
            mass_matrix=mass.matrix,
            damping_matrix=damping_matrix.matrix,
            stiffness_matrix=stiffness_reduced,
            loads=load_history.loads,
            dt=time_step,
        )

        # 11. convert to the persisted TimeHistoryResult block.
        meta = TimeHistoryResultMeta(
            analysisId=str(request.get("analysisId") or "th-mvp"),
            status="success",
            method="newmark-beta",
            timeStep=time_step,
            duration=duration,
            beta=beta,
            gamma=gamma,
            damping={
                "type": "rayleigh",
                "alpha": alpha,
                "beta": beta_d,
            },
            groundMotions=[
                {
                    "id": ground_motion.id,
                    "direction": excitation_direction,
                }
            ],
            sampleCount=newmark.n_steps,
        )
        result_block = build_time_history_result_from_newmark(
            newmark,
            meta=meta,
            active_dofs=mass.active_dofs,
            dof_map=mass.dof_map,
        )

        finished_at = iso_now()
        summary = _success_summary(
            model,
            started_at,
            finished_at,
            total_dof=total_dof,
            free_dof=free_dof,
            constrained_dof=total_dof - free_dof,
        )
        return _result_envelope(
            model,
            project_id,
            result_block.to_dict(),
            summary,
        )
    except AnalysisError as exc:
        return _build_failed_envelope(project, exc)
    except Exception as exc:  # pragma: no cover - defensive
        wrapper = AnalysisError(
            "SOLVER_ERROR",
            f"Unexpected time history analysis failure: {exc}",
        )
        return _build_failed_envelope(project, wrapper)
