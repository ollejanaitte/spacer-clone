# Time History SDOF Verification Design

## 1. Purpose

This document defines the verification design for validating the future Linear Time History Analysis implementation described in `docs/design/time-history-analysis.md`.

The purpose is to provide an objective, reproducible, and quantitative check that the future Newmark-beta time integrator and the surrounding dynamics kernel produce correct response histories for simple single-degree-of-freedom (SDOF) systems before the implementation is used on real multi-degree-of-freedom (MDOF) models.

The document is a verification design, not an implementation document. It specifies:

- The SDOF reference systems and benchmark cases that the future implementation must pass.
- The analytical or reference values against which the implementation is compared.
- The numerical acceptance tolerances and the time-step sensitivity behavior that must be observed.
- The fixture layout and the future automated test cases that will exercise the implementation.

It does not specify class names, module boundaries, or function signatures; those are decided during implementation, and the source code is expected to follow `docs/development/language-policy.md`.

The motivation for restricting MVP verification to SDOF is:

- SDOF systems have closed-form analytical solutions for undamped free vibration, damped free vibration, harmonic forcing, and base excitation.
- Errors in the time integrator, the effective load assembly, the damping model, and the initial-condition handling are all observable in SDOF output without interference from mode coupling or constraint handling.
- A passing SDOF suite is a necessary (though not sufficient) condition for trusting MDOF results.
- SDOF benchmarks are cheap to run and can be embedded in CI as a fast regression gate.

## 2. Relationship to Time History Analysis Design

This document is a child of the parent feature design:

- `docs/design/time-history-analysis.md` defines the Newmark-beta linear time integration, the Rayleigh damping model, the input data model, the result model, and the future nonlinear extension.
- The present document (`docs/design/time-history-sdof-verification.md`) defines how the linear portion of that design is verified before it is exposed to MDOF models.

In particular, this document verifies:

- The Newmark-beta linear time integrator with the average acceleration method (`beta = 1/4`, `gamma = 1/2`) defined in the parent design.
- The effective load assembly for base excitation, `-M * r * a_g(t)`, including its sign convention.
- The Rayleigh damping assembly `C = alpha * M + beta * K` for the SDOF special case `c = 2 * xi * m * omega_n`.
- The initial condition handling for `u(0) = u0`, `u_dot(0) = v0`, `u_ddot(0) = u_ddot0`.
- The envelope (maximum / minimum) extraction defined in the result model, at least for the SDOF scalar case.

The nonlinear extension of the parent design is out of scope for this document. The SDOF verification will, however, use the same `TimeStepper` interface boundary that the parent design reserves for the future nonlinear stepper, so that nonlinear verification can later reuse the same fixtures with a different stepper.

## 3. Verification Scope

### Supported Verification Scope

- Linear elastic SDOF systems with a single displacement degree of freedom.
- Free vibration with zero external force.
- Harmonic external force excitation.
- Base excitation by prescribed ground acceleration.
- Damped and undamped cases.
- Fixed time step Newmark-beta integration with the average acceleration method (`beta = 1/4`, `gamma = 1/2`).
- Time steps `dt` chosen as fractions of the natural period `T_n` (see section 10).
- Lumped mass formulation (`M = m`, scalar).
- Rayleigh damping in the SDOF special case `c = 2 * xi * m * omega_n`.
- Comparison against analytical closed-form solutions and high-resolution numerical references.

### Out of Scope

- MDOF systems. The MDOF verification design is a separate document and is defined after the SDOF suite passes.
- Material nonlinearity, geometric nonlinearity, plastic hinges, fiber sections.
- Nonlinear bearings, isolators, and dampers.
- Contact and friction.
- Soil-structure interaction and foundation impedance.
- Multi-support excitation with spatially varying ground motion.
- Adaptive time stepping or error-controlled stepping. The MVP uses a fixed `dt`.
- Generalized-alpha, HHT, Wilson-theta, central difference, explicit methods. The SDOF suite verifies only the Newmark-beta average acceleration method selected by the parent design.
- GPU or distributed solver.
- Performance and load tests. The SDOF suite verifies correctness only.

