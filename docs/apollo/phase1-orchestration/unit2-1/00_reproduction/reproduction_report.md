# Apollo Phase 1-NN Unit 2.1 Reproduction Report

- Verification date: Tuesday, July 28, 2026
- Repository start path under review: `./start`
- User-reported symptom: Apollo screen renders, but visible buttons cannot be clicked.

## Findings

- The repository did not provide a root-level `./start` launcher before this recovery pass.
- The Ubuntu launcher that the repository did provide, [start-ubuntu.sh](/home/masaharu/Projects/spacer-clone-main/start-ubuntu.sh), launched `npm run electron:dev`, not `npm run electron:dev:apollo`.
- Earlier Apollo Electron verification evidence was gathered through Apollo-specific dev mode and therefore did not match the user's formal startup path.
- Under the corrected Apollo startup path, sampled controls were clickable with real Electron pointer input:
  - Apollo entry
  - Add material
  - Add node
  - Return to workspace

## Reproduction Verdict

- `USER_SYMPTOM_REPRODUCED: NO_EXACT_REPRO_ON_CURRENT_HEAD`
- `ALL_BUTTONS_UNRESPONSIVE_REPRODUCED: NO_EXACT_REPRO_ON_CURRENT_HEAD`
- `ELECTRON_ONLY_OR_SHARED: START_PATH_MISMATCH`
- `CONSOLE_ERROR_FOUND: WEBGL_FALLBACK_ONLY`
- `INITIAL_ROOT_CAUSE_HYPOTHESES: WRONG_ELECTRON_START_MODE, TEST_FALSE_POSITIVE`
