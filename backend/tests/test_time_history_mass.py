"""Tests for the time history mass matrix assembly (TH-2a).

These tests verify that:

* The assembled matrix has the correct shape and diagonal values.
* The matrix is symmetric.
* Constrained DOFs are excluded from the active DOF set.
* The DOF ordering is deterministic.
* Existing error codes are reused for invalid inputs.
* Existing eigen / response spectrum analysis is unaffected.
"""

from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    LumpedMassMatrix,
    Model,
    assemble_lumped_mass_matrix,
    parse_model,
)
from backend.engine.errors import AnalysisError
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _model_with_nodes_and_supports(
    nodes: list[dict],
    supports: list[dict],
) -> Model:
    project = base_project("th-mass")
    project["nodes"] = list(nodes)
    project["supports"] = list(supports)
    return parse_model(project)


def _model_with_mass_case(
    nodes: list[dict],
    supports: list[dict],
    mass_case: MassCase,
) -> Model:
    model = _model_with_nodes_and_supports(nodes, supports)
    return replace(model, massCases=[mass_case])


# ---------------------------------------------------------------------------
# Basic matrix assembly
# ---------------------------------------------------------------------------


def test_assembles_diagonal_mass_matrix_for_single_node() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped mass at N1",
            items=[MassItem(nodeId="N1", mx=1.5, my=2.5, mz=3.5)],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    assert isinstance(result, LumpedMassMatrix)
    assert result.matrix.shape == (3, 3)
    np.testing.assert_array_equal(
        result.matrix,
        np.diag(np.array([1.5, 2.5, 3.5])),
    )


def test_assembles_mass_matrix_for_two_node_cantilever() -> None:
    """Tip mass on a cantilever: N1 fully fixed, N2 carries the mass."""
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[
            {
                "nodeId": "N1",
                "ux": True,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": True,
            }
        ],
        mass_case=MassCase(
            id="mass-1",
            name="Tip mass",
            items=[MassItem(nodeId="N2", mx=1.0, my=2.0, mz=3.0)],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    # N1 is fully constrained so only N2's 3 translational DOFs are active.
    assert result.matrix.shape == (3, 3)
    np.testing.assert_array_equal(
        result.matrix,
        np.diag(np.array([1.0, 2.0, 3.0])),
    )
    # N2's ux/uy/uz are DOFs 6, 7, 8 in the full DOF space.
    np.testing.assert_array_equal(result.active_dofs, np.array([6, 7, 8]))


def test_matrix_is_symmetric() -> None:
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Both nodes",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    assert result.matrix.shape == (6, 6)
    np.testing.assert_array_equal(result.matrix, result.matrix.T)


def test_mass_matrix_is_diagonal() -> None:
    """Lumped mass is a diagonal matrix in the MVP."""
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Both nodes",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    off_diagonal = result.matrix - np.diag(np.diag(result.matrix))
    np.testing.assert_array_equal(off_diagonal, np.zeros_like(off_diagonal))


def test_mass_vector_matches_existing_build_mass_vector() -> None:
    """The MVP mass vector must agree with the existing mass helper
    so the future Newmark-beta integration produces results that
    match the eigen analysis numerical expectations.
    """
    from backend.engine.mass import build_mass_vector

    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
            {"id": "N3", "x": 2.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped masses",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=2.0, mz=3.0),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")
    existing = build_mass_vector(model, "mass-1")

    # The full-DOF diagonal must equal the existing mass vector.
    np.testing.assert_array_equal(np.diag(result.matrix), existing[result.active_dofs])


# ---------------------------------------------------------------------------
# DOF consistency
# ---------------------------------------------------------------------------


def test_constrained_dofs_are_excluded_from_active_set() -> None:
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[
            {
                "nodeId": "N1",
                "ux": True,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": True,
            }
        ],
        mass_case=MassCase(
            id="mass-1",
            name="Both nodes",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0),
                MassItem(nodeId="N2", mx=1.0, my=1.0, mz=1.0),
            ],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    # N1 is constrained, so only N2 contributes active DOFs.
    np.testing.assert_array_equal(result.active_dofs, np.array([6, 7, 8]))
    assert result.matrix.shape == (3, 3)


def test_partial_constraint_keeps_unconstrained_dofs() -> None:
    """A partial support (e.g. only ux) must still exclude the
    constrained DOF from the active set.
    """
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[
            {
                "nodeId": "N1",
                "ux": True,
                "uy": False,
                "uz": False,
                "rx": False,
                "ry": False,
                "rz": False,
            }
        ],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[MassItem(nodeId="N1", mx=10.0, my=20.0, mz=30.0)],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    # Only uy and uz remain active for N1.
    np.testing.assert_array_equal(result.active_dofs, np.array([1, 2]))
    np.testing.assert_array_equal(np.diag(result.matrix), np.array([20.0, 30.0]))


def test_zero_mass_dofs_are_excluded_from_active_set() -> None:
    """DOFs with zero or negative mass are excluded from the active
    set, matching the eigen analysis master-DOF definition.
    """
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Only N2 has mass",
            items=[MassItem(nodeId="N2", mx=2.0, my=0.0, mz=3.0)],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    # N1: all zero -> excluded. N2: my is zero -> excluded. Only
    # N2's ux (DOF 6) and uz (DOF 8) remain.
    np.testing.assert_array_equal(result.active_dofs, np.array([6, 8]))
    np.testing.assert_array_equal(np.diag(result.matrix), np.array([2.0, 3.0]))


