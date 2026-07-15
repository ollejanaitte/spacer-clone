# Linear Time History Known Limitations

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE - EXISTING TIME-HISTORY EXTENSION
> Time-history is an existing extension, not one of the six baseline module labels. Current facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md); target result binding, persistence, gaps, and acceptance remain governed by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md).
<!-- DOC-AUTHORITY:END -->

## Preview Scope

The current Linear Time History Analysis UI is a preview suitable for internal trial use. It covers basic settings, the ground motion manager (with simple editor, CSV import, and H24道示 waveform import), Run button API integration, a result summary, a limited result table, a simple SVG chart, result persistence into the project state, and a 3D node-displacement animation with play / pause / slider / speed / scale / displacement mode controls.

## Analysis and Input Limitations

- The MVP is linear only.
- The UI is limited to one editable ground motion record at a time, with file import support.
- The H24 importer parses the H24 road-bridge waveform table (9 waveform columns); waveform resampling is not supported.
- Rayleigh damping is exposed as direct `alpha` and `beta` coefficients for the current backend path.
- The latest API result is persisted into `analysisResults.timeHistory` on a successful envelope; failed envelopes and network errors do not overwrite the persisted block.

## Result Display Limitations

- The result table displays at most 100 rows.
- The chart uses a simple SVG polyline and down-samples large series for display.
- Member force history and reaction history views are not exposed in the UI.
- The chart is for visual smoke testing and quick inspection, not detailed plotting.

## Animation Limitations

- The animation animates translational node displacements only (ux, uy, uz); rotations (rx, ry, rz) are not animated.
- The MVP supports four displacement modes: X, Y, Z, and combined XYZ.
- The playback clock advances by a small integer number of samples per tick; there is no sub-sample interpolation.
- The "jump to max" button searches the displacement series (or the selected key) for the maximum absolute value and moves the time index there.
- The displacement scale is auto-estimated from the model size and the maximum absolute displacement; the user can override the value.
- There is no member force, reaction, envelope, or nonlinear animation.
- Coordinate-system handling respects the existing viewer coordinate mode and the SPACER axis swap toggle.

## Integration Limitations

- There is no CSV or PDF export for time-history results.
- There is no result history manager or comparison between runs.
- The examples are smoke fixtures, not design-code verification projects.

## Operational Notes

- Large models and long records can produce large JSON responses. Use the current preview with small and medium trial models first.
- Network errors are shown separately from failed analysis envelopes, but retry and diagnostics tooling are not implemented.
- Human review is required before merging the preview branch to `main`.
