# Export Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `GeometrySnapshot → Export Connector → STL / DXF / future IFC`

## 1. Purpose

Separate engineering geometry (from GeometrySnapshot) from file-format conversion.
The connector is the single place where snapshot geometry is converted to export
formats.

## 2. Inputs

- GeometrySnapshot (supports, girderLines, gridPoints, crossSectionFrames,
  deckReferences, bearingPoints, memberPlacementReferences)
- export request (target format, options)

## 3. Outputs

- STL (binary, mm), DXF (mm), future IFC

## 4. Responsibilities

- engineering geometry -> format geometry (cuboids, lines, polylines)
- unit conversion: single policy (m -> mm) with documented rounding
- declared transforms only (no hidden origin shift)

## 5. Prohibited

- geometry recomputation
- hidden `originShiftMm` (DUP-025) — must be a declared export option
- divergent m->mm rounding vs DXF raw (DUP-016/017) — one policy

## 6. Existing duplication addressed

- STL `toMillimeters` (round) vs DXF `toMm` (raw) unified into one unit policy.
- L-polygon geometry duplicated 3x (DUP-026) -> single section polygon source.

## 7. Owner

Export Connector owner (bridge-side); format conversion owned by the connector.
