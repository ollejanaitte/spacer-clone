# GOLD-SP-002 — Asymmetric I-section (candidate)

**Alias:** GOLD-MG-003A
**Status:** `CANDIDATE_TEMPLATE` / `NOT_APPROVED`
**Authority impact:** None until independent human derivation + approval
**Date opened:** 2026-08-02

> Cursor Auto must **not** fill Expected Value cells with production-solver or self-computed numbers and treat them as approved.

## 1. Input fixture (FIX-SP-002)

| Field | Value | Unit |
|-------|------:|------|
| topFlangeWidth | 0.500 | m |
| topFlangeThickness | 0.020 | m |
| bottomFlangeWidth | 0.600 | m |
| bottomFlangeThickness | 0.025 | m |
| webThickness | 0.012 | m |
| girderDepth | 2.500 | m |
| bridgeLength (volume context only) | 200.000 | m |

Derived:

| Field | Formula | Unit |
|-------|---------|------|
| webHeight | girderDepth − topFlangeThickness − bottomFlangeThickness | m |

## 2. Coordinate / unit contract

Identical to GOLD-SP-001 (`scope_and_authority.md` §4). Asymmetry must move the neutral axis away from mid-depth.

## 3. Formula template

Same worksheet steps as GOLD-SP-001.md §3. Humans must show parallel-axis terms explicitly for the asymmetric flanges.

## 4. Expected values — HUMAN FILL

| Quantity | Unit | Expected (human) | Intermediate notes (human) |
|----------|------|------------------|----------------------------|
| webHeight | m | PENDING_HUMAN_DERIVATION | |
| topFlangeArea | m² | PENDING_HUMAN_DERIVATION | |
| bottomFlangeArea | m² | PENDING_HUMAN_DERIVATION | |
| webArea | m² | PENDING_HUMAN_DERIVATION | |
| totalArea | m² | PENDING_HUMAN_DERIVATION | |
| firstMomentSum (Σ A z) | m³ | PENDING_HUMAN_DERIVATION | |
| centroidFromBottom | m | PENDING_HUMAN_DERIVATION | must not equal depth/2 |
| I_tf | m⁴ | PENDING_HUMAN_DERIVATION | |
| I_bf | m⁴ | PENDING_HUMAN_DERIVATION | |
| I_w | m⁴ | PENDING_HUMAN_DERIVATION | |
| secondMomentOfArea | m⁴ | PENDING_HUMAN_DERIVATION | |
| topExtremeDistance | m | PENDING_HUMAN_DERIVATION | |
| bottomExtremeDistance | m | PENDING_HUMAN_DERIVATION | |
| sectionModulusTop | m³ | PENDING_HUMAN_DERIVATION | |
| sectionModulusBottom | m³ | PENDING_HUMAN_DERIVATION | S_t ≠ S_b expected |
| unitLengthVolume | m³/m | PENDING_HUMAN_DERIVATION | |
| steelVolumePerGirder | m³ | PENDING_HUMAN_DERIVATION | |

## 5. Independence attestation — HUMAN FILL

| Field | Value |
|-------|-------|
| Deriver name | PENDING |
| Derivation tool | PENDING |
| Derivation date | PENDING |
| Artifact path / checksum of derivation sheet | PENDING |
| Independent reviewer | PENDING |
| Review date | PENDING |
| Approver | PENDING |
| Approval date | PENDING |
| Decision ID | PENDING |
| Approval status | NOT_APPROVED_FOR_RELEASE |

## 6. Comparison rule

Same proposed rule as GOLD-SP-001; freeze before comparison (`tolerance_and_rounding_freeze.md`).


## 7. Development reference (NOT FOR RELEASE)

**development status:** `REFERENCE_PARITY_PASS`
**approval status:** `NOT_APPROVED_FOR_RELEASE`
**human reviewer:** `PENDING`
**approver:** `PENDING`
**decision ID:** `PENDING`
**NUMERIC_DESIGN_AUTHORIZATION:** `NOT_GRANTED`
**DESIGN_OR_CONSTRUCTION_USE:** `PROHIBITED`

