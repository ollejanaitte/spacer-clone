# 06 — CH/CP Identifier Canonicalization

> **Authority:** Phase 2.5-G (spec reconciliation)
> **Base:** Phase 2 `03_report_chapter_structure.md` §1-3, `chapter_matrix.csv`, `08_report_data_contract_boundary.md`, `reportModel.ts` scaffold.
> **Judge:** Apollo architecture (recorded).

## 1. Purpose

Reconcile the two chapter identifier spaces that coexist in the codebase and the Phase 2 spec: the **CH-*** scaffold (16 chapters, in `reportModel.ts`) vs the **CP-*** confirmation-report chapters (30 chapters, in `chapter_matrix.csv`). Freeze the **canonical** set for Phase 3 Report Model output.

## 2. CH-* (code scaffold, 16 chapters)

`REPORT_CHAPTER_REGISTRY` in `reportModel.ts:25-42`:

| # | id (CH-*) | title |
|---|-----------|-------|
| 1 | CH-COVER | 表紙・メタデータ |
| 2 | CH-DESIGN-COND | 設計条件 |
| 3 | CH-STRUCTURE | 構造概要 |
| 4 | CH-INPUTS | 入力値 |
| 5 | CH-SECTION | 主桁断面諸量 |
| 6 | CH-LOADS | 荷重条件 |
| 7 | CH-ANALYSIS-SETTINGS | 解析条件 |
| 8 | CH-REACTIONS | 支点反力 |
| 9 | CH-SHEAR | せん断力 |
| 10 | CH-MOMENT | 曲げモーメント |
| 11 | CH-DEFLECTION | たわみ |
| 12 | CH-DEMAND | 作用候補 |
| 13 | CH-QUANTITY | 数量 |
| 14 | CH-DRAWING-REF | 標準断面図参照 |
| 15 | CH-WARNINGS | 警告・未許可項目 |
| 16 | CH-AUDIT | 監査記録 |

`reportModel.ts:311-319` validates `chapters[i].id === REPORT_CHAPTER_REGISTRY[i].id` (order + count).

## 3. CP-* (canonical report chapters, 30 chapters)

`chapter_matrix.csv` (rows 2-31): `CP-01..CP-25` + `CP-30..CP-34`. These are the **canonical report chapter identifiers** used in traceability (`R-01..R-12`, data sources, CP-25 evidence).

## 4. CH-* → CP-* mapping (canonical)

Per Phase 2 `03_report_chapter_structure.md` §3:

| CH-* (scaffold) | CP-* (canonical report) | 備考 |
|---|---|---|
| CH-COVER (metadata subset) | CP-03 | reportId/generatedAt/checksum |
| CH-COVER (project subset) | CP-01 / CP-04 | CP-01 cover; CP-04 工事情報 |
| CH-DESIGN-COND | CP-06 | bridgeSystem + spanSystem |
| CH-STRUCTURE | CP-05 / CP-07 / CP-09 / CP-10 | bridge summary / spans / girders / supports (split) |
| CH-INPUTS | CP-07 / CP-09 / CP-10 / CP-12 | inputs mapped to span/member/material chapters |
| CH-SECTION | CP-13 | 主桁断面諸量 |
| CH-LOADS | CP-14 | 荷重条件 |
| — | CP-15 | 荷重組合せ (new, D-future) |
| — | CP-16 | 解析モデル (new, D-future) |
| CH-REACTIONS | CP-30 | (D-future) |
| CH-SHEAR | CP-31 | (D-future) |
| CH-MOMENT | CP-32 | (D-future) |
| CH-DEFLECTION | CP-33 | (D-future) |
| CH-DEMAND | CP-34 | (D-future) |
| CH-QUANTITY | CP-25 | 証跡・数量 (evidence) |
| CH-DRAWING-REF | CP-18 / CP-24 | 3D solids / standard-section ref / GOLD refs |
| CH-WARNINGS | CP-20 | 警告・エラー |
| CH-AUDIT | CP-25 | 監査記録 (evidence) |
| — | CP-02 / CP-08 / CP-11 / CP-17 / CP-19 / CP-21 / CP-22 / CP-23 | new/no-direct-source (purpose, alignment FORBIDDEN, cross-members, nodes/members, validation, persistence, authorization, not-implemented) |

## 5. Canonicalization decisions

1. **CP-* is the canonical chapter identifier space for the confirmation report.** Phase 3 Report Model must emit `chapter_id` values drawn from the `chapter_matrix.csv` CP-* set, **not** CH-*.
2. **CH-* is the legacy dev scaffold** (`reportModel.ts:25-42`, `REPORT_CHAPTER_REGISTRY`). It remains as internal code scaffolding for the dev-only HTML report; Phase 3 Report Model implementation will remap to CP-* (the chapter structure is already 1:1+split mapped above).
3. **Order invariant:** Phase 3 must preserve the CP-* ordering defined in `chapter_matrix.csv` (CP-01..25 then CP-30..34) for traceability; the existing `reportModel.ts:311-319` order-validation pattern is retained analogously for CP-*.
4. **value_kind canonical set** (reconfirmed): `input | stored | display | generated_geometry | analysis_result | design_check | adopted` (`08_report_data_contract_boundary.md` §3). `analysis_result`/`design_check`/`adopted` carry no values now (NOT_AVAILABLE / NOT_AUTHORIZED / fail-closed).
5. **authorizationStatus canonical set** (reconfirmed): `NOT_AUTHORIZED | UNVERIFIED | ADOPTED` (reportModel.ts:119 — `UNVERIFIED`; `08` §R-10/`output_permission_matrix.md` §1 — `NOT_AUTHORIZED`/`NOT_GRANTED`).
6. **Report status codes canonical** (reconfirmed): `NOT_AVAILABLE | NOT_IMPLEMENTED | NOT_AUTHORIZED | NOT_GRANTED | PROHIBITED | UNVERIFIED | UNADOPTED | UNKNOWN | STALE` (output_permission_matrix + 07_warning_and_status_message_spec).

## 6. Phase 3 implications

- Phase 3 Report Model: emit `chapter_id: CP-*` (from chapter_matrix.csv). Map each CH-SECTION/CH-REACTIONS/... to the corresponding CP-*.
- Maintain `reportModel.ts:312-319`-style chapter-order/count validation for the CP-* registry.
- Do **not** introduce new CH-* chapter IDs; any new chapter must enter `chapter_matrix.csv` via `DEC-PHA-xxxx`.

## 7. Status

- CH/CP: RECONFIRMED canonical (CP-* report IDs; CH-* dev scaffold). No code change.
- HEAD: febec8b (no code change).
