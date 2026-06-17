# Time History Animation Design (TH-8b)

## 1. Purpose

This document describes the design for a time-history deformation
animation that drives the existing 3D viewer with the result of a
Linear Time History Analysis. The frozen API contract lives in
[time-history-api-contract.md](time-history-api-contract.md); the
result block lives in [result-schema.md](result-schema.md); the result
view layer lives in [result-visualization.md](result-visualization.md);
the time history UI is described in
[time-history-ui-design.md](time-history-ui-design.md).

This document is a design document. It does not perform any
implementation, does not change any component, does not change the
backend, and does not change the API contract. The only deliverable
of TH-8b is this document.

## 2. Goal

Render the deformation of a Linear Time History Analysis run as an
animation inside the existing 3D viewer by:

- Reading `result.timeHistoryResult.displacements` (and the
  corresponding `time` axis) produced by the
  `/api/analysis/time-history` endpoint.
- Computing, for the active time index, a per-node displacement
  vector (ux, uy, uz) and forwarding the displaced position to the
  3D viewer as a transient, display-only override.
- Driving the active time index with playback controls (play, pause,
  slider, speed, reset) without mutating the underlying project
  payload, the analysis result, or the API contract.

The animation is consumed exclusively by the 3D viewer as a
display-only input. The viewer is responsible for composing the
deformed positions; the animation layer never writes back to the
project or to the persisted result block.

## 3. Scope

In scope for the MVP:

- Node displacement animation driven by
  `result.timeHistoryResult.displacements`.
- The three translational degrees of freedom `ux`, `uy`, `uz`.
- Playback controls and time slider.
- Displacement scale and reset.
- Display-only integration with the existing 3D viewer.
- Coordination with the existing SPACER axis swap toggle.

Out of scope (documented for traceability, intentionally excluded):

- Member force history animation.
- Reaction history animation.
- Envelope (`max` / `min`) animation.
- Nonlinear time history animation.
- Persisting the active animation state across project save/load.
- Audio / tactile feedback.
- Camera scripting or camera bookmarks along the timeline.

These items remain "future work" until TH-8d or later phases lift the
restriction.

## 4. Data Mapping

The frozen contract returns displacements as a map keyed by
`<nodeId>_<dofName>`, for example:

```text
displacements: {
  N2_ux: [0.0, -1.4e-7, ...],
  N2_uy: [...],
  N2_uz: [...],
  N3_ux: [...],
}
```

The animation layer decomposes each key into `nodeId` and `dofName`
using the trailing `_ux` / `_uy` / `_uz` suffix. Unknown suffixes
(e.g. `_rx`, `_ry`, `_rz`) and any key whose `dofName` is missing
are ignored. `dofName` matching is case-sensitive to match the
backend contract.

The animation layer assumes the time axis
`result.timeHistoryResult.time` and each displacement series share
the same length. The samples for the active index `i` are extracted
as:

```text
ux_i = displacements[`${nodeId}_ux`][i] ?? 0
uy_i = displacements[`${nodeId}_uy`][i] ?? 0
uz_i = displacements[`${nodeId}_uz`][i] ?? 0
```

Missing components are treated as zero, never as a failure. The
viewer never raises an error for partial keys; it only raises an
error for the conditions listed in Section 8 (Safety).

The number of frames equals `result.timeHistoryResult.meta.sampleCount`.
The animation layer treats `sampleCount === 0` as "no animation" and
disables the controls.

## 5. Coordinate System

The animation is a display-only layer. It does not modify the
project payload, the analysis result, or the API contract. All
coordinates are interpreted in the same global frame as the rest of
the viewer, and the SPACER axis swap toggle is applied as a display
transform inside the viewer, not inside the animation layer.

The rules below match the existing viewer contract documented in
[result-visualization.md](result-visualization.md):

- `project.nodes[i].x` / `.y` / `.z` are the **original** coordinates
  in the global frame. The animation layer reads them and adds the
  displacement on top.
- The 3D viewer applies the SPACER axis swap (when enabled) to the
  combined position. The animation layer never reorders or rescales
  the axes.
- The animation layer never persists a swapped position. The toggle
  remains an in-memory display setting.

