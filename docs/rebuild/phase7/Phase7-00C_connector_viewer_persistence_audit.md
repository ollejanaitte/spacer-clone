# Phase 7-00C: Connector / Adapter / Binding / UI / 3D / Persistence / Tests 監査

- Phase: 7-00
- Step: C（Connector / Adapter / Binding + UI / 3D + Persistence + Tests監査）
- baseline: `c768dd92498b1fde2759b8a86a67cf643cfd19aa`（Step B merge後）
- 日付: 2026-08-13

## 1. Connector / Adapter / Binding 監査

### 1.1 実データフロー（目標形との照合）

```
SuperstructureDocument + SubstructureDocument + Bearing/Support/Foundation
  → [既存Connector/Adapter]
  → Analysis Model
  → Solver Adapter → Solver → Raw Result
  → Result Adapter → UI / 3D / Persistence
```

| 接続 | 既存Connector/Adapter | 状態 | 備考 |
|---|---|---|---|
| Superstructure → Analysis | `next/modules/superstructure/superstructureAnalysisAdapter.ts`（buildSuperstructureAnalysisInput/reactionsFromResult/applySuperstructureAnalysisResult/defaultAnalysisRunner） | **DORMANT**（テスト+module barrelのみ・production UI未接続） | Phase 5-02 WP-Fで実装済み。Phase 7-01で正式接続 |
| Superstructure → Analysis（実動経路） | `apollo/design/grillageModel.ts`（buildGrillageModel）+ `SuperstructurePipelinePanel.tsx:214-215`（apiClient.analyzeGrillage） | **ACTIVE_PRODUCTION（ただし後述CRITICAL不具合）** | geometry snapshot直入力・loadCases空 |
| Substructure → Analysis | 直接のadapterは存在せず。`substructurePhase5Adapter.ts`がSuperstructureHandoffのbearing/reactionを受領 | **ACTIVE_PRODUCTION（受領側）** | 下部工→解析modelへの出力adapterは無し |
| Bearing → Analysis | bearing種別→support拘束のmapping無し（bool一律拘束） | **未実装** | Phase 7-01論点 |
| Support → Analysis | grillage `build_grillage_project`のsupport正規化（bool） | **ACTIVE** | ux/uy/uz・rx=ry=rz=False |
| Foundation → Analysis | foundation spring・foundation→解析のadapter**無し** | **未実装** | Phase 7-01論点 |
| Load → Analysis | 上部工DL（DL-STRUCTURAL/DL-DECK）→nodalLoads配分（support節点のみ） | **DORMANT（adapter未接続）・productionは無載荷** | CRITICAL（後述） |
| Analysis → Solver | `backend/engine/grillage.py` build_grillage_project（宣言材/断面でproject組立）→run_analysis | **ACTIVE（ただしCRITICAL不具合）** | — |
| Solver → Result | `results.py` build_success_result + IF3 `if3_normalizer.py` | **ACTIVE** | — |
| Result → Viewer | `results/resultViewModel.ts` / `if3ResultViewModel.ts` / Viewer3D | **ACTIVE** | — |

### 1.2 Connector契約の記録（Phase 6-02凍結済みのもの）

| Connector | schema/version | input→output | sign/unit/axis | ID | authorization | fail-closed | caller | test |
|---|---|---|---|---|---|---|---|---|
| SuperstructureHandoff | v1.0.0（`handoffKind: superstructure-handoff`） | SuperstructureDocument+reactions→per-support entries | reactionZ up-positive(+z)・kN/kNm・x沿線/y横断/z上 | `SH-{bridgeId}` / seat `BRG-{supportId}-{girderId}` | reaction NOT_AUTHORIZED | malformed→ok=false+issues（throwしない） | `superstructureHandoff.ts:118` | superstructureHandoff.test |
| Phase4 Support Handoff | `substructurePhase4Adapter.ts` | bridgeLayout support→Support.placement | 直写し | supportId整合 | — | dangling reject | substructureGenerator | テスト有 |
| Phase5 Bearing/Reaction Handoff | `substructurePhase5Adapter.ts` | SuperstructureHandoff→bearing seats+reaction cases | up-positive・kN/kNm・seat axis x=longitudinal/y=transverse | `BRG-{support}-{girder}` | **常にNOT_AUTHORIZED**（昇格禁止） | 未対応combination→mapped or reject | substructureGenerator | テスト有 |
| support-interface互換DTO | v0.1.0 schema | SuperstructureHandoff→per-support support-interface | 同一単位・符号のみ保証 | bearingId等へ写像 | — | 明示変換関数 | toSupportInterfaceEntry | テスト有 |
| IF3 run-analysis binding | `RunAnalysisIf3Metadata`（frontend `if3/`） | ProjectModel→source triple(UUID,rev,sha256)+analysisSettings+loadContext+solver | — | stable UUID | — | fail-closed（guard throw） | App.tsx runAnalysis / ModelComparisonWorkspace | client.if3.test |

