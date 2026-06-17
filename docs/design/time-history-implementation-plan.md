# Time History Analysis Implementation Plan

## 1. Purpose

This document is the authoritative implementation roadmap for the future Linear Time History Analysis feature. It defines the development sequence, the milestone structure, the verification gates, and the dependencies between the technical areas that must be delivered before the feature is released.

The roadmap is a planning document. It does not implement code, does not modify the existing project schema, does not change the API, and does not change the UI. It is consumed by the future implementation phase as a single source of truth for "what gets built, in which order, with which acceptance criteria".

Relationship to existing design documents:

- `docs/design/time-history-analysis.md` defines the analysis functionality, the mathematical formulation of the Newmark-beta average acceleration method, the Rayleigh damping model, the result model, and the future nonlinear extension. This roadmap organizes the implementation of that functionality.
- `docs/design/time-history-sdof-verification.md` defines the SDOF benchmark cases and the numerical acceptance criteria that gate each milestone. This roadmap sequences those benchmark cases and binds them to the verification gates.
- `docs/design/time-history-schema.md` defines the persisted data schema. This roadmap sequences the schema integration, the loader, the saver, and the round-trip test.
- `docs/design/result-schema.md` and `docs/design/envelope-result.md` are reused for the result block. This roadmap does not duplicate their definitions; it lists the integration points.

Implementation governance:

- Each milestone has explicit exit criteria. A milestone is not "done" until every exit criterion is satisfied and signed off in the relevant verification gate.
- Each milestone has at least one verification gate. A milestone is not merged to the main branch until its gate is green.
- Backward compatibility is enforced at every milestone. No existing project file, API field, or UI label may be modified by any milestone.
- New UI text must be added to `frontend/src/i18n/ja.ts` and referenced from components; no hard-coded Japanese strings.
- New domain terms must be added to `docs/glossary.md` at the milestone that introduces them.

## 2. Overall Development Strategy

The implementation is organized along four principles that the team must follow at every step.

Incremental development. The feature is delivered in seven milestones (TH-1 through TH-7). Each milestone is small enough to fit in a single review cycle and large enough to leave the system in a consistent, buildable, testable state. The MVP cannot be delivered as a single large change; the dependency graph in section 11 makes this explicit.

Test-first approach. For every backend module added in TH-2, a unit test is added in the same change. For every SDOF benchmark case in TH-3, the test is added before the implementation is considered correct. For every UI workflow in TH-5, an end-to-end test is added. This is a hard rule; no PR is accepted without its corresponding test.

Verification-first approach. The verification cases defined in `docs/design/time-history-sdof-verification.md` are not an afterthought. TH-3 is dedicated to them and is sequenced before the user interface. The reason is that the SDOF cases catch integrator errors, sign convention errors, and damping model errors at a low cost; if a bug reaches the UI it is much more expensive to diagnose and fix.

Backward compatibility. The project file format, the API payload, the result schema, and the i18n key set are all backward compatible across every milestone. The MVP change is documented as a `minor` increment in `docs/design/time-history-schema.md`; no major increment is performed.

Why implementation must proceed in phases. There are three reasons.

- Risk reduction. Each phase exposes a small surface area. A bug in a small phase is cheap to fix; a bug discovered after a large integration is expensive.
- Verification integrity. SDOF benchmarks require a stable solver core. The solver core requires a stable schema. The schema requires a stable loader. The order of these dependencies forces a phased approach.
- Reviewer attention. A small, well-scoped PR is more likely to receive a high-quality review than a large one. The team has limited reviewer capacity; phasing respects that constraint.
## 3. Development Milestones

The implementation is divided into seven milestones, TH-1 through TH-7. Each milestone is described in detail in sections 4 through 10. The table below summarizes the goal of each milestone and its primary exit criterion.