def test_dof_ordering_is_deterministic() -> None:
    """Calling the assembler twice on the same model must produce
    the same active DOF indices and the same matrix.
    """
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
            {"id": "N3", "x": 2.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Three nodes",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0),
                MassItem(nodeId="N2", mx=2.0, my=2.0, mz=2.0),
                MassItem(nodeId="N3", mx=3.0, my=3.0, mz=3.0),
            ],
        ),
    )

    a = assemble_lumped_mass_matrix(model, "mass-1")
    b = assemble_lumped_mass_matrix(model, "mass-1")

    np.testing.assert_array_equal(a.active_dofs, b.active_dofs)
    np.testing.assert_array_equal(a.matrix, b.matrix)
    # DOFs are ascending.
    assert np.all(np.diff(a.active_dofs) > 0)


def test_precomputed_dof_map_is_respected() -> None:
    """A caller-supplied dof_map is used as-is, ensuring shape
    compatibility with stiffness assembly.
    """
    from backend.engine.dof import build_dof_map

    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Both",
            items=[MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0)],
        ),
    )
    dof_map = build_dof_map(model)

    result = assemble_lumped_mass_matrix(model, "mass-1", dof_map=dof_map)

    assert result.dof_map is dof_map
    assert result.matrix.shape == (3, 3)


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


def test_unknown_mass_case_id_raises_mass_case_not_found() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0)],
        ),
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-unknown")

    assert excinfo.value.detail.code == "MASS_CASE_NOT_FOUND"


def test_empty_mass_cases_raises_mass_empty() -> None:
    model = _model_with_nodes_and_supports(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-1")

    assert excinfo.value.detail.code == "MASS_EMPTY"


def test_mass_case_with_no_items_raises_mass_empty() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Empty",
            items=[],
        ),
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-1")

    assert excinfo.value.detail.code == "MASS_EMPTY"


def test_negative_mass_value_raises_mass_negative() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Bad mass",
            items=[MassItem(nodeId="N1", mx=-1.0, my=1.0, mz=1.0)],
        ),
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-1")

    assert excinfo.value.detail.code == "MASS_NEGATIVE"


def test_unknown_node_in_mass_item_raises_mass_unknown_node() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Bad node",
            items=[MassItem(nodeId="N-DOES-NOT-EXIST", mx=1.0, my=1.0, mz=1.0)],
        ),
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-1")

    assert excinfo.value.detail.code == "MASS_UNKNOWN_NODE"


def test_all_dofs_constrained_or_zero_mass_raises_model_unstable() -> None:
    """A model with no active DOFs (everything constrained) must
    surface a MODEL_UNSTABLE error matching the eigen analysis
    behavior.
    """
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[
            {
                "nodeId": "N1",
                "ux": True,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": True,
            }
        ],
        mass_case=MassCase(
            id="mass-1",
            name="Mass on fixed node",
            items=[MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0)],
        ),
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_lumped_mass_matrix(model, "mass-1")

    assert excinfo.value.detail.code == "MODEL_UNSTABLE"


# ---------------------------------------------------------------------------
# Backward compatibility: existing analyses still work
# ---------------------------------------------------------------------------


def test_existing_build_mass_vector_unchanged() -> None:
    """The new mass matrix module must not change the existing
    build_mass_vector behavior.
    """
    from backend.engine.mass import build_mass_vector

    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=2.0, mz=3.0),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        ),
    )

    expected = np.array(
        [1.0, 2.0, 3.0, 0.0, 0.0, 0.0, 4.0, 5.0, 6.0, 0.0, 0.0, 0.0]
    )
    np.testing.assert_array_equal(build_mass_vector(model, "mass-1"), expected)


def test_existing_eigen_lumped_mass_vector_unchanged() -> None:
    """The new mass matrix module must not change the existing
    eigen.lumped_mass_vector behavior.
    """
    from backend.engine.eigen import lumped_mass_vector

    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=2.0, mz=3.0),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        ),
    )
    dof_map = assemble_lumped_mass_matrix(model, "mass-1").dof_map
    mass_case = model.massCases[0]

    expected = np.array(
        [1.0, 2.0, 3.0, 0.0, 0.0, 0.0, 4.0, 5.0, 6.0, 0.0, 0.0, 0.0]
    )
    np.testing.assert_array_equal(
        lumped_mass_vector(model, mass_case, dof_map), expected
    )


# ---------------------------------------------------------------------------
# Type and shape contracts
# ---------------------------------------------------------------------------


def test_returns_lumped_mass_matrix_instance() -> None:
    model = _model_with_mass_case(
        nodes=[{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0)],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    assert isinstance(result, LumpedMassMatrix)
    assert isinstance(result.matrix, np.ndarray)
    assert result.matrix.ndim == 2
    assert result.matrix.shape[0] == result.matrix.shape[1]


def test_active_dof_count_matches_matrix_size() -> None:
    model = _model_with_mass_case(
        nodes=[
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        ],
        supports=[],
        mass_case=MassCase(
            id="mass-1",
            name="Lumped",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=1.0, mz=1.0),
                MassItem(nodeId="N2", mx=1.0, my=1.0, mz=1.0),
            ],
        ),
    )

    result = assemble_lumped_mass_matrix(model, "mass-1")

    assert result.active_dof_count == result.matrix.shape[0]
    assert result.active_dof_count == 6
