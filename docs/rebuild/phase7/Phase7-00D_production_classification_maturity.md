# Phase 7-00D: Production / Dead判定 + KEEP / ADAPT / REWRITE / DEFER / REMOVE分類 + Maturity評価

- Phase: 7-00
- Step: D（Production/Dead判定・KEEP分類・Maturity評価）
- baseline: `109ffd4400c06b5d67c4d2983e73183ce1affee7`（Step C merge後）
- 日付: 2026-08-13

## 1. Production / Dead判定

分類基準：
- **ACTIVE_PRODUCTION**：importされる・runtime routeから到達・backend APIから呼ばれる（根拠にpath）
- **ACTIVE_UI_ONLY**：frontendのみ・解析計算なし
- **ACTIVE_TEST_ONLY**：testのみで使用
- **LEGACY_COMPATIBILITY**：旧形式維持・互換用
- **REFERENCE_ONLY**：docs/golden/reference
- **RESEARCH_LAB**：研究・実験コード
- **DORMANT**：実装済み・production未接続
- **DEAD_CANDIDATE**：no callers / obsolete
- **UNKNOWN**：判定不能

### 1.1 Backend assets

| Asset | 分類 | 根拠 |
|---|---|---|
| `engine/__init__.py` | ACTIVE_PRODUCTION | `main.py:20-29` import・全解析endpoint |
| `engine/model.py` | ACTIVE_PRODUCTION | solver/eigen/time_history/grillage経由・`/api/projects/validate` |
| `engine/solver.py` | ACTIVE_PRODUCTION | `/api/analysis/run`・`/api/design/analyze` |
| `engine/assembly.py` | ACTIVE_PRODUCTION | solver/eigen/influence/response_spectrum/time_historyからtransitive |
| `engine/element.py` | ACTIVE_PRODUCTION | assembly/results/influence/response_spectrumからtransitive |
| `engine/dof.py` | ACTIVE_PRODUCTION | assembly/solver/results他からtransitive |
| `engine/results.py` | ACTIVE_PRODUCTION | solver/eigen/influence/moving_loadからtransitive |
| `engine/errors.py` / `constants.py` | ACTIVE_PRODUCTION | 全モジュールからtransitive |
| `engine/grillage.py` | ACTIVE_PRODUCTION（**但しC1不具合で実効解析不能**） | `/api/design/analyze` `main.py:147` |
| `engine/bridge_model.py` | ACTIVE_PRODUCTION | `/api/bridge/*` |
| `engine/bridge_fem_generator.py` | ACTIVE_PRODUCTION（REWRITE予定） | `/api/fem/generate` `/api/viewer/bridge` `main.py:1251,1292` |
| `engine/eigen.py` / `mass.py` / `influence.py` / `moving_load.py` / `response_spectrum.py` | ACTIVE_PRODUCTION | `/api/analysis/eigen`等 |
| `engine/time_history_*.py`（全） | ACTIVE_PRODUCTION | `/api/analysis/time-history` |
| `engine/if3_normalizer.py` / `if3_checksum.py` / `if3_diagnostics.py` / `if3_persistence.py` / `if3_staleness.py` | ACTIVE_PRODUCTION | `/api/analysis/run`等・`contract_document_store.py` |
| `engine/if3_availability.py` | ACTIVE_PRODUCTION（API実装・UI未消費） | `/api/if3/availability` `main.py:558` |
| `engine/if3_legacy_compatibility.py` | **ACTIVE_TEST_ONLY** | backendからのimport無し・`test_if3_legacy_compatibility.py`のみ。frontendに生きた双対あり |
| `engine/mass.py:build_mass_vector` | ACTIVE_TEST_ONLY（**REFERENCE/TEST utility**） | productionはeigen/time_history_massが自前実装。**test oracle/parity用途**（`test_time_history_mass.py:166,470`）で維持・即削除対象ではない |
| `app/main.py` / `app/contract_document_store.py` / `app/atomic_json.py` / `app/reports.py` | ACTIVE_PRODUCTION | FastAPI |

