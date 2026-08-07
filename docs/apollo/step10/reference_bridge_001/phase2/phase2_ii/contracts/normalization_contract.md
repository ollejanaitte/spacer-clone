# Phase 2-II Normalization Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Recalculation prohibited.** Normalization converts units only; it never
> recomputes design values.

## 1. Purpose

Define unit-normalization rules applied to candidate `normalized_value` /
`normalized_unit`. `raw_value` / `raw_unit` are preserved verbatim.

## 2. Rules

| rule_id | applies_to | action | example |
|---------|-----------|--------|---------|
| NOR-001 | length (m) | keep m | 40.201 m → 40.201 m |
| NOR-002 | length (mm) | convert to m | 40201 mm → 40.201 m |
| NOR-003 | force (kN) | keep kN | 1200 kN → 1200 kN |
| NOR-004 | distributed load (kN/m) | keep kN/m | 9.920 kN/m → 9.920 kN/m |
| NOR-005 | area load (kN/m2) | keep kN/m2 | 6.325 kN/m2 → 6.325 kN/m2 |
| NOR-006 | unit weight (kN/m3) | keep kN/m3 | 24.5 kN/m3 → 24.5 kN/m3 |
| NOR-007 | stress (N/mm2) | keep N/mm2 | 355 N/mm2 → 355 N/mm2 |
| NOR-008 | angle (deg) | keep deg | 30 deg → 30 deg |
| NOR-009 | dimensionless | no unit | 0.85 → 0.85 |
| NOR-010 | count | no unit | 18 → 18 |
| NOR-011 | text/label | no unit | A規格 → A規格 |
| NOR-012 | moment (kN·m) | keep kN·m | 1686.3 kN·m → 1686.3 kN·m |
| NOR-013 | stiffness (kN/mm) | keep kN/mm | 4.0 kN/mm → 4.0 kN/mm |

## 3. Rule

- `raw_value` is never rewritten.
- If the source gives no unit, `raw_unit` and `normalized_unit` are empty and
  `normalization_rule_id` is `NOR-011` (text/label) or `NONE`.
- No conversion factor is applied that would change the numeric meaning.

## 4. Verdict

```
PHASE2_II_NORMALIZATION_CONTRACT_DEFINED: YES
PHASE2_II_NORMALIZATION_RULES: 13
PHASE2_II_RECALCULATION: PROHIBITED
```
