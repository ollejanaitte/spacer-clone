# 04 — Existing Tests Inventory

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **調査対象:** 既存テストの網羅状況。実装変更・追加は伴わない。すべて `git` 作業ツリー外（テストコード読取のみ）。
> **結論:** 入力→BSDD→3D→STL→save/reload の**幾何**テストは網羅されているが、**ReportModel / 出力束 / 量モデルの連続橋（CONTINUOUS）テストは未存在**（SIMPLE_SINGLE のみ）。解析結果章の NOT_AVAILABLE は SIMPLE_SINGLE でのみ検証済み。

## 0. 判定語

- **IMPLEMENTED**: テストコードが存在し実行可能。
- **GAP (not covered)**: 対象機能に対するテストが存在しない。
- **LEGACY (separate enum)**: テストは通るが対象はレガシー `Phase1SpanSystem`／`backend.engine.bridge_model` であり、実装中の連続桁機能とは別系統。
- **CONFIRMED**: コードを開いて実測・確認済み。

## 1. フロントエンド — Apollo テストインベントリ

| # | テストファイル | 対象機能 | 連続橋(CONTINUOUS)対応 | ステータス | 根拠 |
|----|--------------|----------|------------------------|------------|------|
| 1 | `continuousGirderLayout.test.ts` (195行) | buildContinuousLayout, validateBridgeLayoutContract, validateBridgeStructureInputDraft, generateBridgeStructureFromInput, BSDD spanSystem="continuous"+pier, round-trip save/reload, サポート役割(station/role), Legacy JSON→SIMPLE_SINGLE migration, 重複span ID rejection | ✅ | IMPLEMENTED | 2/3/5/4 spans バリデーション; `reloaded.bridgeSystem===CONTINUOUS`, `supports.length===4`, `bridgeLength===95` |
| 2 | `continuousGirderSample.test.ts` (37行) | applyContinuousGirderSampleInput [30,35,30], STALE without generate, validate+generate, NOT_AUTHORIZED | ✅ | IMPLEMENTED | `draft.spanLength===null`, `bsdd.phase1ScopeAssertion.spanSystem==="continuous"` |
| 3 | `continuousGirderVisualization.test.ts` (141行, C3) | 3D solids: girder/deck/cross_beam/bearing/pier/abutment, contiguous segments, STALE omission, round-trip rebuild, STL export (non-zero triangles) | ✅ | IMPLEMENTED | `girders===girderCount*spanCount`, `bearings===girderCount*(spanCount+1)`, `piers===spanCount-1`, `assumption bsdd-continuous-girder-segments` |
| 4 | `bridgeStructureVisualization.test.ts` (Block C) | BSDD-driven solids, girder count/spacing/depth/deck/cross-beam spacing, assumptions | ✅ | IMPLEMENTED | `girders===20` (4×5span), `decks===1`, `crossBeams===41`, `assumption bsdd-bridge-structure-solids` |
| 5 | `bridgeStructureWorkflow.test.ts` (324行) | full workflow: 4-span CONTINUOUS generate, persistence (5span), NOT_AUTHORIZED, stable UUID, STALE gate, unit weights PENDING | ✅ | IMPLEMENTED | line 136 "accepts CONTINUOUS layout with four spans"; line 276 5-span persistence with bridgeSystem=CONTINUOUS |
| 6 | `bridgeStructureQuantities.test.ts` (95行) | computeBridgeStructureApproximateQuantities (approx): span count=5, cross-beam=41, deck vol=600, NOT_AUTHORIZED, INCOMPLETE, STALE | ✅ | IMPLEMENTED | `fillContinuousBridgeStructureInput` → `支間数（概算）===5` |
| 7 | `importExport.test.ts` (226行) | exportApolloProjectToText/importApolloProjectFromText round-trip, BOM, UTF-16 reject, apolloBsdd+sidecar round-trip, STALE gate preservation, secondary-member/unit-weight fields, unknown field rejection | ✅ | IMPLEMENTED | `createApollo200mContinuousBridgeSample` + `fillContinuousBridgeStructureInput` |
| 8 | `apolloStlExport.test.ts` (222行) | exportApolloBinaryStl: binary byte length, m→mm, x-longitudinal/y-transverse/z-up, origin shift, export groups, deterministic bytes, digest, empty/unsupported rejection, degenerate triangle validation, manifest, browser download, stiffener-as-girder(36) | ✅ | IMPLEMENTED | `createApollo200mContinuousBridgeSample` |
| 9 | `simpleSingleSpanSample.test.ts` | SIMPLE_SINGLE sample | ❌ (contrast) | IMPLEMENTED | — |
| 10 | `simpleSingleSpanWorkflow.test.ts` (117行) | SIMPLE_SINGLE full workflow: spanSystem="simple", NOT_AUTHORIZED, STALE, round-trip, unit weights USER_PROVIDED_UNVERIFIED/PENDING | ❌ (SIMPLE) | IMPLEMENTED | — |
| 11 | **`reportModel.test.ts`** (67行) | buildReportModel, renderReportModelHtml, reportModelToCalculationCsv, reportModelToJson, CH-REACTIONS=NOT_AVAILABLE, STALE+FOMRAL reject, checksums, 16 chapters order, DEVELOPMENT mode, NOT_GRANTED | ❌ (**SIMPLE_SINGLE only**) | **GAP** | `generatedProject()` = `fillSimpleSingleBridgeStructureInput` (line 20). `buildReportModel` は CONTINUOUS 入力で呼ばれていない。grep 検証済み（§3） |
| 12 | **`outputIntegration.test.ts`** (52行) | buildIntegratedOutputs, checksum alignment (quantity/report/drawing/drawingSet/schedule), drawings G-01..G-07, bundle=READY, formalReport=NOT_AUTHORIZED, STALE reject | ❌ (**SIMPLE_SINGLE only**) | **GAP** | `generated()` = `fillSimpleSingleBridgeStructureInput` (line 15). CONTINUOUS 未テスト |
| 13 | **`quantityModel.test.ts`** (155行) | buildQuantityModel (formal): GOLD-QTY-001 exact volumes, GOLD-QTY-002 200m/5girder QTY-SUM-GIRDER-N=5, STALE reject, CSV/JSON BOM+checksum, calculationBasis | ❌ (**SIMPLE_SINGLE only**) | **GAP** | GOLD-QTY-001/002 いずれも `fillSimpleSingleBridgeStructureInput`。GOLD-QTY-002 は 200m だが**単径間(SIMPLE_SINGLE, spanLength=200)**。`QTY-SUM-SPAN` 連続桁経路未検証（bridgeStructureQuantities.test.ts の approx 経路のみ） |
| 14 | `phase1ScopeGuard.test.ts` (207行) | classifyPhase1Scope/validatePhase1Scope: AP00_SCOPE_CONTINUOUS 等 fail-closed | ⚠️ LEGACY | IMPLEMENTED | `Phase1SpanSystem.CONTINUOUS` をブロックするが**実装機能 `BridgeSystem.CONTINUOUS` とは非対応**（§IMPL-01）。ランタイム未呼出し |
| 15 | `numericAuthorityGuard.test.ts` (203行) | isTreatableAsAdopted, resolveNumericValue, validateNumericAuthority/rejectPlaceholderAsAdopted/validateGoldenExpectedRegistration/validateNumericRecord | n/a (generic) | IMPLEMENTED | ADOPTED under NOT_SELECTED → AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD |
| 16 | `featureFlag.test.ts` | VITE_APOLLO_PHASE1_ENABLED フラグ | n/a | IMPLEMENTED | — |
| 17 | `entryGuard.test.ts` / `workspace.test.ts` | エントリー/ワークスペースガード | n/a | IMPLEMENTED | — |
| 18 | `apolloSuite.test.ts` | スイートメタ（タグ/構造） | n/a | IMPLEMENTED | — |

