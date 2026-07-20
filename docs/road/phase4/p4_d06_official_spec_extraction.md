# P4-D06 Official Spec Extraction — Report Output

**Date:** 2026-07-21
**Status:** APPROVED — supervisor EXTRACTION gate (2026-07-21)

**Scope parent:** [p4_d06_scope.md](p4_d06_scope.md)
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)

---

## 1. Purpose

[`report_output_spec.md`](../output/report_output_spec.md) と [phase4_design_document.md](phase4_design_document.md) P4-D06 節から、HTML/CSV export の **semantic authority** を抽出し、実装・ゲート証跡の正本とする。

---

## 2. Source documents

| Source | Use |
| --- | --- |
| [report_output_spec.md](../output/report_output_spec.md) | Section keys, column schemas（P4 拡張含む） |
| [phase4_design_document.md](phase4_design_document.md) P4-D06 | Required sections, CSV files, UI, fail-closed |
| [unit_and_precision_policy.md](../design/unit_and_precision_policy.md) | Numeric formatting |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D06-C01..C05 |

---

## 3. HTML section adoption

| Section key | Phase | Source | P4-D06 |
| --- | --- | --- | --- |
| `projectInfo` | Existing | metadata + `computedAt`, `sourceRevision` | **採用** |
| `alignmentSegments` | Existing | `horizontal.segments` | **採用** |
| `stationCoordinates` | Existing | `stations.entries` + samples | **採用** |
| `profileElevations` | Existing | `vertical.sampledPoints` | **採用** |
| `gridPoints` | Existing | `grid.points` | **採用** |
| `ldistResults` | **P4** | P4-D02 rows | **採用**（data present 時） |
| `haunchResults` | **P4** | P4-D03 rows | **採用**（data present 時） |
| `hosoResults` | **P4** | P4-D04 rows | **採用**（data present 時） |
| `diagnostics` | Existing + P4 | merged diagnostics | **採用**（non-empty 時） |
| `frameMappingTrace` | Existing | liner trace | **非採用**（P4-D06 out of scope） |

---

## 4. CSV file adoption

| File | Columns authority | P4-D06 |
| --- | --- | --- |
| `grid_points.csv` | `gridPoints` table（English keys） | **必須** |
| `ldist_results.csv` | `LDIST_RESULTS_CSV_COLUMNS` | rows あり時 |
| `haunch_results.csv` | `HAUNCH_RESULTS_CSV_COLUMNS` | rows あり時 |
| `hoso_results.csv` | `HOSO_RESULTS_CSV_COLUMNS` | rows あり時 |

---

## 5. Export rules（正本）

| Rule | Authority |
| --- | --- |
| English keys in CSV / HTML table headers | report_output_spec §2 |
| i18n labels at UI render only | report_output_spec assumptions |
| Fail-closed on error-level diagnostics | phase4_design_document P4-D06, D06-C04 |
| Fail-closed on stale P4 `sourceRevision` | phase4_completion_gate D06-C04 |
| No re-sampling beyond intermediate arrays | phase4_design_document P4-D06 |
| MVP: HTML + CSV only（PDF post-MVP） | report_output_spec open questions |

---

## 6. UI placement

| Surface | Minimum | P4-D06 |
| --- | --- | --- |
| Preview | export control | **採用** |
| Formal Drawing workspace | export control | **採用** |
| Setup / Review tab | — | **非採用** |

---

## 7. Filename patterns

```text
{projectName}_liner_report_{date}.html
{projectName}_liner_grid_{date}.csv
{projectName}_ldist_results_{date}.csv
{projectName}_haunch_results_{date}.csv
{projectName}_hoso_results_{date}.csv
```

---

## 8. Gate mapping

| Criterion | Evidence |
| --- | --- |
| D06-C01 | `roadReportExport.test.ts` DOM section keys |
| D06-C02 | `GRID_POINTS_CSV_COLUMNS` Vitest |
| D06-C03 | `ldist_results.csv` when LDIST fixture data present |
| D06-C04 | error diagnostics + stale revision unit tests |
| D06-C05 | Preview + Formal Drawing export buttons; E2E click |
