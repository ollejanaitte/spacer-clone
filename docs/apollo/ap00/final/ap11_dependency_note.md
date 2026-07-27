# AP-11 Dependency and Sequence Note

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00 (P04)  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0006  
**Verdict:** `AP11_SEQUENCE_RECOMMENDATION: AP-11_NEXT_THEN_AP-01`

## Purpose

Record the recommended post-AP-00 implementation sequence between **AP-11** (IF3 client binding) and **AP-01** (BSDD contracts), with rationale from Step 1 and AP-00 artifacts.

---

## Options considered

| Option | Sequence | Parallel? |
|--------|----------|-----------|
| A | AP-00 → AP-11 → AP-01 → AP-02 → AP-03 | No |
| B | AP-00 → AP-01 → AP-02 → AP-03 → AP-11 | No |
| **C (selected)** | AP-00 → **AP-11** then **AP-01** as independent sequential series | No |

**Supervisor preference:** Option C — AP-11 next, then AP-01 BSDD contracts. Parallel PRs forbidden.

---

## Selected sequence

```text
AP-00 (COMPLETE)
    ↓
AP-11 — IF3 client binding fix (LIM-P03-001)  [NEXT]
    ↓
AP-01 — BSDD contracts (structural envelope)
    ↓
AP-02 — Schema migration / validation foundation
    ↓
AP-03 — Apollo workspace shell
```

AP-11 and AP-01 are **independent** in the dependency graph (neither requires the other), but **sequential execution** is mandatory per AP-00 branch rules.

---

## Rationale for AP-11 first

### 1. LIM-P03-001 is a live OSS gap (Step 1 P03)

`frontend/src/api/client.ts` `runAnalysis()` sends only `{ project, options }` — no `if3` block. The backend normalizer emits `MISSING_SOURCE_BINDING`; `if3ResultGate` / `if3ExportGate` keep `authoritativeOutputAllowed` false for typical interactive runs ([current_limitations.md](../../step1/03_existing_capability/current_limitations.md) LIM-P03-001).

**Impact:** Authoritative CSV/PDF/`result.json` export remains fail-closed in production UI today, independent of BSDD schema state.

### 2. AP-11 does not require BSDD promotion

IF3 binding wires **existing** BFAD/project identity and checksum metadata at analysis launch. It reuses contract infrastructure already present in backend (`extract_if3_metadata`, `if3_normalizer`) and frontend IF3 gates. No BSDD schema in `schemas/contracts/v0.1/` is prerequisite.

### 3. Fail-closed export semantics align with AP-00 guards

AP-00 established fail-closed numeric and scope governance. AP-11 completes the **authoritative export** fail-closed chain at the client boundary — fixing the gap where analysis succeeds but export gates deny output due to missing binding, not due to intentional policy.

### 4. Step 1 priority label

P09 authorization matrix marks AP-11 **READY_PRIORITY** ([implementation_authorization_matrix.md](../00_governance/implementation_authorization_matrix.md)). Step 1 verdicts list AP-11 IF3 client binding as explicit **priority** under CONDITIONAL_GO.

### 5. IF3 binding design is planning-complete (P07)

[if3_binding_design.md](../../step1/06_architecture/if3_binding_design.md) defines Layer 2 runtime metadata (`POST /api/analysis/run { if3: { … } }`) and binding status transitions. Implementation scope is bounded: client wiring + regression tests, not new architecture.

### 6. AP-01 benefits from stable integration path

BSDD `AnalysisBinding` entity (P06) will reference IF3 metadata snapshots. Fixing client binding first reduces rework risk when AP-01 promotes `AnalysisBinding` fields and AP-02 adds lifecycle persistence.

### 7. PR-40 gate boundary

AP-00 documents PR-40 IF3 consumer contracts as existing infrastructure. AP-11 closes the client-side gap without expanding Phase 1 scope or claiming Analyzer parity.

---

## Why not AP-01 first (Option B)

| Concern | Detail |
|---------|--------|
| No dependency relief | AP-01 schema promotion does not fix LIM-P03-001 |
| User-visible gap persists | Export gates remain fail-closed during AP-01/AP-02 work |
| Deferred priority | P09 explicitly prioritized AP-11 over sequential schema work |
| Independent work | AP-11 can ship without waiting for BSDD contract files |

Option B remains valid if supervisor reorders, but evidence favors AP-11 first.

---

## AP-11 scope boundaries (AP-00 freeze)

| In scope | Out of scope |
|----------|--------------|
| Wire `if3` metadata in `runAnalysis` | BSDD schema promotion (AP-01) |
| Align with P07 `if3Metadata` field set | New analysis types beyond `static_linear` |
| Regression tests for binding path | Analyzer physical file parity (BLK-S1-011) |
| `if3ResultGate` / `if3ExportGate` behavior verification | Golden numerics (DEC-S1-0011) |
| Legacy PDF entry point audit (read-only) | Apollo workspace UI (AP-03) |

**Blocker:** BLK-S1-012 — AP-11 **resolves** client portion; export package (AP-10) still depends on downstream units.

---

## AP-00 decisions carried forward

From AP-00 governance (not re-decided in P04):

- AP-11 is an **independent series** — not bundled with AP-01 PR
- No parallel PRs
- Feature flag remains default OFF until supervisor authorizes operational enablement
- Fail-closed preferred over permissive binding defaults
- Rollback per [rollback_strategy.md](../03_validation/rollback_strategy.md)

---

## Verdict block

```text
AP11_SEQUENCE_RECOMMENDATION: AP-11_NEXT_THEN_AP-01
AP11_RATIONALE: LIM-P03-001 client gap; no BSDD dependency; READY_PRIORITY; fail-closed export chain
AP11_NEXT_STEP: AP-11 IF3 client binding fix
AP01_FOLLOWS: BSDD structural envelope promotion
```
