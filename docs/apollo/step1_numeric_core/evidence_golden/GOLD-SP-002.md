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
| Approval status | NOT_APPROVED |

## 6. Comparison rule

Same proposed rule as GOLD-SP-001; freeze before comparison (`tolerance_and_rounding_freeze.md`).