## 4. Governing Equation

The SDOF equation of motion for the relative displacement `u(t)` of a mass `m` attached to a fixed base through a spring of stiffness `k` and a viscous damper of coefficient `c`, with external force `p(t)` applied at the mass, is:

```
m * u_ddot(t) + c * u_dot(t) + k * u(t) = p(t)
```

For base excitation by ground acceleration `a_g(t)` in the direction of the SDOF degree of freedom, the absolute acceleration of the mass is `u_ddot_abs(t) = u_ddot(t) + a_g(t)`. Newton second law on the relative coordinate yields:

```
m * u_ddot(t) + c * u_dot(t) + k * u(t) = -m * a_g(t)
```

The variables are:

| Symbol | Meaning | Unit |
| --- | --- | --- |
| `m` | Lumped mass at the SDOF degree of freedom. | kg |
| `c` | Viscous damping coefficient. | N * s / m |
| `k` | Linear elastic stiffness. | N / m |
| `u(t)` | Relative displacement of the mass with respect to the moving base. | m |
| `u_dot(t)` | Relative velocity. | m / s |
| `u_ddot(t)` | Relative acceleration. | m / s^2 |
| `p(t)` | External force applied at the mass (zero in pure ground motion cases). | N |
| `a_g(t)` | Ground acceleration time history applied in the SDOF direction. | m / s^2 |

The sign convention for base excitation is the standard effective force convention: the inertial contribution of the ground motion appears on the right-hand side with a negative sign, `-m * a_g(t)`. A positive ground acceleration produces a negative relative displacement for an initially at-rest SDOF, which is consistent with the parent design.

The initial conditions are:

```
u(0) = u0
u_dot(0) = v0
u_ddot(0) = (1 / m) * (p(0) - c * v0 - k * u0)        # for external force
u_ddot(0) = (1 / m) * (-m * a_g(0) - c * v0 - k * u0) # for base excitation
```

For the benchmark cases that start from rest, `u0 = 0`, `v0 = 0`, and `u_ddot(0)` is determined by the right-hand side at `t = 0`.

## 5. Reference Parameters

A single canonical parameter set is used across all SDOF benchmark cases so that fixtures and tolerances are consistent:

| Parameter | Symbol | Value | Notes |
| --- | --- | --- | --- |
| Mass | `m` | `1.0` kg | Lumped, scalar. |
| Stiffness | `k` | `100.0` N / m | Linear elastic. |
| Damping ratio | `xi` | `0.05` (5 %) | Used in damped cases only. |
| Natural circular frequency | `omega_n` | `sqrt(k / m) = 10.0` rad / s | Derived. |
| Natural frequency | `f_n` | `omega_n / (2 * pi) ~= 1.5915` Hz | Derived. |
| Natural period | `T_n` | `2 * pi / omega_n = pi / 5 ~= 0.6283` s | Derived. |
| Critical damping coefficient | `c_cr` | `2 * m * omega_n = 20.0` N * s / m | Derived. |
| Damping coefficient (5 %) | `c` | `2 * xi * m * omega_n = 1.0` N * s / m | Used in damped cases. |

Derived quantities that are reused in later sections:

- `omega_n = 10.0` rad / s.
- `T_n = pi / 5 ~= 0.6283185` s.
- `T_n / 20 ~= 0.0314159` s.
- `T_n / 50 ~= 0.0125664` s.
- `T_n / 100 ~= 0.0062832` s.
- The damped natural frequency `omega_d = omega_n * sqrt(1 - xi^2) ~= 9.9875` rad / s, used in case B.
- The damped period `T_d = 2 * pi / omega_d ~= 0.6291` s, used in case B.

These derived values are reproduced in the fixture files so that the implementation can use them as ground truth without recomputing.

## 6. Benchmark Case A: Undamped Free Vibration

