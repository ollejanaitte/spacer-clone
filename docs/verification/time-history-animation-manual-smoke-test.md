# Linear Time History Animation Manual Smoke Test

## Purpose

This smoke test verifies the Time History deformation animation MVP added in TH-8c. It checks that the Time History Result Viewer exposes the minimal animation controls and that the 3D viewer reflects the active time index and displacement scale. It does not cover member force, reaction, envelope, or nonlinear animation: those are out of scope for the MVP.

## Scope

Covered:

- Confirming the animation controls render under the result table and chart.
- Confirming the controls are disabled when there is no result.
- Confirming the controls are disabled when the result has no displacement data.
- Driving the time slider and confirming the active time index changes.
- Driving play/pause and confirming the index advances and pauses.
- Changing the playback speed and confirming the slider ticks at the new rate.
- Changing the displacement scale and confirming the deformed geometry in the 3D viewer responds.
- Pressing reset and confirming the time index returns to zero, playback stops, and the viewer reverts to the original geometry.
- Confirming the SPACER coordinate display toggle still works in the 3D viewer.
- Confirming static, eigen, and response-spectrum visualizations are unaffected.

Out of scope:

- CSV import / export.
- PDF output.
- Member force, reaction, or envelope animation.
- Nonlinear animation.
- Sub-sample interpolation, frame-perfect loop, or scrubbing animation during playback.

## Prerequisites

- The frontend dev server is running (`npm run dev` from `frontend/`).
- The backend is running (`python -m uvicorn backend.app.main:app --reload --port 8000` from the repository root).
- An example project with a successful Time History result is available, e.g. `examples/time-history-small.json` or `examples/time-history-medium.json`.

## Manual UI Steps

1. Load `examples/time-history-small.json` (or `examples/time-history-medium.json`).
2. Open the Time History tab in the result area.
3. Run the Time History analysis. Confirm the result table and chart render.
4. Scroll to the animation controls under the result table. Confirm the heading "アニメーション" is visible.
5. Confirm the controls are enabled (buttons, slider, speed, and scale are not disabled).
6. Drag the time slider to roughly the middle of the sample range. Confirm:
   - The slider value updates.
   - The current time label updates accordingly.
   - The 3D viewer shows the deformed geometry at the selected time index.
7. Click the "再生" (play) button. Confirm the time index advances and the deformed geometry changes in step with the slider. Click "一時停止" (pause) and confirm the animation stops at the current index.
8. Click "前へ" (previous) and "次へ" (next). Confirm the time index moves by exactly one sample each time and playback stops.
9. Change the playback speed (e.g. x2 or x0.5). Confirm the new value is selected and playback ticks at the new rate.
10. Change the displacement scale to a smaller and a larger value. Confirm the deformed geometry in the 3D viewer grows or shrinks accordingly.
11. Click "リセット" (reset). Confirm:
    - The time index returns to zero.
    - Playback is stopped.
    - The 3D viewer reverts to the original geometry.
    - The playback speed and displacement scale return to their defaults.
12. Toggle the SPACER axis swap (coordinate display) in the 3D viewer controls. Confirm the axis orientation updates as before and the animation still works.
13. Switch to the static results tab and confirm the static visualization is unchanged.
14. Switch to the eigen results tab, pick a mode, and confirm the eigen animation is unchanged.
15. Switch to the response-spectrum results tab, pick a result, and confirm the response-spectrum visualization is unchanged.

## Disabled State Checks

Confirm the controls behave correctly when no result is available:

1. Load a fresh project and do not run Time History. Confirm the animation heading is visible and the body shows "解析結果がありません。" (or the equivalent disabled message).
2. If the API returns a result with no displacement data, confirm the controls are disabled and the body shows "変位データがありません。".

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
- The animation controls render in the result viewer.
- The slider, play/pause, previous/next, speed, scale, and reset all behave as described.
- The 3D viewer reflects the active time index and displacement scale.
- The SPACER coordinate display toggle and the static / eigen / response-spectrum visualizations are not regressed.
- Pressing reset returns the viewer to the original geometry.
