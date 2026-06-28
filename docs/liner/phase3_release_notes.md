# LINER Phase3 Release Notes

Date: 2026-06-28

## Scope Completed

- Project schema migration stub added with root `schemaVersion`.
- Legacy project files without root `schemaVersion` migrate on JSON load.
- LINER draft state is persisted in `project.liner.draft`.
- Existing project save and autosave now include the LINER draft without adding new UI indicators.
- Plan DXF export added as `liner_plan.dxf`.
- Profile DXF export added as `liner_profile.dxf`.
- Frame STL export added as `liner_frame.stl`.

## Export Behavior

- Plan DXF uses open-standard DXF from Maker.js.
- Plan DXF writes `PLAN_CENTERLINE` and `PLAN_OFFSET` layers.
- Profile DXF writes `PROFILE_GROUND` and `PROFILE_DESIGN` layers.
- DXF output keeps world coordinates and sets `$INSUNITS=6` for meters.
- `$MEASUREMENT=1` is added to DXF headers.
- Frame STL uses the current project members as 3D cylindrical frame members.

## Validation

- DXF exports are covered by `dxf-parser` round-trip tests.
- STL export is covered by ASCII STL serializer tests.
- TypeScript typecheck passed for each Phase3 implementation PR.

## Deferred

- DXF import remains out of scope.
- Dimension lines and detailed CAD layer separation remain deferred.
- GUI CAD validation remains deferred.
- OBJ export remains deferred.
