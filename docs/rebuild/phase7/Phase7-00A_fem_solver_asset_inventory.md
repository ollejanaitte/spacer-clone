# Phase 7-00A: 既存FEM・構造解析資産 Asset Inventory

- Phase: 7-00（既存FEM・構造解析資産 / Solver / Connector徹底監査）
- Step: A（Baseline + FEM / Solver Asset Inventory）
- baseline: `739312b0a919e767320be9d73800237bd92f2b8d`（Phase 6-02 Final Report merge SHA・PR #961）
- 日付: 2026-08-13

## 1. Baseline Gate結果（Step A冒頭で実確認済み）

| 確認項目 | 結果 |
|---|---|
| Phase 6-02 Final Report PR | #961 `docs(rebuild): Phase 6-02 Final Report（下部工一括実装・検証・Completion Gate）` |
| PR状態 | **MERGED**（mergedAt 2026-08-13T00:23:11Z） |
| Final Report merge SHA | `739312b0a919e767320be9d73800237bd92f2b8d` |
| true GitHub main SHA | `739312b0a919e767320be9d73800237bd92f2b8d`（gh repo view / gh pr view で実確認） |
| local main SHA（spacer-clone） | `739312b0a919e767320be9d73800237bd92f2b8d` |
| origin/main SHA | `739312b0a919e767320be9d73800237bd92f2b8d`（git ls-remote 実確認） |
| rebuild/integrated-system SHA（spacer-clone-next） | `739312b0a919e767320be9d73800237bd92f2b8d` |
| 4系統同期 | **一致**（同一SHA） |
| Phase 6-02 WP PR群 | #949(WP-A) #950(WP-B) #951(WP-C) #952(WP-D) #953(WP-E) #954(WP-F) #955(WP-G) #956(WP-H) #957(WP-I) #958(WP-J) #959(WP-K) #960(hygiene) すべてMERGED確認 |
| git status / git diff | pre-existing dirty差分あり（下記） |

### 1.1 pre-existing dirty差分（破棄・混入禁止・監査成果に含めない）

- **spacer-clone（main worktree）**
  - modified: `docs/apollo/step4c_appurtenance_haunch/evidence/load.json` / `quantity.json` / `stl-metadata.json`（timestamp/inputRevision等の改変のみ）
  - deleted: `final_report.txt`（working treeから削除・index未更新）
- **spacer-clone-next（rebuild/integrated-system worktree）**
  - modified: `docs/apollo/step4c_appurtenance_haunch/evidence/load.json` / `quantity.json` / `stl-metadata.json`（同上）
  - untracked: `docs/rebuild/reports/R1-04.5_GPT-5.6-Luna_Vision_Delegation_検証結果.txt`

> Phase 7-00の成果物は上記dirty差分を一切含まない。各Stepは `origin/main` から切った専用worktreeで作業し、
> dirty差分のあるworktree（spacer-clone / spacer-clone-next）には編集を加えない。

## 2. 監査方法

- 全検索対象語（fem / frame / grillage / analysis / solver / stiffness / matrix / node / member / element / beam / shell / support / constraint / release / spring / bearing / reaction / displacement / rotation / moment / shear / axial / torsion / stress / strain / load / loadCase / combination / modal / eigen / frequency / structural / calculation 等）で frontend / backend / docs / tests / fixtures / samples / scripts を横断。
- 「ファイルが存在する」と「productionで使われている」を区別するため、全主要資産について **定義 → import → caller → adapter/binding → model generator → solver → result → UI → persistence → tests** の実コード経路を追跡。
- backendは `python3 -m pytest backend/tests/` 実行、frontendは `npm run typecheck` / `npx vitest run` 実行で現状のpass/failを実測。

## 3. Asset Inventory（Asset ID / path / language / responsibility / inputs / outputs / caller / callee / runtime / tests / persistence / status）

### 3.1 Backend FEM Core（backend/engine/・Python）

