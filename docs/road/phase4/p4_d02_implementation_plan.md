# P4-D02 Implementation Plan — LDIST Equivalent

**Date:** 2026-07-17
**Status:** AUTHORITATIVE — supervisor PLAN_VERDICT APPROVED (2026-07-17)
**Authoritative scope:** [p4_d02_scope.md](p4_d02_scope.md) (AUTHORITATIVE)
**Extraction record:** [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md) (APPROVED — D02-C01 satisfied)
**Baseline:** `061ccfc` (P4-D01 COMPLETE)
**algorithmVersion:** `ldist-0.1.0`

---

## 1. Purpose

P4-D02（LDIST Equivalent）の **実装手順・ファイル分割・テスト・互換性** を定義する。本書は実装承認用計画であり、コード変更は含まない。

**In scope for implementation:** contracts → validation → pure calculator → persistence → state → UI → export builder → tests.
**Out of scope:** HAUNCH/HOSO、確認図注記、CSV ダウンロード UI、専用 extension key、RDD schema bump、結果キャッシュ。

---

## 2. Architecture summary

```text
LinerEditPage (utilities tab)
  ↔ BuildIntermediateInput.ldistJobs?  (UI passthrough, mirror drawingSettings pattern)
  ↔ domainDraftFromLinerDraft / buildIntermediateInputFromDomainDraft
  ↔ LinerDomainDraftVNext.ldistJobs[]
  ↔ domainDraftToRoadDesignDocument
       ├─ extensions["spacer.liner/domain-draft-vnext-geometry"] v0.2.0
       └─ ldistCapability.state ("supported" | "absent")
  ↔ buildIntermediateResult(active bundle)
  ↔ computeLdistResults(jobs, intermediate, sourceRevision)  [pure]
       → LdistResultRow[] + ComputationDiagnostic[]  (memory only)
  ↔ buildLdistReportSection / buildLdistResultsCsv  [pure, D02-C07]
```

---

## 3. File inventory

### 3.1 New files

| Path | Role | Gate |
| --- | --- | --- |
| `frontend/src/liner/core/ldist/types.ts` | Job/result types, `LDIST_ALGORITHM_VERSION` | D02-C02 |
| `frontend/src/liner/core/ldist/diagnostics.ts` | `LINER_LDIST_*` codes + message keys | D02-C05 |
| `frontend/src/liner/core/ldist/validateLdistJobs.ts` | Job-level fail-closed validation | D02-C05 |
| `frontend/src/liner/core/ldist/sectionLineIntersection.ts` | \(P(L,\Sigma)\), \(\mathbf{v}(L)\), \(\mathbf{v}(\Sigma)\) helpers | D02-C02 |
| `frontend/src/liner/core/ldist/computeGridDistance.ts` | Mode A / Mode B | D02-C02/C03 |
| `frontend/src/liner/core/ldist/computeOverhang.ts` | Pier-line overhang (wraps `pierLineGeometry`) | D02-C02/C03 |
| `frontend/src/liner/core/ldist/computeLdistResults.ts` | Orchestrator; attaches `algorithmVersion` | D02-C02 |
| `frontend/src/liner/core/ldist/index.ts` | Public exports | — |
| `frontend/src/liner/core/ldist/__tests__/computeLdistResults.test.ts` | Unit + O1 baselines | D02-C03 |
| `frontend/src/liner/core/ldist/__tests__/validateLdistJobs.test.ts` | Invalid ref tests | D02-C05 |
| `frontend/src/liner/core/ldist/__tests__/fixtures/gc-ldist-straight-orthogonal.json` | O1 straight | D02-C03 |
| `frontend/src/liner/core/ldist/__tests__/fixtures/gc-ldist-skew-pier.json` | O1 skew overhang | D02-C03 |
| `frontend/src/liner/core/ldist/__tests__/fixtures/gc-ldist-mode-b-sine.json` | Mode B | D02-C03 |
| `frontend/src/liner/core/ldist/__tests__/fixtures/gc-ldist-degenerate-sin-zero.json` | Degenerate fail-closed | D02-C05 |
| `frontend/src/liner/exports/ldistReportExport.ts` | `buildLdistResultsCsv`, `buildLdistReportSection` | D02-C07 |
| `frontend/src/liner/exports/ldistReportExport.test.ts` | Column keys, row count | D02-C07 |
| `frontend/src/liner/components/LdistJobEditor.tsx` | Job list + forms | D02-C06 |
| `frontend/src/liner/components/LdistResultsPanel.tsx` | Results table + diagnostics | D02-C06 |
| `frontend/src/liner/components/LdistDiagnosticsPanel.tsx` | LDIST-specific diagnostic display | D02-C06 |
| `frontend/src/liner/components/__tests__/LdistJobEditor.test.tsx` | Component smoke | D02-C06 |
| `frontend/tests/e2e/p4-d02-ldist.spec.ts` | Save/load + results visible (optional D08 defer) | D02-C06 |

