# 01 — Preflight and Existing Code Inventory

> **Authority:** Phase 4-A
> **BASE (Phase 3 closeout seal):** `52f1f536cd4eae1da925e26432e75ffeea0316ab`
> **Model:** Composer 2.5 (implementation) / Grok 4.5 (scope audit)

## 1. Preflight results

```
pwd:        /home/masaharu/Projects/spacer-clone
branch:     main
HEAD:       52f1f536cd4eae1da925e26432e75ffeea0316ab
origin/main: 52f1f1f536cd4eae1da925e26432e75ffeea0316ab   <- match=YES
status:     clean (git status --porcelain empty)
remote:     origin https://github.com/ollejanaitte/spacer-clone.git (fetch/push)
Phase 3:    COMPLETE (STEP9_PHASE3_STATUS=COMPLETE, 52f1f53)
Phase 4 gate: GO_WITH_NON_NUMERIC_RESTRICTIONS
```

Working tree clean; local == origin == 52f1f53; no merge/rebase/cherry-pick in progress. Phase 3 verdicts confirmed on main. Condition met to proceed to Phase 4-A.

## 2. Environment / toolchain

- Project manifests live in `frontend/` (NOT repo root): `frontend/package.json`, `frontend/tsconfig*.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `frontend/vitest.regression.config.ts`.
- `node_modules` is present under `frontend/node_modules/`; bins available: `tsc`, `vitest`, `vite`, `rimraf` (`.bin`).
- Root `package.json`/`tsconfig.json` absent by design (root is non-npm). All `npx`/`npm run` invocations run from `frontend/`.
- **NOTE (integrity):** in this sandbox `npx tsc -b` from the **repo root** fails ("This is not the tsc command you are looking for" / TypeScript not installed at root). Phase 4 typecheck/lint/build/test MUST be invoked from `frontend/` (`cd frontend && npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`). Phase 3 was docs-only (0 source changes) so no typecheck was required; Phase 4 changes TypeScript, so from-frontend invocation is mandatory.

## 3. Existing Report Model code inventory

| artifact | path | role |
|---|---|---|
| ReportModel scaffold | `frontend/src/apollo/report/reportModel.ts` (468 lines) | `REPORT_MODEL_SCHEMA_VERSION`, `REPORT_CHAPTER_REGISTRY` (ch-CH-*), `ReportRow`, `ReportChapter`, `ReportModel`, `row()` helper, `buildReportModel`, `assertDevelopmentReportExportable`, `assertFormalReportRejected`, `reportModelToJson`, `reportModelToCalculationCsv` (no zero-fill), `reportModelToQuantityCsv`, `renderReportModelHtml` (HTML — external renderer), `buildAuditManifest` |
| Export gate | `frontend/src/apollo/report/reportExport.ts` (72 lines) | `downloadDevelopmentReportJson`, `downloadCalculationResultsCsv`, `downloadAuditManifest`, `openDevelopmentReportPreview`, `tryBuildFormalReport` (never), `createDevelopmentReport` |
| Existing tests | `frontend/src/apollo/__tests__/reportModel.test.ts` (67 lines, 4 tests) | registry-order/no-zero-fill/STALE-FORMAL reject/JSON checksums+quantity rows |
| UI panel (DO NOT EDIT) | `frontend/src/apollo/components/ReportModelDevelopmentPanel.tsx` | consumer of `buildReportModel`/`createDevelopmentReport` |

### 3.1 Existing test coverage (reportModel.test.ts, `fillSimpleSingleBridgeStructureInput` based)
1. builds all registry chapters in order without formal OK/NG
2. does not zero-fill missing calculation series
3. rejects STALE and FORMAL export
4. JSON includes checksums and quantity chapter values

### 3.2 Fixtures available for Phase 4-F
- `frontend/src/testing/bridgeStructureFixtures.ts`:
  - `fillSimpleSingleBridgeStructureInput(project)` → SIMPLE_SINGLE (5-span? actually single-span simple)
  - `fillContinuousBridgeStructureInput(project)` → 5-span CONTINUOUS, 200 m (40 m each), sets `draft.bridgeSystem = BridgeSystem.CONTINUOUS`
- `frontend/src/apollo/bridgeStructure/index.ts` exports `generateBridgeStructureFromInput`, `getBridgeStructureInputDraft`, `withBridgeStructureField`.

## 4. Domain source references (from report_entity_matrix.csv)

- `BridgeSystem.CONTINUOUS` → `draft.bridgeSystem` (reportEntity matrix E-BRIDGE-SYSTEM; reportModel.ts:175)
- `spanSystem` → `apolloBsdd.phase1ScopeAssertion.spanSystem` (generateBsdd.ts:467)
- `draft.spanLength` → NOT_AVAILABLE for CONTINUOUS (U-03 verdict B; CP-07)
- `computeGirderSectionProperties` (sectionProperties.ts:48-108) → CP-13, NOT_AVAILABLE for CONTINUOUS
- `getBridgeStructureUnitWeightAdoption` (adoption.ts:70) → CP-12
- `isBridgeStructureGenerationCurrent` (generateBsdd.ts:558-561) → STALE (CP-21)
- `buildQuantityModel` (quantityModel.ts:632) → quantityChecksum (CP-25)
- `computeContentChecksum` (contracts/legacy/checksum) → resultChecksum
- `buildInputChecksum` (../quantity/quantityModel) → inputChecksum

## 5. Change-prohibited zones (must remain untouched)

Per Phase 3 §14 / directive §4:

```
frontend/src/apollo/phase1ScopeGuard.ts            (scope guard)
frontend/src/apollo/numericAuthorityGuard.ts       (numeric authority)
frontend/src/apollo/featureFlag.ts                  (feature flags)
frontend/src/apollo/appurtenanceHaunchAnalysisAdapter.ts (analysis - not touched)
frontend/src/apollo/apolloStlExport.ts              (STL generation - manifest/summary only)
frontend/src/apollo/bridgeStructureSolids.ts        (3D solid generation - summary only)
frontend/src/styles.css                              (CSS - no UI)
frontend/src/apollo/components/*                     (UI components - no UI)
backend/                                             (no backend)
package-lock.json / lockfile                         (no deps)
apolloBridgeStructureInput schemaVersion semantics    (no migration shim change)
```

## 6. Phase 3 → Phase 4 spec correspondence (scaffold vs frozen contract)

- Phase 3 mandates **CP-01..CP-34** canonical chapter IDs; existing scaffold uses **CH-COVER, CH-DESIGN-COND, CH-STRUCTURE, CH-INPUTS, CH-SECTION, CH-LOADS, CH-ANALYSIS-SETTINGS, CH-REACTIONS, CH-SHEAR, CH-MOMENT, CH-DEFLECTION, CH-DEMAND, CH-QUANTITY, CH-DRAWING-REF, CH-WARNINGS, CH-AUDIT** (16 CH-*). Phase 4 transformer must emit CP-* IDs with a CH-* deprecated alias map for backward compatibility (reportModel.ts:25-42 registry is the CH-* scaffold → map to CP-*).
- `ReportRow` must be expanded per R-13..R-22: add `display` (raw/display split), `unit`, `stale`, `missingReason`, `legacyStatus`, keep `value/status/source`. Existing `row()` helper centralizes this (reportModel.ts:85).
- CONTINUOUS path: CP-07 spanLength NOT_AVAILABLE (draft.spanLength omitted), CP-13 section NOT_AVAILABLE (spanLength gate), CP-30..34 NOT_AVAILABLE, CP-06 emits BridgeSystem.CONTINUOUS non-numeric, watermark present (R-01..R-22).
- PROHIBITED guard: no O-19..O-30 value in any report; formalOkNgEmitted=false; authorizationStatus=NOT_GRANTED.

## 7. Implementation matrix reference

See `implementation_matrix.csv` (artifact-level change/prohibit decision).

## 8. Risk

- Root `package.json` absence is BY DESIGN (frontend-scoped project); do NOT create a root manifest (would be an unexpected tracked file — stop condition).
- `fillContinuousBridgeStructureInput` produces 5-span CONTINUOUS; must verify it also leaves CP-13 NOT_AVAILABLE (spanLength gate / U-03). If fixture needs tweak, prefer test-local override over editing fixtures.
