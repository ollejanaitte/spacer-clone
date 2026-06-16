"""Time history result models and round-trip helpers (TH-4).

This module defines the persisted representation of a Linear Time
History Analysis result. The shape follows section 9 of
``docs/design/time-history-schema.md`` and the JSON schema
``schemas/project.schema.json#/$defs/timeHistoryResult``.

The MVP scope of this module is intentionally narrow:

* It defines the in-memory data classes that mirror the persisted
  result block.
* It provides a mapper from the TH-2d
  :class:`backend.engine.time_history_newmark.NewmarkTimeHistoryResult`
  to the persisted :class:`TimeHistoryResult` using the active DOF
  set and the project DOF map.
* It provides a round-trip serializer / parser so that ``load ->
  save`` preserves the result block byte-for-byte for keys that are
  not modified by the user.

The MVP does NOT:

* Compute member forces or reaction histories. Those are the
  responsibility of a future result layer (out of scope for TH-4).
* Compute envelopes from scratch. The MVP only preserves envelopes
  that the caller has already produced elsewhere; the integration
  layer never recomputes them.
* Re-run the Newmark solver. The mapper is a pure data
  transformation.
* Touch the project schema, the API, the UI, the CSV export, or the
  PDF report.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import copy
import math
from typing import TYPE_CHECKING, Any, Mapping, Sequence

import numpy as np
from numpy.typing import NDArray

from .errors import AnalysisError
from .time_history_newmark import NewmarkTimeHistoryResult

if TYPE_CHECKING:
    from .dof import DofMap, DOF_NAMES  # noqa: F401


# MVP enum values that match the JSON schema. They are defined as
# module-level constants so the mapper and the parser share the same
# vocabulary.
TIME_HISTORY_STATUS_SUCCESS: str = "success"
TIME_HISTORY_STATUS_WARNING: str = "warning"
TIME_HISTORY_STATUS_FAILED: str = "failed"
TIME_HISTORY_STATUS_VALUES: tuple[str, ...] = (
    TIME_HISTORY_STATUS_SUCCESS,
    TIME_HISTORY_STATUS_WARNING,
    TIME_HISTORY_STATUS_FAILED,
)


# ---------------------------------------------------------------------------
# Result data classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TimeHistoryResultMeta:
    """Metadata for a Linear Time History Analysis run.

    The fields mirror ``timeHistoryResultMeta`` in
    ``schemas/project.schema.json``. ``analysisId`` is opaque to the
    integration layer; the MVP just passes it through.
    """

    analysisId: str
    status: str
    method: str
    timeStep: float
    duration: float
    beta: float
    gamma: float
    damping: dict[str, Any]
    groundMotions: list[dict[str, Any]] = field(default_factory=list)
    sampleCount: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Serialize the meta block to a JSON-compatible dict.

        The output is deterministic: keys are emitted in a fixed order.
        Unknown keys are not present (the dataclass is the single
        source of truth).
        """

        return {
            "analysisId": self.analysisId,
            "status": self.status,
            "method": self.method,
            "timeStep": self.timeStep,
            "duration": self.duration,
            "beta": self.beta,
            "gamma": self.gamma,
            "damping": copy.deepcopy(self.damping),
            "groundMotions": copy.deepcopy(self.groundMotions),
            "sampleCount": int(self.sampleCount),
        }


