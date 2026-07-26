# Test Strategy — Apollo Phase 1 (P08)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0011  
**Base commit:** `bf3d9dc22e027e1de661c0271ff6ba2a003e7d20`  
**Branch:** `docs/apollo-step1-p08-validation`

## Purpose

Define the **test and validation strategy** for Apollo Superstructure Design Phase 1, aligned with Step 1 charter validation layers (1–15), handoff `validation_rules_ready.csv`, and P07 IF3/export authority design. This document is **planning-only** — it does not implement tests or authorize golden numerics.

## Verdict

```text
TEST_STRATEGY_STATUS: DRAFT_PLANNING_ONLY
GOLDEN_FIXTURES: NOT_AUTHORIZED (RB-P1-001 draft only)
TARGET_STANDARD_NUMERICS_IN_TESTS: PROHIBITED
IMPLEMENTATION_AUTHORIZATION: NOT_GRANTED
```

## Validation layers (charter)

Per Step 1 charter P08 specification:

| Layer | Name | Primary focus |
|-------|------|---------------|
| 1 | Schema validation | BSDD, BFAD, IF3, transfer package JSON shape |
| 2 | Document lifecycle validation | Revisions, checksums, STALE, export eligibility |
| 3 | Geometry validation | Phase1 archetype, scope preflight, RB-P1-001 layout |
| 4 | Frame generation validation | BSDD → BFAD/ProjectModel export adapter |
| 5 | Unit / coordinate validation | UnitContext, CoordinateContext, fail-closed unknown |
| 6 | Load generation validation | Load case shells, numeric governance, READY rules |
| 7 | Analysis input validation | Static linear input envelope, REQ-5C-0079 path |
| 8 | Solver execution validation | Linear static run; no golden until adopted |
| 9 | Result mapping validation | IF3 normalized resource mapping |
| 10 | IF3 binding validation | AnalysisBinding + run-time metadata |
| 11 | Stale detection validation | Checksum drift, reanalysis invalidation |
| 12 | Export authority validation | JSON/CSV/PDF/PRINT gate matrix |
| 13 | Regression validation | Existing repo test suites on main |
| 14 | Source hygiene | No handoff mutation, no secret leakage |
| 15 | Electron runtime / UI reachability | Existing Frame app smoke (Apollo UI deferred) |

Full catalog: `validation_catalog.csv`.

---

## Test types and when to apply

### Unit tests

| Scope | Examples | Phase 1 priority |
|-------|----------|------------------|
| Pure functions | Scope preflight, unit conversion, gate state derivation | HIGH |
| Lifecycle rules | revisionId monotonicity, STALE derivation | HIGH |
| Export gate | `evaluateIf3ResultGate()` state → ALLOW/BLOCK | HIGH |

**Rule:** Unit tests must not embed Target Standard load factors or material constants unless `ADOPTED` with `source_locator`.

### Contract tests

| Boundary | Artifacts | Method |
|----------|-----------|--------|
| Apollo → Frame | BSDD export → BFAD/ProjectModel | Round-trip shape + stable IDs |
| Frame → consumers | `FrameAnalysisResultResource` | IF3 normalizer output vs contract |
| IF3 binding | `AnalysisBinding` + request metadata | Layer 1+2 agreement |

Align with `interface_contract_draft.md` and `if3_binding_design.md`.

### Schema tests

| Schema family | Source | Phase 1 |
|---------------|--------|---------|
| BSDD design-draft | `../06_architecture/schema_draft.json` | Validate RB-P1-001 draft shape |
| BFAD v0.1 | `schemas/contracts/v0.1/` | Export target conformance |
| IF3 resource | `frame-analysis-result-resource.schema.json` | Normalizer output |
| ProjectModel (interim) | `schemas/project.schema.json` | Operational wire path |

**Note:** P06 design-draft is **not** production-registered. Schema tests against it are planning-only until governance promotes schema.

### Golden fixtures

| Fixture | Status | Rule |
|---------|--------|------|
| `reference_bridge_input.json` | DRAFT | Parse + shape only; **not** expected solver output |
| Analysis expected values | NOT_AUTHORIZED | Handoff: 断面力/反力/変位 未確定 |
| Evidence PNG OCR | PROHIBITED as golden | Location memos only |

Golden comparison tests require supervisor adoption of traceable benchmark values (new DEC entry).

### Integration tests

End-to-end within OSS logical path (no legacy Analyzer files):

```text
RB-P1-001 BSDD (draft) → export adapter → ProjectModel/BFAD
    → static linear run → IF3 normalizer → gate → export attempt
```

