from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


# MVP default values for the time history analysis settings.
# These are the baseline numbers documented in
# docs/design/time-history-analysis.md and
# docs/design/time-history-schema.md section 5.
DEFAULT_TIME_STEP_SECONDS: float = 0.01
DEFAULT_DURATION_SECONDS: float = 30.0
DEFAULT_NEWMARK_BETA: float = 0.25
DEFAULT_NEWMARK_GAMMA: float = 0.5
DEFAULT_DAMPING_RATIO: float = 0.05

# MVP enum values for the damping model type.
# The MVP supports "rayleigh" only. "modal", "constant", and "userMatrix"
# are reserved enum values for future schema versions and are not
# implemented in the MVP. They are listed here for forward compatibility
# and for the JSON Schema enum constraint.
DAMPING_TYPES_MVP = ("rayleigh",)
DAMPING_TYPES_RESERVED = ("rayleigh", "modal", "constant", "userMatrix")

# MVP enum values for the ground motion direction.
GROUND_MOTION_DIRECTIONS = ("X", "Y", "Z")

# MVP enum values for the ground motion acceleration unit.
GROUND_MOTION_UNITS = ("m/s2", "gal")

# MVP enum value for the Newmark-beta integration method.
TIME_HISTORY_METHOD_NEWMARK_BETA = "newmark-beta"
TIME_HISTORY_METHODS_MVP = (TIME_HISTORY_METHOD_NEWMARK_BETA,)

# Initial condition enum values.
INITIAL_CONDITION_ZERO = "zero"
INITIAL_CONDITION_VALUES_MVP = (INITIAL_CONDITION_ZERO,)
INITIAL_CONDITION_VALUES_RESERVED = (INITIAL_CONDITION_ZERO, "fromStatic")


class TimeHistoryModelError(ValueError):
    """Raised when a project payload violates the time history schema.

    The error message is structured so that the loader can wrap it
    in an AnalysisError with a path that points at the offending field.
    The error is intentionally a ValueError subclass so that the
    dataclass ``__post_init__`` path stays consistent with the
    Python data-model convention.
    """


