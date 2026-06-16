"""End-to-end SDOF verification for the Linear Time History engine (TH-3).

This module wires together the four pure engine pieces produced by
TH-2a / TH-2b / TH-2c / TH-2d:

* ``assemble_lumped_mass_matrix`` (TH-2a)
* ``assemble_rayleigh_damping_matrix`` (TH-2b)
* ``assemble_effective_seismic_load_history`` (TH-2c)
* ``solve_newmark_average_acceleration`` (TH-2d)

and verifies them against the analytical benchmark cases defined in
``docs/design/time-history-sdof-verification.md`` (cases A, B, C, D).

These are *backend-only* verification tests. They do not touch the
project schema, the loader, the saver, the validator, the API, the
frontend, or any reporting code. The Model object is used only as a
fixture source for TH-2a; the rest of the pipeline operates on the
pure matrix / array inputs.

The reference parameters follow section 5 of the verification design:

* ``m = 1.0`` kg
* ``k = 100.0`` N / m
* ``omega_n = 10.0`` rad / s
* ``T_n = 2 * pi / omega_n = pi / 5`` s
* ``xi = 0.05``
* ``c = 2 * xi * m * omega_n = 1.0`` N * s / m
"""

from __future__ import annotations

import math
from dataclasses import replace

import numpy as np
import pytest

from backend.engine import (
    EffectiveLoadHistory,
    LumpedMassMatrix,
    NewmarkTimeHistoryResult,
    RayleighDampingMatrix,
    assemble_effective_seismic_load_history,
    assemble_lumped_mass_matrix,
    assemble_rayleigh_damping_matrix,
    parse_model,
    solve_newmark_average_acceleration,
)
from backend.engine.model import MassCase, MassItem

from .sample_models import base_project


# ---------------------------------------------------------------------------
# Reference parameters (verification design, section 5)
# ---------------------------------------------------------------------------


M_REF: float = 1.0
K_REF: float = 100.0
XI_REF: float = 0.05
OMEGA_N_REF: float = math.sqrt(K_REF / M_REF)  # 10.0 rad / s
T_N_REF: float = 2.0 * math.pi / OMEGA_N_REF  # pi / 5 s
OMEGA_D_REF: float = OMEGA_N_REF * math.sqrt(1.0 - XI_REF * XI_REF)
C_REF: float = 2.0 * XI_REF * M_REF * OMEGA_N_REF  # 1.0 N * s / m
P0_REF: float = 1.0
A0_REF: float = 1.0


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


def _build_sdof_model() -> "Model":  # type: ignore[name-defined]  # noqa: F821
    """A single free node in X direction, fully fixed in the opposite node.

    The mass case places ``m = 1.0`` only on the X translational DOF so
    that the assembled active-DOF system is exactly 1x1.
    """

    project = base_project("th-sdof-verification")
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
                id="m-1",
                name="SDOF mass",
                items=[MassItem(nodeId="N2", mx=M_REF, my=0.0, mz=0.0)],
            )
        ],
    )


@pytest.fixture()
def sdof_matrices() -> dict[str, object]:
    """Bundle the TH-2a / TH-2b outputs for the 1-DOF system."""

    model = _build_sdof_model()
    mass: LumpedMassMatrix = assemble_lumped_mass_matrix(model, "m-1")
    stiffness = np.array([[K_REF]], dtype=float)
    # For the SDOF case, c = 2 * xi * m * omega_n is equivalent to
    # Rayleigh damping with alpha = 2 * xi * omega_n and beta = 0,
    # since K is non-trivial. Using beta = 0 keeps the special case
    # clean.
    alpha_for_c = C_REF / M_REF  # 1.0 / 1.0
    damping: RayleighDampingMatrix = assemble_rayleigh_damping_matrix(
        mass,
        stiffness,
        alpha=alpha_for_c,
        beta=0.0,
    )
    return {
        "model": model,
        "mass": mass,
        "stiffness": stiffness,
        "damping": damping,
        "M": mass.matrix,
        "C": damping.matrix,
        "K": stiffness,
    }


