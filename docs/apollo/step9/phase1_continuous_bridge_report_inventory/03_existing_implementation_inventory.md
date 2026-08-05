# 03 — Existing Implementation Inventory

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **調査基準:** HEAD `cec0ab3`（pre-Phase1-A）実測。すべてのコード参照は実ファイルを開いて確認済み。
> **ステータス:** CONFIRMED（実装状況はコード証拠付き）

## 0. 判定語

| 状態 | 意味 |
|------|------|
| IMPLEMENTED | コードが存在し、テストで保証されている |
| PARTIALLY_IMPLEMENTED | 実装はあるが範囲が限定的／未完成 |
| SCHEMA_ONLY | 型/スキーマのみ。ロジック未実装 |
| UI_ONLY | UIのみ。裏付けロジック未実装 |
| VISUALIZATION_ONLY | 3D表示のみ。解析/保存未実装 |
| TEST_ONLY | テストのみ。productionコード未実装 |
| NOT_IMPLEMENTED | 実装なし |
| NOT_AUTHORIZED | 実装はあるが数値ゲート非許可 |

## 1. コードベース構造（主要モジュール）

```
frontend/src/apollo/
├── bridgeStructure/        # 入力ドラフト・BSDD生成・検証・数量
│   ├── types.ts            # ApolloBridgeStructureInputDraft, BRIDGE_STRUCTURE_INPUT_FIELDS
│   ├── validation.ts       # resolveSpanCount, validateBridgeStructureInputDraft, Persistence
│   ├── generateBsdd.ts     # buildBridgeSuperstructureDesignDocument, generateBridgeStructureFromInput,
│   │                        # getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent
│   ├── layoutInput.ts      # withBridgeStructureSystem, add/removeContinuousSpan, withContinuousSpanLength
│   ├── quantities.ts       # 近似数量
│   └── sampleInputs.ts     # SIMPLE_SINGLE / CONTINUOUS サンプル
├── contracts/
│   ├── layoutTypes.ts      # BridgeSystem{SIMPLE_SINGLE,CONTINUOUS,SIMPLE_MULTIPLE}, BridgeLayoutSpan/Support
│   ├── layoutValidation.ts # validateBridgeLayoutContract, resolveEffectiveLayout
│   └── bridgeSuperstructureDesignDocument.ts # BSDD 型 (phase1ScopeAssertion.spanSystem=simple|continuous)
├── visualization/          # 3D ソリッドビルダ
│   ├── builder.ts          # DraftLike -> node/member/support (メイン viewer ビルダー)
│   └── bridgeStructureSolids.ts # BSDD-driven ソリッド (isContinuous, girderSpanSegments)
├── report/
│   ├── reportModel.ts      # buildReportModel, REPORT_CHAPTER_REGISTRY(16), renderReportModelHtml
│   └── reportExport.ts     # downloadDevelopmentReport*, openDevelopmentReportPreview, tryBuildFormalReport
├── export/
│   └── apolloStlExport.ts  # STL エクスポート
├── workflow/               # 状態・選択・評価 (selectors.ts)
├── drawing/                # 図面・artifactBundle (開発用 artifact 束)
├── quantity/               # quantityModel (QTY-SUM-SPAN 等)
├── components/
│   ├── BridgeStructureInputPanel.tsx      # 入力UI（構造形式選択・連続スパン操作）
│   ├── ReportModelDevelopmentPanel.tsx    # 計算書プレビューUI
│   └── OutputIntegrationPanel.tsx        # 出力束UI
├── analysis/               # 解析アダプタ（appurtenanceHaunchAnalysisAdapter）
├── phase1ScopeGuard.ts     # レガシー Phase1 検証ゲート（Phase1SpanSystem）
├── numericAuthorityGuard.ts# 数値権威ゲート
├── featureFlag.ts          # VITE_APOLLO_PHASE1_ENABLED
└── ApolloPhase1Shell.tsx   # メインシェル（入力パネル・3D・数量・計算書・出力を統合）
```

