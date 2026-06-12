from __future__ import annotations

import math

import numpy as np
from numpy.typing import NDArray

from .constants import MASS_ABS_TOL
from .dof import DofMap, build_dof_map
from .errors import AnalysisError
from .model import MassCase, Model


def select_mass_case(model: Model, mass_case_id: str) -> MassCase:
    if not model.massCases:
        raise AnalysisError(
            "MASS_EMPTY",
            "MASS_EMPTY: massCases must contain at least one mass case.",
            path="/massCases",
            entity_type="massCase",
        )

    for mass_case in model.massCases:
        if mass_case.id == mass_case_id:
            return mass_case

    raise AnalysisError(
        "MASS_CASE_NOT_FOUND",
        f"MASS_CASE_NOT_FOUND: massCaseId does not exist: {mass_case_id}.",
        path="/massCaseId",
        entity_type="massCase",
        entity_id=mass_case_id,
    )


def build_mass_vector(
    model: Model,
    mass_case_id: str,
    dof_map: DofMap | None = None,
) -> NDArray[np.float64]:
    mass_case = select_mass_case(model, mass_case_id)
    validate_mass_case(mass_case)
    mapping = dof_map or build_dof_map(model)
    mass_vector = np.zeros(mapping.total_dof, dtype=float)

    for item_index, item in enumerate(mass_case.items or []):
        if item.nodeId not in mapping.node_index:
            raise AnalysisError(
                "MASS_UNKNOWN_NODE",
                f"MASS_UNKNOWN_NODE: mass item references unknown nodeId: {item.nodeId}.",
                path=f"/massCases/{mass_case.id}/items/{item_index}/nodeId",
                entity_type="massCase",
                entity_id=mass_case.id,
            )

        translational_masses = (item.mx, item.my, item.mz)
        for component, value in zip(
            ("mx", "my", "mz"), translational_masses, strict=True
        ):
            if not math.isfinite(value):
                raise AnalysisError(
                    "MASS_NEGATIVE",
                    f"MASS_NEGATIVE: {component} must be a finite non-negative value.",
                    path=f"/massCases/{mass_case.id}/items/{item_index}/{component}",
                    entity_type="massCase",
                    entity_id=mass_case.id,
                )
            if value < -MASS_ABS_TOL:
                raise AnalysisError(
                    "MASS_NEGATIVE",
                    f"MASS_NEGATIVE: {component} must not be negative.",
                    path=f"/massCases/{mass_case.id}/items/{item_index}/{component}",
                    entity_type="massCase",
                    entity_id=mass_case.id,
                )

        node_dofs = mapping.node_dofs(item.nodeId)
        mass_vector[node_dofs[:3]] += np.asarray(translational_masses, dtype=float)

    return mass_vector


def validate_mass_case(mass_case: MassCase) -> None:
    if mass_case.method != "lumped":
        raise AnalysisError(
            "MASS_UNSUPPORTED_METHOD",
            f"MASS_UNSUPPORTED_METHOD: unsupported mass method: {mass_case.method}.",
            path=f"/massCases/{mass_case.id}/method",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    if mass_case.source != "manual":
        raise AnalysisError(
            "MASS_UNSUPPORTED_SOURCE",
            f"MASS_UNSUPPORTED_SOURCE: unsupported mass source: {mass_case.source}.",
            path=f"/massCases/{mass_case.id}/source",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
    if not mass_case.items:
        raise AnalysisError(
            "MASS_EMPTY",
            "MASS_EMPTY: mass case items must contain at least one item.",
            path=f"/massCases/{mass_case.id}/items",
            entity_type="massCase",
            entity_id=mass_case.id,
        )