This keeps the SPACER coordinate display toggle behaviour
unchanged: enabling or disabling the toggle does not change the
animation state, the active time index, or the displacement scale.

## 6. Animation State

The animation layer owns a single, in-memory state object that lives
in the React component driving the controls and the viewer. The
state has no persistence, no project payload mutation, and no
backend round-trip.

```ts
type TimeHistoryAnimationState = {
  /** Current sample index in [0, sampleCount - 1]. */
  currentTimeIndex: number;
  /** True when playback is running. */
  isPlaying: boolean;
  /** Multiplier on the real-time playback rate. */
  playbackSpeed: number;
  /** Display multiplier applied to the displacement vector. */
  displacementScale: number;
  /** True when playback loops from the last sample back to zero. */
  loop: boolean;
};
```

Initial values:

- `currentTimeIndex` = 0
- `isPlaying` = false
- `playbackSpeed` = 1
- `displacementScale` = a value chosen to make the expected peak
  displacement visible at a typical model scale (the same magnitude
  as the existing `ViewerScales.deformationScale`).
- `loop` = true

The state is reset to its initial values whenever the active
`result.timeHistoryResult` changes (e.g. a new run finishes). The
viewer does not preserve the previous index across runs.

## 7. UI Controls

The controls live in the Time History Result Viewer, next to the
existing table and chart. They are disabled when the result is
missing, has no displacement keys, or has a sample count of zero.

| Control         | Behaviour                                                         |
| --------------- | ----------------------------------------------------------------- |
| Play / Pause    | Toggles `isPlaying`. When playing, the time index advances at    |
|                 | `playbackSpeed` samples per second.                               |
| Previous / Next | Decreases / increases `currentTimeIndex` by 1, clamped to        |
|                 | `[0, sampleCount - 1]`. Stops playback if it was running.         |
| Time slider     | Sets `currentTimeIndex` to the value selected by the user. Stops |
|                 | playback if it was running.                                       |
| Speed           | Sets `playbackSpeed`. Allowed values: 0.25, 0.5, 1, 2, 4.        |
| Displacement    | Sets `displacementScale`. Allowed values follow the same          |
| scale           | magnitude convention as `ViewerScales.deformationScale`.         |
| Reset           | Restores the initial state, including `currentTimeIndex = 0`,     |
|                 | `isPlaying = false`, and the default scale / speed.               |

The control labels and tooltip messages are user-facing and therefore
follow the language policy documented in
[../development/language-policy.md](../development/language-policy.md).
All visible strings are added to `frontend/src/i18n/ja.ts` under
`timeHistory.animation`.

## 8. Viewer Integration

The animation layer builds a transient node position map and passes
it to the 3D viewer through the existing
`nodePositionOverride` parameter on `rebuildModelScene`. The viewer
already accepts this parameter for the eigen / pseudo-mode
animation; the time history animation reuses the same channel and
never mutates the project nodes.

The integration contract is:

- The animation layer calls a pure function that maps `(project,
  result, currentTimeIndex, displacementScale) => Map<nodeId,
  { x, y, z }>`. This function does not touch React state, the DOM,
  or the project payload.
- The 3D viewer treats the override as a per-frame display value.
  The next frame, the override is replaced with the override for
  the new `currentTimeIndex`; the previous override is discarded.
- The viewer continues to apply visibility, scales, the SPACER axis
  swap, and the camera. The animation layer does not touch any of
  these.

The integration mode for TH-8c is "replace" by default: the
displayed position is the original position plus the scaled
displacement. An "overlay" mode, which renders the original geometry
in a faint style and the deformed geometry in a solid style, is
documented for TH-8d and is not implemented in the MVP.

Performance strategy:

- The animation runs on the existing React `requestAnimationFrame`
  loop already used by the viewer.
- The animation does not allocate a new array per frame. It updates
  the existing override map in place when possible.
- For large models (more than a few hundred nodes), the animation
  throttles playback to one frame per `requestAnimationFrame` tick
  and skips sample interpolation. Sub-sample interpolation is out of
  scope for the MVP.
- The animation pauses when the user opens a non-time-history tab,
  when the result is replaced, and when the page becomes hidden.

