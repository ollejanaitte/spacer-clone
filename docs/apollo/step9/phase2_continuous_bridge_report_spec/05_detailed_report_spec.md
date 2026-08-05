# 05 — Detailed Report Specification

> **Authority:** Phase 2-E (specification freeze)
> **Base:** `04_summary_report_spec.md`, `03_report_chapter_structure.md`, `chapter_matrix.csv`.

## 1. 詳細版の目的

サマリー版の**すべて**を含み、さらに**各径間・支点・部材の詳細・証跡**を追跡可能な形式で確認できる。将来の数値設計計算書 (D) への章 ID 互換を保つ。

- 利用者: 監査者 / Phase 3 Report Model 実装担者 / 設計者（不具合調査）
- **保証しない**: 数値設計の正確性・照査合否・承認

## 2. 含む項目 (summary + detail layers)

### 2-1. summary レイヤ (04 項目 1-17 すべて)

`04_summary_report_spec.md` §2 の 17 項目をそのまま含む。

### 2-2. detail レイヤ (追加)

| 表示順 | 項目 | chapter_id | データソース | 値の種別 |
|--------|------|-----------|--------------|----------|
| D1 | 各径間詳細 (span id / length / station range) | CP-07 | draft.spans | non-numeric |
| D2 | 支点詳細 (id / station / role / fixity) | CP-10 | draft.supports | non-numeric |
| D3 | 主桁ライン一覧 (girder id / offset / segment spans) | CP-09 | SDM mainGirders / bridgeStructureSolids | non-numeric |
| D4 | 横桁一覧 (station / girder 間隔) | CP-11 | SDM crossBeams / crossBeamSpacing | non-numeric |
| D5 | 部材構成一覧 (stiffener/sway/lateral counts) | CP-17 | SDM stiffeners/swayBracings/lateralBracings | non-numeric |
| D6 | 線形参照情報 (alignment/grade/積載) | CP-08 | draft.alignment (future) | non-numeric |
| D7 | 保存データ情報 (sidecar: apolloBridgeStructureInput / apolloBsdd / apolloPhase1Unit2 key list) | CP-21 | importExport manifest | non-numeric |
| D8 | 3D 生成状態 (solids groups / triangle count) | CP-18 | solidGeometryParameters + exportApolloBinaryStl manifest | geometry |
| D9 | STL 生成状態 (byte length / bbox mm / axis / digest) | CP-18 | exportApolloBinaryStl manifest | geometry |
| D10 | validation 詳細 (diagnostics 行) | CP-19 | validateBridgeStructureInputDraft / validateBridgeLayoutContract | non-numeric |
| D11 | 警告詳細 (warnings[] + STALE + NOT_AVAILABLE 箇所) | CP-20 | warnings[] + chapter rows | message |
| D12 | 未実装章リスト (CP-08/13/15/16/30-34) | CP-23 | 08_gap_analysis.md §4 | non-numeric |
| D13 | 証跡一覧 (source_path/checksum/revision/commit) | CP-25 | reportModel.ts:301-306 | non-numeric |
| D14 | code/schema version (REPORT_MODEL_SCHEMA_VERSION, quantity schema, BSDD schemaVersion) | CP-03 | reportModel.ts:18 + audit.schemaVersions | non-numeric |

> ■ **CP-08/CP-15/CP-16/CP-30..CP-34** は D クラスなので **出力禁止** (§3 §10 参照)。D12 で「未実装章リスト」として **一覧のみ**出力し、数値本体は出力しない。

## 3. 数字結果フィールドの表示方針 (必須)

> Phase 1 `reportModel.ts:85-92` `row()` は `value===null` → `"NOT_AVAILABLE"` とする既存規約に準拠。

| 状況 | 表示値 | 状態コード |
|------|--------|------------|
| 未実装 (データ不存在) | `NOT_AVAILABLE` | not_available |
| 実装済み未承認 | `UNVERIFIED_DEVELOPMENT_ONLY` 値 | UNVERIFIED |
| 未承認ゲート (DS-09 cell) | `NOT_AUTHORIZED` | NOT_AUTHORIZED |
| STALE | `STALE` バッジ (値は前回生成値 or NOT_AVAILABLE) | STALE |

> ■ **CP-13 (section)** CONTINUOUS は `NOT_AVAILABLE` (spanLength ゲート, U-03)。空欄ではない。
> ■ **CP-30..34 (numeric results)** は `NOT_AVAILABLE` (U-01)。**空でもゼロ埋めしない** (`reportModelToCalculationCsv` §6 DS-02, `NOT_IMPLEMENTED` 表示)。

## 4. 各章詳細フィールド

### CP-04 (工事情報)
`project.project.id`, `project.project.name`, `project.project.number` (if present), `project.createdAt`.

### CP-05 (橋梁概要)
`draft.bridgeLength`, `draft.width`, `draft.girderCount`, `draft.girderDepth`, `draft.spanLength`(null for CONTINUOUS), `draft.spans.length`(span count), `draft.supports.length`.

