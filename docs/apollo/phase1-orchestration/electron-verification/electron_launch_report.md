# Apollo Electron Launch Report

Date: Tuesday, July 28, 2026

## Launch Summary

- Command chain: `npm run electron:compile`, backend `uvicorn`, `npm run dev`, `npm run dev:apollo`, Electron main `desktop/electron/dist/main.js`
- Renderer URL: `http://127.0.0.1:5173/`
- Electron version: `42.3.3`
- Window title: `SPACER Clone MVP`
- Evidence files:
  - `launch_environment.json`
  - `process_manifest.csv`
  - `startup_log.txt`
  - `launch_screenshot.png`
  - `initial_screen.png`

## Verdict

- ELECTRON_ENTRYPOINT_VERDICT: PASS
- ELECTRON_LAUNCH_VERDICT: PASS
- APOLLO_ROUTE_REGISTRATION_VERDICT: PASS

## Notes

- The default Electron launch path opened successfully and rendered the professional workspace.
- The renderer reported WebGL initialization warnings in Electron, but the existing fallback UI remained available and the workspace stayed interactive.
- Apollo reachability required an explicit Apollo-enabled launch mode so that the Phase 1-NN shell flag was ON while numeric and publication guards remained fail-closed.