### 3.2 Modified files（最小差分）

| Path | Change |
| --- | --- |
| `frontend/src/liner/schema/types.ts` | `LdistJobDraft`, `LdistLinePair`, enums; `LinerDomainDraftVNext.ldistJobs?` |
| `frontend/src/liner/core/pipeline/pipeline.ts` | `BuildIntermediateInput.ldistJobs?` passthrough (optional) |
| `frontend/src/liner/core/diagnostics.ts` | Re-export or register LDIST codes if central registry required |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `ldistCapability` from jobs count; preserve `ldistJobs` in geometry payload; `normalizeLinerDomainDraft` accepts field |
| `frontend/src/liner/adapters/linerProjectDraft.ts` | `domainDraftFromLinerDraft` / `buildIntermediateInputFromDomainDraft` round-trip `ldistJobs` |
| `frontend/src/liner/adapters/linerUiAdapter.ts` | `updateLinerLdistJobs`, `addLdistJob`, `removeLdistJob`, `updateLdistJob` |
| `frontend/src/liner/schema/projectLinerMigration.ts` | Hydrate: default `ldistJobs` undefined; no legacy migration step in D02 |
| `frontend/src/liner/uiPreparation.ts` | Add `"utilities"` to `LinerSetupTabId`, `LINER_SETUP_TAB_IDS`, label key |
| `frontend/src/liner/pages/LinerSetupTabs.tsx` | No logic change (consumes extended tab ids) |
| `frontend/src/liner/pages/LinerEditPage.tsx` | Register utilities tab panel; wire Ldist components; recompute on view |
| `frontend/src/liner/pages/LinerEditPage.test.tsx` | Tab presence; review tab unchanged |
| `frontend/src/i18n/ja.ts` | `liner.setupTabs.utilities`, `liner.ldist.*` strings |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.test.ts` | `ldistJobs` round-trip; capability state |
| `frontend/src/liner/adapters/linerProjectDraft.test.ts` | Save payload includes `ldistJobs` in extension |
| `frontend/src/App.linerSaveLoad.test.tsx` | Optional: assert `ldistCapability` when jobs present |

**Not modified in D02:** `roadDesignDocument.ts` schema (capability block already exists), `contractVersionRegistry`, golden GC-01..07 fixtures, Bridge Layout components, formal drawing builders, `report_output_spec.md` full HTML section (D06).

---

## 4. Type definitions / domain model

### 4.1 Schema (`schema/types.ts`)

Align with scope §7.2 and extraction record §4:

```typescript
export type LdistJobKind = "grid_distance" | "overhang";
export type LdistDistanceMode = "mode_a" | "mode_b";
export type LdistStationScope =
  | "all_generated"
  | { stationIds: string[] }
  | { physicalDistances: number[] };

export interface LdistLinePairDraft {
  fromLineId: string;
  toLineId: string;
}

export interface LdistJobDraft {
  id: string;
  alignmentId: string;
  kind: LdistJobKind;
  label?: string;
  spanId?: string;
  stationScope: LdistStationScope;
  sectionIds?: string[];
  distanceMode?: LdistDistanceMode;
  referenceLineId?: string;
  pairs: LdistLinePairDraft[];
  enabled?: boolean;
  leftLineId?: string;
  rightLineId?: string;
  pierId?: string;
}

// LinerDomainDraftVNext
ldistJobs?: LdistJobDraft[];
```

### 4.2 Calculator types (`core/ldist/types.ts`)

```typescript
export const LDIST_ALGORITHM_VERSION = "ldist-0.1.0" as const;

export interface LdistResultRow { /* scope §7.3 */ }

export interface LdistComputeInput {
  jobs: readonly LdistJobDraft[];
  intermediate: CanonicalLinerIntermediateResult;
  sourceRevision: string;
  lineIdsByAlignment: ReadonlyMap<string, ReadonlySet<string>>;
  piersByAlignment: ReadonlyMap<string, readonly PierDraft[]>;
}

