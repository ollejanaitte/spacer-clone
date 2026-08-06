# 08 — Units, Precision & Display Contract

> **Authority:** Phase 3-H (specification freeze)
> **Base:** Phase 2 `08_report_data_contract_boundary.md` §Principles 2/3/11, `03_report_chapter_structure.md` §5, `chapter_matrix.csv` (units), `reportModel.ts:85-93` (display contract); Phase 2 `07_warning_and_status_message_spec.md` (locale).
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Freeze the separation between **raw value** and **display value**, and the per-unit **precision/rounding** contract, so Phase 4 renders continuous-girder data without re-deriving or re-rounding design inputs.

## 2. Value model (per value-bearing entity, R-13)

| role | field | type | notes |
|------|-------|------|-------|
| raw | `value` | `number \| string \| boolean \| enum \| null` | source-faithful; no unit conversion here |
| display | `display` | string | locale-aware formatted view of `value`; `null→"NOT_AVAILABLE"` |
| unit | `unit` | string | canonical symbol; `none` for dimensionless |

- `reportModel.ts:85-93` `row()`: `value === null/undefined/""` → `"NOT_AVAILABLE"`; `number → String(value)` (no rounding, no unit conversion). Phase 4 must preserve this exact convention.
- Raw and display **must not share a field** (no `value` that is sometimes a rounded string).

## 3. Canonical unit set (continuous girder)

From `chapter_matrix.csv` / `sectionProperties.ts` / `reportModel.ts`:

| domain quantity | unit | symbol | source |
|-----------------|------|--------|--------|
| bridgeLength, width, girderDepth, span, station, offset, spacing | meter | `m` | reportModel.ts:184-188 |
| totalArea | square meter | `m2` | sectionProperties.ts:28 |
| secondMomentOfArea | quartic meter | `m4` | sectionProperties.ts:32 |
| sectionModulusTop/Bottom | cubic meter | `m3` | sectionProperties.ts:33-34 |
| steelVolumePerGirder | cubic meter | `m3` | sectionProperties.ts:107 (uses bridgeLength) |
| centroidFromBottom, webHeight | meter | `m` | sectionProperties.ts:29,24 |
| reactions | kilonewton | `kN` | reportModel.ts:238 (NOT_AVAILABLE) |
| moment | kN·m | `kN·m` | reportModel.ts:248 (NOT_AVAILABLE) |
| shear | kilonewton | `kN` | reportModel.ts:243 (NOT_AVAILABLE) |
| deflection | meter | `m` | reportModel.ts:253 (NOT_AVAILABLE) |
| steelUnitWeight, rcUnitWeight | kN/m3 | `kN/m3` | reportModel.ts:199-200 |
| counts (spanCount, girderCount, cross-member count, stifenfer, brace) | count | `count` | reportModel.ts:186 |
| angles/degrees | degree | `deg` (90 only, PHASE1_SKEW_DEGREES_REQUIRED) | phase1ScopeGuard.ts:19 |

> ■ **Unit conversion is NOT the Report Model's job.** If a future numeric chapter (CP-3x) needs `kN·m` from `kN`·`m`, the **analysis layer** performs conversion; the Report Model only **carries** the unit-bearing value and its source unit.

## 4. Precision & rounding (display only; no design impact)

| quantity class | precision | rounding rule | significant digits | basis |
|----------------|-----------|---------------|--------------------|-------|
| geometry (m) | 3 decimals | round-half-up | ≥4 | reportModel display convention |
| area (m2) | 4 decimals | round-half-up | ≥4 | sectionProperties precision |
| inertia (m4) | 6 decimals | round-half-up | ≥4 | sectionProperties precision |
| modulus (m3) | 4 decimals | round-half-up | ≥4 | sectionProperties precision |
| volume (m3) | 4 decimals | round-half-up | ≥4 | sectionProperties precision |
| force (kN) | 2 decimals | round-half-up | ≥4 | reserved for CP-3x |
| moment (kN·m) | 2 decimals | round-half-up | ≥4 | reserved for CP-3x |
| count | integer | none | n/a | n/a |
| unit weight (kN/m3) | 3 decimals | round-half-up | ≥4 | reportModel.ts:199-200 |

- **Principle:** display rounding never alters a design decision; raw value preserved (pre-rounded) for downstream/audit. Phase 4 must retain both `value` (raw) and `display` (rounded).
- **Significant digits:** ≥4 for all engineered quantities (no <4 truncation).
- **CP-3x numeric display** (future, currently PROHIBITED): defined here so Phase 4/5 can adopt without re-specifying.

## 5. Locale & formatting

- `locale: "ja-JP" | "en"` (future). Number grouping: `ja-JP` = 3-digit `，`? No — use locale-aware `Intl.NumberFormat`-equivalent grouping (3-digit groups); decimal separator locale-aware (`,/`en; `.`/ja-JP per JS `Intl` default). Phase 4 must not hardcode separators.
- Units and values joined as `<value><unit>` only in `display`, never in `value`.
- Unitless/dimensionless fields: `unit: "none"`.

## 6. Edge cases

| case | code | display | unit | rule |
|------|------|---------|------|------|
| null | MISSING | "NOT_AVAILABLE" | n/a | `row()` rule; no zero-fill |
| unit unknown | INVALID/UNKNOWN | "UNKNOWN_UNIT" or value preserved | "unknown" | never guess unit |
| legacy unit (old project) | LEGACY_DATA | preserve + tag | legacy symbol | never reinterpret as SI silently; carry `legacyUnit` |
| dimensionless | n/a | value | "none" | no unit appended |
| prohibited value | PROHIBITED | (absent) | n/a | not emitted |

## 7. Principles (Phase 4 must enforce)

1. No automatic unit conversion inside Report Model.
2. No raw/display field mixing.
3. Preserve pre-rounded raw value; rounding only for display.
4. Rounding must not change design decisions.
5. SI assumed with documented evidence (this table); deviations tagged.
6. Unknown unit → `UNKNOWN_UNIT`, never assumed SI silently.
7. Legacy units carried + tagged, never silently reinterpreted.
8. Locale-aware formatting; no hardcoded separators.

## 8. Status

- Units/precision/display contract: FROZEN.
- HEAD: 7e0a5a4 (no code change).
