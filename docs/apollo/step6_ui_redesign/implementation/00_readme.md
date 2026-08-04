# Step 6-UI-1D — Implementation Design

This directory contains the implementation-ready design supplement for Apollo Step 6 UI redesign.

## Relation to P0-D

P0-D (docs/apollo/step6_ui_redesign/p0_d/) established the target architecture and frozen plan.
These documents translate that architecture into per-step design details at implementation granularity.
Nothing here overrides P0-D; UI-1D is a narrowing of P0-D to concrete file-level and behavioral specs.

## Documents

| # | File | Scope |
|---|------|-------|
| 1 | 00_readme.md | This file |
| 2 | 01_user_image_requirement_trace.md | User image → requirement trace matrix |
| 3 | 02_header_and_action_design.md | Header: mode, file, nav, help separation + auth display |
| 4 | 03_guided_progress_and_footer_design.md | Guided progress integration + sticky footer |
| 5 | 04_viewer_workspace_design.md | Input + 3D Viewer 2-pane layout |
| 6 | 05_workflow_master_detail_design.md | Workflow master-detail / storyboard |
| 7 | 06_responsive_behavior_matrix.md | Desktop / tablet / mobile behavior matrix |
| 8 | 07_component_and_file_plan.md | File change plan per UI step |
| 9 | 08_test_and_acceptance_matrix.csv | Test and acceptance criteria |
| 10 | 09_implementation_gate.md | UI-1 readiness gate + freeze stamp |

## Step Sequence

UI-1D → UI-1 (header/auth) → UI-2 (guided progress/footer) → UI-3 (viewer workspace)
→ UI-4 (workflow master-detail) → UI-5 (responsive/mobile/a11y) → UI-6 (full regression)
→ CLOSEOUT

Each step is a docs+application PR merged to main before the next begins.