### Setup

- `xi = 0.0`, so `c = 0.0`.
- Initial displacement `u(0) = u0 = 1.0` m.
- Initial velocity `u_dot(0) = v0 = 0.0` m / s.
- External force `p(t) = 0.0` for all `t >= 0`.
- Duration: `20 * T_n ~= 12.566` s (20 cycles of free vibration).
- Time step: `dt = T_n / 100` for the reference run; `dt = T_n / 20` and `dt = T_n / 50` for the convergence runs.

### Reference Analytical Solution

For the undamped SDOF with `u(0) = u0` and `u_dot(0) = 0`:

```
u(t) = u0 * cos(omega_n * t)
u_dot(t) = -u0 * omega_n * sin(omega_n * t)
u_ddot(t) = -u0 * omega_n^2 * cos(omega_n * t)
```

The total energy `E = (1/2) * k * u(t)^2 + (1/2) * m * u_dot(t)^2 = (1/2) * k * u0^2` is conserved exactly. For `u0 = 1.0` and `k = 100.0`, `E = 50.0`.

### Verification Checks

- Displacement time history matches `u0 * cos(omega_n * t)` at every reported sample.
- The measured natural period (zero crossings of `u_dot(t)`) matches `T_n = pi / 5` to within the period tolerance in section 12.
- The peak amplitude is preserved to within the amplitude tolerance across the full 20 cycles.
- The phase of the response is correct (peak displacement at `t = 0`, zero crossing at `t = T_n / 4`, minimum at `t = T_n / 2`).
- Total energy drift over 20 cycles is below the energy drift tolerance in section 12 when `dt <= T_n / 100`.

## 7. Benchmark Case B: Damped Free Vibration

### Setup

- `xi = 0.05`, so `c = 2 * xi * m * omega_n = 1.0` N * s / m.
- Initial displacement `u(0) = u0 = 1.0` m.
- Initial velocity `u_dot(0) = v0 = 0.0` m / s.
- External force `p(t) = 0.0` for all `t >= 0`.
- Duration: `20 * T_n` s.
- Time step: `dt = T_n / 100` for the reference run.

### Reference Analytical Solution

For the underdamped SDOF (`xi < 1`) with `u(0) = u0` and `u_dot(0) = 0`:

```
omega_d = omega_n * sqrt(1 - xi^2)
u(t) = u0 * exp(-xi * omega_n * t) * (cos(omega_d * t) + (xi / sqrt(1 - xi^2)) * sin(omega_d * t))
```

The amplitude envelope is `u0 * exp(-xi * omega_n * t)`. The logarithmic decrement between successive peaks separated by one period `T_d` is:

```
delta = (2 * pi * xi) / sqrt(1 - xi^2) ~= 0.3142    # for xi = 0.05
```

The first positive peak occurs at `t = T_d ~= 0.6291` s, with amplitude `u0 * exp(-xi * omega_n * T_d) ~= 0.9603`.

### Verification Checks

- The decaying displacement envelope matches `u0 * exp(-xi * omega_n * t)` to within the damped envelope tolerance in section 12.
- The damped period `T_d` measured from zero crossings matches the analytical value to within the period tolerance.
- The logarithmic decrement measured from successive peaks matches the analytical `delta = 0.3142` to within the envelope tolerance.
- The peak displacement in the first cycle matches the analytical first peak `0.9603` to within the peak displacement tolerance.
- The response decays to below `1e-3` m within `T_n` seconds, consistent with the analytical envelope.

## 8. Benchmark Case C: Harmonic Force Response

### Setup

- `xi = 0.05`, `c = 1.0`.
- Initial conditions: `u(0) = 0.0`, `u_dot(0) = 0.0` (the system starts from rest).
- External force: `p(t) = P0 * sin(omega_f * t)` with `P0 = 1.0` N.
- Forcing frequencies: `omega_f in {0.5 * omega_n, 1.0 * omega_n, 2.0 * omega_n}`.
- Duration: `30 * T_n` s, which is long enough for the transient to die out and the steady state to be observed.
- Time step: `dt = T_n / 100` for the reference run.

