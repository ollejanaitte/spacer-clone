# Apollo Phase 1 — Implementation Roadmap

**Authority:** DESIGN PLANNING / STEP 1 (P09)  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0012  
**Base commit:** `555a3c5d9a4242cc8ea838973a0ce41a5ec1613b` (main @ P08 merge)  
**Branch:** `docs/apollo-step1-p09-final-closure`

## Purpose

Translate Step 1 planning artifacts (P00–P08) into a sequenced production implementation plan for **spacer-clone** (Road Design Tool + Apollo Superstructure Design + Frame Analysis Tool). This roadmap is **planning-only** until supervisor authorizes each AP-* PR.

## Preconditions (unchanged from Step 1)

| Gate | State |
|------|-------|
| Target Standard | **NOT_SELECTED** (DEC-S1-0004) |
| Phase 1 scope | **FROZEN_NARROW** (DEC-S1-0008) |
| Design freeze | **NOT_READY** (handoff) |
| Implementation authorization | **NOT_GRANTED** globally; **CONDITIONAL_GO** for AP-00..AP-03 + IF3 client binding per P09 verdict |

## Repository touchpoints (reference)

| Area | Existing paths |
|------|----------------|
| Apollo planning schema | `docs/apollo/step1/06_architecture/schema_draft.json` |
| Legacy bridge model | `frontend/src/bridgeDefinition/` |
| Frame analysis API | `backend/app/main.py`, `backend/engine/` |
| IF3 normalizer / gates | `backend/engine/if3_normalizer.py`, `frontend/src/if3/` |
| Contract schemas | `schemas/contracts/v0.1/` |
| Road transfer | `schemas/contracts/v0.1/road-to-frame-transfer-package.schema.json` |

## Implementation PR sequence (AP-00..AP-18)

---

### AP-00 — Implementation governance and feature flags

| Field | Value |
|-------|-------|
| **Scope** | Apollo Phase 1 feature flags; implementation decision log; AP-* PR template; CI guardrails (no RB-P1-001 production fixture misuse); blocker gate checks in PR template |
| **Non-scope** | Product features; numeric constants; schema promotion |
| **Dependencies** | P09 merge; DEC-S1-0012 |
| **Blockers** | None for scaffolding |
| **Tests** | Docs lint; flag registry unit test; CI config audit |
| **Acceptance** | `apollo.implementation.enabled` (or equivalent) defaults **off**; PR checklist references BLK-S1-*; no handoff mutation |

**Modules (candidate):** `docs/apollo/implementation/`, `.github/` (checklist only), `frontend/src/config/featureFlags.ts`

---

### AP-01 — BridgeSuperstructureDesignDocument contracts

| Field | Value |
|-------|-------|
| **Scope** | Promote `schema_draft.json` BSDD envelope to `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`; TypeScript types; validator entrypoint; `schemaId` registration |
| **Non-scope** | UI; numerics; load magnitudes; golden values |
| **Dependencies** | AP-00 |
| **Blockers** | None (structural shell only) |
| **Tests** | JSON Schema validation; round-trip TS type check; RB-P1-001 draft parses as **invalid until PLACEHOLDER fields resolved** (expected) |
| **Acceptance** | Schema validates planning draft shape; required envelope fields per P06 entity catalog; numerics nullable/unknown allowed |

---

### AP-02 — Schema / migration / validation foundation

| Field | Value |
|-------|-------|
| **Scope** | Document lifecycle states (DRAFT→VALIDATED→APPROVED→STALE); revision/checksum utilities; validation layer VAL-S1-L01/L02; stable ID helpers aligned with entity catalog |
| **Non-scope** | Business logic; design-check numerics |
| **Dependencies** | AP-01 |
| **Blockers** | None |
| **Tests** | Lifecycle transition tests; checksum stability; ID persistence (ATP-1-03) |
| **Acceptance** | Fail-closed on STALE export; stable `girderLineId`/`deckId`/`loadCaseId` per ADR-APO-003 |