export interface LdistComputeOutput {
  rows: LdistResultRow[];
  diagnostics: ComputationDiagnostic[];
}
```

### 4.3 UI passthrough

Add to `BuildIntermediateInput`:

```typescript
ldistJobs?: LdistJobDraft[];
```

Pattern mirrors `drawingSettings`: edited in UI draft, merged into `LinerDomainDraftVNext` on save via `domainDraftFromLinerDraft`.

---

## 5. Service / calculator（pure）

### 5.1 Module layout

| Function | Responsibility |
| --- | --- |
| `validateLdistJobs(jobs, context)` | Pre-flight; returns diagnostics; blocks invalid jobs before numeric work |
| `resolveStationList(job, intermediate)` | Intersect job scope with generated stations |
| `resolveSections(job, intermediate, station)` | Filter `sections` by `sectionIds` |
| `intersectLineWithSection(lineId, section, grid)` | Returns \(P(L,\Sigma)\) or null |
| `lineDirectionAtSection(lineId, section, grid)` | \(\mathbf{v}(L)\) |
| `sectionTraverseDirection(section)` | \(\mathbf{v}(\Sigma)\) left→right |
| `computeGridDistanceModeA(pair, ...)` | \(\|P_{from}-P_{to}\|\) |
| `computeGridDistanceModeB(pair, referenceLineId, ...)` | × \(\sin(\theta_{ref})\); degenerate fail-closed |
| `computeOverhangAtStation(job, pier, section, ...)` | `distancePointToPierLine` for left/right |
| `computeLdistResults(input)` | Main entry; **no React, no IO, no mutation** |

### 5.2 algorithmVersion

- Constant: `LDIST_ALGORITHM_VERSION = "ldist-0.1.0"`
- Copied to every `LdistResultRow.algorithmVersion`
- Bump only with extraction record amendment + O1 fixture update

### 5.3 Dependencies（read-only）

- `buildIntermediateResult` output: `sections`, `grid`, `stations`, `piers`, `spans`
- `pierLineGeometry`: `pierLineDirectionFromSkew`, `distancePointToPierLine`
- `numerical_accuracy.md`: length 1e-6 m; degenerate sin threshold aligned with coordinate tolerance

### 5.4 Explicit non-goals in calculator

- No HAUNCH/HOSO elevation sampling
- No CSV/string formatting (export module only)
- No persistence reads/writes
- No auto-expansion of `pairs` from line ID lists

---

## 6. State management

### 6.1 Ownership (per `uiPreparation.ts` boundaries)

| Slice | Owner | LDIST data |
| --- | --- | --- |
| `draft` (BuildIntermediateInput) | UI | `ldistJobs` edited here |
| `domain` (LinerDomainDraftVNext) | project / RDD | `ldistJobs` persisted |
| `intermediate` | linerCore | Input to calculator; **not** stored |
| LDIST results | UI session / memo | Recomputed on tab open or job change; **never persisted** |

### 6.2 Adapter functions (`linerUiAdapter.ts`)

| Function | Behavior |
| --- | --- |
| `updateLinerLdistJobs(draft, jobs)` | Replace full array |
| `addLdistJob(draft, partial)` | Generate stable id (`ldist-job-${n}` or deriveStableUuid) |
| `updateLdistJob(draft, jobId, patch)` | Immutable update one job |
| `removeLdistJob(draft, jobId)` | Remove by id |

Default new job: `alignmentId = draft.activeAlignmentId`, `kind = "grid_distance"`, `distanceMode = "mode_a"`, `pairs = []`, `stationScope = "all_generated"`.

### 6.3 UI recompute trigger

In `LinerEditPage` utilities tab:

1. `useMemo` → `buildIntermediateResult(draft)` (existing pattern or shared hook)
2. `useMemo` → `computeLdistResults({ jobs: draft.ldistJobs ?? [], intermediate, sourceRevision })`
3. Display rows in `LdistResultsPanel`; errors in `LdistDiagnosticsPanel`
4. On `commitDraft` / save: `ldistJobs` flow to RDD via existing save path

### 6.4 Stale handling

If `intermediate.sourceRevision` changes after geometry edit, results auto-refresh via memo deps. No separate stale flag required for D02.

---

## 7. UI components

### 7.1 Tab registration

| Item | Value |
| --- | --- |
| Tab id | `"utilities"` (preferred; scope allows `ldist` — **freeze: `utilities`**) |
| Position | After `crossSection`, before `review` |
| `data-testid` | `liner-setup-tab-utilities`, `liner-setup-tabpanel-utilities` |
| Review tab | **Unchanged** (Bridge Layout only) |

Update `LINER_SETUP_TAB_IDS` order:

```typescript
["line", "station", "height", "vertical", "crossSection", "utilities", "review"]
```

### 7.2 Components

| Component | Responsibility |
| --- | --- |
| `LdistJobEditor` | Job CRUD; kind selector; pair editor (from/to line dropdowns from active alignment offset lines); mode A/B; reference line; overhang left/right; optional spanId filter; pierId when needed |
| `LdistResultsPanel` | Table: station, from/to lines, distanceM, overhangM, side |
| `LdistDiagnosticsPanel` | Filter `LINER_LDIST_*` from compute output |

Reuse patterns from `BridgeLayoutEditor` / `AlignmentLineManager` for list+form layout and `data-testid` conventions.

### 7.3 i18n (`ja.ts`)

New groups under `liner.ldist`: `title`, `jobKind`, `distanceMode`, `pairs`, `results`, `diagnostics`, field labels. Tab label: `liner.setupTabs.utilities` (e.g. 「ユーティリティ」or 「LDIST」— copy pass can refine).

---

## 8. Persistence

### 8.1 Write path

1. `withProjectLinerDraft` → `domainDraftFromLinerDraft` includes `ldistJobs` from draft
2. `domainDraftToRoadDesignDocument`:
   - `buildGeometryPayload` serializes full `domainDraft` (includes `ldistJobs`)
   - `ldistCapability: { state: jobs.length > 0 ? "supported" : "absent" }`
3. `project.liner.roadDesignDocument` only (no `domainDraft` in saved JSON — existing P3 policy)

### 8.2 Read path

1. `roadDesignDocumentToDomainDraft` → `normalizeLinerDomainDraft` preserves `ldistJobs`
2. `buildIntermediateInputFromDomainDraft` sets `ldistJobs` on returned draft
3. Missing field → `undefined` (not `[]` required); capability `absent`

### 8.3 Constraints (N2)

| Rule | Enforcement |
| --- | --- |
| Geometry extension v0.2.0 only | No new extension key |
| RDD `schemaVersion` 0.1.0 | No bump; test assert in mapper test |
| No result cache | Calculator output never written to extension/RDD |
| `git add` explicit paths | Per AGENTS.md |

### 8.4 Mapper changes detail

`linerDomainDraftRoadDesignMapper.ts`:

- Replace hardcoded `ldistCapability: { state: "absent" }` with dynamic state
- `normalizeLinerDomainDraft`: accept optional `ldistJobs` array; validate plain objects
- `validateDomainDraftForMapping`: optional LDIST job validation hook (or defer to `validateLdistJobs` at save)

---

## 9. Migration / hydrate

| Scenario | Behavior |
| --- | --- |
| Pre-D02 projects | No `ldistJobs` field; `ldistCapability: absent`; hydrate OK |
| First save with jobs | Field appears in extension JSON; capability → `supported` |
| Reload | Jobs restored; results recomputed in UI |
| Legacy `.lin` / importer | **No D02 migration step** — P4-D07 |
| `projectLinerMigration.ts` | Ensure `normalizeDomainDraftFromMetadata` does not strip unknown `ldistJobs` |
| Invalid jobs on hydrate | Fail-closed at save validation; display diagnostics in UI without silent drop |

No `MigrationId` registry entry in D02.

---

## 10. Validation / fail-closed codes

Register in `frontend/src/liner/core/ldist/diagnostics.ts`:

| Code | Level | When |
| --- | --- | --- |
| `LINER_LDIST_ALIGNMENT_REFERENCE_MISSING` | error | Unknown `alignmentId` |
| `LINER_LDIST_LINE_REFERENCE_MISSING` | error | Unknown `fromLineId` / `toLineId` / `leftLineId` / `rightLineId` / `referenceLineId` |
| `LINER_LDIST_REFERENCE_LINE_REQUIRED` | error | `mode_b` without `referenceLineId` |
| `LINER_LDIST_STATION_OUT_OF_RANGE` | error | Station outside alignment |
| `LINER_LDIST_DEGENERATE_GEOMETRY` | error | No intersection; coincident points; \(\|sin\theta\|\approx 0\) |
| `LINER_LDIST_PIER_REFERENCE_INVALID` | error | Unknown or out-of-scope `pierId` |
| `LINER_LDIST_PIER_ID_REQUIRED` | error | Multiple piers at station, `pierId` omitted |
| `LINER_LDIST_JOB_SCHEMA_INVALID` | error | Missing required fields per kind |
| `LINER_LDIST_PAIRS_EMPTY` | error | `grid_distance` with empty `pairs` |

Each code maps to `messageKey` under `liner.ldist.diagnostics.*` for i18n.

Export builder: if any error-level LDIST diagnostic present, return empty section / block export (fail-closed per scope).

---

## 11. Testing plan

### 11.1 Unit — calculator (`core/ldist/__tests__/`)

| Test file | Coverage | Gate |
| --- | --- | --- |
| `computeLdistResults.test.ts` | Mode A straight (O1), Mode B sine, overhang skew, degenerate | C02, C03 |
| `validateLdistJobs.test.ts` | All fail-closed codes | C05 |
| `sectionLineIntersection.test.ts` | Intersection helpers (if split) | C02 |

O1 fixtures per extraction record §5; hand oracle values documented in test comments.

### 11.2 Unit — persistence

| Test file | Coverage | Gate |
| --- | --- | --- |
| `linerDomainDraftRoadDesignMapper.test.ts` | `ldistJobs` round-trip; capability `supported`/`absent` | C04 |
| `linerProjectDraft.test.ts` | Saved extension contains jobs; reload restores | C04 |

### 11.3 Unit — export

| Test file | Coverage | Gate |
| --- | --- | --- |
| `ldistReportExport.test.ts` | Column keys match scope; row count; empty on errors | C07 |

### 11.4 Component

| Test file | Coverage | Gate |
| --- | --- | --- |
| `LdistJobEditor.test.tsx` | Render, add job, pair row | C06 |
| `LinerEditPage.test.tsx` | Utilities tab exists; review tab still Bridge Layout | C06 |

### 11.5 E2E

| Spec | Coverage | Gate |
| --- | --- | --- |
| `p4-d02-ldist.spec.ts` | Create job → results visible → save → reload restores jobs | C06 (E2E trace) |

Pattern: `p4-d01-multi-alignment.spec.ts` (extension key assert, save JSON).

### 11.6 Regression

After each logical commit batch:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- src/liner src/contracts/persistence
cd frontend && npm run test:regression
```

