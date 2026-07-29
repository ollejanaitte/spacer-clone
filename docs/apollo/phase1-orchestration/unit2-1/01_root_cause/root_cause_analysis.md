# Apollo Phase 1-NN Unit 2.1 Root Cause Analysis

- Verification date: Tuesday, July 28, 2026
- `ROOT_CAUSE: WRONG_ELECTRON_START_MODE`
- `SECONDARY_CAUSES: TEST_FALSE_POSITIVE, MISSING_ROOT_START_WRAPPER`

## Primary Cause

The repository's formal Ubuntu launcher, [start-ubuntu.sh](/home/masaharu/Projects/spacer-clone-main/start-ubuntu.sh), did not start Apollo mode. It ran `npm run electron:dev`, while Apollo verification had been performed on `electron:dev:apollo`. That meant user runtime and verification runtime diverged.

## Secondary Causes

- No root-level `./start` script existed even though the user attempted to launch via `./start`.
- [frontend/scripts/verifyApolloElectron.mjs](/home/masaharu/Projects/spacer-clone-main/frontend/scripts/verifyApolloElectron.mjs) previously used synthetic `dispatchEvent("click")` for guard checks, which allowed a weaker interaction proof than a real Electron click.

## Why Previous E2E Passed

Previous Apollo verification passed because it launched Electron directly in Apollo-specific Vite mode. That path was valid for the test harness, but it did not prove that the repository's formal launcher path also exposed Apollo correctly.

## Why Previous Manual Verification Was a False Positive

Earlier manual evidence in the repository showed Apollo under the Apollo-specific launch path, not under the repository's formal `./start` path. The evidence therefore overstated end-user reachability.

## Affected Files

- [start-ubuntu.sh](/home/masaharu/Projects/spacer-clone-main/start-ubuntu.sh)
- [start](/home/masaharu/Projects/spacer-clone-main/start)
- [frontend/scripts/verifyApolloElectron.mjs](/home/masaharu/Projects/spacer-clone-main/frontend/scripts/verifyApolloElectron.mjs)
- [frontend/src/styles.css](/home/masaharu/Projects/spacer-clone-main/frontend/src/styles.css)

## Fix Scope

- Add root `./start` wrapper for Linux/macOS shell launches.
- Add `--apollo` mode to the Ubuntu launcher so formal startup can match Apollo verification.
- Make root `./start` default to Apollo mode so the user's plain startup command reaches the verified path.
- Remove synthetic click dispatch from the older Apollo Electron verification path.
- Add Electron no-drag protection for Apollo interactive controls as a defensive runtime safeguard.