## 9. Safety

The animation layer is defensive about missing or inconsistent data.
The cases below are the only conditions that change the UI state;
all other cases leave the existing state untouched.

| Condition                                | Behaviour                                                      |
| ---------------------------------------- | -------------------------------------------------------------- |
| `result` is `null` or missing            | Controls disabled, no override is computed.                    |
| `result.timeHistoryResult` is `null`     | Controls disabled, no override is computed.                    |
| `meta.sampleCount === 0`                 | Controls disabled, no override is computed.                    |
| `displacements` is empty or `{}`         | Controls disabled with a "no displacement data" hint.          |
| `time.length !== sampleCount`            | Warning displayed, controls remain enabled, the animation      |
|                                          | clamps the active index to the shorter of the two arrays.      |
| A displacement key is missing for a node | The missing component is treated as 0; no error is raised.     |
| A displacement value is non-finite       | Treated as 0 for that component; a single warning is shown.    |
| The user opens a tab other than time     | Playback pauses automatically.                                 |
|                                          | history while playing                                          |

The animation layer never throws, never mutates the project
payload, and never modifies the analysis result. When the active
result is replaced, the animation state is reset to its initial
values.

## 10. Implementation Plan

The implementation is split across TH-8c through TH-8f. Each step
is independently testable and leaves the project in a runnable
state. No step depends on a future step.

### TH-8c Animation State + Minimal UI

- Add `TimeHistoryAnimationState` and the controls component.
- Add the time slider, play / pause, previous / next, speed, and
  reset controls to the result viewer.
- Add the displacement scale control.
- Wire the controls to the existing result viewer and the existing
  3D viewer.
- Defer the "overlay" mode and the auto-pause on tab change.

### TH-8d Viewer Deformation Overlay

- Extend the viewer to render the original geometry in a faint
  style when the animation is active.
- Reuse the existing `nodePositionOverride` path; do not change
  the viewer contract.
- Verify that the existing eigen / response-spectrum / static
  visualizations are not affected.

### TH-8e Playback Integration

- Auto-pause on tab change and on result replacement.
- Add the "overlay / replace" mode toggle.
- Add a sample-count warning when `time.length` and
  `sampleCount` disagree.

### TH-8f Manual Smoke Test

- Document the manual smoke test procedure in
  `docs/verification/time-history-animation-manual-smoke-test.md`.
- Verify the existing static / eigen / response-spectrum
  visualizations are not affected.

## 11. i18n Keys

The following i18n keys are added to `frontend/src/i18n/ja.ts` under
`timeHistory.animation`. The list is a candidate set; the exact
wording is finalized in TH-8c.

```text
animation.heading
animation.play
animation.pause
animation.previous
animation.next
animation.speed
animation.displacementScale
animation.reset
animation.disabledNoResult
animation.disabledNoDisplacement
animation.warningSampleMismatch
animation.warningNonFiniteValue
animation.fileName
animation.currentTimeLabel(time, index, total)
```

All keys above are user-facing Japanese strings and follow the
language policy.

## 12. Out of Scope

- Implementation of any of the items in Section 11 (TH-8c).
- CSV / PDF export of the animation.
- Persisted animation state.
- Member force history, reaction history, envelope animation, and
  nonlinear time history animation.
- Sub-sample interpolation.
- Audio / tactile feedback.
- Multi-viewer animation sync (e.g. compare view).

These items are intentionally excluded from TH-8b. They are
documented above only as future work so the design is consistent.

## 13. Related Documents

- [time-history-api-contract.md](time-history-api-contract.md)
- [time-history-schema.md](time-history-schema.md)
- [time-history-analysis.md](time-history-analysis.md)
- [time-history-implementation-plan.md](time-history-implementation-plan.md)
- [time-history-ui-design.md](time-history-ui-design.md)
- [result-schema.md](result-schema.md)
- [result-visualization.md](result-visualization.md)
- [eigen-analysis.md](eigen-analysis.md)
- [response-spectrum-analysis.md](response-spectrum-analysis.md)
- [../development/language-policy.md](../development/language-policy.md)
- [../glossary.md](../glossary.md)
