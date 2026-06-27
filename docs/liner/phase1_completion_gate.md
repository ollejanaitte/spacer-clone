# Phase 1 Completion Gate Review

**Repository:** spacer-clone  
**Review date:** 2026-06-27  
**Reviewer role:** Phase 1 Completion Gate  
**Scope:** Read-only gate review of implementation, tests, schemas, docs, and validation commands. No new features.

## Executive Summary

Phase 1 delivers a working canonical calculation pipeline (`buildIntermediateResult`), frame mapper (`mapToFrameModel`), additive project schema extension (`liner` / `linerTrace`), headless project assembly with schema validation and optional backend analysis, and UI preparation constants — all without React routes or wired React UI.

**P2-0 correction note:** The original gate wording said "without React routes or i18n strings." Current repository state includes `ja.liner.*` placeholder strings in `frontend/src/i18n/ja.ts` for P1-6 UI preparation; they are not wired to React components yet.

**P2-2 correction note:** The Phase1 gate recorded the pre-UI state. P2-2 registers the `/pro/liner` list route and wires `ja.liner.list.*`; setup, preview, and mapping-review routes remain reserved.

**Gate decision: FAIL**

Core P1-1 through P1-5 code paths are implemented and pass frontend checks, but explicit Phase 1 completion criteria from [phase1_intermediate_result_gap_review.md](phase1_intermediate_result_gap_review.md) §7 are not fully met: golden intermediate fixtures exist only for GC-01 and GC-06 (partial/stale), GC-02 through GC-07 fixtures are missing, example fixtures are not consumed by automated tests, and vertical profile resolution is not wired from domain input into the pipeline.

No BLOCKER code defects were found that warrant an automatic minimal code fix in this review pass. Remaining BLOCKERs are deliverable and test-coverage gaps.

---

## Validation Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` (frontend) | **PASS** | Exit 0 |
| `npm run test -- src/liner` | **PASS** | 9 files, 42 tests |
| `npm run lint` (frontend) | **PASS** | Exit 0 |
| `npm run build` (frontend) | **PASS** | Vite build succeeded |
| `python3 -m pytest backend/tests/test_project_schema.py` | **FAIL** | 2 failures (see § Tests) |

---

## Checklist by Review Area

### 1. Geometry

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Straight segment evaluation (GC-01) | **PASS** | — | `geometry.test.ts` covers start/mid/end |
| Circular arc, signed curvature (GC-02) | **PASS** | — | Midpoint y uses corrected value `17.037087`; matches [test_plan_geometry.md](test_plan_geometry.md) |
| Line–arc compound continuity (GC-03) | **PASS** | — | Junction and end point tested in `geometry.test.ts` |
| Clothoid evaluation | **PASS** (blocked for production) | MEDIUM | Simpson integration implemented; `isPhase0ClothoidApproximation()` returns `true`; smoke tests only |
| GC-08 through GC-10 independent references | **FAIL** | HIGH | No fixture files; explicitly blocked via Phase 0 approximation flag (acceptable per criterion §7.4 if shipping remains blocked) |
| 45° offset / left-normal (GC-07) | **PASS** | — | Covered in `geometry.test.ts` |

**Area verdict: PASS** (with clothoid production explicitly deferred)

---

### 2. Intermediate Result

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Canonical top-level shape (`schemaVersion`, `computedAt`, `sourceRevision`, …) | **PASS** | — | `buildIntermediateResult()` returns `CanonicalLinerIntermediateResult` |
| `horizontal.segments`, `piPoints`, `sampledPoints` | **PASS** | — | Segments populated; `piPoints` empty (no PI-based input yet) |
| `vertical` subtree | **PASS** (partial) | HIGH | Emitted with flat `z` input; profile segment domain not connected |
| `stations` as `StationTableResult` | **PASS** | — | Wrapper with `entries`, provenance mapped |
| `grid` with points/lines/cells | **PASS** | — | GC-06 shape verified in `pipeline.test.ts` |
| `spans`, `piers`, `frameHints`, `sections` | **PASS** | — | Present; spans/piers/sections empty arrays; default `frameHints` |
| `diagnostics` (not `issues`) | **PASS** | MEDIUM | Renamed; `messageKey` rarely populated in core |
| `dependencyGraph` | **PASS** | — | Minimal snapshot with invalidation edges |
| Stable IDs (`GP-`, station `entryId`) | **PASS** | — | Deterministic in tests |
| Provenance on grid points | **PASS** | — | `alignmentId`, `stationId`, `elementId` |
| Phase 0 union still exported | **FAIL** | MEDIUM | `LinerIntermediateResult \| Phase0LinerIntermediateResult` in `types.ts`; `nodeCandidates` / `memberCandidates` types retained |

