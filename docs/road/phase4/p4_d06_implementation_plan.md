# P4-D06 Implementation Plan — Reports and CSV

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — PLAN APPROVED by supervisor (2026-07-21)
**Authoritative scope:** [p4_d06_scope.md](p4_d06_scope.md)
**Extraction:** [p4_d06_official_spec_extraction.md](p4_d06_official_spec_extraction.md) (APPROVED)
**Baseline:** `206b81d2` (P4-D05 COMPLETE)
**Branch:** `feat/phase4-p4-d06-reports-csv`

---

## 1. Purpose

P4-D02..D04 の pure CSV/report builders を **統合 export パイプライン** に接続し、Preview / Formal Drawing から HTML 計算書と CSV をダウンロード可能にする。

**In scope:** `roadReport` / `roadCsvExport` / UI export controls / spec 追記 / D06-C01..C05 テスト。

**Out of scope:** PDF、schema bump、dual write、persistence（D07）、D08 final E2E gate。

---

## 2. Architecture summary

```text
LinerPreviewPage / LinerFormalDrawingWorkspacePage
  → LinerRoadExportControls
  → roadReportExport (orchestrator)
  → roadReportContext (draft → intermediate + P4 rows + diagnostics)
  → roadReport (HTML) + roadCsvExport (CSV bundle)
  → ldist/haunch/hosoReportExport (existing pure builders)
  → downloadTextFile
```

---

## 3. File inventory

### 3.1 New implementation

| Path | Role |
| --- | --- |
| `exports/roadReportContext.ts` | Context builder + export readiness gate |
| `exports/roadCsvExport.ts` | `grid_points.csv` + P4 CSV bundle |
| `exports/roadReport.ts` | HTML report assembler |
| `exports/roadReportExport.ts` | Public export API |
| `exports/downloadTextFile.ts` | Browser download helper |
| `components/LinerRoadExportControls.tsx` | Shared UI controls |

### 3.2 Modified

| Path | Change |
| --- | --- |
| `pages/LinerPreviewPage.tsx` | Export controls (D06-C05) |
| `pages/LinerFormalDrawingWorkspacePage.tsx` | Export controls (D06-C05) |
| `pages/LinerPreviewPage.test.tsx` | Export click test |
| `App.tsx` | Pass `projectName` |
| `i18n/ja.ts` | `liner.reportExport.*` |
| `styles.css` | Export control styles |
| `docs/road/output/report_output_spec.md` | P4 sections + CSV rules |

### 3.3 Tests / E2E

| Path | Gate |
| --- | --- |
| `exports/roadReportExport.test.ts` | D06-C01..C04 |
| `tests/e2e/p4-d06-reports-csv.spec.ts` | D06-C05 |

### 3.4 New docs

| Path | Role |
| --- | --- |
| `docs/road/phase4/p4_d06_scope.md` | AUTHORITATIVE scope |
| `docs/road/phase4/p4_d06_official_spec_extraction.md` | Spec extraction |
| `docs/road/phase4/p4_d06_implementation_plan.md` | This file |

---

## 4. Gate mapping

| Criterion | Implementation | Test |
| --- | --- | --- |
| D06-C01 | `roadReport.ts` section keys | `roadReportExport.test.ts` DOM |
| D06-C02 | `GRID_POINTS_CSV_COLUMNS` | `roadReportExport.test.ts` |
| D06-C03 | P4 CSV when rows present | `roadReportExport.test.ts` LDIST fixture |
| D06-C04 | `assessRoadExportReadiness` | error + stale revision tests |
| D06-C05 | `LinerRoadExportControls` on Preview + Formal Drawing | Vitest + E2E |

---

## 5. Verification commands

```bash
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run test -- src/liner/exports/roadReportExport.test.ts src/liner/pages/LinerPreviewPage.test.tsx
cd frontend && npm run test:regression
git diff --check
# E2E (when dev server available):
# cd frontend && npx playwright test tests/e2e/p4-d06-reports-csv.spec.ts
```

---

## 6. PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d06-reports-csv` |
| PR title | `feat(liner): implement P4-D06 reports and CSV export` |
