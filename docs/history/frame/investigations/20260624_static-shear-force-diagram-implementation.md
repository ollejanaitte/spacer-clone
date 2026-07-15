# Static Shear Force Diagram Implementation

## Background

A prior investigation confirmed that static analysis internal force data already
flows from the solver through result generation, API responses, frontend state,
and the result ViewModel. The missing piece was the Viewer diagram display path:
the Viewer rendered `N`, `My`, and `Mz`, but did not expose controls or render
calls for `Qy` and `Qz`.

## Prior Investigation Summary

- Solver output contains `Qy` and `Qz` values.
- API responses contain `Qy` and `Qz` values.
- Frontend result state and the result ViewModel contain `Qy` and `Qz` values.
- Numeric member-end force tables and member force color maps can already use
  the shear components.
- The Viewer result diagram controls and renderer only connected `N`, `My`, and
  `Mz`.
- The solver was not the root cause, so solver formulas and numerical results
  were left unchanged.

## Implementation Summary

- Added `shearQy` and `shearQz` visibility flags to the Viewer visibility state.
- Added Qy and Qz result diagram controls beside the existing axial force and
  moment diagram controls.
- Added Japanese UI strings to `frontend/src/i18n/ja.ts` and referenced them
  from React components.
- Connected `Qy` and `Qz` to `renderMemberForce` in the result diagram renderer.
- Reused existing result scale, load-case selection, color convention, station
  values, and local member force components.
- Added concise Viewer feedback for visible force components whose selected
  load-case values are zero or near zero.
- Added UI help text explaining separate `My`/`Mz` and `Qy`/`Qz` component
  behavior with member local axes.

## Changed Files

- `docs/design/result-visualization.md`
- `docs/history/frame/investigations/20260624_static-shear-force-diagram-implementation.md`
- `frontend/src/i18n/ja.ts`
- `frontend/src/viewer/types.ts`
- `frontend/src/viewer/ViewerControls.tsx`
- `frontend/src/viewer/Viewer3D.tsx`
- `frontend/src/viewer/renderers/ResultDiagramRenderer.ts`
- `frontend/src/viewer/ViewerControls.test.tsx`
- `frontend/src/viewer/renderers/displayCoordinateIntegration.test.ts`

## Validation Results

Automated validation:

- `python -m pytest backend/tests -q` from the repository root: failed with
  477 passed and 6 failed. The failures are existing verification/example
  baseline issues outside this Viewer change:
  - `examples/portal_frame_verification.json` is missing required
    `analysisSettings.solver` for project schema validation.
  - `cantilever_torsion` expected rotation differs from the current solver
    result by slightly more than the test tolerance.
  - `portal_frame_horizontal` metadata points through
    `examples/verification/frame/../../examples/portal_frame_verification.json`,
    which does not resolve to an existing file on this checkout.
  - `simple_truss` reaction sign expectation differs from the current solver
    result.
- `npm test -- --run` from `frontend/`: passed, 56 files and 564 tests.
- `npm run typecheck` from `frontend/`: passed.
- `npm run build` from `frontend/`: passed. Vite reported the pre-existing
  large chunk warning.
- `npm run lint` from `frontend/`: command exited successfully. The source
  hygiene check passed, and the Japanese string scanner printed its existing
  review/fix report for many files.
- `npm run test:e2e` from `frontend/`: failed with 5 passed and 3 failed. The
  failures are outside the static Viewer diagram change:
  - `level0-navigation.spec.ts` expected `/level0?sample=short` after clicking a
    sample, but the URL stayed `/level0`.
  - `th-analysis-revamp.spec.ts` could not find the time-history dialog on
    `/th/run`.
  - `th-analysis-revamp.spec.ts` timed out waiting for the time-history input
    check side-nav button.

Initial targeted checks:

- `npm run typecheck` from `frontend/`: passed.
- `npm test -- --run src/viewer/ViewerControls.test.tsx src/viewer/renderers/displayCoordinateIntegration.test.ts`
  from `frontend/`: passed.

Manual model validation:

The browser validation used the `/pro` route with the backend on
`http://127.0.0.1:8000` and the frontend dev server on
`http://127.0.0.1:4173`. For each model, static analysis was run, the View panel
was opened, and `N`, `Qy`, `Qz`, `My`, and `Mz` diagram toggles were enabled.
Component status was classified from the static member-end force values for the
selected load case. Screenshots were captured after the toggles were enabled.

| Model | N | Qy | Qz | My | Mz | Screenshot | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cantilever beam with tip load | Zero / naturally invisible | Rendered | Zero / naturally invisible | Zero / naturally invisible | Rendered | `docs/screenshots/static-shear-force-diagrams/cantilever-tip-load.png` | Browser controls rendered and screenshot captured. |
| Simply supported beam with center load | Zero / naturally invisible | Rendered | Zero / naturally invisible | Zero / naturally invisible | Rendered | `docs/screenshots/static-shear-force-diagrams/simple-beam-center-load.png` | Browser controls rendered and screenshot captured. |
| Simply supported beam with distributed load | Zero / naturally invisible | Rendered | Zero / naturally invisible | Zero / naturally invisible | Rendered | `docs/screenshots/static-shear-force-diagrams/simple-beam-uniform-load.png` | Browser controls rendered and screenshot captured. |
| Portal frame | Rendered | Zero / naturally invisible | Rendered | Rendered | Zero / naturally invisible | `docs/screenshots/static-shear-force-diagrams/portal-frame.png` | The repository example was normalized in a temporary file with the existing default solver setting for browser/API validation because the checked-in file lacks `analysisSettings.solver`. |
| 3D L-frame | Rendered | Rendered | Rendered | Rendered | Rendered | `docs/screenshots/static-shear-force-diagrams/l-frame-3d.png` | Browser controls rendered and screenshot captured. |
| Existing repository example model | Zero / naturally invisible | Zero / naturally invisible | Rendered | Rendered | Zero / naturally invisible | `docs/screenshots/static-shear-force-diagrams/repository-example-project.png` | Browser controls rendered and screenshot captured. |

## Remaining Limitations

- Zero or near-zero components collapse onto the member baseline and can appear
  invisible by design.
- The diagram offset direction follows the existing Viewer convention and does
  not redefine local axes.
- Qy/Qz display is a static result diagram feature; time-history and dynamic
  result behavior were not changed.

## Screenshots

Screenshots are stored under:

- `docs/screenshots/static-shear-force-diagrams/cantilever-tip-load.png`
- `docs/screenshots/static-shear-force-diagrams/simple-beam-center-load.png`
- `docs/screenshots/static-shear-force-diagrams/simple-beam-uniform-load.png`
- `docs/screenshots/static-shear-force-diagrams/portal-frame.png`
- `docs/screenshots/static-shear-force-diagrams/l-frame-3d.png`
- `docs/screenshots/static-shear-force-diagrams/repository-example-project.png`

## Final Conclusion

Qy and Qz static shear force diagrams are connected to the Viewer display path
without changing solver output, result schemas, API fields, or existing `N`,
`My`, and `Mz` behavior. Frontend unit, typecheck, lint, and build validation
passed. The full backend suite and frontend E2E suite have failures unrelated to
this Viewer change and remain documented above.
