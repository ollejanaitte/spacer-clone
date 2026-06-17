# Linear Time History Known Limitations

## Preview Scope

The current Linear Time History Analysis UI is a preview suitable for internal trial use. It covers basic settings, one editable ground motion record, Run button API integration, a result summary, a limited result table, and a simple SVG chart.

## Analysis and Input Limitations

- The MVP is linear only.
- The UI is limited to one simple ground motion editor.
- Ground motion samples are entered manually as comma-separated or newline-separated numbers.
- CSV import, PEER import, waveform editing, and resampling are not implemented.
- Rayleigh damping is exposed as direct `alpha` and `beta` coefficients for the current backend path.
- The current UI sends the latest project payload for analysis, but does not persist the latest API result back into `analysisResults.timeHistory`.

## Result Display Limitations

- The result table displays at most 100 rows.
- The chart uses a simple SVG polyline and down-samples large series for display.
- There is no interactive time slider.
- There is no envelope calculation.
- Member force history and reaction history views are not exposed in the UI.
- The chart is for visual smoke testing and quick inspection, not detailed plotting.

## Integration Limitations

- There is no 3D viewer animation or node coloring.
- There is no CSV or PDF export for time-history results.
- There is no result history manager or comparison between runs.
- The examples are smoke fixtures, not design-code verification projects.

## Operational Notes

- Large models and long records can produce large JSON responses. Use the current preview with small and medium trial models first.
- Network errors are shown separately from failed analysis envelopes, but retry and diagnostics tooling are not implemented.
- Human review is required before merging the preview branch to `main`.
