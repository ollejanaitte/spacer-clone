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
            raise ValueError(
                f"Unsupported damping type: {self.type!r}. "
                f"Allowed values: {DAMPING_TYPES_RESERVED}."
            )
        if self.mode1Frequency is not None and self.mode1Frequency <= 0:
            raise ValueError("mode1Frequency must be positive when provided.")
        if self.mode2Frequency is not None and self.mode2Frequency <= 0:
            raise ValueError("mode2Frequency must be positive when provided.")
        if not (0.0 <= self.targetDampingRatio1 < 1.0):
            raise ValueError(
                "targetDampingRatio1 must be in [0, 1)."
            )
        if not (0.0 <= self.targetDampingRatio2 < 1.0):
            raise ValueError(
                "targetDampingRatio2 must be in [0, 1)."
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

    def __post_init__(self) -> None:
        if self.method not in TIME_HISTORY_METHODS_MVP:
            # Only the MVP-supported method is accepted. The MVP keeps
            # the enum narrow to avoid the "method reserved but not
            # implemented" trap. Future versions will widen the enum.
            raise ValueError(
                f"Unsupported time history method: {self.method!r}. "
                f"Allowed values: {TIME_HISTORY_METHODS_MVP}."
            )
        if self.timeStep <= 0:
            raise ValueError("timeStep must be positive.")
        if self.duration < 0:
            raise ValueError("duration must be non-negative.")
        if self.beta <= 0:
            raise ValueError("beta must be positive.")
        if self.gamma <= 0:
            raise ValueError("gamma must be positive.")


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
            raise ValueError("Ground motion id must be non-empty.")
        if not self.name:
            raise ValueError("Ground motion name must be non-empty.")
        if self.direction not in GROUND_MOTION_DIRECTIONS:
            raise ValueError(
                f"Unsupported ground motion direction: {self.direction!r}. "
                f"Allowed values: {GROUND_MOTION_DIRECTIONS}."
            )
        if self.unit not in GROUND_MOTION_UNITS:
            raise ValueError(
                f"Unsupported ground motion unit: {self.unit!r}. "
                f"Allowed values: {GROUND_MOTION_UNITS}."
            )
        if self.timeStep <= 0:
            raise ValueError("Ground motion timeStep must be positive.")
        if self.duration <= 0:
            raise ValueError("Ground motion duration must be positive.")


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
            raise ValueError(
                f"Unsupported result status: {self.status!r}. "
                f"Allowed values: success, warning, failed."
            )
        if self.sampleCount < 0:
            raise ValueError("sampleCount must be non-negative.")


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
    "time_history_settings_to_dict",
    "ground_motion_to_dict",
    "time_history_result_to_dict",
]