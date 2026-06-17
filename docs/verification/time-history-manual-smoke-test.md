# Linear Time History Manual Smoke Test

## Purpose

This smoke test verifies the preview UI and API path for Linear Time History Analysis after TH-6f and TH-7. It does not validate new solver theory or add production features.

## Scope

Covered:

- Loading the provided small and medium example project files.
- Editing minimal time-history settings and ground motion samples.
- Running `POST /api/analysis/time-history` through the Time History tab.
- Confirming loading, success, failed, and empty states.
- Confirming the summary, table, and simple SVG chart render.
- Confirming project save/load does not drop `analysisSettings.timeHistory` or `groundMotions`.

Out of scope:

- CSV import or export.
- PDF output.
- 3D viewer animation.
- Time slider.
- Envelope, member force history, and reaction history views.
- Nonlinear analysis.

## Sample Projects

- `examples/time-history-small.json`: one cantilever member, one lumped tip mass, 11 samples.
- `examples/time-history-medium.json`: two-member cantilever frame, two lumped masses, 21 samples.

Both examples are intended to pass `schemas/project.schema.json` validation and return a success envelope from `/api/analysis/time-history`.

## Startup

From the repository root:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

From `frontend/`:

```powershell
npm run dev
```

Open the Vite URL and confirm the app renders.

## Manual UI Steps

1. Load `examples/time-history-small.json`.
2. Open the Time History tab in the result area.
3. Confirm the settings panel shows Mass Case, Ground Motion, Direction, Time Step, Duration, Rayleigh Alpha, and Rayleigh Beta.
4. Confirm the ground motion manager shows ID, Name, Direction, Unit, Time Step, and Sample Count.
5. Click Run.
6. Confirm the Run button is disabled while loading.
7. Confirm the result viewer status becomes success.
8. Confirm Sample Count, Time Step, Duration, Available response keys count, and First response key are populated.
9. Confirm the result table shows Time and Value rows.
10. Confirm the simple chart renders for displacement, velocity, and acceleration.
11. Switch response keys and confirm the table and chart update.
12. Edit Time Step or Duration, then save and reload the project. Confirm `analysisSettings.timeHistory` remains present.
13. Edit the ground motion sample textarea, then save and reload the project. Confirm `groundMotions[0].samples` remains present.

Repeat steps 1 through 11 with `examples/time-history-medium.json`.

## Failed Envelope Check

To confirm the failed state without changing backend behavior:

1. Load `examples/time-history-small.json`.
2. Remove or rename the selected ground motion id in the project JSON.
3. Run Time History.
4. Confirm the UI shows status failed and displays the first error code, message, and path when the API includes them.

## Automated Commands

Run these from the repository root unless noted:

```powershell
python -m pytest backend/tests -q
```

Run these from `frontend/`:

```powershell
npx vitest run
npx tsc --noEmit -p tsconfig.json
npm run build
```

## Pass Criteria

- Backend and frontend automated checks pass.
- Both sample projects load.
- Small and medium Time History runs return success envelopes.
- Failed envelope state is visible.
- Result table and simple chart render without console crashes.
- Save/load retains the time-history settings and ground motion records.