### §3 — grep 検証（buildReportModel の呼出箇所）

```
frontend/src/apollo/__tests__$ grep -l "buildReportModel"
  reportModel.test.ts   ← line 30, 43, 54, 61  ※ すべて generatedProject() = SIMPLE_SINGLE

grep -l "BridgeSystem.CONTINUOUS" __tests__/
  continuousGirderLayout.test.ts, continuousGirderSample.test.ts, bridgeStructureWorkflow.test.ts
  ※ いずれも buildReportModel / buildIntegratedOutputs / buildQuantityModel と組み合わせていない
```

→ **CONFIRMED:** ReportModel / outputIntegration / formal quantityModel は `BridgeSystem.CONTINUOUS` 入力で決してテストされていない。

## 2. バックエンド — テストインベントリ

> ■ **注記:** バックエンド `backend.engine.bridge_model` / FastAPI `/api/bridge` は**レガシー FEM ブリッジドメインモデル**（`spans: [{index,length,offset}]`）であり、フロントエンド `BridgeSystem.CONTINUOUS` とは**別系統**。フロントエンド連続桁はバックエンドFEM解析器へのバインディングを持たない（`appurtenanceHaunchAnalysisAdapter.ts:385` 参照）。

| # | テストファイル | 対象 | 連続橋関連 | ステータス |
|----|--------------|------|-----------|------------|
| 1 | `test_reports_if3_gate.py` (196行) | `evaluate_if3_authoritative_export_gate`, `build_authoritative_result_exports_from_if3`, `evaluate_if3_print_catalog` | ❌（linear_static） | IMPLEMENTED |
| 2 | `test_bridge_fem_generator.py` | `generate_fem_model` (2-span/3-girder mesh) | ⚠️（FEMメッシュ≠設計解析） | IMPLEMENTED |
| 3 | `test_bridge_validation.py` | `bridge.schema.json` + examples validation | ❌（FEMスキーマ） | IMPLEMENTED |
| 4 | `test_bridge_api.py` | FastAPI `/api/bridge/template` + CRUD | ❌（Road/Frame contract） | IMPLEMENTED |
| 5 | `test_eigen_analysis.py` / `test_influence_analysis.py` / `test_moving_load_analysis.py` / `test_response_spectrum_analysis.py` | 線形動解析 API | ❌ | IMPLEMENTED |
| 6 | `test_if3_api.py` / `test_if3_availability.py` / `test_if3_legacy_compatibility.py` / `test_if3_normalizer.py` / `test_if3_persistence.py` / `test_if3_ref_persistence.py` | IF3 メタ＋永続化 | ❌ | IMPLEMENTED |