def _require_mapping(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise TimeHistoryModelError(
            f"{path} must be an object."
        )
    return value


def _require_number(value: Any, path: str) -> float:
    if not isinstance(value, int | float) or isinstance(value, bool):
        raise TimeHistoryModelError(
            f"{path} must be a number."
        )
    return float(value)


@dataclass(frozen=True)
class TimeHistoryInitialConditions:
    """Initial conditions for the time history analysis.

    The MVP supports the zero-initial-state option only. The "fromStatic"
    value is reserved for a future extension and is not implemented.
    """

    displacement: str = INITIAL_CONDITION_ZERO
    velocity: str = INITIAL_CONDITION_ZERO


@dataclass(frozen=True)
class TimeHistoryDamping:
    """Damping model for the time history analysis.

    The MVP supports Rayleigh damping only. The reserved enum values
    "modal", "constant", and "userMatrix" are not implemented in the MVP
    and are listed for forward compatibility with the JSON Schema enum.
    """

    type: str = "rayleigh"
    mode1Frequency: float | None = None
    mode2Frequency: float | None = None
    targetDampingRatio1: float = DEFAULT_DAMPING_RATIO
    targetDampingRatio2: float = DEFAULT_DAMPING_RATIO

    def __post_init__(self) -> None:
        if self.type not in DAMPING_TYPES_RESERVED:
            raise TimeHistoryModelError(
                f"timeHistory.damping.type must be one of {list(DAMPING_TYPES_RESERVED)}; got {self.type!r}."
            )
        if self.mode1Frequency is not None and self.mode1Frequency <= 0:
            raise TimeHistoryModelError(
                "timeHistory.damping.mode1Frequency must be positive when provided."
            )
        if self.mode2Frequency is not None and self.mode2Frequency <= 0:
            raise TimeHistoryModelError(
                "timeHistory.damping.mode2Frequency must be positive when provided."
            )
        if not (0.0 <= self.targetDampingRatio1 < 1.0):
            raise TimeHistoryModelError(
                "timeHistory.damping.targetDampingRatio1 must be in [0, 1)."
            )
        if not (0.0 <= self.targetDampingRatio2 < 1.0):
            raise TimeHistoryModelError(
                "timeHistory.damping.targetDampingRatio2 must be in [0, 1)."
            )


@dataclass(frozen=True)
class TimeHistorySettings:
    """Time history analysis settings under analysisSettings.timeHistory.

    This dataclass is the in-memory model for the time history analysis
    settings. It is consumed by the future solver (TH-2) and by the
    future result model (TH-4). The MVP does not require any of the
    documented fields to be present; the defaults produce a documented
    baseline configuration.
    """

    enabled: bool = False
    method: str = TIME_HISTORY_METHOD_NEWMARK_BETA
    timeStep: float = DEFAULT_TIME_STEP_SECONDS
    duration: float = DEFAULT_DURATION_SECONDS
    beta: float = DEFAULT_NEWMARK_BETA
    gamma: float = DEFAULT_NEWMARK_GAMMA
    damping: TimeHistoryDamping = field(default_factory=TimeHistoryDamping)
    initialConditions: TimeHistoryInitialConditions = field(
        default_factory=TimeHistoryInitialConditions
    )
    direction: str | None = None

    def __post_init__(self) -> None:
        if self.method not in TIME_HISTORY_METHODS_MVP:
            # Only the MVP-supported method is accepted. The MVP keeps
            # the enum narrow to avoid the "method reserved but not
            # implemented" trap. Future versions will widen the enum.
            raise TimeHistoryModelError(
                f"timeHistory.method must be one of {list(TIME_HISTORY_METHODS_MVP)}; got {self.method!r}."
            )
        if self.timeStep <= 0:
            raise TimeHistoryModelError("timeHistory.timeStep must be positive.")
        if self.duration < 0:
            raise TimeHistoryModelError("timeHistory.duration must be non-negative.")
        if self.beta <= 0:
            raise TimeHistoryModelError("timeHistory.beta must be positive.")
        if self.gamma <= 0:
            raise TimeHistoryModelError("timeHistory.gamma must be positive.")
        if self.direction is not None and self.direction not in GROUND_MOTION_DIRECTIONS:
            raise TimeHistoryModelError(
                f"timeHistory.direction must be one of {list(GROUND_MOTION_DIRECTIONS)}; got {self.direction!r}."
            )


@dataclass(frozen=True)
class GroundMotion:
    """A single ground motion record.

    The MVP supports one record per direction. Multi-record and
    spectrum-compatible records are future work and are tracked as open
    questions in docs/design/time-history-schema.md section 15.
    """

    id: str = ""
    name: str = ""
    direction: str = "X"
    timeStep: float = 0.0
    duration: float = 0.0
    unit: str = "m/s2"
    samples: list[float] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.id:
            raise TimeHistoryModelError("groundMotions[].id must be non-empty.")
        if not self.name:
            raise TimeHistoryModelError("groundMotions[].name must be non-empty.")
        if self.direction not in GROUND_MOTION_DIRECTIONS:
            raise TimeHistoryModelError(
                f"groundMotions[].direction must be one of {list(GROUND_MOTION_DIRECTIONS)}; got {self.direction!r}."
            )
        if self.unit not in GROUND_MOTION_UNITS:
            raise TimeHistoryModelError(
                f"groundMotions[].unit must be one of {list(GROUND_MOTION_UNITS)}; got {self.unit!r}."
            )
        if self.timeStep <= 0:
            raise TimeHistoryModelError("groundMotions[].timeStep must be positive.")
        if self.duration <= 0:
            raise TimeHistoryModelError("groundMotions[].duration must be positive.")


@dataclass(frozen=True)
class EnvelopeExtremum:
    """A single extremum (max or min) of a response quantity.

    The schema uses the same shape for both max and min. The "time" field
    is the time at which the extremum occurred, in seconds. The "value"
    field is the extremum value in the unit of the parent quantity.
    """

    value: float = 0.0
    time: float = 0.0


@dataclass(frozen=True)
class EnvelopePair:
    """Maximum and minimum pair for a single response quantity."""

    max: EnvelopeExtremum = field(default_factory=EnvelopeExtremum)
    min: EnvelopeExtremum = field(default_factory=EnvelopeExtremum)


@dataclass(frozen=True)
class TimeHistoryResultMemberForces:
    """Per-member force histories in the time history result.

    The MVP stores the six standard member-local components. The history
    arrays are aligned with the shared "time" array.
    """

    N: list[float] = field(default_factory=list)
    Vy: list[float] = field(default_factory=list)
    Vz: list[float] = field(default_factory=list)
    Mx: list[float] = field(default_factory=list)
    My: list[float] = field(default_factory=list)
    Mz: list[float] = field(default_factory=list)


@dataclass(frozen=True)
class TimeHistoryResultMeta:
    """Metadata for a single time history run.

    The MVP does not yet populate this block; the TH-4 milestone writes
    the actual metadata. The model is defined here so that the schema
    is stable.
    """

    analysisId: str = ""
    status: str = "success"
    method: str = TIME_HISTORY_METHOD_NEWMARK_BETA
    timeStep: float = DEFAULT_TIME_STEP_SECONDS
    duration: float = DEFAULT_DURATION_SECONDS
    beta: float = DEFAULT_NEWMARK_BETA
    gamma: float = DEFAULT_NEWMARK_GAMMA
    damping: dict[str, Any] = field(default_factory=dict)
    groundMotions: list[dict[str, str]] = field(default_factory=list)
    sampleCount: int = 0

    def __post_init__(self) -> None:
        if self.status not in ("success", "warning", "failed"):
            raise TimeHistoryModelError(
                f"timeHistoryResult.meta.status must be one of success, warning, failed; got {self.status!r}."
            )
        if self.sampleCount < 0:
            raise TimeHistoryModelError("timeHistoryResult.meta.sampleCount must be non-negative.")


@dataclass(frozen=True)
class TimeHistoryResult:
    """In-memory model for analysisResults.timeHistory.

    The MVP defines the shape only. The result block is produced by
    TH-2 (solver) and TH-4 (result integration). This dataclass is the
    documentation of the shape; it is also importable by future tests
    that need to construct a result for fixture-based tests.
    """

    meta: TimeHistoryResultMeta = field(default_factory=TimeHistoryResultMeta)
    time: list[float] = field(default_factory=list)
    displacements: dict[str, list[float]] = field(default_factory=dict)
    velocities: dict[str, list[float]] = field(default_factory=dict)
    accelerations: dict[str, list[float]] = field(default_factory=dict)
    memberForces: dict[str, TimeHistoryResultMemberForces] = field(default_factory=dict)
    reactions: dict[str, list[float]] = field(default_factory=dict)
    envelopes: dict[str, Any] = field(default_factory=dict)


def time_history_settings_to_dict(settings: TimeHistorySettings) -> dict[str, Any]:
    """Serialize a TimeHistorySettings to a dict that matches the project schema.

    The serialized shape matches the worked example in
    docs/design/time-history-schema.md section 16.
    """

    payload = asdict(settings)
    if payload["direction"] is None:
        payload.pop("direction")
    # The dataclass ``asdict`` for a nested dataclass flattens the
    # fields, so the structure is already dict-shaped. This helper is
    # kept explicit for clarity at the call site.
    return payload


def ground_motion_to_dict(record: GroundMotion) -> dict[str, Any]:
    """Serialize a GroundMotion to a dict that matches the project schema."""

    return asdict(record)


def time_history_result_to_dict(result: TimeHistoryResult) -> dict[str, Any]:
    """Serialize a TimeHistoryResult to a dict that matches the project schema.

    The MVP serialization is a deep conversion to plain dicts and lists.
    """

    return asdict(result)


# ---------------------------------------------------------------------------
# Loader helpers.
#
# The helpers below convert a raw dict (read from a project JSON file)
# into a strongly-typed model. They are designed to be the single entry
# point for the project loader, so the loader does not need to know
# about the internal dataclass shape.
#
# The helpers raise TimeHistoryModelError on validation failure. The
# caller is expected to wrap the call in an AnalysisError-aware code
# path; the error message is structured for that conversion.
# ---------------------------------------------------------------------------


def _parse_initial_conditions(payload: dict[str, Any]) -> TimeHistoryInitialConditions:
    displacement = payload.get("displacement", INITIAL_CONDITION_ZERO)
    velocity = payload.get("velocity", INITIAL_CONDITION_ZERO)
    if displacement not in INITIAL_CONDITION_VALUES_RESERVED:
        raise TimeHistoryModelError(
            f"timeHistory.initialConditions.displacement must be one of {list(INITIAL_CONDITION_VALUES_RESERVED)}; got {displacement!r}."
        )
    if velocity not in INITIAL_CONDITION_VALUES_RESERVED:
        raise TimeHistoryModelError(
            f"timeHistory.initialConditions.velocity must be one of {list(INITIAL_CONDITION_VALUES_RESERVED)}; got {velocity!r}."
        )
    return TimeHistoryInitialConditions(
        displacement=displacement,
        velocity=velocity,
    )


def _parse_damping(payload: dict[str, Any]) -> TimeHistoryDamping:
    damping_type = payload.get("type", "rayleigh")
    mode1 = payload.get("mode1Frequency")
    mode2 = payload.get("mode2Frequency")
    ratio1 = payload.get("targetDampingRatio1", DEFAULT_DAMPING_RATIO)
    ratio2 = payload.get("targetDampingRatio2", DEFAULT_DAMPING_RATIO)

    mode1_value: float | None = None
    if mode1 is not None:
        mode1_value = _require_number(mode1, "timeHistory.damping.mode1Frequency")
    mode2_value: float | None = None
    if mode2 is not None:
        mode2_value = _require_number(mode2, "timeHistory.damping.mode2Frequency")

    return TimeHistoryDamping(
        type=damping_type,
        mode1Frequency=mode1_value,
        mode2Frequency=mode2_value,
        targetDampingRatio1=_require_number(ratio1, "timeHistory.damping.targetDampingRatio1"),
        targetDampingRatio2=_require_number(ratio2, "timeHistory.damping.targetDampingRatio2"),
    )


def parse_time_history_settings(payload: Any) -> TimeHistorySettings | None:
    """Convert the analysisSettings.timeHistory block into a TimeHistorySettings.

    Returns None when the payload is missing or empty. A non-dict payload
    other than None is treated as a missing block for backward
    compatibility with old callers that may have used a sentinel.
    """

    if payload is None or payload == {}:
        return None
    if not isinstance(payload, dict):
        return None
    # The MVP loader treats "enabled" the same as "present". When the
    # block is present in the JSON, the settings exist; the "enabled"
    # flag controls the analysis run separately.
    settings_payload = dict(payload)
    method = settings_payload.get("method", TIME_HISTORY_METHOD_NEWMARK_BETA)
    time_step = settings_payload.get("timeStep", DEFAULT_TIME_STEP_SECONDS)
    duration = settings_payload.get("duration", DEFAULT_DURATION_SECONDS)
    beta = settings_payload.get("beta", DEFAULT_NEWMARK_BETA)
    gamma = settings_payload.get("gamma", DEFAULT_NEWMARK_GAMMA)
    damping_payload = settings_payload.get("damping") or {}
    if damping_payload and not isinstance(damping_payload, dict):
        raise TimeHistoryModelError(
            "timeHistory.damping must be an object when present."
        )
    initial_conditions_payload = settings_payload.get("initialConditions") or {}
    if initial_conditions_payload and not isinstance(initial_conditions_payload, dict):
        raise TimeHistoryModelError(
            "timeHistory.initialConditions must be an object when present."
        )
    enabled_raw = settings_payload.get("enabled", False)
    if not isinstance(enabled_raw, bool):
        raise TimeHistoryModelError(
            "timeHistory.enabled must be a boolean when present."
        )

    return TimeHistorySettings(
        enabled=enabled_raw,
        method=method,
        timeStep=_require_number(time_step, "timeHistory.timeStep"),
        duration=_require_number(duration, "timeHistory.duration"),
        beta=_require_number(beta, "timeHistory.beta"),
        gamma=_require_number(gamma, "timeHistory.gamma"),
        damping=_parse_damping(damping_payload or {}),
        initialConditions=_parse_initial_conditions(initial_conditions_payload or {}),
        direction=settings_payload.get("direction"),
    )


def parse_ground_motions(payload: Any) -> list[GroundMotion]:
    """Convert the project.groundMotions list into a list of GroundMotion.

    Returns an empty list when the payload is missing or empty. A
    non-list payload other than None is treated as a missing block.
    """

    if payload is None:
        return []
    if not isinstance(payload, list):
        return []
    records: list[GroundMotion] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            raise TimeHistoryModelError(
                f"groundMotions[{index}] must be an object."
            )
        item_mapping = _require_mapping(item, f"groundMotions[{index}]")
        samples_payload = item_mapping.get("samples", [])
        if not isinstance(samples_payload, list):
            raise TimeHistoryModelError(
                f"groundMotions[{index}].samples must be an array."
            )
        samples: list[float] = []
        for sample_index, sample in enumerate(samples_payload):
            samples.append(
                _require_number(
                    sample, f"groundMotions[{index}].samples[{sample_index}]"
                )
            )
        try:
            record = GroundMotion(
                id=item_mapping.get("id", ""),
                name=item_mapping.get("name", ""),
                direction=item_mapping.get("direction", "X"),
                timeStep=_require_number(
                    item_mapping.get("timeStep", 0.0),
                    f"groundMotions[{index}].timeStep",
                ),
                duration=_require_number(
                    item_mapping.get("duration", 0.0),
                    f"groundMotions[{index}].duration",
                ),
                unit=item_mapping.get("unit", "m/s2"),
                samples=samples,
            )
        except TypeError as exc:
            # Defensive: dataclass field type mismatch becomes TypeError.
            raise TimeHistoryModelError(
                f"groundMotions[{index}] has an invalid field: {exc}."
            ) from exc
        records.append(record)
    return records


__all__ = [
    "DEFAULT_TIME_STEP_SECONDS",
    "DEFAULT_DURATION_SECONDS",
    "DEFAULT_NEWMARK_BETA",
    "DEFAULT_NEWMARK_GAMMA",
    "DEFAULT_DAMPING_RATIO",
    "DAMPING_TYPES_MVP",
    "DAMPING_TYPES_RESERVED",
    "GROUND_MOTION_DIRECTIONS",
    "GROUND_MOTION_UNITS",
    "TIME_HISTORY_METHOD_NEWMARK_BETA",
    "TIME_HISTORY_METHODS_MVP",
    "INITIAL_CONDITION_ZERO",
    "INITIAL_CONDITION_VALUES_MVP",
    "INITIAL_CONDITION_VALUES_RESERVED",
    "TimeHistoryInitialConditions",
    "TimeHistoryDamping",
    "TimeHistorySettings",
    "GroundMotion",
    "EnvelopeExtremum",
    "EnvelopePair",
    "TimeHistoryResultMemberForces",
    "TimeHistoryResultMeta",
    "TimeHistoryResult",
    "TimeHistoryModelError",
    "parse_time_history_settings",
    "parse_ground_motions",
    "time_history_settings_to_dict",
    "ground_motion_to_dict",
    "time_history_result_to_dict",
]
