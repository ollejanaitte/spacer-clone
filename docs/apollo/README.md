# Apollo

**Authority:** HISTORICAL / RESEARCH INPUT

Navigation for Apollo-related research inputs and immutable handoff snapshots stored in this repository.

## Step 1 — Design Planning

- [Step 1 overview](step1/README.md) — governance, acceptance, and planned P00–P09 PR units

## Step 10 — Reference Bridge 001 Reproduction Project

- [Phase 0 overview](step10/reference_bridge_001/phase0/README.md) — old plan freeze, source manifest, STEP 10 roadmap
- [RB-S10-001 definition](step10/reference_bridge_001/phase0/04_reference_bridge_001_definition.md) — bridge identity and crosswalk with RB-P1-001
- [Source manifest](step10/reference_bridge_001/phase0/source_original_manifest.csv) — external PDF manifest with SHA256 and page counts
- [STEP 10 roadmap](step10/reference_bridge_001/phase0/06_step10_redefinition_and_phase_map.md) — Phase 0–15 plan

## AP-00 — Implementation Governance

- [AP-00 overview](ap00/README.md) — Phase 1 implementation governance; `CONDITIONAL_GO` constraints; AP-00..AP-18 authorization

## Design Standards — DS-00

- [Design standards (current integration authority)](design-standards/README.md) — DS-00 governance baseline; Target Standard selection; adoption status and evidence policy

## Evidence Acquisition — EA-00..EA-06

- [Evidence collection integration](evidence-collection/final_evidence_execution_report.md) — EA-06 final gate reassessment; enablement complete; external run required
- [EA verdicts](evidence-collection/final_verdicts.md) — harness, golden, external-run, parity, and overall acquisition tokens
- [Unresolved evidence register (76 rows)](evidence-collection/unresolved_evidence_register.csv) — operational snapshot with EA enablement references; 0 resolved
- [Evidence traceability matrix](evidence-collection/evidence_traceability_matrix.csv) — EA deliverable to blocker linkage
- [Numeric release gate (EA reassessment)](evidence-collection/numeric_release_gate.md) — enablement vs closure; GATE-NR-01..07 unchanged blocked posture
- [POST-EA-01 consolidation](post-ea-01/06_final/final_post_ea_01_report.md) — local licensed-source and external-machine evidence consolidation; numeric release still blocked
- Stage deliverables: [EA-00 inventory](evidence-collection/00_inventory/), [EA-01 harness](evidence-collection/01_harness/), [EA-02 analytical golden](evidence-collection/02_analytical_golden/), [EA-03 external run package](evidence-collection/03_external_run_package/), [EA-04 parity harness](evidence-collection/04_parity_harness/), [EA-05 dry run](evidence-collection/05_dry_run/)

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

## Manual research (consolidated 2026-08-01)

- [Consolidated Apollo manual research](research/consolidated-2026-08-01/README.md) — PR-C selective integration from external `apollo` source; summaries, feature/standards CSV, inventory indexes
- [Consolidated Apollo handoffs](handoffs/consolidated-2026-08-01/README.md) — external SC-20260726-001 acceptance/review metadata

## Verification / operator evidence (consolidated 2026-08-01)

- [Verification evidence index](index/README.md) — PR-D package map and local-archive pointers
- [U3 evidence summary](u3-evidence/summary/summary.md) — checkpoint summary / selected result (raw txt excluded)
- [PR5 smoke summary](pr5-smoke/README.md) — browser smoke summary + JSON要約 (STL/PNG/log/raw JSON excluded)
- [Operator smoke formal summary](operator-smoke/report.md) — formal summary + one representative PNG

## Handoffs

- [APOLLO-FRAME-HANDOFF-20260726-001](handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md)
