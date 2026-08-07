# Normalization and Units

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 3
> **Companion:** Phase 2-II `normalization_contract.md` (NOR-001..NOR-013)

## 1. Principle

- `raw_value` / `raw_unit` are preserved verbatim from source.
- `normalized_value` / `normalized_unit` are the SI-normalized equivalents.
- Normalization never changes the source value; it only converts units.

## 2. Normalization Rules Applied

| Rule | Description |
|------|-------------|
| NOR-001 | Length m conversion (mm→m, cm→m) |
| NOR-002 | Length mm→m conversion (SI) |
| NOR-003 | Force kN conversion |
| NOR-004 | Distributed load kN/m conversion |
| NOR-005 | Surface load / stress kN/m² conversion |
| NOR-006 | Mass kg→t conversion |
| NOR-007 | Stress N/mm² → kN/m² (or preserved) |
| NOR-009 | Percent % preserved |
| NOR-011 | Non-numeric identifier/text preserved |

## 3. Unit Convention

Golden records carry SI base units:

- Length: `m`
- Force: `kN`
- Distributed load: `kN/m`
- Surface load / pressure: `kN/m²`
- Stress: `kN/m²` or `N/mm²`
- Gradient: `%`
- Speed: `km/h`

## 4. Rounding

- Golden records preserve the normalized value precision from Phase 2-II
- No additional rounding is applied in Phase 3
- Rounding policy for display is a Phase 4 / report concern