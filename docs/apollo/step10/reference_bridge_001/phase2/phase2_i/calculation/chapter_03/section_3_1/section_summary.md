# Section 3.1: 主構断面力の計算 (Main Frame Force Calculation)

## Overview
- **PDF pages:** 115-290 (printed pages 110-285)
- **Chapter:** 3 (非合成桁の設計 - Non-composite girder design)
- **Subsections:** 3.1.1 through 3.1.9
- **Analysis method:** Plane grid framed structure using deformation method (変形法)
- **Analysis program:** APOLLO Analyzer (横河技術情報)

## 3.1.1 解析方針 (Analysis Policy)
- Main girders and cross girders modeled as plane grid structure
- Load distribution through cross girders for both dead and live loads
- Linear elastic static analysis

## 3.1.2 荷重強度 (Load Intensities) — Pages 118-139 (printed 113-134)

### Dead Load (死荷重) Unit Values
| Load Item | Intensity | Unit |
|-----------|-----------|------|
| Pavement (t=80mm, γ=22.5 kN/m3) | 1.800 | kN/m2 |
| Deck slab (t=230mm, γ=27.5 kN/m3) | 6.325 | kN/m2 |
| Haunch (AG1, AG2) | 2.842 | kN/m |
| Wall rail (left & right) | 9.920 | kN/m |
| Sound barrier (附屬物荷重) | 2.100 | kN/m |
| Steel weight | 12.000 | kN/m |
| Inspection walkway | 1.000 | kN/m |
| Curb | 2.100 | kN/m |
| Nose section | 1.000 | kN/m |

### Panel Point Concentrated Loads (kN)
| Load Case | S1 | C1 | C2 | PR1 | PR2 | S2 |
|-----------|----|----|----|------|------|----|
| Nose curb (AG1) | 30 | 48 | - | - | - | - |
| Slab widening (AG1) | 11 | 20 | - | - | - | - |
| Nose drooping (AG1) | 31 | 23 | 8 | - | - | - |
| Slab drooping AG1 | 35 | - | - | 11 | 11 | 17 |
| Slab drooping AG2 | 62 | - | - | 11 | 11 | 17 |
| Girder end AG1 | 37 | - | - | - | - | 50 |
| Girder end AG2 | 44 | - | - | - | - | 50 |
| Wrapping concrete AG1 | 215 | - | - | 283 | 283 | 226 |
| Wrapping concrete AG2 | 215 | - | - | 283 | 283 | 226 |

### Live Load (活荷重)
- Design load: B活荷重 (B live load) per 道示Ⅰ 8.2

### Impact Coefficients (衝撃係数) i = 20/(50+L)
| Location | Average Span (m) | i |
|----------|-----------------|---|
| Span 1 | 40.156 | 0.222 |
| Support line 2 | 45.584 | 0.209 |
| Span 2 | 51.013 | 0.198 |
| Support line 3 | 45.585 | 0.209 |
| Span 3 | 40.156 | 0.222 |

### Load/Combination Factors
- Per 道示Ⅰ 3.3 Table 3-3.1

### Dead Load Reaction Verification
- Calculated total: 17955.87 kN
- Analysis total: 17955.68 kN
- Ratio: 1.000 → All items OK within rounding

## 3.1.3 格点座標 (Panel Point Coordinates)
### AG1 Girder (nodes 1001-1027)
- X range: 1.21766 m to 132.76045 m
- Y range: 1.47689 m to 1.55372 m (curved alignment)
- Z: 0.00000 m (plane grid)

### AG2 Girder (nodes 2001-2027)
- X range: 1.46395 m to 132.55077 m
- Y range: -3.02859 m to -2.94155 m
- Z: 0.00000 m

## 3.1.4 格点番号および部材番号 (Panel Point & Member Numbers)
- AG1 main girder members: 1001-1026 (27 nodes, 26 elements)
- AG2 main girder members: 2001-2026 (27 nodes, 26 elements)
- Cross girder members: 1001001-1001027 (27 members)
- Supports: S1 (7101001/7102001), PR1 (7101009/7102009), PR2 (7101019/7102019), S2/AR2 (7101027/7102027)

## 3.1.5 仮定剛度 (Assumed Stiffness)
### AG1 Bending Stiffness Ix (m4)
- Range: 0.068340 to 0.107048 m4
- Maximum at members 1008 (0.107048) and 1019 (0.107048)
- Minimum at members 1001 (0.068340) and 1026 (0.076329)

### AG2 Bending Stiffness Ix (m4)
- Range: 0.068340 to 0.107482 m4

### Cross Girder Bending Stiffness Ix (m4)
- Typical: 0.0092990 m4
- End members (1001001, 1001027): 0.0184053 m4
- Support members (1001009, 1001019): 0.0456238 m4

## 3.1.6 格子解析データ (Grid Analysis Data) — Pages 144-179
### Model Summary
- Analysis title: 旭高架橋 ランプ
- Structural nodes: 54
- Beam elements: 52
- Support elements: 27
- Load cases: 16 fixed + 9 influence line + road live load
- Linear static analysis

