# Phase 7-00B: FEM / Frame / Grillage / Solver / Load / Result 監査

- Phase: 7-00
- Step: B（FEM / Grillage / Solver / Load / Result監査）
- baseline: `5d3a870f40ec18de7239472cc12b3841a22c4fb8`（Step A merge後）
- 日付: 2026-08-13

## 1. 監査対象と実コード追跡方針

本Stepでは backend/engine（FEM core + solver + 解析モジュール）+ grillage経路 + Phase 5 Load Model + Result契約を、
実コード（element.py / dof.py / assembly.py / solver.py / results.py / model.py / grillage.py / if3_normalizer.py /
superstructureLoadModel.ts / superstructureAnalysisAdapter.ts）を直接読み、経路を追跡して監査した。

## 2. FEM / Frame / Grillage 監査

### 2.1 node model

| 項目 | 実態 | 根拠 |
|---|---|---|
| node表現 | `Node(id, x, y, z)` frozen dataclass。global Cartesian座標 | `backend/engine/model.py:27` |
| 座標系 | grillage: **snapshot supportPointの `sp.position.x/y/z` をそのまま使用**（LINER authority）。bridge_fem_generator: 橋軸x（chainage累積）・横断y（0対称）・z=0.0（平面） | `grillageModel.ts:55-58` / `bridge_fem_generator.py:167` |
| ID scheme | opaque string（`N-{supportId}-{girderId}` grillage / `N1..Nn` bridge_fem）・一意性検証あり | `grillageModel.ts:56` / `bridge_fem_generator.py:160` / `model.py:318-330` |
| ID stable性 | grillage: snapshot supportPoint由来（stable）。bridge_fem: 生成順（mesh依存・stableでない） | `grillageModel.ts:55-59` |
| node生成者 | ① frontend `buildGrillageModel`（snapshot.supportPoints×girderLines交点）② backend `bridge_fem_generator`（自前メッシュ） | `grillageModel.ts` / `bridge_fem_generator.py` |
| geometry source | LINER/GeometrySnapshot（supportPoints/girderLines/crossSectionFrames）が正 | `grillageModel.ts:13` |

### 2.2 member / element

| 項目 | 実態 | 根拠 |
|---|---|---|
| 要素 | 12 DOF straight Euler-Bernoulli 3D frame beam（せん断変形無し・explicitにMVP外） | `element.py:75-116` / `model.py:498-506` |
| local stiffness | axial EA/L・torsion GJ/L・bending EI_z（DOF 1,5,7,11）/EI_y（DOF 2,4,8,10） | `element.py:86-115` |
| せん断変形 | 非対応（MVP scope外・reject） | `model.py:498-506` |
| shell / rigid link / eccentricity | **存在しない** | engine全体grep |
| member生成者 | ① frontend buildGrillageModel（主桁=支間毎縦部材・横桁=各support横部材）② bridge_fem_generator（縦+横） | `grillageModel.ts:63-98` / `bridge_fem_generator.py:176-215` |
| 重複model | **あり**：①grillage経路（canonical）②bridge_fem_generator経路（REWRITE予定）③bridgeDefinition structuralModelGenerator（frontend local・flag gated）の3系統が並存 | `grillage.py` / `bridge_fem_generator.py` / `structuralModelGenerator.ts` |

### 2.3 material / section

| 項目 | 実態 | 根拠 |
|---|---|---|
| material source | grillage: **backendが宣言steel材**（E=2.05e8 kN/m²・G=8.0e7・ρ=78.5）。frontendは `{id, name}` 参照のみ（数値物性はbackend側宣言） | `grillage.py:19-26` / `grillageModel.ts:39` |
| section source | grillage: **宣言断面**（A=0.1・Iy=0.01・Iz=0.004・J=0.001）※設計framework既定値。実断面計算はPhase 8 deferred | `grillage.py:35-48` |
| 実断面計算 | frontend `computeSuperstructureSectionProperties`（I-beam・superstructure側に存在） | `superstructureComponents.ts` |
| 不整合リスク | grillage宣言断面とSuperstructureDocument実断面が**別source**（未接続）→ Phase 7-01で接続が必要 | — |

