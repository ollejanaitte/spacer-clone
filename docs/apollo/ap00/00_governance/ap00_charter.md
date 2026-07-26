# AP-00 Charter — Implementation Governance

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0001  
**Base commit:** `7fadab8119a833bc11ad7f6a313a84300037d2ff` (main @ Step 1 closure)

## Purpose

AP-00 governs **how** Apollo Phase 1 implementation proceeds in spacer-clone after Step 1 closure. It provides:

1. **Authorization boundaries** — which AP-* units may start under `CONDITIONAL_GO`
2. **Forbidden scope enforcement** — fail-closed rules for numerics, golden values, and out-of-scope features
3. **Operational discipline** — branch/PR/merge rules, role delegation, decision and merge logs
4. **Traceability** — linkage from Step 1 blockers and verdicts to implementation gates

AP-00 is the **first implementation PR sequence** (AP-00..AP-18). Subsequent AP-* units depend on AP-00 governance artifacts and feature-flag defaults.

## Goals

| # | Goal |
|---|------|
| G-01 | Record implementation authorization matrix (AP-00..AP-18) derived from Step 1 P09 |
| G-02 | Publish forbidden-scope rules enforceable in PR review and CI |
| G-03 | Establish supervisor/worker delegation model for implementation PRs |
| G-04 | Initialize decision log, delegation log, and merge ledger for AP-* sequence |
| G-05 | Prepare feature-flag and scope-guard scaffolding (P01–P03; not in P00) |

## Non-goals

| Non-goal | Rationale |
|----------|-----------|
| Modifying Step 1 artifacts | Step 1 is frozen planning input (DEC-S1-0002) |
| Modifying handoff package | Immutable snapshot; new revision only |
| Product feature implementation | AP-01..AP-18 own feature delivery |
| Numeric constant adoption | Blocked by BLK-S1-001, BLK-S1-002, BLK-S1-004 |
| Target Standard selection | External governance (DTR-01); not AP-00 scope |
| Golden expected values | DEC-S1-0011: NOT_AUTHORIZED |
| Claiming Analyzer file parity | BLK-S1-011: physical I/O UNKNOWN |

## Relation to Step 1

```text
Step 1 (DESIGN PLANNING)          AP-00 (IMPLEMENTATION GOVERNANCE)
─────────────────────────         ─────────────────────────────────
P00–P09 docs-only PRs      →      AP-00..AP-18 production PRs
COMPLETE_WITH_BLOCKERS     →      CONDITIONAL_GO constraints
DEC-S1-0001..0012          →      DEC-AP00-* (implementation)
implementation_roadmap.md  →      authorization matrix + logs
```

Step 1 **completion** does not grant full implementation authorization. P05 records `IMPLEMENTATION_AUTHORIZATION: NOT_GRANTED` globally; P09 selects **CONDITIONAL_GO** for foundation scaffolding (AP-00..AP-03) and IF3 client binding (AP-11).

AP-00 inherits and **does not reinterpret** these Step 1 verdicts:

```text
APOLLO_STEP1_COMPLETION_VERDICT: COMPLETE_WITH_BLOCKERS
APOLLO_IMPLEMENTATION_READINESS_VERDICT: CONDITIONAL_GO
```

## AP-00 deliverable sequence

| PR unit | Deliverable | Mutable paths (planned) |
|---------|-------------|-------------------------|
| **P00** | Governance bootstrap | `docs/apollo/ap00/` |
| P01 | Feature flag registry | `docs/apollo/ap00/01_feature_flag/`, config stubs |
| P02 | Scope guards | `docs/apollo/ap00/02_scope_guards/` |
| P03 | Validation hooks | `docs/apollo/ap00/03_validation/` |
| final | AP-00 closure report | `docs/apollo/ap00/final/` |

P00 is **docs-only**. No production code, no handoff mutation.

## Sandbox rules (AP-00 P00)

- **Working directory:** `~/Projects/spacer-clone-main`
- **Mutable paths:** `docs/apollo/ap00/`, minimal `docs/apollo/README.md` link update
- **Forbidden paths:** `docs/apollo/step1/**`, `docs/apollo/handoffs/**`, production code, PDFs
- **Git:** explicit-path `git add` only; no `git add -A` / `git add .`
- **Stop after staging:** worker does not commit, push, PR, or merge

## Success criteria (P00)

- [ ] Governance tree created under `docs/apollo/ap00/`
- [ ] Authorization matrix reflects Step 1 `implementation_pr_breakdown.csv`
- [ ] Blocker dependency matrix links BLK-S1-* to blocked AP-* units
- [ ] DEC-AP00-0001 and DEC-AP00-0002 recorded
- [ ] Merge ledger baseline = Step 1 final SHA `7fadab8`
- [ ] Zero staged paths under `step1/`, `handoffs/`, `frontend/`, `backend/`

## References

- [Step 1 charter](../../step1/00_governance/step1_charter.md)
- [Step 1 final verdicts](../../step1/final/step1_verdicts.md)
- [Implementation roadmap](../../step1/08_roadmap/implementation_roadmap.md)
- [Completion gate](../../step1/08_roadmap/completion_gate.md)
