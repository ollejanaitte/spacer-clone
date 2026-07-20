# P4-D04 Implementation Plan — HOSO Equivalent

**Date:** 2026-07-21  
**Status:** AUTHORITATIVE / IMPLEMENTATION COMPLETE (2026-07-21) — PLAN APPROVED by supervisor 2026-07-21  
**Authoritative scope:** [p4_d04_scope.md](p4_d04_scope.md) (AUTHORITATIVE)  
**Extraction record:** [p4_d04_hoso_extraction_record.md](p4_d04_hoso_extraction_record.md) (APPROVED — D04-C01 satisfied; freezes S1–S10)  
**Pattern reference:** [p4_d03_implementation_plan.md](p4_d03_implementation_plan.md)  
**Baseline:** `ee067d8` (P4-D03 COMPLETE)  
**algorithmVersion:** `hoso-0.1.0`  
**Branch:** `feat/phase4-p4-d04-hoso-equivalent`

---

## 1. Purpose

P4-D04（HOSO Equivalent）の実装手順・ファイル分割・テスト・互換性を定義する。D03 `core/haunch/` を mirror し、5 タイプファミリ + `both_gradients` + review diagnostics を提供する。

**In scope:** contracts → validation → pure calculator (`core/hoso/`) → persistence → adapter/pipeline → utilities tab HOSO section（HAUNCH 直下）→ `hosoReportExport` → O1 fixtures（≥1/family + negative thickness）→ E2E smoke。

**Out of scope:** schema bump、結果キャッシュ、専用 extension key、CSV/HTML ダウンロード UI (D06)、確認図 (D05)、legacy migration 統合 (D07)、P4-E2E-03 最終ゲート (D08)。

---

## 2. Architecture summary

```text
LinerEditPage (utilities tab — LDIST + HAUNCH + HOSO)
  ↔ BuildIntermediateInput.hosoDefinitions?
  ↔ LinerDomainDraftVNext.hosoDefinitions[]
  ↔ domainDraftToRoadDesignDocument → hosoCapability + geometry v0.2.0
  ↔ buildIntermediateResult + crossfallResolution
  ↔ computeHosoResults [pure] → HosoResultRow[] + LINER_HOSO_* diagnostics
  ↔ buildHosoReportSection / buildHosoResultsCsv
```

**Thickness datum (S3):** \(t = z_{\text{pavement}} - z_{\text{ref}}\); \(z_{\text{ref}}\) = profile + crossfallResolution.

---

## 3. File inventory

### 3.1 New files

| Path | Role |
| --- | --- |
| `frontend/src/liner/core/hoso/types.ts` | `HOSO_ALGORITHM_VERSION`, compute I/O |
| `frontend/src/liner/core/hoso/diagnostics.ts` | `LINER_HOSO_*` codes |
| `frontend/src/liner/core/hoso/referenceResolution.ts` | \(z_{\text{ref}}\), crossfall hook |
| `frontend/src/liner/core/hoso/validateHosoDefinitions.ts` | Fail-closed validation |
| `frontend/src/liner/core/hoso/resolveHosoAlignmentBundles.ts` | Alignment bundle resolution |
| `frontend/src/liner/core/hoso/resolveHosoScope.ts` | Station/offset band scope |
| `frontend/src/liner/core/hoso/computeContext.ts` | Shared emit / interpolation |
| `frontend/src/liner/core/hoso/computeAuto.ts` | `auto_converge_pipeline` (S1) |
| `frontend/src/liner/core/hoso/computeLongitudinal.ts` | `longitudinal_only`, `both_gradients` |
| `frontend/src/liner/core/hoso/computeTransverse.ts` | `transverse_only` |
| `frontend/src/liner/core/hoso/computeTwoPoint.ts` | chord interpolation (S5) |
| `frontend/src/liner/core/hoso/computeThreePoint.ts` | affine plane + min-thickness review (S6/S9) |
| `frontend/src/liner/core/hoso/computeHosoResults.ts` | Orchestrator |
| `frontend/src/liner/core/hoso/index.ts` | Public exports |
| `frontend/src/liner/core/hoso/__tests__/**` | O1 fixtures + unit tests |
| `frontend/src/liner/exports/hosoReportExport.ts` | CSV/report builder |
| `frontend/src/liner/exports/hosoReportExport.test.ts` | Export tests |
| `frontend/src/liner/components/HosoDefinitionEditor.tsx` | Definition CRUD |
| `frontend/src/liner/components/HosoResultsPanel.tsx` | Results table |
| `frontend/src/liner/components/HosoDiagnosticsPanel.tsx` | Diagnostics |
| `frontend/src/liner/components/__tests__/HosoDefinitionEditor.test.tsx` | Component smoke |
| `frontend/tests/e2e/p4-d04-hoso.spec.ts` | E2E smoke |

