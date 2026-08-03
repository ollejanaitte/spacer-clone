# 05 — Current 3D Structure Audit

## Pipeline (CODE_CONFIRMED)

`apolloBridgeStructureInput` → BSDD (`generateBsdd`) when current → `buildBridgeStructureSolidGeometryParameters` + `buildAppurtenanceAndHaunchSolids` → `buildApolloVisualizationModel` → Three.js (`SceneBuilder` / `ApolloVisualizationRenderer`) → STL (`apolloStlExport`).

## Component findings

### Main girder
I-section or box fallback from input dims; continuous split per span. Visibility `girders`. STL yes.

### RC deck
Box on deck thickness; Z deck top convention. Visibility `deck`.

### Cross beam (CROSS_BEAM)
- Separate entity from sway bracing (CODE_CONFIRMED)
- Prism: depth ≈ `0.35 * girderDepth`, width ≈ web thickness (VISUAL_APPROXIMATION / ASSUMED_DEVELOPMENT)
- Origin near mid-girder height: `Z = -girderDepth/2 + crossBeamDepth/2` (CODE_CONFIRMED)
- Stations: `index * crossBeamSpacing` (CODE_CONFIRMED)
- USER_REPORTED concern about “中央の部材” may conflate cross beams vs sway bracing — both can appear mid-span

### Sway bracing / cross frame (SWAY_BRACING)
- V-type diagonals in transverse plane at selected cross-beam stations (CODE_CONFIRMED)
- Connects `topConnectionZ` (top flange mid-thickness) to `midBottom` at `bottomConnectionZ` (bottom flange mid-thickness) (CODE_CONFIRMED)
- Therefore **does include lower girder region** in the V node — not web-center-only
- Section: **cylinder diameter 0.08 m constant** (`BRACING_MEMBER_DIAMETER_M`) — not L-angle (CODE_CONFIRMED)
- REQUIRES_ENGINEERING_REVIEW for correct cross-frame topology vs Japanese practice

### Upper / lower lateral
- Enabled by flags; sample sets both **false** → no laterals in default sample 3D (CODE_CONFIRMED)
- When enabled: planar diagonals at top or bottom flange connection Z; same cylinder approximation (CODE_CONFIRMED)
- USER_REPORTED: want L-shaped steel display → gap = section representation, not only visibility

### Haunch
- Step 4-C solids from C1 kernel when PROVIDED + generation current (CODE_CONFIRMED)
- Sample apply leaves presence NOT_PROVIDED → **no haunch solids after sample-only generate** (CODE_CONFIRMED)
- USER_REPORTED “ハンチが見えない” aligns with sample gap, not necessarily kernel failure
- TRAPEZOID display uses average-width box (ASSUMED_DEVELOPMENT_ONLY)

### Appurtenances (curb/railing/median/barrier)
- Same PROVIDED-only path; sample does not set presence (CODE_CONFIRMED)
- USER_REPORTED uncertainty on wall railing visibility → likely same sample/presence gap

### Pavement / road markings
- No solid kinds; quantity/drawing explicitly NOT_AVAILABLE without inputs (CODE_CONFIRMED)

### Supports / markers
- Bearings + abutment/pier markers; markers decorative (CODE_CONFIRMED)

## Structural engineering correctness

**STRUCTURAL_ENGINEERING_CORRECTNESS: NOT_AUTHORIZED**  
This audit confirms implementation sources and approximations; it does **not** certify that member topology matches a design code or site practice.
