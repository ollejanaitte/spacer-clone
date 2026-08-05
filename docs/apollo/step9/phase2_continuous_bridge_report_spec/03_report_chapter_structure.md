# 03 — Report Chapter Structure

> **Authority:** Phase 2-C (specification freeze)
> **Base:** Phase 1 `06_report_data_source_map.md` (16-chapter ReportModel scaffold), `05_current_output_capability.md`, `08_gap_analysis.md`.

## 1. 章ID規則

- `CP-nn` = Confirmation report chapter (A/B/C class). `nn` は 25 candidate の順序 (1-25)。
- `CP-3x` = Future numeric-design-result chapter (D class)。**現時点では出力禁止 / NOT_IMPLEMENTED**。
- Phase 1 scaffold `CH-*` → Phase 2 `CP-*` の対応は `chapter_matrix.csv` および §3 に記載。

## 2. 決定章構成 (25 candidate + future numeric)

| No. | chapter_id | 章名 | class | current_output | サマリー | 詳細 | 備考 |
|-----|-----------|------|-------|----------------|----------|------|------|
| 1 | CP-01 | 表紙 | A | PRODUCIBLE | ○ | ○ | CH-COVER |
| 2 | CP-02 | 目的・適用範囲 | A | PRODUCIBLE | ○ | ○ | 本書分類(02) |
| 3 | CP-03 | 出力日時・バージョン | A | PRODUCIBLE | ○ | ○ | reportId/generatedAt/checksum |
| 4 | CP-04 | 工事情報 | B | PRODUCIBLE | ○ | ○ | project.id/name |
| 5 | CP-05 | 橋梁概要 | B | PRODUCIBLE | ○ | ○ | bridgeLength/width/girderCount |
| 6 | CP-06 | 橋梁形式 | B | PRODUCIBLE | ○ | ○ | bridgeSystem + spanSystem |
| 7 | CP-07 | 径間構成 | B | PRODUCIBLE | ○ | ○ | spans/supports/roles (CONTINUOUS 2-5) |
| 8 | CP-08 | 線形条件 | A | NOT_IMPLEMENTED | × | × | curve/skew は unsupportedScope(E) |
| 9 | CP-09 | 主桁配置 | B | PRODUCIBLE | ○ | ○ | girder layout |
| 10 | CP-10 | 支点・橋脚・橋台 | B | PRODUCIBLE | ○ | ○ | support role/station |
| 11 | CP-11 | 横桁・対傾構 | C | PRODUCIBLE | ○ | ○ | cross_beam/bracing |
| 12 | CP-12 | 材料条件 | B | PRODUCIBLE | ○ | ○ | unitWeight + adoptionStatus (PENDING/UNKNOWN) |
| 13 | CP-13 | 断面条件 | B | CONTINUOUS_NOT_AVAILABLE / SIMPLE_UNVERIFIED | △(simple only) | △ | U-03 spanLength gate |
| 14 | CP-14 | 荷重条件 | B | PARTIAL (GOLD-AN placeholder) | ○(placeholder) | ○ | project.loadCases count only |
| 15 | CP-15 | 荷重組合せ | D(future) | NOT_IMPLEMENTED | × | × | U-01 |
| 16 | CP-16 | 解析モデル | D(future) | DEV_NOTE only | × | △ | simple-span idealization (U-02) |
| 17 | CP-17 | 節点・部材構成 | C | PRODUCIBLE | × | ○ | SDM entity list |
| 18 | CP-18 | 3Dモデル確認 | C | PRODUCIBLE | ○ | ○ | solids + STL manifest |
| 19 | CP-19 | 入力検証結果 | B | PRODUCIBLE | ○ | ○ | validateBridgeStructureInputDraft |
| 20 | CP-20 | 警告・エラー | A | PRODUCIBLE | ○ | ○ | warnings/diagnostics |
| 21 | CP-21 | 保存・再読込状態 | B | PRODUCIBLE | ○ | ○ | generatedAt/STALE |
| 22 | CP-22 | 数値設計承認状態 | A | PRODUCIBLE | ○ | ○ | DS-09 NOT_AUTHORIZED |
| 23 | CP-23 | 未実装項目 | A | PRODUCIBLE | ○ | ○ | U-01..U-06 list |
| 24 | CP-24 | 参考情報 | A | PRODUCIBLE | × | ○ | GOLD-* refs |
| 25 | CP-25 | 証跡・データ出典 | A | PRODUCIBLE | × | ○ | source_path/checksum/revision |
| - | CP-30 | 支点反力 | D(future) | NOT_AVAILABLE | × | × | U-01 |
| - | CP-31 | せん断力 | D(future) | NOT_AVAILABLE | × | × | U-01 |
| - | CP-32 | 曲げモーメント | D(future) | NOT_AVAILABLE | × | × | U-01 |
| - | CP-33 | たわみ | D(future) | NOT_AVAILABLE | × | × | U-01 |
| - | CP-34 | 作用候補・照査 | D(future) | NOT_AUTHORIZED | × | × | U-01 |

