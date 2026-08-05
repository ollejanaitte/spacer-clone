# 05 — Current Output Capability

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **対象:** 連続橋(CONTINUOUS)プロジェクトが**現在**どの出力を生成できるかをコード証拠付きで整理。実装変更なし。
> **結論:** 幾何/BSDD/3D/STL/save-reload は可能だが、**設計計算書(analysis結果を含む正式計算書)は未対応**。 artifact bundle manifest が `unsupportedScope: ["curve/skew/continuous design drawings"]` を明示。

## 0. 判定語

| 語 | 意味 |
|------|------|
| PRODUCIBLE | コードが実行可能で、テストでカバー済み |
| GENERIC_ONLY | 出力は生成できるが bridgeSystem 未反映（SIMPLE_SINGLE 前提の generic） |
| NOT_PRODUCIBLE | 生成できない / 拒否 |
| EXPLICITLY_EXCLUDED | manifest/known-limitations が対象外を明示 |
| NOT_AUTHORIZED | 実装ありだが数値ゲート非許可 |

## 1. 出力群の全体像

> `frontend/src/apollo/drawing/artifactBundle.ts:148` `buildArtifactBundle(project)` が束ねる。各サブシステムは `buildReportModel`/`buildQuantityModel`/`buildGeneralArrangementDrawingSet`/`buildMemberScheduleModel`/`buildStandardSectionDrawingModel` を呼ぶ。

### 1-1. BSDD（構造設計モデル）

| 出力 | ステータス | コードパス | 備考 |
|------|-----------|------------|------|
| `apolloBsdd.structuralDesignModel` | PRODUCIBLE | `generateBsdd.ts` | mainGirders/rcDecks/crossBeams（`designStatus: NOT_AUTHORIZED`） |
| `phase1ScopeAssertion.spanSystem` | PRODUCIBLE | `generateBsdd.ts:467` | `"continuous"` 出力済み |
| `bridge.spans` / `bridge.supports` | PRODUCIBLE | `generateBsdd.ts:116` | roles: pier(中間)/bearing(端) |
| `materialDefinitions[].unitWeight.adoptionStatus` | GENERIC_ONLY | `simpleSingleSpanWorkflow.test.ts:112-115` | テストは SIMPLE_SINGLE。CONTINUOUS での採用ステータス未検証 |
| 保存・再読込 (`project.json` sidecar) | PRODUCIBLE | `importExport.ts` + `getBridgeStructureInputDraft` | マイグレーション 1.0.0→1.5.0 |

### 1-2. 3D 可視化 / STL

| 出力 | ステータス | コードパス | 備考 |
|------|-----------|------------|------|
| 表示ソリッド（girder/deck/cross_beam/bearing/pier/abutment） | PRODUCIBLE | `visualization/bridgeStructureSolids.ts` | `isContinuous`, `girderSpanSegments` |
| binary STL (+mm変換, origin shift, groups, digest) | PRODUCIBLE | `export/apolloStlExport.ts` | `entityCounts` 付き manifest |
| SVG/DXF/HTML 図面 (G-01..G-07) | PRODUCIBLE | `artifactBundle.ts:196-201`, `renderSheet*` | general arrangement drawing set |
| S-01 standard section | PRODUCIBLE | `artifactBundle.ts:204` | |

### 1-3. 計算書 / ReportModel（開発用）

| 出力 | ステータス | コードパス | 備考 |
|------|-----------|------------|------|
| HTML プレビュー (`07_report/development_calculation_report.html`) | GENERIC_ONLY | `reportModel.ts:391` `renderReportModelHtml` | watermark `"UNVERIFIED DEVELOPMENT OUTPUT"` + `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED` |
| `calculation_results.json` (`03_results/`) | GENERIC_ONLY | `reportModel.ts:350` `reportModelToJson` | |
| `calculation_results.csv` (`04_results/`) | GENERIC_ONLY | `reportModel.ts:354` `reportModelToCalculationCsv` | **NOT_AVAILABLE 行のみ**（analysis結果未添付） |
| ブラウザ印刷 PDF | GENERIC_ONLY | `reportExport.ts:48` `openDevelopmentReportPreview` (`window.print()`) | dev-only |
| Playwright PDF (`docs/apollo/step2_report/generate_report_pdf.mjs`) | NOT_PRODUCIBLE | — | スタンドアロンスクリプト, appコード非import |
| **正式 PDF** | **NOT_PRODUCIBLE** | `reportExport.ts:66` `tryBuildFormalReport` → `assertFormalReportRejected` | Rejected |
| ReportModel 章レジストリ (16章) | PRODUCIBLE | `reportModel.ts:24` `REPORT_CHAPTER_REGISTRY` | CH-COVER…CH-AUDIT |