### 2.4 support / bearing / foundation connection

| 項目 | 実態 | 根拠 |
|---|---|---|
| support表現 | `Support(ux,uy,uz,rx,ry,rz: bool)` のみ。**spring/elastic support/penalty無し** | `model.py:75-83` |
| grillage support | frontend: 全girder node鉛直支持（abutmentのみux/uy拘束）→ backend: bool正規化（rx=ry=rz=False） | `grillageModel.ts:104-114` / `grillage.py:64-76` |
| bearing接続 | **未接続**。bearingは上部工SuperstructureDocument・下部工SubstructureDocumentにgeometry/NOT_AUTHORIZED reaction入力として存在するが、FEM支持条件へは未反映。bool支持で`ux=false`による橋軸方向解放自体は表現可能だが、**bearing種別→拘束条件の正式mappingが無く、位置ベースの一律拘束のみ** | 全体grep |
| foundation接続 | **未接続**。foundation/pileはgeometryのみ。foundation springは**存在しない** | 全体grep |
| 重複support source | support条件のsourceが複数（snapshot supportPoint / grillageModel / bridge_fem_generator自前 / bridgeDefinition supportKind）→ 統一が必要 | — |

### 2.5 grillage生成の検証結果

- `buildGrillageModel`（frontend）と`build_grillage_project`（backend）の往復を `test_grillage.py` で確認（PASS）。
- 典型生成モデルでは全girder nodeが`uz=True`で支持されるため剛体モードは出ない。ただし退化geometry/topologyまで保証するものではない（solver側でMODEL_UNSTABLE検出）。
- **grillage error handlingの抜け**：`run_analysis`は`AnalysisError`をthrowせずerror result envelopeを返す（`solver.py:22-43`）。そのため`run_grillage_analysis`の`except AnalysisError`（`grillage.py:122`）はsolver失敗を捕捉せず、**失敗envelopeにNOT_GRANTEDを付してHTTP 200で返り得る**。design endpointの挙動はPhase 7-01で明確化が必要。
- bridge_fem_generatorのpin/roller区別（`is_left`）はsupport flagへ**未反映**（監査済み既知issue・`bridge_fem_generator.py:239-250`）。REWRITE方針と整合。

## 3. Solver監査

### 3.1 線形静解析（canonical）

| 項目 | 実態 | 根拠 |
|---|---|---|
| solver | `scipy.sparse.linalg.spsolve`（sparse direct / SuperLU） | `solver.py:83` |
| stiffness assembly | member毎12×12 `k_global = Tᵀ k_local T`→COO→CSR | `assembly.py:31-72` / `element.py:148` |
| DOF numbering | node list順・6DOF/node（ux,uy,uz,rx,ry,rz）・`base=6*index` | `dof.py:7,15-23,26-27` |
| boundary condition | bool Support→constrained DOF抽出・free=全DOF-constrained・**homogeneous Dirichlet（u=0）のみ** | `solver.py:54-101` / `dof.py:34-47` |
| release / constraint / MPC | **存在しない**（releaseはwarning文字列のみ） | `solver.py:181` |
| spring | **存在しない**（stiffness行列へspring項なし） | `assembly.py` 全体 |
| 方程式番号 | node list順（固定）+ 縮約でfreeのみ解く | `solver.py:55-58,75` |
| 特異検出 | free=0 / constraint=0 / MatrixRankWarning→MODEL_UNSTABLE / 非有限解→MODEL_UNSTABLE / 予期せぬ例外→SOLVER_ERROR | `solver.py:59-99` |
| health warning | near-singular（eigvalsh条件数>1e17）・large displacement（>max(1e3, span·1e3)） | `solver.py:118-189` |
| 反力 | `K·u − f`（constrained DOF） | `results.py:47` |
| member端力 | `k_local·u_local − f_equiv`（local座標） | `results.py:75-88` |
| solver label | `"scipy_sparse"`（結果envelope固定） | `results.py:109` |
| external solver | **無し**（in-process numpy/scipy・subprocess/requests無し） | backend全体grep |