### 1.3 CRITICAL発見：grillage解析production pathの不具合（実測）

- **`run_grillage_analysis`（`backend/engine/grillage.py:116-126`）は有効な非空grillage入力では常にSCHEMA_ERROR "project is required"を返す。**（空nodes/members等の入力不備では先に`GrillageError`）
  - `build_grillage_project`は `{"project": {...}}` を返す（`grillage.py:86`）。
  - `run_grillage_analysis`は `project = built["project"]`（**内側dict）を`run_analysis(project)`に渡す**（`grillage.py:119`）。
  - `parse_model`は `require_mapping(data, "project")` を要求（`model.py:185,303-307`）→ **内側dictに"project" keyが無いため常に失敗**。
  - **live実測**（`POST /api/design/analyze`）：`status: failed / errors[0].code: SCHEMA_ERROR / message: "project is required"` を確認。
  - 正しい修正は `run_analysis(built)`（外側dict）。
- **test_grillage.pyがPASSする理由**：`test_run_grillage_analysis_returns_gated_result`は `authorization=="NOT_GRANTED"` と `reactions/displacements/memberEndForces` の**key存在**のみ検証（`test_grillage.py:54-59`）。`error_result`は空リストでこれらのkeyを返すため、**解析失敗でもPASSする**。つまり「grillage分析が実際に成功する」ことを検証していない。
- 導入commit: `9501b04`（STEP2-7-02）が **mainに存在**。後続修正なし。
- **影響**：`/api/design/analyze`経由のgrillage解析（SuperstructurePipelinePanel含む）は現状**常に失敗envelope**。production pipelineは `buildGrillageModel`の `loadCases: []`（無載荷）のため、結果UIは `authorization=NOT_GRANTED` のみ表示し実質no-op。**上部工・下部工とも実際の解析結果は現状productionで得られない。**
- 分類：**REWRITE（Phase 7-01で修正+正式接続）**。Phase 7-00では修正しない（audit scope）。

## 2. UI / 3D Viewer 監査

### 2.1 実機確認（live）

- backend（uvicorn:8000）+ frontend（vite:15173）を起動し、`/` `/pro` `/pro/analyze` `/pro/compare` をPlaywright(headless chromium)でcapture。
- **結果（Luna目視レビュー）**：
  - `/pro`：左にプロジェクト項目リスト・中央に空の3Dビューワー。node/member/support=0。日本語UI。クラッシュ/白画面/エラーなし。
  - `/pro/analyze`：`/pro`と**実質同一**（専用分析画面は分離されていない）。
  - `/pro/compare`：A/B比較画面（モデルA側に3Dビューワー+比較・アニメーション設定）。モデル未ロード。
  - モデル・解析結果未ロードのため変形図/force diagram/反力の実表示は未確認（コード監査+testで担保）。
- サンプルをUIから読み込む経路はproductionに無い（`loadExamples` APIは`client.ts:265`に存在するがAppから未使用）。

### 2.2 Viewer機能（コード監査・`frontend/src/viewer/`）

| 機能 | 実装 | status |
|---|---|---|
| node表示 | `renderers/NodeRenderer.ts`（sphere+label） | ACTIVE |
| member表示 | `renderers/MemberRenderer.ts`（line+方向矢印+force色） | ACTIVE |
| support表示 | `renderers/SupportRenderer.ts`（fixed/pinned/roller glyph） | ACTIVE |
| load表示 | `renderers/LoadRenderer.ts`（nodal/member arrow+moment） | ACTIVE |
| 変形図 | `renderers/DeformedShapeRenderer.ts` + `animation.ts`（eigen/spectrum-aware・display only） | ACTIVE |
| 反力表示 | `ResultDiagramRenderer.ts`（reaction arrows） | ACTIVE |
| force diagram | `ResultDiagramRenderer.ts`（N/Qy/Qz/My/Mz） | ACTIVE |
| color map | `memberForceColorMap.ts`（N/Vy/Vz/My/Mz/Mt） | ACTIVE |
| result選択 | `resultViewModel.ts` loadCaseId filtering（App.tsx activeLoadCase state） | ACTIVE |
| eigen/spectrum選択 | `buildEigenModeViewModel` / `buildResponseSpectrumViewModel` | ACTIVE |
| A/B比較 | `CompareShell.tsx` / `comparisonMetrics.ts`（同期カメラ+clock） | ACTIVE |
| 座標変換表示 | `coordinateTransform.ts`（Y/Z swap・localStorage `spacer-clone:viewer:spacer-axis-swap`） | ACTIVE |
| 2D fallback | `Fallback2DViewport.tsx` | ACTIVE |