> ■ **確認事項 IMPL-01:** `phase1ScopeGuard.ts` は `Phase1SpanSystem`（レガシー Phase 1 設計スコープ）をゲートする。実際の連続桁機能 `BridgeSystem.CONTINUOUS` とは**別の型**である。また実行時呼び出し箇所（ApolloPhase1Shell 等）は存在せず、テスト＋テストフィクスチャのみで参照されている。→ **TEST_ONLY / ランタイム非強制**として記録。

## 2. 連続桁入力データ型（BridgeSystem）

| 機能 | コードパス | 型／関数 | 入力 | 出力 | 保存対象 | ステータス | 根拠 |
|------|-----------|----------|------|------|----------|------------|------|
| 構造形式列挙 | `src/apollo/contracts/layoutTypes.ts:3-9` | `BridgeSystem` | — | `SIMPLE_SINGLE\|CONTINUOUS\|SIMPLE_MULTIPLE` | — | IMPLEMENTED | enum 定義済 |
| 入力ドラフト | `src/apollo/bridgeStructure/types.ts:76-121` | `ApolloBridgeStructureInputDraft` | ユーザー入力 | draft型 | project.apolloBridgeStructureInput | IMPLEMENTED | `bridgeSystem`, `spans[]`, `supports[]`, `generatedAt` 等を保持 |
| span count 導出 | `src/apollo/bridgeStructure/validation.ts:71-78` | `resolveSpanCount` | bridgeLength, spanLength | number\|null | — | IMPLEMENTED | `round(bridgeLength/spanLength)` 不整なら null |
| フィールド定義 | `src/apollo/bridgeStructure/types.ts:134-152` | `BRIDGE_STRUCTURE_INPUT_FIELDS` | — | label/unit/min | — | IMPLEMENTED | 表示名修正済（支間長/構造モデル長） |
| フィールドキー | `types.ts:48,56-63` | `BRIDGE_STRUCTURE_LAYOUT_FIELD_KEYS`, `_CONFIGURATION_FIELD_KEYS` | — | — | — | IMPLEMENTED | bridgeSystem/spans/supports を分離管理 |
| サンプル | `sampleInputs.ts:239-262` | `CONTINUOUS_GIRDER_SAMPLE_INPUT`, `applyContinuousGirderSampleInput` | — | draft | プロジェクト | IMPLEMENTED | `[30,35,30]` 等、設計採用値ではない |

## 3. spanSystem / spanCount / span length / support / pier / abutment

| 機能 | コードパス | 型／関数 | ステータス | 根拠 |
|------|-----------|----------|------------|------|
| spanSystem | `contracts/bridgeSuperstructureDesignDocument.ts:161` | `spanSystem: "simple"\|"continuous"` | IMPLEMENTED | BSDD phase1ScopeAssertion |
| spanCount | `quantityModel.ts:307` | `QTY-SUM-SPAN`（value=resolved.spanCount, status READY） | IMPLEMENTED | 数量モデルに支間数出力 |
| span length | `bridgeStructure/types.ts:78` `spanLength` | draft.spanLength | IMPLEMENTED | 単径間用。連続時は spans[].length |
| spans[] | `layoutTypes.ts:21-24` `BridgeLayoutSpan` | id, length | IMPLEMENTED | C1 追加フィールド |
| supports[] | `layoutTypes.ts:26-30` `BridgeLayoutSupport` | id, station, role(ABUTMENT/PIER) | IMPLEMENTED | C1 追加フィールド |
| pier/abutment role | `generateBsdd.ts:116-124` `mapSupportRoleToBsdd` | CONTINUOUS→"pier", SIMPLE→"bearing" | IMPLEMENTED | BSDD support.role |
| support station | `generateBsdd.ts:424` | `userInputQuantity(layoutSupports[i].station, "m")` | IMPLEMENTED | station=i×spanLength |
| support fixity | `generateBsdd.ts:425` | 端=pinned, 中間=roller | IMPLEMENTED | 幾何のみ（照査なし） |
| layout validation | `contracts/layoutValidation.ts:234-251` | CONTINUOUS: spanCount 2-5, station整合, bridgeLength=Σ | IMPLEMENTED | fail-closed |
| layout resolve | `layoutValidation.ts:275-286` `resolveEffectiveLayout` | CONTINUOUS: supports 自動生成 | IMPLEMENTED | spans から支点導出 |
| 入力UI操作 | `layoutInput.ts:81-129` | `withContinuousSpanCount/addContinuousSpan/removeContinuousSpan/withContinuousSpanLength` | IMPLEMENTED | UI→draft変更 |