### Reference Analytical Solution

The steady-state amplitude ratio (dynamic amplification factor, DAF) for a damped SDOF is:

```
beta = omega_f / omega_n
H(beta) = 1 / sqrt((1 - beta^2)^2 + (2 * xi * beta)^2)
u_steady(t) = (P0 / k) * H(beta) * sin(omega_f * t - phi)
tan(phi) = (2 * xi * beta) / (1 - beta^2)
```

For `xi = 0.05`, `k = 100`, `P0 = 1.0`:

| `omega_f` | `beta` | `H(beta)` | `u_steady` amplitude |
| --- | --- | --- | --- |
| `0.5 * omega_n` | 0.5 | `1 / sqrt(0.75^2 + 0.05^2) = 1.3298` | `0.01330` m |
| `1.0 * omega_n` | 1.0 | `1 / (2 * xi) = 10.0` | `0.1000` m |
| `2.0 * omega_n` | 2.0 | `1 / sqrt(9 + 0.04) = 0.3322` | `0.003322` m |

### Verification Checks

- The transient decays as expected for `xi = 0.05` (envelope factor `exp(-xi * omega_n * t)`).
- The steady-state amplitude in the last `5 * T_n` seconds of the analysis matches the analytical amplitude to within the harmonic amplitude tolerance in section 12.
- The phase lag `phi` between `p(t)` and `u(t)` in steady state matches the analytical `phi` to within `0.05` rad.
- The resonance case (`omega_f = omega_n`) produces a peak amplitude close to `P0 / (k * 2 * xi) = 0.1` m, matching the analytical resonance amplification within tolerance.
- The sub-resonance case (`omega_f = 0.5 * omega_n`) and the super-resonance case (`omega_f = 2.0 * omega_n`) produce amplitudes consistent with the DAF table above.

## 9. Benchmark Case D: Base Excitation

### Setup

- `xi = 0.05`, `c = 1.0`.
- Initial conditions: `u(0) = 0.0`, `u_dot(0) = 0.0`.
- Ground acceleration: `a_g(t) = A0 * sin(omega_g * t)` with `A0 = 1.0` m / s^2.
- Ground motion frequencies: `omega_g in {0.5 * omega_n, 1.0 * omega_n, 2.0 * omega_n}`.
- Duration: `30 * T_n` s.
- Time step: `dt = T_n / 100` for the reference run.

### Reference Analytical Solution

The relative displacement steady-state response of an SDOF to base excitation is, in closed form:

```
beta = omega_g / omega_n
H_rel(beta) = 1 / sqrt((1 - beta^2)^2 + (2 * xi * beta)^2)
u_rel_steady(t) = -(A0 / omega_n^2) * beta^2 * H_rel(beta) * sin(omega_g * t - phi)
```

The pseudo-acceleration (defined for response spectrum compatibility) is `a_ps = omega_n^2 * u_rel`. The absolute acceleration of the mass is `u_ddot_abs = u_ddot + a_g`, which is the quantity typically compared with a response spectrum.

For `xi = 0.05`, `omega_n = 10`, `A0 = 1.0`:

| `omega_g` | `beta` | `H_rel(beta)` | `u_rel` steady-state amplitude |
| --- | --- | --- | --- |
| `0.5 * omega_n` | 0.5 | `1.3298` | `0.003325` m |
| `1.0 * omega_n` | 1.0 | `10.0` | `0.01000` m |
| `2.0 * omega_n` | 2.0 | `0.3322` | `0.001328` m |

### Verification Checks