| Milestone | Goal | Primary exit criterion |
| --- | --- | --- |
| TH-1 Foundation | Integrate the time history schema, validate the loader/saver, and ship the round-trip test. | Round-trip a project file with empty `analysisSettings.timeHistory` and an empty `groundMotions` list. |
| TH-2 Solver Core | Implement the Newmark-beta solver, the mass matrix assembly, the damping matrix assembly, and the effective load generation. | The solver runs on a synthetic SDOF model and returns the analytical response within floating-point tolerance. |
| TH-3 Verification | Implement the SDOF benchmark cases A through D from `docs/design/time-history-sdof-verification.md` and pass all numerical acceptance criteria. | All four SDOF cases pass the section 12 acceptance criteria of the verification design. |
| TH-4 Results Integration | Persist the solver output under `analysisResults.timeHistory`, integrate with the result schema, and expose the analysis through the API. | Round-trip a project file with a full `analysisResults.timeHistory` block and an envelope. |
| TH-5 User Interface | Expose the analysis settings, the ground motion manager, the execution workflow, and the result visualization. | A user can configure, run, and inspect a time history analysis end to end through the UI. |
| TH-6 Reporting | Implement CSV export and PDF report generation for time history. | A user can export a complete analysis to CSV and to a multi-section PDF report. |
| TH-7 Production Readiness | Pass performance, large-model, memory, regression, and documentation gates. | All Gate E criteria (section 13) are green for at least one full release candidate. |

The milestones are sequential. TH-1 must be complete before TH-2 starts; TH-2 must be complete before TH-3 starts; TH-3 must be complete before TH-4 starts; TH-4 must be complete before TH-5 starts; TH-5 and TH-6 are parallel after TH-4; TH-7 requires TH-4, TH-5, and TH-6 to be complete. The exact dependency graph is in section 11.

## 4. TH-1 Foundation

Scope:

- Schema integration. Add the type definitions for `analysisSettings.timeHistory`, `groundMotions`, and the supporting enums (`damping.type`, `groundMotion.direction`, `groundMotion.unit`, `method`).
- Project loading. Extend the project loader to recognize and validate the new keys. Unknown keys must be tolerated.
- Project saving. Extend the project saver to serialize the new keys deterministically. Round-trip must preserve byte content for keys that are not modified by the user.
- Validation framework. Add a validation layer that reports `LARGE_GROUND_MOTION`, `DURATION_MISMATCH`, `TIME_STEP_NOT_INTEGER_DIVISOR`, and other warnings and errors described in `docs/design/time-history-schema.md`.

Files likely affected:

- `backend/project/loader.py` (or equivalent). Extend the loader.
- `backend/project/saver.py` (or equivalent). Extend the saver.
- `backend/project/validator.py` (or equivalent). Add the new validation rules.
- `backend/tests/test_project_loader.py`. Add round-trip tests.
- `frontend/src/types/analysis.ts` (or equivalent). Add the TypeScript types.

Deliverables:

- The new keys are present in the in-memory project representation.
- Loading a project file that does not contain the new keys produces a project with `analysisSettings.timeHistory == null` and `groundMotions == []`.
- Loading a project file that contains the new keys and saving it without modification produces a byte-identical output.
- Loading a project file with unknown keys under `analysisSettings.timeHistory` does not raise; the unknown keys are preserved on save.

Exit criteria:

- All new keys are accepted by the loader.
- All new keys are emitted by the saver in the documented order.
- Round-trip test for the worked example in `docs/design/time-history-schema.md` section 16 is green.
- The test suite is green.
- `docs/glossary.md` is updated if any new term is introduced in this milestone (none expected).

## 5. TH-2 Solver Core

Scope:

- Mass matrix assembly. Reuse the existing lumped or consistent mass matrix code; expose a function that returns `M` for the time history module.
- Damping matrix assembly. Implement Rayleigh damping `C = alpha * M + beta * K` for the two reference frequencies and ratios supplied in `analysisSettings.timeHistory.damping`. The coefficients are computed in the runtime, not stored.
- Effective load generation. For each ground motion record, build the effective load vector `L_g(t) = -M * r * a_g(t)` and assemble it into the global load vector at each time step. The influence vector `r` is computed from the support conditions.
- Newmark-beta solver. Implement the average acceleration method (beta = 1/4, gamma = 1/2) with the effective stiffness matrix `K_eff = K + a0 * M + a1 * C`. The solver is exposed as a function that takes the initial state, the mass, damping, and stiffness matrices, the time series of the effective load, and returns the full displacement, velocity, and acceleration histories.

Expected modules:

- `backend/engine/time_history.py`. The main module. Contains the time-stepping loop, the effective load assembly, the K_eff assembly, and the Newmark-beta coefficients. No business logic outside the time stepper.
- `backend/engine/damping.py` (new) or `backend/engine/rayleigh.py` (new). The Rayleigh damping coefficient calculation and matrix assembly.
- `backend/engine/ground_motion.py` (new). The ground motion record model, the unit conversion, and the effective load generation per time step.
- `backend/engine/newmark_beta.py` (new). The Newmark-beta time stepper. Exposes a `TimeStepper` interface that future nonlinear steppers will share (see section 14).
- `backend/tests/test_time_history_solver.py`. Unit tests for the solver on synthetic single-DOF and small multi-DOF inputs.

Internal architecture:

- The solver takes plain NumPy (or equivalent) arrays for `M`, `C`, `K`, the initial state, the time series, and returns a result object with displacement, velocity, and acceleration histories. It does not know about the project schema; the schema layer is responsible for translating the project representation into solver inputs.
- The `TimeStepper` interface is defined as a small set of pure functions: `compute_coefficients`, `predict_step`, `correct_step`, `update_state`. The MVP stepper is the Newmark-beta average acceleration method. A future stepper will be the Newton-Raphson nonlinear stepper. The interface is reserved here to make the nonlinear extension possible without changing the call sites.

No implementation in this milestone is described in detail; the milestone defines the public surface and the test surface only.

Exit criteria:

- The solver runs on a synthetic SDOF model and returns the analytical response within floating-point tolerance.
- The solver runs on a small MDOF model and produces a stable response for the reference time step.
- The K_eff matrix is assembled correctly (a unit test verifies against a hand-computed matrix for a 2-DOF model).
- The Rayleigh coefficient calculation is correct (a unit test verifies the `alpha` and `beta` formulas).
- The effective load sign convention is correct (a unit test verifies that a positive ground acceleration produces a negative effective load, matching the `-M * r * a_g(t)` sign convention).
## 6. TH-3 Verification

Scope:

- Implementation of the benchmark cases defined in `docs/design/time-history-sdof-verification.md`. Each case becomes a backend test that exercises the solver on a single-DOF model and asserts the numerical acceptance criteria.
- Implementation of the time step sensitivity study defined in section 10 of the verification design.
- Implementation of the boundedness test for coarse time steps.
- Implementation of the convergence-rate test that asserts the second-order accuracy of the Newmark-beta average acceleration method.

Verification order:

The cases are introduced in the order A, B, C, D from the verification design. The order is chosen so that each case adds one new dimension to the verification, and so that the team can stop at any case and still have a coherent test set:

1. Case A (undamped free vibration). This is the simplest case. It exercises the integrator without damping, without forcing, and without base excitation. Passing Case A is the strongest evidence that the integrator itself is correct.
2. Case B (damped free vibration). This adds the damping matrix. Passing Case B is evidence that the Rayleigh coefficient calculation and the damping matrix assembly are correct.
3. Case C (harmonic force response). This adds an external force. Passing Case C is evidence that the load vector assembly and the steady-state convergence are correct.
4. Case D (base excitation). This adds the effective load `L_g = -M * r * a_g(t)` and the sign convention. Passing Case D is evidence that the ground motion module is correct.

Acceptance gates:

- The acceptance criteria in section 12 of `docs/design/time-history-sdof-verification.md` are mandatory. The test reports a clear diagnostic on failure, identifying which case and which criterion failed.
- The time step sensitivity study must demonstrate second-order convergence for the peak displacement.
- The boundedness test must pass for all `dt` up to `T_n / 20`.
- The coarse time step `dt = T_n / 20` may emit a `COARSE_TIME_STEP` warning but must not raise.

Pass/fail criteria:

- The milestone is pass when all four cases plus the time step sensitivity study and the boundedness test are green for the canonical parameter set in section 5 of the verification design.
- The milestone is fail if any case fails its numerical acceptance criterion, or if the boundedness test raises, or if the energy drift over 20 cycles in Case A exceeds 1 percent at `dt = T_n / 100`.

## 7. TH-4 Results Integration

Scope:

- Result models. Define the in-memory representation of the time history result, the envelope, the meta block, and the per-node and per-member histories.
- Persistence. Translate the in-memory representation to and from the `analysisResults.timeHistory` block defined in `docs/design/time-history-schema.md` sections 9 and 10. Persist it under the project key.
- Result serialization. Serialize and deserialize the time history block deterministically. The `time` array must be a strictly increasing sequence; every history array must have the same length.
- API integration. Expose the time history analysis through the backend HTTP API. The API contract is described in section 8 of `docs/design/time-history-analysis.md`. The implementation phase writes the concrete request and response models but does not change the URL structure or the field names.

Expected files:

- `backend/results/time_history.py` (new). The result model and the envelope computation.
- `backend/results/envelope.py` (new) or reuse of the existing envelope module. The envelope extraction from a history.
- `backend/api/time_history.py` (new). The FastAPI route module.
- `backend/tests/test_time_history_result.py`. Tests for the result model, the envelope, and the round-trip from solver output to the project schema.
- `backend/tests/test_time_history_api.py`. Tests for the API contract.

Dependencies:

- TH-1 (schema integration, loader, saver).
- TH-2 (solver core).
- TH-3 (verification; the API integration tests reuse the SDOF fixtures to produce a known-good result).

Exit criteria:

- The result model round-trips through the project schema with byte-identical output for an unmodified result.
- The envelope is computed correctly for a synthetic SDOF response (the first peak and the first trough are within 1 percent of the analytical value).
- The API contract is implemented and passes the contract test.
- The test suite is green.

## 8. TH-5 User Interface

Scope:

- Analysis settings panel. A panel that exposes the `analysisSettings.timeHistory` fields. The panel must respect the project locale; all labels are looked up in `frontend/src/i18n/ja.ts`.
- Ground motion manager. A panel that lists the `groundMotions` records, allows import from CSV or JSON, allows editing of the metadata, and validates the unit and the direction.
- Execution workflow. A "Run Time History Analysis" action that triggers the backend analysis run, displays a progress indicator, and updates the result panel when complete.
- Progress reporting. A progress bar or spinner driven by the backend progress events, with Japanese labels.

Future UI components:

- `<TimeHistorySettingsPanel />`. The settings form.
- `<GroundMotionManager />`. The ground motion import and editing UI.
- `<TimeHistoryRunButton />`. The run action with progress reporting.
- `<TimeHistoryResultViewer />`. The result visualization (time history plots, envelope tables, member force plots).

The component names above are placeholders. The implementation phase decides the actual file names and component names.

No implementation details. The milestone specifies the workflow and the user-visible behavior; it does not specify the component hierarchy, the state management, or the test strategy in detail.

Exit criteria:

- A user can configure `analysisSettings.timeHistory` through the UI, save the project, reload it, and observe that the configuration is preserved.
- A user can import a ground motion record from CSV, save the project, reload it, and observe that the record is preserved.
- A user can run a time history analysis and see the result update in the UI when complete.
- A user can inspect the envelope and the per-node histories through the UI.
- No Japanese UI string is hard-coded in any React component.
- The frontend test suite is green.
## 9. TH-6 Reporting

Scope:

- CSV export. Produce the five CSV files described in `docs/design/time-history-schema.md` section 11: displacement history, velocity history, acceleration history, member force history, envelope summary. Each file uses the documented column names and units.
- PDF report. Produce the six-section PDF report described in section 12 of the schema design: analysis settings, damping, ground motion metadata, response summaries, representative time histories, verification reference. The report reuses the existing `report-drawing-output.md` image pipeline for the line graphs.
- Envelope tables. Render the envelope values in a multi-page table grouped by category.
- Metadata output. Include the meta block in the report header and in the CSV envelope summary.

Dependencies on existing reporting architecture:

- The existing CSV exporter is extended with a new branch for the time history format. The exporter must support the column-name and unit conventions in section 11 of the schema design.
- The existing PDF report pipeline is extended with a new section "Time History Analysis Report". The pipeline must support the image embedding for the representative time histories.
- The Japanese report labels are looked up in `frontend/src/i18n/ja.ts` at render time. No label is hard-coded in the report template.

Exit criteria:

- A user can export a complete analysis to CSV and observe the documented column layout.
- A user can export a PDF report and observe the six documented sections.
- The envelope summary CSV matches the envelope values produced by the solver within the floating-point tolerance of the CSV writer.
- The Japanese report labels render correctly.
- The report test suite is green.