> ■ **確認事項:** `data_model_spec.md` §2.2 `spans[i].continuity="continuous"`（C1 追加予定）は、現在の `generateBsdd.ts` では `spanSystem="continuous"` に吸納されており、`continuity` 個別フィールドは存在しない。`resolveEffectiveLayout`/`buildSimpleSingleLayout` は spans をそのまま保持する。→ **PARTIALLY_CONFIRMED**。

## 4. 主桁・床版・横桁・対傾構 (girder segment / cross girder / atSupport)

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| 主桁セグメント | `visualization/bridgeStructureSolids.ts:260` `girderSpanSegments` | IMPLEMENTED | 径間継ぎ目なし貫通表示 |
| 主桁可視化 | `bridgeStructureSolids.ts:619` `isContinuous` | IMPLEMENTED | assumptions `bsdd-continuous-girder-segments` (line 843/848) |
| 横桁 atSupport | `bridgeStructureSolids.ts`（cross beams） | IMPLEMENTED | 既存 crossBeamSpacing 規則 |
| 対傾構 | `appurtenanceGeometry.ts`/`appurtenanceModel.ts` | IMPLEMENTED | 既存規則（V型/三角形） |
| 横構 | `lateralAngleModel.ts` | IMPLEMENTED | upper/lower 独立 |
| 床版 | `pavementModel.ts` | IMPLEMENTED | RC 床版ソリッド |
| 補剛材 | `appurtenanceGeometry.ts` | IMPLEMENTED | 既存規則 |

> 3D ソリッドは**幾何のみ**。設計採用値ではない（NOT_AUTHORIZED）。

## 5. 保存・再読込・import/export

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| プロジェクト保存 | `src/apollo/importExport.ts` | IMPLEMENTED | apolloBridgeStructureInput 含むプロジェクトJSON保存 |
| 再読込 | `generateBsdd.ts:548-556` `getBridgeStructureInputDraft` + `parseBridgeStructureInputDraft` | IMPLEMENTED | レガシー1.0.0→1.1.0マイグレーション |
| ラウンドトリップ | `continuousGirderLayout.test.ts:109` | IMPLEMENTED（テスト済） | bridgeSystem=CONTINUOUS 復元 |
| バリデーション永続化 | `validation.ts:234` `validateBridgeStructureInputPersistence` | IMPLEMENTED | allowed set チェック |
| BSDD永続化 | `projectBsdd.ts:34-107` | IMPLEMENTED | hydrate/serialize Apollo BSDD |
| レガシー互換 | `generateBsdd.ts:548` `createEmptyBridgeStructureInputDraft` | IMPLEMENTED | bridgeSystem欠落→SIMPLE_SINGLE |
| import/export | `importExport.ts` | IMPLEMENTED | プロジェクトJSON入出力 |
| IF3 | `src/if3/*`（AP-11） | PARTIALLY | AP-11 は IF3メタデータビルドのみ。BSDD/AnalysisBinding 永続化は Rejected (ap11_final_report §3) |

> ■ **確認事項:** `ap01_final_report.md` §4 は「Document lifecycle persistence/migration (AP-02) Rejected」とするが、`validateBridgeStructureInputPersistence` と `getBridgeStructureInputDraft` のマイグレーションは実装済み。AP-01 の「Rejected」は AP-02 での完全なドキュメントライフサイクル（BSDD versioning 等）を指す可能性。→ **HUMAN_CONFIRMATION_REQUIRED**。

