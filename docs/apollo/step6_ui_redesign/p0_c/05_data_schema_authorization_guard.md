# 05 — Data / Schema / Authorization Guard

**BASE_MAIN_SHA:** `ee045b353ade480a9d2a857c7f48215973274273`

## Required answers for Step 6 UI program

| Question | Answer |
|----------|--------|
| SCHEMA_CHANGE_REQUIRED | **NO** |
| CANONICAL_DATA_CHANGE_REQUIRED | **NO** |
| WORKFLOW_LOGIC_CHANGE_REQUIRED | **NO** |
| CHECKSUM_CHANGE_REQUIRED | **NO** |
| FORMAL_AUTHORIZATION_CHANGE | **NO** |
| VIEWER_INDEPENDENT_DATA_SOURCE | **NO** (forbidden) |
| GUIDED_INDEPENDENT_DATA_SOURCE | **NO** (forbidden) |

## Guard rules for every implementation PR

1. Diff must not include `schemas/**`, workspace serialization format, or unit2 schema version bumps.
2. Diff must not include `bridgeStructure/**` generation/validation (except if a later non-UI step explicitly authorizes — not Step 6 UI).
3. Diff must not include `workflow/evaluators.ts`, `selectors.ts`, `dependencies.ts`, `capabilityRegistry.ts`, or WF id/order changes in `registry.ts`.
4. Diff must not set any authorization status to granted.
5. Viewer must continue to receive `buildApolloVisualizationModel` output from the same `ProjectModel`.
6. Guided / Workflow / panels must continue to read the same `ProjectModel`.
7. Before/after serialize + checksum compare on a golden sample for any PR that touches save UI wiring (even if accidental).

## Presentation-only authorization changes allowed

- Move/compact `apollo-provisional-banner`
- Add compact variant props to `AuthorizationBanner`
- Relocate L3 into `TechnicalDetails`
- Add short_ja catalog entries **without** changing token meanings

## Evidence anchors

- `workflow/index.ts` authorizationSummary NOT_GRANTED
- `AuthorizationBanner` + `i18n/authorizationMessages` / catalog
- E2E S5R-012 and JP auth surfaces
- `quantityModel` / `reportModel` fail-closed grants
