# Tolerance and Rounding Freeze (proposal)

**Authority:** Step 1-A proposal only  
**Date:** 2026-08-02  
**Status:** `PROPOSED_PENDING_HUMAN_SIGN_OFF`  
**Does NOT authorize comparison PASS/FAIL for GRANTED**

## 1. Base rule (DS-07 / EA-02)

```
abs(actual - expected) <= max(A, R * |expected|)
```

| Symbol | Meaning |
|--------|---------|
| A | Absolute tolerance |
| R | Relative tolerance |
| expected | Independently derived Golden value |
| actual | Production implementation output under test |

## 2. Proposed defaults for GOLD-SP-* (pure geometry SI)

These mirror EA-02 exact-arithmetic fixture defaults used for analytical golden registers. **Humans must confirm or replace before any approval.**

| Quantity family | Unit | Proposed A | Proposed R | Zero threshold |
|-----------------|------|------------|------------|----------------|
| Length / distance | m | 1e-15 | 1e-12 | 1e-20 |
| Area | m² | 1e-15 | 1e-12 | 1e-20 |
| First moment | m³ | 1e-15 | 1e-12 | 1e-20 |
| Second moment | m⁴ | 1e-15 | 1e-12 | 1e-20 |
| Section modulus | m³ | 1e-15 | 1e-12 | 1e-20 |
| Volume | m³ | 1e-15 | 1e-12 | 1e-20 |

## 3. Rounding policy (proposal)

| Stage | Policy |
|-------|--------|
| Human derivation worksheet | Record full working precision; publish expected to ≥15 decimal digits or exact rational form |
| Fixture published expected | Fixed decimal string; no live re-rounding during comparison |
| Comparison | Apply A/R rule only; do not re-round actual before compare unless DEC says otherwise |

## 4. Freeze attestation — HUMAN FILL

| Field | Value |
|-------|-------|
| Confirmed by | PENDING |
| Date | PENDING |
| Decision ID | PENDING |
| Status | NOT_FROZEN |

## 5. Hard rule

Tolerance must be frozen **before** comparing production outputs. Changing A/R after seeing diffs is prohibited without a new DEC-ID and supersession note.
