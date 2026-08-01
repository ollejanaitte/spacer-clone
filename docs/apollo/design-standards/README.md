# Apollo Design Standards — DS-00 through DS-09 Final Integration Authority

**Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
**Stage:** DS-00 governance through DS-09 final design freeze and numeric-release decision
**Date:** 2026-07-27
**DS-09 authoring baseline:** `3791630414f5f81e34ef5808b16cbc9c5145eefa`

`docs/apollo/design-standards/` is the **single current integration authority** for Apollo design-standard governance, adoption status, source priority, and evidence requirements. DS-00 establishes rules and pointers; DS-01 through DS-05 freeze the source-governance and engineering-design shells without adopting blocked numerics; DS-06 defines the external Analyzer machine-evidence contract; DS-07 governs Golden cases; DS-08 freezes SPACER comparison rules; and DS-09 integrates traceability, independent review, unresolved evidence, and the release decision. No stage copies standards text, invents machine evidence, approves circular expected values, or amends historical artifacts.

## Final design-freeze decision

```text
DS06_FINAL_VERDICT: DOCUMENT_COMPLETE_WITH_MACHINE_EVIDENCE_BLOCKERS
DS07_FINAL_VERDICT: DOCUMENT_COMPLETE_WITH_GOLDEN_EVIDENCE_BLOCKERS
DS08_FINAL_VERDICT: DOCUMENT_COMPLETE_WITH_PARITY_EVIDENCE_BLOCKERS
DS09_FINAL_VERDICT: COMPLETE_WITH_EVIDENCE_BLOCKERS
DOCUMENT_COMPLETION_VERDICT: COMPLETE
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
DIRECT_MAIN_GOVERNANCE_VERDICT: PASS
OVERALL_VERDICT: DESIGN_FREEZE_COMPLETE_WITH_EVIDENCE_BLOCKERS
```

Document completion and numeric release are separate decisions. The current design-document system is complete, but product numeric implementation remains prohibited until the conjunctive [numeric release gate](09_verification/numeric_release_gate.md) passes. Every open source or machine fact is retained in the [unresolved evidence requirements](09_verification/unresolved_evidence_requirements.csv) with the required artifact, acquisition method, tool/license, acceptance criteria, owner, and implementation impact.

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

## DS-05 completion verdict

