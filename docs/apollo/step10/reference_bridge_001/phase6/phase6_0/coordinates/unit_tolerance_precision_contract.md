# Unit / Tolerance / Precision Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Canonical units

| Quantity | Canonical unit |
|----------|----------------|
| Length | m |
| Force | kN |
| Moment | kN·m |
| Stress / modulus | kN/m² |
| Mass density | kN/m³ |
| Angle | rad |
| Area | m² |
| Inertia | m⁴ |
| Section modulus | m³ |
| Station / offset / elevation | m |

## 2. Angle display

- Canonical angle unit rad; display deg allowed at UI boundary; `sourceUnit` recorded
  on values (deg/rad) to avoid silent conversion.

## 3. Tolerance

- Coordinate comparison tolerance for geometry parity: **1e-3 m (1 mm)** for
  reference-bridge parity checks (Phase 6-4); engineering entity placement tolerance
  is documented per entity.
- Node keying rounding (legacy 1e-6) is a persistence/rounding detail, not a
  canonical tolerance.

## 4. Rounding / precision

- Canonical coordinates serialized at documented precision (no invented digits
  beyond source precision).
- Display precision per quantity kind (e.g. length 0.001 m default; station 0.001 m).
- Export m->mm conversion: **single policy** — convert exact metres to millimetres
  (m*1000), rounding to the nearest integer mm only where the format requires it;
  the policy is documented in the Export Connector (resolves DUP-016/017).

## 5. Finite values

- No NaN / Infinity in any geometry value.

## 6. Resolution states and numeric values

- CONFIRMED values usable.
- HCR / CONFLICT / HOLD values are carried with state; dummy numeric values are
  prohibited (no 0.0 placeholders).