| Asset ID | Path | Responsibility | Inputs | Outputs | Caller | Callee | Runtime use | Tests | Persistence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| ENG-MODEL | `backend/engine/model.py` | 解析Projectのfrozen dataclass定義・JSON parse/validate/serialize。Node/Member/Material/Section/Support/LoadCase/NodalLoad/MemberLoad/MassCase/AnalysisSettings/Model | raw project dict | `Model` / validation errors | solver/eigen/time_history/grillage/bridge_fem_generator | errors | **ACTIVE_PRODUCTION**（`/api/projects/validate` `/api/analysis/*` 経由） | test_api/test_engine_verification_cases/time_history系 | 非直接（project JSON経由） | KEEP |
| ENG-SOLVER | `backend/engine/solver.py` | 線形静解析オーケストレータ。DOF map→assemble→free/constrained分割→spsolve→health warning | project dict | 解析result envelope（displacements/reactions/memberEndForces） | `__init__.py` / grillage.py / bridge_fem_generator（lazy） | assembly/dof/errors/model/results | **ACTIVE_PRODUCTION**（`/api/analysis/run` `/api/design/analyze`） | test_engine_verification_cases等 | 生結果はtransient（IF3が別途persist） | KEEP |
| ENG-ASSEMBLY | `backend/engine/assembly.py` | 全体剛性行列（COO→CSR）・荷重ベクトル組立・ElementStateキャッシュ | Model / DofMap | Assembly / load_vector | solver/eigen/influence/response_spectrum/time_history_analysis | element/dof/model | **ACTIVE（transitive）** | 間接 | — | KEEP |
| ENG-ELEMENT | `backend/engine/element.py` | 12×12 Euler-Bernoulli 3D frame要素。local stiffness・回転行列・等価節点力（分布荷重） | Node pair / Material / Section | length/rotation/k_local/k_global | assembly/results/influence/response_spectrum | errors/model | **ACTIVE（transitive）** | 間接 | — | KEEP |
| ENG-DOF | `backend/engine/dof.py` | DOF numbering（6DOF/node・node list順）・support制約抽出 | Model | DofMap / constrained_dofs | assembly/solver/results/eigen/mass/influence/response_spectrum/time_history | model | **ACTIVE（transitive）** | 間接+直接(test) | — | KEEP |
| ENG-RESULTS | `backend/engine/results.py` | 結果envelope生成。reaction（K·u−f）・部材端力（local座標） | solved displacement vectors | result dict | solver/eigen/influence/response_spectrum/moving_load | assembly/dof/element/errors/model | **ACTIVE（transitive）** | 間接 | — | KEEP |
| ENG-ERRORS | `backend/engine/errors.py` | AnalysisError系・failed result builder | — | error result dict | 全engineモジュール | — | **ACTIVE** | 多数 | — | KEEP |
| ENG-CONST | `backend/engine/constants.py` | GRAVITY_ACCELERATION等 | — | constants | mass | — | **ACTIVE（transitive）** | test_mass直接 | — | KEEP |
| ENG-GRILLAGE | `backend/engine/grillage.py` | **Phase 7 canonical解析経路**。frontend grillage model→runnable project変換（宣言steel材+宣言断面）→solver実行→NOT_GRANTEDゲート | grillage model（nodes/members/supports/loadCases） | gated result | **`backend/app/main.py:32`(import)・`/api/design/analyze`endpoint=`main.py:147`** | solver | **ACTIVE_PRODUCTION** | test_grillage | 生結果transient | **KEEP（Phase 7正経路）** |
| ENG-BRIDGE-MODEL | `backend/engine/bridge_model.py` | BridgeProject domain contract（CrossSection/Span/ImpactFactor/BridgeLine/BridgeLoad/GenerationSettings） | raw bridge dict | BridgeProject | bridge_fem_generator / main.py bridge CRUD | — | **ACTIVE_PRODUCTION**（`/api/bridge/*`） | test_bridge_fem_generator / test_bridge_validation | bridge JSON | KEEP（但しbridge wizard系はDEFER検討） |
| ENG-BRIDGE-FEM | `backend/engine/bridge_fem_generator.py` | BridgeProject→FEM project生成（自前メッシュ・固定材料/断面・support配置） | BridgeProject | GenerationResult(project+summary) | main.py `/api/fem/generate` `/api/viewer/bridge` | bridge_model / run_analysis(lazy) | **ACTIVE_PRODUCTIONだがREWRITE予定**（grillage経路を正とする・Phase5-01B-02/01D-01凍結） | test_bridge_fem_generator | 生成FEM JSON | **REWRITE候補**（grillage経路に置換） |

