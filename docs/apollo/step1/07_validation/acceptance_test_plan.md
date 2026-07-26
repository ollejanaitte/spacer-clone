# Acceptance Test Plan — Phase 1 (Post-Implementation)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0011  
**Base commit:** `bf3d9dc22e027e1de661c0271ff6ba2a003e7d20`  
**Branch:** `docs/apollo-step1-p08-validation`

## Purpose

Define **post-implementation acceptance criteria** for Apollo Superstructure Design Phase 1. Tests in this plan execute **after** implementation PRs land; Step 1 only records criteria. Passing these tests does not imply implementation authorization or Target Standard adoption.

## Reference model

- **Reference Bridge:** `RB-P1-001` (`reference_bridge_definition.md`, `reference_bridge_input.json`)
- **Validation catalog:** `validation_catalog.csv`
- **Traceability:** `traceability_matrix.csv`

## Acceptance verdict template

```text
PHASE1_ACCEPTANCE_VERDICT: PASS | PASS_WITH_BLOCKERS | FAIL
RB-P1-001_INTEGRATION: PASS | PARTIAL | NOT_RUN
GOLDEN_NUMERIC_COMPARISON: NOT_AUTHORIZED | ADOPTED_AND_PASS
IF3_AUTHORITATIVE_EXPORT: PASS | BLOCKED
IMPLEMENTATION_READINESS: (separate P09 verdict)
```

---

## Gate 0 — Preconditions (must pass before acceptance run)

| ID | Criterion | Method | Fail action |
|----|-----------|--------|-------------|
| ATP-0-01 | Target Standard state recorded (may remain NOT_SELECTED) | Config / decision log | FAIL if undisclosed |
| ATP-0-02 | RB-P1-001 draft loads without parse error | `python3 -m json.tool reference_bridge_input.json` | FAIL |
| ATP-0-03 | No production fixture misuse of RB-P1-001 | Code search / CI config audit | FAIL |
| ATP-0-04 | Phase 1 scope freeze unchanged or DEC-amended | `phase1_scope_freeze.md` | FAIL |
| ATP-0-05 | Blockers BLK-S1-001…012 disposition documented | blocker register | PASS_WITH_BLOCKERS if open |

---

## Gate 1 — Document and schema acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-1-01 | BSDD-shaped RB-P1-001 validates against promoted schema or approved adapter | VAL-S1-L01-001 | No schema errors on required envelope |
| ATP-1-02 | Lifecycle transitions enforced | VAL-S1-L02-001…004 | DRAFT→VALIDATED→APPROVED path works; STALE blocks export |
| ATP-1-03 | Stable IDs survive revision | VAL-S1-L02-002 | girderLineId/deckId/loadCaseId stable when entity persists |
| ATP-1-04 | phase1ScopeAssertion present and matches archetype | VAL-S1-L03-006 | straight/simple/90°/plate_girder_rc_slab_non_composite/static_linear |

---

## Gate 2 — Scope and geometry acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-2-01 | OUT_OF_PHASE1 inputs rejected | VAL-S1-L03-001 | continuous/composite/skew≠90° → UNSUPPORTED |
| ATP-2-02 | Single span only | VAL-S1-L03-002 | second span rejected |
| ATP-2-03 | Girder count 4–6 when specified | VAL-S1-L03-003 | out-of-range rejected or flagged |
| ATP-2-04 | Equal-depth girders | VAL-S1-L03-004 | variable depth rejected |
| ATP-2-05 | Non-composite RC deck only | VAL-S1-L03-005 | composite deck kind rejected |
| ATP-2-06 | RB-P1-001 PLACEHOLDER numerics not auto-filled | VAL-S1-RB-002 | null/unknown remain until ADOPTED |

---

## Gate 3 — Export and Frame generation acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-3-01 | BSDD exports to BFAD or ProjectModel | VAL-S1-L04-001 | nodes/members/sections materialized |
| ATP-3-02 | Bridge FEM path produces analysable model | VAL-S1-L04-002 | static linear run starts |
| ATP-3-03 | OUT_OF_PHASE1 entities not required on export | VAL-S1-L04-004 | splice/bracing absent from required surface |
| ATP-3-04 | Unit and coordinate contexts preserved | VAL-S1-L05-001…003 | canonical units; unknown confidence blocks export |

---

## Gate 4 — Load and analysis acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-4-01 | dead/slab/live case shells creatable | VAL-S1-L06-001 | kinds present without invented magnitudes |
| ATP-4-02 | Numeric auto-fill blocked | VAL-S1-L06-002; VAL-S1-READY-002 | BLOCK_NUMERIC_AUTO_DETERMINATION honored |
| ATP-4-03 | Live load adoption gated | VAL-S1-L06-003 | blocked until Target Standard ADOPTED |
| ATP-4-04 | Static linear analysis completes on RB shell | VAL-S1-L08-001 | SUCCEEDED or documented PARTIAL with diagnostics |
| ATP-4-05 | Solver failure fail-closed | VAL-S1-L08-002 | FAILED → no authoritative export |
| ATP-4-06 | Dynamic analysis rejected | VAL-S1-L08-003 | eigen/RS/TH → OUT_OF_PHASE1 |

