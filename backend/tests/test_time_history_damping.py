"""Tests for the Rayleigh damping matrix assembly (TH-2b).

These tests verify that:

* ``C = alpha * M + beta * K`` is computed correctly.
* Both ``alpha only`` and ``beta only`` paths work.
* Zero damping (alpha = beta = 0) returns a zero matrix.
* Coefficient validation rejects negative or non-finite inputs.
* Shape validation rejects mismatched stiffness matrices and
  non-square inputs.
* ``active_dofs`` from the mass matrix is preserved on the result.
* The result is symmetric whenever M and K are symmetric.
* The module composes correctly with the TH-2a mass matrix.
"""

from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    LumpedMassMatrix,
    Model,
    RayleighDampingMatrix,
    assemble_lumped_mass_matrix,
    assemble_rayleigh_damping_matrix,
    parse_model,
)
from backend.engine.errors import AnalysisError
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_model_with_mass() -> Model:
    """Minimal cantilever with tip mass for TH-2a/TH-2b integration."""
    project = base_project("th-damping")
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


def _identity_stiffness(mass: LumpedMassMatrix) -> np.ndarray:
    """Return a square K matching the mass matrix shape.

    The MVP only requires that K be shape-compatible and symmetric;
    the actual stiffness values are not exercised by these tests.
    """

    n = mass.matrix.shape[0]
    return np.eye(n, dtype=float)


# ---------------------------------------------------------------------------
# Basic matrix assembly
# ---------------------------------------------------------------------------


def test_assembles_rayleigh_damping_matrix_with_alpha_and_beta() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    expected = 0.1 * mass.matrix + 0.01 * stiffness
    np.testing.assert_array_almost_equal(result.matrix, expected)


def test_assembles_rayleigh_damping_matrix_alpha_only() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.5, beta=0.0)

    np.testing.assert_array_almost_equal(result.matrix, 0.5 * mass.matrix)


def test_assembles_rayleigh_damping_matrix_beta_only() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.0, beta=0.02)

    np.testing.assert_array_almost_equal(result.matrix, 0.02 * stiffness)


def test_zero_damping_returns_zero_matrix() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.0, beta=0.0)

    assert result.is_zero() is True
    np.testing.assert_array_equal(result.matrix, np.zeros_like(mass.matrix))


def test_returns_rayleigh_damping_matrix_instance() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    assert isinstance(result, RayleighDampingMatrix)
    assert isinstance(result.matrix, np.ndarray)
    assert result.matrix.ndim == 2
    assert result.matrix.shape[0] == result.matrix.shape[1]
    assert result.alpha == pytest.approx(0.1)
    assert result.beta == pytest.approx(0.01)


def test_active_dofs_are_preserved_from_mass_matrix() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    np.testing.assert_array_equal(result.active_dofs, mass.active_dofs)


def test_active_dof_count_matches_matrix_size() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    assert result.active_dof_count == result.matrix.shape[0]
    assert result.active_dof_count == mass.matrix.shape[0]


# ---------------------------------------------------------------------------
# Symmetry
# ---------------------------------------------------------------------------


def test_result_is_symmetric_when_m_and_k_are_symmetric() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    # Build a non-diagonal but symmetric stiffness matrix.
    n = mass.matrix.shape[0]
    base = np.array(
        [
            [10.0, 1.0, 0.5],
            [1.0, 8.0, 0.3],
            [0.5, 0.3, 6.0],
        ]
    )
    assert np.allclose(base, base.T)  # pre-condition
    stiffness = base

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    np.testing.assert_array_almost_equal(result.matrix, result.matrix.T)


def test_result_is_symmetric_when_alpha_only() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.5, beta=0.0)

    np.testing.assert_array_almost_equal(result.matrix, result.matrix.T)


def test_result_is_symmetric_when_beta_only() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.0, beta=0.05)

    np.testing.assert_array_almost_equal(result.matrix, result.matrix.T)