### Material Properties
- Young's modulus E: 2.000000e+008 kN/m2
- Shear modulus G: 7.700000e+007 kN/m2
- Poisson's ratio ν: 1.200000e-005
- Coefficient of thermal expansion: 0 (not specified)

### Nodal DOF Constraints
- DX=1 (fixed), DY=1 (fixed), DZ=0 (free vertical), RX=0, RY=0, RZ=1 (fixed rotation about Z)

### Element Section Properties
- Area (A): 0.000000 m2 (all elements - grid model)
- 2-axis shear: 0.000000
- 3-axis shear: 0.000000
- Torsional resistance J: 0.000000
- 2-axis bending Iy: 0.000000
- 3-axis bending Iz: varied per member (same as assumed stiffness)

## 3.1.7 格子解析結果 (Grid Analysis Results) — Pages 180-221
### Analysis Cases
- Dead load cases: 300 (16 sub-cases: pavement, deck, steel, haunch, inspection walkway, wall rails, sound barriers, slab drooping, girder end, wrapping concrete, nose loads)
- Live load: 302 (B活荷重)
- Design total: 303 (load factor considered)

### Output Blocks
- Element blocks: Main girder, Cross girder, Support lines 1-4
- Node blocks: All structural nodes

## 3.1.8 反力および活荷重回転角 (Reactions & Live Load Rotation) — Pages 222-276
### Dead Load Reactions by Support (kN)
| Load Item | PU15 | PR1 | PR2 | AR2 | Total |
|-----------|------|------|------|------|-------|
| Pavement | 183.2 | 644.4 | 643.8 | 183.3 | 1654.7 |
| Deck slab | 736.5 | 2590.9 | 2588.7 | 737.1 | 6653.2 |
| Steel weight | 348.9 | 1227.3 | 1226.3 | 349.2 | 3151.8 |
| Haunch | 82.6 | 290.7 | 290.4 | 82.7 | 746.4 |
| Inspection walkway | 14.6 | 51.1 | 51.1 | 14.6 | 131.4 |
| Right wall rail | 142.1 | 507.8 | 506.2 | 142.8 | 1298.9 |
| Right sound barrier | 30.1 | 107.5 | 107.2 | 30.2 | 274.9 |
| Left wall rail | 88.0 | 497.7 | 509.6 | 145.5 | 1240.8 |
| Left sound barrier | 18.6 | 105.3 | 107.9 | 30.8 | 262.7 |
| Slab drooping | 97.0 | 22.0 | 22.0 | 34.0 | 175.0 |
| Girder end | 81.0 | 0.0 | 0.0 | 100.0 | 181.0 |
| Wrapping concrete | 430.0 | 566.0 | 566.0 | 452.0 | 2014.0 |
| Nose curb | 70.0 | 9.7 | -2.2 | 0.5 | 78.0 |
| Nose slab widen | 27.7 | 4.1 | -0.9 | 0.2 | 31.0 |
| Nose slab droop | 55.6 | 7.7 | -1.7 | 0.4 | 62.0 |
| **Total** | **2405.8** | **6632.2** | **6614.5** | **2303.2** | **17955.7** |

### Superstructure Reactions (kN) - Characteristic Values
| Support | Girder | Rd (Dead) | RL max (Live) | RL min (Live) | Combined max | Combined min |
|---------|--------|-----------|---------------|---------------|--------------|--------------|
| PU15 | AG1 | 1205.1 | 737.8 | -128.0 | 2187.6 | 1105.4 |
| PU15 | AG2 | 1200.7 | 749.0 | -137.8 | 2197.1 | 1088.5 |
| PR1 | AG1 | 3325.5 | 1378.9 | -164.0 | 5215.5 | 3286.8 |
| PR1 | AG2 | 3306.6 | 1376.8 | -160.8 | 5193.0 | 3270.9 |
| PR2 | AG1 | 3341.6 | 1383.2 | -161.4 | 5237.6 | 3306.9 |
| PR2 | AG2 | 3272.9 | 1372.5 | -166.6 | 5152.2 | 3228.3 |
| AR2 | AG1 | 1221.9 | 777.3 | -134.1 | 2254.7 | - |
| AR2 | AG2 | 1081.3 | 711.5 | -133.7 | - | - |

## 3.1.9 設計断面力 (Design Section Forces) — Pages 277-290
- Design section forces for main girders and cross girders
- Load factor combinations applied per 道示Ⅰ
- Member forces used as input for subsequent section design (3.2 onwards)

## Key Parameters Summary
- **Total structure length (S1-S2):** approx. 131.325 m (avg)
- **Girder spacing:** 4500 mm (AG1-AG2)
- **Deck overhang:** 1755 mm each side
- **Bridge width:** 8010 mm total (7000 mm roadway + 505 mm each side)
- **Steel grade:** Standard structural steel (E=200 GPa)
- **Analysis software:** APOLLO Analyzer