**Note:** ATP-4-04 does **not** require numeric match to golden expected values.

---

## Gate 5 — IF3 and result acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-5-01 | IF3 resource normalized from solver output | VAL-S1-L09-001…002 | reactions/displacements/forces present per contract |
| ATP-5-02 | AnalysisBinding persisted | VAL-S1-L10-001 | source BSDD ref + checksum stored |
| ATP-5-03 | runAnalysis sends IF3 metadata | VAL-S1-L10-002 | CAP-IF3-005 gap closed |
| ATP-5-04 | Unbound run blocks export | VAL-S1-L10-004 | UNBOUND → all authoritative export BLOCK |
| ATP-5-05 | Stale after BSDD edit | VAL-S1-L11-001…003 | STALE → export BLOCK; reanalysis path documented |
| ATP-5-06 | Export authority matrix | VAL-S1-L12-001…003 | VALID allows; STALE/UNBOUND/INVALID block |

---

## Gate 6 — READY subset and traceability acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-6-01 | Phase 1 READY rows (22) mapped in traceability matrix | VAL-S1-READY-001 | no orphan phase=1 requirement |
| ATP-6-02 | requirement_id → validation_rule_id chain | VAL-S1-READY-001 | 69/69 handoff rules traceable |
| ATP-6-03 | Evidence images exist for READY rows | Handoff audit | path readable under immutable package |
| ATP-6-04 | OUT_OF_PHASE1 READY rows not in Phase 1 acceptance scope | P04 disposition | 44 rows excluded from ATP gates |

---

## Gate 7 — Regression and hygiene acceptance

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-7-01 | IF3 test suite green | VAL-S1-L13-002 | vitest + pytest IF3 paths pass |
| ATP-7-02 | Frame verification regression | VAL-S1-L13-001 | existing verification cases pass |
| ATP-7-03 | Migration framework regression | VAL-S1-L13-003 | migration tests pass |
| ATP-7-04 | Source hygiene on delivery PRs | VAL-S1-L14-001…003 | no handoff edits; clean diff |

---

## Gate 8 — UI / runtime acceptance (partial Phase 1)

| ID | Criterion | Validation IDs | Pass condition |
|----|-----------|----------------|----------------|
| ATP-8-01 | Electron smoke | VAL-S1-L15-001 | app launches without crash |
| ATP-8-02 | Frame analysis reachable | VAL-S1-L15-002 | analysis UI loads ProjectModel path |
| ATP-8-03 | Export controls reflect IF3 gate | VAL-S1-L15-003 | unbound path shows block state |
| ATP-8-04 | Apollo workspace E2E | VAL-S1-L15-004 | deferred until AP-03+ implemented |

---

## Gate 9 — Golden and parity (explicitly blocked in Phase 1)

| ID | Criterion | Status | Pass condition |
|----|-----------|--------|----------------|
| ATP-9-01 | Golden force/displacement comparison | BLOCKED | Requires ADOPTED benchmark + DEC |
| ATP-9-02 | Legacy Analyzer file parity | BLOCKED | BLK-S1-011 |
| ATP-9-03 | Visual drawing baseline | BLOCKED | OD8-04 |
| ATP-9-04 | Target Standard code-check pass | BLOCKED | BLK-S1-001 |

These gates are **out of Phase 1 acceptance scope** until blockers clear. `PASS_WITH_BLOCKERS` is allowed at P09 if documented.

---

## Acceptance execution order

```text
Gate 0 (preconditions)
  → Gate 1–2 (document + scope)
  → Gate 3–4 (export + analysis shell)
  → Gate 5 (IF3 + export authority)
  → Gate 6 (READY traceability audit)
  → Gate 7 (regression)
  → Gate 8 (UI smoke, partial)
  → Gate 9 (record BLOCKED, do not fail Phase 1 planning acceptance)
```

---

## Evidence package (post-implementation)

Deliverables for supervisor sign-off:

1. Test run log with validation_id → result mapping
2. RB-P1-001 input revision used (checksum)
3. IF3 resource sample (non-authoritative if UNBOUND demo)
4. Export gate state screenshots or CLI transcript
5. List of open blockers with PASS_WITH_BLOCKERS justification

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Test strategy | `test_strategy.md` |
| Reference Bridge | `reference_bridge_definition.md` |
| P07 export authority | `../06_architecture/export_authority_rules.md` |
| P05 scope freeze | `../05_scope_boundary/phase1_scope_freeze.md` |