## 6. 3D viewer / STL

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| ソリッドビルダー | `visualization/builder.ts` | IMPLEMENTED | node/member/supportビルダー |
| BSDDソリッド | `visualization/bridgeStructureSolids.ts` | IMPLEMENTED | isContinuous サポート |
| pier_marker/abutment_marker | `visualization/builder.ts:836-837`, `types.ts:183-184` | IMPLEMENTED | supports → marker |
| STL出力 | `export/apolloStlExport.ts` | IMPLEMENTED | 三角面>0 (テスト済) |
| STALE時ソリッド省略 | `bridgeStructureSolids.ts` + `isBridgeStructureGenerationCurrent` | IMPLEMENTED | SIMPLE_SINGLE と同一契約 |
| カメラ/軸 | `docs/apollo/3d-stl/14_axis_camera_main_viewer_bug_report.md` | 既知不具合あり | Z-up/A4 等 |

## 7. STALE / NOT_AUTHORIZED / phase1ScopeGuard 制御

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| STALE判定 | `generateBsdd.ts:558-561` `isBridgeStructureGenerationCurrent` | IMPLEMENTED | `generatedAt !== null && apolloBsdd.structuralDesignModel` |
| STALE伝播 | 各 `with*Configuration` 系で `generatedAt: null` | IMPLEMENTED | 入力変更→STALE |
| NOT_AUTHORIZED | `reportModel.ts:71-72` (`NOT_AUTHORIZED`/`PROHIBITED`) | IMPLEMENTED | ReportModel 全体 |
| 数量ステータス | `quantityModel.ts` / `types.ts:154-158` | IMPLEMENTED | USER_PROVIDED_UNVERIFIED / NOT_AUTHORIZED / ADOPTED |
| 解析ステータス | `scope_and_architecture_freeze.md` §5.5 | NOT_IMPLEMENTED | ランタイム判定状態マシン未実装（設計書のみ） |
| phase1ScopeGuard | `src/apollo/phase1ScopeGuard.ts:60` | **TEST_ONLY** | `Phase1SpanSystem.CONTINUOUS` をブロックするが**実行時未呼出し**。実装は `BridgeSystem` に別途存在 |
| numericAuthorityGuard | `src/apollo/numericAuthorityGuard.ts` + `src/apollo/contracts/governedQuantity.ts` | IMPLEMENTED | NOT_SELECTED→ADOPTED 拒否 |

> ■ **確認事項 IMPL-02（重要):** `phase1ScopeGuard.ts` は C0 ドキュメント（`continuous_girder/README.md` §7）上では「CONTINUOUS は C1 まで OUT_OF_SCOPE 維持」とされるが、**実装は `BridgeSystem.CONTINUOUS` であり phase1ScopeGuard はそれをゲートしない**。実際のゲートは `layoutValidation.ts:234`（2〜5径間制約）、`validation.ts:149` (CONTINUOUSブランチ)、`appurtenanceHaunchAnalysisAdapter.ts:385` (`!== SIMPLE_SINGLE` で解析理想化) である。ドキュメントと実装の呼称・ゲート対象が不一致している。→ **CONFLICTING_EVIDENCE** → HUMAN_CONFIRMATION_REQUIRED。