- The relative displacement response is opposite in sign to `a_g(t)` at low frequency, consistent with the `-m * a_g(t)` sign convention.
- The steady-state amplitude in the last `5 * T_n` seconds matches the analytical amplitude to within the base excitation tolerance in section 12.
- The pseudo-acceleration `a_ps = omega_n^2 * u_rel` matches the analytical prediction within the same tolerance.
- The resonance case (`omega_g = omega_n`) produces a relative displacement close to `-A0 / (2 * xi * omega_n^2) = -0.01` m, matching the analytical resonance response within tolerance.
- The high-resolution reference solution for each frequency is also stored in the fixture and used as a tolerance envelope, not just the analytical closed form.

## 10. Time Step Sensitivity

The same benchmark case is rerun with three different fixed time steps to confirm second-order convergence of the Newmark-beta average acceleration method:

| Label | `dt` | `dt / T_n` | Role |
| --- | --- | --- | --- |
| Coarse | `T_n / 20` | 0.05 | Sanity check, smoke test. |
| Medium | `T_n / 50` | 0.02 | Production-like. |
| Fine | `T_n / 100` | 0.01 | Reference run. |

### Verification Checks

- The peak displacement error in cases A, B, C, and D decreases by approximately a factor of four (or better) when `dt` is halved, consistent with the second-order accuracy of the Newmark-beta average acceleration method.
- The natural period error scales with `dt^2` in case A.
- The total energy drift in case A scales with `dt^2` and is below the energy drift tolerance when `dt = T_n / 100`.
- A coarse time step of `dt = T_n / 20` is allowed to emit a warning (for example, `COARSE_TIME_STEP`) but must still pass the absolute tolerance. The MVP does not require the coarse run to match the fine run; it only requires convergence to the fine run as `dt` decreases.

### Warning Threshold

The implementation must emit a warning (not a fatal error) when the time step is coarser than `T_n / 50` for any mode of interest. In the SDOF verification, the warning fires when `dt > T_n / 50`.

## 11. Numerical Stability

The Newmark-beta average acceleration method (`beta = 1/4`, `gamma = 1/2`) is unconditionally stable for linear systems. This means that, for a stable linear SDOF or MDOF system, the time integrator does not grow spurious high-frequency oscillations regardless of the size of `dt`, as long as the underlying system is stable.

Unconditional stability does not mean unlimited accuracy. The truncation error in the time integration is of order `O(dt^2)` for the average acceleration method. As `dt` grows, the computed response remains bounded but becomes increasingly inaccurate. The implementation must therefore:

- Never produce a NaN or Inf in any of the SDOF benchmark cases for any `dt` up to `T_n / 20`.
- Not crash on coarse time steps; instead, report a warning and continue.
- Pass the energy drift check in case A only when `dt <= T_n / 100`. Coarser time steps are allowed to drift but must not fail the boundedness check.

The unconditional stability property is also the reason why the future nonlinear extension of the parent design will continue to use the same `TimeStepper` interface: nonlinear stability is governed by the Newton-Raphson iteration, not by the integrator itself.

## 12. Acceptance Criteria

The implementation is considered correct with respect to this verification design when all of the following tolerances are satisfied for the canonical parameter set in section 5 and the time step `dt = T_n / 100`:

| Quantity | Tolerance | Source |
| --- | --- | --- |
| Natural period error in case A | less than `1 %` | Period measured from zero crossings vs. `T_n`. |
| Peak displacement error in case A (free undamped) | less than `1 %` | vs. `u0 = 1.0`. |
| Energy drift in case A over 20 cycles | less than `1 %` of initial energy `E = 50.0` | when `dt <= T_n / 100`. |
| Damped envelope error in case B | less than `2 %` | `u0 * exp(-xi * omega_n * t)` vs. computed envelope. |
| Damped period error in case B | less than `1 %` | `T_d` measured from zero crossings. |
| Harmonic steady-state amplitude error in case C | less than `2 %` | vs. `(P0 / k) * H(beta)` for each `omega_f`. |
| Harmonic phase lag error in case C | less than `0.05` rad | vs. analytical `phi`. |
| Base excitation peak response error in case D | less than `3 %` | vs. analytical and high-resolution numerical reference. |
| Sign convention in case D | `u_rel` opposite in sign to `a_g` at low frequency | qualitative, exact match required. |
| Time-step convergence rate | approximately `O(dt^2)` for peak displacement | halving `dt` reduces error by approximately 4x. |

