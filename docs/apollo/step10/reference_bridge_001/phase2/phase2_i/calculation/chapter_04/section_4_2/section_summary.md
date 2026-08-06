# Section 4.2: 主桁の設計 (Main Girder Design)

## Overview
- **PDF pages:** 1283-2025 (printed pages 1278-2020)
- **Chapter:** 4 (合成桁の設計 - Composite girder design)
- **Subsections:** 4.2.1 through 4.2.10
- **Design method:** Partial factor design method (部分係数設計法)
- **Steel grade:** SM490Y (σy=355 N/mm2, σsu=490 N/mm2, τy=205 N/mm2)

## 4.2.1 設計方針 (Design Policy) — PDF pages 1284-1291
- **Completed state:** Steel composite girder design. Concrete deck considered in composite section with effective width.
- **Construction state:** Steel girder section only, verified against dead and construction loads.
- **Limit states:** 1 (load-carrying capacity), 3 (serviceability)
- **Material properties:** SM490Y (E=200000 N/mm2, G=77000 N/mm2)
- **Young's modulus ratios:** n=7 (live load), n=14 (creep), n=21 (drying shrinkage)
- **Reinforcement:** D22 @125mm top and bottom

## 4.2.2 床版有効幅の計算 (Effective Deck Width) — PDF pages 1292-1298
- Effective width calculated per Doshin II provisions
- Values vary by section location (support vs. span)

## 4.2.3 断面諸量 (Section Properties) — PDF pages 1299-1322
Tables for each element number with section properties in 5 conditions:
1. **Steel section only:** Area A (cm2), eccentricity e (cm), stiffness I (cm4), Ysu, YsL
2. **Composite (n=7):** Ac/n, Av (total area), eccentricity, stiffness I, Ycu, YcL, Ysu, YsL
3. **Composite creep (n=14):** Same properties
4. **Composite drying shrinkage (n=21):** Same properties
5. **Steel + rebar:** For temperature difference calculation

### Key Values for AG1 Sec-1 (Sup-1)
| Property | Steel | Comp (n=7) | Creep (n=14) | Shrink (n=21) | Steel+Rebar |
|----------|-------|------------|--------------|---------------|-------------|
| A (cm2) | 634.38 | 1946.50 | 1290.44 | 1071.75 | 881.74 |
| e (cm) | 1.28 | -109.16 | -82.01 | -65.58 | -44.68 |
| I (cm4) | 6473032 | 18008524 | 15158395 | 13440812 | 11253998 |
| Ycu (cm) | - | -64.89 | -92.04 | -108.47 | -122.07 |
| YcL (cm) | - | -41.89 | -69.04 | -85.47 | -113.67 |
| Ysu (cm) | -130.33 | -19.89 | -47.04 | -63.47 | -84.37 |
| YsL (cm) | 127.67 | 238.11 | 210.96 | 194.53 | 173.63 |

### Section dimensions (AG1 Sec-1 Sup-1):
- SLAB: 3993x230 mm (deck slab)
- D22 x 2 layers (reinforcement)
- UFLG: PL 620x22 (SM490Y)
- WEB: PL 2537x14 (SM490Y)
- LFLG: PL 680x21 (SM490Y)
- Haunch height: 220.0 mm
- Full deck width: 4005 mm
- Radius of curvature: R=2998.500 m

## 4.2.4 断面の応力度照査 (Stress Verification) — PDF pages 1323-1775
Largest subsection covering all sections for AG1 and AG2:

### AG1 Sections Verified:
- **Sec-1 (Sup-1):** Support 1 - completed state (p.1319-1350)
- **Sec-2 (Span 1):** Mid-span 1 - completed state (p.1400-1450)
- **Sec-3 (C1):** Cross girder C1 location (p.1451-1520)
- **Sec-4 (PK前):** Before PK cross-section change (p.1520-1598)
- **Sec-5 (PK後活):** After PK live load (p.1598-1680)
- **Sec-6 (PR1):** Intermediate support PR1 (p.1680-1775)

### Verification Items per Section:
1. **Pre-composite dead load (Md1):** Steel section stresses
2. **Post-composite dead load (Md2):** Composite section stresses  
3. **Post-composite live load (ML1):** Composite section stresses
4. **Temperature difference:** P=-3158.2kN, M=1686.3kNm (steel temperature rise)
5. **Creep:** Per Doshin II (eq. 解14.2.3), φ1=2
6. **Drying shrinkage:** P=-1842.3kN, M=1786.5kNm
7. **Permanent action (A):** (1)+(2)+(4)+(5)+(6)
8. **Variable action (D):** (A)+(3) - with temperature sign combinations

### Stress Limits (Limit State 3):
| Component | Tension (N/mm2) | Compression (N/mm2) | Shear (N/mm2) |
|-----------|-----------------|---------------------|---------------|
| Upper flange | 272 | 193 (pre-comp) / 272 (post-comp) | - |
| Lower flange | 272 | 164 | - |
| Web | - | - | 157 |

### Sample Verification - AG1 Sec-1 Sup-1 (Support):
- Md1 = 0 kNm, S = 663.1 kN
- Md2 = 0 kNm, S = 281.6 kN
- ML1 = 0 kNm, S = 922.1 kN
- Temperature: σsu = -18 N/mm2, σsL = 6 N/mm2
- Shrinkage: σsu = -26 N/mm2, σsL = 9 N/mm2
- Shear stress τ = 53 N/mm2 < 157 N/mm2
- Combined (bending+shear): κ = 0.13 < 1.20 OK

## 4.2.5 断面構成図 (Section Composition Drawing) — PDF page 1776
- Two drawings for AG1 and AG2 showing flange/web thickness transitions

## 4.2.6 現場継手の計算 (Field Splice) — PDF pages 1778-1946
- High-strength bolted friction-type field splice design
- Splice plate design for flanges and web

## 4.2.7 たわみおよび剛比の照査 (Deflection & Stiffness) — PDF pages 1947-1954
- Span 1 deflection: 23.5 mm
- Span 2 deflection: 28.7 mm
- Span 3 deflection: 22.1 mm

## 4.2.8 各計算応力度 (Calculated Stress Values) — PDF pages 1955-2002
Seven sub-sections:
1. Deck slab stresses
2. Stresses due to curvature
3. Completed state stresses (live load max)
4. Completed state stresses (live load min)
5. Reinforcement stresses
6. Service converted stresses
7. Per-section stress summary

## 4.2.9 中間補剛材 (Intermediate Stiffener) — PDF pages 2003-2022
- Vertical stiffener calculation
- Vertical stiffener end treatment
- Horizontal stiffener stress verification
- Stiffener stiffness check

## 4.2.10 主桁溶接計算 (Main Girder Weld) — PDF pages 2023-2025
- Weld size determination for flange-web connections

## Key Parameters Summary
- **Steel:** SM490Y (σy=355, σsu=490)
- **Concrete:** σck=30 N/mm2
- **n values:** 7 (live), 14 (creep), 21 (shrinkage)
- **Creep coefficient:** φ1=2
- **Temperature difference:** 10°C (steel rise)
- **Shrinkage strain:** εs=20×10^-5
- **Radius of curvature:** R=2998.500 m
- **Haunch height:** 220 mm