---

### AP-03 — Apollo workspace and project entry

| Field | Value |
|-------|-------|
| **Scope** | Apollo module route/shell; create/open BSDD project; engineering project linkage; phase1ScopeAssertion block on create |
| **Non-scope** | Full geometry editors; road apply; analysis run |
| **Dependencies** | AP-02 |
| **Blockers** | None |
| **Tests** | E2E smoke: create BSDD DRAFT; scope assertion present; feature flag off → hidden |
| **Acceptance** | User can create empty BSDD-shaped document; OUT_OF_PHASE1 archetype rejected at preflight (ATP-2-01 shell) |

---

### AP-04 — Bridge basic conditions

| Field | Value |
|-------|-------|
| **Scope** | Straight bridge metadata; alignment class; skew=90° lock; project/bridge labels; road reference import (read-only `RoadDesignRef`) |
| **Non-scope** | Curved alignment; skew ≠ 90°; road geometry mutation |
| **Dependencies** | AP-03; optional Road LINER draft read |
| **Blockers** | BLK-S1-001 (no adopted road design loads) |
| **Tests** | Scope preflight rejects curved/skewed; RDD ref immutability |
| **Acceptance** | ATP-2-01 partial; road ref by exact revision/checksum only |

---

### AP-05 — Span / support / girder geometry

| Field | Value |
|-------|-------|
| **Scope** | Single span; support locations; 4–6 equal-depth plate girders; girder spacing; support fixed/movable shell |
| **Non-scope** | Multi-span; variable depth; haunch detail design; bearing design numerics |
| **Dependencies** | AP-04 |
| **Blockers** | BLK-S1-004 (no auto dimensions from code) |
| **Tests** | Girder count bounds (ATP-2-03); equal depth (ATP-2-04); second span rejected (ATP-2-02) |
| **Acceptance** | Geometry shell editable; dimension numerics remain PLACEHOLDER or user-entered non-authoritative until ADOPTED |

---

### AP-06 — Deck / cross beam / bearing definitions

| Field | Value |
|-------|-------|
| **Scope** | Non-composite RC slab deck entity; cross beam layout shell; bearing type enum (fixed/movable) |
| **Non-scope** | Composite deck; steel deck; PC slab; bearing design calculations |
| **Dependencies** | AP-05 |
| **Blockers** | BLK-S1-004, BLK-S1-005 |
| **Tests** | Composite deck kind rejected (ATP-2-05); deck thickness nullable |
| **Acceptance** | Deck `kind=rc_slab_non_composite` only; no shear connector modeling |

---

### AP-07 — Material and section candidate registry

| Field | Value |
|-------|-------|
| **Scope** | MaterialDefinition shell; section candidate registry (names/IDs only); PLACEHOLDER yield/strength fields; governance metadata hooks (`adoptionStatus`, `source_locator`) |
| **Non-scope** | ADOPTED material constants; JIS table values; section design |
| **Dependencies** | AP-02 |
| **Blockers** | **BLK-S1-001, BLK-S1-002, BLK-S1-005** — **FORBIDDEN** until Target Standard + JIS resolved |
| **Tests** | Fail-closed on ADOPTED without decision_id; null numerics persist |
| **Acceptance** | Registry CRUD with PLACEHOLDER only; ATP-2-06 satisfied |

---

### AP-08 — Load definition and generation rules

| Field | Value |
|-------|-------|
| **Scope** | LoadCase/Load entity shells; dead/slab/live **kinds**; load combination deferral to Frame; generation rule **stubs** (no magnitudes) |
| **Non-scope** | Live load factors; lane loads; wind/seismic; auto-generation from 道示 tables |
| **Dependencies** | AP-06, AP-07 (shell) |
| **Blockers** | **BLK-S1-001, BLK-S1-004** — **FORBIDDEN** for adopted magnitudes |
| **Tests** | Magnitude null until ADOPTED; reject auto-fill from defaults |
| **Acceptance** | Load cases creatable with unknown magnitudes; user-visible BLOCKED message for adopted numerics |