## 8. 解析結果モデル / 解析機能

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| 解析モデル（SDM→FEM） | `backend/engine/bridge_fem_generator.py` / `solver.py` | IMPLEMENTED（linear） | ノード/メンバー/荷重→スパーセ行列 |
| 線形解析 API | `backend/app/main.py:100` `POST /api/analysis/run` | IMPLEMENTED | linear_static |
| 固有値 | `main.py:146` `POST /api/analysis/eigen` | IMPLEMENTED |
| 応答スペクトル | `main.py:191` | IMPLEMENTED |
| 応動歴 | `main.py:226` | IMPLEMENTED |
| 影響線 | `main.py:264` | IMPLEMENTED |
| 移動荷重 | `main.py:294` | IMPLEMENTED |
| 結果CSV/JSON | `backend/app/reports.py:96` `build_result_exports` | IMPLEMENTED（linear） | displacements/reactions/member_section_forces/eigen/influence/moving CSV + result.json |
| IF3 権威エクスポート | `reports.py:186-323` | IMPLEMENTED（gate） | `evaluate_if3_authoritative_export_gate` / `build_authoritative_result_exports_from_if3` |
| **連続桁解析** | `appurtenanceHaunchAnalysisAdapter.ts:385` | **NOT_IMPLEMENTED** | `bridgeSystem !== SIMPLE_SINGLE` → "continuous/other systems use bridgeLength as a single simple-span idealization." 解析は単径間理想化のみ |

> ■ **確認事項:** `simple_single_span` 向けの解析結果モデル（frameAnalysisResult / resultSchema）は存在するが、**連続桁向けの解析結果モデルは未実装**。連続桁は bridgeLength で単径間理想化して解析する（`appurtenanceHaunchAnalysisAdapter.ts`）。

## 9. 計算書／帳票／印刷／PDF関連

| 機能 | コードパス | ステータス | 根拠 |
|------|-----------|------------|------|
| ReportModel | `report/reportModel.ts:109` `buildReportModel` | IMPLEMENTED | 16章レジストリ |
| 章レジストリ | `reportModel.ts:24-42` `REPORT_CHAPTER_REGISTRY` | IMPLEMENTED | CH-COVER..CH-AUDIT |
| bridgeSystem出力 | `reportModel.ts:175` `row("bridgeSystem", draft.bridgeSystem)` | IMPLEMENTED | CH-DESIGN-COND に構造形式表示 |
| 分析結果章 | reportModel.ts:235-253 | NOT_IMPLEMENTED | CH-REACTIONS/SHEAR/MOMENT/DEFLECTION はすべて NOT_AVAILABLE（解析結果未添付） |
| HTMLプレビュー | `reportModel.ts:391` `renderReportModelHtml` | IMPLEMENTED | watermark 付き HTML |
| JSON出力 | `reportModel.ts:350` `reportModelToJson` | IMPLEMENTED | |
| CSV出力 | `reportModel.ts:354` `reportModelToCalculationCsv` | IMPLEMENTED | ヘッダーのみ/NOT_AVAILABLE 行 |
| 数量CSV | `reportModel.ts:374` `reportModelToQuantityCsv` | IMPLEMENTED | |
| 監査マニフェスト | `reportModel.ts:447` `buildAuditManifest` | IMPLEMENTED | |
| プレビューUI | `components/ReportModelDevelopmentPanel.tsx` | IMPLEMENTED | ブラウザ印刷 → PDF |
| HTMLダウンロード | `reportExport.ts:57` `downloadDevelopmentReportHtml` | IMPLEMENTED | |
| JSONダウンロード | `reportExport.ts:19` `downloadDevelopmentReportJson` | IMPLEMENTED | |
| CSVダウンロード | `reportExport.ts:28` `downloadCalculationResultsCsv` | IMPLEMENTED | |
| 印刷プレビュー | `reportExport.ts:48` `openDevelopmentReportPreview` | IMPLEMENTED | ブラウザ `window.print()` |
| **PDF生成（Playwright）** | `docs/apollo/step2_report/generate_report_pdf.mjs` | IMPLEMENTED（dev-only, スタンドアロン） | A4 Chromium PDF。app コードから import されない（artifactBundle.ts:177 コメントのみ） |
| **正式PDF** | `reportExport.ts:66` `tryBuildFormalReport` | **NOT_IMPLEMENTED（拒否）** | `assertFormalReportRejected` 常に throw |
| 出力束UI | `components/OutputIntegrationPanel.tsx` | IMPLEMENTED | assertIntegratedExportAllowed ゲート |
| 出力束ビルド | `output/outputIntegration.ts:61` `buildIntegratedOutputs` | IMPLEMENTED | quantity+report+drawing+schedule+consistency |
| 出力ゲート | `outputIntegration.ts:169` `assertIntegratedExportAllowed` | IMPLEMENTED | STALE/checksum 不一致/FAIL を拒否 |
| artifact bundle | `drawing/artifactBundle.ts:148` | IMPLEMENTED | `07_report/development_calculation_report.html`, `03_results/*.json`, `04_results/*.csv` |
| **連続橋専用計算書章** | — | **NOT_IMPLEMENTED** | ReportModel は bridgeSystem を CH-DESIGN-COND に表示するのみ。pier反力・連続モーメント分布等の連続橋専用章は存在しない |
| workflow report選択子 | `workflow/selectors.ts:318` `kind==="report"` | IMPLEMENTED | `buildReportModel(project)` |