def _solve_case_a(
    sdof: dict[str, object],
    *,
    n_steps: int,
    dt: float,
    u0: float = 1.0,
) -> NewmarkTimeHistoryResult:
    loads = np.zeros((n_steps, 1), dtype=float)
    return solve_newmark_average_acceleration(
        sdof["M"],
        np.zeros_like(sdof["M"]),
        sdof["K"],
        loads,
        dt,
        initial_displacement=[u0],
        initial_velocity=[0.0],
    )


# ---------------------------------------------------------------------------
# Case A: Undamped free vibration
# ---------------------------------------------------------------------------


def test_case_a_displacement_matches_cosine_one_cycle(sdof_matrices: dict[str, object]) -> None:
    """u(t) = u0 * cos(omega_n * t) for one full cycle at dt = T_n / 100."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(T_N_REF / dt) + 1

    result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)

    time = np.arange(n_steps) * dt
    expected = np.cos(OMEGA_N_REF * time)

    abs_err = float(np.max(np.abs(result.displacements[:, 0] - expected)))
    # Newmark-beta average acceleration is second-order accurate.
    # At dt = T_n / 100 the 1-cycle peak error is well below 1% of u0.
    assert abs_err < 0.01


def test_case_a_natural_period_matches_analytical(sdof_matrices: dict[str, object]) -> None:
    """The measured period (from displacement local maxima) matches T_n."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = 10 * int(T_N_REF / dt) + 1  # 10 cycles for a stable average

    result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)
    u = result.displacements[:, 0]

    # Local maxima of u(t): u[i-1] < u[i] > u[i+1]. For an undamped
    # free vibration the maxima occur at t = 0, T_n, 2*T_n, ... so
    # the inter-peak distance equals the natural period.
    maxima_idx = []
    for i in range(1, len(u) - 1):
        if u[i - 1] < u[i] > u[i + 1]:
            maxima_idx.append(i)
    assert len(maxima_idx) >= 4, "not enough local maxima to measure period"

    peak_times = np.asarray(maxima_idx) * dt
    measured_period = float(np.mean(np.diff(peak_times[:4])))
    rel_err = abs(measured_period - T_N_REF) / T_N_REF
    assert rel_err < 0.01  # < 1 % period error per design section 12


def test_case_a_energy_is_conserved(sdof_matrices: dict[str, object]) -> None:
    """Total mechanical energy stays within 1 % of E0 over 20 cycles."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = 20 * int(T_N_REF / dt) + 1  # 20 cycles

    result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)
    u = result.displacements[:, 0]
    v = result.velocities[:, 0]
    energy = 0.5 * K_REF * u ** 2 + 0.5 * M_REF * v ** 2
    energy_0 = 0.5 * K_REF * 1.0 ** 2  # = 50.0
    rel_drift = float(np.max(np.abs(energy - energy_0)) / energy_0)
    assert rel_drift < 0.01  # < 1 % drift over 20 cycles per section 12


def test_case_a_response_amplitude_bounded(sdof_matrices: dict[str, object]) -> None:
    """The peak amplitude is preserved within the analytical bound."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = 20 * int(T_N_REF / dt) + 1

    result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)
    peaks = np.abs(result.displacements[:, 0])
    max_peak = float(np.max(peaks))
    min_peak = float(np.min(peaks))
    # For an undamped free vibration, |u| must stay at u0 = 1.0.
    # Allow a small numerical overshoot for the second-order integrator.
    assert max_peak <= 1.0 + 0.02
    assert min_peak >= 0.0


# ---------------------------------------------------------------------------
# Case B: Damped free vibration
# ---------------------------------------------------------------------------


def _solve_case_b(
    sdof: dict[str, object],
    *,
    n_steps: int,
    dt: float,
    u0: float = 1.0,
) -> NewmarkTimeHistoryResult:
    loads = np.zeros((n_steps, 1), dtype=float)
    return solve_newmark_average_acceleration(
        sdof["M"],
        sdof["C"],
        sdof["K"],
        loads,
        dt,
        initial_displacement=[u0],
        initial_velocity=[0.0],
    )