## 10. TH-7 Production Readiness

Scope:

- Performance testing. A benchmark suite that measures the wall-clock time of the analysis for a small, medium, and large project. The MVP target is documented in section 12 of `docs/design/time-history-analysis.md` and revisited in section 12 of this roadmap.
- Large model testing. A test that runs the analysis on a model with at least 1000 degrees of freedom and 10000 time steps. The test passes if the analysis completes within the time budget and the result is within the numerical acceptance criteria of the SDOF verification.
- Memory testing. A test that measures the peak memory consumption of the analysis. The MVP target is documented in section 12 of `docs/design/time-history-analysis.md`.
- Regression testing. The full regression suite (static, eigen, response spectrum, influence line, moving load, and time history) is green.
- Documentation updates. The user-facing documentation is updated to describe the time history feature. The internal documentation is updated to reflect the implementation.

Release readiness criteria:

- All Gate A through Gate E criteria in section 13 are green.
- The performance, large-model, and memory targets are met.
- The regression suite is green.
- The user-facing documentation is reviewed and merged.
- The internal documentation is reviewed and merged.
- A release candidate is built and signed off by the project lead.

## 11. Dependency Graph

The seven milestones form a strict dependency graph. A milestone cannot start before all of its predecessors have passed their exit criteria. The graph is:

```
TH-1 Foundation
  |
  +-- TH-2 Solver Core
  |     |
  |     +-- TH-3 Verification
  |           |
  |           +-- TH-4 Results Integration
  |                 |
  |                 +-- TH-5 User Interface
  |                 |
  |                 +-- TH-6 Reporting
  |
  +-- TH-4 Results Integration
  |
  +-- TH-5 User Interface
  |
  +-- TH-6 Reporting
  |
  TH-7 Production Readiness
        |
        +-- requires TH-4, TH-5, TH-6
```

The text form of the same graph:

- TH-1 is the root. It is the only milestone with no predecessor.
- TH-2 depends on TH-1.
- TH-3 depends on TH-2.
- TH-4 depends on TH-3.
- TH-5 depends on TH-4.
- TH-6 depends on TH-4.
- TH-7 depends on TH-4, TH-5, and TH-6.

The graph is intentionally acyclic. There is no path from TH-5 or TH-6 back to TH-2 or TH-3. This is because the verification gate at TH-3 freezes the solver behavior; later milestones consume the frozen behavior and do not modify it.

A textual rationale for the ordering:

- TH-1 first because every other milestone needs a stable schema, loader, and saver.
- TH-2 second because the solver is the source of correctness; UI and reporting cannot exist without it.
- TH-3 third because the SDOF verification is the cheapest way to catch integrator errors. UI and reporting would mask the errors.
- TH-4 fourth because the result model and the API contract are the integration points between the solver and everything else.
- TH-5 and TH-6 fifth because they are the user-facing surfaces. They are parallel because they do not share code.
- TH-7 last because production readiness is a property of the whole feature, not of any individual milestone.

## 12. Risk Assessment

The major risks for the implementation are listed below. Each risk is described together with a mitigation strategy.

Risk 1: Numerical instability in the time integrator.

- Description. A wrong implementation of the Newmark-beta coefficients, the effective stiffness matrix, or the time step can produce a divergent response, an oscillating response, or an energy drift.
- Mitigation. TH-3 is dedicated to the SDOF verification. The acceptance criteria in section 12 of the verification design are mandatory. The boundedness test catches divergence; the energy drift test catches the slow accumulation of error; the convergence-rate test catches a wrong order of accuracy. Any failure is a blocker.

Risk 2: Incorrect sign convention for the base excitation effective load.

- Description. A wrong sign in `-M * r * a_g(t)` would silently invert the response and produce a result that is numerically stable but physically wrong.
- Mitigation. Case D in the SDOF verification is dedicated to the sign convention. The qualitative sign check (`u_rel` opposite in sign to `a_g` at low frequency) is a hard requirement. The unit test in TH-2 verifies the sign convention against a hand-computed reference.

Risk 3: Schema migration of existing project files.