> ■ **確認事項 OUT-01 (重要):** ReportModel は `draft.bridgeSystem` を **CH-DESIGN-COND に 1 フィールドだけ** 表示する（`reportModel.ts:175`）。解析結果章 (CH-REACTIONS/SHEAR/MOMENT/DEFLECTION 等) は**すべて `NOT_AVAILABLE`**。したがって continuous でも HTML/CSV/JSON は生成できるが**中身は SIMPLE_SINGLE と同等の dev placeholder**。→ `reportModel.test.ts` は SIMPLE_SINGLE での NOT_AVAILABLE を検証済みだが CONTINUOUS は未検証（GAP-01, 04参照）。

### 1-4. 量産出力（quantityModel）

| 出力 | ステータス | コードパス | 備考 |
|------|-----------|------------|------|
| `quantities.json` / `quantities.csv` | GENERIC_ONLY | `quantityModel.ts` | `QTY-MG-VALL`/`QTY-SUM-SPAN`等 |
| `member_schedule.csv` / `.json` | PRODUCIBLE | `memberScheduleToCsv/Json` | |
| **近似数量** (`computeBridgeStructureApproximateQuantities`) | PRODUCIBLE | `bridgeStructure/quantities.ts` | テストで CONTINUOUS 検証済み（`支間数（概算）=5`） |

### 1-5. 統合束 (IntegratedOutputs / artifactBundle)

| 出力 | ステータス | コードパス | 備考 |
|------|-----------|------------|------|
| manifest `01_manifest.json` (checksums, READY/BLOCKED/STALE) | PRODUCIBLE | `artifactBundle.ts:216-241` | `authorizationStatus: NOT_GRANTED` |
| `audit_manifest.json` | PRODUCIBLE | `artifactBundle.ts:244-248` | |
| `assertIntegratedExportAllowed` (consistency gate) | PRODUCIBLE | `outputIntegration.ts:169` | PASS 条件: `inputChecksumAligned && quantityMatchesReportChapter && drawingMatchesInput && quantityMatchesSchedule && drawingSetSheetCountOk` |
| `statuses.formalReport` | `NOT_AUTHORIZED` (constant) | `outputIntegration.ts:128` | |

## 2. Bundle manifest の known-limitations / unsupportedScope

`artifactBundle.ts:157-178` (README) と `:230-239` (manifest) より**直接証拠**：

```txt
APOLLO DEVELOPMENT DELIVERABLES
UNVERIFIED DEVELOPMENT OUTPUT
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
USER REVIEW REQUIRED
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED
...
Known limitations:
- Development drawings only (not fabrication / construction)
- Straight simple-span equal-depth non-composite RC-deck steel plate girder   ← simple-span 前提
- Bundle uses STORE ZIP (no compression dependency)
- PDF path is HTML print/Playwright-compatible A3 landscape sheets
```

```jsonc
// manifest.unsupportedScope (artifactBundle.ts:235-239)
"unsupportedScope": [
  "curve/skew/continuous design drawings",   // ← continuous を明示的未対応
  "fabrication drawings",
  "formal authorization",
]
```

> ■ **確認事項 OUT-02:** bundle 自体は CONTINUOUS プロジェクトでも `buildArtifactBundle` は呼び出せる（generic）。しかし manifest は **continuous design drawings を `unsupportedScope` に列挙** し、known-limitations は **simple-span** を前提としてハードコードしている。実質的に **continuous 専用設計図面・計算書は未対応**。

## 3. 出力許容ステータス（IntegratedOutputs.statuses）

`outputIntegration.ts:121-129` より:

| フィールド | 値 | 備考 |
|-----------|----|------|
| `quantity` | `STALE\|BLOCKED\|READY` | `QTY-BLOCKED` 存在時 BLOCKED |
| `report` | `STALE\|BLOCKED\|READY` | STALEのみ (blocked=false) |
| `drawing` | `STALE\|BLOCKED\|READY` | entities空時 BLOCKED |
| `drawingSet` | `STALE\|BLOCKED\|READY` | sheets空時 BLOCKED |
| `memberSchedule` | `STALE\|BLOCKED\|READY` | rows空時 BLOCKED |
| `bundle` | `STALE\|BLOCKED\|READY` | `!current → STALE`; `sheets<7 → BLOCKED`; else READY |
| **`formalReport`** | **`NOT_AUTHORIZED`** (constant) | **正式 PDF なし** |

> `assertIntegratedExportAllowed(outputs)` は `stale===false && statuses.bundle==="READY" && consistency.overall==="PASS"` を要求する。CONTINUOUS でも `sheets>=7` かつ consistency PASS なら dev bundle export は**許容**される（ただし `NOT_AUTHORIZED` watermark 付き）。

