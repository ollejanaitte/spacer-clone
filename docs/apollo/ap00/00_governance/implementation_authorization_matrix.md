# Implementation Authorization Matrix — AP-00..AP-18

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Source:** [implementation_pr_breakdown.csv](../../step1/08_roadmap/implementation_pr_breakdown.csv), [step1_verdicts.md](../../step1/final/step1_verdicts.md)  
**Decision:** DEC-S1-0012 (inherited), DEC-AP00-0001

This matrix records **Step 1 readiness labels** for each implementation PR. It does not grant authorization beyond `CONDITIONAL_GO` constraints.

## Global verdict

```text
APOLLO_IMPLEMENTATION_READINESS_VERDICT: CONDITIONAL_GO
```

Only units marked **READY**, **READY_PRIORITY**, or **CONDITIONAL** (with noted constraints) may proceed. **NOGO_NUMERICS** and **DEFERRED** require blocker clearance or supervisor deferral.

## Authorization summary (CONDITIONAL_GO)

| AP-* | Readiness | Authorized under CONDITIONAL_GO? | Notes |
|------|-----------|----------------------------------|-------|
| AP-00 | READY | **YES** | Governance scaffolding; feature flags default off |
| AP-01 | READY | **YES** | BSDD structural envelope only; no numerics |
| AP-02 | READY | **YES** | Lifecycle, validation, stable ID foundation |
| AP-03 | READY | **YES** | Workspace shell; scope assertion on create |
| AP-04 | CONDITIONAL | Partial | Geometry shell; PLACEHOLDER numerics; BLK-S1-001 blocks adopted road loads |
| AP-05 | CONDITIONAL | Partial | Geometry shell; BLK-S1-004 blocks auto dimensions |
| AP-06 | CONDITIONAL | Partial | Geometry shell; BLK-S1-004/005 |
| AP-07 | NOGO_NUMERICS | Shell only | Entity shell with PLACEHOLDER; **ADOPTED numerics forbidden** |
| AP-08 | NOGO_NUMERICS | Shell only | Load kinds only; **adopted magnitudes forbidden** |
| AP-09 | CONDITIONAL | Partial | Internal solver path; no Analyzer parity claims |
| AP-10 | CONDITIONAL | Partial | Export package; gated on IF3 binding downstream |
| AP-11 | READY_PRIORITY | **YES** | IF3 client binding fix (LIM-P03-001); priority |
| AP-12 | CONDITIONAL | Partial | Result import; non-numeric mapping only |
| AP-13 | CONDITIONAL | Partial | Stale/export gates; LIM-P03-003 blocks PRINT visual |
| AP-14 | NOGO_NUMERICS | Shell only | Workflow shell; **numeric checks forbidden** |
| AP-15 | DEFERRED | No | LIM-P03-011; OD8-04 |
| AP-16 | CONDITIONAL | Partial | Reports gated by IF3; requires AP-11 |
| AP-17 | CONDITIONAL_NO_GOLDEN | Partial | Harness only; **golden comparison forbidden** |
| AP-18 | DEFERRED | No | Requires HIGH blocker disposition |

**Immediate start (supervisor-authorized):** AP-00, AP-01, AP-02, AP-03, AP-11.

## Full matrix

| AP-* | Title | Depends on | Blockers | Phase 1 scope | Readiness |
|------|-------|------------|----------|---------------|-----------|
| AP-00 | Implementation governance and feature flags | — | — | governance_scaffolding | READY |
| AP-01 | BridgeSuperstructureDesignDocument contracts | AP-00 | — | schema_foundation | READY |
| AP-02 | Schema migration and validation foundation | AP-01 | — | schema_foundation | READY |
| AP-03 | Apollo workspace and project entry | AP-02 | — | workspace_shell | READY |
| AP-04 | Bridge basic conditions | AP-03 | BLK-S1-001 | geometry_shell | CONDITIONAL |
| AP-05 | Span support and girder geometry | AP-04 | BLK-S1-004 | geometry_shell | CONDITIONAL |
| AP-06 | Deck cross beam and bearing definitions | AP-05 | BLK-S1-004; BLK-S1-005 | geometry_shell | CONDITIONAL |
| AP-07 | Material and section candidate registry | AP-02 | BLK-S1-001; BLK-S1-002; BLK-S1-005 | material_shell | NOGO_NUMERICS |
| AP-08 | Load definition and generation rules | AP-06; AP-07 | BLK-S1-001; BLK-S1-004 | load_shell | NOGO_NUMERICS |
| AP-09 | Frame generation core | AP-05; AP-06; AP-07; AP-08 | BLK-S1-011 | frame_export | CONDITIONAL |
| AP-10 | SuperstructureToFramePackage export | AP-09 | BLK-S1-012 | frame_export | CONDITIONAL |
| AP-11 | IF3 binding and analysis launch | AP-10 | BLK-S1-012 (resolves) | integration | READY_PRIORITY |
| AP-12 | Result import and design mapping | AP-11 | BLK-S1-001 | integration | CONDITIONAL |
| AP-13 | Stale reanalysis and export gate | AP-11; AP-12 | LIM-P03-003 | integration | CONDITIONAL |
| AP-14 | Preliminary design checks | AP-12; AP-08 | BLK-S1-001; BLK-S1-002; BLK-S1-004 | design_checks | NOGO_NUMERICS |
| AP-15 | Standard section and arrangement drawings | AP-05; AP-06 | LIM-P03-011; OD8-04 | drawings_preview | DEFERRED |
| AP-16 | Reports and controlled exports | AP-13 | BLK-S1-012; LIM-P03-003 | reports | CONDITIONAL |
| AP-17 | Reference Bridge integration verification | AP-03; AP-09; AP-11; AP-13 | BLK-S1-001 | validation_harness | CONDITIONAL_NO_GOLDEN |
| AP-18 | Phase 1 release closure | AP-00..AP-17 (subset) | BLK-S1-001; BLK-S1-002; BLK-S1-011 | release | DEFERRED |

## Readiness label definitions

| Label | Meaning |
|-------|---------|
| READY | May proceed when dependencies satisfied; no numeric blockers |
| READY_PRIORITY | READY + explicit supervisor priority (AP-11) |
| CONDITIONAL | Permitted with PLACEHOLDER/null numerics and documented constraints |
| NOGO_NUMERICS | Shell/scaffolding only; adopted numerics **forbidden** |
| CONDITIONAL_NO_GOLDEN | Integration harness allowed; golden expected values **forbidden** |
| DEFERRED | Do not start until blockers cleared or supervisor defers |

## Enforcement

PR reviewers MUST verify:

1. AP-* ID in PR title/body matches authorized readiness
2. No adopted numerics in NOGO_NUMERICS units
3. No golden comparison in AP-17
4. Feature flag default remains **off** until AP-00 final closure

See [forbidden_scope.md](forbidden_scope.md) and [blocker_dependency_matrix.md](blocker_dependency_matrix.md).
