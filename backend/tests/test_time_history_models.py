from __future__ import annotations

import pytest

from backend.engine.time_history_models import (
    DEFAULT_DAMPING_RATIO,
    DEFAULT_DURATION_SECONDS,
    DEFAULT_NEWMARK_BETA,
    DEFAULT_NEWMARK_GAMMA,
    DEFAULT_TIME_STEP_SECONDS,
    DAMPING_TYPES_RESERVED,
    EnvelopeExtremum,
    EnvelopePair,
    GroundMotion,
    TimeHistoryDamping,
    TimeHistoryInitialConditions,
    TimeHistoryResult,
    TimeHistoryResultMemberForces,
    TimeHistoryResultMeta,
    TimeHistorySettings,
    ground_motion_to_dict,
    time_history_result_to_dict,
    time_history_settings_to_dict,
)


def test_time_history_settings_default_values() -> None:
    settings = TimeHistorySettings()
    assert settings.enabled is False
    assert settings.method == "newmark-beta"
    assert settings.timeStep == DEFAULT_TIME_STEP_SECONDS
    assert settings.duration == DEFAULT_DURATION_SECONDS
    assert settings.beta == DEFAULT_NEWMARK_BETA
    assert settings.gamma == DEFAULT_NEWMARK_GAMMA
    assert settings.damping.type == "rayleigh"
    assert settings.damping.targetDampingRatio1 == DEFAULT_DAMPING_RATIO
    assert settings.damping.targetDampingRatio2 == DEFAULT_DAMPING_RATIO
    assert settings.initialConditions.displacement == "zero"
    assert settings.initialConditions.velocity == "zero"


def test_time_history_settings_accepts_mvp_values() -> None:
    settings = TimeHistorySettings(
        enabled=True,
        method="newmark-beta",
        timeStep=0.005,
        duration=10.0,
        beta=0.25,
        gamma=0.5,
        damping=TimeHistoryDamping(
            type="rayleigh",
            mode1Frequency=1.5,
            mode2Frequency=8.0,
            targetDampingRatio1=0.05,
            targetDampingRatio2=0.05,
        ),
    )
    assert settings.enabled is True
    assert settings.timeStep == 0.005
    assert settings.damping.mode1Frequency == 1.5
    assert settings.damping.mode2Frequency == 8.0


def test_time_history_settings_rejects_invalid_method() -> None:
    with pytest.raises(ValueError, match="timeHistory.method must be one of"):
        TimeHistorySettings(
            method="central-difference",
            timeStep=0.01,
            duration=30.0,
            beta=0.25,
            gamma=0.5,
        )


def test_time_history_settings_rejects_non_positive_time_step() -> None:
    with pytest.raises(ValueError, match="timeHistory.timeStep must be positive"):
        TimeHistorySettings(
            method="newmark-beta",
            timeStep=0.0,
            duration=30.0,
            beta=0.25,
            gamma=0.5,
        )


def test_time_history_settings_rejects_non_positive_beta() -> None:
    with pytest.raises(ValueError, match="timeHistory.beta must be positive"):
        TimeHistorySettings(
            method="newmark-beta",
            timeStep=0.01,
            duration=30.0,
            beta=0.0,
            gamma=0.5,
        )


def test_time_history_settings_rejects_non_positive_gamma() -> None:
    with pytest.raises(ValueError, match="timeHistory.gamma must be positive"):
        TimeHistorySettings(
            method="newmark-beta",
            timeStep=0.01,
            duration=30.0,
            beta=0.25,
            gamma=0.0,
        )


def test_time_history_settings_rejects_negative_duration() -> None:
    with pytest.raises(ValueError, match="timeHistory.duration must be non-negative"):
        TimeHistorySettings(
            method="newmark-beta",
            timeStep=0.01,
            duration=-1.0,
            beta=0.25,
            gamma=0.5,
        )


def test_time_history_damping_accepts_reserved_enum_values() -> None:
    # The MVP does not implement these types, but the model must
    # accept them as forward-compatible enum values.
    for damping_type in DAMPING_TYPES_RESERVED:
        damping = TimeHistoryDamping(type=damping_type)  # type: ignore[arg-type]
        assert damping.type == damping_type


def test_time_history_damping_rejects_unknown_type() -> None:
    with pytest.raises(ValueError, match="timeHistory.damping.type must be one of"):
        TimeHistoryDamping(type="viscous-fluid")  # type: ignore[arg-type]


def test_time_history_damping_rejects_damping_ratio_at_or_above_one() -> None:
    with pytest.raises(ValueError, match="timeHistory.damping.targetDampingRatio1 must be in"):
        TimeHistoryDamping(
            type="rayleigh",
            targetDampingRatio1=1.0,
        )
    with pytest.raises(ValueError, match="timeHistory.damping.targetDampingRatio2 must be in"):
        TimeHistoryDamping(
            type="rayleigh",
            targetDampingRatio2=1.0,
        )


def test_ground_motion_accepts_x_direction_and_si_unit() -> None:
    record = GroundMotion(
        id="gm-001",
        name="El Centro 1940 NS",
        direction="X",
        timeStep=0.01,
        duration=30.0,
        unit="m/s2",
        samples=[0.0, 0.012, 0.018, -0.003],
    )
    assert record.direction == "X"
    assert record.unit == "m/s2"
    assert record.samples == [0.0, 0.012, 0.018, -0.003]


def test_ground_motion_accepts_gal_unit() -> None:
    record = GroundMotion(
        id="gm-001",
        name="Gal unit record",
        direction="Y",
        timeStep=0.02,
        duration=10.0,
        unit="gal",
        samples=[0.0, 1.0, 2.0],
    )
    assert record.unit == "gal"