**Area verdict: PASS** (canonical runtime output; legacy types and flat vertical remain)

---

### 3. Mapping

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Node generation from grid points | **PASS** | — | 9 nodes for GC-06 |
| Member generation from grid lines | **PASS** | — | 12 members (6 longitudinal + 6 transverse) |
| Support generation from templates | **PASS** | — | Pier template test in `frameModelMapper.test.ts` |
| `linerTrace` on nodes/members/supports | **PASS** | — | Trace entries include grid/source metadata |
| Pure function, no domain recompute | **PASS** | — | `mapToFrameModel(intermediate, options)` |

**Area verdict: PASS**

---

### 4. Schema

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Additive `liner` and `linerTrace` in `schemas/project.schema.json` | **PASS** | — | Optional top-level fields with `$defs` |
| Backward compatibility (projects without liner) | **PASS** | — | `createDefaultProject`, `examples/project.json` validate |
| Migration helpers | **PASS** | — | `migrateProjectLinerExtension`, `ensureProjectLinerTraceArray` |
| Frontend validation | **PASS** | — | `validateProjectLinerExtension`, AJV in headless |
| Optional liner metadata | **PASS** | — | `createLinerProjectExtension` / `attachLinerMappingToProject` |

**Area verdict: PASS**

---

### 5. Headless

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Generated project schema validation | **PASS** | — | `validateGeneratedLinerProject` + headless tests |
| `liner` / `linerTrace` attachment | **PASS** | — | Verified in headless tests |
| Analysis connection (with supports) | **PASS** | — | Backend validate + `analysisStatus: success` when scipy available |
| Analysis without supports documented | **PASS** | — | Schema-valid but unstable model |
| Diagnostics on failure paths | **PASS** | — | Missing grid refs, missing materials |

**Area verdict: PASS**

---

### 6. UI Preparation

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| No React routes/components for liner | **PASS** (P2-2 superseded for list route) | — | No `/pro/liner/*` registration existed at Phase1 gate time; P2-2 adds `/pro/liner` only |
| No React-wired Japanese liner UI | **PASS** (P2-2 superseded for list strings) | — | `ja.liner.*` placeholders existed at Phase1 gate time; P2-2 wires `ja.liner.list.*` only |
| State boundary constants | **PASS** | — | `LINER_UI_STATE_BOUNDARIES` in `uiPreparation.ts` |
| Workflow boundary constants | **PASS** | — | Maps to P1-1–P1-5 entry points only |
| Accidental UI implementation | **PASS** | — | Preparation module is constants/types only |

**Area verdict: PASS**

---

### 7. Language Policy

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| English identifiers in liner source | **PASS** | — | No Japanese in `frontend/src/liner/**` |
| Japanese only via i18n | **PASS** | — | i18n groups named in docs/constants only |
| No mixed identifiers | **PASS** | — | Diagnostic codes English; `messageKey` paths English |

**Area verdict: PASS**

---

### 8. Documentation

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Cross-references between P1 docs | **PASS** | — | `ui_preparation.md`, `integration_with_frame_model.md` updated for P1-5/P1-6 |
| README still says "design skeletons only" | **FAIL** (P2-0 corrected) | LOW | [README.md](README.md) status table was not updated for implementation phase at gate time |
| Fixture path naming inconsistency | **FAIL** (P2-0 partly corrected) | MEDIUM | Some docs referenced `gc-06-intermediate.json`; repo has `gc-06-intermediate.expected.json` |
| Stale example JSON vs canonical model | **FAIL** | **BLOCKER** | `examples/liner/gc-01-intermediate.expected.json` and `gc-06-intermediate.expected.json` use Phase 0 partial shapes, not canonical `LinerIntermediateResult` |
| GC-02 doc correction | **PASS** | — | Midpoint y corrected to `17.037087` in test plan |
| `calculation_pipeline.md` integration test checkbox | **FAIL** | LOW | § checklist still `[ ]` though headless tests cover GC-06 path |