- **Viewerは表示専用**（解析計算は全てbackend委譲）。結果は`AnalysisResult`/IF3 resourceをpropsで受領。

## 3. Persistence 監査

### 3.1 解析model/settings保存

| 項目 | 実態 | 根拠 |
|---|---|---|
| 解析model保存 | 独立保存**無し**。プロジェクトは`project.json`（Electronネイティブダイアログor download）で保存。`analysisSettings`（solver設定）はproject内 | `App.tsx:737-799` |
| solver settings保存 | `analysisSettings`（linear_static/scipy_sparse等・responseSpectrum/timeHistory settings含む）としてprojectに保存 | `types.ts` |
| .spacerproj | file dialogの拡張子（`dialogIpc.ts`）。中身はproject JSON | desktop/electron |
| autosave | **無効**（`AUTOSAVE_ENABLED=false`）・backend autosave APIは存在するがAppから未使用 | `App.tsx:151` |
| backend save/load API | `apiClient.saveProject/loadProject/autosaveProject` 実装済み・App未使用 | `client.ts:247-263` |

### 3.2 解析result保存

| 項目 | 実態 | 根拠 |
|---|---|---|
| raw result保存 | React stateのみ（transient）。project.jsonへは**非保存** | `App.tsx:180-184` |
| normalized result（IF3） | frame context指定時のみ `results/<uuid>.if3.json` sidecarにatomic persist+ref登録（CAS・checksum照合） | `if3_persistence.py:335-379` |
| timeHistory結果 | `project.analysisResults.timeHistory`として**project.jsonに永続化**（唯一） | `types.ts:281-282` |
| restart restore | timeHistoryのみproject経由でrestore。他解析結果はrestartで消える | — |
| stale invalidation | IF3 staleness（sourceDocumentVersion/analysisSettingsChecksum/loadContext）不一致→STALE→authoritative export gateでブロック | `if3_staleness.py:250-316` |

### 3.3 stale result危険の重点確認

- **上部工・下部工変更後に古い解析結果が「有効な結果」として残る危険**：
  - IF3機構はframe binding内でSTALEを検出しブロック（堅牢）。
  - ただし現状、**上部工/下部工Documentの変更が解析frame bindingへどう伝播するかは未設計**（SuperstructureDocument/SubstructureDocument→frame document→解析の連動）。
  - さらに現状**生産経路で解析結果がpersistされるケースが限定的**（App経由では時間履歴のみ）なため、stale残存リスクの実態は限定的だが、Phase 7-01でDocument変更→解析invalidationの正式連動が必要。
- digest/fingerprint：IF3 checksum（sha256 canonical JSON）・content-checksum契約（`schemas/contracts/v0.1/content-checksum.schema.json`）で管理。

## 4. Tests / Fixtures / Reference Models 監査

### 4.1 backend testsカタログ（主要FEM/解析系・実測PASS）

| test file | target | 実測 |
|---|---|---|
| `test_engine_verification_cases.py` | 7 verification models（cantilever/SS/UDL/torsion/unsupported/invalid/rigid-body） | PASS |
| `test_verification_framework.py` | `examples/verification/*`+meta（閉形式照合） | PASS |
| `test_grillage.py` | grillage往復（**解析成功は未検証・上記CRITICAL**） | PASS（弱検証） |
| `test_bridge_fem_generator.py` | bridge FEM生成（counts/round-trip） | PASS |
| `test_eigen_analysis.py` | eigen（closed-form・CSV） | PASS |
| `test_influence_analysis.py` | 影響線（closed-form） | PASS |
| `test_moving_load_analysis.py` | 移動載荷（linearity/envelope） | PASS |
| `test_response_spectrum_analysis.py` | SRSS/CQC等（611行） | PASS |
| `test_time_history_*.py`（11本） | Newmark-β/TH-5c契約（test_time_history_api 1089行含む） | PASS |
| `test_if3_*.py`（normalizer/persistence/ref_persistence/availability/legacy_compatibility/api） | IF3契約 | PASS |
| `test_result_schema.py` / `test_engine_result_schema.py` | result schema | PASS |
| backend全体 | — | **1077 passed** |