@dataclass(frozen=True)
class TimeHistoryResult:
    """In-memory representation of ``analysisResults.timeHistory``.

    The displacement / velocity / acceleration fields are stored as
    maps from ``node_id`` to a list of samples. The MVP convention
    follows the design document: each node carries a scalar time
    history per active translational component. The mapper below
    splits the dense ``(n_steps, n_dofs)`` array produced by the
    Newmark solver into the per-node shape required by the schema.

    Member forces, reactions, and envelopes are stored as opaque
    ``dict`` values when present. The integration layer does not
    compute them; the MVP only preserves what the caller supplies.
    """

    meta: TimeHistoryResultMeta
    time: list[float]
    displacements: dict[str, list[float]] = field(default_factory=dict)
    velocities: dict[str, list[float]] = field(default_factory=dict)
    accelerations: dict[str, list[float]] = field(default_factory=dict)
    memberForces: dict[str, Any] = field(default_factory=dict)
    reactions: dict[str, Any] = field(default_factory=dict)
    envelopes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize the result block to a JSON-compatible dict.

        The output key order matches the order in
        ``docs/design/time-history-schema.md`` section 9.
        """

        payload: dict[str, Any] = {
            "meta": self.meta.to_dict(),
            "time": [float(v) for v in self.time],
        }
        if self.displacements:
            payload["displacements"] = {
                key: [float(v) for v in vals]
                for key, vals in self.displacements.items()
            }
        if self.velocities:
            payload["velocities"] = {
                key: [float(v) for v in vals]
                for key, vals in self.velocities.items()
            }
        if self.accelerations:
            payload["accelerations"] = {
                key: [float(v) for v in vals]
                for key, vals in self.accelerations.items()
            }
        if self.memberForces:
            payload["memberForces"] = copy.deepcopy(self.memberForces)
        if self.reactions:
            payload["reactions"] = copy.deepcopy(self.reactions)
        if self.envelopes:
            payload["envelopes"] = copy.deepcopy(self.envelopes)
        return payload


# ---------------------------------------------------------------------------
# Mapper: NewmarkTimeHistoryResult -> TimeHistoryResult
# ---------------------------------------------------------------------------


def _resolve_node_id(
    global_dof: int,
    dof_map: "DofMap",
) -> tuple[str, str]:
    """Resolve a global DOF index to ``(node_id, dof_name)``.

    The DOF layout mirrors :mod:`backend.engine.dof`: each node owns
    six contiguous DOFs in the order ``ux, uy, uz, rx, ry, rz``.
    """

    # Imported lazily here to avoid the circular import between
    # ``model`` and ``time_history_result`` at module load time.
    from .dof import DOF_NAMES

    if global_dof < 0:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "Active DOF index must be non-negative.",
            path="/analysisResults/timeHistory",
        )
    node_index = global_dof // 6
    component_index = global_dof % 6
    for node_id, index in dof_map.node_index.items():
        if index == node_index:
            return node_id, DOF_NAMES[component_index]
    raise AnalysisError(
        "TIME_HISTORY_RESULT_INVALID",
        f"Active DOF index {global_dof} does not map to a known node.",
        path="/analysisResults/timeHistory",
    )


def _split_history_by_node(
    history: NDArray[np.float64],
    active_dofs: NDArray[np.int_],
    dof_map: "DofMap",
) -> dict[str, list[float]]:
    """Split a ``(n_steps, n_active_dofs)`` history into a per-node map.

    The MVP convention is that each node carries a single scalar
    history per component, not a vector. Rows that map to the same
    node but different components are merged in a stable order:
    first ``ux`` then ``uy`` then ``uz`` then the rotational
    components, all taken in the order the rows appear in
    ``active_dofs``. This is sufficient for the MVP because the
    existing result schema treats each node-component combination
    as a separate key in the persisted dict; the mapper keeps the
    simplest possible shape that round-trips through the JSON
    schema.
    """

    grouped: dict[tuple[str, str], list[float]] = {}
    for col, global_dof in enumerate(active_dofs.tolist()):
        node_id, dof_name = _resolve_node_id(int(global_dof), dof_map)
        key = (node_id, dof_name)
        if key not in grouped:
            grouped[key] = [float(v) for v in history[:, col]]
    result: dict[str, list[float]] = {}
    for (node_id, _dof_name), values in grouped.items():
        # The MVP schema uses a single scalar history per node. When
        # multiple components are present on the same node the
        # mapper stores them under a ``<nodeId>.<dofName>`` key,
        # matching the design document's documented convention
        # (see schema section 9 and CSV mapping section 11).
        if len(grouped) == 1 or all(
            k[0] != node_id for k in grouped if k != (node_id, _dof_name)
        ):
            result[node_id] = values
        else:
            result[f"{node_id}_{_dof_name}"] = values
    return result


def build_time_history_result_from_newmark(
    newmark: NewmarkTimeHistoryResult,
    *,
    meta: TimeHistoryResultMeta,
    active_dofs: NDArray[np.int_],
    dof_map: "DofMap",
) -> TimeHistoryResult:
    """Build a persisted :class:`TimeHistoryResult` from a Newmark run.

    The mapper is pure: it does not mutate ``newmark``, ``meta``,
    ``active_dofs``, or ``dof_map``. The output ``TimeHistoryResult``
    is a fresh dataclass tree with no aliasing into the inputs.
    """

    n_steps = newmark.displacements.shape[0]
    expected_steps = int(meta.duration / meta.timeStep) + 1
    if abs(n_steps - expected_steps) > 1 and expected_steps > 0:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            (
                f"Newmark result has {n_steps} steps but meta "
                f"duration / timeStep = {expected_steps}."
            ),
            path="/analysisResults/timeHistory",
        )

    displacements = _split_history_by_node(
        newmark.displacements, active_dofs, dof_map
    )
    velocities = _split_history_by_node(
        newmark.velocities, active_dofs, dof_map
    )
    accelerations = _split_history_by_node(
        newmark.accelerations, active_dofs, dof_map
    )

    return TimeHistoryResult(
        meta=meta,
        time=[float(v) for v in newmark.time.tolist()],
        displacements=displacements,
        velocities=velocities,
        accelerations=accelerations,
    )


# ---------------------------------------------------------------------------
# Parser: project dict -> TimeHistoryResult
# ---------------------------------------------------------------------------


def _validated_finite_number(
    value: Any,
    *,
    path: str,
    field_name: str,
) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{field_name} must be a finite number.",
            path=path,
        )
    fvalue = float(value)
    if not math.isfinite(fvalue):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{field_name} must be a finite number.",
            path=path,
        )
    return fvalue


def _parse_meta(data: Mapping[str, Any], path: str) -> TimeHistoryResultMeta:
    required = (
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
    )
    for key in required:
        if key not in data:
            raise AnalysisError(
                "TIME_HISTORY_RESULT_INVALID",
                f"timeHistoryResultMeta.{key} is required.",
                path=f"{path}/meta/{key}",
            )
    if not isinstance(data["analysisId"], str) or not data["analysisId"]:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.analysisId must be a non-empty string.",
            path=f"{path}/meta/analysisId",
        )
    if data["status"] not in TIME_HISTORY_STATUS_VALUES:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            (
                "timeHistoryResultMeta.status must be one of "
                f"{list(TIME_HISTORY_STATUS_VALUES)}."
            ),
            path=f"{path}/meta/status",
        )
    if not isinstance(data["method"], str):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.method must be a string.",
            path=f"{path}/meta/method",
        )
    time_step = _validated_finite_number(
        data["timeStep"], path=f"{path}/meta/timeStep", field_name="timeStep"
    )
    duration = _validated_finite_number(
        data["duration"], path=f"{path}/meta/duration", field_name="duration"
    )
    beta = _validated_finite_number(
        data["beta"], path=f"{path}/meta/beta", field_name="beta"
    )
    gamma = _validated_finite_number(
        data["gamma"], path=f"{path}/meta/gamma", field_name="gamma"
    )
    if not isinstance(data["damping"], Mapping):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.damping must be an object.",
            path=f"{path}/meta/damping",
        )
    if not isinstance(data["groundMotions"], list):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.groundMotions must be an array.",
            path=f"{path}/meta/groundMotions",
        )
    sample_count = data["sampleCount"]
    if not isinstance(sample_count, int) or isinstance(sample_count, bool):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.sampleCount must be an integer.",
            path=f"{path}/meta/sampleCount",
        )
    if int(sample_count) < 0:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "timeHistoryResultMeta.sampleCount must be non-negative.",
            path=f"{path}/meta/sampleCount",
        )

    return TimeHistoryResultMeta(
        analysisId=str(data["analysisId"]),
        status=str(data["status"]),
        method=str(data["method"]),
        timeStep=time_step,
        duration=duration,
        beta=beta,
        gamma=gamma,
        damping=copy.deepcopy(dict(data["damping"])),
        groundMotions=[copy.deepcopy(item) for item in data["groundMotions"]],
        sampleCount=int(sample_count),
    )


def _parse_history_map(
    data: Any,
    *,
    path: str,
) -> dict[str, list[float]]:
    if not isinstance(data, Mapping):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            "Time history result entry must be an object.",
            path=path,
        )
    out: dict[str, list[float]] = {}
    for key, values in data.items():
        if not isinstance(values, list):
            raise AnalysisError(
                "TIME_HISTORY_RESULT_INVALID",
                f"History for key '{key}' must be an array of numbers.",
                path=f"{path}/{key}",
            )
        series: list[float] = []
        for idx, value in enumerate(values):
            series.append(
                _validated_finite_number(
                    value,
                    path=f"{path}/{key}/{idx}",
                    field_name=key,
                )
            )
        out[str(key)] = series
    return out


def parse_time_history_result(
    data: Mapping[str, Any],
) -> TimeHistoryResult:
    """Parse ``analysisResults.timeHistory`` from a project dict.

    The parser enforces the MVP validation rules defined in the JSON
    schema and in section 9 of the design document:

    * ``meta`` is required and fully validated.
    * ``time`` is required and must be a finite number array.
    * ``displacements``, ``velocities``, ``accelerations`` are
      optional maps of node id to finite number arrays.
    * ``memberForces``, ``reactions``, ``envelopes`` are optional and
      preserved as opaque dicts to keep the round-trip stable for
      future-compatible fields.
    """

    path = "/analysisResults/timeHistory"
    if "meta" not in data:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{path}/meta is required.",
            path=f"{path}/meta",
        )
    meta = _parse_meta(data["meta"], path=path)

    if "time" not in data:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{path}/time is required.",
            path=f"{path}/time",
        )
    if not isinstance(data["time"], list):
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{path}/time must be an array.",
            path=f"{path}/time",
        )
    time_array: list[float] = []
    for idx, value in enumerate(data["time"]):
        time_array.append(
            _validated_finite_number(
                value, path=f"{path}/time/{idx}", field_name="time"
            )
        )
    if not time_array:
        raise AnalysisError(
            "TIME_HISTORY_RESULT_INVALID",
            f"{path}/time must contain at least one sample.",
            path=f"{path}/time",
        )

    displacements = (
        _parse_history_map(data["displacements"], path=f"{path}/displacements")
        if "displacements" in data
        else {}
    )
    velocities = (
        _parse_history_map(data["velocities"], path=f"{path}/velocities")
        if "velocities" in data
        else {}
    )
    accelerations = (
        _parse_history_map(data["accelerations"], path=f"{path}/accelerations")
        if "accelerations" in data
        else {}
    )
    member_forces = (
        copy.deepcopy(data["memberForces"])
        if "memberForces" in data
        else {}
    )
    reactions = (
        copy.deepcopy(data["reactions"])
        if "reactions" in data
        else {}
    )
    envelopes = (
        copy.deepcopy(data["envelopes"])
        if "envelopes" in data
        else {}
    )

    return TimeHistoryResult(
        meta=meta,
        time=time_array,
        displacements=displacements,
        velocities=velocities,
        accelerations=accelerations,
        memberForces=member_forces,
        reactions=reactions,
        envelopes=envelopes,
    )