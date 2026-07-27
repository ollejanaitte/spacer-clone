# Apollo

**Authority:** HISTORICAL / RESEARCH INPUT

Navigation for Apollo-related research inputs and immutable handoff snapshots stored in this repository.

## Step 1 — Design Planning

- [Step 1 overview](step1/README.md) — governance, acceptance, and planned P00–P09 PR units

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

## Handoffs

- [APOLLO-FRAME-HANDOFF-20260726-001](handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md)