### 1.2 Frontend assets

| Asset | 分類 | 根拠 |
|---|---|---|
| `api/client.ts` | ACTIVE_PRODUCTION | App.tsx/各panel import |
| `if3/`（binding/buildRunAnalysisIf3Metadata/runAnalysisBindingGuard） | ACTIVE_PRODUCTION | App.tsx:484・ModelComparisonWorkspace |
| `results/resultViewModel.ts` / `if3ResultGate.ts` | ACTIVE_PRODUCTION | Viewer3D/ResultsPanel/exports |
| `results/if3ResultViewModel.ts`（`extractLinearStaticAnalysisResultFromResource`） | ACTIVE_PRODUCTION | Viewer3D:11 |
| `results/if3ResultViewModel.ts`（`buildIf3ResultViewModel`） | DEAD_CANDIDATE | testのみ |
| `results/if3LegacyCompatibility.ts` | ACTIVE_TEST_ONLY | policy spec・testのみ |
| `if3/legacyPdfBypassGuard.ts` | **ACTIVE_PRODUCTION**（legacy PDF export pathのguard） | `exports/resultPdfReport.ts:447` で `denyLegacyOpenResultPdfReport()` 呼出・`if3/index.ts` でre-export |
| `viewer/`（全） | ACTIVE_UI_ONLY | 表示専用 |
| `timeHistory/`（全） | ACTIVE_UI_ONLY | 解析はbackend委譲 |
| `apollo/design/grillageModel.ts` | ACTIVE_PRODUCTION | SuperstructurePipelinePanel:214・superstructureAnalysisAdapter |
| `apollo/design/checkFramework.ts` / `autoDesign.ts` | ACTIVE_UI_ONLY（宣言のみ・数値実行なし） | SuperstructurePipelinePanel |
| `apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts` | ACTIVE_UI_ONLY（旧Apollo閉形式・新経路不使用） | AppurtenanceHaunchAnalysisPanel |
| `apollo/components/AnalysisDevelopmentProbePanel.tsx` | ACTIVE_UI_ONLY（dev probe） | ApolloPhase1Shell |
| `apollo/components/SuperstructurePipelinePanel.tsx` | ACTIVE_UI_ONLY（解析はC1不具合で実効なし） | ApolloPhase1Shell |
| `bridgeDefinition/generator/structuralModelGenerator.ts` | ACTIVE_UI_ONLY（flag gated） | bridge/api.ts:70-73 |
| `bridgeProject/`（CBDM） | ACTIVE_UI_ONLY（document生成・分析API非接続） | App.tsx |
| `next/modules/superstructure/superstructureAnalysisAdapter.ts` | **DORMANT** | テスト+module barrelのみ・production caller無し |
| `next/modules/superstructure/superstructureBasicChecks.ts` | **DORMANT** | 同上 |
| `next/modules/superstructure/superstructureHandoff.ts` | ACTIVE_PRODUCTION | substructurePhase5Adapter/Generator |
| `next/modules/substructure/substructurePhase4/5Adapter.ts` | ACTIVE_PRODUCTION | substructureGenerator |
| `substructure/`（planning/design） | ACTIVE_UI_ONLY | `/pro/liner/substructure`・設計frameworkはHOLD |
| `compare/ModelComparisonWorkspace.tsx` | ACTIVE_UI_ONLY | `/pro/compare` |
| `verification/` | ACTIVE_TEST_ONLY | SPACER reference regression |
| `level0/` | DEAD_CANDIDATE | production未接続・ほぼstub |

### 1.3 Reference / Legacy assets