- Description. Existing project files do not contain the new keys. A loader that fails on the absence of a key, or a saver that overwrites the file with a different key order, would break backward compatibility.
- Mitigation. TH-1 has an explicit round-trip test. The loader is required to produce a project with `analysisSettings.timeHistory == null` and `groundMotions == []` when the keys are absent. The saver is required to preserve byte content for unmodified keys. The schema design classifies the MVP change as a `minor` increment.

Risk 4: Memory growth for long records.

- Description. A 100,000-sample time history at 100 nodes produces 10 million floating-point numbers. Storing the full history inline can exceed the memory budget of small workstations.
- Mitigation. The MVP target is documented in section 12 of `docs/design/time-history-analysis.md`. TH-7 has a memory test that fails if the budget is exceeded. The schema design leaves a binary cache extension point (`.thcache`) as a future option.

Risk 5: Large result files and slow I/O.

- Description. A large result block can take a long time to load and to save. A user who opens a project with a 10-million-number result may experience a noticeable delay.
- Mitigation. TH-7 has a performance test. If the test fails, the implementation phase investigates the I/O path, the JSON encoder, and the in-memory representation. The schema design leaves a compression extension point (`compression: "gzip"`) as a future option.

Risk 6: Sign convention regression in future nonlinear extension.

- Description. The future nonlinear stepper must use the same sign convention for the effective load as the linear stepper. A divergence between the two would silently produce wrong nonlinear results.
- Mitigation. The `TimeStepper` interface defined in TH-2 is shared between the linear and the nonlinear steppers. The interface contract includes the sign convention of the effective load. A test pins the convention.

Risk 7: Japanese UI string drift.

- Description. New UI labels are introduced by TH-5 and TH-6. If they are hard-coded in the React components, the i18n policy is violated.
- Mitigation. TH-5 and TH-6 have an explicit exit criterion: "no Japanese UI string is hard-coded in any React component". A linter or a manual review enforces the criterion.

Risk 8: Loss of historical analysis results when the user saves a project.

- Description. A naive saver that overwrites the `analysisResults.timeHistory` block in place can lose the result of a previous run.
- Mitigation. The MVP schema design stores a single latest result block; this is documented in section 15 of `docs/design/time-history-schema.md` as a known limitation. The save action is a "save" not a "save as", and the user is warned in the UI before the first save of a project that contains a time history result.
## 13. Verification Gates

The implementation is gated by five mandatory quality gates. A gate is a binary check; a green gate allows the next milestone to start, a red gate blocks the next milestone until the failure is fixed.

Gate A: SDOF Case A pass.

- Required for: TH-3 to start.
- Verification: the test `test_sdof_undamped_free_vibration_period` and the test `test_sdof_undamped_free_vibration_energy_conservation` from `docs/design/time-history-sdof-verification.md` section 14 are green.
- Pass criteria: the natural period error is below 1 percent, and the energy drift over 20 cycles at `dt = T_n / 100` is below 1 percent.

Gate B: All SDOF benchmarks pass.

- Required for: TH-4 to start.
- Verification: all four SDOF cases plus the time step sensitivity study plus the boundedness test from `docs/design/time-history-sdof-verification.md` section 14 are green.
- Pass criteria: every acceptance criterion in section 12 of the verification design is satisfied.

Gate C: Schema round-trip pass.

- Required for: TH-4 to merge.
- Verification: the round-trip test in TH-1 plus the result-round-trip test in TH-4 are green.
- Pass criteria: loading and saving the worked example in section 16 of `docs/design/time-history-schema.md` produces a byte-identical output for the keys that are not modified by the user.

Gate D: CSV and PDF export pass.

- Required for: TH-6 to complete.
- Verification: the CSV exporter and the PDF report generator are exercised on the worked example. The CSV columns match section 11 of `docs/design/time-history-schema.md`. The PDF sections match section 12 of the schema design.
- Pass criteria: a human review of the exported CSV and PDF files finds the layout, the column names, and the Japanese labels correct.

Gate E: Regression suite pass.

- Required for: TH-7 to complete and for the release.
- Verification: the full backend test suite, the full frontend test suite, the TypeScript check, and the frontend build are green. The performance, large-model, and memory tests are within their targets.
- Pass criteria: every test in the suite is green, every build artifact is generated, and every documented target is met.

The gates are independent. A failure in any gate blocks the next milestone. The team is not allowed to skip a gate or to "waive" a failure.

## 14. Future Nonlinear Roadmap