# ---------------------------------------------------------------------------
# Coefficient validation
# ---------------------------------------------------------------------------


def test_negative_alpha_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, stiffness, alpha=-0.1, beta=0.0)

    assert excinfo.value.detail.code == "DAMPING_INVALID_COEFFICIENT"


def test_negative_beta_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.0, beta=-0.01)

    assert excinfo.value.detail.code == "DAMPING_INVALID_COEFFICIENT"


def test_non_finite_alpha_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, stiffness, alpha=float("inf"), beta=0.0)

    assert excinfo.value.detail.code == "DAMPING_INVALID_COEFFICIENT"


def test_non_finite_beta_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.0, beta=float("nan"))

    assert excinfo.value.detail.code == "DAMPING_INVALID_COEFFICIENT"


# ---------------------------------------------------------------------------
# Shape validation
# ---------------------------------------------------------------------------


def test_shape_mismatch_raises_damping_shape_mismatch() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")  # 3x3
    wrong = np.eye(4, dtype=float)  # 4x4

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, wrong, alpha=0.1, beta=0.01)

    assert excinfo.value.detail.code == "DAMPING_SHAPE_MISMATCH"


def test_non_square_stiffness_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")  # 3x3
    non_square = np.zeros((3, 5), dtype=float)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, non_square, alpha=0.1, beta=0.01)

    assert excinfo.value.detail.code == "DAMPING_SHAPE_MISMATCH"


def test_non_2d_stiffness_is_rejected() -> None:
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    one_d = np.zeros(3, dtype=float)

    with pytest.raises(AnalysisError) as excinfo:
        assemble_rayleigh_damping_matrix(mass, one_d, alpha=0.1, beta=0.01)

    assert excinfo.value.detail.code == "DAMPING_SHAPE_MISMATCH"


def test_accepts_stiffness_as_list() -> None:
    """Lists are coerced to ndarray to ease caller ergonomics; the
    shape and dtype validation still applies.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    n = mass.matrix.shape[0]
    stiffness = [[100.0 if i == j else 0.0 for j in range(n)] for i in range(n)]

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    expected = 0.1 * mass.matrix + 0.01 * np.asarray(stiffness, dtype=float)
    np.testing.assert_array_almost_equal(result.matrix, expected)


# ---------------------------------------------------------------------------
# TH-2a integration
# ---------------------------------------------------------------------------


def test_composes_with_th2a_lumped_mass_matrix() -> None:
    """The end-to-end use case: build M via TH-2a, supply a matching
    K, and verify C is shape-aligned and reflects the expected
    formula.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    # Build a stiffness matrix that mirrors the mass shape; values
    # are arbitrary and only used to verify the formula.
    stiffness = np.diag(np.array([100.0, 200.0, 300.0]))

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.2, beta=0.05)

    assert result.matrix.shape == mass.matrix.shape
    assert result.matrix.shape == stiffness.shape
    expected = 0.2 * mass.matrix + 0.05 * stiffness
    np.testing.assert_array_almost_equal(result.matrix, expected)
    # M is diagonal so the alpha-only contribution is diagonal.
    expected_diag = np.diag(0.2 * mass.matrix + 0.05 * stiffness)
    np.testing.assert_array_equal(np.diag(result.matrix), expected_diag)


def test_composition_preserves_dof_index_mapping() -> None:
    """The active DOF indices must be the same on the damping
    result as on the source mass matrix, so downstream consumers
    (TH-2d) can map rows back to model components.
    """
    model = _build_model_with_mass()
    mass = assemble_lumped_mass_matrix(model, "mass-1")
    stiffness = _identity_stiffness(mass)

    result = assemble_rayleigh_damping_matrix(mass, stiffness, alpha=0.1, beta=0.01)

    np.testing.assert_array_equal(result.active_dofs, mass.active_dofs)
    assert result.active_dof_count == mass.active_dof_count
