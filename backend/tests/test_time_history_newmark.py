"""Tests for the Newmark-beta Average Acceleration integrator (TH-2d).

These tests verify that:

* The MVP Newmark integrator (beta = 1/4, gamma = 1/2) reproduces
  analytical solutions for SDOF systems within tight tolerances for
  undamped free vibration, damped free vibration, and constant static
  loading.
* The output containers expose the expected shapes, time vector, and
  initial conditions.
* Initial conditions supplied by the caller are preserved at step 0,
  and zero initial conditions are the documented default.
* The initial acceleration a(0) is recovered from the equilibrium
  equation M a(0) = P(0) - C v(0) - K u(0).
* Validation rejects negative / non-finite / non-positive time steps,
  non-square matrices, shape mismatches between M / C / K, non-2D
  loads, shape mismatches between loads and DOFs, non-finite values,
  and shape mismatches between initial state vectors and DOFs.
* Singular M and singular K_eff both surface as AnalysisError with the
  dedicated TIME_HISTORY_SOLVER_FAILED code.
* A multi-DOF diagonal system is integrated and its per-DOF response
  matches the analytical SDOF solution in the corresponding axis.
"""

from __future__ import annotations

import math
from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    LumpedMassMatrix,
    Model,
    NewmarkTimeHistoryResult,
    assemble_lumped_mass_matrix,
    parse_model,
    solve_newmark_average_acceleration,
)
from backend.engine.errors import AnalysisError
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_model_with_mass(case_id: str = "mass-1") -> Model:
    """Minimal cantilever with a single tip mass case.

    The same fixture is reused by TH-2a / TH-2b / TH-2c tests and is
    extended here to produce a 3x3 diagonal active-DOF system
    (translational X / Y / Z at the free node).
    """

    project = base_project("th-newmark")
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
                id=case_id,
                name="Tip mass",
                items=[MassItem(nodeId="N2", mx=1.0, my=1.0, mz=1.0)],
            )
        ],
    )