The linear implementation is designed to support a future nonlinear dynamic analysis without changing the call sites of the solver. The transition strategy is:

- The `TimeStepper` interface introduced in TH-2 is the integration point. The linear stepper (Newmark-beta average acceleration) implements this interface. The future nonlinear stepper (Newton-Raphson) will implement the same interface.
- The result model introduced in TH-4 is reserved for nonlinear extensions. The schema design reserves the `analysisResults.timeHistory.nonlinear` block for the per-step residual and iteration-count history. The MVP does not write this block; the loader ignores it.
- The material catalog is reserved for nonlinear extensions. The schema design reserves `project.materials.<id>.nonlinear` for the per-material nonlinear model. The MVP does not write this block.
- The member catalog is reserved for plastic hinges. The schema design reserves `project.members.<id>.hinges` for the hinge definition. The MVP does not write this block.
- A future top-level `project.bearings` key is reserved for nonlinear bearings. The MVP does not write this key.
- A future `analysisSettings.timeHistory.nonlinear` block is reserved for the nonlinear solver settings (Newton-Raphson tolerance, arc-length method, etc.). The MVP does not write this block.

The transition to the nonlinear implementation will be a separate roadmap, drafted after the linear feature is released. The current roadmap does not design the nonlinear implementation. The current roadmap only ensures that the linear implementation does not foreclose the nonlinear extension.

A specific transition point: when the nonlinear roadmap is started, the team will introduce a `StepperType` enum under `analysisSettings.timeHistory.method`. The MVP currently uses `"newmark-beta"`. The nonlinear roadmap will add `"newton-raphson"` and possibly other values. The MVP implementation does not need to change to support this addition because the enum is reserved in the schema design.

A second transition point: the effective load sign convention is fixed by the SDOF verification Case D. The future nonlinear implementation must use the same convention. A test pins the convention; a documentation reference pins it for human readers.

## 15. Recommended Task Breakdown

The seven milestones decompose into a set of small, independently testable, reviewable tasks. The recommended Codex task list is below. Each task is a single PR. The task name includes a milestone prefix (TH-1a, TH-1b, ...) so that the dependency order is obvious from the name alone.

TH-1 Foundation.

- Task TH-1a: Schema model implementation. Add the TypeScript and Python types for `analysisSettings.timeHistory` and `groundMotions`. Add the unit tests for the type guards.
- Task TH-1b: Project loader extension. Extend the loader to accept the new keys, with unknown-key tolerance. Add the round-trip test.
- Task TH-1c: Project saver extension. Extend the saver to emit the new keys in the documented order. Add the round-trip test.
- Task TH-1d: Validation framework extension. Add the new validation rules (`LARGE_GROUND_MOTION`, `DURATION_MISMATCH`, `TIME_STEP_NOT_INTEGER_DIVISOR`).

TH-2 Solver Core.

- Task TH-2a: Mass matrix assembly. Expose the `M` matrix from the existing mass case. Add the unit test.
- Task TH-2b: Rayleigh damping. Implement `C = alpha * M + beta * K` from the two reference frequencies and ratios. Add the unit test for the coefficient calculation.
- Task TH-2c: Effective load generation. Implement the per-step assembly of `-M * r * a_g(t)`. Add the unit test for the sign convention.
- Task TH-2d: Newmark-beta integration. Implement the time stepper. Expose the `TimeStepper` interface. Add the unit test for the K_eff assembly.

TH-3 Verification.

- Task TH-3a: SDOF Case A. Add the test `test_sdof_undamped_free_vibration_period` and the energy conservation test.
- Task TH-3b: SDOF Case B. Add the test for the damped free vibration and the logarithmic decrement.
- Task TH-3c: SDOF Case C. Add the test for the harmonic force and the DAF table.
- Task TH-3d: SDOF Case D. Add the test for the base excitation and the sign convention.
- Task TH-3e: Time step sensitivity. Add the convergence rate test and the coarse-time-step warning test.
- Task TH-3f: Boundedness. Add the boundedness test for all four cases at `dt = T_n / 20`.

TH-4 Results Integration.

- Task TH-4a: Result model. Define the in-memory representation and the envelope computation.
- Task TH-4b: Result persistence. Translate between the in-memory representation and `analysisResults.timeHistory`.
- Task TH-4c: API contract. Implement the FastAPI route module and the request/response models.
- Task TH-4d: API tests. Add the contract test for the API.