```text
DS05_PERFORMANCE_REQUIREMENT_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS05_LIMIT_STATE_COVERAGE_VERDICT: PASS_FOR_SUPERVISOR_CANDIDATE_SET_WITH_EXACT_EVIDENCE_BLOCKERS
DS05_VERIFICATION_EQUATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_LIMIT_VALUE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_PARTIAL_FACTOR_APPLICATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_DEEMED_TO_SATISFY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_PHASE1_SCOPE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

DS-05 creates performance requirement (28 rows), limit state (23 rows), verification equation (23 rows), limit value (11 rows), and deemed-to-satisfy (2 rows) registers for Phase 1 under R7 Ver2.00+20260331 partial-factor method. **Zero** adopted verification numerics or equations; no R7 verification clause/table visually confirmed. Phase 1A analysis separated from Phase 1B verification; user formal DS-05 primary structure vs Step1 narrow boundary conflict recorded unresolved (ready_requirements.csv has no phase column). See [phase1_verification_scope.md](05_verification/phase1_verification_scope.md).

DS-09 authorizes the **document freeze only**. It does not close the DS-01 through DS-08 evidence blockers and does not authorize numeric implementation. See [final_design_freeze_report.md](09_verification/final_design_freeze_report.md) and [final_verdicts.md](09_verification/final_verdicts.md).

## EA evidence-acquisition integration (EA-06)

EA-00 through EA-05 built executable harnesses, analytical golden tooling, external run packages, parity comparison tooling, and synthetic dry-run validation. EA-06 integrates those results without rewriting DS-00..09 decisions. Enablement completion is distinct from canonical blocker closure: **76 snapshot rows remain open** (`45 BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`, `31 NOT_APPROVED`; resolved `0`).

| Artifact | Role |
|----------|------|
| [final evidence execution report](../evidence-collection/final_evidence_execution_report.md) | EA-06 14-section integration report |
| [EA final verdicts](../evidence-collection/final_verdicts.md) | Harness, golden, external-run, parity, and overall acquisition tokens |
| [unresolved evidence register (76 rows)](../evidence-collection/unresolved_evidence_register.csv) | Operational blocker snapshot with EA enablement references |
| [evidence traceability matrix](../evidence-collection/evidence_traceability_matrix.csv) | EA deliverable-to-blocker traceability |
| [numeric release gate (EA reassessment)](../evidence-collection/numeric_release_gate.md) | Enablement vs GATE-NR-01..07 closure |

```text
EVIDENCE_HARNESS_VERDICT: COMPLETE
ANALYTICAL_GOLDEN_PACKAGE_VERDICT: COMPLETE
EXTERNAL_RUN_PACKAGE_VERDICT: COMPLETE
PARITY_HARNESS_VERDICT: COMPLETE
EXTERNAL_MACHINE_EVIDENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
REFERENCE_SOFTWARE_GOLDEN_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
SPACER_ACTUAL_NUMERIC_PARITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
OVERALL_VERDICT: EVIDENCE_ACQUISITION_READY_EXTERNAL_RUN_REQUIRED
```

[unresolved_evidence_requirements.csv](09_verification/unresolved_evidence_requirements.csv) adds `ea_enablement_reference` and `ea_status_note` per row; statuses are not closed by EA-06.

## POST-EA-01 local evidence consolidation (2026-07-28)

POST-EA-01 adds a new local authority set at [docs/apollo/post-ea-01/](../post-ea-01/) for checksum-bound local source inventory, source-closure blocker consolidation, identity blocker fixation, non-promoted machine/golden/parity placeholders, and the final blocked reassessment. It does not reopen DS or EA stages and does not change the release decision.

## Consolidated bridge research (2026-08-01)

PR-B selectively integrates Stage 5A/5B bridge-standards research summaries and traceability from `bridge-standards-research` without amending DS-00..09 decisions or adopting blocked numerics.

| Artifact | Role |
|----------|------|
| [research/consolidated-2026-08-01/](research/consolidated-2026-08-01/README.md) | Stage 5A handoff, PDF inventory metadata, Stage 5B research CSV/MD/JSON |
| [handoffs/consolidated-2026-08-01/](handoffs/consolidated-2026-08-01/README.md) | Apollo Stage 5 decoding handoff manifest and review |

Provenance and SHA-256 deduplication: [project_consolidation_manifest.csv](../../migration/project_consolidation_manifest.csv). PDFs and page-image evidence remain outside Git per [local archive policy](../../migration/local_archive_policy.md).

## Governance documents

| Document | Role |
|----------|------|
| [design_standard_scope.md](00_governance/design_standard_scope.md) | DS-00 scope, Phase 1 bridge archetype boundaries, later-stage deferrals |
| [source_priority_policy.md](00_governance/source_priority_policy.md) | Authority stack; historical vs current integration paths |
| [adoption_status_model.md](00_governance/adoption_status_model.md) | Allowed adoption statuses and fail-closed rules |
| [copyright_and_evidence_policy.md](00_governance/copyright_and_evidence_policy.md) | Evidence handling, redistribution, no standards copying |
| [decision_ledger.md](00_governance/decision_ledger.md) | Supervisor decisions including DEC-DS00-0001, DEC-DS01-0001, DEC-DS02-0001, DEC-DS03-0001, DEC-DS04-0001, and DEC-DS05-0001 |
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

## DS-05 Performance Verification / Limit State documents

| Document | Role |
|----------|------|
| [performance_requirement_register.csv](05_verification/performance_requirement_register.csv) | Governed per-requirement register (28 rows; `adoption_status` blocked for PR001–023; OUT_OF_SCOPE for PR024–028) |
| [limit_state_register.csv](05_verification/limit_state_register.csv) | Limit state coverage per requirement (23 rows) |
| [verification_equation_register.csv](05_verification/verification_equation_register.csv) | Blocked partial-factor verification shells (23 rows; blank equation forms) |
| [limit_value_register.csv](05_verification/limit_value_register.csv) | Blocked SLS/limit shells (11 rows; zero limit numerics) |
| [deemed_to_satisfy_register.csv](05_verification/deemed_to_satisfy_register.csv) | Generic blocked deemed-to-satisfy shells (2 rows) |
| [phase1_verification_scope.md](05_verification/phase1_verification_scope.md) | DS-05 scope, Phase 1A/1B separation, evidence packages, conflict record, and verdict set |

## DS-06 Analyzer Physical I/O documents

| Document | Role |
|----------|------|
| [analyzer_physical_io_spec.md](06_analyzer/analyzer_physical_io_spec.md) | Fail-closed physical invocation, file, process, failure, cleanup, and authority specification |
| [analyzer_identity_register.csv](06_analyzer/analyzer_identity_register.csv) | Seven non-conflated repository, IF3, external, SPACER, and placeholder identities |
| [analyzer_probe_matrix.csv](06_analyzer/analyzer_probe_matrix.csv) | Twenty-two positive, negative, locale, concurrency, recovery, and mapping probes |
| [analyzer_evidence_register.csv](06_analyzer/analyzer_evidence_register.csv) | Evidence authority and machine-observation register |
| [unit_coordinate_dof_convention.md](06_analyzer/unit_coordinate_dof_convention.md) | Unit, coordinate, DOF, I/J-end, force, moment, and reaction evidence rules |
| [analyzer_error_exit_license_matrix.csv](06_analyzer/analyzer_error_exit_license_matrix.csv) | Sixteen success/failure/license scenarios |
| [analyzer_blocker_register.csv](06_analyzer/analyzer_blocker_register.csv) | Ten exact machine-evidence packages |

## DS-07 Golden governance documents

| Document | Role |
|----------|------|
| [golden_governance.md](07_golden/golden_governance.md) | Golden types, purposes, custody, independence, reproducibility, and approval rules |
| [golden_case_catalog.csv](07_golden/golden_case_catalog.csv) | Sixteen candidate analytical, reference, regression, export, and negative cases |
| [analytical_golden_spec.md](07_golden/analytical_golden_spec.md) | Independent analytical derivation requirements |
| [reference_software_golden_spec.md](07_golden/reference_software_golden_spec.md) | Fixed-version reference-software evidence requirements |
| [approved_regression_golden_spec.md](07_golden/approved_regression_golden_spec.md) | Parent-oracle and immutable regression promotion requirements |
| [tolerance_policy.md](07_golden/tolerance_policy.md) | Separate absolute, relative, zero, display, internal, rounding, and conversion rules |
| [golden_approval_register.csv](07_golden/golden_approval_register.csv) | One approval row per candidate; all remain not approved |
| [golden_blocker_register.csv](07_golden/golden_blocker_register.csv) | Eight exact Golden evidence packages |

## DS-08 SPACER parity documents

| Document | Role |
|----------|------|
| [spacer_parity_scope.md](08_spacer_parity/spacer_parity_scope.md) | Fifteen parity classifications and comparison boundary |
| [semantic_parity_spec.md](08_spacer_parity/semantic_parity_spec.md) | Identity, topology, material, support, load, and combination semantics |
| [numeric_parity_spec.md](08_spacer_parity/numeric_parity_spec.md) | Fail-closed symmetric numeric comparison algorithm |
| [sign_coordinate_member_end_conventions.md](08_spacer_parity/sign_coordinate_member_end_conventions.md) | Predeclared coordinate, DOF, I/J, sign, unit, and equilibrium transformations |
| [spacer_version_evidence_register.csv](08_spacer_parity/spacer_version_evidence_register.csv) | SPACER, STATICS, Analyzer, Apollo, and comparator identity evidence |
| [parity_case_catalog.csv](08_spacer_parity/parity_case_catalog.csv) | One case per parity classification; actual comparisons remain blocked |
| [parity_approval_register.csv](08_spacer_parity/parity_approval_register.csv) | Separate semantic/numeric approval controls |
| [parity_blocker_register.csv](08_spacer_parity/parity_blocker_register.csv) | Eight exact parity evidence packages |

## DS-09 Final verification documents

| Document | Role |
|----------|------|
| [requirement_traceability_matrix.csv](09_verification/requirement_traceability_matrix.csv) | DS-00 through DS-09 source, implementation aperture, validation, Golden, parity, and blocker traceability |
| [independent_review_matrix.csv](09_verification/independent_review_matrix.csv) | Adverse-hypothesis review and residual-blocker record |
| [source_gap_register.csv](09_verification/source_gap_register.csv) | Non-additive source-gap roll-ups |
| [unresolved_evidence_requirements.csv](09_verification/unresolved_evidence_requirements.csv) | Exact remaining evidence artifacts, acquisition, tools/licenses, acceptance, owners, and impact |
| [numeric_release_gate.md](09_verification/numeric_release_gate.md) | Conjunctive numeric-release predicates and allowed/prohibited next work |
| [final_design_freeze_report.md](09_verification/final_design_freeze_report.md) | Integrated coverage, review, validation, and document-freeze decision |
| [final_verdicts.md](09_verification/final_verdicts.md) | Canonical DS-06 through DS-09 and final verdict tokens |

## User-supervisor decision (summary)

Recorded **2026-07-27** as [DEC-DS00-0001](00_governance/decision_ledger.md#dec-ds00-0001), closed at DS-01 by [DEC-DS01-0001](00_governance/decision_ledger.md#dec-ds01-0001), JIS gaps classified at DS-02 by [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001), material properties classified at DS-03 by [DEC-DS03-0001](00_governance/decision_ledger.md#dec-ds03-0001), loads classified at DS-04 by [DEC-DS04-0001](00_governance/decision_ledger.md#dec-ds04-0001), and verification classified at DS-05 by [DEC-DS05-0001](00_governance/decision_ledger.md#dec-ds05-0001). DS-06 through DS-09 add evidence acquisition and release governance without changing those decisions:

| Field | Value | DS-01 adoption status |
|-------|-------|----------------------|
| TARGET_STANDARD | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| DESIGN_PHILOSOPHY | 性能規定型設計 | `ADOPTED` |
| VERIFICATION_FORMAT | 部分係数法 | `ADOPTED` |

TARGET_STANDARD **selection** is `ADOPTED`. Official naming strings and ISBN facets are `ADOPTED_WITH_CONDITION` at DS-01 (Ver2.00 + 2026-03-31 errata overlay; Volume V title variance explicit; LOCAL-I print ISBN blocked pending colophon confirmation). **Clause-level mapping** remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (image-export PDFs require human visual confirmation). **JIS identities** (JIS-001…JIS-034) are classified at DS-02 per [DEC-DS02-0001](00_governance/decision_ledger.md#dec-ds02-0001): all 34 rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`; zero JIS numbers identified. Partial-factor **method** is adopted; load-side numeric partial factors and combination coefficients are classified at DS-04 per [DEC-DS04-0001](00_governance/decision_ledger.md#dec-ds04-0001) — all blocked with zero adopted numerics; resistance/verification-side factors and equations are classified at DS-05 per [DEC-DS05-0001](00_governance/decision_ledger.md#dec-ds05-0001) — all blocked with zero adopted numerics. Prior `NOT_SELECTED` labels in handoff and Step 1 artifacts are preserved as `REFERENCE_ONLY` historical evidence.

## Historical artifacts (immutable — do not edit)

| Artifact class | Path | Integration role (DS-00 through DS-09) |
|----------------|------|------------------|
| Handoff package | [../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) | Rank-1 immutable intake evidence |
| Step 1 planning | [../step1/README.md](../step1/README.md) | Historical planning synthesis (pre–DS-00 standards baseline) |
| AP-00 governance | [../ap00/README.md](../ap00/README.md) | Implementation governance (orthogonal to design-standard content) |

## Related Apollo navigation

- [Apollo root](../README.md)
- [Phase 1 scope freeze (planning)](../step1/05_scope_boundary/phase1_scope_freeze.md)
- [Step 1 target standard record (historical)](../step1/02_standards_baseline/target_standard_decision.md)