### 3.2 Modified files

| Path | Change |
| --- | --- |
| `frontend/src/liner/schema/types.ts` | `HosoDefinitionDraft` discriminated union |
| `frontend/src/liner/core/pipeline/pipeline.ts` | `hosoDefinitions?` passthrough |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `hosoCapability` dynamic; round-trip |
| `frontend/src/liner/adapters/linerProjectDraft.ts` | `hosoDefinitions` round-trip |
| `frontend/src/liner/adapters/linerUiAdapter.ts` | HOSO CRUD helpers |
| `frontend/src/liner/schema/projectLinerMigration.ts` | Preserve `hosoDefinitions` |
| `frontend/src/liner/pages/LinerEditPage.tsx` | HOSO section below HAUNCH |
| `frontend/src/i18n/ja.ts` | `liner.hoso.*` |

---

## 4. Contracts

Five families + variants per extraction §5.2 / supervisor S1–S10. JIP raw type numbers not exposed.

```typescript
type HosoTypeFamily = "auto" | "longitudinal" | "transverse" | "two_point" | "three_point";
```

`hosoDefinitions?: HosoDefinitionDraft[]` on `LinerDomainDraftVNext`.

---

## 5. Pure calculation

| Family | Variant | MVP |
| --- | --- | --- |
| auto | `auto_converge_pipeline` | ✅ S1 |
| longitudinal | `longitudinal_only` | ✅ |
| longitudinal | `both_gradients` | ✅ S2/S4 |
| transverse | `transverse_only` | ✅ |
| two_point | `two_point_girder_end` | ✅ S5 |
| three_point | `three_point_non_collinear` | ✅ |

`HOSO_ALGORITHM_VERSION = "hoso-0.1.0"`.

---

## 6. O1 fixtures (D04-C03)

| Fixture | Family |
| --- | --- |
| `gc-hoso-auto-pipeline` | auto |
| `gc-hoso-longitudinal-linear` | longitudinal |
| `gc-hoso-longitudinal-both-gradients` | longitudinal |
| `gc-hoso-transverse-linear` | transverse |
| `gc-hoso-two-point-chord` | two_point |
| `gc-hoso-three-point-plane` | three_point |
| `gc-hoso-negative-thickness` | fail-closed (D04-C04) |

---

## 7. Export (D04-C06)

- Report key: `hosoResults`
- CSV: `hoso_results.csv`
- Columns: `definitionId`, `type`, `stationPhysicalDistance`, `offsetM`, `pavementThicknessM`, `pavementElevationM`
- `hasHosoErrors` blocks export

---

## 8. Implementation order

S1 types/diagnostics → S2 validation → S3 reference resolution → S4 per-family compute → S5 orchestrator + fixtures → S6 mapper/adapters → S7 export → S8 UI + ja.ts → S9 E2E smoke → S10 quality gates.

---

## 9. Completion gate traceability

| Gate | Section |
| --- | --- |
| D04-C01 | Extraction APPROVED |
| D04-C02 | §5 five families |
| D04-C03 | §6 O1 fixtures |
| D04-C04 | negative thickness test |
| D04-C05 | mapper round-trip |
| D04-C06 | UI + export builder |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-07-21 | Initial plan — PLAN APPROVED by supervisor 2026-07-21 |
| 2026-07-21 | IMPLEMENTATION COMPLETE — P4_D04_VERDICT: COMPLETE / DIFF_AUDIT APPROVED |
