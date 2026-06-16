"""Rayleigh damping matrix assembly for Linear Time History Analysis (TH-2b).

This module provides the damping matrix utility required by the future
Newmark-beta integration (TH-2d). It consumes the lumped mass matrix
produced by TH-2a (``assemble_lumped_mass_matrix``) and a stiffness
matrix reduced to the same active DOF set, and produces the global
Rayleigh damping matrix:

    C = alpha * M + beta * K

The MVP scope is intentionally narrow:

* Pure Rayleigh damping (mass-proportional + stiffness-proportional).
* No modal damping, no constant damping, no user matrix damping. The
  reserved enum values ``"modal"``, ``"constant"`` and
  ``"userMatrix"`` declared in TH-1a are explicitly out of scope.
* No coefficient estimation from target damping ratios; the caller
  supplies the numeric ``alpha`` and ``beta`` directly.
* Shape consistency between M, K, and the active DOF set is enforced
  at the boundary so the future Newmark-beta solver can rely on
  ``C`` being shape-compatible with the reduced stiffness matrix.

The module is intentionally solver-agnostic. It does NOT implement
Newmark-beta time stepping, effective seismic load, ground motion
response, or any UI / API / reporting integration.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from .errors import AnalysisError
from .time_history_mass import LumpedMassMatrix


@dataclass(frozen=True)
class RayleighDampingMatrix:
    """Container for the assembled Rayleigh damping matrix.

    The ``matrix`` attribute is a dense NumPy array of shape
    ``(active_dof, active_dof)`` representing the global damping
    matrix ``C = alpha * M + beta * K`` reduced to the active DOF
    set. The original ``alpha`` and ``beta`` coefficients are kept
    on the container for downstream consumers that need to report
    them (for example, in the result metadata).
    """

    matrix: NDArray[np.float64]
    alpha: float
    beta: float
    active_dofs: NDArray[np.int_]

    @property
    def active_dof_count(self) -> int:
        """Number of active DOFs the matrix is defined on."""

        return int(self.matrix.shape[0])

    def is_zero(self) -> bool:
        """Return True when both alpha and beta are zero.

        A zero damping matrix is allowed by the MVP because the
        solver is expected to handle the resulting trivial ``C = 0``
        case identically to the existing eigen analysis base case.
        """

        return self.alpha == 0.0 and self.beta == 0.0


def assemble_rayleigh_damping_matrix(
    mass_matrix: LumpedMassMatrix,
    stiffness_matrix: NDArray[np.float64],
    alpha: float,
    beta: float,
) -> RayleighDampingMatrix:
    """Assemble the global Rayleigh damping matrix ``C = alpha*M + beta*K``.

    Parameters
    ----------
    mass_matrix:
        The lumped mass matrix produced by
        :func:`backend.engine.time_history_mass.assemble_lumped_mass_matrix`.
        Provides both the dense mass matrix ``M`` and the active DOF
        indices that the resulting ``C`` must be aligned with.
    stiffness_matrix:
        The reduced stiffness matrix ``K`` restricted to the same
        active DOF set as ``mass_matrix``. The matrix must be square
        and must match the shape of ``mass_matrix.matrix``. The
        caller is responsible for performing the DOF reduction (the
        same reduction used by the eigen analysis master-DOF
        construction); this function only validates the result.
    alpha:
        Mass-proportional coefficient. Must be finite and
        non-negative.
    beta:
        Stiffness-proportional coefficient. Must be finite and
        non-negative.

    Returns
    -------
    RayleighDampingMatrix
        A container holding the dense damping matrix, the input
        coefficients, and the active DOF indices of ``mass_matrix``.

    Raises
    ------
    AnalysisError
        ``DAMPING_INVALID_COEFFICIENT`` if ``alpha`` or ``beta`` is
        non-finite or negative, ``DAMPING_SHAPE_MISMATCH`` if the
        stiffness matrix does not match the mass matrix shape or is
        not square, ``DAMPING_EMPTY_ACTIVE_DOF`` if the resulting
        matrix has no rows.
    """

    _validate_coefficient(alpha, name="alpha")
    _validate_coefficient(beta, name="beta")

    mass_array = np.asarray(mass_matrix.matrix, dtype=float)
    if mass_array.ndim != 2 or mass_array.shape[0] != mass_array.shape[1]:
        raise AnalysisError(
            "DAMPING_SHAPE_MISMATCH",
            "DAMPING_SHAPE_MISMATCH: mass matrix must be square.",
            path="/analysisSettings/timeHistory/damping",
        )
    if mass_array.size == 0 or mass_array.shape[0] == 0:
        raise AnalysisError(
            "DAMPING_EMPTY_ACTIVE_DOF",
            "DAMPING_EMPTY_ACTIVE_DOF: mass matrix has no active DOFs.",
            path="/analysisSettings/timeHistory/damping",
        )

    stiffness_array = np.asarray(stiffness_matrix, dtype=float)
    if stiffness_array.ndim != 2:
        raise AnalysisError(
            "DAMPING_SHAPE_MISMATCH",
            "DAMPING_SHAPE_MISMATCH: stiffness matrix must be a 2D array.",
            path="/analysisSettings/timeHistory/damping",
        )
    if stiffness_array.shape[0] != stiffness_array.shape[1]:
        raise AnalysisError(
            "DAMPING_SHAPE_MISMATCH",
            "DAMPING_SHAPE_MISMATCH: stiffness matrix must be square.",
            path="/analysisSettings/timeHistory/damping",
        )
    if stiffness_array.shape != mass_array.shape:
        raise AnalysisError(
            "DAMPING_SHAPE_MISMATCH",
            "DAMPING_SHAPE_MISMATCH: stiffness matrix shape "
            f"{stiffness_array.shape} does not match mass matrix shape "
            f"{mass_array.shape}.",
            path="/analysisSettings/timeHistory/damping",
        )

    # alpha * M + beta * K. The M and K terms are independent so the
    # symmetric / non-symmetric property of C is preserved whenever
    # both M and K are symmetric. The MVP uses simple dense addition;
    # the future Newmark-beta solver will consume the result as-is.
    damping = alpha * mass_array + beta * stiffness_array

    return RayleighDampingMatrix(
        matrix=damping,
        alpha=float(alpha),
        beta=float(beta),
        active_dofs=np.array(mass_matrix.active_dofs, dtype=int),
    )


def _validate_coefficient(value: float, *, name: str) -> None:
    if not math.isfinite(value):
        raise AnalysisError(
            "DAMPING_INVALID_COEFFICIENT",
            f"DAMPING_INVALID_COEFFICIENT: {name} must be finite.",
            path=f"/analysisSettings/timeHistory/damping/{name}",
        )
    if value < 0.0:
        raise AnalysisError(
            "DAMPING_INVALID_COEFFICIENT",
            f"DAMPING_INVALID_COEFFICIENT: {name} must be non-negative.",
            path=f"/analysisSettings/timeHistory/damping/{name}",
        )
