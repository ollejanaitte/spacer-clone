"""Tests for the effective seismic load generator (TH-2c).

These tests verify that:

* The effective load history ``P_eff(t) = -M r ag(t)`` is computed
  correctly for each translational direction.
* The participation vector ``r`` selects the matching translational
  DOFs and excludes rotational DOFs and unconstrained / zero-mass
  DOFs.
* Both Python ``list`` and NumPy ``ndarray`` acceleration inputs are
  accepted.
* Validation rejects empty, non-finite, non-1D, or shape-mismatched
  inputs as well as unknown directions.
* Zero acceleration and a zero-participation case both produce a
  zero history (explicitly allowed by the MVP).
* The output is shape ``(n_steps, n_active_dofs)`` and the active
  DOF indices are copied from the source mass matrix.
"""

from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    EffectiveLoadHistory,
    LumpedMassMatrix,
    Model,
    assemble_effective_seismic_load_history,
    assemble_lumped_mass_matrix,
    parse_model,
)
from backend.engine.errors import AnalysisError
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_model_with_mass() -> Model:
    """Minimal cantilever with tip mass for TH-2a/TH-2b/TH-2c tests."""
    project = base_project("th-load")
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
                id="mass-1",
                name="Tip mass",
                items=[MassItem(nodeId="N2", mx=2.0, my=3.0, mz=4.0)],
            )
        ],
    )


def _build_model_with_3_nodes() -> Model:
    """Two free nodes (N2, N3) carrying mass, N1 fixed.

    This is used to verify that rotational DOFs (rx, ry, rz) are
    excluded from the participation vector and that DOF index
    modular arithmetic maps nodes to their components correctly.
    """
    project = base_project("th-load-3")
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
        {"id": "N3", "x": 2.0, "y": 0.0, "z": 0.0},
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
                id="mass-1",
                name="Two tip masses",
                items=[
                    MassItem(nodeId="N2", mx=1.0, my=1.0, mz=1.0),
                    MassItem(nodeId="N3", mx=1.0, my=1.0, mz=1.0),
                ],
            )
        ],
    )


# ---------------------------------------------------------------------------
# Direction tests
# ---------------------------------------------------------------------------


def test_x_direction_load_matches_minus_m_r_ag() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.0, 0.1, -0.2])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    # The cantilever with N1 fixed has 3 active DOFs (N2 ux, uy, uz).
    # r for "x" is [1, 0, 0]; m_r = M @ r is the first column of M.
    expected_r = np.array([1.0, 0.0, 0.0])
    expected_m_r = mass.matrix @ expected_r
    expected_loads = -np.outer(ag, expected_m_r)
    np.testing.assert_array_almost_equal(result.loads, expected_loads)
    np.testing.assert_array_equal(result.participation_vector, expected_r)
    assert result.direction == "x"


def test_y_direction_load_matches_minus_m_r_ag() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.5, -0.5, 0.25])

    result = assemble_effective_seismic_load_history(mass, ag, "y")

    expected_r = np.array([0.0, 1.0, 0.0])
    expected_m_r = mass.matrix @ expected_r
    expected_loads = -np.outer(ag, expected_m_r)
    np.testing.assert_array_almost_equal(result.loads, expected_loads)
    np.testing.assert_array_equal(result.participation_vector, expected_r)
    assert result.direction == "y"


def test_z_direction_load_matches_minus_m_r_ag() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([1.0, 0.0, -1.0])

    result = assemble_effective_seismic_load_history(mass, ag, "z")

    expected_r = np.array([0.0, 0.0, 1.0])
    expected_m_r = mass.matrix @ expected_r
    expected_loads = -np.outer(ag, expected_m_r)
    np.testing.assert_array_almost_equal(result.loads, expected_loads)
    np.testing.assert_array_equal(result.participation_vector, expected_r)
    assert result.direction == "z"


def test_uppercase_direction_is_normalized() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.1, 0.2])

    upper = assemble_effective_seismic_load_history(mass, ag, "X")
    lower = assemble_effective_seismic_load_history(mass, ag, "x")

    np.testing.assert_array_equal(upper.loads, lower.loads)
    assert upper.direction == "x"
    assert lower.direction == "x"


# ---------------------------------------------------------------------------
# DOF selection
# ---------------------------------------------------------------------------


def test_rotational_dofs_have_zero_participation() -> None:
    """Even with rotational inertia in the mass case (which is
    preserved in the persisted schema but not consumed by the MVP
    lumped mass), the rotational DOFs must remain outside the
    effective load computation.
    """
    model = _build_model_with_3_nodes()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.1, 0.2, 0.3])

    for direction in ("x", "y", "z"):
        result = assemble_effective_seismic_load_history(mass, ag, direction)
        # 2 free nodes * 3 translational DOFs = 6 active DOFs.
        assert result.participation_vector.shape == (6,)
        # All translational components for the chosen direction are 1.
        expected = np.array(
            [1.0 if i % 3 == {"x": 0, "y": 1, "z": 2}[direction] else 0.0 for i in range(6)]
        )
        np.testing.assert_array_equal(result.participation_vector, expected)