---

### AP-09 — Frame generation core

| Field | Value |
|-------|-------|
| **Scope** | BSDD → BFAD adapter (or interim → `ProjectModel`); nodes/members/sections materialization for static linear; unit/coordinate context propagation |
| **Non-scope** | Splice/bracing/stiffener members; dynamic analysis |
| **Dependencies** | AP-05, AP-06, AP-07 (shell), AP-08 (shell) |
| **Blockers** | BLK-S1-011 (legacy Analyzer I/O not required for Phase 1 internal path) |
| **Tests** | ATP-3-01, ATP-3-02; OUT_OF_PHASE1 entities absent (ATP-3-04) |
| **Acceptance** | Generated model runs static linear on internal solver; no Analyzer file claims |

---

### AP-10 — SuperstructureToFramePackage export

| Field | Value |
|-------|-------|
| **Scope** | Immutable export package artifact; provenance triples (BSDD→BFAD); checksum addressing; export audit log |
| **Non-scope** | Road transfer package mutation; legacy `.mdb`/`.alg` |
| **Dependencies** | AP-09 |
| **Blockers** | BLK-S1-012 (export authority gated on IF3 binding downstream) |
| **Tests** | Export idempotency; revision bump on change; STALE blocks re-export |
| **Acceptance** | ATP-3-01; export authority matrix per P07 |

---

### AP-11 — IF3 binding and analysis launch

| Field | Value |
|-------|-------|
| **Scope** | Wire `apiClient.runAnalysis` `if3` metadata (LIM-P03-001); `AnalysisBinding` persistence; POST `/api/analysis/run` binding parity with BFAD triple |
| **Non-scope** | PRINT visual release; legacy Analyzer wire format |
| **Dependencies** | AP-10; existing IF3 backend |
| **Blockers** | BLK-S1-012 (this PR **resolves** client binding) |
| **Tests** | `test_if3_api.py` parity; `if3ResultGate`/`if3ExportGate` pass on bound run |
| **Acceptance** | ATP Gate 4 IF3 binding; `canExportAuthoritative` true when binding complete |

---

### AP-12 — Result import and design mapping

| Field | Value |
|-------|-------|
| **Scope** | Import `FrameAnalysisResultResource` into Apollo read model; map reactions/displacements to design shells (non-numeric mapping) |
| **Non-scope** | Member design checks; golden numeric comparison |
| **Dependencies** | AP-11 |
| **Blockers** | BLK-S1-001 for code-check numerics |
| **Tests** | Result checksum match; stale result detection |
| **Acceptance** | Apollo displays analysis status; no authoritative design-check pass claims |

---

### AP-13 — Stale / reanalysis / export gate

| Field | Value |
|-------|-------|
| **Scope** | Implement P07 stale rules; reanalysis triggers; export authority matrix (JSON/CSV/PDF/PRINT vs VALID/STALE/MISSING) |
| **Non-scope** | PRINT visual baseline (LIM-P03-003) |
| **Dependencies** | AP-11, AP-12 |
| **Blockers** | LIM-P03-003 for PRINT visual claims |
| **Tests** | Stale transition on BSDD edit post-analysis; gate unit tests |
| **Acceptance** | ATP-1-02; fail-closed export when STALE or unbound |

---

### AP-14 — Preliminary design checks

| Field | Value |
|-------|-------|
| **Scope** | RC slab design **workflow shell**; load input plumbing; check result placeholders |
| **Non-scope** | 道示-compliant slab thickness/reinforcement numerics; girder/section design |
| **Dependencies** | AP-12, AP-08 |
| **Blockers** | **BLK-S1-001, BLK-S1-002, BLK-S1-004** — **FORBIDDEN** for numeric checks |
| **Tests** | Shell runs with PLACEHOLDER; no false PASS on null inputs |
| **Acceptance** | REQ-5C-0002 scaffolding only; checks report NOT_AUTHORIZED for numerics |

