# Design Check Requirements for Curved Bridges

## Current Capability: Design Check (L5)

The Apollo step5_design module (`frontend/src/apollo/step5_design/`) provides:

- Straight bridge section design for simple single-span girders
- Continuous girder section design (straight, limited)
- Section force extraction from analysis results
- Basic stress check: σ = M/Z ≤ σa
- Shear check: τ = Q/Aw ≤ τa
- Combined stress check (straight girder): σ + τ interaction

## What's Needed for Curved Bridge

### Main Girder Design Checks

#### Bending + Torsion + Axial Interaction

For curved I-girders, the stress check is:

σ = (Mx / Zx) + (Mz / Zz) + (N / A) + (B / Ww) ≤ σa

Where:
- Mx: major axis bending moment
- Mz: minor axis bending moment (from torsion)
- N: axial force (from lateral bracing, braking)
- B: bimoment (warping)
- Ww: warping section modulus

**Current**: Only Mx/Zx + N/A is checked. Mz and B are not computed.

#### Biaxial Bending Check (My + Mz)

- Interaction formula: (Mx / Mxa) + (Mz / Mza) ≤ 1.0
- Mxa: allowable major axis moment
- Mza: allowable minor axis moment
- **NOT IMPLEMENTED** for curved bridges

#### Torsional Stress Check

- Saint-Venant shear stress: τsv = Mt / (2 × Ao × t) for closed sections
- Warping shear stress: τw = (S_w × dφ/dz) / (I_w × t) for open sections
- Combined: τ = τsv + τw ≤ τa
- **NOT IMPLEMENTED** for curved bridges

#### Warping Stress Check

- Warping normal stress: σw = B / Ww
- Warping is significant for open section I-girders (R < 300m)
- Japanese standards require warping check for R < 100m
- **NOT IMPLEMENTED** — requires warping DOF in solver (see 06_analysis_theory_requirements.md)

### Stability Checks

#### Lateral Buckling

- Curved I-girders have different lateral buckling behavior than straight girders
- Curvature reduces lateral buckling capacity
- Additional lateral bracing required due to curvature
- **NOT IMPLEMENTED** for curved bridges

#### Local Buckling

- Web slenderness limits for curved girders
- Flange slenderness limits (compression flange in curved girders has higher stress)
- Web stiffener requirements for curved girders
- **NOT IMPLEMENTED** for curved bridges

### Detail Design Checks

| Check | Status |
|-------|--------|
| Cross frame design | ❌ NOT IMPLEMENTED |
| Lateral bracing design | ❌ NOT IMPLEMENTED |
| Bearing design (curved) | ❌ NOT IMPLEMENTED |
| Support stiffener | ❌ NOT IMPLEMENTED |
| Splice design (curved) | ❌ NOT IMPLEMENTED |
| Fatigue details | ❌ NOT IMPLEMENTED |
| Deflection check (curved) | ❌ NOT IMPLEMENTED |
| Camber calculation (curved) | ❌ NOT IMPLEMENTED |

### Fatigue

- Curved girder details at cross frame connections have higher stress ranges
- Web gap fatigue at connection plates
- Distortion-induced fatigue due to cross frame forces
- Japanese standards require fatigue check for details on expressways (NEXCO)

## Gap Summary

| Feature | Status |
|---------|--------|
| Straight girder section check | ✅ PARTIALLY IMPLEMENTED (in development) |
| Curved girder bending + torsion check | ❌ NOT IMPLEMENTED |
| Biaxial bending interaction | ❌ NOT IMPLEMENTED |
| Torsional stress check | ❌ NOT IMPLEMENTED |
| Warping stress check | ❌ NOT IMPLEMENTED |
| Lateral buckling | ❌ NOT IMPLEMENTED |
| Cross frame / bracing design | ❌ NOT IMPLEMENTED |
| Bearing design | ❌ NOT IMPLEMENTED |
| Fatigue | ❌ NOT IMPLEMENTED |
| Camber / deflection | ❌ NOT IMPLEMENTED |

**Gap: Complete.** No design check implementation exists for curved bridges. Even the straight bridge design check is only partially implemented (in development). The design check module (L5) needs to be extended from scratch for curved bridge requirements.