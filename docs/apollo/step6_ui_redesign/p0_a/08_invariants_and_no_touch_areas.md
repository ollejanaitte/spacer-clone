# 08 — Invariants and No-Touch Areas

**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`  
UI redesign may change **presentation and layout** only. The following must remain unchanged unless a later explicitly scoped non-UI step authorizes otherwise.

## Formal authorization (frozen)

| Token | Required value |
|-------|----------------|
| `NUMERIC_DESIGN_AUTHORIZATION` | `NOT_GRANTED` |
| `DESIGN_OR_CONSTRUCTION_USE` | `PROHIBITED` |
| `FORMAL_RELEASE_READINESS` | `NO_GO_PENDING_HUMAN_VALIDATION` (do not advance in UI step) |

Hardcoded in workflow summary, report/quantity/drawing/output models, evaluators, and E2E assertions.

## Workflow SoR (frozen)

| Path | Why |
|------|-----|
| `workflow/evaluators.ts` | Status derivation |
| `workflow/selectors.ts` | Readiness including viz |
| `workflow/dependencies.ts` | Prerequisite graph |
| `workflow/capabilityRegistry.ts` | PLANNED vs implemented |
| `workflow/registry.ts` WF-01..15 IDs/order/meanings | Frozen control-plane contract |
| `workflow/types.ts` status enums / model shape | State model contract |

UI may rearrange how steps are shown; must not invent alternate evaluation.

## Guided SoR (frozen meanings)

| Path | Why |
|------|-----|
| G01–G15 IDs and order (`guided/types.ts`, `slides.ts` themes/anchors) | DEC-S5-0009 |
| Single `ProjectModel` data source shared with Workflow/panels | No dual model |

Presentation of progress chrome may change; slide meanings and wfAnchor semantics must not.

## Canonical data / persistence (frozen)

| Area | Paths (representative) |
|------|------------------------|
| bridgeStructure generation/validation | `bridgeStructure/**` |
| Visualization **generation** | `visualization/builder.ts`, solids modules |
| Export / STL | `export/**` |
| Workspace / save-reload | `workspace.ts`, import/export helpers |
| Schema / checksum / STALE fingerprint | unit2 schema, dirtyFingerprint, STALE evaluators |
| Quantity / load / analysis / report models | `quantity/**`, `loads/**`, `analysis/**`, `report/**` |

## Japanese UI foundation (maintain)

| Area | Constraint |
|------|------------|
| `i18n/catalog.ts` and typed getters | Keep L1 Japanese; do not reintroduce raw English to L1 |
| `TechnicalDetails` L3 pattern | Technical tokens remain collapsible |
| Allowlisted codes (G##, WF-##, diagnostic codes) | Remain as technical IDs |

Catalog **presentation** may gain keys for new chrome labels; key **semantics** of authorization/status must not flip.

## Explicitly out of Step 6-UI-P0 / early UI PRs

- Step 4-D〜4-H implementation
- Formal engineering approval / numeric grant
- Schema version bumps
- Canonical sample geometry changes
- Solver / analysis numeric changes

## Direct edit candidates (preview only — refined in P0-C)

- `ApolloPhase1Shell.tsx` (chrome/layout/mounting)
- `GuidedModeShell.tsx` (progress/footer presentation)
- `WorkflowControlScreen.tsx` / `WorkflowStepCard.tsx` / progress summary (list IA)
- `AuthorizationBanner.tsx` / `TechnicalDetails.tsx` (presentation)
- `frontend/src/styles.css` (apollo-* layout/responsive)
- Apollo component + Playwright tests that assert chrome structure

## Conditional edit candidates (preview)

- `workflow/navigation.ts` (scroll targets / testids — e.g. orphan `apollo-model-view-panel`)
- `i18n/**` new chrome labels only
- `Viewer3D.tsx` / `viewer/types.ts` only if layout chrome requires it

## Open questions recorded for later steps

1. Should the legacy 6-step `STEP_DEFINITIONS` bar be retired visually in favor of G01–G15, or mapped as chapter groupings?
2. Should Workflow live primarily in list/expert mode rather than co-mounting on guided basics?
3. Align `apollo-model-view-panel` vs `apollo-topology-view` testid for navigation.
4. How many AuthorizationBanner instances remain after compact global status?
5. Tablet breakpoint choice (between 800 and 1200) for explicit up/down vs side-by-side.
