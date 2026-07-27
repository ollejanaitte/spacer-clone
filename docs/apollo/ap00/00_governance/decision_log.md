# Decision Log — AP-00 Implementation Governance

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| DEC-AP00-0001 | 2026-07-27 | **Adopt AP-00 implementation governance tree** under `docs/apollo/ap00/` as the operational frame for Apollo Phase 1 production PRs (AP-00..AP-18) | Step 1 closed with `CONDITIONAL_GO` (DEC-S1-0012); implementation requires enforceable authorization boundaries, forbidden scope, branch/PR rules, and logs separate from Step 1 planning artifacts | ACCEPTED |
| DEC-AP00-0002 | 2026-07-27 | **Freeze AP-* numbering AP-00..AP-18** as defined in Step 1 P09 `implementation_roadmap.md` and `implementation_pr_breakdown.csv`; no renumbering or insertion without new DEC-AP00-* entry and supervisor approval | Preserves traceability from Step 1 roadmap to merge ledger; prevents scope drift via ad-hoc PR IDs | ACCEPTED |
| DEC-AP00-0003 | 2026-07-27 | **Adopt `VITE_APOLLO_PHASE1_ENABLED` default OFF** with fail-closed parse (`true` only); gates `/pro/apollo` entry and toolbar control; ON exposes guarded shell only (no workspace body) | P01 entry guard must not allocate Apollo state or expose design-input UI; matches authorization matrix feature-flag default off | ACCEPTED |
| DEC-AP00-0004 | 2026-07-27 | **Adopt pure TypeScript scope and numeric fail-closed guards** under `frontend/src/apollo/` with stable `AP00_*` error codes, Vitest table-driven coverage, and P02 contract docs | AP-01/AP-02 require reusable enforcement of DEC-S1-0008 narrow archetype and DEC-S1-0004/0011 numeric freeze before BSDD promotion or validation hooks | ACCEPTED |
| DEC-AP00-0005 | 2026-07-27 | **Adopt AP-00 validation and merge gate foundation** — P03 docs under `docs/apollo/ap00/03_validation/`, reusable test helpers under `frontend/src/apollo/testing/`, `check_apollo_source_hygiene.mjs`, and discoverable `npm test -- --run src/apollo` suite | AP-* PRs need enforceable test responsibility, hygiene checks, and merge checklist before AP-02 validation pipeline and downstream AP-* units | ACCEPTED |
| DEC-AP00-0006 | 2026-07-27 | **Close AP-00 implementation governance** — P00–P03 verified on `main` @ `15017f8`; final report and verdicts under `docs/apollo/ap00/final/`; `AP00_COMPLETION_VERDICT: COMPLETE`; `AP01_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS`; recommend AP-11 before AP-01 | AP-00 deliverables complete; AP-01/AP-11 may proceed under CONDITIONAL_GO with documented entry gates and sequence | ACCEPTED |

## Inherited Step 1 decisions (reference only)

AP-00 does not amend DEC-S1-0001..0012. Key inherited decisions:

| ID | Summary |
|----|---------|
| DEC-S1-0012 | Step 1 closure; `CONDITIONAL_GO`; AP-00..AP-03 + AP-11 authorized |
| DEC-S1-0008 | Phase 1 scope FROZEN_NARROW |
| DEC-S1-0004 | Target Standard NOT_SELECTED |
| DEC-S1-0011 | GOLDEN_NUMERICS: NOT_AUTHORIZED |

Full log: [step1 decision_log.md](../../step1/00_governance/decision_log.md).

## Change control

New implementation governance decisions require:

1. DEC-AP00-* entry in this log
2. Supervisor approval
3. Cross-update to affected governance docs (authorization matrix, forbidden scope, etc.)
4. Merge ledger note if PR sequence affected
