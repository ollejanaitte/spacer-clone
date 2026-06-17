"""Newmark-beta Average Acceleration Method integrator (TH-2d).

This module provides the time integration core required by the future
Linear Time History Analysis end-to-end pipeline. It consumes the
matrices produced by the TH-2a / TH-2b assemblers and the load
history produced by the TH-2c generator, and produces the time
history of displacements, velocities, and accelerations in the
active DOF space.

The MVP scope is intentionally narrow:

* Linear systems only. ``M``, ``C``, ``K`` are treated as constant
  in time.
* The Average Acceleration Method only, with the MVP default
  coefficients ``beta = 1/4`` and ``gamma = 1/2`` (unconditionally
  stable for linear systems, second-order accurate).
* Direct dense solver via ``numpy.linalg.solve`` for both the
  initial acceleration and each step's effective stiffness solve.
* Deterministic output: the algorithm is purely sequential and uses
  no random sources.

The module is intentionally solver-agnostic. It does NOT:

* integrate with the ``Model`` object or the project schema,
* parse ``GroundMotion`` records,
* estimate Rayleigh coefficients from target damping ratios,
* implement any UI / API / reporting integration,
* implement nonlinear time integration.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np
from numpy.typing import NDArray

from .errors import AnalysisError


# MVP default Newmark-beta coefficients for the Average Acceleration
# Method. These match the project default in
# ``engine.time_history_models``.
DEFAULT_NEWMARK_BETA: float = 0.25
DEFAULT_NEWMARK_GAMMA: float = 0.5


@dataclass(frozen=True)
class NewmarkTimeHistoryResult:
    """Container for the Newmark-beta time integration result.

    Attributes
    ----------
    displacements:
        Dense NumPy array of shape ``(n_steps, n_dofs)`` holding
        the displacement vector ``u(t)`` at every time step. The
        first row is the initial displacement ``u(0)``.
    velocities:
        Dense NumPy array of shape ``(n_steps, n_dofs)`` holding
        the velocity vector ``v(t)`` at every time step. The
        first row is the initial velocity ``v(0)``.
    accelerations:
        Dense NumPy array of shape ``(n_steps, n_dofs)`` holding
        the acceleration vector ``a(t)`` at every time step. The
        first row is the initial acceleration ``a(0)`` obtained
        from the equilibrium equation ``M a(0) = P(0) - C v(0) - K u(0)``.
    dt:
        Constant time step used for the integration.
    beta:
        Newmark-beta coefficient actually used. The MVP forces
        ``beta = 1/4``.
    gamma:
        Newmark-gamma coefficient actually used. The MVP forces
        ``gamma = 1/2``.
    time:
        Dense NumPy array of shape ``(n_steps,)`` holding the time
        stamps. ``time[i] == i * dt``.
    """

    displacements: NDArray[np.float64]
    velocities: NDArray[np.float64]
    accelerations: NDArray[np.float64]
    dt: float
    beta: float
    gamma: float
    time: NDArray[np.float64]

    @property
    def n_steps(self) -> int:
        """Number of time steps in the result."""

        return int(self.displacements.shape[0])

    @property
    def n_dofs(self) -> int:
        """Number of active DOFs the result is defined on."""

        return int(self.displacements.shape[1])


def solve_newmark_average_acceleration(
    mass_matrix: NDArray[np.float64] | Sequence[Sequence[float]],
    damping_matrix: NDArray[np.float64] | Sequence[Sequence[float]],
    stiffness_matrix: NDArray[np.float64] | Sequence[Sequence[float]],
    loads: NDArray[np.float64] | Sequence[Sequence[float]],
    dt: float,
    initial_displacement: Sequence[float] | NDArray[np.float64] | None = None,
    initial_velocity: Sequence[float] | NDArray[np.float64] | None = None,
) -> NewmarkTimeHistoryResult:
    """Integrate the linear system via the Newmark-beta Average
    Acceleration Method.

    The governing equation is

        M u_ddot(t) + C u_dot(t) + K u(t) = P(t)

    with constant ``M``, ``C``, ``K`` and a piece-wise constant load
    ``P(t)`` sampled at the supplied time steps. The Average
    Acceleration Method with the MVP defaults ``beta = 1/4`` and
    ``gamma = 1/2`` is unconditionally stable for linear systems
    and is second-order accurate.

    Parameters
    ----------
    mass_matrix, damping_matrix, stiffness_matrix:
        Constant dense square matrices of identical shape
        ``(n_dofs, n_dofs)``. Lists and tuples are accepted and are
        converted to float64 arrays internally.
    loads:
        Dense two-dimensional array of shape
        ``(n_steps, n_dofs)``. ``loads[i]`` is the load vector
        applied at time ``t = i * dt``.
    dt:
        Constant time step. Must be finite and strictly positive.
    initial_displacement, initial_velocity:
        Optional initial state vectors of length ``n_dofs``. When
        ``None`` the initial state is zero.

    Returns
    -------
    NewmarkTimeHistoryResult
        A container holding the displacement, velocity, and
        acceleration time histories plus the integration metadata
        (``dt``, ``beta``, ``gamma``, ``time``).

    Raises
    ------
    AnalysisError
        ``TIME_HISTORY_SHAPE_MISMATCH`` for non-square ``M``/``C``/``K``,
        for shape mismatches between the three matrices, for a
        non-2D load array, for an ``n_dofs`` mismatch between the
        load array and the matrices, or for an inconsistent initial
        state vector. ``TIME_HISTORY_INVALID_TIME_STEP`` for a
        non-finite or non-positive ``dt``. ``TIME_HISTORY_INVALID_INPUT``
        for any non-finite entry in the inputs. ``TIME_HISTORY_SOLVER_FAILED``
        for a singular mass matrix during the initial acceleration
        solve or for a singular effective stiffness matrix during
        the time stepping.
    """

    beta = DEFAULT_NEWMARK_BETA
    gamma = DEFAULT_NEWMARK_GAMMA

    mass = _validated_matrix(mass_matrix, name="mass")
    damping = _validated_matrix(damping_matrix, name="damping")
    stiffness = _validated_matrix(stiffness_matrix, name="stiffness")
    _validated_shape_match(mass, damping, name="damping")
    _validated_shape_match(mass, stiffness, name="stiffness")

    load_array = _validated_loads(loads, n_dofs=mass.shape[0])
    _validated_finite(load_array, name="loads")

    dt_value = _validated_dt(dt)

    n_dofs = mass.shape[0]
    n_steps = load_array.shape[0]

    u0 = _validated_initial_state(
        initial_displacement, n_dofs=n_dofs, name="initial_displacement"
    )
    v0 = _validated_initial_state(
        initial_velocity, n_dofs=n_dofs, name="initial_velocity"
    )

    # Pre-compute the Newmark integration coefficients.
    a0 = 1.0 / (beta * dt_value * dt_value)
    a1 = gamma / (beta * dt_value)
    a2 = 1.0 / (beta * dt_value)
    a3 = 1.0 / (2.0 * beta) - 1.0
    a4 = gamma / beta - 1.0
    a5 = dt_value * (gamma / (2.0 * beta) - 1.0)

    # Allocate the result arrays. The first row holds the initial
    # state; the remaining rows are filled by the time stepping loop.
    u = np.zeros((n_steps, n_dofs), dtype=float)
    v = np.zeros((n_steps, n_dofs), dtype=float)
    a = np.zeros((n_steps, n_dofs), dtype=float)

    u[0] = u0
    v[0] = v0

    # Initial acceleration from the equilibrium equation.
    a[0] = _solve_initial_acceleration(mass, damping, stiffness, load_array[0], v0, u0)

    # Effective stiffness is constant because M, C, K are constant.
    k_eff = stiffness + a0 * mass + a1 * damping
    try:
        k_eff_inv = np.linalg.inv(k_eff)
    except np.linalg.LinAlgError as exc:
        raise AnalysisError(
            "TIME_HISTORY_SOLVER_FAILED",
            f"TIME_HISTORY_SOLVER_FAILED: effective stiffness matrix is singular: {exc}.",
            path="/analysisSettings/timeHistory",
        ) from exc

    for i in range(1, n_steps):
        prev_u = u[i - 1]
        prev_v = v[i - 1]
        prev_a = a[i - 1]
        p_curr = load_array[i]

        effective_load = p_curr + mass @ (a0 * prev_u + a2 * prev_v + a3 * prev_a) \
            + damping @ (a1 * prev_u + a4 * prev_v + a5 * prev_a)

        u[i] = k_eff_inv @ effective_load
        a[i] = a0 * (u[i] - prev_u) - a2 * prev_v - a3 * prev_a
        v[i] = prev_v + dt_value * ((1.0 - gamma) * prev_a + gamma * a[i])

    time = np.arange(n_steps, dtype=float) * dt_value

    return NewmarkTimeHistoryResult(
        displacements=u,
        velocities=v,
        accelerations=a,
        dt=dt_value,
        beta=beta,
        gamma=gamma,
        time=time,
    )


def _validated_matrix(
    value: NDArray[np.float64] | Sequence[Sequence[float]],
    *,
    name: str,
) -> NDArray[np.float64]:
    array = np.asarray(value, dtype=float)
    if array.ndim != 2:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: {name} matrix must be 2D.",
            path="/analysisSettings/timeHistory",
        )
    if array.shape[0] != array.shape[1]:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: {name} matrix must be square.",
            path=f"/analysisSettings/timeHistory/{name}",
        )
    _validated_finite(array, name=name)
    return array


def _validated_shape_match(
    reference: NDArray[np.float64],
    other: NDArray[np.float64],
    *,
    name: str,
) -> None:
    if other.shape != reference.shape:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: {name} matrix shape "
            f"{other.shape} does not match reference shape {reference.shape}.",
            path=f"/analysisSettings/timeHistory/{name}",
        )


def _validated_loads(
    value: NDArray[np.float64] | Sequence[Sequence[float]],
    *,
    n_dofs: int,
) -> NDArray[np.float64]:
    array = np.asarray(value, dtype=float)
    if array.ndim != 2:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            "TIME_HISTORY_SHAPE_MISMATCH: loads must be a 2D array.",
            path="/analysisSettings/timeHistory",
        )
    if array.shape[0] < 1:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            "TIME_HISTORY_SHAPE_MISMATCH: loads must have at least one step.",
            path="/analysisSettings/timeHistory",
        )
    if array.shape[1] != n_dofs:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: loads.shape[1]={array.shape[1]} "
            f"does not match n_dofs={n_dofs}.",
            path="/analysisSettings/timeHistory",
        )
    return array


def _validated_dt(dt: float) -> float:
    if not isinstance(dt, (int, float)) or isinstance(dt, bool):
        raise AnalysisError(
            "TIME_HISTORY_INVALID_TIME_STEP",
            "TIME_HISTORY_INVALID_TIME_STEP: dt must be a finite number.",
            path="/analysisSettings/timeHistory",
        )
    value = float(dt)
    if not math.isfinite(value):
        raise AnalysisError(
            "TIME_HISTORY_INVALID_TIME_STEP",
            "TIME_HISTORY_INVALID_TIME_STEP: dt must be finite.",
            path="/analysisSettings/timeHistory",
        )
    if value <= 0.0:
        raise AnalysisError(
            "TIME_HISTORY_INVALID_TIME_STEP",
            "TIME_HISTORY_INVALID_TIME_STEP: dt must be strictly positive.",
            path="/analysisSettings/timeHistory",
        )
    return value


def _validated_initial_state(
    value: Sequence[float] | NDArray[np.float64] | None,
    *,
    n_dofs: int,
    name: str,
) -> NDArray[np.float64]:
    if value is None:
        return np.zeros(n_dofs, dtype=float)
    array = np.asarray(value, dtype=float)
    if array.ndim != 1:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: {name} must be 1D.",
            path=f"/analysisSettings/timeHistory/{name}",
        )
    if array.shape[0] != n_dofs:
        raise AnalysisError(
            "TIME_HISTORY_SHAPE_MISMATCH",
            f"TIME_HISTORY_SHAPE_MISMATCH: {name} length "
            f"{array.shape[0]} does not match n_dofs={n_dofs}.",
            path=f"/analysisSettings/timeHistory/{name}",
        )
    _validated_finite(array, name=name)
    return array


def _validated_finite(array: NDArray[np.float64], *, name: str) -> None:
    if not np.all(np.isfinite(array)):
        raise AnalysisError(
            "TIME_HISTORY_INVALID_INPUT",
            f"TIME_HISTORY_INVALID_INPUT: {name} contains non-finite values.",
            path="/analysisSettings/timeHistory",
        )


def _solve_initial_acceleration(
    mass: NDArray[np.float64],
    damping: NDArray[np.float64],
    stiffness: NDArray[np.float64],
    p0: NDArray[np.float64],
    v0: NDArray[np.float64],
    u0: NDArray[np.float64],
) -> NDArray[np.float64]:
    """Solve ``M a(0) = P(0) - C v(0) - K u(0)`` for the initial
    acceleration.
    """

    rhs = p0 - damping @ v0 - stiffness @ u0
    try:
        return np.linalg.solve(mass, rhs)
    except np.linalg.LinAlgError as exc:
        raise AnalysisError(
            "TIME_HISTORY_SOLVER_FAILED",
            f"TIME_HISTORY_SOLVER_FAILED: mass matrix is singular: {exc}.",
            path="/analysisSettings/timeHistory",
        ) from exc
