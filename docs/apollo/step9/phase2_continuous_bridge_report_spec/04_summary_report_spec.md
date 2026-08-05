# 04 — Summary Report Specification

> **Authority:** Phase 2-D (specification freeze)
> **Base:** `02_report_purpose_and_classification.md`, `03_report_chapter_structure.md`, `chapter_matrix.csv`, Phase 1 `05_current_output_capability.md`.

## 1. サマリー版の目的

短時間で **入力条件・構造構成・警告状態・数値未承認状態** を確認できる。1 ページ（将来 2 ページ）の概略。

- 利用者: 設計者 / 監査者 / Phase 3 実装担者
- 確認対象: (B) 入力値整合, (C) SDM/3D 生成状態, (A) 警告/未承認, (A) STALE 状態
- **保証しない**: 数値設計の正確性・照査合否・承認

## 2. サマリー項目 (chapter_matrix.csv からの selection)

| 表示順 | 項目 | chapter_id | データソース | 値の種別 |
|--------|------|-----------|--------------|----------|
| 1 | 表紙 (タイトル/分類/水印) | CP-01 | project.project + CP-02 classification | non-numeric |
| 2 | 帳票区分 (A/B/C/D/E) | CP-02 | 02_report_purpose_and_classification.md | non-numeric |
| 3 | 生成情報 (日時/版/checksum) | CP-03 | reportId/generatedAt/inputChecksum | non-numeric |
| 4 | 工事情報 (プロジェクトID/名) | CP-04 | project.project.id/name | non-numeric |
| 5 | 橋梁概要 (.bridgeLength/.width/.girderCount/.depth) | CP-05 | draft.bridgeLength/width/girderCount/girderDepth | non-numeric |
| 6 | 橋梁形式 (bridgeSystem + spanSystem) | CP-06 | draft.bridgeSystem + BSDD.phase1ScopeAssertion.spanSystem | non-numeric |
| 7 | 径間構成 (span count / span lengths / support count) | CP-07 | draft.spans + draft.supports | non-numeric |
| 8 | 主桁配置 (girderCount x spacing x depth) | CP-09 | draft.girderCount/girderSpacing | non-numeric |
| 9 | 支点構成 (abutment x2 / pier x(n-1)) | CP-10 | draft.supports (role/station) | non-numeric |
| 10 | 横桁配置概要 (count / spacing) | CP-11 | SDM crossBeams + draft.crossBeamSpacing | non-numeric |
| 11 | 3D モデル存在状態 (solids count) | CP-18 | solidGeometryParameters | geometry |
| 12 | validation 結果サマリー (OK/FAIL + 件数) | CP-19 | validateBridgeStructureInputDraft + validateBridgeLayoutContract | non-numeric |
| 13 | STALE 状態 | CP-21 | isBridgeStructureGenerationCurrent | non-numeric |
| 14 | 数値設計承認状態 (NOT_AUTHORIZED 一覧) | CP-22 | DS-09 cells / numericAuthorization | non-numeric |
| 15 | 未実装項目 (U-01..U-06 件数) | CP-23 | 08_gap_analysis.md §4 | non-numeric |
| 16 | 警告文 (必須 watermark) | CP-20 | warnings[] | message |
| 17 | データ出典概要 | CP-25 | source_path/checksum | non-numeric |

> ■ **CP-08/CP-13/CP-14/CP-15/CP-16/CP-30..CP-34 はサマリーに含めない** (curve/skew FORBIDDEN; section CONTINUOUS NOT_AVAILABLE; loads placeholder; numeric results NOT_AVAILABLE)。

## 4. ページ数・レイアウト目安

| 項目 | 値 | 根拠 |
|------|----|------|
| ページ数 (HTML) | 1 ページ (A4/Letter, landscape 可) | summary = single sheet |
| ページ数 (将来 PDF) | 1 ページ (将来 2 ページ許容) | §6 layout constraint |
| 表の最大数 | 3 表 (工事/橋梁概要 + 径間 + 支点) | items 4-9 |
| 図の最大数 | 1 図 (3D view / solids existence) | item 11 |
| 1ページ収容行数 | 40 行 (表 + テキスト混在) | print overflow policy §6 |

## 5. 表/図対象

- **表1** 橋梁概要 + 工事情報 (items 4-6)
- **表2** 径間構成 (item 7) — spans/supports station/role 一覧
- **表3** 主桁/支点/横桁サマリー (items 8-10) + 3D solids count
- **図1** 3D model サムネイル or solids existence (item 11)

> ■ `renderReportModelHtml` は現段階で `model.solidGeometryParameters` を直接参照しない (Phase 1 `reportModel.ts` 参照範囲: chapters only)。3D サムネイルは **将来実装 (Phase 3)**。サマリーでは「solids existence = YES/NO + count」で代替表示。

## 6. 必須警告

サマリー冒頭/フッターに **必ず** 以下表示 (CP-20/CP-01 から):

```
UNVERIFIED DEVELOPMENT OUTPUT
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
USER REVIEW REQUIRED
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED
```

> これらは `artifactBundle.ts:157-162` / `reportModel.ts:150-156` と一致。フォントサイズ 10pt, 太字, 水印の半透明オーバーレイ。

## 7. 空データ時表示

| 状況 | 表示 |
|------|------|
| STALE (未再生成) | `STALE` バッジ + `再生成してください` (CP-21) |
| BSDD 未生成 | `3Dモデル: NOT_AVAILABLE` + `BSDD未生成` |
| validation 不一致 | `validation: 1件の不整合 (詳細はCP-19)` |
| CP-13 section NOT_AVAILABLE (CONTINUOUS) | `断面: NOT_AVAILABLE` (CP-13 未実装ギャップ) |
| 数値結果なし | `解析結果: NOT_AVAILABLE` (CP-30..34 未実装) |

## 8. エラー時出力禁止

- validation FAIL 時: サマリー自体は出力しない。**エラー箇所のみ CP-20 警告で代替**。
- CP-08 (curve/skew), CP-15 (load combos), CP-16 (analysis model), CP-3x (numeric results): これらを**サマリー・詳細いずれにも出力しない** (NOT_IMPLEMENTED / NOT_AVAILABLE)。

## 9. 印刷時見切れ防止 (layout constraint)

- 1 ページに **40 行** 以上出力しない (表ヘッダ繰り返し可)。
- 警告文はヘッダ固定 (print 時毎ページ重複表示)。
- 将来 PDF (A4/Letter): 右余白 15mm 確保 / 表は横スクロール禁止。

## 10. 将来 PDF 化を前提としたレイアウト制約 (Phase 3/6 参照)

- フォント: IPAmzp (sans) / sans-serif fallback — 日本語 11pt / 欧文 10pt。
- ページヘッダ: `連続橋入力条件・構造モデル確認書 | p.{n}`。
- フッター: `UNVERIFIED DEVELOPMENT OUTPUT | generatedAt | inputChecksum`.
- table/CSS print media query で `@page { size: A4 landscape }`。

## 11. 変更管理

- サマリー項目は `chapter_matrix.csv` で凍結。列追加は Phase 2 内で完結。
- `value_kind` ラベル (input/stored/display/generated_geometry/analysis_result/design_check/adopted) は `CP-02..CP-25` すべてに適用。

## 12. 状態

- HEAD: 34573e5. local == origin/main. clean.
- 本節確定: 17 項目サマリー, 3 表 + 1 図, 必須 watermark, 空データ/エラー/印刷 policy。
