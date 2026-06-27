# P2-0 UI Alignment Review

## Purpose

Align the Phase2 UI implementation scope with the current liner design documents and implementation state before React UI work starts.

## Scope

- Verify the route, panel, workflow, state, i18n, and adapter boundaries from `frontend/src/liner/uiPreparation.ts` and `docs/liner/ui_preparation.md`.
- Record the Phase2 UI implementation defaults for form-first editing, read-only 2D preview, mapping review, and existing `Viewer3D` handoff.
- Absorb known documentation inconsistencies that would mislead Phase2 implementation.

## Out of Scope

- React route or component implementation.
- Geometry core, intermediate result schema, mapper behavior, and headless behavior changes.
- JIP-LINER UI, wording, report, icon, or file-format comparison.

## Authoritative Inputs

| Topic | Source |
| --- | --- |
| Route and panel identifiers | `frontend/src/liner/uiPreparation.ts`, `docs/liner/ui_preparation.md` |
| Canonical computed data | `docs/liner/intermediate_result_model.md` |
| Geometry and sampling boundary | `docs/liner/geometry_core.md`, `docs/liner/calculation_pipeline.md` |
| Frame mapping and merge boundary | `docs/liner/frame_model_mapping.md`, `docs/liner/integration_with_frame_model.md` |
| UI behavior and rendering | `docs/liner/ui_window_spec.md`, `docs/liner/input_ui_behavior.md`, `docs/liner/rendering_strategy.md` |
| Language policy | `docs/development/language-policy.md`, `docs/glossary.md` |

## Phase2 UI Defaults and Repository Support

| Area | Repository fact | Phase2 default | Review status |
| --- | --- | --- | --- |
| Routes | `uiPreparation.ts` reserves route ids `liner.setup`, `liner.preview`, `liner.mappingReview` and paths `/pro/liner/setup`, `/pro/liner/preview`, `/pro/liner/mapping-review`. | Use those ids and paths when React routes are wired. | Supported by repository facts. |
| Panels | `uiPreparation.ts` reserves `alignmentInput`, `stationTable`, `gridPreview`, `diagnostics`, `mappingReview`, and `headlessGenerationSummary`. | Build the first UI surface around those panel ids. | Supported by repository facts. |
| Input MVP | `input_ui_behavior.md` leaves canvas editing vs form-first input as an open question. | Use form-centered input and defer direct canvas manipulation. | Phase2 directive; not yet closed in the repository docs. |
| Preview MVP | `rendering_strategy.md` requires rendering from intermediate snapshots and forbids re-running calculation in the renderer. | Treat the 2D preview as read-only for Phase2. | Partly supported; read-only behavior should be reflected in UI docs if kept. |
| Mapping review | `uiPreparation.ts` reserves a `mappingReview` workflow step; mapper/headless APIs already produce frame-model outputs. | Require explicit review before frame entities are merged into the working `ProjectModel`. | Supported by reserved workflow; merge UX details remain to be implemented. |
| Headless validation | `createHeadlessLinerFrameProject()` exists and is covered by liner tests. | Run headless validation before merge readiness is shown. | API support is confirmed; exact UI readiness timing is a Phase2 directive. |
| Viewer handoff | Existing `Viewer3D` consumes `ProjectModel`; integration docs describe a generated-project handoff. | Reuse existing `Viewer3D` with a generated `ProjectModel`. | Supported by repository facts. |
| CSS | Liner-specific selectors are not implemented yet; `ui_window_spec.md` keeps CSS tokens out of scope. | Add Phase2 UI styles as global `liner-*` kebab-case selectors in `frontend/src/styles.css`. | Phase2 directive; repo docs should be updated before CSS-heavy UI work. |
| i18n | `ja.liner.*` placeholders exist in `frontend/src/i18n/ja.ts`; language policy forbids inline Japanese UI strings. | Add user-visible strings under `ja.liner.*`. | Supported by repository facts. |
| State | `state_management.md` keeps shared vs isolated undo/redo as an open question. | Use local draft state and draft-level undo only for Phase2 MVP. | Phase2 directive; not yet closed in the repository docs. |

## Adapter Boundary

Phase2 React components must depend on adapter functions instead of importing geometry primitives directly.

| UI need | Allowed adapter responsibility | Disallowed |
| --- | --- | --- |
| Compute intermediate | Call the public pipeline entry point and normalize readiness/diagnostics. | Calling geometry segment functions from components. |
| Show diagnostics | Convert `ComputationDiagnostic[]` to `LinerUiDiagnosticDisplay[]` and resolve `messageKey` through `ja.liner.errors.*`. | Duplicating core validation logic in UI. |
| Show 2D preview | Project `CanonicalLinerIntermediateResult` into drawable view-model primitives. | Re-sampling horizontal or vertical geometry in the renderer. |
| Mapping review | Run `mapToFrameModel()` for preview, run `createHeadlessLinerFrameProject()` for validation readiness, and keep `attachLinerMappingToProject()` as the metadata attachment step inside the explicit merge workflow. | Mutating the working `ProjectModel` before explicit user confirmation. |
| Viewer handoff | Provide a generated `ProjectModel` to existing `Viewer3D`. | Passing intermediate/grid objects directly to `Viewer3D`. |