### 7.1 Independent Decimal reference (fixed before app)

Artifact: `development_reference/reference_results.json`
SHA256 (reference_results.json): `e24b30e27a940f429a089762759bcb63a9113b4bea52f23ed65e17f2359565d4`
Calculator SHA256: `5941d4918cf0aa1261b47e5b9ad7f7efe90bd41af4cf9be5627916a0d421d6c6`
Canonical inputs SHA256: `9a6134be32f1b7b7e6198f29fe8c54aa69a52fb4cbeb8594e9c7b621528975f9`

| Quantity | Development reference value |
|----------|----------------------------|
| webHeight | 2.455 |
| topFlangeArea | 0.010000 |
| bottomFlangeArea | 0.015000 |
| webArea | 0.029460 |
| totalArea | 0.054460 |
| topFlangeCentroidFromBottom | 2.490 |
| bottomFlangeCentroidFromBottom | 0.0125 |
| webCentroidFromBottom | 1.2525 |
| firstMomentSum | 0.0619861500 |
| centroidFromBottom | 1.1381959236136614028644876973925817113477781858244583180315828130738156445097319 |
| topFlangeLocalI | 0.00000033333333333333333333333333333333333333333333333333333333333333333333333333333333 |
| topFlangeParallelAxisI | 0.018273742609347219567970724216623426156235784207352689491416341716602184651657532 |
| I_tf | 0.018274075942680552901304057549956759489569117540686022824749675049935517984990865 |
| bottomFlangeLocalI | 0.000000781250 |
| bottomFlangeParallelAxisI | 0.019007869686606213119859134433638774930277289972431898724821905156614624755672122 |
| I_bf | 0.019008650936606213119859134433638774930277289972431898724821905156614624755672122 |
| webLocalI | 0.014796346375 |
| webParallelAxisI | 0.00038490732854160954500157726600662006662684502697266481350835613816769297974342700 |
| I_w | 0.015181253703541609545001577266006620066626845026972664813508356138167692979743427 |
| secondMomentOfArea | 0.052463980582828375566164769249602154486473252540090586363079936344717835720406414 |
| topExtremeDistance | 1.3618040763863385971355123026074182886522218141755416819684171869261843554902681 |
| bottomExtremeDistance | 1.1381959236136614028644876973925817113477781858244583180315828130738156445097319 |
| sectionModulusTop | 0.038525351401536372954388604870611940093904689863502681337785637252291154428111988 |
| sectionModulusBottom | 0.046093980389826329483817487185981599653040773355553350761957845959675400606963545 |
| unitLengthVolume | 0.054460 |
| steelVolumePerGirder | 10.892000000 |

### 7.2 App GUI capture

- Launch: `npm run dev:apollo` @ http://127.0.0.1:5173 + uvicorn :8000
- Screenshot: `development_reference/screenshot_GOLD-SP-002.png`
- Development parity: `PASS`
- Save/reload match: `True`
- STALE after edit: `True`
- Comparison report: `development_reference/comparison_report.md`
- Display tolerance: A=5e-5, R=1e-12 (`FROZEN_BEFORE_APP_COMPARISON`)

| Quantity | App display actual | Verdict |
|----------|--------------------|---------|
| webHeight | 2.455 | PASS |
| topFlangeArea | 0.01 | PASS |
| bottomFlangeArea | 0.015 | PASS |
| webArea | 0.0295 | PASS |
| totalArea | 0.0545 | PASS |
| centroidFromBottom | 1.1382 | PASS |
| secondMomentOfArea | 0.0525 | PASS |
| sectionModulusTop | 0.0385 | PASS |
| sectionModulusBottom | 0.0461 | PASS |
| steelVolumePerGirder | 10.892 | PASS |

> Cursor Auto development reference is **not** independent human Golden approval.