> ■ **test_bridge_validation.py** は `SCHEMAS_DIR/bridge.schema.json` と `EXAMPLES_DIR` を検証する。backend `spans` モデルのスキーマ検証。フロント `BridgeSystem` と無関係。
> ■ **test_bridge_api.py** は `api_app` (FastAPI fixture) で `/api/bridge/*` をテスト。Road/Frame contract 橋模型 API。連続桁と無関係。

**結論:** バックエンドに**連続橋設計計算書（calculation document）のテストは一切存在しない**。IF3 ゲートは線形解析結果の CSV/JSON エクスポート認証であり、桁設計計算書ではない。

## 3. 機能域別カバレッジサマリー

| 機能域 | 実装 | テスト | ステータス |
|------|------|--------|------------|
| 入力ドラフト / BridgeSystem | ✅（`types.ts`） | ✅（#1,#5,#6,#7） | Covered |
| spanSystem/spanCount/support/pier/abutment validation | ✅（`layoutValidation.ts`） | ✅（#1,#5） | Covered (2–5 spans) |
| BSDD生成 (spanSystem="continuous", pier role, NOT_AUTHORIZED) | ✅（`generateBsdd.ts`） | ✅（#1,#2,#5） | Covered |
| 3Dソリッド/STL (girder/deck/cross_beam/pier/abutment) | ✅（`bridgeStructureSolids.ts`） | ✅（#3,#4,#8） | Covered |
| save/reload + STALE gate | ✅ | ✅（#1,#3,#5,#7） | Covered |
| ReportModel（章ビルド/HTML/CSV/JSON/checksums/STALE） | ✅（`reportModel.ts`） | ⚠️ SIMPLE_SINGLE のみ（#11） | **GAP** (CONTINUOUS 未検証) |
| ReportModel 分析結果章（NOT_AVAILABLE） | ✅ | ⚠️ SIMPLE_SINGLE のみ（#11） | **GAP** |
| 出力束 / 統合（buildIntegratedOutputs / checksum / bundle） | ✅（`outputIntegration.ts`） | ⚠️ SIMPLE_SINGLE のみ（#12） | **GAP** |
| formal quantityModel (buildQuantityModel, GOLD-QTY) | ✅（`quantityModel.ts`） | ⚠️ SIMPLE_SINGLE のみ（#13） | **GAP** |
| 近似数量 (computeBridgeStructureApproximateQuantities) | ✅ | ✅ (#6) | Covered (CONTINUOUS) |
| phase1ScopeGuard (legacy AP00) | ✅（test-only） | ✅（#14） | Covered (legacy enum only) |
| numericAuthorityGuard | ✅ | ✅（#15） | Covered |
| 正式PDF / formal report | Rejected | ✅ reject test（#11） | Covered (rejection) |
| 解析結果モデル（linear FEM→CSV/JSON + IF3 gate） | ✅（backend） | ✅（backend #1） | Covered (linear only) |
| **連続橋解析** (`appurtenanceHaunchAnalysisAdapter.ts:385` idealization) | idealization only | ❌ | **GAP** |

## 4. 確認済みギャップ（CONFIRMED GAPS）

1. **`GAP-01 ReportModel / CONTINUOUS`** — `buildReportModel` / `renderReportModelHtml` / `reportModelToCalculationCsv` / `reportModelToJson` は SIMPLE_SINGLE 入力のみテスト済み。CONTINUOUS 入力での章レジストリ順・HTML watermark・checksums・NOT_AVAILABLE 行は検証されていない。
   - 影響: ReportModel は `draft.bridgeSystem` を CH-DESIGN-COND に表示するだけで解析章はすべて NOT_AVAILABLE のため**機能的には SIMPLE_SINGLE と同等**と見込まれるが、**テスト証拠はない**。

2. **`GAP-02 outputIntegration / CONTINUOUS`** — `buildIntegratedOutputs`/`assertIntegratedExportAllowed` は SIMPLE_SINGLE のみ。CONTINUOUS での checksum alignment（quantity/report/drawing/schedule）および bundle=READY は未検証。

3. **`GAP-03 formal quantityModel / CONTINUOUS`** — `buildQuantityModel`（formal / GOLD-QTY）は SIMPLE_SINGLE のみ。`QTY-SUM-SPAN`(スパンカウント) は approx (`bridgeStructureQuantities.test.ts`) でのみカバー。連続橉での exact quantityModel + checksum は未検証。

4. **`GAP-04 連続橋解析結果** — `appurtenanceHaunchAnalysisAdapter.ts:385` の simple-span idealization 分岐（`bridgeSystem !== SIMPLE_SINGLE`）はどこからもテストされていない。解析結果を ReportModel へ接続する経路は存在しない。

5. **`LEGACY-01 phase1ScopeGuard`** — テストは通るが対象 `Phase1SpanSystem.CONTINUOUS`（AP-00 レガシー）は実装機能 `BridgeSystem.CONTINUOUS` とは別。ドキュメント `continuous_girder/README.md` §7 と実装の呼称・ゲート対象の不一致（→ `03_existing_implementation_inventory.md` IMPL-01/IMPL-02 参照）。

## 5. テスト実行コマンド

```
# frontend (Phase 1 では実行・変更しない — 検証のみの記録)
cd frontend
npm test                  # vitest (ウォッチ)
npm run test:all          # vitest run (全件)
npm run test:regression   # 回帰 (Playwright)
npm run test:e2e          # E2E
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run build             # vite build
# スイートフィルタ: npm test -- --run src/apollo/__tests__/continuousGirderLayout.test.ts

# backend
cd backend && python -m pytest tests/test_reports_if3_gate.py tests/test_bridge_fem_generator.py -q
```

> Phase 1 方針に基づき、**テストは実行・変更しない**。コマンドは `03` と同一の `package.json` 実測値を記録。

## 6. 結論

- 入力/BSDD/3D/STL/保存・再読込の**幾何**層については CONTINUOUS のテストが**十分にカバー**されている（#1–#8）。
- ReportModel / 出力束 / formal quantityModel / 連続橋解析結果については **SIMPLE_SINGLE のみ**テストされており、CONTINUOUS での挙動は**テスト証拠として未検証**（GAP-01〜04）。
- バックエンドの bridge/IF3 テストはレガシー FEM モデル／線形解析結果であり、フロントエンド `BridgeSystem.CONTINUOUS` 設計計算書とは無関係。
- `phase1ScopeGuard` テストはレガシー `Phase1SpanSystem` に対するものであり、実装中の連続桁機能をゲートしていない（LEGACY-01 / IMPL-01）。

### 補記
- 現 HEAD: `4e6e8d3`（local==origin/main，clean）。
- 次フェーズ候補: Phase 1-F（実行手順／lint/typecheck 検証記録）または Phase 1-G（既存 docs との齟齬調査）。実装変更は Phase 1 外（STEP 9 Phase 6+）で行う。