### CP-06 (橋梁形式)
`draft.bridgeSystem` (=CONTINUOUS), `BSDD.phase1ScopeAssertion.spanSystem`(="continuous"), `span count`, `support count`.

### CP-07 (径間構成)
per span: `{id, length, station_start, station_end}`; per support: `{id, station, role(abutment/pier)}`. station = cumulative. CP-08 linear は未対応 (FORBIDDEN).

### CP-09 (主桁配置)
`draft.girderCount`, `draft.girderSpacing`, `draft.girderDepth`, SDM `mainGirders[].mainGirderId/designStatus`.

### CP-10 (支点構成)
abutment x2 / pier x(spanCount-1); `draft.supports` role/station; fixity (end=pinned, intermediate=roller) from `generateBsdd.ts:424-425`.

### CP-11 (横桁/対傾構)
`draft.crossBeamSpacing`, SDM `crossBeams.length`, `swayBracings.length`(if enabled), `lateralBracings.length`, `stiffeners.length`(if spacing set).

### CP-12 (材料)
`draft.steelUnitWeight`, `draft.rcUnitWeight`, `materialDefinitions[0].unitWeight.adoptionStatus`(PENDING/UNKNOWN); `getBridgeStructureUnitWeightAdoption` 結果。ADOPTED は非表示 (fail-closed)。

### CP-13 (断面)
`computeGirderSectionProperties` (webHeight/totalArea/I/S/steelVolumePerGirder)。**CONTINUOUS は `spanLength===null` でガード落ち → NOT_AVAILABLE + note "断面入力不完全"**。SIMPLE_SINGLE は UNVERIFIED。

### CP-14 (荷重)
`project.loadCases?.length` (count only) + dev fixture `GOLD-AN-001/002` placeholder。実荷重ケースは未表示。

### CP-15/CP-16 (future)
出力禁止。CP-23 未実装章一覧で言及のみ。

### CP-17 (部材構成)
SDM entity counts: mainGirders, rcDecks, crossBeams, stiffeners, swayBracings, lateralBracings, braceMembers。各 `designStatus=NOT_AUTHORIZED`。

### CP-18 (3D/STL)
`solidGeometryParameters` kinds (girder/deck/cross_beam/bearing/pier_marker/abutment_marker) counts; `exportApolloBinaryStl` manifest (bboxMm, axisConvention, sourceUnit, exportUnit, digest, entityCounts, triangleCount)。STALE 時は `solid:bsdd:*` 除外 (03_report_chapter_structure.md 参照)。

### CP-19 (validation)
`validateBridgeStructureInputDraft` diagnostics + `validateBridgeLayoutContract` diagnostics + `validateBridgeStructureInputPersistence` (unknown-field rejection)。`complete` boolean。

### CP-20 (警告)
`warnings[]` ("UNVERIFIED DEVELOPMENT OUTPUT" 等) + STALE note + NOT_AVAILABLE 章リスト + `unsupportedScope` (curve/skew/continuous design drawings)。

### CP-21 (保存状態)
`draft.generatedAt` (null=STALE/ungenerated), `isBridgeStructureGenerationCurrent`, import/export manifest `inputChecksum`, `revision`。

#### CP-22 (承認状態)
DS-09 部材/照査セル (`NOT_AUTHORIZED`) + `numericAuthorization=NOT_GRANTED` + `formalReport=NOT_AUTHORIZED`。

### D13 / CP-25 (証跡)
`inputRevision`, `inputChecksum`, `resultChecksum`, `quantityChecksum`, `quantityChecksum`, `generatedAt`, `appCommitSha`, `schemaVersions[]`, `calculationReferenceIds` (GOLD-SP-001/AN-001/QTY-001), `formalOkNgEmitted=false`.

## 5. サイズ・ページ目安

| 版 | ページ目安 | 備考 |
|------|------|------|
| summary | 1 ページ | §4 参照 |
| detailed | 8-12 ページ | 30 章 x ~1 行 + 詳細表 |

## 6. 印刷・保存方針

- HTML: `renderReportModelHtml` ベース (development)。
- 保存形: `03_results/calculation_results.json` (reportModelToJson), `04_results/calculation_results.csv` (reportModelToCalculationCsv) — ただし CSV は `NOT_AVAILABLE` プレースホルダのみ (§6 DS-02)。
- **詳細版の CSV で zero-fill しない** (`reportModelToCalculationCsv:357 "No zero-fill"`)。

## 7. 変更管理

- detailed spec は `chapter_matrix.csv` と対応。列・章追加は Phase 2 内で完結。
- `value_kind` / `numeric_or_nonnumeric` / `authorization_status` は chapter_matrix から参照。

## 8. 状態

- HEAD: 5ecfec6. local == origin/main. clean.
- 本節確定: summary 17 + detail D1-D14 項目; NOT_AVAILABLE/NOT_AUTHORIZED 表示方針; CP-08/15/16/3x 出力禁止。
