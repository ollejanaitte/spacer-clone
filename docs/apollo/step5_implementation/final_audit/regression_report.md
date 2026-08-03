# Step 5 Final Audit — Regression Report

## Apollo suite

- Before label-filter fix: **1 FAIL** / 443 (`bridgeStructureVisualization` sway length 0)
- After filter fix: **443 PASS** / 63 files

## Step 4 inheritance

| Capability | Status |
|------------|--------|
| Appurtenance / haunch solids + qty + load + analysis | Covered by existing Step 4C tests; sample wires PROVIDED in Step 5 sampleInputs |
| Workflow STALE / checksum | Step 4C tests still pass within `src/apollo` suite |
| Report/drawing/ZIP reintegration | Still deferred (Step 4-G) — not regressed by Step 5 |
| Alignment / LINER pavement bind | Still unbound (Step 4-E) — pavement owned by Apollo draft per DEC-S5-0003 |

## Geometry / STL

| Check | Result |
|-------|--------|
| Road markings `exportable: false` | Asserted in step5p3 / step5p6p7 |
| Pavement solids exportable | true (structural viz path) |
| L-angle renderer | Two BoxGeometry plates when sectionType=1; cylinder when disabled |
| Cross beam / sway BSDD kinds | Unchanged in #348 (labels only) |

## Typecheck / lint / build

- `tsc -b`: PASS
- `npm run lint`: PASS (exit 0)
- `npm run build`: PASS

## Residual regression risk for Audit C

- Browser console errors during Guided Mode + sample apply
- Z-fighting pavement vs markings
- Mobile/a11y Guided chrome
- Save/reload of schema 1.3.0 pavement + lateralAngleSection fields