TH-5 User Interface.

- Task TH-5a: Settings panel. Add the `<TimeHistorySettingsPanel />` (placeholder name) component. Add the i18n keys to `ja.ts`.
- Task TH-5b: Ground motion manager. Add the `<GroundMotionManager />` component. Add the i18n keys.
- Task TH-5c: Run action and progress. Add the run action and the progress reporting. Add the i18n keys.
- Task TH-5d: Result viewer. Add the result visualization component. Add the i18n keys.

TH-6 Reporting.

- Task TH-6a: CSV exporter. Add the time history branch to the CSV exporter. Add the column tests.
- Task TH-6b: PDF report section. Add the time history report section to the PDF report pipeline. Add the layout tests.
- Task TH-6c: Envelope tables. Add the envelope table rendering for the PDF report.

TH-7 Production Readiness.

- Task TH-7a: Performance test. Add the benchmark suite for small, medium, and large projects.
- Task TH-7b: Large model test. Add the 1000-DOF, 10000-step test.
- Task TH-7c: Memory test. Add the peak memory measurement.
- Task TH-7d: Documentation. Update the user-facing documentation and the internal documentation.
- Task TH-7e: Release candidate. Build the release candidate and run the full Gate E suite.

The task list above is the recommended decomposition. The implementation phase may add or remove tasks as long as the milestones, the gates, and the dependency order are preserved.

## 16. Estimated Development Sequence

The recommended implementation order is the linear order of the milestones, with the task-level decomposition from section 15. The table below provides a qualitative estimate of the complexity, the risk, and the verification effort of each task. The ratings are qualitative: Low, Medium, High. Hours are not estimated.

| Task | Complexity | Risk | Verification effort |
| --- | --- | --- | --- |
| TH-1a Schema model | Low | Low | Low |
| TH-1b Loader extension | Medium | Low | Low |
| TH-1c Saver extension | Medium | Low | Low |
| TH-1d Validation rules | Low | Low | Low |
| TH-2a Mass matrix | Low | Low | Low |
| TH-2b Rayleigh damping | Medium | Medium | Medium |
| TH-2c Effective load | Medium | Medium | Medium |
| TH-2d Newmark-beta stepper | High | High | High |
| TH-3a SDOF Case A | Medium | High | High |
| TH-3b SDOF Case B | Medium | Medium | Medium |
| TH-3c SDOF Case C | Medium | Medium | Medium |
| TH-3d SDOF Case D | Medium | High | High |
| TH-3e Time step sensitivity | Medium | Medium | Medium |
| TH-3f Boundedness | Low | Low | Low |
| TH-4a Result model | Medium | Low | Low |
| TH-4b Result persistence | Medium | Medium | Medium |
| TH-4c API contract | Medium | Medium | Medium |
| TH-4d API tests | Low | Low | Low |
| TH-5a Settings panel | Medium | Low | Low |
| TH-5b Ground motion manager | High | Medium | Medium |
| TH-5c Run action | Medium | Medium | Medium |
| TH-5d Result viewer | High | Medium | Medium |
| TH-6a CSV exporter | Medium | Low | Low |
| TH-6b PDF report section | High | Medium | Medium |
| TH-6c Envelope tables | Medium | Low | Low |
| TH-7a Performance test | High | Low | High |
| TH-7b Large model test | High | Medium | High |
| TH-7c Memory test | Medium | Low | Medium |
| TH-7d Documentation | Medium | Low | Low |
| TH-7e Release candidate | Medium | Medium | High |

The most risky tasks are TH-2d (the Newmark-beta stepper) and TH-3a and TH-3d (the SDOF cases that exercise the integrator and the sign convention). These three tasks are also the highest-effort verification tasks. The implementation phase must allocate enough reviewer attention to them.

The least risky tasks are the documentation, the boundedness test, and the API tests. These can be parallelized across multiple reviewers.

The team should not start TH-5 (UI) before TH-4 is merged, and should not start TH-6 (reporting) before TH-4 is merged. TH-5 and TH-6 are parallel after TH-4, but in practice they share reviewer capacity, so a staggered start with one milestone offset is recommended.