# STEP 10 — Reference Bridge 001 Reproduction Project

> **Authority:** Phase 0 — Old Plan Freeze and STEP 10 Redefinition
> **Development approach:** docs-first / documentation-only
> **Production code changed:** NO
> **Numeric analysis performed:** NO
> **PDF / DWG / DXF / image originals committed to GitHub:** NO

## Purpose

Reproduce Reference Bridge 001 — a steel plate girder bridge from the Kanazawa IC
A-ramp / Asahidake Elevated Bridge A-ramp (PU15-AR2) — as a sample design
calculation and drawing set, and confirm that Apollo can regenerate the same
structure model, the same design results, the same information composition of the
design calculation, and the same geometry of the design drawings.

## Bridge identity

| Identifier | Value |
|---|---|
| `referenceBridgeId` | `RB-S10-001` |
| `displayName` | Reference Bridge 001 |
| Original candidate | Kanazawa IC A-ramp Bridge / Asahidake Elevated Bridge A-ramp PU15-AR2 |
| Structural type | 3-span continuous steel plate girder bridge |
| Curve | Includes a curved alignment section (R=160m / R=3000m) |
| Phase 0 status | SOURCE_BACKED_GOLDEN_CANDIDATE |

## Existing reference bridge (do not touch)

`RB-P1-001` is a Phase 1 planning archetype (straight bridge, single simple span,
non-composite RC deck steel plate girder, 4–6 girders). It is documentation-only,
Golden numerics NOT_AUTHORIZED, DRAFT_PLANNING_ONLY. `RB-P1-001` is retained as-is
and is **not** renamed, deleted, or overwritten by this Step 10.

## Phase 0 deliverables

| # | File | Purpose |
|---|---|---|
| 1 | `README.md` | This file |
| 2 | `01_repository_preflight_and_baseline.md` | Repository baseline, origin/main SHA, worktree state |
| 3 | `02_step9_freeze_and_asset_retention.md` | Old curved-bridge plan freeze and STEP 9 asset retention |
| 4 | `03_legacy_scope_of_work_recovery.md` | Legacy Scope_of_Work key findings summary |
| 5 | `step9_asset_retention_register.csv` | STEP 9 asset retention inventory |
| 6 | `legacy_scope_recovery_matrix.csv` | Legacy Scope_of_Work recovery classification |
| 7 | `04_reference_bridge_001_definition.md` | RB-S10-001 vs RB-P1-001 crosswalk |
| 8 | `05_source_original_manifest_policy.md` | External PDF storage policy and change-detection rules |
| 9 | `source_original_manifest.csv` | SHA256, page count, status for each original PDF |
| 10 | `06_step10_redefinition_and_phase_map.md` | STEP 10 Phase 0–15 and milestones |
| 11 | `07_verification_gates_and_milestones.md` | Final verification gates and milestones |
| 12 | `08_phase1_handoff.md` | Phase 1 scope and handoff conditions |
| 13 | `completion_report.md` | Phase 0 completion report |

## Phase 0 exit conditions

- STEP 10 purpose and scope frozen
- RB-S10-001 defined and crosswalked with RB-P1-001
- Old curved-bridge plan terminated; STEP 9 assets retained
- Legacy Scope_of_Work key findings summarized, no full republication
- Source original manifest recorded with real SHA256 and page counts
- PDFs not committed to GitHub
- Phase 0–15 roadmap documented
- Phase 1 handoff defined
- Each sub-step merged as an independent PR on latest main
- final_report.txt appended (past blocks untouched)