> ■ **確認事項:** ReportModel は `buildReportModel(project)` で `apolloBridgeStructureInput` を直接読み込むため、**連続橋でもプレビュー／HTML／JSON／CSVを生成できる**。しかし分析結果章はすべて NOT_AVAILABLE であり、**連続橋設計計算書としての中身はない**（generic dev report）。

## 10. ステータス区分サマリー

| 区分 | 対象 | ステータス |
|------|------|------------|
| 入力データ型 | BridgeSystem / ApolloBridgeStructureInputDraft | IMPLEMENTED |
| SDM/BSDD生成 | generateBridgeStructureFromInput + buildBridgeSuperstructureDesignDocument | IMPLEMENTED |
| spanSystem/spanCount/support/pier/abutment | layoutValidation + generateBsdd | IMPLEMENTED |
| 主桁・横桁・対傾構・床版ソリッド | bridgeStructureSolids.ts | IMPLEMENTED |
| 保存・再読込 | getBridgeStructureInputDraft / parseBridgeStructureInputDraft | IMPLEMENTED |
| 3D viewer / STL | builder.ts / apolloStlExport.ts | IMPLEMENTED |
| STALE / NOT_AUTHORIZED / STALEゲート | isBridgeStructureGenerationCurrent / reportModel | IMPLEMENTED |
| phase1ScopeGuard | src/apollo/phase1ScopeGuard.ts | **TEST_ONLY（未使用）** |
| 解析結果モデル | bridge_fem_generator / reports.py（linear） | IMPLEMENTED（linearのみ） |
| 連続橋解析 | appurtenanceHaunchAnalysisAdapter.ts:385 | NOT_IMPLEMENTED |
| ReportModel（開発） | reportModel.ts / reportExport.ts | IMPLEMENTED（dev-only） |
| 計算書HTML/PDFプレビュー | ReportModelDevelopmentPanel / openDevelopmentReportPreview | IMPLEMENTED（dev-only） |
| 正式PDF／計算書 | tryBuildFormalReport / generate_report_pdf.mjs | NOT_IMPLEMENTED（拒否/スタンドアロン） |
| 連続橋設計計算書（中身） | — | NOT_IMPLEMENTED |

## 11. 根拠コードパス一覧（抜粋）

