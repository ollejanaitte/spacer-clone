# Section 3.2: 主桁の設計 (Main Girder Design)

## Overview

This section covers the structural design of main girders (AG1 and AG2) for the Asahi Viaduct A-Ramp PU15-AR2 bridge. The bridge is a **2-girder system** with a horizontal curve radius of **R=2998.500m**.

**PDF Pages:** 291-674 (Printed: 286-669)

## Subsections

| Subsection | Title | PDF Pages | Description |
|------------|-------|-----------|-------------|
| 3.2.1 | 設計方針 (Design Policy) | 292-296 | Limit state design policy per Japan Road Association specifications |
| 3.2.2 | 断面の決定 (Section Determination) | 297-383 | 29 AG1 sections + 28 AG2 sections + dead load sections |
| 3.2.3 | 断面構成図 (Section Composition) | 384 | Elevation and cross-section drawings |
| 3.2.4 | 現場継手の計算 (Field Splice) | 385-520 | High-strength bolt (TCB M22) connections |
| 3.2.5 | たわみおよび剛比の照査 (Deflection) | 521-526 | Stiffness ratio verification |
| 3.2.6 | 支点上補剛材の計算 (Bearing Stiffener) | 527-545 | Column design under axial compression |
| 3.2.7 | 中間補剛材の計算 (Intermediate Stiffener) | 546-564 | Spacing and rigidity checks |
| 3.2.8 | 格点補剛材の計算 (Panel Point Stiffener) | 565-573 | U-frame stiffness verification |
| 3.2.9 | ジャッキアップ補剛材の計算 (Jack-up Stiffener) | 574-585 | Jacking point design |
| 3.2.10 | 横力の計算 (Lateral Force) | 586-623 | Seismic L2 transverse force |
| 3.2.11 | 横力考慮時の主桁応力度 (Stress + Lateral Force) | 624-651 | Combined stress with lateral loads |
| 3.2.12 | ずれ止めの計算 (Shear Connector) | 652-661 | Stud dowel design |
| 3.2.13 | 主桁高変化部の補剛材 (Variable Depth) | 662-666 | Stiffener at depth transition |
| 3.2.14 | 主桁溶接計算 (Weld Design) | 667-670 | Flange-web fillet/groove weld |
| 3.2.15 | ソールプレート取り付け (Sole Plate) | 671-673 | Seismic connection design |
| 3.2.16 | 鋼重比較 (Steel Weight) | 674 | Actual vs. assumed weight check |

## Key Design Values

### Constant Parameters
| Parameter | Value |
|-----------|-------|
| Upper flange width | **620mm** (constant) |
| Lower flange width | **680mm** (constant) |
| Web thickness | **14mm** (constant) |
| Reference girder height | **2700mm** |
| Curve radius | **2998.500m** |
| Steel grades | SM520 / SM490Y / SM400 / SM520-H |
| Bolt type | TCB M22(S10T) |
| Stress limit σtud (SM490Y) | **272 N/mm²** |
| Shear stress limit τud | **157 N/mm²** |

### Critical Sections (AG1)

| Section | Location | UFLG | WEB | LFLG | σb (max) | Governing |
|---------|----------|------|-----|------|----------|-----------|
| Sec-1 | Left end | 620×22 | 2537×14 | 680×21 | 0/0 | Shear τ=51 |
| Sec-1(J-1) | Joint 1 | 620×22 | 2657×14 | 680×21 | 185/181 | Combined |
| Sec-3 | Mx-Max | 620×27 | 2652×14 | 680×21 | **232/249** | Bending |
| Sec-5(J-5) | Joint 5 | 620×27 | 2643×14 | 680×30 | 241/219 | Combined κ=0.94 |
| Sec-6 | **Mx-Min** | **620×39** | 2614×14 | **680×47 (SM520-H)** | **261/224** | **Combined κ=1.10** |
| Sec-9 | Mx-Max | 620×28 | 2651×14 | 680×21 | 223/243 | Bending |
| Sec-12 | Mx-Min | 620×39 | 2614×14 | 680×47 (SM520-H) | 262/225 | **Combined κ=1.11** |
| Sec-15 | Mx-Max | 620×28 | 2651×14 | 680×21 | 222/241 | Bending |

### Steel Weight Comparison
| Item | Value |
|------|-------|
| AG1 length | 133.303 m |
| AG2 length | 132.847 m |
| Assumed weight per girder | 12.000 kN/m |
| Assumed total weight | 3193.800 kN = **325.566 t** |
| Actual main steel weight | **311.594 t** |
| Actual / Assumed | **95.7%** [OK ≤ 110%] |

## Design Criteria
- Limit state design per Japan Road Association "道示Ⅱ" (Specifications for Highway Bridges Part II)
- Aichi Prefecture "Bridge Design Guide" for additional local requirements
- APOLLO Super Designer program (Yokogawa Technical Information) for calculations
- Stress margin of approximately 5 N/mm² retained
- Stiffness ratio: ≤10% per panel point, ≤5% span average
- Steel weight difference: ≤10%

## Files in this directory
- `page_elements.csv` - 67 rows (page-by-page element mapping)
- `tables.csv` - 39 rows (extracted design tables)
- `values.csv` - 75 rows (key design parameters and values)
- `formulas.csv` - 26 rows (design formulas)
- `notes.csv` - 36 rows (design notes and comments)
- `figures.csv` - 10 rows (figure/drawing descriptions)
- `section_summary.md` - This file