def test_zero_mass_dofs_are_excluded() -> None:
    """A node with zero my should have a zero y-direction load
    contribution. The participation vector selects only DOFs that
    are both active (in active_dofs) and translational along the
    requested direction.
    """
    model = _build_model_with_mass()
    # Re-set the mass to have only mx and mz.
    model = replace(
        model,
        massCases=[
            MassCase(
                id="mass-1",
                name="Sparse mass",
                items=[MassItem(nodeId="N2", mx=1.0, my=0.0, mz=2.0)],
            )
        ],
    )
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([1.0, 2.0])

    result = assemble_effective_seismic_load_history(mass, ag, "y")

    # my is zero so N2's uy is excluded from active_dofs. Only ux
    # (DOF 6) and uz (DOF 8) remain, neither of which is a y
    # translational DOF, so the participation vector is all zero.
    assert result.participation_vector.shape == (2,)
    np.testing.assert_array_equal(result.participation_vector, np.zeros(2))
    np.testing.assert_array_equal(result.loads, np.zeros((2, 2)))
    assert result.is_zero() is True


def test_constrained_dofs_are_excluded() -> None:
    """Constrained DOFs are not in active_dofs and therefore not in
    the participation vector.
    """
    model = _build_model_with_mass()  # N1 fully fixed
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([1.0])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    # Only N2's ux/uy/uz are active; r for "x" picks N2's ux only.
    np.testing.assert_array_equal(result.participation_vector, np.array([1.0, 0.0, 0.0]))
    # N1's DOFs (0-5) are not in active_dofs and do not appear in loads.
    assert result.loads.shape == (1, 3)


# ---------------------------------------------------------------------------
# Input formats
# ---------------------------------------------------------------------------


def test_acceleration_as_list_is_accepted() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag_list = [0.0, 0.1, -0.2]

    result = assemble_effective_seismic_load_history(mass, ag_list, "x")

    np.testing.assert_array_equal(result.accelerations, np.array(ag_list))
    assert result.n_steps == 3


def test_acceleration_as_ndarray_is_accepted() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.0, 0.1, -0.2], dtype=float)

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    np.testing.assert_array_equal(result.accelerations, ag)


def test_both_input_formats_produce_identical_output() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    list_result = assemble_effective_seismic_load_history(mass, [0.0, 0.1, -0.2], "x")
    array_result = assemble_effective_seismic_load_history(
        mass, np.array([0.0, 0.1, -0.2]), "x"
    )

    np.testing.assert_array_equal(list_result.loads, array_result.loads)
    np.testing.assert_array_equal(list_result.participation_vector, array_result.participation_vector)


# ---------------------------------------------------------------------------
# Zero / zero-participation cases
# ---------------------------------------------------------------------------


def test_zero_acceleration_gives_zero_load() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.zeros(5)

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    np.testing.assert_array_equal(result.loads, np.zeros((5, 3)))
    assert result.is_zero() is True


def test_no_matching_direction_active_dof_gives_zero_load() -> None:
    """If no active DOF lies along the requested direction, the
    effective load is identically zero. This is allowed by the MVP
    and is verified explicitly per the task requirement.
    """
    model = _build_model_with_mass()
    # Override N2's mass so that all three translational components
    # are zero; with N1 fixed, this leaves no active DOFs at all.
    # The TH-2a assembler rejects this case with MODEL_UNSTABLE, so
    # instead we use a partial constraint that only leaves uy and uz
    # active. Then "x" direction has no matching active DOF.
    project = base_project("th-load-partial")
    project["nodes"] = [{"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0}]
    project["supports"] = [
        {
            "nodeId": "N1",
            "ux": True,
            "uy": False,
            "uz": False,
            "rx": False,
            "ry": False,
            "rz": False,
        }
    ]
    model = parse_model(project)
    model = replace(
        model,
        massCases=[
            MassCase(
                id="mass-1",
                name="Lumped",
                items=[MassItem(nodeId="N1", mx=10.0, my=20.0, mz=30.0)],
            )
        ],
    )
    mass = assemble_lumped_mass_matrix(model, "mass-1")  # 2 active DOFs
    ag = np.array([0.5, 0.5])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    np.testing.assert_array_equal(result.participation_vector, np.zeros(2))
    np.testing.assert_array_equal(result.loads, np.zeros((2, 2)))
    assert result.is_zero() is True


# ---------------------------------------------------------------------------
# Output shape and metadata
# ---------------------------------------------------------------------------


def test_output_shape_is_n_steps_by_n_active_dofs() -> None:
    model = _build_model_with_3_nodes()
    mass = assemble_lumped_mass_matrix(model, "mass-1")  # 6 active DOFs
    ag = np.array([0.1, 0.2, 0.3, 0.4])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    assert result.loads.shape == (4, 6)
    assert result.n_steps == 4
    assert result.n_active_dofs == 6


def test_active_dofs_are_copied_from_mass_matrix() -> None:
    model = _build_model_with_3_nodes()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.1])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    np.testing.assert_array_equal(result.active_dofs, mass.active_dofs)
    # And the returned array is not a shared mutable alias.
    assert result.active_dofs is not mass.active_dofs


