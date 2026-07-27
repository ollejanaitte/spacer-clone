# Apollo Design Standards — DS-00 / DS-01 / DS-02 / DS-03 / DS-04 Integration Authority

**Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
**Stage:** DS-00 governance baseline + DS-01 Target Standard freeze + DS-02 JIS gap classification + DS-03 Material Properties freeze + DS-04 Loads / Factors / Combinations freeze
**Date:** 2026-07-27
**Repository baseline:** `c89d2cecf0877334668b9cea109121887c206896`

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

## DS-03 completion verdict

```text
DS03_MATERIAL_COVERAGE_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_VALUE_SOURCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_UNIT_VERDICT: PASS_FOR_GOVERNANCE_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_APPLICABILITY_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_INTERNAL_CONSISTENCY_VERDICT: PASS
DS03_UNSOURCED_NUMERICS_VERDICT: PASS
DS03_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

DS-03 creates the material properties register (44 rows; **zero** adopted numerics) and applicability matrix (18 groups) for Phase 1 steel, RC deck, rebar, bolts, welding, bearing boundary, and corrosion/protection. JIS chain remains blocked per DS-02; RBS/handoff evidence remains location-only. See [material_source_report.md](03_materials/material_source_report.md).

## DS-04 completion verdict

```text
DS04_LOAD_MODEL_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS04_LOAD_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_COMBINATION_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIMULTANEITY_EXCLUSIVITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIGN_RULE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_PERFORMANCE_TRACEABILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_UNSOURCED_NUMERICS_VERDICT: PASS
DS04_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

DS-04 creates load model (14 rows), load-side factor (10 rows), combination shell (1 row), and simultaneity/exclusivity rule-class shells (5 rows) for Phase 1 under R7 Ver2.00+20260331 partial-factor method. **Zero** adopted load numerics; no R7 load clause/table visually confirmed. `phase1_status` and `adoption_status` are separate columns on load models. See [load_governance_report.md](04_loads/load_governance_report.md).

Full design-standard freeze remains **not authorized** at DS-01, DS-02, DS-03, or DS-04; full freeze gate is **DS-09**. See [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md), [target_standard_freeze.md](01_target_standard/target_standard_freeze.md), [jis_gap_resolution_report.md](02_jis/jis_gap_resolution_report.md), [material_source_report.md](03_materials/material_source_report.md), and [load_governance_report.md](04_loads/load_governance_report.md).

## Governance documents

| Document | Role |
|----------|------|
| [design_standard_scope.md](00_governance/design_standard_scope.md) | DS-00 scope, Phase 1 bridge archetype boundaries, later-stage deferrals |
| [source_priority_policy.md](00_governance/source_priority_policy.md) | Authority stack; historical vs current integration paths |
| [adoption_status_model.md](00_governance/adoption_status_model.md) | Allowed adoption statuses and fail-closed rules |
| [copyright_and_evidence_policy.md](00_governance/copyright_and_evidence_policy.md) | Evidence handling, redistribution, no standards copying |
| [decision_ledger.md](00_governance/decision_ledger.md) | Supervisor decisions including DEC-DS00-0001, DEC-DS01-0001, DEC-DS02-0001, DEC-DS03-0001, and DEC-DS04-0001 |
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

## DS-03 Material Properties documents

| Document | Role |
|----------|------|
| [material_properties_register.csv](03_materials/material_properties_register.csv) | Governed per-property material register (44 rows; all numeric values blocked) |
| [material_applicability_matrix.csv](03_materials/material_applicability_matrix.csv) | Phase 1A/1B property-group applicability (18 groups) |
| [material_source_report.md](03_materials/material_source_report.md) | DS-03 source hierarchy, policies, evidence packages, and verdict set |

## DS-04 Loads / Factors / Combinations documents

| Document | Role |
|----------|------|
| [load_model_register.csv](04_loads/load_model_register.csv) | Governed per-load-model register (14 rows; `phase1_status` + `adoption_status`; all identities/magnitudes blocked) |
| [load_factor_register.csv](04_loads/load_factor_register.csv) | Load-side partial and adjustment factors (10 rows; one shell per physical load + one impact adjustment; all numerics blocked) |
| [load_combination_register.csv](04_loads/load_combination_register.csv) | Generic blocked combination shell (1 row; no component loads or coefficients at DS-04) |
| [simultaneity_and_exclusivity_rules.csv](04_loads/simultaneity_and_exclusivity_rules.csv) | Five rule-class shells (simultaneity, exclusivity, favorability, envelope, zero-inclusion) |
| [load_governance_report.md](04_loads/load_governance_report.md) | DS-04 taxonomy, fail-closed policies, evidence packages, and verdict set |

## User-supervisor decision (summary)

Recorded **2026-07-27** as [DEC-DS00-0001](00_governance/decision_ledger.md#dec-ds00-0001), closed at DS-01 by [DEC-DS01-0001](00_governance/decision_ledger.md#dec-ds01-0001), JIS gaps classified at DS-02 by [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001), material properties classified at DS-03 by [DEC-DS03-0001](00_governance/decision_ledger.md#dec-ds03-0001), loads classified at DS-04 by [DEC-DS04-0001](00_governance/decision_ledger.md#dec-ds04-0001):

| Field | Value | DS-01 adoption status |
|-------|-------|----------------------|
| TARGET_STANDARD | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| DESIGN_PHILOSOPHY | 性能規定型設計 | `ADOPTED` |
| VERIFICATION_FORMAT | 部分係数法 | `ADOPTED` |

TARGET_STANDARD **selection** is `ADOPTED`. Official naming strings and ISBN facets are `ADOPTED_WITH_CONDITION` at DS-01 (Ver2.00 + 2026-03-31 errata overlay; Volume V title variance explicit; LOCAL-I print ISBN blocked pending colophon confirmation). **Clause-level mapping** remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (image-export PDFs require human visual confirmation). **JIS identities** (JIS-001…JIS-034) are classified at DS-02 per [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001): all 34 rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`; zero JIS numbers identified. Partial-factor **method** is adopted; load-side numeric partial factors and combination coefficients are classified at DS-04 per [DEC-DS04-0001](00_governance/decision_ledger.md#dec-ds04-0001) — all blocked with zero adopted numerics; resistance/verification-side factors remain DS-05. Prior `NOT_SELECTED` labels in handoff and Step 1 artifacts are preserved as `REFERENCE_ONLY` historical evidence.

## Historical artifacts (immutable — do not edit)

| Artifact class | Path | Integration role (DS-00 / DS-01 / DS-02 / DS-03 / DS-04) |
|----------------|------|------------------|
| Handoff package | [../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) | Rank-1 immutable intake evidence |
| Step 1 planning | [../step1/README.md](../step1/README.md) | Historical planning synthesis (pre–DS-00 standards baseline) |
| AP-00 governance | [../ap00/README.md](../ap00/README.md) | Implementation governance (orthogonal to design-standard content) |

## Related Apollo navigation

- [Apollo root](../README.md)
- [Phase 1 scope freeze (planning)](../step1/05_scope_boundary/phase1_scope_freeze.md)
- [Step 1 target standard record (historical)](../step1/02_standards_baseline/target_standard_decision.md)