**Area verdict: FAIL**

---

### 9. Tests

| Item | Status | Severity | Notes |
| --- | --- | --- | --- |
| Unit tests for geometry, station, pipeline, mapper, schema, headless, UI prep | **PASS** | — | 42 tests, all passing |
| Golden fixture files GC-01 through GC-07 | **FAIL** | **BLOCKER** | Only `gc-01-*` and `gc-06-*` exist; GC-02–GC-07 missing ([phase1_intermediate_result_gap_review.md](phase1_intermediate_result_gap_review.md) §7.3) |
| Fixture-driven snapshot tests | **FAIL** | HIGH | No test loads `examples/liner/*.json` |
| `gc-06-project.generated.json` committed fixture | **FAIL** | HIGH | Referenced in docs; not present under `examples/liner/` |
| GC-05 vertical parabolic in pipeline | **FAIL** | HIGH | `evaluateVerticalElement` exists; pipeline uses flat `z` only |
| Backend `test_project_schema.py` | **FAIL** | MEDIUM | `portal_frame_verification.json` missing `solver` (pre-existing); liner trace enum test assertion brittle |

**Area verdict: FAIL**

---

### 10. Public API (`frontend/src/liner/index.ts`)

| Export | Status | Notes |
| --- | --- | --- |
| `./core` | **PASS** | Pipeline, geometry, types, diagnostics |
| `./mapper/frameIds` | **PASS** | ID helpers |
| `./mapper/frameModelMapper` | **PASS** | `mapToFrameModel` |
| `./mapper/frameMappingPreview` | **PASS** | Phase 0 preview helpers (legacy) |
| `./schema` | **PASS** | Attach, migrate, validate |
| `./headless` | **PASS** | `createHeadlessLinerFrameProject` |
| `./uiPreparation` | **PASS** | P1-6 constants |

**Area verdict: PASS**

---

## Phase 1 Completion Criteria (§7 traceability)

| # | Criterion | Met? |
| --- | --- | --- |
| 1 | Canonical `LinerIntermediateResult` matching design §1–§15 | **Partial** — runtime canonical; legacy union + stale fixtures |
| 2 | Pipeline emits vertical, stations, grid, spans, piers, frameHints, sections, diagnostics, dependencyGraph | **Yes** |
| 3 | Golden intermediate fixtures GC-01 through GC-07 | **No** |
| 4 | GC-08–GC-10 clothoid references or explicit block | **Yes** (blocked via `isPhase0ClothoidApproximation`) |
| 5 | Pure frame mapper with nodes, members, supports, linerTrace | **Yes** |
| 6 | GC-06 mapper validates against project schema | **Yes** (in Vitest, not committed JSON fixture) |
| 7 | Additive schema; existing fixtures validate | **Yes** |
| 8 | Headless project passes validation and analysis flow | **Yes** (with support templates + Python deps) |
| 9 | No React UI / export / hard-coded Japanese | **Yes** |
| 10 | lint, typecheck, test, build pass | **Yes** (frontend) |

---

## Issue Register

### BLOCKER

| ID | Area | Description |
| --- | --- | --- |
| B-01 | Tests / Fixtures | Golden intermediate fixtures missing for **GC-02 through GC-07** (`examples/liner/`). |
| B-02 | Documentation / Fixtures | Existing `gc-01-intermediate.expected.json` and `gc-06-intermediate.expected.json` do not match canonical `LinerIntermediateResult` (Phase 0 partial snapshots). |

### HIGH

