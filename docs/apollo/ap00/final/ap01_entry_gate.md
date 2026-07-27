# AP-01 Entry Gate — BSDD Contracts

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00 (P04)  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0006  
**Verdict:** `AP01_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS`

## Purpose

Formalize conditions under which **AP-01 — BridgeSuperstructureDesignDocument contracts** may start after AP-00 closure. This gate does not grant full Phase 1 implementation authorization.

---

## Preconditions (all required)

| # | Condition | Evidence |
|---|-----------|----------|
| 1 | AP-00 P00–P03 merged to `main` | [merge_ledger.md](../logs/merge_ledger.md) |
| 2 | Feature flag default OFF | `featureFlag.ts`; DEC-AP00-0003 |
| 3 | Entry route fail-closed | `entryGuard.ts`; entry guard tests |
| 4 | Phase 1 scope guard ready | `phase1ScopeGuard.ts`; P02 contract docs |
| 5 | Numeric authority model ready | `numericAuthorityGuard.ts`; P02 contract docs |
| 6 | Target Standard NOT_SELECTED guard ready | Rejects ADOPTED without selection |
| 7 | Validation/merge gate ready | P03 docs; hygiene script; targeted test suite |
| 8 | Step 1 artifacts unchanged | No AP-00 commits modify `docs/apollo/step1/` |
| 9 | Handoff package unchanged | No AP-00 commits modify `docs/apollo/handoffs/` |
| 10 | Blocker register linked | [blocker_dependency_matrix.md](../00_governance/blocker_dependency_matrix.md) |

---

## AP01_ALLOWED

Under `GO_WITH_NON_NUMERIC_RESTRICTIONS`:

| Work | Detail |
|------|--------|
| Schema promotion | Promote planning `schema_draft.json` envelope to `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` |
| TypeScript types | Generated or hand-authored types aligned with schema |
| Validator entrypoint | JSON Schema validation; fail-closed on structural violations |
| `schemaId` registration | Register BSDD contract in schema registry |
| Nullable/unknown numerics | Fields may be null, PLACEHOLDER, or UNKNOWN — not ADOPTED |
| Guard integration | Reuse AP-00 `phase1ScopeGuard` / `numericAuthorityGuard` vocabulary |
| Contract tests | Round-trip parse; RB-P1-001 draft **invalid until PLACEHOLDER resolved** (expected) |
| Documentation | AP-01 contract docs under agreed path |

---

## AP01_FORBIDDEN

| Work | Reason |
|------|--------|
| Adopted load magnitudes, material constants, coefficients | BLK-S1-001, BLK-S1-004; DEC-S1-0004 |
| Golden expected values / RB-P1-001 production fixture | DEC-S1-0011 |
| Direct copy of planning schema without promotion review | Planning ≠ production (P06) |
| UI workspace, geometry editors, analysis run | AP-03, AP-04+ |
| Document lifecycle / migration / checksum persistence | AP-02 |
| Analyzer file parity claims | BLK-S1-011 |
| Feature flag default ON | DEC-AP00-0003 |
| Step 1 or handoff mutation | Immutable inputs |
| Target Standard selection or inference | Supervisor/external gate only |

---

## AP01_REQUIRED_TESTS

Minimum gate per [merge_gate.md](../03_validation/merge_gate.md):

- `npm test -- --run src/apollo` — PASS (guard regression)
- JSON Schema validation tests for promoted BSDD envelope
- TypeScript typecheck against new contract types
- `npm run lint` / `npm run build` — PASS
- `node scripts/check_apollo_source_hygiene.mjs` — PASS
- No golden numerics in fixtures; PLACEHOLDER explicitly labeled
- RB-P1-001 draft parse test — expect fail-closed until placeholders resolved

---

## AP01_REQUIRED_DOCS

- AP-01 PR description: scope, non-scope, blockers, schema impact
- Contract README or schema changelog entry
- Update implementation authorization matrix if readiness label changes
- Merge ledger entry on AP-01 merge

---

## AP01_STOP_CONDITIONS

Stop and escalate to supervisor if:

- Planning schema promoted verbatim without structural review
- ADOPTED numeric fields introduced
- Feature flag default changed to ON
- Step 1 or handoff files require modification
- Scope guard bypass or Phase 1 archetype expansion
- Migration logic introduced (belongs in AP-02)
- Workspace UI introduced (belongs in AP-03)
- Required checks fail on `main` after merge
- Unrelated production changes bundled in AP-01 PR

---

## Dependency note

**Recommended sequence:** Complete **AP-11** (IF3 client binding) before AP-01 unless supervisor explicitly reorders. See [ap11_dependency_note.md](ap11_dependency_note.md).

AP-01 depends on AP-00 only (per roadmap). AP-02 depends on AP-01. AP-03 depends on AP-02.

---

## Verdict block

```text
AP01_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS
AP01_ALLOWED: BSDD structural envelope — schema, types, validator, schemaId
AP01_FORBIDDEN: numerics, golden, UI, migration, parity claims, flag ON
AP01_NEXT_AFTER_AP00: AP-11 (recommended) then AP-01
```
