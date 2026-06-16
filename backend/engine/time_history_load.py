"""Effective seismic load generator for Linear Time History Analysis (TH-2c).

This module provides the effective load vector utility required by the
future Newmark-beta integration (TH-2d). It computes the time history
of effective load vectors produced by a ground acceleration acting on
a fixed direction:

    P_eff(t) = -M r ag(t)

where:

* ``M`` is the global lumped mass matrix reduced to the active DOF
  set produced by TH-2a.
* ``r`` is a 0/1 direction vector of length ``n_active_dofs`` that
  selects the translational DOFs along the requested direction.
* ``ag(t)`` is the input ground acceleration series.

The MVP scope is intentionally narrow:

* Three translational directions only: ``"x"``, ``"y"``, ``"z"``.
  Case is normalized to lower-case so callers may use ``"X"`` or
  ``"x"`` interchangeably. Direction ``"X"`` selects every active
  ``ux`` DOF, ``"Y"`` selects ``uy``, and ``"Z"`` selects ``uz``.
* Rotational DOFs (``rx``, ``ry``, ``rz``) always have participation
  zero. The MVP does not support rotational ground acceleration.
* The output is the time history of effective load vectors in the
  active DOF space. The shape is ``(n_steps, n_active_dofs)`` and
  the row ``i`` equals ``-M @ r * ag[i]``.
* No interpolation, resampling, unit conversion, or solver
  integration. The function is a pure ``P_eff(t) = -M r ag(t)``
  factory.

This module does NOT implement:

* GroundMotion schema parsing
* Rayleigh damping
* Newmark-beta time stepping
* response calculation
* any UI / API / reporting integration
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np
from numpy.typing import NDArray

from .errors import AnalysisError
from .time_history_mass import LumpedMassMatrix


# Component offset within the per-node 6-DOF block
# (ux, uy, uz, rx, ry, rz).
_OFFSET_UX = 0
_OFFSET_UY = 1
_OFFSET_UZ = 2

_ALLOWED_DIRECTIONS: tuple[str, ...] = ("x", "y", "z")

_DIRECTION_TO_OFFSET: dict[str, int] = {
    "x": _OFFSET_UX,
    "y": _OFFSET_UY,
    "z": _OFFSET_UZ,
}


@dataclass(frozen=True)
class EffectiveLoadHistory:
    """Container for the effective seismic load time history.

    Attributes
    ----------
    loads:
        Dense NumPy array of shape ``(n_steps, n_active_dofs)``
        holding the effective load vectors ``P_eff(t)`` in the
        active DOF space. ``loads[i, :] == -M @ r * accelerations[i]``
        for every step ``i``.
    accelerations:
        Dense NumPy array of shape ``(n_steps,)`` holding the input
        ground acceleration series. Stored on the container so
        downstream consumers can correlate load samples with the
        original input.
    direction:
        Normalized direction string in lower case. One of
        ``"x"``, ``"y"``, ``"z"``.
    participation_vector:
        Dense NumPy array of shape ``(n_active_dofs,)`` holding the
        0/1 direction vector ``r`` used in the computation. Kept on
        the container for inspection and for downstream consumers
        that need to report the excitation direction in result
        metadata.
    active_dofs:
        Dense NumPy array of shape ``(n_active_dofs,)`` holding the
        active DOF indices inherited from the source mass matrix.
    """

    loads: NDArray[np.float64]
    accelerations: NDArray[np.float64]
    direction: str
    participation_vector: NDArray[np.float64]
    active_dofs: NDArray[np.int_]

    @property
    def n_steps(self) -> int:
        """Number of time steps in the load history."""

        return int(self.loads.shape[0])

    @property
    def n_active_dofs(self) -> int:
        """Number of active DOFs the load vectors are defined on."""

        return int(self.loads.shape[1])

    def is_zero(self) -> bool:
        """Return True when every load sample is zero.

        A zero history is produced when the acceleration series is
        all zeros, when the active DOF set has no translational DOF
        along the requested direction, or both. Both cases are
        allowed by the MVP.
        """

        return bool(np.all(self.loads == 0.0))


def assemble_effective_seismic_load_history(
    mass_matrix: LumpedMassMatrix,
    accelerations: Sequence[float] | NDArray[np.float64],
    direction: str,
) -> EffectiveLoadHistory:
    """Build the effective seismic load history ``P_eff(t) = -M r ag(t)``.

    Parameters
    ----------
    mass_matrix:
        The lumped mass matrix produced by
        :func:`backend.engine.time_history_mass.assemble_lumped_mass_matrix`.
        Provides both the dense mass matrix ``M`` and the active DOF
        indices that the resulting load vectors are aligned with.
    accelerations:
        One-dimensional series of ground acceleration values. Lists
        and NumPy arrays are accepted; the value is converted to a
        float64 array internally. Must be non-empty and contain only
        finite values.
    direction:
        Direction of the ground acceleration. ``"x"`` selects ``ux``
        DOFs, ``"y"`` selects ``uy``, ``"z"`` selects ``uz``. The
        value is normalized to lower case.

    Returns
    -------
    EffectiveLoadHistory
        A container holding the dense load history, the input
        accelerations, the normalized direction, the 0/1
        participation vector ``r``, and the active DOF indices of
        the source mass matrix.

    Raises
    ------
    AnalysisError
        ``LOAD_SHAPE_MISMATCH`` if the mass matrix is not square or
        if the active DOF array length does not match the mass
        matrix shape. ``LOAD_INVALID_ACCELERATION`` if the
        acceleration series is empty, not one-dimensional, or
        contains non-finite values. ``LOAD_INVALID_DIRECTION`` if
        the direction is not one of ``"x"``/``"y"``/``"z"``.
    """

    mass_array = _validated_mass_array(mass_matrix)
    accel_array = _validated_accelerations(accelerations)
    normalized_direction = _validated_direction(direction)

    participation = _build_participation_vector(
        active_dofs=mass_matrix.active_dofs,
        direction=normalized_direction,
    )

    m_r = mass_array @ participation
    # ``-m_r * ag[i]`` is the same as ``np.outer(-accelerations, m_r)``
    # and is computed in a single vectorized call so the loop is
    # avoidable and the output is deterministic.
    loads = -np.outer(accel_array, m_r)

    return EffectiveLoadHistory(
        loads=loads,
        accelerations=accel_array,
        direction=normalized_direction,
        participation_vector=participation,
        active_dofs=np.array(mass_matrix.active_dofs, dtype=int),
    )


def _validated_mass_array(mass_matrix: LumpedMassMatrix) -> NDArray[np.float64]:
    mass_array = np.asarray(mass_matrix.matrix, dtype=float)
    if mass_array.ndim != 2 or mass_array.shape[0] != mass_array.shape[1]:
        raise AnalysisError(
            "LOAD_SHAPE_MISMATCH",
            "LOAD_SHAPE_MISMATCH: mass matrix must be square.",
            path="/analysisSettings/timeHistory",
        )
    expected = mass_array.shape[0]
    if len(mass_matrix.active_dofs) != expected:
        raise AnalysisError(
            "LOAD_SHAPE_MISMATCH",
            "LOAD_SHAPE_MISMATCH: active_dofs length does not match mass matrix shape.",
            path="/analysisSettings/timeHistory",
        )
    if expected == 0:
        raise AnalysisError(
            "LOAD_SHAPE_MISMATCH",
            "LOAD_SHAPE_MISMATCH: mass matrix has no active DOFs.",
            path="/analysisSettings/timeHistory",
        )
    return mass_array


def _validated_accelerations(
    accelerations: Sequence[float] | NDArray[np.float64],
) -> NDArray[np.float64]:
    accel_array = np.asarray(accelerations, dtype=float)
    if accel_array.ndim != 1:
        raise AnalysisError(
            "LOAD_INVALID_ACCELERATION",
            "LOAD_INVALID_ACCELERATION: accelerations must be a 1D array.",
            path="/groundMotions",
        )
    if accel_array.size == 0:
        raise AnalysisError(
            "LOAD_INVALID_ACCELERATION",
            "LOAD_INVALID_ACCELERATION: accelerations must not be empty.",
            path="/groundMotions",
        )
    if not np.all(np.isfinite(accel_array)):
        raise AnalysisError(
            "LOAD_INVALID_ACCELERATION",
            "LOAD_INVALID_ACCELERATION: accelerations must be finite.",
            path="/groundMotions",
        )
    return accel_array


def _validated_direction(direction: str) -> str:
    if not isinstance(direction, str):
        raise AnalysisError(
            "LOAD_INVALID_DIRECTION",
            "LOAD_INVALID_DIRECTION: direction must be a string.",
            path="/groundMotions",
        )
    normalized = direction.strip().lower()
    if normalized not in _ALLOWED_DIRECTIONS:
        raise AnalysisError(
            "LOAD_INVALID_DIRECTION",
            f"LOAD_INVALID_DIRECTION: direction must be one of "
            f"{list(_ALLOWED_DIRECTIONS)}; got {direction!r}.",
            path="/groundMotions",
        )
    return normalized


def _build_participation_vector(
    *,
    active_dofs: NDArray[np.int_],
    direction: str,
) -> NDArray[np.float64]:
    """Build the 0/1 direction vector ``r`` in the active DOF space.

    The active DOF indices are interpreted in the existing
    :data:`backend.engine.dof.DOF_NAMES` ordering. Each node
    contributes six consecutive DOF indices in the order
    ``(ux, uy, uz, rx, ry, rz)``. The component offset within a
    block is therefore ``index % 6``. Rotational offsets (``3``,
    ``4``, ``5``) are excluded from the MVP.
    """

    offset = _DIRECTION_TO_OFFSET[direction]
    participation = np.zeros(len(active_dofs), dtype=float)
    for local_index, global_dof in enumerate(active_dofs):
        component = int(global_dof) % 6
        if component == offset:
            participation[local_index] = 1.0
    return participation