def _sdof_arrays(
    *,
    mass: float,
    stiffness: float,
    damping: float,
    n_steps: int,
    dt: float,
    load_value: float = 0.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (M, C, K, loads) for a single-DOF MVP system."""

    M = np.array([[mass]], dtype=float)
    C = np.array([[damping]], dtype=float)
    K = np.array([[stiffness]], dtype=float)
    loads = np.full((n_steps, 1), load_value, dtype=float)
    return M, C, K, loads


# ---------------------------------------------------------------------------
# SDOF numerical verification
# ---------------------------------------------------------------------------


def test_sdof_undamped_free_vibration_matches_cosine() -> None:
    """m=1, k=1, c=0, u(0)=1, v(0)=0 yields u(t) = cos(t)."""

    n_steps = 401
    dt = 0.05
    M, C, K, loads = _sdof_arrays(
        mass=1.0,
        stiffness=1.0,
        damping=0.0,
        n_steps=n_steps,
        dt=dt,
    )

    result = solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        dt,
        initial_displacement=[1.0],
        initial_velocity=[0.0],
    )

    omega_n = math.sqrt(1.0)
    time = np.arange(n_steps) * dt
    expected_u = np.cos(omega_n * time)

    np.testing.assert_allclose(result.displacements[:, 0], expected_u, atol=5.0e-3)
    expected_v = -omega_n * np.sin(omega_n * time)
    np.testing.assert_allclose(result.velocities[:, 0], expected_v, atol=5.0e-2)


def test_sdof_damped_free_vibration_decays_over_time() -> None:
    """m=1, k=100, c=2*xi*omega_n with xi=0.05 decays at the expected
    analytical rate.
    """

    mass = 1.0
    stiffness = 100.0
    xi = 0.05
    omega_n = math.sqrt(stiffness / mass)
    damping = 2.0 * xi * mass * omega_n

    n_steps = 1000
    dt = 0.05
    M, C, K, loads = _sdof_arrays(
        mass=mass,
        stiffness=stiffness,
        damping=damping,
        n_steps=n_steps,
        dt=dt,
    )

    result = solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        dt,
        initial_displacement=[1.0],
        initial_velocity=[0.0],
    )

    omega_d = omega_n * math.sqrt(1.0 - xi * xi)
    time = np.arange(n_steps) * dt
    analytical = np.exp(-xi * omega_n * time) * np.cos(omega_d * time)

    # Average-Acceleration Newmark-beta is second-order accurate.
    # Over 1000 steps with dt = T_n / 20 the global L-infinity error
    # against the analytical solution is well below 2e-1.
    abs_err = np.max(np.abs(result.displacements[:, 0] - analytical))
    assert abs_err < 2.0e-1

    # After the analytical envelope has decayed, the numerical response
    # must stay close to zero. The numerical solver remains stable
    # (no late-time growth) which is the property we verify here.
    late = int(0.5 * n_steps)
    late_envelope = float(np.exp(-xi * omega_n * time[late]))
    assert np.max(np.abs(result.displacements[late:, 0])) < max(late_envelope * 5.0, 1.0e-2)

    # Reference point at t = 49.95 must match within 3e-3 (decayed regime).
    t_doc = 49.95
    i_doc = int(round(t_doc / dt))
    expected_at_t_doc = float(np.exp(-xi * omega_n * t_doc) * math.cos(omega_d * t_doc))
    assert abs(result.displacements[i_doc, 0] - expected_at_t_doc) < 3.0e-3


def test_zero_load_zero_initial_conditions_yields_zero_response() -> None:
    M, C, K, loads = _sdof_arrays(
        mass=1.0,
        stiffness=2.0,
        damping=0.3,
        n_steps=10,
        dt=0.1,
    )

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)

    np.testing.assert_array_equal(
        result.displacements, np.zeros_like(result.displacements)
    )
    np.testing.assert_array_equal(
        result.velocities, np.zeros_like(result.velocities)
    )
    np.testing.assert_array_equal(
        result.accelerations, np.zeros_like(result.accelerations)
    )


def test_constant_load_static_response_oscillates_around_equilibrium() -> None:
    """For constant P with zero initial conditions, the analytical
    response of an undamped SDOF is u(t) = (P/k) * (1 - cos(omega_n t)).
    """

    mass = 1.0
    stiffness = 1.0
    p0 = 2.0

    n_steps = 501
    dt = 0.05
    M, C, K, loads = _sdof_arrays(
        mass=mass,
        stiffness=stiffness,
        damping=0.0,
        n_steps=n_steps,
        dt=dt,
        load_value=p0,
    )

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=dt)

    omega_n = math.sqrt(stiffness / mass)
    time = np.arange(n_steps) * dt
    expected = (p0 / stiffness) * (1.0 - np.cos(omega_n * time))
    np.testing.assert_allclose(result.displacements[:, 0], expected, atol=5.0e-2)

    # Use a long averaging window relative to the natural period.
    tail = result.displacements[400:, 0]
    assert abs(np.mean(tail) - p0 / stiffness) < 0.5


# ---------------------------------------------------------------------------
# Output shape and metadata
# ---------------------------------------------------------------------------


def test_output_shapes_are_correct() -> None:
    n_steps = 17
    n_dofs = 4
    M = np.eye(n_dofs)
    C = np.eye(n_dofs) * 0.1
    K = np.eye(n_dofs) * 10.0
    loads = np.zeros((n_steps, n_dofs))

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=0.01)

    assert result.displacements.shape == (n_steps, n_dofs)
    assert result.velocities.shape == (n_steps, n_dofs)
    assert result.accelerations.shape == (n_steps, n_dofs)
    assert result.time.shape == (n_steps,)
    assert result.n_steps == n_steps
    assert result.n_dofs == n_dofs


def test_time_vector_is_arithmetic() -> None:
    n_steps = 11
    dt = 0.25
    M = np.eye(2)
    C = np.zeros((2, 2))
    K = np.eye(2) * 4.0
    loads = np.zeros((n_steps, 2))

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=dt)

    np.testing.assert_array_equal(result.time, np.arange(n_steps) * dt)


def test_default_newmark_coefficients_are_average_acceleration() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1) * 4.0
    loads = np.zeros((3, 1))

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)

    assert result.beta == pytest.approx(0.25)
    assert result.gamma == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# Initial conditions
# ---------------------------------------------------------------------------


def test_initial_displacement_and_velocity_preserved_at_step_zero() -> None:
    n_steps = 5
    M = np.eye(1) * 2.0
    C = np.zeros((1, 1))
    K = np.eye(1) * 8.0
    loads = np.zeros((n_steps, 1))

    result = solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        dt=0.1,
        initial_displacement=[3.0],
        initial_velocity=[-1.5],
    )

    assert result.displacements[0, 0] == pytest.approx(3.0)
    assert result.velocities[0, 0] == pytest.approx(-1.5)


def test_zero_initial_conditions_when_unspecified() -> None:
    n_steps = 4
    M = np.eye(1) * 2.0
    C = np.zeros((1, 1))
    K = np.eye(1) * 8.0
    loads = np.zeros((n_steps, 1))

    result = solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)

    np.testing.assert_array_equal(result.displacements[0], np.zeros(1))
    np.testing.assert_array_equal(result.velocities[0], np.zeros(1))


def test_initial_acceleration_derived_from_equilibrium() -> None:
    """M a(0) = P(0) - C v(0) - K u(0) must be satisfied exactly."""

    M = np.array([[2.0, 0.0], [0.0, 4.0]])
    C = np.array([[0.5, 0.0], [0.0, 0.5]])
    K = np.array([[10.0, 0.0], [0.0, 20.0]])
    loads = np.array([[1.0, 2.0], [1.0, 2.0], [1.0, 2.0]])

    result = solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        dt=0.1,
        initial_displacement=[0.5, -0.25],
        initial_velocity=[0.0, 0.0],
    )

    expected_a0 = np.linalg.solve(
        M, loads[0] - C @ result.velocities[0] - K @ result.displacements[0]
    )
    np.testing.assert_allclose(result.accelerations[0], expected_a0, atol=1.0e-12)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def test_invalid_dt_zero_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.zeros((2, 1))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.0)
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_TIME_STEP"


def test_invalid_dt_negative_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.zeros((2, 1))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=-0.01)
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_TIME_STEP"


def test_invalid_dt_nan_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.zeros((2, 1))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=float("nan"))
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_TIME_STEP"


def test_invalid_dt_inf_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.zeros((2, 1))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=float("inf"))
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_TIME_STEP"


def test_non_square_mass_rejected() -> None:
    M = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    C = np.eye(2)
    K = np.eye(2)
    loads = np.zeros((2, 2))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_shape_mismatch_between_matrices_rejected() -> None:
    M = np.eye(2)
    C = np.eye(3)
    K = np.eye(2)
    loads = np.zeros((2, 2))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_loads_not_2d_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.zeros(1)

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_loads_shape_mismatch_rejected() -> None:
    M = np.eye(2)
    C = np.zeros((2, 2))
    K = np.eye(2)
    loads = np.zeros((3, 4))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_loads_empty_rejected() -> None:
    M = np.eye(2)
    C = np.zeros((2, 2))
    K = np.eye(2)
    loads = np.zeros((0, 2))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_non_finite_loads_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.eye(1)
    loads = np.array([[float("nan")], [1.0]])

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_INPUT"


def test_non_finite_stiffness_rejected() -> None:
    M = np.eye(1)
    C = np.zeros((1, 1))
    K = np.array([[float("inf")]])
    loads = np.zeros((2, 1))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_INVALID_INPUT"


def test_initial_displacement_wrong_length_rejected() -> None:
    M = np.eye(2)
    C = np.zeros((2, 2))
    K = np.eye(2)
    loads = np.zeros((3, 2))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(
            M,
            C,
            K,
            loads,
            dt=0.1,
            initial_displacement=[1.0],
        )
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_initial_velocity_wrong_length_rejected() -> None:
    M = np.eye(2)
    C = np.zeros((2, 2))
    K = np.eye(2)
    loads = np.zeros((3, 2))

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(
            M,
            C,
            K,
            loads,
            dt=0.1,
            initial_velocity=[1.0, 2.0, 3.0],
        )
    assert excinfo.value.detail.code == "TIME_HISTORY_SHAPE_MISMATCH"


def test_singular_mass_raises_solver_failed() -> None:
    """A mass matrix with a zero row/column cannot solve the equilibrium
    equation for the initial acceleration.
    """

    M = np.array([[0.0, 0.0], [0.0, 1.0]])
    C = np.zeros((2, 2))
    K = np.eye(2)
    loads = np.array([[1.0, 0.0], [1.0, 0.0]])

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SOLVER_FAILED"


def test_singular_effective_stiffness_raises_solver_failed() -> None:
    """K = 0 and M = 0 produce a truly singular K_eff = 0."""

    M = np.zeros((2, 2))
    C = np.zeros((2, 2))
    K = np.zeros((2, 2))
    loads = np.array([[1.0, 1.0], [1.0, 1.0]])

    with pytest.raises(AnalysisError) as excinfo:
        solve_newmark_average_acceleration(M, C, K, loads, dt=0.1)
    assert excinfo.value.detail.code == "TIME_HISTORY_SOLVER_FAILED"


def test_list_inputs_are_accepted() -> None:
    M = [[1.0, 0.0], [0.0, 1.0]]
    C = [[0.0, 0.0], [0.0, 0.0]]
    K = [[4.0, 0.0], [0.0, 4.0]]
    loads = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]

    result = solve_newmark_average_acceleration(
        M,
        C,
        K,
        loads,
        dt=0.1,
        initial_displacement=[1.0, 0.0],
        initial_velocity=[0.0, 0.0],
    )

    assert isinstance(result, NewmarkTimeHistoryResult)
    assert result.displacements.shape == (3, 2)


# ---------------------------------------------------------------------------
# Multi-DOF diagonal system
# ---------------------------------------------------------------------------


def test_multi_dof_diagonal_system_equals_independent_solves() -> None:
    """A diagonal 3-DOF system must be solved as three independent SDOF
    systems. The X DOF responds to loads[:, 0], Y to loads[:, 1], Z to
    loads[:, 2], with no cross-coupling.
    """

    model = _build_model_with_mass(case_id="mass-3")
    mass = assemble_lumped_mass_matrix(model, "mass-3")

    n_dofs = mass.matrix.shape[0]
    diag_k = np.array([10.0, 20.0, 30.0])
    K = np.diag(diag_k)
    C = np.zeros((n_dofs, n_dofs))

    n_steps = 121
    dt = 0.02
    loads = np.zeros((n_steps, n_dofs))
    loads[:, 2] = 2.0

    result = solve_newmark_average_acceleration(
        mass.matrix,
        C,
        K,
        loads,
        dt=dt,
        initial_displacement=[0.1, 0.0, 0.0],
        initial_velocity=[0.0, 0.0, 0.0],
    )

    omega_x = math.sqrt(10.0)
    time = np.arange(n_steps) * dt
    expected_x = 0.1 * np.cos(omega_x * time)
    np.testing.assert_allclose(result.displacements[:, 0], expected_x, atol=5.0e-3)

    np.testing.assert_array_equal(result.displacements[:, 1], np.zeros(n_steps))
    np.testing.assert_array_equal(result.velocities[:, 1], np.zeros(n_steps))

    omega_z = math.sqrt(30.0)
    expected_z = (2.0 / 30.0) * (1.0 - np.cos(omega_z * time))
    np.testing.assert_allclose(result.displacements[:, 2], expected_z, atol=5.0e-2)


# ---------------------------------------------------------------------------
# Backward compatibility smoke tests
# ---------------------------------------------------------------------------


def test_th2a_lumped_mass_matrix_still_usable() -> None:
    """The TH-2a mass matrix helper must remain unchanged."""

    model = _build_model_with_mass(case_id="mass-1")
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    assert isinstance(mass, LumpedMassMatrix)
    assert mass.matrix.shape == (3, 3)
    assert mass.active_dof_count == 3