Must not break: P1–P3 E2E, P4-D01 multi-alignment, GC-01..07 golden fixtures.

---

## 12. Implementation order

Recommended sequence (each step = one logical commit / review unit):

| Step | Work | Delivers |
| --- | --- | --- |
| **S1** | Types: `schema/types.ts`, `core/ldist/types.ts`, `BuildIntermediateInput.ldistJobs` | Contracts frozen |
| **S2** | `ldist/diagnostics.ts`, `validateLdistJobs.ts` + tests | D02-C05 partial |
| **S3** | `sectionLineIntersection.ts`, `computeGridDistance.ts`, `computeOverhang.ts`, `computeLdistResults.ts` + O1 fixtures/tests | D02-C02/C03 |
| **S4** | Mapper + `linerProjectDraft` round-trip + tests | D02-C04 |
| **S5** | `linerUiAdapter` job mutators | State API |
| **S6** | `ldistReportExport.ts` + test | D02-C07 |
| **S7** | `uiPreparation` tab id, `ja.ts`, `LdistJobEditor`, `LdistResultsPanel`, `LinerEditPage` wire-up + component tests | D02-C06 |
| **S8** | `p4-d02-ldist.spec.ts` E2E | C06 evidence |
| **S9** | Verification note paths only (no code): gate checklist in PR description | Review |

