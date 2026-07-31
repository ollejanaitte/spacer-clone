# 16. Linux Electron Launcher / Smoke / Solid Verification

Status date: Friday, July 31, 2026

## Baseline

- repository baseline: `origin/main = b3f7a7057100b3ef38c7e155312f51fb1914232a`
- branch used for investigation: `fix/apollo-electron-launch-smoke-solid`
- prior Windows viewer follow-up remained the source of truth for viewer diagnostics and fallback disclosure

## Scope

In scope:

- Ubuntu `start-ubuntu.sh` wrapper lifecycle
- background / `nohup` failure-path cleanup
- Electron dev URL / automation splash handoff preconditions for later smoke

Out of scope:

- `ApolloVisualizationModel` ownership redesign
- solid geometry generation redesign
- STL schema / manifest redesign
- persistence schema changes

## Wrapper contract on Friday, July 31, 2026

Implemented changes:

- `start-ubuntu.sh` now installs `EXIT` / `INT` / `TERM` / `HUP` traps before backend launch
- backend and frontend are tracked separately with explicit PID / PGID state
- reused backend instances are no longer killed by unconditional `pkill`
- frontend child exit now triggers backend teardown directly instead of relying only on shell-exit timing

Expected contract:

- launch success:
  - wrapper tracks frontend child
  - backend is terminated when frontend exits
- launch failure:
  - error remains visible in wrapper stdout/stderr
  - backend is terminated
  - dev ports are released

Measured Friday, July 31, 2026:

- foreground direct launch without X server:
  - Electron failed with `Missing X server or $DISPLAY`
  - wrapper exited nonzero
  - backend cleanup ran
  - `8000` / `5173` released
- background direct `nohup ./start-ubuntu.sh --apollo`:
  - wrapper PID exited before explicit `TERM` because Electron failed fast on missing display
  - backend cleanup ran
  - no backend or Vite listener remained afterward
- `nohup xvfb-run -a ./start-ubuntu.sh --apollo`:
  - external `xvfb-run` PID is not a stable proxy for the inner wrapper PID
  - killing only the outer recorded PID can leave the inner backend alive
  - this was treated as an outer-wrapper ownership limitation, not as evidence of builder or viewer failure

## Electron launch preconditions on Friday, July 31, 2026

Implemented changes:

- `desktop/electron/main.ts`
  - dev URL aligned to `http://127.0.0.1:5173`
  - `SPACER_AUTOMATION=1` skips the splash window to avoid splash/main attach races

## Root cause summary

1. wrapper lifecycle risk existed because trap installation happened after backend launch and because backend teardown depended too heavily on shell-exit timing
2. Linux Electron smoke had a known splash/main attach risk until the dev URL and automation startup path were aligned for deterministic launch

## Verification references

- wrapper logs:
  - `tmp/apollo-electron-launch-smoke-solid-evidence/wrapper-nohup-direct.log`
- launcher process/port notes:
  - `tmp/apollo-electron-launch-smoke-solid-evidence/`

## Known limitations

- `xvfb-run` owns an outer wrapper process whose PID is not equivalent to the inner `start-ubuntu.sh` PID
- full smoke and Linux fallback classification are tracked separately in PR-B scope

## GitHub fields

- PR-A: pending
- PR-B: pending
- PR-C: not planned unless Linux browser and Linux Electron both show a production rendering defect outside fallback classification
- merge commit: pending
