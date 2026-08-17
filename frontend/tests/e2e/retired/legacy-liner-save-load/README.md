# Retired: legacy LINER save/load E2E specs (G-3)

> **Phase:** Lane G / G-3
> **Judgment:** RETIRE (with code-based evidence)
> **Date:** 2026-08-17 (JST)

## Files

- `p1-d05-liner-ui-save-load.spec.ts`
- `p3-f03-rdd-bridge-drawing-persistence.spec.ts`
- `p4-d01-multi-alignment.spec.ts`
- `p4-d02-ldist.spec.ts`
- `p4-d03-haunch.spec.ts`
- `p4-d04-hoso.spec.ts`
- `p4-d08-roundtrip.spec.ts`

## Why retired

These 7 specs exercise the legacy `/pro` LINER save/load flow against a
**LINER-only model built on an empty FEM project** (`createEmptyProject`:
`nodes/materials/sections/loadCases` all empty, `analysisSettings` without
`solver`).

**Current spec (A-05 Validation Boundary)** intentionally rejects this with
fail-closed `PROJECT_SAVE_ERROR`:

- `frontend/src/persistence/validationBoundary.ts:70-81` (`validatePersistedProjectForSave`)
- `schemas/project.schema.json` requires non-empty `nodes/materials/sections/loadCases`
  and `analysisSettings.solver` (`frontend/src/data/defaultProject.ts:133` adds
  `solver: "scipy_sparse"` for conformant bases).
- Confirmed in the debug run:
  `Failed to save project.json: /nodes: must NOT have fewer than 1 items; /materials: ... /analysisSettings: must have required property 'solver'`.

The specs encode a pre-A-05 save contract ("empty FEM + LINER-only is savable")
that the current product spec deliberately rejects. They are therefore stale
relative to the current spec, not a test bug.

## Equivalent coverage retained

The LINER save/load roundtrip functionality is fully covered elsewhere:

| Concern | Coverage |
|---|---|
| LINER save/load roundtrip (conformant base) | `frontend/src/App.linerSaveLoad.test.tsx:186` |
| Bridge layout spans/piers save+reload | `frontend/src/App.linerSaveLoad.test.tsx:261` |
| DrawingSettings persistence, DrawingDocument not persisted | `frontend/src/App.linerSaveLoad.test.tsx:409` |
| Fail-closed rejection of empty-transient save | `frontend/src/App.linerSaveLoad.test.tsx:499` |
| roadDesignDocument serialize/hydrate | `frontend/src/liner/adapters/linerProjectDraft.test.ts` (30 tests) |

## Disposition

- Removed from `FULL_SPECS` in `frontend/playwright.tiers.ts`.
- Excluded from default `test:e2e` via `testIgnore` in `frontend/playwright.config.ts`.
- Full rationale: `docs/development/lane-g-migration-support-matrix.md`.
