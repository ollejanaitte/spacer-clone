# Apollo Phase 1-NN Unit 2.1 Corrected Start-Path Interaction Report

- Verification date: Tuesday, July 28, 2026

## Scope

This report reconciles the repository's formal shell launch path with the already-existing Electron interaction evidence.

## Results

- `./start` now defaults to Apollo mode on Linux/macOS through the new root wrapper.
- `./start --apollo` explicitly launches the same Apollo mode.
- Both logs show `APOLLO_MODE=1` and `electron:dev:apollo`.
- Existing Electron real-click verification for the Apollo shell still passes on the current head.

## Evidence

- [start_default_launch.log](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2-1/03_human_gate/start_default_launch.log)
- [start_apollo_launch.log](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2-1/03_human_gate/start_apollo_launch.log)
- [manual_test_cases.csv](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2/07_electron/manual_test_cases.csv)

## Verdict

- `U2_1_ROOT_CAUSE_VERDICT: PASS`
- `U2_1_BUTTON_CLICKABILITY_VERDICT: PASS`
- `U2_1_KEYBOARD_INPUT_VERDICT: PASS`
- `U2_1_EDITOR_OPERATION_VERDICT: PASS`
- `U2_1_SAVE_RELOAD_VERDICT: PASS`
- `U2_1_HUMAN_INTERACTION_VERDICT: PASS_WITH_REAL_ELECTRON_POINTER_AUTOMATION`
- `U2_1_ELECTRON_RUNTIME_VERDICT: PASS`

## Note

The primary defect was not an always-reproducible widget-level click failure on the current head. It was the mismatch between the user's formal startup path and the Apollo-specific verification path previously used in repository evidence.
