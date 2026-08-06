# Section 4.1: 主構断面力の計算 (Main Frame Force Calculation)

## Overview
- **PDF pages:** 872-1282 (printed pages 867-1277)
- **Chapter:** 4 (合成桁の設計 - Composite girder design)
- **Subsections:** 4.1.1 through 4.1.7
- **Analysis method:** Plane grid framed structure with two models (pre-composite and post-composite)
- **Analysis program:** APOLLO Analyzer (横河技術情報)

## 4.1.1 解析方針 (Analysis Policy)
- Main girders and cross girders modeled as plane grid structure
- Nodes at cross-section lines, section change points, and 0.15L positions
- 0.15L position: boundary of tensile stress zone in deck near intermediate supports
- Deck monolithic casting → two analysis models: pre-composite (steel stiffness) and post-composite (composite stiffness)
- Bending stiffness only for main and cross girders
- Young's modulus ratio n=7 for composite stiffness calculation
- Creep, drying shrinkage, temperature difference per Doshin II 14.2.2-14.2.4

### Creep/Shrinkage/Temperature Difference Handling
- **Creep statically determinate force:** Occurs in positive moment range of post-composite dead load
- **Drying shrinkage statically determinate force:** Excluding intermediate support to 0.15L (deck tension zone)
- **Temperature difference statically determinate force:** Full length, using composite section for positive M range, steel+rebar for others
- **Indeterminate force ΔM:** Determinate forces applied to plane grid model
- **Design section forces:** Axial force P, Design moment M+ΔM

## 4.1.2 荷重強度 (Load Intensities) — PDF pages 874-899
Load intensities are characteristic values without load factors.

### Pre-composite Dead Load
| Load Item | Intensity | Unit |
|-----------|-----------|------|
| Deck slab (t=230mm, γ=27.5 kN/m3) | 6.325 | kN/m2 |
| Haunch (AG1, AG2) | 2.842 | kN/m |
| Steel weight (AG1, AG2) | 12.000 | kN/m |
| Inspection walkway | 1.000 | kN/m |
| Nose section loads (panel point loads) | per calculation | kN |

### Post-composite Dead Load
| Load Item | Intensity | Unit |
|-----------|-----------|------|
| Pavement (t=80mm, γ=22.5 kN/m3) | 1.800 | kN/m2 |
| Wall rail (left & right) | 9.920 | kN/m each |
| Sound barrier (left & right) | 2.100 | kN/m each |
| Curb | 2.100 | kN/m |

### Live Load (B活荷重)
- Impact coefficient: i = 20/(50+L) per Doshin I 8.2
- Span 1 (L=40.156m): i=0.222 | Support line 2: i=0.209
- Span 2 (L=51.013m): i=0.198 | Support line 3: i=0.209
- Span 3 (L=40.156m): i=0.222

## 4.1.3-4.1.4 Panel Point Numbers, Coordinates, and Assumed Stiffness
- AG1 girder nodes: 1001-1027 (27 panel points)
- AG2 girder nodes: 2001-2027 (27 panel points)
- Cross girder members connecting AG1 and AG2
- Detailed coordinate tables and assumed moment of inertia per member

## 4.1.5 格子解析データ (Grid Analysis Data) — PDF pages 904-1114
- Five analysis cases: pre-composite dead load, post-composite dead load, creep, drying shrinkage, temperature difference
- Full model data with element properties, nodal coordinates, and constraint conditions

## 4.1.6 格子解析結果 (Grid Analysis Results) — PDF pages 1115-1265
- Member forces for all five analysis cases
- Detailed output tables for main girder and cross girder elements
- Reactions and deformations

## 4.1.7 断面力 (Section Forces) — PDF pages 1266-1282
- Main girder section forces (both girders, all sections)
- Cross girder section forces
- Creep/drying shrinkage/temperature difference forces
- Design verification section forces

## Key Parameters Summary
- **Deck slab:** Steel-concrete composite slab t=230mm
- **Pavement:** Asphalt t=80mm
- **Bridge width:** 8010mm total (7000mm roadway)
- **Girder spacing:** 4500mm
- **Young's modulus ratio n:** 7 (composite), 14 (creep), 21 (drying shrinkage)
- **Steel grade:** SM490Y
- **Concrete strength:** σck=30.0 N/mm2
