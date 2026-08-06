# Legacy Scope_of_Work Recovery

## 1. Purpose

Summarize the key findings of the legacy `Scope_of_Work` (curved-bridge
pre-survey, Phase 0-PRE) conducted by an external, repository-external agent at
`/home/masaharu/Projects/Scope_of_Work/`. This is a **summary record**, not a full
republication. Full originals remain at the external location and are NOT copied
into `spacer-clone`.

The legacy survey was conducted at baseline `0fadc1c` (before Step 9 Phase 4
completion); Step 10 Phase 0 supersedes and refines it.

## 2. Source locator

| Item | Value |
|---|---|
| Logical locator | `<EXTERNAL_SOURCE_ROOT>/Scope_of_Work/` |
| Absolute path | `/home/masaharu/Projects/Scope_of_Work/` |
| Repository | `spacer-clone` (read-only surveyed; no commits) |
| Baseline SHA | `0fadc1c` |
| Survey type | Repository-external, read-only |

## 3. Legacy Scope_of_Work — structure

```
Scope_of_Work/
├── README.md
├── final_report.txt
├── source_manifest.csv (31 rows)
├── evidence/
│   ├── repository_baseline.txt
│   ├── repository_paths_reviewed.txt
│   ├── source_files_reviewed.txt
│   └── command_log.txt
├── handoff/
│   ├── integration_plan.md
│   ├── file_mapping.csv
│   ├── conflict_risk_register.csv
│   └── post_continuous_bridge_merge_checklist.md
└── step10_curved_bridge/
    └── phase0_pre_required_source_survey/
        ├── README.md
        ├── 01_repository_curved_capability_inventory.md
        ├── 02_required_source_categories.md
        ├── 03_design_standard_requirements.md
        ├── 04_alignment_geometry_requirements.md
        ├── 05_structural_model_requirements.md
        ├── 06_analysis_theory_requirements.md
        ├── 07_load_support_requirements.md
        ├── 08_design_check_requirements.md
        ├── 09_calculation_example_requirements.md
        ├── 10_existing_source_inventory.md
        ├── 11_missing_source_register.md
        ├── 12_user_search_guide.md
        ├── 13_scope_progression_by_source_availability.md
        ├── 14_phase0_handoff.md
        ├── required_source_matrix.csv (47 items)
        ├── repository_capability_matrix.csv (39 items)
        ├── missing_source_register.csv (20 items)
        └── completion_report.md
```

## 4. Key verdicts recovered

### 4.1 Overall readiness

| Area | Legacy verdict | Refined by Step 10 |
|---|---|---|
| Road alignment (horizontal curve) | FULLY IMPLEMENTED | reused as backbone |
| Bridge curved geometry | NOT_IMPLEMENTED (straight only) | Step 10 Phase 6–7 target |
| Frame analysis (curved) | PARTIALLY_IMPLEMENTED (3D solver, no warping/centrifugal) | Step 10 Phase 7–8 target |
| Design check (curved) | NOT_IMPLEMENTED | Step 10 Phase 9 target |
| Report (curved) | NOT_IMPLEMENTED | Step 10 Phase 11 target |
| Drawing (curved) | NOT_IMPLEMENTED | Step 10 Phase 12 target |
| Phase 0 overall readiness | PARTIAL_GO_WITH_BLOCKERS | refined in `06_step10_redefinition_and_phase_map.md` |

### 4.2 Missing sources (9 P0 items, summarized)

| # | Category | Summary |
|---|---|---|
| 1 | 道路橋示方書 鋼橋編・共通編 | Japanese road bridge steel specification |
| 2 | Warping torsion theory (Vlasov) | 7DOF torsion/warping analysis |
| 3 | Secondary stress in bracing | curved-girder lateral bracing theory |
| 4 | Centrifugal load formula | curved-bridge transverse/transverse load |
| 5 | Bearing orientation | radial/tangential bearing restraint |
| 6 | Cross beam direction | radial cross-beam orientation |
| 7 | Camber calculation | curved-bridge camber |
| 8 | Verification examples | curved-bridge golden data |
| 9 | Bearing spring constants | curved-support stiffness |

## 5. Key architectural decisions recovered

1. The road alignment kernel (`arc.ts`, `clothoid.ts`, `horizontal.ts`,
   `coordinate3d.ts`, `vector.ts`) is curve-supporting and available as the
   geometric backbone; bridge-structural layers above it are straight-only.
2. The 3D frame solver is general 6DOF but does NOT include warping torsion
   (7DOF needed) or centrifugal loads — it can analyze a curved model only if
   the user manually enters curved geometry.
3. Bearing offsets are scalar; no bearing direction vector (no radial/tangential
   orientation). CrossBeamDraft exists in schema only, with no curve-aware
   direction logic.
4. Non-numeric curved geometry/model can be implemented now (GO);
   analysis, design check, report, and drawing are BLOCKED until sources are
   found.
5. `ApolloStlExport.ts`, viewer, and `bridgeStructure/` patterns exist for
   straight bridges and can be extended to curved geometry.

## 6. Integration plan (recovered)

The legacy handoff states that `Scope_of_Work` will be merged into
`spacer-clone` only after the continuous bridge implementation (step9) is
complete. Step 9 Phase 4 is now COMPLETE; integration is permitted by this
handoff.

Integration procedure (recovered, summarized):
- Verify main is clean and `origin/main == local main`.
- Copy `Scope_of_Work/step10_curved_bridge/` → `docs/apollo/step10_curved_bridge/`.
- Append a STEP 10 summary block to `final_report.txt` (not overwrite).
- Use explicit `git add` paths only.
- No Scope_of_Work external files (PDF/DWG/etc.) are copied into the repo.

**Step 10 decision:** The legacy curved-bridge plan is **retained as input only**,
not copied wholesale. Key findings are summarized here; full originals stay at
`<EXTERNAL_SOURCE_ROOT>/Scope_of_Work/`.

## 7. Conflict risk register (recovered)

| Risk | Summary | Step 10 handling |
|---|---|---|
| CR-001 Target dir exists | `docs/apollo/step10_curved_bridge/` may already exist | Use distinct `docs/apollo/step10/reference_bridge_001/` namespace |
| CR-002 Final report append | Append may conflict | Append-only with clear section markers; never overwrite past blocks |
| CR-003 Main branch changes | Continuous bridge impl may change main | Verify `origin/main == local main` before each merge |
| CR-004 SHA mismatch | Copy integrity | Use SHA256 checksums; external originals never copied |
| CR-005 Unintended git add | Staging unintended files | Explicit path `git add` only (AGENTS.md) |
| CR-006 Push divergence | origin/main diverges | `git fetch` + `git log origin/main..main` before push |

## 8. Non-reproduction policy

This document is a **summary**. Full originals at
`<EXTERNAL_SOURCE_ROOT>/Scope_of_Work/` are not reproduced in `spacer-clone`.
Specific findings above are traceable to the source files listed in
`legacy_scope_recovery_matrix.csv`.

## Verdict

LEGACY_SCOPE_RECOVERY: COMPLETE (summary-level).
LEGACY_ORIGINALS_COPIED_TO_REPO: NO.
