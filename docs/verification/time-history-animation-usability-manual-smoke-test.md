# Time History Animation Usability Manual Smoke Test

## Purpose

This smoke test verifies the usability improvements and the new XYZ
combined displacement animation mode added in TH-9d. It checks that the
Time History Result Viewer controls are more responsive and that the
3D viewer reflects the active time index, the displacement scale, the
displacement mode, and the play/pause state without breaking the
existing coordinate display toggle, the static / eigen /
response-spectrum visualizations, or the existing 3D animation path.

## Scope

Covered:

- Confirming that the displacement scale is auto-estimated from the
  model size and the maximum absolute displacement, with a user
  override still possible.
- Confirming that the playback still advances the time index and that
  play / pause / prev / next / reset work as before.
- Confirming that the "最大変位時刻へ" (jump to max) button moves the
  slider to the time index of the maximum absolute value of the
  selected series.
- Confirming that the current time, current index, current value, and
  max abs value + time are shown in the controls.
- Confirming that the controls are disabled when the result is
  missing or has no displacement data.
- Confirming that the displacement mode selector (X / Y / Z / XYZ) is
  visible, defaults to XYZ, and changes which components are
  applied to the deformed geometry.
- Confirming that the SPACER coordinate display toggle still works.
- Confirming that static / eigen / response-spectrum visualization is
  not affected.

Out of scope:

- Member force / reaction / envelope animation.
- Nonlinear animation.
- Sub-sample interpolation or frame-perfect playback loop.
- Project save / load of the animation state.

## Prerequisites

- The frontend dev server is running (`npm run dev` from `frontend/`).
- The backend is running (`python -m uvicorn backend.app.main:app --reload --port 8000` from the repository root).
- An example project with a successful Time History result is available, e.g. `examples/time-history-small.json` or `examples/time-history-medium.json`.

## Manual UI Steps

1. Load `examples/time-history-small.json` (or `examples/time-history-medium.json`).
2. Open the Time History tab in the result area.
3. Run the Time History analysis. Confirm the result table and chart render.
4. Scroll to the animation controls under the result table. Confirm the heading "アニメーション" is visible.
5. Confirm the controls are enabled and that:
   - The displacement mode selector is visible and defaults to "XYZ合成".
   - The "最大変位時刻へ" (jump to max) button is visible.
   - The current time, current value, and abs max labels are visible.
6. Change the displacement mode:
   - Switch to "X方向". Confirm the deformed geometry moves only along the X axis.
   - Switch to "Y方向". Confirm the deformed geometry moves only along the Y axis.
   - Switch to "Z方向". Confirm the deformed geometry moves only along the Z axis.
   - Switch back to "XYZ合成". Confirm all three components are applied.
7. Drag the time slider to roughly the middle of the sample range. Confirm:
   - The slider value updates.
   - The current time label updates.
   - The 3D viewer shows the deformed geometry at the selected time index.
8. Click "再生" (play). Confirm the time index advances and the deformed geometry changes in step with the slider. Click "一時停止" (pause) and confirm the animation stops at the current index.
9. Click "前へ" (previous) and "次へ" (next). Confirm the time index moves by exactly one sample each time and playback stops.
10. Change the playback speed (e.g. x2 or x0.5). Confirm the new value is selected and playback ticks at the new rate.
11. Change the displacement scale to a smaller and a larger value. Confirm the deformed geometry in the 3D viewer grows or shrinks accordingly. If the scale exceeds 5000, the large-scale warning should appear.
12. Click "最大変位時刻へ" (jump to max). Confirm the slider jumps to the time index at which the selected series reaches its maximum absolute value.
13. Click "リセット" (reset). Confirm:
    - The time index returns to zero.
    - Playback is stopped.
    - The 3D viewer reverts to the original geometry.
    - The displacement mode, playback speed, and displacement scale return to their defaults.
14. Toggle the SPACER axis swap (coordinate display) in the 3D viewer controls. Confirm the axis orientation updates as before and the animation still works.
15. Switch to the static results tab and confirm the static visualization is unchanged.
16. Switch to the eigen results tab, pick a mode, and confirm the eigen animation is unchanged.
17. Switch to the response-spectrum results tab, pick a result, and confirm the response-spectrum visualization is unchanged.

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
- The displacement mode selector switches between X / Y / Z / XYZ and only the selected components are applied.
- The jump-to-max button moves the time index to the maximum absolute value of the selected series.
- The current time, current value, and abs max labels update as the slider moves.
- The 3D viewer reflects the active time index, displacement scale, and displacement mode.
- The SPACER coordinate display toggle and the static / eigen / response-spectrum visualizations are not regressed.
- Pressing reset returns the viewer to the original geometry.
