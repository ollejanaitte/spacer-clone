# GOLD-SP-001 — Symmetric I-section (candidate)

**Alias:** GOLD-MG-003S
**Status:** `CANDIDATE_TEMPLATE` / `NOT_APPROVED`
**Authority impact:** None until independent human derivation + approval
**Date opened:** 2026-08-02

> Cursor Auto must **not** fill Expected Value cells with production-solver or self-computed numbers and treat them as approved.

## 1. Input fixture (FIX-SP-001)

| Field | Value | Unit |
|-------|------:|------|
| topFlangeWidth | 0.500 | m |
| topFlangeThickness | 0.030 | m |
| bottomFlangeWidth | 0.500 | m |
| bottomFlangeThickness | 0.030 | m |
| webThickness | 0.012 | m |
| girderDepth | 2.500 | m |
| bridgeLength (volume context only) | 40.000 | m |

Derived (geometry definition, not a Golden expected):

| Field | Formula | Unit |
|-------|---------|------|
| webHeight | girderDepth − topFlangeThickness − bottomFlangeThickness | m |

## 2. Coordinate / unit contract

- SI only (m, m², m³, m⁴)
- Bottom fiber datum z = 0; top fiber z = girderDepth
- Strong-axis second moment about neutral axis
- Unit-length steel volume ≡ totalArea (m³/m)
- Full girder steel volume = totalArea × bridgeLength (m³)
- No flange/web overlap double-count
- No stiffener / splice / bolt hole / composite deck

## 3. Formula template (human completes numeric evaluation)

| Step | Quantity | Formula |
|------|----------|---------|
| A_tf | topFlangeArea | b_tf × t_tf |
| A_bf | bottomFlangeArea | b_bf × t_bf |
| A_w | webArea | t_w × h_w |
| A | totalArea | A_tf + A_bf + A_w |
| z_tf | top flange centroid from bottom | girderDepth − t_tf/2 |
| z_bf | bottom flange centroid from bottom | t_bf/2 |
| z_w | web centroid from bottom | t_bf + h_w/2 |
| z_bar | centroidFromBottom | (A_tf z_tf + A_bf z_bf + A_w z_w) / A |
| I_tf | top local + parallel axis | (b_tf t_tf³)/12 + A_tf (z_tf − z_bar)² |
| I_bf | bottom local + parallel axis | (b_bf t_bf³)/12 + A_bf (z_bf − z_bar)² |
| I_w | web local + parallel axis | (t_w h_w³)/12 + A_w (z_w − z_bar)² |
| I | secondMomentOfArea | I_tf + I_bf + I_w |
| y_t | top extreme distance | girderDepth − z_bar |
| y_b | bottom extreme distance | z_bar |
| S_t | sectionModulusTop | I / y_t |
| S_b | sectionModulusBottom | I / y_b |
| V1 | unitLengthVolume | A |
| Vg | steelVolumePerGirder | A × bridgeLength |

## 4. Expected values — HUMAN FILL

| Quantity | Unit | Expected (human) | Intermediate notes (human) |
|----------|------|------------------|----------------------------|
| webHeight | m | PENDING_HUMAN_DERIVATION | |
| topFlangeArea | m² | PENDING_HUMAN_DERIVATION | |
| bottomFlangeArea | m² | PENDING_HUMAN_DERIVATION | |
| webArea | m² | PENDING_HUMAN_DERIVATION | |
| totalArea | m² | PENDING_HUMAN_DERIVATION | |
| firstMomentSum (Σ A z) | m³ | PENDING_HUMAN_DERIVATION | |
| centroidFromBottom | m | PENDING_HUMAN_DERIVATION | symmetric → expect depth/2 check |
| I_tf | m⁴ | PENDING_HUMAN_DERIVATION | |
| I_bf | m⁴ | PENDING_HUMAN_DERIVATION | |
| I_w | m⁴ | PENDING_HUMAN_DERIVATION | |
| secondMomentOfArea | m⁴ | PENDING_HUMAN_DERIVATION | |
| topExtremeDistance | m | PENDING_HUMAN_DERIVATION | |
| bottomExtremeDistance | m | PENDING_HUMAN_DERIVATION | |
| sectionModulusTop | m³ | PENDING_HUMAN_DERIVATION | |
| sectionModulusBottom | m³ | PENDING_HUMAN_DERIVATION | |
| unitLengthVolume | m³/m | PENDING_HUMAN_DERIVATION | |
| steelVolumePerGirder | m³ | PENDING_HUMAN_DERIVATION | |

## 5. Independence attestation — HUMAN FILL

| Field | Value |
|-------|-------|
| Deriver name | PENDING |
| Derivation tool (hand / spreadsheet / other; must not be Apollo production path) | PENDING |
| Derivation date | PENDING |
| Artifact path / checksum of derivation sheet | PENDING |
| Independent reviewer | PENDING |
| Review date | PENDING |
| Approver | PENDING |
| Approval date | PENDING |
| Decision ID | PENDING |
| Approval status | NOT_APPROVED_FOR_RELEASE |

## 6. Comparison rule (proposed; see tolerance file)

`abs(actual − expected) <= max(A, R · |expected|)` with A/R frozen **before** comparison. Proposed defaults follow DS-07 / EA-02 section-property proposal; **not signed**.


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
| webHeight | 2.440 |
| topFlangeArea | 0.015000 |
| bottomFlangeArea | 0.015000 |
| webArea | 0.029280 |
| totalArea | 0.059280 |
| topFlangeCentroidFromBottom | 2.485 |
| bottomFlangeCentroidFromBottom | 0.015 |
| webCentroidFromBottom | 1.250 |
| firstMomentSum | 0.074100000 |
| centroidFromBottom | 1.250 |
| topFlangeLocalI | 0.000001125000 |
| topFlangeParallelAxisI | 0.022878375000 |
| I_tf | 0.022879500000 |
| bottomFlangeLocalI | 0.000001125000 |
| bottomFlangeParallelAxisI | 0.022878375000 |
| I_bf | 0.022879500000 |
| webLocalI | 0.014526784000 |
| webParallelAxisI | 0.000000 |
| I_w | 0.014526784000 |
| secondMomentOfArea | 0.060285784000 |
| topExtremeDistance | 1.250 |
| bottomExtremeDistance | 1.250 |
| sectionModulusTop | 0.0482286272 |
| sectionModulusBottom | 0.0482286272 |
| unitLengthVolume | 0.059280 |
| steelVolumePerGirder | 2.371200000 |

### 7.2 App GUI capture

- Launch: `npm run dev:apollo` @ http://127.0.0.1:5173 + uvicorn :8000
- Screenshot: `development_reference/screenshot_GOLD-SP-001.png`
- Development parity: `PASS`
- Save/reload match: `True`
- STALE after edit: `True`
- Comparison report: `development_reference/comparison_report.md`
- Display tolerance: A=5e-5, R=1e-12 (`FROZEN_BEFORE_APP_COMPARISON`)

| Quantity | App display actual | Verdict |
|----------|--------------------|---------|
| webHeight | 2.44 | PASS |
| topFlangeArea | 0.015 | PASS |
| bottomFlangeArea | 0.015 | PASS |
| webArea | 0.0293 | PASS |
| totalArea | 0.0593 | PASS |
| centroidFromBottom | 1.25 | PASS |
| secondMomentOfArea | 0.0603 | PASS |
| sectionModulusTop | 0.0482 | PASS |
| sectionModulusBottom | 0.0482 | PASS |
| steelVolumePerGirder | 2.3712 | PASS |

> Cursor Auto development reference is **not** independent human Golden approval.