---

### AP-15 — Standard section / arrangement drawings

| Field | Value |
|-------|-------|
| **Scope** | Layout diagram shell (non-authoritative); arrangement preview from BSDD geometry |
| **Non-scope** | SuperDrawing production CAD; GDRAW authoritative output |
| **Dependencies** | AP-05, AP-06 |
| **Blockers** | LIM-P03-011 (Frame DRAFT NOGO); OD8-04 |
| **Tests** | Diagram renders from geometry shell; no production drawing claims |
| **Acceptance** | Preview only; labeled non-authoritative |

---

### AP-16 — Reports and controlled exports

| Field | Value |
|-------|-------|
| **Scope** | CSV/PDF report templates gated by IF3; diagnostic `result.json` path clearly non-authoritative |
| **Non-scope** | PRINT visual release; golden expected PDF values |
| **Dependencies** | AP-13 |
| **Blockers** | BLK-S1-012 (must be cleared by AP-11); LIM-P03-003 |
| **Tests** | Authoritative export blocked when gate fails; passes when bound |
| **Acceptance** | ATP Gate 5 export authority; semantic-only reports |

---

### AP-17 — Reference Bridge integration verification

| Field | Value |
|-------|-------|
| **Scope** | RB-P1-001 integration test harness (non-production); validation catalog execution; traceability matrix coverage report |
| **Non-scope** | Golden numeric expected values; production fixture commit |
| **Dependencies** | AP-03..AP-13 (minimum path) |
| **Blockers** | **BLK-S1-001** for golden numerics; GOLDEN_NUMERIC_COMPARISON: NOT_AUTHORIZED |
| **Tests** | Full validation catalog layers L01–L05; RB-P1-001 PLACEHOLDER handling |
| **Acceptance** | `RB-P1-001_INTEGRATION: PARTIAL` until numerics adopted; no golden comparison |

---

### AP-18 — Phase 1 release closure

| Field | Value |
|-------|-------|
| **Scope** | Phase 1 release checklist; feature flag enablement proposal; known limitations doc; handoff traceability closure report |
| **Non-scope** | Phase 2 scope; Target Standard selection |
| **Dependencies** | AP-00..AP-17 |
| **Blockers** | All HIGH blockers dispositioned or explicitly deferred with supervisor sign-off |
| **Tests** | Full acceptance test plan Gates 0–5 (PASS_WITH_BLOCKERS allowed) |
| **Acceptance** | `PHASE1_ACCEPTANCE_VERDICT: PASS_WITH_BLOCKERS` minimum; supervisor release approval |

---

## Conditional implementation authorization (P09)

| Allowed now (CONDITIONAL_GO) | Forbidden until blockers cleared |
|------------------------------|----------------------------------|
| AP-00, AP-01, AP-02, AP-03 | AP-07, AP-08 adopted numerics |
| AP-11 (IF3 client binding fix) | AP-14 numeric design checks |
| AP-04..AP-06 geometry **shells** (PLACEHOLDER numerics) | AP-17 golden expected values |
| AP-09..AP-10 internal solver path (no Analyzer parity claims) | Target-Standard-dependent modules |
| Non-numeric scaffolding throughout | Auto-fill loads/factors/limits (BLK-S1-004) |

## Related artifacts

| Artifact | Path |
|----------|------|
| PR breakdown CSV | `implementation_pr_breakdown.csv` |
| Dependency graph | `dependency_graph.md` |
| Risk register | `risk_register.csv` |
| Completion gates | `completion_gate.md` |
| Step 1 final report | `../final/step1_final_report.md` |
| Verdicts | `../final/step1_verdicts.md` |
