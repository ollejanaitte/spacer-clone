# 06 — Output Permission Matrix

> **Authority:** Phase 2-F (specification freeze)
> **Base:** `02_report_purpose_and_classification.md`, `05_detailed_report_spec.md`, `chapter_matrix.csv`.

## 1. 分類 (16 classifications)

| 分類 | 意味 | 出力 | 警告 |
|------|------|------|------|
| ALLOWED | 出力可, 警告不要 | summary+detail | なし |
| ALLOWED_WITH_WARNING | 出力可だが未承認警告付き | summary+detail | UNVERIFIED/NOT_AUTHORIZED |
| SUMMARY_ONLY | summary のみ | summary | 警告付き |
| DETAIL_ONLY | detail のみ | detail | - |
| PLACEHOLDER_ONLY | プレースホルダのみ (NOT_AVAILABLE/NOT_IMPLEMENTED) | summary/detail | 警告付き |
| NOT_IMPLEMENTED | 未計算; NOT_IMPLEMENTED 表示 | detail (一覧のみ) | 警告 |
| NOT_AUTHORIZED | ゲート未承認; NOT_AUTHORIZED 表示 | detail | 禁止相当警告 |
| PROHIBITED | 出力禁止 | - | なし (出さない) |

> ■ **D-class numeric results (CP-3x) はすべて PROHIBITED**。`reportModel.ts:238,243,248,253` (NOT_AVAILABLE) / DS-09 cell (NOT_AUTHORIZED) が根拠 (U-01/U-06)。

## 2. 項目一覧 (output_permission_matrix.csv と対応)

| item_id | 項目 | データ分類 | 許可 | 警告 | 承認 | 根拠 |
|---------|------|-----------|------|------|------|------|
| O-01 | 工事名 / project id / name | stored | ALLOWED | - | NOT_GRANTED | project.project.id/name |
| O-02 | 橋梁概要 (bridgeLength/width/girderCount/depth) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | draft.* + reportModel.ts:184-188 |
| O-03 | 橋梁形式 (bridgeSystem/spanSystem) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | reportModel.ts:175 |
| O-04 | 径間数 (spans.length) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-07 |
| O-05 | 径間長 (spans[].length) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-07 |
| O-06 | 支点位置 (supports[].station) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-10 |
| O-07 | 支点形式 (abutment/pier) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-10 |
| O-08 | 主桁本数 (girderCount) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-09 |
| O-09 | 主桁座標 (girder offset / segment) | geometry | DETAIL_ONLY | UNVERIFIED | NOT_AUTHORIZED | solidGeometryParameters |
| O-10 | 横桁位置 (cross_beam station/spacing) | input+geometry | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-11 |
| O-11 | 材料入力値 (steelUnitWeight/rcUnitWeight) | input | ALLOWED_WITH_WARNING | PENDING/UNKNOWN | NOT_AUTHORIZED | CP-12 adoptionStatus |
| O-12 | 断面入力値 (flange/web/deck thk) | input | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-13 |
| O-13 | 荷重入力値 | input | PLACEHOLDER_ONLY | NOT_AVAILABLE | NOT_AUTHORIZED | CP-14 (GOLD-AN placeholder) |
| O-14 | 3Dモデル (solids) | geometry | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-18 |
| O-15 | STL出力状態 (bbox/digest/triangles) | geometry | DETAIL_ONLY | UNVERIFIED | NOT_AUTHORIZED | CP-18 manifest |
| O-16 | validation結果 | validation | ALLOWED_WITH_WARNING | UNVERIFIED | NOT_AUTHORIZED | CP-19 |
| O-17 | STALE状態 | state | ALLOWED_WITH_WARNING | STALE note if stale | NOT_AUTHORIZED | CP-21 |
| O-18 | 設計者名 | - | NOT_IMPLEMENTED | - | - | project has no author field |
| O-19 | 解析結果 (reactions/shear/moment/deflection) | analysis_result | PROHIBITED | - | NOT_AUTHORIZED | CP-30-34 (NOT_AVAILABLE, U-01) |
| O-20 | 断面力 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 cells |
| O-21 | 反力 | design_check | PROHIBITED | - | NOT_AUTHORIZED | CP-30 (NOT_AVAILABLE) |
| O-22 | 応力度 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 |
| O-23 | 許容値 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 |
| O-24 | 照査比 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 |
| O-25 | 合否判定 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 |
| O-26 | 疲労照査 | design_check | PROHIBITED (OUT_OF_SCOPE) | - | NOT_AUTHORIZED | DS-09 fatigue OUT_OF_SCOPE |
| O-27 | たわみ | design_check | PROHIBITED | - | NOT_AUTHORIZED | CP-33 (NOT_AVAILABLE) |
| O-28 | キャンバー (camber) | input | NOT_IMPLEMENTED | - | - | not modeled |
| O-29 | 鋼重 (QTY-MG-W) | quantity | ALLOWED_WITH_WARNING | UNVERIFIED/USER_PROVIDED_UNVERIFIED | NOT_AUTHORIZED | CP-25 (reportModelToQuantityCsv) |
| O-30 | 設計成立判定 | design_check | PROHIBITED | - | NOT_AUTHORIZED | DS-09 (no check engine) |

## 3. 警告要否 (summary header / footer)

summary/detail 冒頭に必ず:
```
UNVERIFIED DEVELOPMENT OUTPUT / NOT FOR DESIGN, FABRICATION OR CONSTRUCTION / USER REVIEW REQUIRED / NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
(allowlist: O-01 工事名, O-18 設計者名 は NOT_IMPLEMENTED 表示。O-19..O-30 は PROHIBITED →出力しない。)

## 4. 状態

- HEAD: aae5108. local == origin/main. clean.
- 本節確定: 30 項目の出力許可方針。PROHIBITED は O-19, O-20, O-21, O-22, O-23, O-24, O-25, O-26, O-27, O-30。
