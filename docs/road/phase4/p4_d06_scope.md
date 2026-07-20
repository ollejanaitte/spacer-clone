# P4-D06 Scope — Reports and CSV

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — `P4_D06_SCOPE_VERDICT: APPROVED` (2026-07-21, supervisor message)

**Extraction record:** [p4_d06_official_spec_extraction.md](p4_d06_official_spec_extraction.md) — **APPROVED** (EXTRACTION gate)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)
**Pattern reference:** [p4_d05_scope.md](p4_d05_scope.md)
**P4-D05 baseline:** `206b81d2` — Review Diagrams COMPLETE (P4-D05)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D06** |
| **正式名称** | **Reports and CSV**（計算書・CSV 出力） |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 6 実装ステップ。中間結果と P4 計算配列から **HTML 計算書** と **CSV** を統合出力する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D02..D04 | LDIST / HAUNCH / HOSO pure builders（本ステップで統合） |
| P4-D05 | Formal Drawing / Preview UI 導線（export 配置先） |
| **P4-D06** | **Reports and CSV（本スコープ）** |
| P4-D07 | Persistence / Legacy / Migration |
| P4-D08 | E2E and Final Verification |

---

## 2. 目的

canonical intermediate results + P4 result arrays から、拡張 [`report_output_spec.md`](../output/report_output_spec.md) に準拠した **HTML 計算書** と **CSV ダウンロード** を提供する。

成功基準（正本 completion gate D06-C01..C05）:

| ID | 要点 |
| --- | --- |
| D06-C01 | HTML report に P4 拡張セクション（ldist/haunch/hoso/diagnostics） |
| D06-C02 | `grid_points.csv` English keys |
| D06-C03 | P4 CSV files when data present |
| D06-C04 | error-level diagnostics で fail-closed |
| D06-C05 | Preview および/または Formal Drawing に export 操作 |

---

## 3. 対象（In scope）

### 3.1 統合 export パイプライン

| 項目 | 方針 |
| --- | --- |
| `roadReport.ts` | HTML 計算書 assembler |
| `roadCsvExport.ts` | multi-file CSV bundler |
| `roadReportContext.ts` | draft → intermediate + P4 rows + merged diagnostics |
| 既存 builders | `ldistReportExport.ts`, `haunchReportExport.ts`, `hosoReportExport.ts` を wire |

### 3.2 HTML セクション

既存 + P4: `projectInfo`, `alignmentSegments`, `stationCoordinates`, `profileElevations`, `gridPoints`, `ldistResults`, `haunchResults`, `hosoResults`, `diagnostics`

### 3.3 CSV ファイル

| File | 条件 |
| --- | --- |
| `grid_points.csv` | 常時（grid あり） |
| `ldist_results.csv` | LDIST rows あり |
| `haunch_results.csv` | HAUNCH rows あり |
| `hoso_results.csv` | HOSO rows あり |

### 3.4 UI

| 入口 | 操作 |
| --- | --- |
| `LinerPreviewPage` | HTML / CSV export |
| `LinerFormalDrawingWorkspacePage` | HTML / CSV export |

### 3.5 検証

- `roadReportExport.test.ts` — D06-C01..C04
- `LinerPreviewPage.test.tsx` — D06-C05 click
- `tests/e2e/p4-d06-reports-csv.spec.ts` — E2E smoke（feasible 時）

---

## 4. 非対象（Out of scope）

| 項目 | 理由 |
| --- | --- |
| PDF 生成 | post-MVP（report spec） |
| 中間配列以外の再サンプリング | 凍結ポリシー |
| `schemaVersion` bump | 別承認まで禁止 |
| dual write / persistence 変更 | P4-D07 |
| Playwright 最終ゲート一式 | P4-D08 |

---

## 5. 依存関係

| 上流 | 理由 |
| --- | --- |
| P4-D02 | `ldistResults` / `ldist_results.csv` |
| P4-D03 | `haunchResults` / `haunch_results.csv` |
| P4-D04 | `hosoResults` / `hoso_results.csv` |
| P4-D05 (soft) | export 配置先 UI |

---

## 6. Gate verdict target

**COMPLETE 候補条件:** D06-C01..C05 充足、typecheck / lint / build / focused tests / regression 緑、`git diff --check` クリーン。