### 4.2 frontend testsカタログ（実測PASS）

| 範囲 | tests |
|---|---|
| if3/results/api/verification | 86 passed |
| apollo workflow/substructure/bridgeDefinition | 485 passed |
| viewer/timeHistory | 449 passed |
| typecheck | PASS |

### 4.3 reference models / fixtures

| asset | 用途 | status |
|---|---|---|
| `backend/tests/sample_models.py`（7モデル） | solver closed-form検証 | ACTIVE_TEST |
| `examples/verification/*`+`.meta.json`（8モデル） | solver expected値照合 | ACTIVE_TEST |
| `examples/project.json`他（eigen/spectrum/TH） | `/api/examples`・動的解析入力 | ACTIVE |
| `backend/tests/fixtures/replay/gm01_hcl`/`gm02_nishichita` | 道路線形golden replay | ACTIVE_TEST |
| `docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json` | CBDM golden（geometry） | ACTIVE_TEST |
| `frontend/src/liner/samples/mountain-viaduct-500/` | 統合geometry fixture | ACTIVE_TEST |
| RB-S10-001 input/model/design/report goldens | 入力・設計golden（解析golden無し・analysisReference NOT_AVAILABLE） | REFERENCE |
| `scripts/apollo/evidence/*`・`docs/apollo/step1_numeric_core/*` | 独立解析reference計算 | REFERENCE/RESEARCH |
| `frontend/src/verification/`（spacerReference等） | SPACER reference比較regression | ACTIVE_TEST |

### 4.4 tests網羅性評価

- **良好**：線形静解析（closed-form照合）、eigen、影響線、移動載荷、応答スペクトル、時刻歴、IF3契約は網羅。
- **gap**：
  1. **grillageの「解析成功」を検証するtestが無い**（上記CRITICALを検出できない）。
  2. **統合Bridge解析golden**（上部工+下部工を通した）は未整備（RB-S10-001のanalysisReference=NOT_AVAILABLE）。
  3. `examples/verification`は単純構造のみ（連続橋・grillage・spring support等は無し）。
  4. 時刻歴member forces/envelopeは明示的に未生成（`time_history_analysis.py:33-35`）→testも該当範囲なし。

## 5. 発見事項サマリ（Step C）

| # | 発見 | Severity | Phase 7-01論点 |
|---|---|---|---|
| C1 | **grillage解析production pathが有効入力でもSCHEMA_ERROR（`run_analysis(built["project"])`誤り）**。テストも解析成功を検証していない | **CRITICAL** | REWRITE（修正+接続+成功検証test） |
| C2 | production pipelineは無載荷（loadCases空）。死荷重配分adapterはsupport節点のみ載荷 | **HIGH** | load配分のContract設計（部材分布荷重） |
| C3 | superstructureAnalysisAdapter（正式Superstructure→Analysis）はDORMANT（未接続） | HIGH | Phase 7-01で正式接続 |
| C4 | Viewer機能は充実（変形/force図/反力/color map/比較）・表示専用 | LOW | KEEP |
| C5 | 解析結果persistはIF3 sidecar（frame context指定時）とtimeHistoryのみ。raw結果はtransient | MEDIUM | 解析結果保存の正式Contract |
| C6 | Document変更→解析frame binding連動が未設計（IF3 stalenessはframe内のみ） | HIGH | stale invalidation連動設計 |
| C7 | 統合Bridge解析golden未整備 | MEDIUM | golden整備 |
| C8 | autosave無効・backend save API未使用（Appはファイルダイアログ保存） | LOW | 後続Phase |

## 6. tests / check 実測（Step C時点）

- backend全tests：**1077 passed**（11.71s）
- frontend：typecheck PASS・if3/results/api/verification 86・apollo/substructure/bridgeDefinition 485・viewer/timeHistory 449 passed
- live API：`/api/analysis/run` success（displacements/reactions/memberEndForces取得）・`/api/design/analyze` **SCHEMA_ERROR（CRITICAL C1を実測確認）**
- live UI：`/` `/pro` `/pro/analyze` `/pro/compare` capture・クラッシュ/白画面なし（Luna目視確認）
