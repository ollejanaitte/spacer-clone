# 08 — Report Model Data Contract Boundary

> **Authority:** Phase 2-H (specification freeze)
> **目的:** Phase 3 Report Model 実装の**境界・契約**を TypeScript コード **なし**で凍結する。設計データをテンプレートに直接渡さず、Report Model を中間層とする。
> **Base:** Phase 1 `06_report_data_source_map.md` §3, `reportModel.ts` (scaffold), `04_summary_report_spec.md`, `05_detailed_report_spec.md`.

## 1. 設計原則 (12 principles, 実装言語に依らない)

1. **middle layer**: `ProjectModel` → `ReportModel` → render (HTML/CSV/PDF)。テンプレートは `ProjectModel` を直接参照しない。
2. **separation of raw vs display**: 生データ (`value: number`) と表示文字列 (`display: string`) を分離。`display` は locale/unit aware。
3. **unit mandatory**: すべての数値に `unit` (e.g. `m`, `kN`, `kN·m`) を必須。
4. **source mandatory for numeric/boolean**: `source.path`, `source.symbol`, `source.schemaVersion`を保持。
5. **authorization status mandatory**: `authorizationStatus: NOT_AUTHORIZED | UNVERIFIED | ADOPTED`。
6. **stale mandatory**: `stale: boolean` + `staleReason?: string`。
7. **missing reason mandatory**: 欠落値は `NOT_AVAILABLE` + `missingReason: "NOT_IMPLEMENTED | NOT_BOUND | GATE_BLOCKED | ..."`。**空欄/ゼロ埋め禁止** (`reportModelToCalculationCsv:357 "No zero-fill"`)。
8. **summary/detail shared**: 同一 Report Model から summary と detail を派生 (フィールドサブセットではない、階層構造を含む)。
9. **no render coupling**: Report Model は HTML/CSS/print/PDF 知識を持たない。`render*` は外部。
10. **version + timestamp**: `schemaVersion`, `generatedAt`, `inputRevision`, `inputChecksum`, `resultChecksum`。
11. **locale**: `locale: "ja-JP" | "en"` 等。数値フォーマットは locale 依存 (3 桁区切り)。
12. **legacy compatibility**: v1.0.0 プロジェクトの `schemaVersion` 欠落を `UNKNOWN`/`LEGACY_DATA` として扱う。

## 2. 概念構造 (12 concepts)

### R-01 ReportMetadata
- `schemaVersion`, `reportId`, `projectId`, `generatedAt`, `locale`
- `modes: "summary" | "detail"` (same model, different projection)
- `developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY"`
- `designOrConstructionUse: "PROHIBITED"`
- `authorizationStatus: "NOT_GRANTED"`

### R-02 ProjectSummary
- `projectName`, `projectId`, `createdAt`
- `designerName?` (currently NOT_IMPLEMENTED — O-18)

### R-03 BridgeSummary
- `bridgeSystem: "CONTINUOUS"`, `spanSystem: "continuous"`
- `bridgeLength`, `width`, `girderCount`, `girderDepth` (value_kind: input)
- `spanCount = spans.length`, `supportCount = supports.length`

### R-04 SpanSummary (array, per span)
- `id`, `length`, `stationStart`, `stationEnd`
- `value_kind: input`, `unit: m`

### R-05 SupportSummary (array, per support)
- `id`, `station`, `role: "abutment" | "pier"`, `fixity: "pinned" | "roller"`
- `value_kind: input`, `unit: m`

### R-06 GirderSummary (array, per girder group)
- `id`, `offset`, `count`, `depth`, `spacing`
- `segments: SpanSummary[]` (continuous segments)
- `value_kind: generated_geometry`, `authorizationStatus: NOT_AUTHORIZED`

### R-07 CrossMemberSummary
- `count`, `spacing`, `station` (array)
- `swayBracing?`, `lateralBracing?`, `stiffener?` counts
- `value_kind: input+geometry`

