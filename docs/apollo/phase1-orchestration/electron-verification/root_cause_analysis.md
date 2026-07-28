# Apollo Electron Root Cause Analysis

Date: Tuesday, July 28, 2026

ROOT_CAUSE: FEATURE_FLAG_OFF
USER_REACHABILITY_BEFORE: FAIL
ELECTRON_RENDERING_BEFORE: PASS
FEATURE_FLAG_BEFORE: OFF
REQUIRED_FIX_SCOPE: Phase 1-NN routing and launch-mode wiring only

## Observed Symptom

- The user launched the Electron app but could not reach the Apollo Phase 1-NN screen through the normal UI.

## Primary Cause

- The Apollo route existed, but the Phase 1-NN shell remained gated OFF during ordinary Electron development startup.

## Contributing Cause

- The previous toolbar implementation hid the Apollo entry completely when no `onOpenApolloPhase1` handler was wired, so a feature-flag-off session could look like Apollo was missing instead of intentionally blocked.

## Fix

- Added a visible disabled Apollo toolbar entry for the OFF state.
- Added explicit Apollo launch scripts and Apollo Vite mode wiring so Electron can be started with the Phase 1-NN shell enabled.
- Kept numeric execution and authoritative publication blocked in both code and runtime evidence.
