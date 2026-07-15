# Linear Time History Preview Release Note Draft

## Summary

This preview adds an internally testable Linear Time History Analysis path. The UI can configure minimal time-history settings and a simple ground motion record, run `/api/analysis/time-history`, and display a status summary, basic result table, and simple chart.

## User-Visible Changes

- Added a Time History tab in the analysis/result UI.
- Added minimal settings editing for mass case, ground motion, direction, time step, duration, and Rayleigh damping coefficients.
- Added a simple ground motion editor for id, name, direction, unit, time step, and sample values.
- Connected the Run button to `POST /api/analysis/time-history`.
- Added loading, success, failed, network error, and empty states.
- Added a capped result table and a simple SVG chart for displacement, velocity, and acceleration histories.
- Added smoke examples under `examples/`.

## Verification

The preview should be verified with:

- `python -m pytest backend/tests -q`
- `npx vitest run`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run build`
- Manual smoke test in `docs/verification/time-history-manual-smoke-test.md`

## Compatibility

- Existing Eigen and Response Spectrum UI flows are unchanged.
- The time-history API route and response envelope remain aligned with the frozen TH-5c contract.
- The project schema is extended additively to allow Rayleigh `alpha` and `beta` coefficients used by the current backend path.

## Not Included

- CSV or PDF output.
- 3D viewer animation.
- Time slider.
- Envelope, member force history, and reaction history UI.
- Nonlinear analysis.
- Ground motion import, waveform editing, or resampling.

## Merge Note

Human review is required before merging this preview branch to `main`.