### 3.2 その他解析種別のsolver

| 解析 | solver | 根拠 |
|---|---|---|
| eigen | `scipy.linalg.eigh`（一般化固有値・質量正規化・静的縮約） | `eigen.py:129` |
| influence | `spsolve`（unit load sweep） | `influence.py:76` |
| moving load | influence再利用（`"influence_line_reuse"`） | `moving_load.py:339` |
| response spectrum | eigen結果+SRSS/CQC | `response_spectrum.py` |
| time history | `newmark_beta`（平均加速度・β=1/4, γ=1/2・Rayleigh減衰） | `time_history_analysis.py:470` / `time_history_newmark.py` |

### 3.3 Solver production path（実コード確認済み）

```
frontend buildGrillageModel / buildSuperstructureAnalysisInput
  → apiClient.analyzeGrillage → POST /api/design/analyze   (main.py:147-165)
  → run_grillage_analysis → build_grillage_project → run_analysis (solver.py:22)
  → parse_model → assemble_stiffness → spsolve → build_success_result
  → {result, csv, if3Result}（main.py:139）
```

- `/api/analysis/run`（raw linear static・IF3 binding付き）も並存。frontend `App.tsx runAnalysis` と `/pro/compare` が使用。
- eigen/response-spectrum/time-history/influence/moving-loadは `/api/analysis/*` 各endpoint。`attach_if3_unsupported_result` でIF3 UNSUPPORTED資源にラップ（`main.py:587-598`）。

### 3.4 Solver妥当性

- `backend/tests/sample_models.py` の7検証モデル（cantilever tip/SS center/SS UDL/torsion/unsupported/invalid/rigid-body）と `test_engine_verification_cases.py` でclosed-form照合。
- `examples/verification/*`（8モデル）+ `.meta.json` の解析期待値で `test_verification_framework.py` が照合。
- **実測：backend全tests 1077 passed（本Step時点）**。

## 4. Load / Combination 監査

### 4.1 Load Case / Combination（Phase 5-01 D-01凍結 + 実装確認）

| load case | 内容 | 実装状態 | 根拠 |
|---|---|---|---|
| DL-STRUCTURAL | 鋼主桁+横桁・横構・支承（partition明示・二重計上防止） | **実装**（structuralGirder: `unitWeightPerM` or `props.totalArea×77kN/m³`・structuralSecondary: MISSING） | `superstructureLoadModel.ts:33-54` |
| DL-DECK | RC床版自重（thickness×unitWeight×resolvedWidth×length） | **実装**（DERIVED） | `superstructureLoadModel.ts:58-68` |
| DL-PAVEMENT | 舗装 | **入力境界**（MISSING） | `superstructureLoadModel.ts:69-71` |
| DL-APPURTENANCE | 付属物 | **入力境界**（MISSING） | 同上 |
| LL | 活荷重 | **本実装しない**（liveLoadReference=null） | 同上 |
| COMBO-1 | DL-STRUCTURAL + DL-DECK（係数1.0） | `comboOneTotalKN` | `superstructureLoadModel.ts:75-78` |

### 4.2 死荷重の配分と単位・符号

| 項目 | 実態 | 根拠 |
|---|---|---|
| 配分 | 死荷重はgirder均等配分の意図（D-01 §2.4）だが、**実装は全荷重をsupport節点のみへ載荷**（perNode=perGirder/supportNodes）。支間内への分布載荷ではない→**支間中央の曲げを生まない（誤モデル化リスク・HIGH）**。さらにproduction pipeline（SuperstructurePipelinePanel）は`buildGrillageModel`をそのまま送信し`loadCases: []`（**現状production解析は無載荷**） | `superstructureAnalysisAdapter.ts:78-98` / `grillageModel.ts:123` |
| 単位 | kN・kNm・m | `grillage.py:89` |
| 符号 | 荷重は重力方向 -z（下向き負）・反力は +z up-positive | `superstructureAnalysisAdapter.ts:91` / D-02凍結 |
| provenance | state=CONFIRMED/DERIVED/MISSING/NOT_AUTHORIZED | `superstructureLoadModel.ts` |
| fail-closed | 未対応load kindはreject・MISSINGは発明しない | D-01凍結 |