Integration tests cover binding present vs UNBOUND, STALE after edit, and FAILED solver paths.

### End-to-end (E2E)

| Path | Phase 1 | Notes |
|------|---------|-------|
| Frame app + ProjectModel analysis | partial | Existing Playwright/e2e |
| Apollo superstructure workspace | deferred | Not operational |
| Road → Apollo → Frame full chain | deferred | CAP-XFR-005 NOT_PRESENT |

E2E for Apollo awaits implementation roadmap (P09).

### Fail-closed / negative tests

Mandatory negative scenarios:

1. OUT_OF_PHASE1 input (continuous, skew ≠ 90°, composite) → reject
2. Null/UNKNOWN numeric auto-fill attempt → reject
3. Missing IF3 binding → UNBOUND → all authoritative export BLOCK
4. STALE checksum → export BLOCK
5. Target Standard numerics before ADOPTED → BLOCK
6. `goldenExpectations` non-null without authorization → test failure

### Migration tests

| Area | Tests | Phase 1 |
|------|-------|---------|
| Contract migration framework | `migrationFramework.test.ts` | Regression on main |
| BSDD design-draft → future production schema | Planned | Document expected breaking changes |
| ProjectModel → BFAD | Interim path | Adapter contract tests when implemented |

### Regression tests

On each implementation PR touching Apollo/Frame boundary:

- `backend/tests/test_if3_*.py`
- `frontend/**/if3*.test.ts`
- `backend/tests/test_engine_verification_cases.py`
- Repository conformance suite

RB-P1-001 becomes a regression anchor **only after** numeric adoption.

### Parity comparison

| Comparison | Phase 1 | Status |
|------------|---------|--------|
| Legacy SuperDesigner ↔ Analyzer files | OUT_OF_SCOPE | BLK-S1-011 |
| BridgeDefinition semantic parity | Existing partial | Not APOLLO parity claim |
| RB-P1-001 vs historical project | BLOCKED | No adopted benchmark |

### Property-based tests (optional, post-implementation)

Suggested for export gate and scope preflight:

- Random OUT_OF_PHASE1 flag combinations → always reject
- Arbitrary missing binding fields → always UNBOUND/BLOCK

Not required in Step 1; listed for implementation planning.

---

## Test data governance

| Data class | Allowed in tests | Forbidden |
|------------|------------------|-----------|
| Archetype enums | straight, simple, 90°, static_linear | — |
| Structural magnitudes | Only `ADOPTED` + `source_locator` | Invented spans, loads, materials |
| RB-P1-001 draft | Parse, preflight, binding scenarios | Golden force/displacement values |
| Handoff evidence images | Manual review chain audit | OCR-as-expected-value |
| JIS GAP topics | Existence / deferral checks | JIS limit values as expected |

---

## Environment and execution tiers

| Tier | When | Commands (reference) |
|------|------|----------------------|
| T0 — Doc integrity | Every Step 1 PR | JSON parse, CSV row counts, link check |
| T1 — Targeted unit/contract | Implementation PRs | `npm test -- <pattern>`, `pytest <path>` |
| T2 — Full regression | Pre-merge implementation PRs | Full vitest + pytest per repo policy |
| T3 — Electron smoke | Release / major UI PRs | Electron start + navigation |
| T4 — Visual baseline | BLOCKED | OD8-04 |

Step 1 doc-only PRs: T0 only unless supervisor requests broader checks.

---

## Alignment with handoff validation

| Handoff artifact | Step 1 mapping |
|------------------|----------------|
| `validation_rules_ready.csv` | VAL-S1-READY-* catalog entries; BLOCK_NUMERIC_AUTO_DETERMINATION |
| `ready_subset_test_plan.md` | READY chain audit; no numeric match |
| `docs/07_validation_and_test_strategy.md` | Golden data 未確定 — preserved |
| `validation_plan.md` (Stage 5) | Package integrity — P01 scope |

---

## Dependencies and blockers

| Blocker | Impact on tests |
|---------|-----------------|
| BLK-S1-001 Target Standard NOT_SELECTED | No live-load / code-limit golden tests |
| BLK-S1-012 IF3 client binding gap | E2E authoritative export blocked in default UI |
| BLK-S1-011 Analyzer I/O UNKNOWN | No physical file parity tests |
| CAP-IF3-005 NOT_PRESENT | Layer 10 integration incomplete until fixed |

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Reference Bridge definition | `reference_bridge_definition.md` |
| Draft input | `reference_bridge_input.json` |
| Validation catalog | `validation_catalog.csv` |
| Traceability matrix | `traceability_matrix.csv` |
| Acceptance test plan | `acceptance_test_plan.md` |