| Asset | 分類 | 根拠 |
|---|---|---|
| `examples/` | ACTIVE（API+test） | `/api/examples`・verification tests |
| `backend/tests/sample_models.py` | ACTIVE_TEST | solver検証 |
| `backend/tests/fixtures/replay/*` | ACTIVE_TEST | golden replay |
| `docs/apollo/step1_numeric_core/` | REFERENCE_ONLY | 独立reference計算・NOT_APPROVED |
| `docs/apollo/step10/reference_bridge_001/` | REFERENCE_ONLY | golden source |
| `scripts/apollo/evidence/` | REFERENCE/RESEARCH | analytical golden |
| `frontend/src/verification/` | ACTIVE_TEST_ONLY | SPACER比較 |

## 2. KEEP / ADAPT / REWRITE / DEFER / REMOVE分類

### 2.1 KEEP（新統合システムでもそのまま・最小変更で利用）

| Asset | 理由 |
|---|---|
| `backend/engine/solver.py` | 線形静解析solver（spsolve・DOF/BC・error handling）成熟。実測PASS |
| `backend/engine/model.py` / `assembly.py` / `element.py` / `dof.py` / `results.py` / `errors.py` | FEM core全層成熟・production transitive |
| `backend/engine/eigen.py` / `influence.py` / `moving_load.py` / `response_spectrum.py` / `mass.py` | 解析種別成熟 |
| `backend/engine/time_history_*.py` | 時刻歴成熟 |
| `backend/engine/if3_normalizer.py` / `checksum.py` / `diagnostics.py` / `persistence.py` / `staleness.py` / `availability.py` | IF3結果契約成熟・stale防止機構 |
| `backend/app/main.py` / `contract_document_store.py` / `atomic_json.py` / `reports.py` | API層 |
| `backend/engine/grillage.py` | **正経路としてKEEP（但しC1不具合の修正が必要）** |
| `frontend/src/api/client.ts` | backend接続クライアント |
| `frontend/src/apollo/design/grillageModel.ts`（buildGrillageModel） | grillage generator |
| `frontend/src/viewer/` | 3D表示（変形/force図/反力/color map） |
| `frontend/src/timeHistory/` | 時刻歴UI |
| `frontend/src/results/resultViewModel.ts` / `if3ResultGate.ts` | result view-model・gate |
| `frontend/src/if3/`（binding） | run-analysis binding |
| `frontend/src/bridgeProject/` | CBDM document |
| `frontend/src/next/modules/superstructure/superstructureHandoff.ts` | 上部工→下部工handoff |
| `frontend/src/next/modules/substructure/substructurePhase4/5Adapter.ts` | 下部工handoff受領 |
| `schemas/*`（IF3/project/result/contracts） | schema契約 |
| `examples/`・`sample_models.py`・`verification/*` | golden/検証入力 |

### 2.2 ADAPT（新Contract/PDC/Handoffへ接続すれば利用可能）

| Asset | 接続対象 |
|---|---|
| `superstructureAnalysisAdapter.ts`（DORMANT） | SuperstructureDocument→Analysis Modelの正式adapterとしてPhase 7-01で配線（C3）。**但し荷重生成部分（support節点集中載荷・nodalLoads受渡し欠落）はREWRITEが必要** |
| `superstructureBasicChecks.ts`（DORMANT） | 6基本照査の正式接続 |
| `grillage.py`（C1修正後） | run_analysis(built)修正+成功検証test+load配分接続 |
| `engine/if3_availability.py` | frontend availability消費（UI接続） |
| `bridge_fem_generator.py` | **REWRITE（下記）**・移行完了まではACTIVE_PRODUCTION |
| `bridgeDefinition/generator/structuralModelGenerator.ts` | grillage canonical化の際に参照（model generator統一） |

### 2.3 REWRITE（責任境界・schema・実装品質等で置換）

