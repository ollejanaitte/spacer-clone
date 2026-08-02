# Tolerance and Rounding Freeze (proposal)

**Authority:** Step 1-A proposal only
**Date:** 2026-08-02
**Official human sign-off:** `PENDING`
**Official status:** `NOT_FROZEN_FOR_RELEASE`
**Does NOT authorize comparison PASS/FAIL for GRANTED / release**

## 1. Base rule (DS-07 / EA-02)

```
abs(actual - expected) <= max(A, R * |expected|)
```

| Symbol | Meaning |
|--------|---------|
| A | Absolute tolerance |
| R | Relative tolerance |
| expected | Independently derived reference / Golden value |
| actual | Implementation or app output under test |

## 2. Proposed defaults for GOLD-SP-* (pure geometry SI) — release candidate

These mirror EA-02 exact-arithmetic fixture defaults. **Humans must confirm before release approval.**

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

## 4. Freeze attestation — HUMAN FILL (release)

| Field | Value |
|-------|-------|
| Confirmed by | PENDING |
| Date | PENDING |
| Decision ID | PENDING |
| Status | NOT_FROZEN_FOR_RELEASE |

## 5. Hard rule

Tolerance must be frozen **before** comparing production outputs. Changing A/R after seeing diffs is prohibited without a new DEC-ID and supersession note.

---

## 6. Development comparison freeze (NOT for release)

Frozen **before** any app GUI capture / comparison in this session.

```
DEVELOPMENT_TOLERANCE_STATUS: FROZEN_BEFORE_APP_COMPARISON
DEVELOPMENT_USE: IMPLEMENTATION_DEBUGGING_AND_OUTPUT_COMPARISON_ONLY
RELEASE_USE: PROHIBITED
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

### 6.1 Full-precision path (export / raw numeric capture)

Same as §2 DS-07 proposal:

| A | R |
|---|---|
| 1e-15 | 1e-12 |

### 6.2 UI display path

`BridgeStructureInputPanel` formats section properties with `formatMetric(..., 4)` → `toLocaleString` `maximumFractionDigits: 4`.

Display comparison uses (frozen before app run, based on documented UI digit policy — not on observed mismatches):

| A_display | R_display | Rationale |
|-----------|-----------|-----------|
| 5e-5 | 1e-12 | Half of 1×10⁻⁴ display quantum |

Quantities compared on the display path are only those rendered in `apollo-bridge-structure-section-properties`. Intermediate I-component terms remain in the independent Decimal workbook only unless a raw capture is present.

### 6.3 Development freeze attestation (machine)

| Field | Value |
|-------|-------|
| Frozen by | Cursor Auto (development-only track) |
| Frozen at | 2026-08-02T21:30:00+09:00 (before app comparison) |
| Reference artifact | `development_reference/reference_results.json` |
| Status | `FROZEN_BEFORE_APP_COMPARISON` |