def test_ground_motion_rejects_invalid_direction() -> None:
    with pytest.raises(ValueError, match="groundMotions\[\]\.direction must be one of"):
        GroundMotion(
            id="gm-001",
            name="Invalid direction",
            direction="W",  # type: ignore[arg-type]
            timeStep=0.01,
            duration=30.0,
            unit="m/s2",
            samples=[0.0],
        )


def test_ground_motion_rejects_invalid_unit() -> None:
    with pytest.raises(ValueError, match="groundMotions\[\]\.unit must be one of"):
        GroundMotion(
            id="gm-001",
            name="Invalid unit",
            direction="X",
            timeStep=0.01,
            duration=30.0,
            unit="m",  # type: ignore[arg-type]
            samples=[0.0],
        )


def test_ground_motion_rejects_empty_id() -> None:
    with pytest.raises(ValueError, match="groundMotions\[\]\.id must be non-empty"):
        GroundMotion(
            id="",
            name="No id",
            direction="X",
            timeStep=0.01,
            duration=30.0,
            unit="m/s2",
            samples=[0.0],
        )


def test_ground_motion_rejects_non_positive_time_step() -> None:
    with pytest.raises(ValueError, match="groundMotions\[\]\.timeStep must be positive"):
        GroundMotion(
            id="gm-001",
            name="Bad step",
            direction="X",
            timeStep=0.0,
            duration=30.0,
            unit="m/s2",
            samples=[0.0],
        )


def test_envelope_extremum_default_values() -> None:
    extremum = EnvelopeExtremum()
    assert extremum.value == 0.0
    assert extremum.time == 0.0


def test_envelope_pair_stores_max_and_min() -> None:
    pair = EnvelopePair(
        max=EnvelopeExtremum(value=0.012, time=4.32),
        min=EnvelopeExtremum(value=-0.011, time=7.85),
    )
    assert pair.max.value == 0.012
    assert pair.max.time == 4.32
    assert pair.min.value == -0.011
    assert pair.min.time == 7.85


def test_time_history_result_member_forces_default_arrays() -> None:
    forces = TimeHistoryResultMemberForces()
    assert forces.N == []
    assert forces.My == []


def test_time_history_result_meta_default_values() -> None:
    meta = TimeHistoryResultMeta()
    assert meta.analysisId == ""
    assert meta.status == "success"
    assert meta.method == "newmark-beta"
    assert meta.sampleCount == 0
    assert meta.damping == {}
    assert meta.groundMotions == []


def test_time_history_result_meta_rejects_invalid_status() -> None:
    with pytest.raises(ValueError, match="timeHistoryResult.meta.status must be one of"):
        TimeHistoryResultMeta(status="unknown")  # type: ignore[arg-type]


def test_time_history_result_meta_rejects_negative_sample_count() -> None:
    with pytest.raises(ValueError, match="timeHistoryResult.meta.sampleCount must be non-negative"):
        TimeHistoryResultMeta(sampleCount=-1)


def test_time_history_result_default_shape() -> None:
    result = TimeHistoryResult()
    assert result.time == []
    assert result.displacements == {}
    assert result.memberForces == {}
    assert result.envelopes == {}


def test_time_history_settings_to_dict_matches_schema_shape() -> None:
    settings = TimeHistorySettings()
    payload = time_history_settings_to_dict(settings)
    assert payload["method"] == "newmark-beta"
    assert payload["timeStep"] == DEFAULT_TIME_STEP_SECONDS
    assert payload["duration"] == DEFAULT_DURATION_SECONDS
    assert payload["beta"] == DEFAULT_NEWMARK_BETA
    assert payload["gamma"] == DEFAULT_NEWMARK_GAMMA
    assert payload["damping"]["type"] == "rayleigh"
    assert payload["initialConditions"]["displacement"] == "zero"


def test_ground_motion_to_dict_matches_schema_shape() -> None:
    record = GroundMotion(
        id="gm-001",
        name="El Centro 1940 NS",
        direction="X",
        timeStep=0.01,
        duration=30.0,
        unit="m/s2",
        samples=[0.0, 0.012],
    )
    payload = ground_motion_to_dict(record)
    assert payload["id"] == "gm-001"
    assert payload["direction"] == "X"
    assert payload["unit"] == "m/s2"
    assert payload["samples"] == [0.0, 0.012]


def test_time_history_result_to_dict_serializes_nested_shape() -> None:
    result = TimeHistoryResult(
        meta=TimeHistoryResultMeta(
            analysisId="th-001",
            status="success",
            method="newmark-beta",
            timeStep=0.01,
            duration=30.0,
            beta=0.25,
            gamma=0.5,
            damping={"type": "rayleigh", "alpha": 0.5, "beta": 0.001},
            groundMotions=[{"id": "gm-001", "direction": "X"}],
            sampleCount=3001,
        ),
        time=[0.0, 0.01, 0.02],
        displacements={"n1": [0.0, 1e-6, 2e-6]},
        memberForces={
            "m1": TimeHistoryResultMemberForces(N=[0.0, 1.0, 2.0])
        },
        envelopes={
            "displacements": {
                "n1": {
                    "max": {"value": 0.012, "time": 4.32},
                    "min": {"value": -0.011, "time": 7.85},
                }
            }
        },
    )
    payload = time_history_result_to_dict(result)
    assert payload["meta"]["analysisId"] == "th-001"
    assert payload["time"] == [0.0, 0.01, 0.02]
    assert payload["displacements"]["n1"] == [0.0, 1e-6, 2e-6]
    assert payload["memberForces"]["m1"]["N"] == [0.0, 1.0, 2.0]
    assert payload["envelopes"]["displacements"]["n1"]["max"]["value"] == 0.012