| Asset | 理由 |
|---|---|
| `backend/engine/bridge_fem_generator.py` | Phase 5-01D-01凍結「grillage経路を正とする」。硬直化材料/断面・pin/roller区別未反映・自前メッシュ（ID不安定）。**grillage経路へ置換**。**cutover条件（endpoint切替・互換確認・旧実装廃止）をPhase 7-01で明示** |
| **grillage解析経路（C1/C2修正含む）** | `run_grillage_analysis`のenvelope誤渡し修正+dead load配分（support節点のみ→部材分布載荷）再設計 |
| **Superstructure→Analysis接続（C3）** | 正式adapterのproduction配線+**荷重生成部分のREWRITE** |
| **spring/elastic support/foundation spring（B1）** | **NEW DESIGN（新規設計）**・Phase 7-01で新Contractとして設計（既存REWRITEではない） |

### 2.4 DEFER（Phase 7初期スコープ外）

| Asset | 理由 |
|---|---|
| bearingモデル化（FIXED/MOVABLE/剛性） | Phase 7-01 Contract設計で扱う（B4） |
| 下部工→解析（foundation/pile spring・下部工部材のFEM） | 下部工解析は後続Phase |
| 活荷重載荷・影響線実用・移動載荷実用・組合せenvelope | 入力境界（D-01・LL等） |
| 応力/strain出力・設計照査本実装 | 設計check Phase |
| 非線形・動的非線形・construction stage | MVP外 |
| 詳細stale連動（Document→frame binding） | Phase 7-01設計（C6） |
| autosave有効化・backend save API統合 | 後続Phase（C8） |
| IF3 availability UI消費 | Phase 7-01以降（availability接続） |

### 2.5 REMOVE候補（Phase 7-00では無根拠に削除しない・要整理）

| Asset | 根拠 |
|---|---|
| `frontend/src/level0/` | production未接続・ほぼstub（DEAD_CANDIDATE） |
| `results/if3ResultViewModel.ts:buildIf3ResultViewModel` | testのみ（dead export） |

> 参考：`engine/mass.py:build_mass_vector` と `engine/if3_legacy_compatibility.py`（backend）はtest/parity用途で維持（REMOVE候補から除外）。`if3/legacyPdfBypassGuard.ts` はproductionでACTIVE（REMOVE候補から除外）。

> REMOVEはPhase 7-01以降で、各資産のproduction確認を再実施してから判断（本Phaseでは候補列挙のみ）。

## 3. Maturity Level評価

基準：
- Level 0：型・雛形のみ / Level 1：解析model生成可能 / Level 2：solver入力生成可能 / Level 3：solver実行可能
- Level 4：解析result取得可能 / Level 5：UI/3D/Persistence接続済み / Level 6：golden/reference modelで検証済み / Level 7：統合Bridge解析で検証済み

| カテゴリ | Level | 根拠 |
|---|---|---|
| FEM model（engine core） | **6** | component closed-form golden（sample_models/verification）で検証・production実行。**「統合Bridge検証済み」ではない（component検証済みの意）** |
| FEM model（grillage経路） | **2** | model生成+project変換は可能・solver実行はC1不具合で実効不能・golden未整備 |
| solver（線形静解析） | **6** | closed-form golden照合・production API |
| solver（eigen） | **6** | 解析解照合（spring-mass/cantilever）あり・API接続 |
| solver（response spectrum） | **6** | SRSS/CQC検証・API接続 |
| solver（influence/moving_load） | **5** | closed-form照合・API接続・統合golden未整備 |
| solver（time history） | **5** | Newmark検証（SDOF等）・API接続・member force/envelope未生成 |
| load（上部工DL Model） | **2** | DL-STRUCTURAL/DL-DECK計算可能だが**production solverへ未接続**（support節点のみ載荷・C2） |
| combination | **2** | COMBO-1宣言のみ・実行実装なし |
| support（bool DOF） | **3** | 既存solverで実行可能 |
| bearing（剛性/種別mapping） | **0** | bearing種別→拘束mapping・剛性は存在しない |
| foundation spring | **0** | 存在しない |
| result（raw/IF3） | **6** | IF3契約test網羅・staleness動作 |
| viewer | **5** | 3D表示全機能実装・live表示確認・統合モデル未確認 |
| persistence | **4** | IF3 sidecar persist+timeHistory persist・autosave無効・統合連動なし |
| superstructure connector | **2** | handoff（v1.0.0）実装・Analysis adapter DORMANT |
| substructure connector | **2** | Phase4/5 handoff受領・反力NOT_AUTHORIZED入力・**解析接続なし（Level 3未満）** |
| reference model | **4** | RB-S10-001 geometry/model/design golden・**解析goldenはLevel 0相当（NOT_AVAILABLE）** |