## 4. 現在の出力許容状態の判定表（CONTINUOUS）

| 出力先 | CONTINUOUS で現在可能か | 条件 | 根拠 |
|--------|----------------------|------|------|
| BSDD (`structuralDesignModel`) | ✅ PRODUCIBLE | generate 済み | `continuousGirderSample.test.ts` |
| 3D 表示ソリッド | ✅ PRODUCIBLE | BSDD 構築 + non-STALE | `continuousGirderVisualization.test.ts` (C3) |
| binary STL | ✅ PRODUCIBLE | BSDD 構築 | `apolloStlExport.test.ts` |
| 図面 SVG/DXF/HTML (G-01..07) | ⚠️ GENERIC_ONLY | sheets>=7 | `outputIntegration.test.ts` G-01..07 — but SIMPLE_SINGLE |
| 計算書 HTML/CSV/JSON (dev) | ⚠️ GENERIC_ONLY | NOT_STALE + `bridgeSystem` CH-DESIGN-COND only | `reportModel.test.ts` — SIMPLE_SINGLE only |
| 計算書 formal PDF | ❌ NOT_PRODUCIBLE | Rejected | `assertFormalReportRejected` |
| 量 JSON/CSV (formal) | ⚠️ GENERIC_ONLY | — | `quantityModel.test.ts` — SIMPLE_SINGLE only (GAP-03) |
| member schedule CSV/JSON | ⚠️ GENERIC_ONLY | — | `outputIntegration.test.ts` consistency `quantityMatchesSchedule` — SIMPLE_SINGLE |
| **設計計算書（pier反力/連続モーメント分布等のanalysis結果）** | ❌ NOT_PRODUCIBLE | — | ReportModel analysis章 = NOT_AVAILABLE; 後端解析は single-span idealization（`appurtenanceHaunchAnalysisAdapter.ts:385`） |

## 5. 何が欠落しているか（formal calculation book へのギャップ）

現行 ReportModel が**欠落**している（= NOT_AVAILABLE のまま）連続橋設計計算書向け要素：

| 不要要素 | 現状 | 必要な実装（Phase 6+） |
|----------|------|----------------------|
| pier 反力 (CH-REACTIONS) | NOT_AVAILABLE | 連続桁静力不確定アンプリファイ |
| モーメント分布 / 曲げ矩 (CH-MOMENT) | NOT_AVAILABLE | 連続桁固定ピンク疙般 |
| せん断 Force (CH-SHEAR) | NOT_AVAILABLE | — |
| 変位 (CH-DEFLECTION) | NOT_AVAILABLE | — |
| 連続橋専用章 (pier 柱曲, joint, moment redistribution) | 未定義 | 新しい CH-* 章追加 |
| 解析結果 → ReportModel 接続 | 未実装 | `analysisResult` → ReportModel binding |
| formal PDF 生成 | Rejected (`assertFormalReportRejected`) | `tryBuildFormalReport` 実装 + layout engine (AP-03/04) |
| continuous design drawings (G-* sheets) | `unsupportedScope` | CAD/schedule template 拡張 (AP-05) |

> ■ **確認事項 OUT-03:** `scope_and_architecture_freeze.md` §5.5 は「解析結果モデル（analysisResult → ReportModel binding）は NOT_IMPLEMENTED」とする。したがって**現段階で ReportModel に analysis 結果を流し込む機能は存在しない**（designStatus が NOT_AUTHORIZED なのは設計承認前記載）。

## 6. 結論

- **現在 連続橋（CONTINUOUS）で可能な出力:** BSDD(構造設計モデル, NOT_AUTHORIZED), 3D 可視化, binary STL, 図面 SVG/DXF/HTML 束, dev HTML/CSV/JSON 計算書（NOT_AVAILABLE analysis), 量 JSON/CSV (dev), member schedule, save/reload。
- **可能だが generic / 未検証:** 計算書 HTML/CSV/JSON, formal quantityModel, member schedule — いずれも SIMPLE_SINGLE テストのみ（GAP-01〜03）。
- **現段階で不可能 / 拒否:** formal PDF (`assertFormalReportRejected`), analysis結果を含む正式計算書 — ReportModel analysis章が NOT_AVAILABLE のままであり、解析結果モデル未実装。
- **コード証拠:** `artifactBundle.ts:235-239` manifest `unsupportedScope` が「curve/skew/continuous design drawings」を**明示的に**列挙。known-limitations は simple-span 前提ハードコード。

### 補記
- 現 HEAD: `f77a641`（local==origin/main，clean）。
- 次フェーズ: Phase 1-G (`06_report_data_source_map.md`) → 07 → 08(gap) → 09 → evidence_matrix.csv → completion_report。
