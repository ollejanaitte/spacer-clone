"""Mass matrix assembly for Linear Time History Analysis (TH-2a).

This module provides the mass-matrix utilities required by the future
Newmark-beta integration (TH-2d). It reuses the existing project mass
case data and the existing ``DofMap`` convention so that the assembled
matrix is shape-compatible with the existing stiffness assembly and with
the existing eigenvalue analysis.

The MVP scope is intentionally narrow:

* Lumped (diagonal) mass matrix only.
* Translational DOFs only (``ux``, ``uy``, ``uz``) for the lumped
  mass contributions. Rotational inertia fields (``irx``, ``iry``,
  ``irz``) on the persisted mass case are preserved for forward
  compatibility but are NOT included in the MVP mass matrix because
  the existing eigen analysis does not consume them. This matches the
  current project behavior: the eigen ``lumped_mass_vector`` and
  ``build_mass_vector`` helpers in ``engine.mass`` only use
  ``mx``, ``my``, ``mz``.
* The active DOF set is the same as the eigen analysis master DOF
  set: unconstrained DOFs with strictly positive mass. This keeps
  the Newmark-beta integration shape-compatible with the reduced
  stiffness matrix used by eigen / response spectrum.
* Output is deterministic: the DOF ordering is the order produced by
  ``build_dof_map`` (which iterates ``model.nodes`` in order).

This module does NOT implement:

* Rayleigh damping
* effective seismic load
* Newmark-beta time stepping
* any solver beyond assembly
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.typing import NDArray

from .dof import DofMap, build_dof_map, constrained_dofs
from .errors import AnalysisError
from .mass import select_mass_case, validate_mass_case
from .model import Model


# Absolute tolerance for declaring a mass component "zero". Mirrors the
# convention used by the eigen analysis (which treats mass components
# <= 0.0 as inactive). The MVP uses strict positivity to keep the
# active DOF definition consistent across analyses.
MASS_ZERO_TOL: float = 0.0


@dataclass(frozen=True)
class LumpedMassMatrix:
    """Container for the assembled time history mass matrix.

    The ``matrix`` attribute is a dense NumPy array of shape
    ``(active_dof, active_dof)``. The ``active_dofs`` attribute holds
    the indices into the full DOF space (as defined by
    :func:`backend.engine.dof.build_dof_map`) that correspond to the
    rows / columns of ``matrix``. The ``dof_map`` reference is kept
    for downstream consumers that need to map back to nodes and
    components.
    """

    matrix: NDArray[np.float64]
    active_dofs: NDArray[np.int_]
    dof_map: DofMap

    @property
    def active_dof_count(self) -> int:
        """Number of active (unconstrained positive-mass) DOFs."""

        return int(self.matrix.shape[0])

    def is_empty(self) -> bool:
        """Return True when the model has no active DOFs."""

        return self.active_dof_count == 0


def assemble_lumped_mass_matrix(
    model: Model,
    mass_case_id: str,
    dof_map: DofMap | None = None,
) -> LumpedMassMatrix:
    """Assemble the global lumped mass matrix for time history analysis.

    Parameters
    ----------
    model:
        The parsed project ``Model``.
    mass_case_id:
        Identifier of the mass case to use. The case must exist in
        ``model.massCases`` and must pass
        :func:`backend.engine.mass.validate_mass_case`.
    dof_map:
        Optional precomputed DOF map. When ``None`` a new map is
        built from ``model.nodes``. Supplying a precomputed map is
        useful for callers that already build one for stiffness
        assembly and want to keep the DOF ordering identical.

    Returns
    -------
    LumpedMassMatrix
        A container holding the dense diagonal mass matrix, the list
        of active DOF indices, and the DOF map that was used.

    Raises
    ------
    AnalysisError
        ``MASS_CASE_NOT_FOUND`` if the mass case is unknown,
        ``MASS_EMPTY`` if the model has no mass cases or the case
        is empty, or ``MASS_NEGATIVE`` if any mass component is
        non-finite or negative. The same error codes are used by the
        existing eigen and response spectrum paths.
    """

    mapping = dof_map or build_dof_map(model)
    mass_case = select_mass_case(model, mass_case_id)
    validate_mass_case(mass_case)

    mass_vector = _build_full_dof_mass_vector(model, mass_case, mapping)
    constrained = set(constrained_dofs(model, mapping))
    active = _select_active_dofs(mass_vector, constrained, mapping.total_dof)

    if active.size == 0:
        raise AnalysisError(
            "MODEL_UNSTABLE",
            "No unconstrained positive-mass degrees of freedom remain.",
            path="/massCases",
            entity_type="massCase",
            entity_id=mass_case.id,
        )

    matrix = np.diag(mass_vector[active]).astype(float, copy=True)
    return LumpedMassMatrix(matrix=matrix, active_dofs=active, dof_map=mapping)


def _build_full_dof_mass_vector(
    model: Model,
    mass_case: Any,
    dof_map: DofMap,
) -> NDArray[np.float64]:
    """Build the full-DOF translational mass vector for a mass case.

    The function is intentionally aligned with the existing
    :func:`backend.engine.mass.build_mass_vector` helper so the two
    analyses produce identical per-DOF mass values. Rotational inertia
    fields on the persisted mass case are not included in the MVP
    mass vector, matching the existing eigen behavior.
    """

    import math

    mass_vector = np.zeros(dof_map.total_dof, dtype=float)
    for item_index, item in enumerate(mass_case.items or []):
        if item.nodeId not in dof_map.node_index:
            raise AnalysisError(
                "MASS_UNKNOWN_NODE",
                f"MASS_UNKNOWN_NODE: mass item references unknown nodeId: {item.nodeId}.",
                path=f"/massCases/{mass_case.id}/items/{item_index}/nodeId",
                entity_type="massCase",
                entity_id=mass_case.id,
            )

        for component, value in zip(
            ("mx", "my", "mz"),
            (item.mx, item.my, item.mz),
            strict=True,
        ):
            if not math.isfinite(value):
                raise AnalysisError(
                    "MASS_NEGATIVE",
                    f"MASS_NEGATIVE: {component} must be a finite non-negative value.",
                    path=f"/massCases/{mass_case.id}/items/{item_index}/{component}",
                    entity_type="massCase",
                    entity_id=mass_case.id,
                )
            if value < -MASS_ZERO_TOL:
                raise AnalysisError(
                    "MASS_NEGATIVE",
                    f"MASS_NEGATIVE: {component} must not be negative.",
                    path=f"/massCases/{mass_case.id}/items/{item_index}/{component}",
                    entity_type="massCase",
                    entity_id=mass_case.id,
                )

        node_dofs = dof_map.node_dofs(item.nodeId)
        mass_vector[node_dofs[0]] += float(item.mx)
        mass_vector[node_dofs[1]] += float(item.my)
        mass_vector[node_dofs[2]] += float(item.mz)

    return mass_vector


def _select_active_dofs(
    mass_vector: NDArray[np.float64],
    constrained: set[int],
    total_dof: int,
) -> NDArray[np.int_]:
    """Return the deterministic sorted list of active DOF indices.

    Active DOFs are unconstrained DOFs with strictly positive mass.
    The output preserves the ascending DOF index order so the matrix
    is shape-compatible with the reduced stiffness matrix used by the
    eigen and response spectrum paths.
    """

    active = [
        index
        for index in range(total_dof)
        if index not in constrained and mass_vector[index] > MASS_ZERO_TOL
    ]
    return np.array(active, dtype=int)
