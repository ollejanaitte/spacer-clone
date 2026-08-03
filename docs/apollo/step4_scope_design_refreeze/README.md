# Apollo Step 4-P0 — Scope and Architecture Refreeze

**Status:** DOCUMENTATION / DESIGN ONLY
**Step ID:** `APOLLO_STEP_4_P0_SCOPE_DESIGN_REFREEZE`
**Baseline main:** `6676781fb00bc2db00d16422258c621b72a91f9b`
**Updated:** 2026-08-03

## Warning

UNVERIFIED DEVELOPMENT DESIGN DOCUMENTATION
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION

**APPLICATION CODE CHANGES ARE FORBIDDEN IN THIS STEP.**
Step 4-A implementation must not start until `13_step4_design_freeze_gate.md` records
`STEP_4_IMPLEMENTATION_START_READINESS: GO` on `main`.

## Purpose

Freeze responsibilities, domain models, workflow state machine, schema deltas,
migration policy, load/quantity traceability, road-alignment binding, 3D dimension
overlay design, UI specs, and implementation sequence for R1–R8 **before** coding.

## In scope (this documentation step)

- Design documents under this directory
- Decision / state / entity / traceability CSVs
- Mermaid diagrams and JSON Schema **drafts** (docs only)
- `final_report.txt` updates

## Out of scope (this step)

- Any `frontend/` / `backend/` application code
- Schema/migration/UI/3D/numeric/test implementation
- Dependency or lockfile updates
- Feature flags for Step 4 features
- Formal OK/NG, DEC-ID invention, or authorization GRANT

## Authoritative documents (read-only inputs)

| Document | Role |
|----------|------|
| `final_report.txt` (Step 3 closeout) | Current software completion state |
| `docs/apollo/step3_final_product/*` | User acceptance / limitations |
| `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md` | Prior freeze (haunch/splice/appurtenances named) |
| `docs/apollo/step1/05_scope_boundary/road_to_apollo_interface.md` | Road → Apollo ownership (DEC-S1-0008) |
| `docs/apollo/phase_a_integrated_freeze/*` | Authorization / report / loads freeze |
| Code under `frontend/src/apollo/**`, `frontend/src/contracts/**`, `frontend/src/liner/**` | Confirmed capability inventory |

## Document order

1. `01_current_capability_inventory.md`
2. `02_scope_boundary.md`
3. `03_workflow_control_design.md`
4. `04_domain_model_delta.md`
5. `05_schema_and_migration_design.md`
6. `06_load_quantity_traceability.md`
7. `07_alignment_compatibility_contract.md`
8. `08_dimension_overlay_design.md`
9. `09_ui_screen_specification.md`
10. `10_traceability_matrix.csv`
11. `11_implementation_sequence.md`
12. `12_open_questions_and_risks.md`
13. `13_step4_design_freeze_gate.md`
14. `14_decision_register.csv` … `18_manual_reference_mapping.md`

## Implementation ban

Until freeze gate GO on main: **no Step 4-A+ coding**.