### 3.2 Backend解析モジュール（backend/engine/・Python）

| Asset ID | Path | Responsibility | Inputs | Outputs | Caller | Runtime use | Tests | Status |
|---|---|---|---|---|---|---|---|---|
| ENG-EIGEN | `backend/engine/eigen.py` | 固有値解析（lumped mass・静的縮約・一般化固有値scipy.linalg.eigh・質量正規化・有効質量比） | project + massCaseId + modeCount | eigen result envelope | `__init__` / response_spectrum / main.py `/api/analysis/eigen` | **ACTIVE_PRODUCTION** | test_eigen_analysis | KEEP |
| ENG-MASS | `backend/engine/mass.py` | lumped mass vector組立・mass case validation | Model + massCaseId | mass vector | time_history_mass | **ACTIVE（一部build_mass_vectorはtest-only）** | test_mass / test_time_history_mass | KEEP |
| ENG-INFLUENCE | `backend/engine/influence.py` | 影響線解析（unit load sweep・spsolve） | project + line/targets | influence result envelope | `__init__` / moving_load / main.py `/api/influence/run` | **ACTIVE_PRODUCTION** | test_influence_analysis | KEEP |
| ENG-MOVING-LOAD | `backend/engine/moving_load.py` | 移動載荷解析（単点live load・影響線再利用・envelope/worst-case） | project + movingLoadCase | moving load result envelope | `__init__` / main.py `/api/moving-load/run` | **ACTIVE_PRODUCTION** | test_moving_load_analysis | KEEP |
| ENG-RESPONSE-SPECTRUM | `backend/engine/response_spectrum.py` | 応答スペクトル解析（eigen利用・SRSS/CQC・モーダル反力・部材応力） | project + request | response spectrum result envelope | `__init__` / main.py `/api/analysis/response-spectrum` / time_history（helpers流用） | **ACTIVE_PRODUCTION** | test_response_spectrum_analysis | KEEP |
| ENG-TH-MODELS | `backend/engine/time_history_models.py` | TH-1a dataclass schema + validation（settings/damping/ground motions/persisted result） | raw dict | TimeHistorySettings等 | `__init__` / model.py / time_history_analysis | **ACTIVE_PRODUCTION** | test_time_history_models等 | KEEP |
| ENG-TH-MASS | `backend/engine/time_history_mass.py` | TH-2a lumped mass matrix（active DOF集合） | Model + massCaseId | LumpedMassMatrix | time_history_analysis / time_history_damping | **ACTIVE_PRODUCTION** | test_time_history_mass | KEEP |
| ENG-TH-DAMPING | `backend/engine/time_history_damping.py` | TH-2b Rayleigh減衰 C=αM+βK | M/K/α/β | RayleighDampingMatrix | time_history_analysis | **ACTIVE_PRODUCTION** | test_time_history_damping | KEEP |
| ENG-TH-LOAD | `backend/engine/time_history_load.py` | TH-2c 等価地震荷重 P_eff=−M·r·ag | M/accel/direction | EffectiveLoadHistory | time_history_analysis | **ACTIVE_PRODUCTION** | test_time_history_load | KEEP |
| ENG-TH-NEWMARK | `backend/engine/time_history_newmark.py` | TH-2d Newmark-β平均加速度積分（密行列solve） | M/C/K/loads/dt | NewmarkTimeHistoryResult | time_history_analysis / time_history_result | **ACTIVE_PRODUCTION** | test_time_history_newmark / sdof_verification | KEEP |
| ENG-TH-RESULT | `backend/engine/time_history_result.py` | TH-4 persisted result model・mapper・round-trip parser | Newmark結果 + meta | TimeHistoryResult | time_history_analysis / model.py | **ACTIVE_PRODUCTION** | test_time_history_result_integration等 | KEEP |
| ENG-TH-ANALYSIS | `backend/engine/time_history_analysis.py` | TH-5 時刻歴解析オーケストレータ（settings検証・M/C/K/P組立・Newmark積分・envelope契約） | project + request | timeHistory envelope | `__init__` / main.py `/api/analysis/time-history` | **ACTIVE_PRODUCTION** | test_time_history_api（1089行） | KEEP |

