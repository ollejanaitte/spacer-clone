# Calculation Example Requirements for Curved Bridges

## Current Capability

The repository has verification examples in `examples/verification/`:

| Category | Examples |
|----------|----------|
| Beams | cantilever, simple beam, continuous beam, cantilever_torsion (straight) |
| Trusses | simple truss, cantilever truss |
| Frames | 2D frame, 3D frame (straight) |
| Moving load | straight beam influence line, simple moving load |
| Eigen | cantilever eigen, frame eigen |
| Dynamic | response spectrum (straight) |

**No curved bridge examples exist.** The cantilever_torsion example is a straight beam under torsion — it does not test curved girder behavior.

## What's Needed for Curved Bridge

### Simple Curved Single-Span Girder

- Radius: 200m, 100m, 50m (parametrized)
- Span: 30m-50m
- Section: Welded I-girder (typical highway bridge section)
- Loading: Dead load + live load + centrifugal load
- Output: node coordinates (X, Y, Z), section forces at 10th points, stress at each flange, torsion distribution

### Continuous Curved 2-Span or 3-Span Girder

- 2-span: 35m + 35m, radius 150m
- 3-span: 40m + 50m + 40m, radius 200m
- Intermediate pier bearings with radial/tangential constraints
- Output: reaction distribution (bearing forces), moment redistribution due to curvature, torsion distribution at supports

### 2-Girder System

- Two girders at 6.0m spacing, radius 200m
- Cross beams at 5.0m intervals
- Different arc lengths for inner and outer girders
- Load distribution between inner and outer girders
- Output: load distribution factor, cross beam forces, differential deflection

### Multi-Girder System

- 4 or 5 girders at 2.5m spacing
- Radius 150m-300m
- Composite deck with RC slab
- Output: girder-by-girder force distribution, transverse distribution of live load

### Verification Data Requirements

Each example must include:

| Data | Required |
|------|----------|
| Node coordinates | (X, Y, Z) for each girder line |
| Element connectivity | With curvature direction |
| Member forces | N, My, Mz, Mt, B (warping bimoment) |
| Section forces | At 10th points, at supports |
| Stresses | σb, σt, σw, τsv, τw at critical sections |
| Design check results | Each check with pass/fail |
| Reactions | All bearing forces (R, T, V) |
| Deflections | Vertical, radial, tangential |
| Sign convention | Clear definition of positive directions |
| Rounding rules | Number of significant digits |

### Source of Reference Values

- Reference values should be computed using:
  1. Analytical formulas (Vlasov curved beam theory)
  2. Published examples (steel bridge design manuals)
  3. Verified FE software (e.g., SAP2000, MIDAS Civil, TDV RM)
- Each example should document the reference source

## Gap Summary

| Item | Status |
|------|--------|
| Straight beam verification | ✅ 10+ examples exist |
| Curved single-span girder | ❌ NOT EXISTS |
| Curved continuous girder | ❌ NOT EXISTS |
| 2-girder system | ❌ NOT EXISTS |
| Multi-girder system | ❌ NOT EXISTS |
| Verification with warping | ❌ NOT EXISTS |
| Verification with centrifugal | ❌ NOT EXISTS |
| Verification with curved bearing | ❌ NOT EXISTS |

**Gap: Complete.** No calculation examples for curved bridges exist in the repository. These examples are essential for both development (verification during implementation) and end-user training. Without reference examples, there is no way to verify the correctness of curved bridge analysis results.