```
frontend/src/apollo/contracts/layoutTypes.ts        BridgeSystem, CONTINUOUS_SPAN_COUNT_MIN/MAX
frontend/src/apollo/contracts/layoutValidation.ts   validateBridgeLayoutContract (CONTINUOUS ブランチ), resolveEffectiveLayout
frontend/src/apollo/bridgeStructure/types.ts        ApolloBridgeStructureInputDraft, BRIDGE_STRUCTURE_INPUT_FIELDS
frontend/src/apollo/bridgeStructure/validation.ts   resolveSpanCount (:71), validateBridgeStructureInputDraft (:140), validateBridgeStructureInputPersistence (:234)
frontend/src/apollo/bridgeStructure/generateBsdd.ts buildBridgeSuperstructureDesignDocument (:130), generateBridgeStructureFromInput (:489),
                                                     mapSupportRoleToBsdd (:116→pier), spanSystem continuous (:467),
                                                     getBridgeStructureInputDraft (:548), isBridgeStructureGenerationCurrent (:558)
frontend/src/apollo/bridgeStructure/layoutInput.ts   withBridgeStructureSystem (:20), withContinuousSpanCount (:81)
frontend/src/apollo/bridgeStructure/sampleInputs.ts  CONTINUOUS_GIRDER_SAMPLE_INPUT (:239)
frontend/src/apollo/bridgeStructure/quantities.ts    computeBridgeStructureApproximateQuantities (:213)
frontend/src/apollo/quantity/quantityModel.ts        resolveDraft (:107), QTY-SUM-SPAN (:299), buildQuantityModel (:632)
frontend/src/apollo/report/reportModel.ts            buildReportModel (:109), REPORT_CHAPTER_REGISTRY (:24), renderReportModelHtml (:391)
frontend/src/apollo/report/reportExport.ts           openDevelopmentReportPreview (:48), tryBuildFormalReport (:66), assertFormalReportRejected
frontend/src/apollo/components/BridgeStructureInputPanel.tsx  入力UI (:276 isContinuous, 連続スパン操作)
frontend/src/apollo/components/ReportModelDevelopmentPanel.tsx
frontend/src/apollo/components/OutputIntegrationPanel.tsx
frontend/src/apollo/output/outputIntegration.ts      buildIntegratedOutputs (:61), assertIntegratedExportAllowed (:169)
frontend/src/apollo/drawing/artifactBundle.ts      開発 artifact 束 (:148), development_calculation_report.html (:186)
frontend/src/apollo/visualization/builder.ts         node/member/support ビルダー (:144)
frontend/src/apollo/visualization/bridgeStructureSolids.ts ソリッド (:619 isContinuous), girderSpanSegments (:260)
frontend/src/apollo/export/apolloStlExport.ts        STL エクスポート
frontend/src/apollo/phase1ScopeGuard.ts            テストのみ（実行時未使用）
frontend/src/apollo/numericAuthorityGuard.ts        数値権威ゲート
frontend/src/apollo/workflow/selectors.ts          :318 report選択子
frontend/src/apollo/ApolloPhase1Shell.tsx         :38 import ReportModelDevelopmentPanel, :2558 render, :2561 OutputIntegrationPanel
frontend/src/apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts:385  continuous解析理想化（dev仮定）
backend/app/reports.py                          build_result_exports (:96), IF3 gate (:186)
backend/app/main.py                             /api/analysis/run (:100) 等線形解析API
docs/apollo/step2_report/generate_report_pdf.mjs   Playwright PDF スクリプト (dev-only)
```

## 12. 検証コマンド（既存）

- `cd frontend && npm test -- --run src/apollo` — Apollo サブセット
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:regression`
- `cd frontend && npm run test:e2e` (Playwright)
- `cd backend && python -m pytest`

## 13. 結論

- **入力→BSDD→3D→STL→save/reload** の連続桁機能は **実装済み**（C1〜C4）。`phase1ScopeGuard` はこれをゲートしていない（テストのみ）。
- **計算書（ReportModel）** は実装済みだが **開発用（dev-only）**。`bridgeSystem` を CH-DESIGN-COND に表示するのみで、**連続橋専用の解析結果章は存在せず**、すべての解析結果章が NOT_AVAILABLE。
- **正式PDF** は拒否（`assertFormalReportRejected`）。ブラウザ印刷／Playwright dev スクリプトのみ。
- **連続橋の正式解析** は未実装（単径間理想化フォールバック）。
- 数値ゲートは全域 `NOT_AUTHORIZED`/`BLOCKED`/`NOT_GRANTED` を維持。
