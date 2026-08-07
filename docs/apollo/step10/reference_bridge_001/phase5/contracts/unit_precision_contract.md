# Unit / Precision Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Canonical internal units

| Quantity | Canonical unit | Symbol |
|----------|---------------|--------|
| Length | metre | m |
| Force | kilonewton | kN |
| Moment | kilonewton·metre | kN·m |
| Stress / modulus | kilonewton per square metre | kN/m² |
| Mass density | kilonewton per cubic metre | kN/m³ |
| Angle | radian | rad |
| Area | square metre | m² |
| Inertia | metre to the fourth | m⁴ |
| Section modulus | cubic metre | m³ |
| Station | metre (along alignment) | m |
| Offset | metre (transverse, right positive) | m |
| Elevation | metre (up positive) | m |

These follow the existing `unit-context` conventions in the repository
(`schemas/contracts/v0.1/unit-context.schema.json`, `frontend/src/types.ts` units block).

## 2. Unit metadata rules

1. Every numeric value record carries a `unit` (canonical unit used in serialization).
2. The record MAY carry `sourceUnit` — the unit as found in the source
   (e.g. mm, deg, %). When present, the model preserves it; no silent conversion.
3. Display conversions (m→mm, rad→deg) are presentation concerns, not data concerns.
4. `unit` is required for every numeric value; dimensionless values use
   `unit: "1"` or an explicit dimensionless marker.

## 3. Precision rules

1. Canonical serialization uses a documented precision policy per semantic class.
2. `precision` on a value record is the canonical display precision.
3. `sourcePrecision` MAY record the precision found in the source.
4. Rounding is applied only for display/serialization at the documented precision;
   internal canonical values are stored at the precision of the golden normalized value.
5. No invented extra significant digits beyond source precision.

## 4. Tolerance / rounding

- Serialization MUST NOT introduce NaN or Infinity.
- Rounding policy is documented in `serialization_contract.md` (floating representation rule).
- Reference tolerances (e.g. ±) are data, not assumed defaults.

## 5. Carried-forward units

- CONF-P2II-001 candidates: 680 mm and 700 mm (source units mm; canonical m = 0.680 / 0.700).
- Units are preserved alongside both candidate values and the selected value.

## 6. Existing compatibility

- Canonical units above match the existing project/analysis model units
  (m, kN, kN·m, kN/m², kN/m³). No change to existing unit conventions.
- Angle: canonical rad; source deg preserved in `sourceUnit`.