> ■ **原則:** D-class (CP-15/CP-16/CP-3x) は**出力禁止 (NOT_IMPLEMENTED/NOT_AVAILABLE)**。実装は削除せず未来章として明示 (§7 原則)。CP-08/CP-15/CP-16 は `unsupportedScope`/未実装のため **FORBIDDEN** 扱い。

## 3. Phase 1 scaffold CH-* → Phase 2 CP-* mapping

| Phase 1 CH-* | Phase 2 CP-* | 状態 |
|--------------|--------------|------|
| CH-COVER | CP-01 | mapped |
| (purpose/classification) | CP-02 | new (from 02) |
| CH-COVER (metadata) | CP-03 | mapped |
| CH-COVER/STRUCTURE (project) | CP-04/CP-05 | mapped |
| CH-DESIGN-COND (bridgeSystem) | CP-06 | mapped |
| CH-STRUCTURE/INPUTS | CP-05/CP-07/CP-09/CP-10 | mapped |
| CH-INPUTS (materials) | CP-12 | mapped |
| CH-SECTION | CP-13 | mapped (NOT_AVAILABLE for CONTINUOUS) |
| CH-LOADS | CP-14 | mapped (placeholder) |
| (load combos) | CP-15 | new (future) |
| (analysis model note) | CP-16 | new (dev note) |
| CH-REACTIONS | CP-30 | mapped (NOT_AVAILABLE) |
| CH-SHEAR | CP-31 | mapped (NOT_AVAILABLE) |
| CH-MOMENT | CP-32 | mapped (NOT_AVAILABLE) |
| CH-DEFLECTION | CP-33 | mapped (NOT_AVAILABLE) |
| CH-DEMAND | CP-34 | mapped (NOT_AUTHORIZED) |
| CH-QUANTITY | CP-25? / separate | quantity under CP-25 evidence (detail) |
| CH-DRAWING-REF | CP-18 / CP-24 | mapped |
| CH-WARNINGS | CP-20 | mapped |
| CH-AUDIT | CP-25 | mapped |

> ■ **確認:** Phase 1 `REPORT_CHAPTER_REGISTRY` (16章) は開発用 scaffold。Phase 2 はこれを A/B/C confirmation 用の CP-* にリベースし、D-class numeric は CP-15/16/3x として未来章に分離する。実装時 (Phase 3) は CP-id を新規 Report Model の章キーとする。

## 4. 各章の定義フィールド (chapter_matrix.csv で凍結)

各章は `chapter_matrix.csv` で以下 16 フィールドで定義する:

`chapter_id, chapter_name_en, chapter_name_ja, classification, required_optional_forbidden, summary_ok, detail_ok, current_output, data_source, value_kind, numeric_or_nonnumeric, authorization_status, empty_data_behavior, stale_behavior, not_authorized_behavior, future_expansion, basis`

## 5. 特記事項

- CP-08 (線形条件): curve/skew は `artifactBundle.ts:235 unsupportedScope` に含まれるため **FORBIDDEN**。直線単純段差のみサポート。
- CP-13 (断面): `reportModel.ts:119-148` の `spanLength !== null` ゲートにより CONTINUOUS は `NOT_AVAILABLE` (U-03)。SIMPLE_SINGLE は UNVERIFIED。
- CP-14 (荷重): `reportModel.ts:222-223` は GOLD-AN placeholder + `project.loadCases?.length` count。**実荷重ケースは未表示**。
- CP-16 (解析モデル): `appurtenanceHaunchAnalysisAdapter.ts:385` の simple-span idealization 仮定を dev note としてのみ記載。
- CP-23 (未実装項目): 常に出力対象。U-01..U-06 を列挙 (08_gap_analysis.md §5)。
- CP-25 (証跡): `source_path`, `inputChecksum`, `resultChecksum`, `generatedAt`, `appCommitSha`, `schemaVersion` (reportModel.ts:301-306; quantityModel checksum)。

## 6. 状態

- HEAD: b4dbeea. local == origin/main. clean.
- 本節確定: 25 candidate + 5 future D-class (CP-30..34) の章構成。次節 `chapter_matrix.csv` で 16 フィールド凍結。