### 4.3 既存Load資産との関係（D-01 §2.4再確認）

- `appurtenanceHaunchLoadModel.ts`（SegmentDeadLoad・旧Apollo）は**新load modelに流用しない**（REFERENCE維持）。
- `appurtenanceHaunchAnalysisAdapter.ts`（旧Apollo閉形式）は**新解析で不使用**（grillage経路が正）。
- 配分規則（nearest/equal/own-girder）は新死荷重配分の参考のみ。

### 4.4 Load Model と backend solver入力の重複/連携

- 新Load Model（SuperstructureDocument.loadModel）→ `buildSuperstructureAnalysisInput` が nodalLoads（-z）へ変換し backend grillageへ。
- backend側のload解析（moving_load/response_spectrum/time_history用の`LoadCase`/`NodalLoad`/`MemberLoad`）は**独立したProject入力**。上部工Load Modelとは**未接続**（Phase 7-01で分析model→solver入力の正式Contractが必要）。

## 5. Result 監査

### 5.1 raw solver result（`results.py:94-116`）

| 項目 | 内容 |
|---|---|
| displacements | `{loadCaseId, nodeId, ux..rz}`（m/rad）全node |
| reactions | `{loadCaseId, nodeId, fx..mz, constrainedDofs}`（kN/kNm）support nodeのみ |
| memberEndForces | `{loadCaseId, memberId, coordinateSystem:"local", i:{fx..mz}, j:{fx..mz}}` |
| analysisSummary | analysisType/status/solver="scipy_sparse"/nodeCount等 |

- stress / strain：**算出されない**（member end forcesまで）。応力度は設計check層（`superstructureBasicChecks.ts` σ=M/Z等）が別途導出。
- 生結果は**UI表示用transient**（React state）＋IF3正規化して必要時sidecar persist。

### 5.2 result adapter / IF3正規化（`if3_normalizer.py`）

| 項目 | 内容 | 根拠 |
|---|---|---|
| normalized result | FrameAnalysisResultResource（schema v0.1.0） | `if3_normalizer.py:15-16` |
| payload行 | nodeDisplacement（m/rad）・supportReaction（kN/kNm）・memberForce（i/j keys） | `if3_normalizer.py:369-428` |
| 行ID | UUID5 stable（`("row",kind,index,loadCaseId,entitySourceId)`） | `if3_normalizer.py:459-470` |
| entityId | UUID5（member/node/support sourceId） | `if3_normalizer.py:632-634` |
| loadContext | (kind,id,label,checksum)+requestChecksum | `if3_normalizer.py:307-356` |
| status | SUCCEEDED/PARTIAL/FAILED/INVALID/UNSUPPORTED（precedence） | `if3_normalizer.py:495-506` |
| 非有限値 | INVALID_NUMERIC_RESULTでreject（fail-closed） | `if3_normalizer.py:525-562` |
| resultChecksum | sha256（envelope minus resultChecksum） | `if3_normalizer.py:271-273` |

### 5.3 result sign / unit / coordinate

| 項目 | 実態 | 根拠 |
|---|---|---|
| displacement sign | 解析通り（global座標・m/rad） | `results.py:50-54` |
| reaction sign | 系の反力（K·u−f・支持が外力と釣り合う向き）。**handoffでは up-positive (+z) と整合** | `results.py:47,58-68` |
| member force sign | local座標・i端/j端 | `results.py:84-87` |
| 設計用符号 | N引張+・V/曲げは設計用定義（D-01 §3.3・下縁引張+既定）は**実装層で未確定** | D-01凍結 |
| 反力key不整合ハザード | `reactionsFromResult` が `r.rz`→`r.fz` fallback（raw結果の鉛直成分は`fz`・`rz`は回転DOF名）。**誤ったlegacy aliasを温存しており、両key存在時は誤値を採用し得る**。さらにIF3反力は `supportReaction.rows[].values.fz` であり本adapterはIF3 resourceを読めない | `superstructureAnalysisAdapter.ts:149` / `if3_normalizer.py:384` |