**Dependency rule:** S3 before S7 (UI needs calculator); S4 before S8 (E2E needs save); S6 can parallel S5 after S3.

---

## 13. Logical commit / PR split

Single PR is acceptable; **commits must be logical** for rollback:

| Commit | Paths (explicit `git add`) |
| --- | --- |
| C1 `feat(ldist): add schema types and diagnostic codes` | `schema/types.ts`, `core/ldist/types.ts`, `core/ldist/diagnostics.ts`, `pipeline.ts` |
| C2 `feat(ldist): add job validation` | `validateLdistJobs.ts`, `__tests__/validateLdistJobs.test.ts` |
| C3 `feat(ldist): implement pure calculator ldist-0.1.0` | `core/ldist/*.ts` (except tests), fixtures, `computeLdistResults.test.ts` |
| C4 `feat(ldist): persist ldistJobs in geometry extension` | `linerDomainDraftRoadDesignMapper.ts`, `linerProjectDraft.ts`, mapper tests |
| C5 `feat(ldist): add UI adapter helpers` | `linerUiAdapter.ts` |
| C6 `feat(ldist): add report/csv export builder` | `exports/ldistReportExport.ts`, test |
| C7 `feat(ldist): add utilities tab and LDIST editor UI` | `uiPreparation.ts`, `LinerEditPage.tsx`, components, `ja.ts`, page tests |
| C8 `test(ldist): add E2E save/load and results` | `p4-d02-ldist.spec.ts` |