### 3.3 IF3 Result Contract subsystem（backend/engine/if3_*.py・Python）

> IF3 =「Interim Frame analysis v3」= FrameAnalysisResultResource契約（`spacer.contracts.frame-analysis-result-resource` v0.1.0）。
> solver raw resultを正規化し、副作用sidecar（immutable）にpersistし、frame documentへ結果refを登録、staleness判定で古い結果をブロックする機構。

| Asset ID | Path | Responsibility | Caller | Runtime use | Tests | Status |
|---|---|---|---|---|---|---|
| IF3-CHECKSUM | `backend/engine/if3_checksum.py` | canonical JSON + sha256 content checksum（全IF3のdigest基盤） | normalizer/persistence/availability/staleness | **ACTIVE_PRODUCTION** | 間接 | KEEP |
| IF3-DIAG | `backend/engine/if3_diagnostics.py` | IF3 diagnostic envelope factory + sort/dedupe | normalizer/availability/staleness | **ACTIVE_PRODUCTION** | 間接 | KEEP |
| IF3-NORMALIZER | `backend/engine/if3_normalizer.py` | IF3-B raw solver結果→FrameAnalysisResultResource正規化（線形静解析=payload充填 / 他解析=UNSUPPORTED）。UUID5 stable ID・resultChecksum | main.py `/api/analysis/run` + 全解析endpoint | **ACTIVE_PRODUCTION** | test_if3_normalizer / test_if3_api | KEEP |
| IF3-PERSIST | `backend/engine/if3_persistence.py` | IF3-C 副作用`results/<uuid>.if3.json` atomic persist + frame documentへref登録（CAS・frame checksum照合） | contract_document_store / main.py | **ACTIVE_PRODUCTION** | test_if3_persistence / test_if3_ref_persistence | KEEP |
| IF3-STALENESS | `backend/engine/if3_staleness.py` | 保存IF3資源と現在frame bindingの比較→VALID/STALE/INVALID/UNSUPPORTED。sourceDocumentVersion/analysisSettingsChecksum/loadContext不一致で**STALE_RESULT** | if3_availability | **ACTIVE_PRODUCTION**（`/api/if3/availability`経由） | test_if3_normalizer（staleness節） | KEEP |
| IF3-AVAILABILITY | `backend/engine/if3_availability.py` | persistedResultRefsのavailability catalog（status precedence VALID<STALE<PARTIAL<FAILED<INVALID<UNSUPPORTED<MISSING） | contract_document_store / main.py `/api/if3/availability` | **ACTIVE_PRODUCTION（API実装済み・frontend未消費）** | test_if3_availability | KEEP（UI接続はPhase 7-01論点） |
| IF3-LEGACY-COMPAT | `backend/engine/if3_legacy_compatibility.py` | IF3-E READ_OLD_WRITE_TARGET legacy結果分類・WRITE_TARGET eligibility | —（**テストのみ**） | **ACTIVE_TEST_ONLY**（backend parity） | test_if3_legacy_compatibility | KEEP（policy spec。frontendに生きた双対`results/if3LegacyCompatibility.ts`） |

