# Apollo Design Standards — DS-00 / DS-01 Integration Authority

**Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
**Stage:** DS-00 governance baseline + DS-01 Target Standard freeze
**Date:** 2026-07-27
**Repository baseline:** `f56b520a451f95bc67d544b04a5153d0439f8193`

`docs/apollo/design-standards/` is the **single current integration authority** for Apollo design-standard governance, adoption status, source priority, and evidence requirements. DS-00 establishes rules and pointers; DS-01 freezes Target Standard identity, edition/errata baseline, philosophy, and Phase 1 volume roles. Neither stage copies standards text, adopts numerics, or amends historical artifacts.

## DS-00 proceed verdict

```text
DS00_REPOSITORY_PREFLIGHT_VERDICT: PASS
DS00_EXISTING_EVIDENCE_SURVEY_VERDICT: PASS_WITH_FINDINGS
DS00_DUPLICATE_AUTHORITY_VERDICT: PASS_WITH_CONTROL
DS00_LEGACY_STANDARD_CONTAMINATION_VERDICT: PASS_WITH_CONTROL
DS00_PROCEED_VERDICT: PASS
```

## DS-01 completion verdict

```text
DS01_TARGET_STANDARD_VERDICT: PASS_WITH_CONDITION
DS01_EDITION_ERRATA_VERDICT: PASS_WITH_CONDITION
DS01_PERFORMANCE_BASED_DESIGN_VERDICT: PASS
DS01_PARTIAL_FACTOR_METHOD_VERDICT: PASS
DS01_PHASE1_APPLICABILITY_VERDICT: PASS_WITH_EVIDENCE_BLOCKERS
DS01_LEGACY_VERSION_EXCLUSION_VERDICT: PASS
DS01_COMPLETION_VERDICT: COMPLETE_WITH_EVIDENCE_BLOCKERS
```

Full design-standard freeze remains **not authorized** at DS-01; full freeze gate is **DS-09**. See [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md) and [target_standard_freeze.md](01_target_standard/target_standard_freeze.md).

## Governance documents

| Document | Role |
|----------|------|
| [design_standard_scope.md](00_governance/design_standard_scope.md) | DS-00 scope, Phase 1 bridge archetype boundaries, later-stage deferrals |
| [source_priority_policy.md](00_governance/source_priority_policy.md) | Authority stack; historical vs current integration paths |
| [adoption_status_model.md](00_governance/adoption_status_model.md) | Allowed adoption statuses and fail-closed rules |
| [copyright_and_evidence_policy.md](00_governance/copyright_and_evidence_policy.md) | Evidence handling, redistribution, no standards copying |
| [decision_ledger.md](00_governance/decision_ledger.md) | Supervisor decisions including DEC-DS00-0001 and DEC-DS01-0001 |
| [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md) | Integrity anchors, audit summaries, blocker evidence matrix |

## DS-01 Target Standard documents

| Document | Role |
|----------|------|
| [target_standard_freeze.md](01_target_standard/target_standard_freeze.md) | Frozen Target Standard identity, verdict set, legacy exclusion |
| [performance_based_design_philosophy.md](01_target_standard/performance_based_design_philosophy.md) | 性能規定型設計 hierarchy and deemed-to-satisfy rules |
| [partial_factor_method_framework.md](01_target_standard/partial_factor_method_framework.md) | 部分係数法 roles; numeric deferral to DS-04/DS-05 |
| [applicable_volumes_and_sections.md](01_target_standard/applicable_volumes_and_sections.md) | Phase 1 volume roles I–V; clause map blockers |
| [edition_and_errata_register.csv](01_target_standard/edition_and_errata_register.csv) | Edition, ISBN kind (e-book vs print), errata, and locator register |
| [ds01_evidence_register.md](01_target_standard/ds01_evidence_register.md) | Governed DS-01 evidence index (`EVD-DS01-*`) with checksums and blockers |

## User-supervisor decision (summary)

Recorded **2026-07-27** as [DEC-DS00-0001](00_governance/decision_ledger.md#dec-ds00-0001), closed at DS-01 by [DEC-DS01-0001](00_governance/decision_ledger.md#dec-ds01-0001):

| Field | Value | DS-01 adoption status |
|-------|-------|----------------------|
| TARGET_STANDARD | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| DESIGN_PHILOSOPHY | 性能規定型設計 | `ADOPTED` |
| VERIFICATION_FORMAT | 部分係数法 | `ADOPTED` |

TARGET_STANDARD **selection** is `ADOPTED`. Official naming strings and ISBN facets are `ADOPTED_WITH_CONDITION` at DS-01 (Ver2.00 + 2026-03-31 errata overlay; Volume V title variance explicit; LOCAL-I print ISBN blocked pending colophon confirmation). **Clause-level mapping** remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-02 (image-export PDFs require human visual confirmation). Partial-factor **method** is adopted; numeric partial factors remain blocked until exact source evidence plus supervisor decision (load-side DS-04; resistance/verification-side DS-05). Prior `NOT_SELECTED` labels in handoff and Step 1 artifacts are preserved as `REFERENCE_ONLY` historical evidence.

## Historical artifacts (immutable — do not edit)

| Artifact class | Path | Role under DS-00 |
|----------------|------|------------------|
| Handoff package | [../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) | Rank-1 immutable intake evidence |
| Step 1 planning | [../step1/README.md](../step1/README.md) | Historical planning synthesis (pre–DS-00 standards baseline) |
| AP-00 governance | [../ap00/README.md](../ap00/README.md) | Implementation governance (orthogonal to design-standard content) |

## Related Apollo navigation

- [Apollo root](../README.md)
- [Phase 1 scope freeze (planning)](../step1/05_scope_boundary/phase1_scope_freeze.md)
- [Step 1 target standard record (historical)](../step1/02_standards_baseline/target_standard_decision.md)