Boundedness requirements (must always hold):

- No NaN, no Inf, no negative energy in any of cases A through D for any `dt <= T_n / 20`.
- The relative displacement `u_rel(t)` is bounded by `2 * |u0|` in case A and by the analytical envelope in case B for all `t`.

Failure of any single acceptance criterion is a blocker. The test suite must report a clear diagnostic that identifies which case and which criterion failed.

## 13. Proposed Test Data Files

The verification suite consumes JSON fixture files that fully describe each benchmark case. No binary data is used. The proposed file layout, to be created in a future implementation phase, is:

- `backend/tests/fixtures/time_history/sdof_free_undamped.json`
  - Parameters: `m`, `k`, `xi = 0.0`, `u0 = 1.0`, `v0 = 0.0`, `p(t) = 0`, `duration = 20 * T_n`, `dt`.
  - Expected time series: `time`, `u`, `u_dot`, `u_ddot` at the sample points.
  - Expected energy: `E = 50.0`, tolerance `1 %`.

- `backend/tests/fixtures/time_history/sdof_free_damped.json`
  - Parameters: `m`, `k`, `xi = 0.05`, `u0 = 1.0`, `v0 = 0.0`, `p(t) = 0`, `duration`, `dt`.
  - Expected envelope series: `time`, `envelope_positive`, `envelope_negative`.
  - Expected first peak time `t_peak ~= T_d`, expected first peak amplitude `0.9603`.

- `backend/tests/fixtures/time_history/sdof_harmonic_force.json`
  - Parameters: `m`, `k`, `xi`, `u0 = 0`, `v0 = 0`, `P0 = 1.0`.
  - For each `omega_f` in `{0.5, 1.0, 2.0} * omega_n`: duration, `dt`, expected steady-state amplitude, expected phase lag `phi`.

- `backend/tests/fixtures/time_history/sdof_base_excitation.json`
  - Parameters: `m`, `k`, `xi`, `u0 = 0`, `v0 = 0`, `A0 = 1.0`.
  - For each `omega_g` in `{0.5, 1.0, 2.0} * omega_n`: duration, `dt`, expected `u_rel` amplitude, expected `a_ps` amplitude, sign convention note.

A separate `sdof_reference_high_resolution.json` is proposed as the canonical reference for case D when the analytical closed form is considered insufficient. It stores a fine time-step reference solution (for example, `dt = T_n / 1000`) and is regenerated only when the integrator formulation changes.

No file is created in the present task. The paths above are the proposal.

## 14. Future Automated Test Plan

The verification cases in sections 6 through 9 are exercised by a backend automated test module, for example `backend/tests/verification/test_time_history_sdof.py`. The proposed test cases are:

- `test_sdof_undamped_free_vibration_period`
  - Runs case A and asserts the measured period is within the section 12 tolerance.

- `test_sdof_undamped_free_vibration_energy_conservation`
  - Runs case A and asserts the relative energy drift over 20 cycles is below the section 12 tolerance when `dt <= T_n / 100`.

- `test_sdof_damped_free_vibration_log_decrement`
  - Runs case B, extracts successive peak amplitudes, computes the logarithmic decrement, and asserts it matches the analytical `delta = 0.3142` within the section 12 tolerance.

- `test_sdof_damped_free_vibration_envelope`
  - Runs case B and asserts that the positive and negative envelopes match `u0 * exp(-xi * omega_n * t)` to within the section 12 tolerance.

- `test_sdof_harmonic_force_dynamic_amplification`
  - Runs case C for each `omega_f` in `{0.5, 1.0, 2.0} * omega_n` and asserts that the steady-state amplitude matches the DAF table within the section 12 tolerance.