### 5.4 result persistence

| 項目 | 実態 | 根拠 |
|---|---|---|
| linear static結果 | IF3資源として `results/<uuid>.if3.json` にatomic persist（frame context指定時）+ frame documentへref登録（CAS・checksum照合） | `if3_persistence.py:335-379` / `main.py:501-556` |
| eigen/spectrum/TH/influence/moving-load | IF3 **UNSUPPORTED**資源にラップ（persistしない） | `main.py:587-598` |
| time history | `project.analysisResults.timeHistory` として**project.jsonに永続化**（唯一のproject内永続解析結果） | `model.py:547-550` / `types.ts:280-283` |
| 上部工/下部工変更後のstale | IF3 stalenessがframe binding内の `sourceDocumentVersion/analysisSettingsChecksum/loadContext` 不一致で **STALE_RESULT** 判定→authoritative export gateでブロック。**frame内では堅牢**。ただし上部工/下部工Document変更から分析frame bindingへの**自動伝播までは保証しない**（Document→frame bindingの連動はPhase 7-01で正式設計） | `if3_staleness.py:250-316` |

### 5.5 golden / reference

- backend: `sample_models.py` 7モデル + `examples/verification/*` 8モデルがclosed-form照合（実測PASS）。
- frontend verification: `verification/`（SPACER reference比較・test-only）。
- Apollo RB-S10-001: `analysisReference: NOT_AVAILABLE`（解析goldenは未登録・`analysis_result_parity_note.md` がOPEN FOR FUTURE CONTRACT）。
- **Phase 7-01論点：統合Bridge解析golden（上部工+下部工を通した）は未整備**。

## 6. 発見事項サマリ（Step B）

| # | 発見 | 影響 | Phase 7-01論点 |
|---|---|---|---|
| B1 | spring / elastic support / foundation spring / release / MPC がFEMに存在しない（bool DOF拘束のみ。方向解放は`ux=false`等で表現可能） | 支承剛性・基礎地盤バネ・部材releaseを扱えない | 統合解析modelのDOF/BC契約でspring/elastic支持・releaseを設計 |
| B2 | grillageは宣言断面・宣言材料（backend側宣言値・SuperstructureDocument実断面と未接続） | 解析結果はframework用（NOT_AUTHORIZED） | section/material mapping契約 |
| B3 | 3系統のFEM model generator（grillage / bridge_fem_generator / bridgeDefinition）が並存 | duplicate truth・ID drift・canonical判定が未確定 | canonical generator選定+統一 |
| B4 | bearing FIXED/MOVABLE→拘束条件の正式mappingが無く、位置ベースの一律拘束のみ | 可動支承の橋軸方向解放がbearing種別から導けない | bearing→support mapping契約 |
| B5 | `reactionsFromResult` の`rz→fz` fallbackは誤alias（raw契約は`fz`・`rz`は回転DOF名）。IF3 resourceも読めない | 両key存在時は誤値採用の危険 | result adapter契約（IF3正規化結果を直接読む） |
| B6 | COMBO-1はLoad Modelに宣言済みだが**solver組合せ実装は無い**。死荷重配分は**support節点のみ載荷**（支間内分布なし）・production pipelineは**無載荷** | 現状のgrillage結果は荷重を反映しない | load配分（部材分布荷重）・combination実行のContract設計 |
| B7 | stress/strainは未算出（member end forcesまで） | 設計checkはσ=M/Z等で別途導出（意図的層分離） | result出力範囲の契約 |
| B8 | IF3 stalenessはframe binding内で堅牢 | 良好（ただしDocument→frame binding連動は未設計） | KEEP・Document連動の正式設計 |

## 7. tests / check 実測（Step B時点）

- backend全tests：**1077 passed**（11.71s）
- FEM core：81 passed（grillage/eigen/influence/moving_load/response_spectrum/verification cases/result schema）
- frontend typecheck：PASS
- frontend（if3/results/api/verification）：86 passed / （apollo workflow/substructure/bridgeDefinition）：485 passed