### R-08 GeometrySummary
- `solids: {kind, count, designEntityId, dimensionsM, assumptions[]}`
- `stl: {triangleCount, boundingBoxMm, axisConvention, sourceUnit, exportUnit, digest, entityCounts}`
- `assumption: "bsdd-continuous-girder-segments"` etc.

### R-09 ValidationSummary
- `complete: boolean`, `issues: {code, message, path}[]`
- `persistenceIssues[]` (unknown-field rejection)

### R-10 AuthorizationSummary
- `authorizationStatus: "NOT_GRANTED"`
- `memberChecks: [{member, check, status: "NOT_AUTHORIZED"}]` (DS-09 cells, sparse for continuous)
- `gate: "BLOCKED" | "PASS"` (NR-01..07)

### R-11 WarningSummary
- `watermark: "UNVERIFIED DEVELOPMENT OUTPUT"` (mandatory)
- `warnings: string[]`
- `states: {code, display, severity, position}` (§07 10 states)
- `humanConfirmationItems: H-01..H-03`

### R-12 EvidenceSummary
- `inputRevision`, `inputChecksum`, `resultChecksum`, `quantityChecksum`, `appCommitSha`
- `calculationReferenceIds: ["GOLD-SP-001","GOLD-AN-001","GOLD-QTY-001"]`
- `formalOkNgEmitted: false`
- `dataSources: [{chapterId, path, symbol, schemaVersion}]`

## 3. value_kind 列挙 (canonical)

`input | stored | display | generated_geometry | analysis_result | design_check | adopted`

> ■ `analysis_result`, `design_check`, `adopted` は**現時点で値を持たない** (NOT_AVAILABLE / NOT_AUTHORIZED / fail-closed)。構造は持つが空/NotApplicable。

## 4. 章↔概念の対応

| chapter_id | concept(s) |
|------------|-----------|
| CP-01 | R-01 + R-02 |
| CP-02 | classification (from 02) |
| CP-03 | R-01 (metadata) |
| CP-04 | R-02 |
| CP-05 | R-03 |
| CP-06 | R-03 |
| CP-07 | R-04 + R-05 |
| CP-10 | R-05 |
| CP-09 | R-06 |
| CP-11 | R-07 |
| CP-18 | R-08 |
| CP-19 | R-09 |
| CP-22 | R-10 |
| CP-20 | R-11 |
| CP-21 | R-01 (inputRevision/checksum/stale) |
| CP-25 | R-12 |
| CP-12 | R-03 + adoptionStatus |
| CP-13 | R-06 cross-section props (NOT_AVAILABLE for CONTINUOUS) |
| CP-30-34 | analysis_result/design_check (NOT_AVAILABLE) |

## 5. 実装時の注意 (Phase 3 用)

- `value` は `number | null`。表示は `ReportRow.value: string` (reportModel.ts:92 規約) に準拠。
- `reportModel.ts:85-92` `row()` ヘルパーの**表示規約を踏襲** (`null → "NOT_AVAILABLE"`)。
- `reportModel.ts:311-319` chapter order validation を Phase 3 でも維持。
- `assertFormalReportRejected` / `assertDevelopmentReportExportable` ゲートを Phase 3 でも維持 (formal PDF は Rejected)。
- `assertIntegratedExportAllowed` (outputIntegration.ts:169) consistency gate を Phase 3 report build 前提にする。

## 6. 変更管理

- 本境界は Phase 2 で凍結。フィールド追加は `DEC-PHA-xxxx` 経由。
- `value_kind`, `authorizationStatus`, `stale`, `missingReason` は `output_permission_matrix.csv` / `chapter_matrix.csv` と canonical 値で一致させる。

## 7. 状態

- HEAD: f187905. local == origin/main. clean.
- 本節確定: 12 concept, 7 原則, value_kind canonical, chapter↔concept map。