---

## 14. Rollback policy

| Rollback unit | Action | User impact |
| --- | --- | --- |
| C8 only | Remove E2E spec | None in prod |
| C7 | Remove utilities tab + components | Jobs still in JSON if saved — hidden until restored |
| C6 | Remove export builder | No CSV section; calculator unaffected |
| C4 | Revert mapper to `ldistCapability: absent`; strip read/write `ldistJobs` | Saved jobs in extension become inert (data preserved in JSON) |
| C3 | Remove calculator module | UI shows empty results |
| Full revert | Reverse C1–C8 | Projects saved during D02 retain extension field (inert); no schema bump simplifies rollback |

**Stop condition:** If `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` bump appears necessary → stop per planning freeze S1.

---

## 15. Backward compatibility

### 15.1 P4-D01

- Multi-alignment IDs unchanged; LDIST jobs reference `alignmentId` per bundle
- `activeAlignmentId` / `activeLineId` behavior unchanged
- `topologyCapability` logic untouched
- `p4-d01-multi-alignment.spec.ts` must pass without modification (unless tab count assertion added — update explicitly)

### 15.2 Phase 0–3

- `buildIntermediateResult` signature backward compatible (`ldistJobs` optional on input, ignored by pipeline)
- Bridge Layout on review tab unchanged
- Formal drawing builders unchanged
- Golden fixtures GC-01..07 unchanged
- `App.linerSaveLoad.test.tsx` save shape: still no top-level `domainDraft`

### 15.3 Forward compatibility

- `ldistJobs` optional field — old clients ignore
- Dedicated extension key deferred to D07
- Export HTML download deferred to D06

---

## 16. D03+ overscope prevention checklist

実装各コミット前に確認:

- [ ] **No** `haunchCapability` / `hosoCapability` changes beyond existing stubs
- [ ] **No** HAUNCH/HOSO calculator modules or JIP §6/§7 logic
- [ ] **No** confirmation diagram / dimension line overlays (P4-D05)
- [ ] **No** CSV or HTML **download button** in UI (export builder only)
- [ ] **No** full `report_output_spec.md` HTML renderer (D06)
- [ ] **No** dedicated `spacer.liner/ldist-*` extension key
- [ ] **No** `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` bump
- [ ] **No** persisting `LdistResultRow[]` to RDD or extension
- [ ] **No** `domainDraft` or `DrawingDocument` canonical write
- [ ] **No** branch/merge topology fields
- [ ] **No** auto pair expansion (`from×to` Cartesian product)
- [ ] **No** unrelated refactor (formatting, rename sweeps, tab reorder beyond utilities insert)
- [ ] **No** touch `Bridge_Modeler_V2_改良方針案.txt`

---

## 17. Completion gate traceability

| Gate | Implementation plan section |
| --- | --- |
| D02-C01 | Extraction record APPROVED (pre-requisite met) |
| D02-C02 | §5 calculator, `LDIST_ALGORITHM_VERSION` |
| D02-C03 | §11.1 O1 fixtures |
| D02-C04 | §8 persistence, §11.2 |
| D02-C05 | §10 validation codes, §11.1 |
| D02-C06 | §7 UI, §11.4–11.5 |
| D02-C07 | §6 export builder, §11.3 |

---

## 18. Open items (plan level only)

| Item | Owner | Notes |
| --- | --- | --- |
| Tab label copy（「ユーティリティ」vs「LDIST」） | Supervisor / i18n | Does not block S1–S3 |
| E2E in D02 vs D08 only | Supervisor | Plan includes `p4-d02-ldist.spec.ts` for C06 evidence |
| `sectionLineIntersection` using grid points vs section `points` | Implementer | Prefer `SectionSliceResult.points` with line role/id match; document in C3 PR |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-07-17 | Initial plan — post scope/extraction APPROVED |