Recommended Phase2 adapter files:

- `frontend/src/liner/adapters/linerUiAdapter.ts`
- `frontend/src/liner/adapters/linerDiagnosticsAdapter.ts`
- `frontend/src/liner/adapters/linerViewerAdapter.ts`

## Documentation Corrections Applied in P2-0

| Issue | Correction |
| --- | --- |
| `docs/liner/README.md` said the folder contained design skeletons only. | Updated it to describe the folder as design/review/handoff source of truth and point to implementation under `frontend/src/liner/` and `schemas/project.schema.json`. |
| `docs/liner/phase1_completion_gate.md` said there were no liner i18n strings. | Added a P2-0 correction note: `ja.liner.*` placeholders exist, but they are not wired to React UI. |
| `docs/liner/integration_with_frame_model.md` referenced `gc-06-intermediate.json`. | Updated the current on-disk fixture name to `gc-06-intermediate.expected.json` and documented that `gc-06-project.generated.json` remains planned. |

## Remaining Alignment Risks

| Risk | Status | Phase2 Handling |
| --- | --- | --- |
| Canonical fixture gaps from Phase1 gate remain. | Open. | Phase2 UI may use in-code fixtures or current domain fixtures, but must not claim complete GC-01 through GC-07 golden coverage. |
| `gc-06-project.generated.json` is referenced as a planned fixture but is not committed. | Open. | Mapping review can rely on headless Vitest coverage until the fixture is added. |
| `frameMappingPreview` module and Phase0 intermediate compatibility types remain exported. | Open. | Phase2 UI should consume `CanonicalLinerIntermediateResult` and the P1-5 mapper/headless APIs, not Phase0 preview helpers or `Phase0LinerIntermediateResult`. |
| Core diagnostics may omit `messageKey`. | Open. | UI must fall back to diagnostic `code` or a generic `ja.liner.errors.*` key without inventing new core validation. |
| Vertical profile is flat `z` in the current pipeline. | Open. | Phase2 profile UI must label unsupported advanced profile behavior as not yet computation-backed unless implementation is added in a later phase. |

## Cursor CLI Utilization Log

| # | Timing | Purpose | Target | Result Summary |
| --- | --- | --- | --- | --- |
| 1 | Step 1 kickoff | Existing symbol and inconsistency inventory | `frontend/src/liner/uiPreparation.ts`, `docs/liner/ui_preparation.md`, README, Phase1 gate, integration doc | Confirmed route/panel/workflow/i18n symbols and the three requested documentation inconsistencies. |
| 2 | Step 2 planning | API and naming reference | `buildIntermediateResult`, `mapToFrameModel`, `createHeadlessLinerFrameProject`, `attachLinerMappingToProject`, `Viewer3DProps`, `ja.liner.*` | Confirmed pipeline/mapper/headless/schema/viewer boundaries and that `ja.liner.*` placeholders already exist. |
| 3 | Step 3 review target | Impact surface confirmation | `App.tsx`, `styles.css`, language policy checker, `uiPreparation` tests | Confirmed P2-0 should not register routes or render UI, and docs-only changes avoid runtime impact. |
| 4 | Step 4 pattern check | Existing docs review pattern and unsourced-decision scan | `phase1_completion_gate.md`, `ui_preparation.md`, `ui_window_spec.md`, P2-0 review | Flagged Phase2 directives that were written like repository-confirmed facts; the review now separates repository facts from Phase2 defaults and Human Review facts. |

## Human Review Required

| Fact | Evidence | Decision needed |
| --- | --- | --- |
| Several docs still reference stale or planned GC-06 fixture names outside the three P2-0 corrections. | `frame_model_mapping.md`, `test_plan_geometry.md`, and `test_plan_cad_report.md` still reference `gc-06-intermediate.json`; `schema_migration_policy.md` and `test_plan_geometry.md` reference the absent `gc-06-project.generated.json`. | Whether to normalize those references now or wait until the generated fixture is committed. |
| The Phase1 completion gate still records fixture gaps and recommends completing them before liner React UI starts. | `phase1_completion_gate.md` remains `FAIL` for B-01/B-02 style fixture coverage and records "Complete before starting liner React UI" follow-up items. | Whether Phase2 should block on those fixture gaps or proceed with UI scaffolding while keeping the gaps visible in PR notes. |
| Some Phase2 implementation defaults are not yet closed in repository design docs. | `input_ui_behavior.md` leaves form-first vs direct manipulation open; `state_management.md` leaves shared vs isolated undo open; `ui_window_spec.md` leaves CSS tokens out of scope. | Whether P2-0 should update the relevant UI design docs before P2-2/P2-3 implementation, or treat the Phase2 prompt defaults as temporary implementation constraints. |

## Pre-Implementation Checklist

- [x] Route and panel ids confirmed against code.
- [x] Workflow steps confirmed against code.
- [x] i18n placeholder reality corrected in Phase1 gate notes.
- [x] Existing 3D viewer handoff contract confirmed as `ProjectModel`-based.
- [x] Adapter boundary recorded before React UI implementation.
- [ ] React routes registered in app shell.
- [ ] Liner panel components implemented.