### 3.4 Backend App Layer（backend/app/・Python）

| Asset ID | Path | Responsibility | Runtime use | Status |
|---|---|---|---|---|
| APP-MAIN | `backend/app/main.py` | FastAPI。解析/design/bridge/IF3/persistence全endpoint | **ACTIVE_PRODUCTION**（1334行） | KEEP |
| APP-CONTRACT-DOC-STORE | `backend/app/contract_document_store.py` | IF3 persist/load/availability wrapper・ContractDocumentStore | **ACTIVE_PRODUCTION** | KEEP |
| APP-ATOMIC-JSON | `backend/app/atomic_json.py` | atomic JSON read/write（project/autosave/IF3 sidecar共通） | **ACTIVE_PRODUCTION** | KEEP |
| APP-REPORTS | `backend/app/reports.py` | CSV/PDF/print出力（IF3 authoritative export gate） | **ACTIVE_PRODUCTION** | KEEP |

### 3.5 Frontend Analysis assets（TypeScript）

| Asset ID | Path | Responsibility | Caller | Runtime use | Status |
|---|---|---|---|---|---|
| FE-API-CLIENT | `frontend/src/api/client.ts` | backend HTTP client（`http://127.0.0.1:8000`・file: protocol時のみ）。runAnalysis/analyzeGrillage/eigen/response-spectrum/influence/moving-load/time-history/save/load/autosave | App.tsx / SuperstructurePipelinePanel / ModelComparisonWorkspace / timeHistory | **ACTIVE_PRODUCTION** | KEEP |
| FE-API-BUILD-PROJECT | `frontend/src/api/buildBackendProject.ts` | frontend project→backend project（frontend-only settings除去） | client/if3/results | **ACTIVE_PRODUCTION** | KEEP |
| FE-IF3-BINDING | `frontend/src/if3/`（projectModelSourceBinding/buildRunAnalysisIf3Metadata/runAnalysisBindingGuard） | IF3 run-analysis binding metadata（source triple+checksum+loadContext+solver identity）。solver=`scipy_sparse` v0.3.0 | App.tsx runAnalysis / ModelComparisonWorkspace | **ACTIVE_PRODUCTION** | KEEP |
| FE-RESULTS-VM | `frontend/src/results/resultViewModel.ts` | AnalysisResult→ResultViewModel（displacements/reactions/member forces/eigen/spectrum/influence）・load case選択 | Viewer3D/ResultsPanel/exports/compare | **ACTIVE_PRODUCTION** | KEEP |
| FE-IF3-GATE | `frontend/src/results/if3ResultGate.ts` | IF3資源がauthoritativeか判定（VALID+SUCCEEDED+schema） | Viewer3D/exports/if3ExportGate/draft | **ACTIVE_PRODUCTION** | KEEP |
| FE-IF3-EXTRACT | `frontend/src/results/if3ResultViewModel.ts` | IF3 resource→AnalysisResult抽出（`extractLinearStaticAnalysisResultFromResource`）。`buildIf3ResultViewModel`はtest-only | Viewer3D / if3PrintDto | **ACTIVE（一部dead export）** | KEEP（dead exportはPhase 7-01で整理） |
| FE-IF3-LEGACY | `frontend/src/results/if3LegacyCompatibility.ts` | READ_OLD_WRITE_TARGET policy（classifyIf3Compatibility） | —（testのみ） | **ACTIVE_TEST_ONLY**（policy spec） | KEEP（specとして維持・正本コードではない） |
| FE-VIEWER | `frontend/src/viewer/`（Viewer3D/ThreeViewport/SceneBuilder/renderers） | Three.js 3D表示。node/member/support/load表示・変形・N/Q/My/Mz図・反力・色分け・A/B比較 | App.tsx / ModelComparisonWorkspace / ApolloPhase1Shell | **ACTIVE_PRODUCTION** | KEEP |
| FE-TH-UI | `frontend/src/timeHistory/` | Newmark-β時刻歴解析UI（wizard・ground motion CSV/H24 import・結果表/チャート/3Dアニメ） | App.tsx | **ACTIVE_PRODUCTION** | KEEP |
| FE-GRILLAGE-MODEL | `frontend/src/apollo/design/grillageModel.ts` | **`buildGrillageModel`（GeometrySnapshot→grillage model・KEEP対象）** | SuperstructurePipelinePanel / superstructureAnalysisAdapter | **ACTIVE_PRODUCTION** | **KEEP（Phase 7 canonical generator）** |
| FE-GRILLAGE-PIPELINE | `frontend/src/apollo/components/SuperstructurePipelinePanel.tsx` | STEP3 one-click pipeline。buildGrillageModel→`apiClient.analyzeGrillage`→NOT_AUTHORIZED結果保持 | ApolloPhase1Shell | **ACTIVE_PRODUCTION** | KEEP |
| FE-CHECK-FRAMEWORK | `frontend/src/apollo/design/checkFramework.ts` | RB001_DECLARED_CHECKS（10 check・宣言のみ・NOT_AUTHORIZED） | SuperstructurePipelinePanel / autoDesign | **ACTIVE_PRODUCTION（宣言のみ・数値実行なし）** | KEEP（旧向け維持） |
| FE-AUTO-DESIGN | `frontend/src/apollo/design/autoDesign.ts` | runDesignIteration（section候補反復・decision=PENDING_AUTHORIZATION） | SuperstructurePipelinePanel | **ACTIVE_PRODUCTION（宣言のみ）** | KEEP |
| FE-APPURTENANCE-ADAPTER | `frontend/src/apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts` | 旧Apollo閉形式単純支持梁静的計算（部分UDL・NOT_GRANTED） | AppurtenanceHaunchAnalysisPanel | **ACTIVE_PRODUCTION（旧Apollo向け・新経路では不使用と凍結）** | REFERENCE維持 |
| FE-BRIDGE-DEF-GEN | `frontend/src/bridgeDefinition/generator/structuralModelGenerator.ts` | BridgeDefinition→ProjectModel生成（nodes/members/supports/loads・solver=scipy_sparse）。**supportKindToConstraintはboolean制約のみ・spring無** | bridge/api.ts（flag gated） | **ACTIVE（VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL時）** | KEEP（接続判定はPhase 7-01） |
| FE-BRIDGE-API | `frontend/src/bridge/api.ts` | generateFem（legacy backend + bridgeDefinition flag）・bridge CRUD・viewer model | BridgeWizard | **ACTIVE_PRODUCTION** | KEEP |
| FE-BRIDGE-PROJECT | `frontend/src/bridgeProject/` | CBDM + BridgeProject manifest（alignment/geometry/superstructure/substructure adapter） | App.tsx / SuperstructurePipelinePanel | **ACTIVE_PRODUCTION**（分析API非接続・document生成） | KEEP（Coordinate/単位・ID reference整合がPhase 7-01論点） |
| FE-NEXT-SUPER-ANALYSIS | `frontend/src/next/modules/superstructure/superstructureAnalysisAdapter.ts` | **Phase 5-02 WP-F実装の正式Superstructure→Analysis adapter**（buildSuperstructureAnalysisInput/reactionsFromResult/applySuperstructureAnalysisResult/defaultAnalysisRunner） | —（**テスト+module barrelのみ・production UI未接続**） | **DORMANT（実装済み・未接続）** | **ADAPT（Phase 7-01で正式接続）** |
| FE-NEXT-SUPER-CHECKS | `frontend/src/next/modules/superstructure/superstructureBasicChecks.ts` | 6基本照査（σ=M/Z・τ=V·S/(I·tw)等・実式・全体NOT_AUTHORIZED） | —（**テスト+module barrelのみ・未接続**） | **DORMANT** | **ADAPT（Phase 7-01で正式接続）** |
| FE-NEXT-SUPER-HANDOFF | `frontend/src/next/modules/superstructure/superstructureHandoff.ts` | SuperstructureHandoff v1.0.0生成（bearing seats・reactionCases・selfWeight） | substructurePhase5Adapter / substructureGenerator | **ACTIVE_PRODUCTION（下部工module接続）** | KEEP |
| FE-NEXT-SUB-ADAPTERS | `frontend/src/next/modules/substructure/substructurePhase4Adapter.ts` / `substructurePhase5Adapter.ts` | Phase4 support handoff / Phase5 bearing+reaction handoff（NOT_AUTHORIZED維持） | substructureGenerator | **ACTIVE_PRODUCTION** | KEEP |
| FE-SUBST-STRUCTURE | `frontend/src/substructure/` | 下部工（planning UI・design framework・3D） | App.tsx（/pro/liner/substructure） | **ACTIVE_PRODUCTION（frontend only）** | KEEP（解析接続はPhase 7-01論点） |
| FE-COMPARE | `frontend/src/compare/ModelComparisonWorkspace.tsx` | A/B解析比較ワークスペース（runAnalysis両side） | App.tsx /pro/compare | **ACTIVE_PRODUCTION** | KEEP |
| FE-VERIFICATION | `frontend/src/verification/` | SPACER reference CSV比較・verification report（regression suite） | —（testのみ） | **ACTIVE_TEST_ONLY** | KEEP（golden/reference用途） |
| FE-LEVEL0 | `frontend/src/level0/` | Level0地震簡易モデル（ほぼstub） | —（production未接続） | **DORMANT/DEAD候補** | REMOVE候補（Phase 7-01で整理） |