def test_single_step_acceleration() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    result = assemble_effective_seismic_load_history(mass, np.array([1.0]), "z")

    assert result.loads.shape == (1, 3)
    expected = -(mass.matrix @ np.array([0.0, 0.0, 1.0]))
    np.testing.assert_array_almost_equal(result.loads[0], expected)


def test_returns_effective_load_history_instance() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    ag = np.array([0.0, 0.1])

    result = assemble_effective_seismic_load_history(mass, ag, "x")

    assert isinstance(result, EffectiveLoadHistory)
    assert isinstance(result.loads, np.ndarray)
    assert isinstance(result.participation_vector, np.ndarray)
    assert isinstance(result.active_dofs, np.ndarray)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def test_empty_acceleration_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(mass, np.array([]), "x")

    assert excinfo.value.detail.code == "LOAD_INVALID_ACCELERATION"


def test_empty_list_acceleration_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(mass, [], "x")

    assert excinfo.value.detail.code == "LOAD_INVALID_ACCELERATION"


def test_non_finite_acceleration_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(
            mass, np.array([0.0, float("nan"), 0.1]), "x"
        )

    assert excinfo.value.detail.code == "LOAD_INVALID_ACCELERATION"


def test_inf_acceleration_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(
            mass, np.array([0.0, float("inf")]), "x"
        )

    assert excinfo.value.detail.code == "LOAD_INVALID_ACCELERATION"


def test_two_dimensional_acceleration_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(
            mass, np.array([[0.0, 0.1], [0.2, 0.3]]), "x"
        )

    assert excinfo.value.detail.code == "LOAD_INVALID_ACCELERATION"


def test_invalid_direction_raises() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(mass, np.array([0.1]), "w")

    assert excinfo.value.detail.code == "LOAD_INVALID_DIRECTION"


def test_rotational_direction_string_raises() -> None:
    """Rotational directions are out of scope for the MVP."""
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(mass, np.array([0.1]), "rx")

    assert excinfo.value.detail.code == "LOAD_INVALID_DIRECTION"


def test_active_dofs_length_mismatch_raises() -> None:
    """If the active_dofs length does not match the mass matrix
    shape, the assembler must reject the input.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    # Build a fake LumpedMassMatrix with a mismatched active_dofs.
    broken = LumpedMassMatrix(
        matrix=mass.matrix,
        active_dofs=np.array([6, 7], dtype=int),  # only 2 DOFs
        dof_map=mass.dof_map,
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(broken, np.array([0.1]), "x")

    assert excinfo.value.detail.code == "LOAD_SHAPE_MISMATCH"


def test_non_square_mass_matrix_raises() -> None:
    """A non-square mass matrix must be rejected. The MVP does not
    support non-square inputs even though the TH-2a assembler
    itself only produces square matrices.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    broken = LumpedMassMatrix(
        matrix=np.zeros((2, 3), dtype=float),
        active_dofs=np.array([0, 1, 2], dtype=int),
        dof_map=mass.dof_map,
    )

    with pytest.raises(AnalysisError) as excinfo:
        assemble_effective_seismic_load_history(broken, np.array([0.1]), "x")

    assert excinfo.value.detail.code == "LOAD_SHAPE_MISMATCH"


# ---------------------------------------------------------------------------
# Backward compatibility: existing modules are untouched
# ---------------------------------------------------------------------------


def test_existing_lumped_mass_matrix_unchanged() -> None:
    """The new load module must not change the TH-2a assembler
    behavior.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    assert mass.matrix.shape == (3, 3)
    assert mass.active_dof_count == 3


def test_existing_rayleigh_damping_unchanged() -> None:
    """The new load module must not interact with the TH-2b
    damping assembler.
    """
    from backend.engine import assemble_rayleigh_damping_matrix

    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))
    damping = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)
    assert damping.matrix.shape == (3, 3)