| ID | Area | Description |
| --- | --- | --- |
| H-01 | Tests | No automated tests load or assert against `examples/liner/*` domain/expected JSON. |
| H-02 | Tests / Docs | `gc-06-project.generated.json` referenced in design docs but not committed. |
| H-03 | Intermediate / Pipeline | Vertical profile segments (`evaluateVerticalElement`) not wired from domain input; pipeline uses constant `z` only (GC-05 not covered end-to-end). |
| H-04 | Intermediate | `Phase0LinerIntermediateResult` and preview types (`nodeCandidates`, `memberCandidates`) remain in public `types.ts` export. |

### MEDIUM

| ID | Area | Description |
| --- | --- | --- |
| M-01 | Diagnostics | Core diagnostics omit `messageKey`; i18n contract documented but not populated at source. |
| M-02 | Documentation | Fixture filename mismatch (`*.json` vs `*.expected.json`) across docs. |
| M-03 | Tests | Backend pytest: `test_project_schema_rejects_invalid_liner_trace_entity_type` fails on error message wording (schema does reject invalid enum). |
| M-04 | Geometry | Clothoid remains Phase 0 approximation; no GC-08–GC-10 golden numeric baselines. |

### LOW

| ID | Area | Description |
| --- | --- | --- |
| L-01 | Documentation | [README.md](README.md) described folder as design-only at gate time; P2-0 updates the index to reflect implemented liner artifacts. |
| L-02 | Documentation | [calculation_pipeline.md](calculation_pipeline.md) pre-implementation checkbox stale for GC-06 integration. |
| L-03 | Tests | `portal_frame_verification.json` fails schema (missing `solver`); unrelated to liner but fails full pytest file. |

### PASS highlights

- Canonical pipeline and mapper implementation align with design for the GC-06 straight-grid path.
- Schema extension is additive and covered by frontend + partial backend tests.
- Headless path validates and can run linear static analysis when supports and Python deps are present.
- UI preparation respects layer boundaries; no accidental React or i18n implementation.

---

## Remaining Risks

1. **Fixture drift:** Without GC-01–GC-07 canonical JSON snapshots in CI, regressions in intermediate shape or numeric accuracy may go unnoticed until manual review.
2. **Vertical provenance:** Flat `z` in the pipeline hides profile-segment bugs until GC-05 is integrated; grid `zProvenance` will not reflect parabolic curves.
3. **Clothoid shipping:** Production use of clothoid alignments remains unsafe until GC-08–GC-10 independent references and removal of `isPhase0ClothoidApproximation()` guard.
4. **Legacy types:** Public `Phase0LinerIntermediateResult` union may confuse Phase 2 UI consumers.
5. **Analysis-ready defaults:** Headless GC-06 without support templates is schema-valid but analysis-unstable; product workflow must supply templates in Phase 2.

---

## Recommended Phase 2 Prerequisites

Complete before starting liner React UI (Phase 2):

1. Add canonical `examples/liner/gc-0N-domain.json` and `gc-0N-intermediate.expected.json` for **GC-01 through GC-07**, plus Vitest snapshot or field-wise golden tests that load them.
2. Commit `examples/liner/gc-06-project.generated.json` from the headless pipeline and validate in CI.
3. Wire domain vertical profile input into `buildIntermediateResult` (GC-05) and update grid `zProvenance`.
4. Retire or relocate `Phase0LinerIntermediateResult`, `frameMappingPreview`, and `nodeCandidates`/`memberCandidates` from the canonical public contract.
5. Populate `messageKey` on core diagnostics per [error_handling.md](error_handling.md) and add matching `liner.errors.*` keys in i18n when UI starts.
6. Resolve doc/README status and fixture naming consistency.
7. Either add GC-08–GC-10 clothoid golden baselines or keep clothoid alignments blocked in UI with explicit gating.

---

## Final Gate Decision

| Overall | **FAIL** |
| --- | --- |
| Frontend build/test/lint/typecheck | PASS |
| Phase 1 completion criteria §7 | **Not fully met** (fixtures B-01, B-02) |
| Automatic BLOCKER fixes applied | **None** (gaps are fixture/test deliverables, not minimal code defects) |

**Report: FAIL**