### 3.6 Reference / Legacy / Test assets

| Asset ID | Path | Responsibility | Runtime use | Status |
|---|---|---|---|---|
| REF-EXAMPLES | `examples/`（project.json・cantilever_eigen.json・verification/*.json+meta） | 検証FEM入力モデル（`/api/examples`・backend verification testsの入力） | **ACTIVE_TEST/PRODUCTION**（examples API） | KEEP |
| REF-SAMPLE-MODELS | `backend/tests/sample_models.py` | 7 canonical FE verification models（cantilever/SS/UDL/torsion/unsupported/invalid/rigid-body） | **ACTIVE_TEST** | KEEP |
| REF-VERIFY-EXAMPLES | `examples/verification/*.json`+`.meta.json` | 解析expected値（δ=PL³/48EI等）+tolerance | **ACTIVE_TEST**（test_verification_framework） | KEEP |
| REF-REPLAY-FIXTURES | `backend/tests/fixtures/replay/gm01_hcl` / `gm02_nishichita` | Golden-Master geometry replay fixtures（道路線形） | **ACTIVE_TEST** | KEEP |
| REF-APOLLO-NUMERIC-CORE | `docs/apollo/step1_numeric_core/` | 独立閉形式reference calculators・GOLD-AN/SP candidate・all NOT_APPROVED | **REFERENCE_ONLY**（docs） | KEEP（referenceとして維持・正本ではない） |
| REF-APOLLO-RB-S10 | `docs/apollo/step10/reference_bridge_001/` | Apollo reference bridge（3径間連続鋼床版ガーダー・golden 4339 candidates・analysisReference=NOT_AVAILABLE） | **REFERENCE_ONLY**（docs/tools） | KEEP（golden source） |
| REF-SCRIPTS-EVIDENCE | `scripts/apollo/evidence/` | EA-02 analytical golden生成・parity比較CLI | **REFERENCE/RESEARCH** | KEEP |
| REF-CBDM-FIXTURE | `docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json` | CBDM golden fixture（geometry engine test入力） | **ACTIVE_TEST**（frontend geometry） | KEEP |

### 3.7 Schemas

| Asset ID | Path | Responsibility | Status |
|---|---|---|---|
| SCM-PROJECT | `schemas/project.schema.json` | project JSON schema（timeHistoryResult含む） | KEEP |
| SCM-RESULT | `schemas/result.schema.json` | result JSON schema（eigen/influence/movingLoad/responseSpectrum） | KEEP |
| SCM-IF3 | `schemas/contracts/v0.1/frame-analysis-result-resource.schema.json` | IF3 FrameAnalysisResultResource契約 | KEEP |
| SCM-BRIDGE-CONTRACTS | `schemas/contracts/v0.1/*` | bridge-frame-analysis-document / bridge-project / road-to-frame-transfer-package等 | KEEP |
| SCM-FEM | `schemas/generated-fem.schema.json` | bridge FEM生成出力schema | KEEP |
| SCM-SUBSTRUCTURE | `schemas/substructure/` | abutment/pier/support-interface等 | KEEP |

## 4. 網羅性確認

- **backend/engine/ 全31ファイル**（`__init__.py`含む）：呼び出し経路を追跡。全ファイルがproduction path（`/api/analysis/*` `/api/design/analyze` `/api/fem/*` `/api/bridge/*` `/api/if3/*`）またはそのtransitive依存に到達することを確認。production非接続は `if3_legacy_compatibility.py`（test-only）と `mass.py:build_mass_vector`（test-only・productionは自前実装）のみ。
- **frontend**：解析ソルバー実装はfrontendに存在しない（全数値解析はbackend FastAPIへ委譲）。frontendはrequest構築・result view-model整形・表示のみ。
- **subprocess/外部solver/API IPC**：backendに外部solver・subprocess・requests・networkは無し（全てin-process numpy/scipy）。Electron IPCはファイルダイアログ/persistenceのみ。
- **spring/foundation spring**：repo全体に spring 要素・elastic support・bearing stiffness の実装は存在しない（`springsCapability: absent`・SDOF検証テスト名のみ）。Support=boolean DOF制約のみ。
- **bearings/foundation**：下部工・上部工のbearing/support/foundationはgeometry・persistence・NOT_AUTHORIZED reaction入力データのみ。FEM剛性行列へは未接続。

## 5. 主要発見（Step A時点）

1. **backboneは成熟**：backend/engineは線形静解析・固有値・応答スペクトル・影響線・移動載荷・時刻歴（Newmark-β）まで揃ったin-processソルバー群で、全解析にproduction endpoint + testsが存在。
2. **IF3結果契約は成熟**：normalizer→checksum→persistence→staleness→availabilityの閉じた鎖で、古い結果のSTALE検出・authoritative export gateが機能する。
3. **grillageがPhase 7正経路**：`buildGrillageModel`（frontend）→`engine/grillage.py`（backend）→`solver.py`。ただし使用断面は**宣言値（declared）**、支持は**全girder node鉛直支持**（bearingモデル化無し）、結果は**NOT_GRANTEDゲート**。
4. **正式Superstructure→Analysis adapter（`superstructureAnalysisAdapter.ts`）はDORMANT**：Phase 5-02で実装済みだがproduction UI未接続（SuperstructurePipelinePanelは自前grillage経路を使用）。
5. **bridge_fem_generator.pyはREWRITE予定**（Phase 5-01D-01凍結・grillage経路を正とする）。
6. **spring/bearing stiffness/foundation springは未実装**（Phase 7-01で統合解析モデルのContract設計が必要）。

## 6. tests / check 実測結果（Step A時点）

| 項目 | 結果 |
|---|---|
| backend全tests | **1077 passed**（11.71s・warnings 4件=DeprecationWarningのみ） |
| FEMコアtests | 81 passed（test_bridge_fem_generator/test_grillage/test_eigen/test_influence/test_moving_load/test_response_spectrum/test_engine_verification_cases/test_result_schema/test_engine_result_schema） |
| frontend typecheck | **PASS**（tsc -b） |
| frontend tests（if3/results/api/verification） | 86 passed |
| frontend tests（apollo workflow/substructure/bridgeDefinition） | 485 passed |
| frontend全tests | 未実行（巨大・Phase 7-00の対象外。必要Stepで部分実行） |
