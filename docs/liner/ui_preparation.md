# UI Preparation (P1-6)

## Purpose

Inventory route, panel, workflow, state, i18n, and entry-point boundaries for future liner React UI. **No UI is implemented in P1-6.**

## Scope

- Route and panel identifiers (English internal names).
- User workflow step order.
- UI vs computed state ownership.
- i18n key group inventory (group names only in design; Japanese in `frontend/src/i18n/ja.ts`).
- Mapping from future UI actions to P1-1 through P1-5 code entry points.

## Out of Scope

- React components, route registration in `App.tsx`, menu wiring.
- New geometry, mapper, or schema behavior.

## Route inventory

Internal route ids and reserved URL paths (not registered until a later phase):

| Route id | Path | Primary panels |
| --- | --- | --- |
| `liner.setup` | `/pro/liner/setup` | alignment input, station table |
| `liner.preview` | `/pro/liner/preview` | grid preview, diagnostics |
| `liner.mappingReview` | `/pro/liner/mapping-review` | mapping review, headless generation summary |

Follows existing pro-feature paths (`/pro/th/run`, `/pro/compare`). Constants: `frontend/src/liner/uiPreparation.ts`.

## Panel inventory

| Panel id | Route | Data source (read-only unless noted) |
| --- | --- | --- |
| `alignmentInput` | setup | domain (`BuildIntermediateInput` / future `LinerProject`) |
| `stationTable` | setup | `intermediate.stations` after compute |
| `gridPreview` | preview | `intermediate.horizontal`, `intermediate.grid` |
| `diagnostics` | preview | `intermediate.diagnostics` (+ mapper/headless diagnostics on generate) |
| `mappingReview` | mappingReview | `mapToFrameModel` output preview |
| `headlessGenerationSummary` | mappingReview | `createHeadlessLinerFrameProject` validation summary |

## Workflow boundaries

Ordered steps (UI orchestrates; core remains pure):

1. **editInput** — mutate domain; optional UI draft before commit.
2. **computeIntermediate** — `buildIntermediateResult()`.
3. **reviewDiagnostics** — display `ComputationDiagnostic[]`; gate export on error level.
4. **generateFrameMapping** — `mapToFrameModel()`.
5. **attachProjectExtension** — `attachLinerMappingToProject()` / merge into `ProjectModel`.
6. **runHeadlessValidation** — `createHeadlessLinerFrameProject()` for schema + reference checks.
7. **Hand off** — existing frame model editor, 3D viewer, validate, and analysis flows (unchanged).

## State boundaries

| Slice | Owner | Persisted | Notes |
| --- | --- | --- | --- |
| `draft` | UI | No | Form/selection ephemeral state |
| `domain` | project | Yes | `project.liner` / liner project file |
| `intermediate` | linerCore | No | Recompute on load; last-good on failure |
| `mapping` | linerMapper | No | Generated on user action |
| `projectExtension` | linerSchema | Yes | `liner` + `linerTrace` metadata |
| `analysisResult` | analysis | Yes | Existing analysis output |
| `stale` | UI | No | Set when domain `sourceRevision` ≠ intermediate |

UI must not duplicate geometry in selectors or components ([rendering_strategy.md](rendering_strategy.md)).

## i18n key groups

Reserved groups in `ja.liner` (placeholders until UI phase):

- `liner.toolbar` — main app entry, compute, generate
- `liner.window` — window title, status bar
- `liner.panels` — panel headings and empty states
- `liner.workflow` — step labels and gating messages
- `liner.actions` — buttons and confirmations
- `liner.status` — computing, stale, ready
- `liner.diagnostics` — panel chrome, severity labels
- `liner.errors` — maps to `messageKey` in [error_handling.md](error_handling.md)

Diagnostic display: UI reads `messageKey` from core/headless diagnostics only; no UI-specific validation duplication.

## Feature entry points (P1-1 – P1-5)

| UI action | Function | Module |
| --- | --- | --- |
| Compute | `buildIntermediateResult` | `liner/core` |
| Generate frame model | `mapToFrameModel` | `liner/mapper` |
| Attach to project | `attachLinerMappingToProject` | `liner/schema` |
| Headless validate | `createHeadlessLinerFrameProject` | `liner/headless` |

## Related Documents

- [ui_window_spec.md](ui_window_spec.md)
- [input_ui_behavior.md](input_ui_behavior.md)
- [state_management.md](state_management.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)

## Pre-Implementation Checklist

- [x] Route and panel ids enumerated.
- [x] Workflow and state boundaries documented.
- [x] i18n key groups listed.
- [x] Preparation constants exported from `frontend/src/liner/uiPreparation.ts`.
- [ ] React routes registered in app shell.
- [ ] Panel components implemented.
