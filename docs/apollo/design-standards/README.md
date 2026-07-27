# Apollo Design Standards — DS-00 / DS-01 / DS-02 Integration Authority

**Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
**Stage:** DS-00 governance baseline + DS-01 Target Standard freeze + DS-02 JIS gap classification
**Date:** 2026-07-27
**Repository baseline:** `128c0cb724270f59ada88b45a11bc1b264a57be4`

`docs/apollo/design-standards/` is the **single current integration authority** for Apollo design-standard governance, adoption status, source priority, and evidence requirements. DS-00 establishes rules and pointers; DS-01 freezes Target Standard identity, edition/errata baseline, philosophy, and Phase 1 volume roles; DS-02 classifies JIS gap placeholders into a governed register without resolving identities. No stage copies standards text, adopts numerics, or amends historical artifacts.

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

## DS-02 completion verdict

```text
DS02_GAP_COUNT_VERDICT: PASS_AS_HISTORICAL_PLACEHOLDER_COUNT
DS02_JIS_IDENTITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_JIS_EDITION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_CITATION_RELATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_EQUIVALENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_APPLICABILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_SOURCE_GAP_RESOLUTION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

All 34 historical JIS gap rows (JIS-001…JIS-034) are **undifferentiated placeholder slots** in immutable handoff `jis_source_gaps.csv` — not evidence of 34 distinct JIS standards. DS-02 classifies every row as `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` with zero identified JIS numbers. No gap row is resolved at DS-02.

Full design-standard freeze remains **not authorized** at DS-01 or DS-02; full freeze gate is **DS-09**. See [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md), [target_standard_freeze.md](01_target_standard/target_standard_freeze.md), and [jis_gap_resolution_report.md](02_jis/jis_gap_resolution_report.md).

## Governance documents

| Document | Role |
|----------|------|
| [design_standard_scope.md](00_governance/design_standard_scope.md) | DS-00 scope, Phase 1 bridge archetype boundaries, later-stage deferrals |
| [source_priority_policy.md](00_governance/source_priority_policy.md) | Authority stack; historical vs current integration paths |
| [adoption_status_model.md](00_governance/adoption_status_model.md) | Allowed adoption statuses and fail-closed rules |
| [copyright_and_evidence_policy.md](00_governance/copyright_and_evidence_policy.md) | Evidence handling, redistribution, no standards copying |
| [decision_ledger.md](00_governance/decision_ledger.md) | Supervisor decisions including DEC-DS00-0001, DEC-DS01-0001, and DEC-DS02-0001 |
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

## DS-02 JIS gap documents

| Document | Role |
|----------|------|
| [jis_source_register.csv](02_jis/jis_source_register.csv) | Governed per-gap JIS identity register (34 rows; all blocked) |
| [jis_gap_resolution_report.md](02_jis/jis_gap_resolution_report.md) | DS-02 gap classification, counts, and verdict set |
| [jis_version_policy.md](02_jis/jis_version_policy.md) | JIS edition classes; forbids automatic newest-version adoption |

## User-supervisor decision (summary)

Recorded **2026-07-27** as [DEC-DS00-0001](00_governance/decision_ledger.md#dec-ds00-0001), closed at DS-01 by [DEC-DS01-0001](00_governance/decision_ledger.md#dec-ds01-0001), JIS gaps classified at DS-02 by [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001):

| Field | Value | DS-01 adoption status |
|-------|-------|----------------------|
| TARGET_STANDARD | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| DESIGN_PHILOSOPHY | 性能規定型設計 | `ADOPTED` |
| VERIFICATION_FORMAT | 部分係数法 | `ADOPTED` |

TARGET_STANDARD **selection** is `ADOPTED`. Official naming strings and ISBN facets are `ADOPTED_WITH_CONDITION` at DS-01 (Ver2.00 + 2026-03-31 errata overlay; Volume V title variance explicit; LOCAL-I print ISBN blocked pending colophon confirmation). **Clause-level mapping** remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (image-export PDFs require human visual confirmation). **JIS identities** (JIS-001…JIS-034) are classified at DS-02 per [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001): all 34 rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`; zero JIS numbers identified. Partial-factor **method** is adopted; numeric partial factors remain blocked until exact source evidence plus supervisor decision (load-side DS-04; resistance/verification-side DS-05). Prior `NOT_SELECTED` labels in handoff and Step 1 artifacts are preserved as `REFERENCE_ONLY` historical evidence.

## Historical artifacts (immutable — do not edit)

| Artifact class | Path | Integration role (DS-00 / DS-01 / DS-02) |
|----------------|------|------------------|
| Handoff package | [../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) | Rank-1 immutable intake evidence |
| Step 1 planning | [../step1/README.md](../step1/README.md) | Historical planning synthesis (pre–DS-00 standards baseline) |
| AP-00 governance | [../ap00/README.md](../ap00/README.md) | Implementation governance (orthogonal to design-standard content) |

## Related Apollo navigation

- [Apollo root](../README.md)
- [Phase 1 scope freeze (planning)](../step1/05_scope_boundary/phase1_scope_freeze.md)
- [Step 1 target standard record (historical)](../step1/02_standards_baseline/target_standard_decision.md)