- `test_sdof_harmonic_force_phase_lag`
  - Runs case C and asserts that the steady-state phase lag `phi` matches the analytical value to within `0.05` rad for each `omega_f`.

- `test_sdof_base_excitation_sign_convention`
  - Runs case D and asserts that the relative displacement is opposite in sign to `a_g(t)` at low frequency, confirming the `-m * a_g(t)` sign convention.

- `test_sdof_base_excitation_amplitude`
  - Runs case D for each `omega_g` and asserts that the relative displacement amplitude matches the analytical and high-resolution reference within the section 12 tolerance.

- `test_newmark_time_step_convergence`
  - Runs case A and case D for `dt in {T_n / 20, T_n / 50, T_n / 100}` and asserts that the peak displacement error decreases by approximately a factor of four when `dt` is halved.

- `test_newmark_boundedness`
  - Runs all four cases with `dt = T_n / 20` and asserts that the response remains finite (no NaN, no Inf) and within the analytical envelope by a generous safety margin.

The exact module path, fixture file names, and function signatures are decided during implementation. Test names above are the proposal.

## 15. Open Questions

The following unresolved questions are tracked here so that the future implementation phase can resolve them explicitly:

1. Reference value generation. Should the analytical closed-form solution be the only reference, or should every case also store a frozen numerical reference at a finer time step? Storing both makes failures easier to diagnose but increases fixture maintenance.
2. Tolerance as a function of `dt`. Should the acceptance tolerances in section 12 be relaxed for coarse time steps, or should the coarse runs be excluded from the CI gate and only used for warning emission? The current design uses absolute tolerances at `dt = T_n / 100`.
3. High-resolution reference for base excitation. The analytical DAF for case D is exact for a sinusoidal input, but real implementations may include numerical effects (initial transient, finite duration). Is the analytical closed form sufficient, or should a frozen `dt = T_n / 1000` reference be required?
4. Energy checks in CI. Total energy computation in case A is cheap and detects integrator regressions. Should the energy drift test be a hard CI gate, or should it be opt-in to keep the CI runtime short?
5. Test placement. The SDOF verification is a backend-only test in this design. Should the same fixtures also be exposed as documentation examples (for example, in `docs/verification/`) for users to run interactively? The current design leaves this out of scope.
6. Sign convention testing. The qualitative sign check in case D is exact. Is a quantitative sign test (for example, `sign(u_rel) == -sign(a_g)` at the first peak) preferred? The current design uses the qualitative form.
7. Coupling with MDOF verification. When the MDOF verification design is written, should it reuse the SDOF fixtures by treating an MDOF system as a set of decoupled SDOFs (a sanity check for modal transformation), or as a fully coupled system from the start? This affects the future MDOF document.
8. Rayleigh damping coefficient. The SDOF damping coefficient `c = 1.0` is the analytical `2 * xi * m * omega_n` value. Should the implementation be allowed to compute `c` from `(alpha, beta)` and a notional `M` and `K`, or should it accept `c` directly? The current design accepts `c` directly for SDOF.
9. Initial acceleration. The current design uses the analytical `u_ddot(0)` derived from the equation of motion. Should the implementation also accept an explicit `u_ddot(0)` override, or is the derived value always sufficient for SDOF? This is a question for the parent design.
10. Multi-support excitation. The MVP does not support spatially varying ground motion, so this is out of scope for SDOF. The question is forwarded to the MDOF verification design.
11. Mass matrix form. The SDOF suite uses a lumped mass `M = m`. Should the future implementation be required to also pass the SDOF suite with a consistent mass formulation? The current design does not require this.
12. Time units. The reference parameters use SI units throughout. Should the verification suite also test non-SI inputs (for example, US customary units), or is unit conversion a separate test layer? The current design is SI-only.
13. Reference parameter portability. The reference values in section 5 are hard-coded. Should the verification suite accept arbitrary `m` and `k` as long as `omega_n` is preserved? The current design fixes `m` and `k` for reproducibility.