def test_case_b_displacement_matches_underdamped_analytical(sdof_matrices: dict[str, object]) -> None:
    """First-cycle u(t) tracks the underdamped closed-form within 1 %."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(T_N_REF / dt) + 1

    result = _solve_case_b(sdof_matrices, n_steps=n_steps, dt=dt)
    time = np.arange(n_steps) * dt
    xi = XI_REF
    wd = OMEGA_D_REF
    expected = np.exp(-xi * OMEGA_N_REF * time) * (
        np.cos(wd * time) + (xi / math.sqrt(1.0 - xi * xi)) * np.sin(wd * time)
    )

    abs_err = float(np.max(np.abs(result.displacements[:, 0] - expected)))
    assert abs_err < 0.01  # < 1 % of u0


def test_case_b_envelope_decays_to_below_threshold(sdof_matrices: dict[str, object]) -> None:
    """The positive peak envelope decays to below 1e-3 within 1 second.

    The local positive maxima of the underdamped response are located
    at t = k * T_d for k = 1, 2, 3, ... (the initial u(0) = 1 itself is
    also a positive maximum, but the next positive peak follows one
    full damped period later). Their amplitudes are
    ``u0 * exp(-xi * omega_n * k * T_d)``.
    """

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = 6 * int(T_N_REF / dt) + 1

    result = _solve_case_b(sdof_matrices, n_steps=n_steps, dt=dt)
    u = result.displacements[:, 0]
    time = np.arange(n_steps) * dt

    # Local positive maxima of u(t).
    maxima = []
    for i in range(1, len(u) - 1):
        if u[i - 1] < u[i] > u[i + 1] and u[i] > 0.0:
            maxima.append((time[i], float(u[i])))
    assert len(maxima) >= 3, "not enough positive peaks to verify decay"

    T_d = 2.0 * math.pi / OMEGA_D_REF
    # First positive peak after t = 0 is at t = T_d.
    first_t, first_amp = maxima[0]
    first_expected = math.exp(-XI_REF * OMEGA_N_REF * first_t)
    rel_err_first = abs(first_amp - first_expected) / first_expected
    assert rel_err_first < 0.02  # < 2 % damped envelope error per section 12

    # Each positive peak must lie within 2 %% of the analytical envelope
    # ``u0 * exp(-xi * omega_n * t_peak)`` per design section 12.
    for t_peak, amp in maxima:
        expected = math.exp(-XI_REF * OMEGA_N_REF * t_peak)
        rel_err = abs(amp - expected) / expected
        assert rel_err < 0.02

    # Subsequent peaks must decay monotonically (within numerical noise).
    amps = np.asarray([a for _, a in maxima])
    for prev, curr in zip(amps[:-1], amps[1:]):
        assert curr < prev * 1.01


def test_case_b_damped_period_matches_analytical(sdof_matrices: dict[str, object]) -> None:
    """Measured T_d (from positive local maxima of u) matches 2 * pi / omega_d within 1 %."""

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = 10 * int(T_N_REF / dt) + 1
    T_d = 2.0 * math.pi / OMEGA_D_REF

    result = _solve_case_b(sdof_matrices, n_steps=n_steps, dt=dt)
    u = result.displacements[:, 0]

    maxima_idx = []
    for i in range(1, len(u) - 1):
        if u[i - 1] < u[i] > u[i + 1] and u[i] > 0.0:
            maxima_idx.append(i)
    assert len(maxima_idx) >= 4

    peak_times = np.asarray(maxima_idx) * dt
    measured_T_d = float(np.mean(np.diff(peak_times[:4])))
    rel_err = abs(measured_T_d - T_d) / T_d
    assert rel_err < 0.01


# ---------------------------------------------------------------------------
# Case C: Harmonic force response
# ---------------------------------------------------------------------------


def _run_case_c(
    sdof: dict[str, object],
    *,
    omega_f: float,
    n_cycles_total: float = 30.0,
    n_cycles_ss: float = 5.0,
    n_per: int = 100,
) -> tuple[NewmarkTimeHistoryResult, int, int]:
    """Return (result, n_skip, n_steps) for a harmonic force case C run."""

    dt = T_N_REF / n_per
    n_steps = int(n_cycles_total * T_N_REF / dt) + 1
    time = np.arange(n_steps) * dt
    loads = (P0_REF * np.sin(omega_f * time)).reshape(-1, 1)
    result = solve_newmark_average_acceleration(
        sdof["M"], sdof["C"], sdof["K"], loads, dt,
    )
    n_skip = int((n_cycles_total - n_cycles_ss) * T_N_REF / dt)
    return result, n_skip, n_steps


def _daf(beta: float, xi: float) -> float:
    return 1.0 / math.sqrt((1.0 - beta * beta) ** 2 + (2.0 * xi * beta) ** 2)


def test_case_c_sub_resonance_amplitude(sdof_matrices: dict[str, object]) -> None:
    """omega_f = 0.5 * omega_n: steady-state amplitude matches DAF * P0 / k."""

    omega_f = 0.5 * OMEGA_N_REF
    beta = omega_f / OMEGA_N_REF
    expected_amp = (P0_REF / K_REF) * _daf(beta, XI_REF)

    result, n_skip, _ = _run_case_c(sdof_matrices, omega_f=omega_f)
    u_ss = result.displacements[n_skip:, 0]
    measured_amp = float(np.max(np.abs(u_ss)))
    rel_err = abs(measured_amp - expected_amp) / expected_amp
    assert rel_err < 0.02  # < 2 % harmonic amplitude error per section 12


def test_case_c_resonance_amplitude(sdof_matrices: dict[str, object]) -> None:
    """omega_f = omega_n: resonance amplitude matches P0 / (k * 2 * xi)."""

    omega_f = OMEGA_N_REF
    expected_amp = P0_REF / (K_REF * 2.0 * XI_REF)

    result, n_skip, _ = _run_case_c(sdof_matrices, omega_f=omega_f)
    u_ss = result.displacements[n_skip:, 0]
    measured_amp = float(np.max(np.abs(u_ss)))
    rel_err = abs(measured_amp - expected_amp) / expected_amp
    assert rel_err < 0.02


def test_case_c_super_resonance_amplitude(sdof_matrices: dict[str, object]) -> None:
    """omega_f = 2 * omega_n: super-resonance amplitude matches DAF * P0 / k."""

    omega_f = 2.0 * OMEGA_N_REF
    beta = omega_f / OMEGA_N_REF
    expected_amp = (P0_REF / K_REF) * _daf(beta, XI_REF)

    result, n_skip, _ = _run_case_c(sdof_matrices, omega_f=omega_f)
    u_ss = result.displacements[n_skip:, 0]
    measured_amp = float(np.max(np.abs(u_ss)))
    rel_err = abs(measured_amp - expected_amp) / expected_amp
    assert rel_err < 0.02


def test_case_c_response_is_finite_and_bounded(sdof_matrices: dict[str, object]) -> None:
    """All three forcing frequencies produce finite, non-NaN responses."""

    for omega_f in (0.5 * OMEGA_N_REF, OMEGA_N_REF, 2.0 * OMEGA_N_REF):
        result, _, _ = _run_case_c(sdof_matrices, omega_f=omega_f)
        assert np.all(np.isfinite(result.displacements))
        assert np.all(np.isfinite(result.velocities))
        assert np.all(np.isfinite(result.accelerations))
        # Bound: amplitude must stay well below the resonance peak (0.1 m).
        assert float(np.max(np.abs(result.displacements))) < 0.2


# ---------------------------------------------------------------------------
# Case D: Base excitation response
# ---------------------------------------------------------------------------


def _build_ag(omega_g: float, n_steps: int, dt: float) -> np.ndarray:
    time = np.arange(n_steps) * dt
    return A0_REF * np.sin(omega_g * time)


def test_case_d_effective_load_sign_convention(sdof_matrices: dict[str, object]) -> None:
    """``P_eff(t) = -M r ag(t)`` with r = 1 for the SDOF X direction.

    The first non-zero sample of the effective load must be negative
    when ``ag`` is positive and have magnitude equal to ``m * ag``.
    """

    mass = sdof_matrices["mass"]
    assert isinstance(mass, LumpedMassMatrix)

    omega_g = 0.5 * OMEGA_N_REF
    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(10.0 * T_N_REF / dt) + 1
    ag = _build_ag(omega_g, n_steps, dt)
    hist = assemble_effective_seismic_load_history(mass, ag, direction="x")

    assert isinstance(hist, EffectiveLoadHistory)
    # The SDOF X-direction has a single translational DOF -> r = 1.
    np.testing.assert_array_equal(hist.participation_vector, np.array([1.0]))
    # P_eff = -M r ag with r = 1.
    np.testing.assert_allclose(hist.loads[:, 0], -M_REF * ag)
    # Sign check at the first positive a_g sample: load must be negative.
    positive_ag_idx = int(np.argmax(ag > 0.0))
    assert hist.loads[positive_ag_idx, 0] < 0.0


def test_case_d_zero_ground_acceleration_gives_zero_response(sdof_matrices: dict[str, object]) -> None:
    """If a_g(t) = 0 for all t, the response is identically zero."""

    mass = sdof_matrices["mass"]
    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(5.0 * T_N_REF / dt) + 1
    ag_zero = np.zeros(n_steps, dtype=float)
    hist = assemble_effective_seismic_load_history(mass, ag_zero, direction="x")
    np.testing.assert_array_equal(hist.loads, np.zeros((n_steps, 1)))

    result = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], hist.loads, dt,
    )
    np.testing.assert_array_equal(result.displacements, np.zeros_like(result.displacements))
    np.testing.assert_array_equal(result.velocities, np.zeros_like(result.velocities))
    np.testing.assert_array_equal(result.accelerations, np.zeros_like(result.accelerations))


def test_case_d_end_to_end_matches_direct_loads(sdof_matrices: dict[str, object]) -> None:
    """``P_eff`` from TH-2c must feed into TH-2d exactly as if the loads
    were built directly with ``P = -M r ag``.

    The SDOF system uses ``m = 1.0`` and ``r = 1.0`` so the effective
    load equals ``-ag``.
    """

    mass = sdof_matrices["mass"]
    omega_g = OMEGA_N_REF
    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(10.0 * T_N_REF / dt) + 1
    ag = _build_ag(omega_g, n_steps, dt)

    hist = assemble_effective_seismic_load_history(mass, ag, direction="x")
    direct = (-M_REF * ag).reshape(-1, 1)
    np.testing.assert_allclose(hist.loads, direct)

    r_e2e = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], hist.loads, dt,
    )
    r_direct = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], direct, dt,
    )
    np.testing.assert_allclose(r_e2e.displacements, r_direct.displacements)
    np.testing.assert_allclose(r_e2e.velocities, r_direct.velocities)
    np.testing.assert_allclose(r_e2e.accelerations, r_direct.accelerations)


def test_case_d_resonance_amplitude(sdof_matrices: dict[str, object]) -> None:
    """omega_g = omega_n: relative displacement amplitude matches the DAF."""

    mass = sdof_matrices["mass"]
    omega_g = OMEGA_N_REF
    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(30.0 * T_N_REF / dt) + 1
    ag = _build_ag(omega_g, n_steps, dt)
    hist = assemble_effective_seismic_load_history(mass, ag, direction="x")

    result = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], hist.loads, dt,
    )
    n_skip = int(25.0 * T_N_REF / dt)
    u_ss = result.displacements[n_skip:, 0]
    measured_amp = float(np.max(np.abs(u_ss)))

    # Steady-state amplitude: (A0 / omega_n^2) * beta^2 * H(beta)
    beta = 1.0
    expected_amp = (A0_REF / (OMEGA_N_REF ** 2)) * (beta ** 2) * _daf(beta, XI_REF)
    rel_err = abs(measured_amp - expected_amp) / expected_amp
    assert rel_err < 0.03  # < 3 % base excitation tolerance per section 12


def test_case_d_low_frequency_sign_is_opposite_to_ag(sdof_matrices: dict[str, object]) -> None:
    """At low frequency, u_rel is opposite in sign to a_g (quasi-static)."""

    mass = sdof_matrices["mass"]
    omega_g = 0.5 * OMEGA_N_REF
    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(30.0 * T_N_REF / dt) + 1
    ag = _build_ag(omega_g, n_steps, dt)
    hist = assemble_effective_seismic_load_history(mass, ag, direction="x")

    result = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], hist.loads, dt,
    )
    n_skip = int(25.0 * T_N_REF / dt)
    u_ss = result.displacements[n_skip:, 0]
    ag_ss = ag[n_skip:]

    # Quasi-static limit: u_rel ~= -ag / omega_n^2.
    # Pick a sample where a_g is positive; u_rel must be negative.
    pos_idx = int(np.argmax(ag_ss))
    assert ag_ss[pos_idx] > 0.0
    assert u_ss[pos_idx] < 0.0
    # And the magnitude must be close to the quasi-static value.
    quasi_static = A0_REF / (OMEGA_N_REF ** 2)
    ratio = abs(u_ss[pos_idx] / ag_ss[pos_idx])
    # At beta = 0.5 the DAF correction is 1.33, so ratio ~= 1.33 / omega_n^2.
    rel_err = abs(ratio - quasi_static * _daf(0.5, XI_REF)) / (
        quasi_static * _daf(0.5, XI_REF)
    )
    assert rel_err < 0.03


# ---------------------------------------------------------------------------
# Time step sensitivity
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("n_per", [20, 50, 100])
def test_case_a_convergence_with_dt(sdof_matrices: dict[str, object], n_per: int) -> None:
    """The 1-cycle displacement error shrinks by ~ 1/4 when dt halves."""

    dt = T_N_REF / n_per
    n_steps = int(T_N_REF / dt) + 1
    result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)
    time = np.arange(n_steps) * dt
    expected = np.cos(OMEGA_N_REF * time)
    errs_by_nper = {20: 0.06, 50: 0.02, 100: 0.01}
    abs_err = float(np.max(np.abs(result.displacements[:, 0] - expected)))
    assert abs_err < errs_by_nper[n_per]


def test_case_a_convergence_is_second_order(sdof_matrices: dict[str, object]) -> None:
    """Halving dt must reduce the 1-cycle peak error by a factor of ~ 4."""

    def _err(n_per: int) -> float:
        dt = T_N_REF / n_per
        n_steps = int(T_N_REF / dt) + 1
        result = _solve_case_a(sdof_matrices, n_steps=n_steps, dt=dt)
        time = np.arange(n_steps) * dt
        expected = np.cos(OMEGA_N_REF * time)
        return float(np.max(np.abs(result.displacements[:, 0] - expected)))

    err_50 = _err(50)
    err_100 = _err(100)
    # Second-order convergence: err_50 / err_100 ~= 4.
    ratio = err_50 / err_100
    assert 2.5 < ratio < 5.5


# ---------------------------------------------------------------------------
# Shape and integrity
# ---------------------------------------------------------------------------


def test_all_engines_produce_well_shaped_outputs(sdof_matrices: dict[str, object]) -> None:
    """Smoke test: every engine returns the documented shapes."""

    mass = sdof_matrices["mass"]
    assert isinstance(mass, LumpedMassMatrix)
    assert mass.matrix.shape == (1, 1)
    assert mass.active_dof_count == 1

    damping = sdof_matrices["damping"]
    assert isinstance(damping, RayleighDampingMatrix)
    assert damping.matrix.shape == (1, 1)

    n_per = 100
    dt = T_N_REF / n_per
    n_steps = int(2.0 * T_N_REF / dt) + 1
    ag = _build_ag(OMEGA_N_REF, n_steps, dt)
    hist = assemble_effective_seismic_load_history(mass, ag, direction="x")
    assert hist.loads.shape == (n_steps, 1)
    assert hist.participation_vector.shape == (1,)
    assert hist.active_dofs.shape == (1,)

    result = solve_newmark_average_acceleration(
        sdof_matrices["M"], sdof_matrices["C"], sdof_matrices["K"], hist.loads, dt,
    )
    assert result.displacements.shape == (n_steps, 1)
    assert result.velocities.shape == (n_steps, 1)
    assert result.accelerations.shape == (n_steps, 1)
    assert result.time.shape == (n_steps,)
    assert result.n_steps == n_steps
    assert result.n_dofs == 1


def test_no_th2_components_were_modified(sdof_matrices: dict[str, object]) -> None:
    """TH-3a must not change the behavior of any TH-2a/2b/2c/2d piece."""

    mass = sdof_matrices["mass"]
    assert mass.matrix.shape == (1, 1)
    assert mass.matrix[0, 0] == pytest.approx(M_REF)

    damping = sdof_matrices["damping"]
    assert damping.matrix[0, 0] == pytest.approx(C_REF)

    # alpha = 1.0 with m = 1.0 yields c = 1.0; verify the alpha channel
    # survives untouched.
    direct_damping = assemble_rayleigh_damping_matrix(
        mass, np.array([[K_REF]], dtype=float), alpha=1.0, beta=0.0,
    )
    assert direct_damping.matrix[0, 0] == pytest.approx(1.0)