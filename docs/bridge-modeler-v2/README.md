# Bridge Modeler V2 — Design Package Index

Supervisor: Cursor Grok 4.5  
Worker docs: Xiaomi MiMo (build agent)  
Status: Design complete for Phase 1–5, AC matrix + fixtures defined (implementation not started)

## Reading order

1. [_supervisor_decisions.md](./_supervisor_decisions.md) — locked ADRs and naming
2. [_evidence_inventory.md](./_evidence_inventory.md) — code evidence only
3. [00_bridge_modeler_v2_master_scope.md](./00_bridge_modeler_v2_master_scope.md)
4. [01_architecture_and_domain_model.md](./01_architecture_and_domain_model.md)
5. Phase designs: [02](./02_phase1_liner_bridge_interval.md) … [06](./06_phase5_results_drawing_dxf.md)
6. Cross-cutting: [07](./07_persistence_versioning_migration.md) [08](./08_diagnostics_and_validation.md) [09](./09_test_and_verification_plan.md)
7. Delivery: [10](./10_implementation_roadmap_and_pr_plan.md) [11](./11_traceability_matrix.md) [12](./12_risk_register_and_open_decisions.md)
8. Execution: [13](./13_open_decisions_resolution.md) [14](./14_implementation_contract_catalog.md) [15](./15_integrated_execution_and_release_plan.md) [16](./16_acceptance_criteria_matrix.md)

## Audit files

- [_audit_gap_stage1.md](./_audit_gap_stage1.md) — Stage 1 gap analysis
- [_audit_contract_evidence_stage2.md](./_audit_contract_evidence_stage2.md) — Stage 2 contract evidence

## First implementation PR

See **PR-BMV2-001** (domain foundation types) in `10_implementation_roadmap_and_pr_plan.md`, ideally after or with **PR-BMV2-008** (stable ID utils). Route shell is **PR-BMV2-002**. First PR = **PR-BMV2-008** (stable ID utils).

## Non-goals of this package

- No production code, schema JSON, or API implementation in this documentation drop.
- Legacy `BridgeWizard` remains as-is until a future deprecation PR (OD-05).
