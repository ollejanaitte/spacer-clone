# Apollo Phase 1-NN Unit 2 Scope Freeze

- Effective date: Tuesday, July 28, 2026
- Baseline branch: `main`
- Baseline repository: `/home/masaharu/Projects/spacer-clone-main`
- Scope verdict: PASS

## In Scope

- Versioned Apollo Phase 1-NN unit2 sidecar draft stored under `project.apolloPhase1Unit2`
- Project metadata shell for ID, name, description, created/updated timestamps, provisional state
- Node editor with add, edit, delete guard, duplicate, reorder, selection, comments, active state
- Member editor with node/material reference wiring, self-member rejection, duplicate, reorder
- Support editor with `FREE` / `FIXED` / `UNDEFINED` DOF states only
- Material reference shell with identity-only fields and in-use delete guard
- Deterministic save / reload / round-trip through existing project open/save flows
- Visualization reuse through the existing `Viewer3D` / fallback 2D path
- Table-to-view selection synchronization
- Audit trail entries for add, edit, delete, duplicate, save, reload, reject
- Electron runtime verification with screenshots and persisted round-trip evidence

## Out of Scope

- Solver execution
- Stiffness assembly
- Load processing numerics
- Material constants
- Section properties
- Verified result badges
- Result publication
- SPACER parity claims
- Production design release

## Gate

- Non-numeric implementation remained within Phase 1-NN boundaries.
- Numeric execution and publication remain fail-closed.