### 3.1 統合解析縦断の総合成熟度

- **目標（Phase 7終了時）**: 統合Bridge解析（上部工+下部工→解析model→solver→result→3D/UI/Persistence）がLevel 7。
- **現状**: 個別資産はLevel 5-6まで到達しているが、**統合縦断は明確にLevel 2**（grillage model生成は可能だが、C1でsolver実行不能のためLevel 3未満。load接続DORMANT・golden未整備）。
- **主なLevel差**：
  1. C1（grillage実行不能）でmodel→solverの縦断が遮断。
  2. load配分（C2）で正しい部材荷重が入らない。
  3. Superstructure→Analysis接続（C3 DORMANT）で正式Documentからの解析が不可。
  4. spring/bearing/foundation（B1/B4）が無く統合modelの境界条件が不完全。

## 4. SolによるStep D cross-review

- 委任内容：production/dead判定・KEEP/ADAPT/REWRITE/DEFER/REMOVE・Maturity評価の妥当性（対象パス・根拠・期待値・確認観点を提供）
- **Sol指摘と反映**：
  1. 統合縦断Maturityは**Level 2に断定**（C1でsolver実行不能・Level 3未満）→修正済み
  2. 上部工DL Model=2・substructure connector=2（解析接続なし）→修正済み
  3. bearing/support分離（bool support=3・bearing剛性/spring=0）→修正済み
  4. eigen/response spectrum=6・influence/moving_load/TH=5（種別毎）→修正済み
  5. `if3/legacyPdfBypassGuard.ts` はACTIVE（resultPdfReport.ts:447）・REMOVE候補から除外→修正済み
  6. `build_mass_vector` はtest oracle/parity用途で維持（REFERENCE/TEST utility）→修正済み
  7. bridge_fem_generator REWRITEには**cutover条件**が必要（移行完了までACTIVE_PRODUCTION）→追記
  8. superstructureAnalysisAdapterは「配線のみ」では不足・**荷重生成部分のREWRITE**が必要→追記
  9. springは「REWRITE」ではなく**NEW DESIGN**が正確→修正済み
  10. D1「解析種別は成熟」は一括表現が過大→個別評価に分解

## 5. 発見事項サマリ（Step D）

| # | 発見 | 分類 |
|---|---|---|
| D1 | FEM core・IF3・解析種別（eigen/RS=6・他=5）はKEEP（成熟・component検証済み） | KEEP |
| D2 | grillage正経路はC1修正（KEEP+ADAPT）+load配分REWRITE（**Critical**） | KEEP/ADAPT/REWRITE |
| D3 | bridge_fem_generatorはgrillage経路へ置換（**cutover条件要**） | REWRITE |
| D4 | superstructureAnalysisAdapter/BasicChecksはADAPT（配線+荷重生成REWRITE） | ADAPT |
| D5 | spring/bearing剛性/foundation springは**NEW DESIGN**（未実装・DEFER） | NEW DESIGN |
| D6 | 下部工解析・LL・組合せ・設計照査はDEFER | DEFER |
| D7 | level0・`buildIf3ResultViewModel`はREMOVE候補（要整理）。`legacyPdfBypassGuard`/`build_mass_vector`は維持 | REMOVE候補 |
| D8 | 統合golden未整備・**統合縦断はLevel 2** | GAP |
| D9 | **production到達性とruntime健全性は別軸**（C1のように到達はしていても実行不能な場合がある） | 監査観点 |
| D10 | **C1修正後の統合test不足**（API成功・荷重保存・反力釣合いの検証が無い） | GAP |
