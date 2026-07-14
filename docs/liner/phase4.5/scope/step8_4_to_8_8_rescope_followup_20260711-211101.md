Let me now read all the critical files in parallel for the investigation.
Let me read all the critical files directly.
Let me read a few more critical files and then produce the report.
Now I have all the code evidence needed. Let me produce the report.

# Phase 4.5 Step 8.4-8.8 Follow-up Rescope

## 1. Corrected Step Boundaries

初回レポートのStep 8.4〜8.8は以下の通り再スコープする。コード根拠に基づき、各Stepの役割を明確に分離する。

| Step | 正しい範囲 | 根拠ファイル |
| --- | --- | --- |
| **8.4** | Adapter → BridgeDefinition → ProjectModel 経路の統合テスト・Golden Fixture Comparison | `adapters/fromBridgeProject.ts`, `adapters/fromLinerBridge.ts`, `generator/structuralModelGenerator.ts`, `generator/facade.ts`, `__tests__/regression.golden.test.ts`, `__fixtures__/bridgeRegressionFixtures.ts`, `__golden__/*.json` |
| **8.5** | Load / Boundary condition の正規化・ID非依存 matching・Semantic Parity | `types.ts:59-104`（LoadCase/NodalLoad/MemberLoad/MassCase）, `types.ts:158-196`（ProjectModel）, `model.py`（Backend Model/Support/MemberLoad）, `assembly.py`（load vector）, `semanticParity/normalize.ts`, `semanticParity/types.ts` |
| **8.6** | Static / Dynamic / Eigen の解析結果 Parity | `results.py`, `eigen.py`, `response_spectrum.py`, `element.py`, `resultViewModel.ts`, `types.ts:212-371`（AnalysisResult/EigenResult/ResponseSpectrumResult） |
| **8.7** | JSON Serializer / CLI / Programmatic comparison runner | `frontend/package.json`, `frontend/tsconfig.json`, `scripts/`, `bridgeDefinition/semanticParity/` |
| **8.8** | UI Report viewer / Diff display | `components/ResultsPanel.tsx`, `types.ts:557`（BottomTab）, `App.tsx` |

## 2. Step 8.4 Adapter and Golden Scope

### 2.1 現状のコード経路

**Adapter経路:**
1. `BridgeProject` → `createBridgeDefinitionFromBridgeProject()` (`fromBridgeProject.ts:82-150`) → `BridgeDefinition`
   - loads は `mapLoads()` (`:407-425`) で `BridgeDefinitionLoad[]` に変換
   - supports は `mapSupports()` (`:259-290`) で span境界から自動生成
   - **LinBridge adapter** (`fromLinerBridge.ts:87-153`): `loads: []` を返す（**荷重未マッピング**）

2. `BridgeDefinition` → `createStructuralModelFromBridgeDefinition()` (`structuralModelGenerator.ts:198-333`) → `ProjectModel`
   - `buildLoads()` (`:536-668`) で `self_weight` → nodalLoads, `vehicle` → nodalLoads, `distributed` → memberLoads に変換
   - `temperature` type は **skip**（`:154-156` diagnostic warning: "BD_SM_UNSUPPORTED_LOAD_TYPE"）
   - `node` target は **未実装**（`:173-180` diagnostic warning: "BD_SM_UNSUPPORTED_LOAD_TARGET"）
   - `orientationVector` は全member `{x:0, y:0, z:1}` で固定（`:396`）
   - massCases, groundMotions は **生成されない**

3. Facade (`facade.ts:50-86`): `generateStructuralModel()` は BridgeProject → BridgeDefinition → ProjectModel をラップし、legacy count 比較（`compareCounts()`）を追加

**既存Golden Regression (`regression.golden.test.ts`):**
- 6 fixture: `single-span-simple`, `two-span-continuous`, `three-span-continuous`, `curved-radius`, `asymmetric-supports`, `multiple-loads`
- 比較内容: `legacy.summary` vs `bridgeDefinition.summary` + `RegressionDiff`（`regressionHelpers.ts:99-167`）
- **問題点:** node ID依存比較（`legacyNodes.get(node.id)`）。legacyとBDでnode IDが異なるため、`nodeCoordinateMismatches` は ID一致ノードのみ比較
- Golden format: `__golden__/{fixture}.json` — `normalizePayload()` (`:32-39`) は `generatedAt` を置換、`-0` を `0` に正規化
- **deterministic sorting:** `generatedAt` 以外のUUID/日時排除は `normalizePayload` で対応済み。node ordering は IDに依存

### 2.2 normalizeProjectModelForSemanticParity の接続候補

`normalizeProjectModelForSemanticParity` (`normalize.ts:203-232`) の入力は `ProjectLike = Pick<ProjectModel, "nodes"|"members"|"supports"|"sections"> & Partial<...>`:

```typescript
// normalize.ts:17
type ProjectLike = Pick<ProjectModel, "nodes" | "members" | "supports" | "sections"> &
  Partial<Pick<ProjectModel, "materials" | "units">>;
```

**接続すべき adapter 候補:**
1. **BridgeDefinition adapter output** → `structuralModelGenerator.ts` で生成された `ProjectModel` を直接渡す（既に ProjectModel 形式）
2. **Legacy generator output** → `backend/engine/bridge_fem_generator.py` が生成するproject dictをJSON parseしてProjectModelとして渡す
3. **LINER importer** → `fromLinerBridge()` → generator 経路も同様

**現状の不足:**
- `normalizeProjectModelForSemanticParity` は `loadCases`, `nodalLoads`, `memberLoads` を **正規化しない**（`ProjectLike` 型が含んでいない）
- `analysisResults` も対象外
- `massCases` も対象外

### 2.3 比較すべき最小経路

```
BridgeProject
  ├─→ Legacy Generator (bridge_fem_generator.py) → project dict → JSON.parse → ProjectModel_A
  └─→ fromBridgeProject() → BridgeDefinition → structuralModelGenerator() → ProjectModel_B
       └─→ compareSemanticParity(ProjectModel_A, ProjectModel_B)
```

`facade.ts:62-65` の `compareCounts()` は count 比較のみ。semantic parity には `compareSemanticParity()` を接続すべき。

### 2.4 Golden Fixture として追加/変更すべきファイル

| ファイル | 変更内容 |
| --- | --- |
| `__golden__/*.json` | step8.1 spec §11 の方針に従い、**段階移行**。現状維持 + `semantic-parity/{fixture}.report.json` を並行生成 |
| `__fixtures__/bridgeRegressionFixtures.ts` | P0 fixture 追加: `self-weight-only`, `support-type-variation`, `modal-analysis-case` |
| `regressionHelpers.ts` | `compareStructuralModels()` に `compareSemanticParity()` 結果を追加。ID非依存比較を併記 |
| `regression.golden.test.ts` | parity report snapshot assertion を追加 |

**deterministic sorting / UUID排除方針:**
- `normalizePayload()` (`regression.golden.test.ts:32-39`): `generatedAt` → `<generated>`, `-0` → `0`
- Node/Member ordering: semantic key で sort 後比較（`normalize.ts:74,127` の sort 処理と整合）
- UUID: generator は `N1, N2, ...` 形式を採用（`structuralModelGenerator.ts:241`）。legacy は `N_BC_{xi}_{yi}` 形式。**ID は比較対象外**

### 2.5 Step 8.4 タスク・非スコープ・Acceptance Criteria

**タスク:**
- T8.4.1: `semanticParity/normalize.ts` の `ProjectLike` を `loadCases`, `nodalLoads`, `memberLoads` を含むように拡張
- T8.4.2: `normalizedLoads()` 関数新規作成。load case 集合・総荷重・方向の正規化
- T8.4.3: `compareNormalizedModels()` に load parity チェーンを接続
- T8.4.4: P0 fixture（`self-weight-only`, `support-type-variation`）追加
- T8.4.5: `regressionHelpers.ts` に `compareSemanticParity()` 呼出を追加
- T8.4.6: `semantic-parity/{fixture}.report.json` の snapshot 保存・test assertion

**非スコープ:**
- solver 実行（Step 8.6）
- eigen/RS 解析結果比較（Step 8.6）
- `temperature` load 対応（型のみ）
- LINER adapter の荷重マッピング

**Acceptance Criteria:**
- `compareSemanticParity()` が Legacy と BD 出力に対して `status: "equivalent" | "different"` を返す
- load case 集合比較（M015）が機能する
- 総荷重比較（M016）が機能する
- 既存 golden test が全てパスする

**DoD:** typecheck pass, 既存test pass, 新parity test pass
**PR境界:** `semanticParity/` 内の変更のみ。既存 golden JSON は変更しない

## 3. Step 8.5 Load and Boundary Scope

### 3.1 実装済みの load / support / boundary 項目

**Frontend (`types.ts`):**
| 型 | フィールド | 用途 |
| --- | --- | --- |
| `LoadCase` (`:59-63`) | `id, name, type:"static"` | static のみ。eigen/RS/timeHistory は `analysisSettings` 内 |
| `NodalLoad` (`:65-75`) | `id, loadCaseId, nodeId, fx/fy/fz/mx/my/mz` | 6DOF 節点荷重 |
| `MemberLoad` (`:77-86`) | `id, loadCaseId, memberId, coordinateSystem:"local"|"global", type:"uniform", wx/wy/wz` | **uniform のみ**。non-uniform 未実装 |
| `MassItem` (`:88-96`) | `nodeId, mx/my/mz/irx/iry/irz` | 節点質量 + 慣性モーメント |
| `MassCase` (`:98-104`) | `id, name, method:"lumped", source:"manual", items[]` | lumped のみ |
| `Support` (`:49-57`) | `nodeId, ux/uy/uz/rx/ry/rz` | 6DOF boolean fixity |

**Backend (`model.py`):**
| 型 | フィールド | 検証 |
| --- | --- | --- |
| `NodalLoad` (`:93-103`) | 同上 | `finite()` 各成分（`:421-422`） |
| `MemberLoad` (`:106-115`) | 同上 | `type="uniform" のみ`（`:438-443`）、`coordinateSystem ∈ {local, global}`（`:444-449`） |
| `Support` (`:75-83`) | 同上 | boolean のみ |
| `MassCase` (`:129-135`) | `method:"lumped"`, `source:"manual"` のみ | `:454-485` |
| `AnalysisSettings` (`:138-148`) | eigen/influence/responseSpectrum/timeHistory を dict で保持 | 型安全性低い |

**BridgeDefinition (`types.ts:134-148`):**
- `BridgeDefinitionLoad.type`: `"self_weight" | "distributed" | "vehicle" | "temperature"`
- `BridgeDefinitionLoad.direction`: `"X" | "Y" | "Z" | "-X" | "-Y" | "-Z"`
- `BridgeDefinitionLoad.target`: `{kind: "girder"|"deck"|"node"|"line", refId}`

### 3.2 未実装・型のみの項目

| 項目 | 現状 | 型の有無 |
| --- | --- | --- |
| Spring stiffness | 未実装 | Support は boolean のみ。spring constant なし |
| Member release | 未実装 | Member に release フィールドなし |
| Temperature load | BridgeDefinition 型に `"temperature"` があるが、generator で skip（`structuralModelGenerator.ts:154-156`） | 型のみ |
| Imposed displacement | 未実装 | NodalLoad に displacement なし |
| Non-uniform distributed load | 未実装 | MemberLoad は `type:"uniform"` のみ（`types.ts:82`） |
| Load combination | 未実装 | LoadCase に combination 項目なし |
| Body load (inertia) | 未実装 | MassCase は lumped のみ |
| Self-weight | generator で nodalLoads に変換（`structuralModelGenerator.ts:570-597`）。solver の `f_equiv_local_by_case` で self-weight として処理 | 実装済み |
| Load direction | direction→components 変換（`structuralModelGenerator.ts:819-832`） | 実装済み |
| Local/global basis | MemberLoad に `coordinateSystem` あり。`assembly.py:102-105` で global→local 変換 | 実装済み |
| Impact factor | `applyImpactFactor()` (`structuralModelGenerator.ts:834-838`) | 実装済み |

### 3.3 正規化・ID非依存 matching の方針

**Load matching:**
- load case は `id` でなく `name` + `type` で semantic matching
- nodalLoad は `nodeId`（semantic node matching 後の key）+ `direction components` で matching
- memberLoad は `memberId`（semantic member matching 後の endpoint key）+ `direction` で matching
- 総荷重 ΣF は scalar 比較（relTol 1e-6）

**Support matching:**
- 既存: `supportParity.ts` は boolean fixity 比較のみ
- 追加必要: spring constant は未実装のため **現時点では不要**
- station + transverse position での semantic matching（`nodeMatching.ts` に統合）

### 3.4 undefined vs 0, absent vs zero の扱い

| 概念 | フロントエンド | バックエンド | 比較方針 |
| --- | --- | --- | --- |
| undefined load | `nodalLoads: []` は空配列 | `data.get("nodalLoads", [])` = `[]` | 空配列 vs 空配列 = equivalent |
| 0 力 | `fx: 0` は明示的 | 同上 | 値 0 として比較 |
| 未計算 result | `analysisResults: undefined` | `analysisResults = None` | Step 8.6 で扱う |
| 未設定 mass | `massCases: []` は空配列 | `data.get("massCases", [])` = `[]` | 質量未設定 = WARNING |
| load case ID/name | `LoadCase.id` は文字列 | 同上 | name + type で matching。ID は無視 |

### 3.5 Step 8.5 タスク・非スコープ・Acceptance Criteria

**タスク:**
- T8.5.1: `NormalizedModel` に `loadCases`, `nodalLoads`, `memberLoads` を追加（`types.ts`）
- T8.5.2: `normalize.ts` に `normalizeLoads()` 関数追加。load case の semantic key 生成
- T8.5.3: `loadParity.ts` 新規。load case 集合・総荷重・方向の比較関数
- T8.5.4: `boundaryParity.ts` は `supportParity.ts` を拡張。spring/rotation 非依存の fixity 比較
- T8.5.5: `compareNormalizedModels()` に load parity チェーン追加
- T8.5.6: ParityMismatch category に `"load"`, `"boundary"` を追加
- T8.5.7: `ParityMetrics` に `load`, `boundary` を追加
- T8.5.8: test fixture（load を含む）で `compareSemanticParity()` を検証

**非スコープ:**
- Spring stiffness（未実装）
- Member release（未実装）
- Non-uniform distributed load（未実装）
- Load combination（未実装）
- Temperature load（型のみ、generator 未対応）

**Acceptance Criteria:**
- M015（load case set equivalence）: PASS
- M016（total applied load）: PASS
- M017（load direction）: PASS
- M012（support station alignment）: PASS
- M013（support condition semantics）: PASS

**DoD:** typecheck pass, 既存test pass, load parity test pass, M012-M017 検証済み
**PR境界:** `semanticParity/` 内のみ。`NormalizedModel` と `ParityReport` の型拡張を含む

## 4. Step 8.6 Result Parity Scope

### 4.1 既存 result 型・生成箇所・保存箇所

| Result 型 | 生成箇所（backend） | 保存箇所（ProjectModel） | UI 参照箇所 |
| --- | --- | --- | --- |
| Static displacement | `results.py:40-54` | `AnalysisResult.displacements` | `resultViewModel.ts:183-188` |
| Static reaction | `results.py:55-74` | `AnalysisResult.reactions` | `resultViewModel.ts:189` |
| Member end force | `results.py:75-88` | `AnalysisResult.memberEndForces` | `resultViewModel.ts:190-209` |
| Eigenvalue/frequency/period | `eigen.py:149-163` | `AnalysisResult.eigenResult` | `resultViewModel.ts:284-321` |
| Mode shape | `eigen.py:310-319` | `eigenResult.modes[].shape` | `resultViewModel.ts:319` |
| Participation factor | `eigen.py:367-377` | `eigenResult.modes[].participationFactors` | `resultViewModel.ts:306-308` |
| Effective modal mass | `eigen.py:335-349,380-392` | `eigenResult.modes[].effectiveMassRatios` | `resultViewModel.ts:311-313` |
| Response spectrum | `response_spectrum.py:165-251` | `AnalysisResult.responseSpectrumResult` | `resultViewModel.ts:331-415` |
| Response spectrum member force | `response_spectrum.py:689-752` | `responseSpectrumResult.modalResults[].memberSectionForces` | `resultViewModel.ts:444-467` |
| Influence line | `influence.py` | `AnalysisResult.influenceResult` | `resultViewModel.ts:235-282` |
| Time history | `time_history_analysis.py` | `ProjectModel.analysisResults.timeHistory`（**永続化**） | `ResultsPanel.tsx:191-197` |
| Moving load | `moving_load.py` | `AnalysisResult.movingLoadResult` | `ResultsPanel.tsx:411-449` |

**永続化の区別:**
- **ProjectModel に永続化:** `timeHistory` のみ（`types.ts:189-191`: `analysisResults?: { timeHistory?: TimeHistoryResult | null; }`）
- **React state / API response のみ:** static, eigen, responseSpectrum, influence, movingLoad

### 4.2 Solver 実行なしの golden fixture test vs solver 実行ありの integration test

**両方必要:**

| テスト種別 | 目的 | 実装方法 | 既存 |
| --- | --- | --- | --- |
| **Golden fixture test（solver 不要）** | 入力→ProjectModel 構造の parity | `compareSemanticParity()` のみ。solver 呼出なし | 一部: `regression.golden.test.ts` |
| **Integration test（solver 必要）** | 入力→解析結果の parity | 両経路の ProjectModel を `run_analysis` / `run_eigen_analysis` に投入し、結果を比較 | **未実装** |

**Integration test の実装方法:**
1. `regressionHelpers.ts:81-93` の `generateLegacyStructuralModel()` は Python を `execFileSync` で呼ぶ
2. 新経路の `createStructuralModelFromBridgeDefinition()` で ProjectModel を生成
3. 両方の ProjectModel を `POST /api/analysis/run` に送信（または直接 solver 呼出）
4. 結果を `compareAnalysisResults()` で比較

### 4.3 Missing result / solver failure / NaN/Infinity の扱い

| ケース | Backend の扱い | Frontend の扱い |
| --- | --- | --- |
| Solver failure | `error_result()` (`errors.py`) で `status: "failed"` | `result.errors.length > 0` → 表示なし (`resultViewModel.ts:180`) |
| NaN/Infinity | `clean()` (`results.py:21-26`) で `AnalysisError` を投げる | 到達しない |
| 未計算 | `analysisResults: undefined` | `result === null` → empty state (`ResultsPanel.tsx:139`) |
| Warning | `status: "warning"` | 表示あり |

### 4.4 Step 8.6 タスク・Acceptance Criteria

**タスク:**
- T8.6.1: `ParityMetrics` に `staticResult`, `eigenResult` を追加
- T8.6.2: `compareAnalysisResults()` 関数新規。displacements, reactions, memberEndForces の比較
- T8.6.3: `compareEigenResults()` 関数新規。eigenvalue, period, modal mass の比較
- T8.6.4: Integration test fixture 追加。solver 実行ありの parity test
- T8.6.5: result snapshot の golden 形式定義

**Acceptance Criteria:**
- M020-M023（static response）: PASS
- M025-M028（dynamic response）: PASS with tolerance
- NaN/Infinity は test で発生しないことの確認

**非スコープ:**
- MAC (Modal Assurance Criterion) 計算
- Response spectrum の directionResults 比較
- Moving load / influence line の parity

## 5. Member Force and Coordinate Convention

### 5.1 Backend end force convention

**`results.py:75-88`:**
```python
for state in assembly.element_states:
    transform = transformation(state.rotation)
    u_local = transform @ u_full[state.dofs]
    equiv = state.f_equiv_local_by_case.get(case.id, np.zeros(12, dtype=float))
    forces = state.k_local @ u_local - equiv  # ← local座標で計算
    # forces[:6] = I端, forces[6:] = J端
    # mapping: [fx, fy, fz, mx, my, mz]
```

**Local axis construction (`element.py:10-37`):**
```python
x_axis = (J - I) / length          # member 軸方向
candidate = orientation_array(...)  # orientationVector または global_z
y_axis = Gram-Schmidt(candidate, x_axis)
z_axis = cross(x_axis, y_axis)
rotation = [x_axis, y_axis, z_axis]
```

- **orientationVector default**: generator は全 member `{x:0, y:0, z:1}` を設定（`structuralModelGenerator.ts:396`）
- **local axis**: x = member軸, y = orientation vector の Gram-Schmidt 成分, z = cross(x,y)
- **I/J reversal**: `canonicalEndpointKey()` (`normalize.ts:38-40`) で `[keyI, keyJ].sort()` し、endpoint の順序を正規化

### 5.2 Frontend section-force conversion

**`resultViewModel.ts:190-209`:**
```typescript
const rawI = row.i[componentMap[component]];
const i = rawI === 0 ? 0 : -rawI;  // ← I端は負符号
const j = row.j[componentMap[component]];  // ← J端はそのまま
```

- `componentMap`: `N→fx, Qy→fy, Qz→fz, Mx→mx, My→my, Mz→mz`
- **I端のみ負符号**: element force (node に作用する力) を internal section force に変換するため
- J端はそのまま（element force の J端は既に section force と同符号）

### 5.3 反力 sign

**`results.py:47`:**
```python
reaction_full = assembly.stiffness @ u_full - f_full
```
- 反力 = K*u - F。支点での reaction は正方向が DOF 正方向

### 5.4 Response spectrum member section force

**`response_spectrum.py:689-752`:**
- `forces = state.k_local @ u_local`（equiv なし）
- station 0.0 = I端, station 1.0 = J端
- N, My, Mz のみ出力（Qy, Qz, Mx は **未出力**）
- 符号は element force のまま（section force 変換なし）

### 5.5 Canonical convention 案

| 場所 | Convention | 根拠 |
| --- | --- | --- |
| Backend 計算 | local座標。x=member軸, y=cross(z,x) 方向, z=cross(x,y) | `element.py:33-36` |
| Backend 出力 | local座標の element end force。I端[:6], J端[6:] | `results.py:85-86` |
| Frontend 表示 | I端は負符号変換。J端はそのまま | `resultViewModel.ts:196-197` |
| Parity 比較 | **backend の local座標出力** を canonical とし、frontend の負符号変換を正規化 | — |

### 5.6 コード根拠で確定したこと

- Backend は `k_local @ u_local - equiv` で local 座標の element end force を計算（`results.py:79`）
- Frontend は I端力のみ `-rawI` で負符号（`resultViewModel.ts:196`）
- local axis は orientationVector と Gram-Schmidt で構築（`element.py:26-36`）
- orientationVector default は `{x:0, y:0, z:1}`（`structuralModelGenerator.ts:396`）

### 5.7 Fixture実測が必要なこと

- I/J reversal 時の local axis 方向変化（orientationVector がmember軸と平行な場合）
- 反力の符号が global 座標系と一致することの検証
- Response spectrum の section force が 3成分のみ出力であることの影響

### 5.8 仕様 blocker として隔離すべきこと

- Response spectrum の `compute_member_section_forces()` は N, My, Mz のみ。Qy, Qz, Mx は未出力。parity で全6成分を要求すると **FAIL** するため、現状では N/My/Mz のみ比較すべき

## 6. Step 8.7 CLI and JSON Contract Scope

### 6.1 追加依存なしで可能な案

| 案 | 方法 | 実現可能性 |
| --- | --- | --- |
| **Node ESM script** | `node --input-type=module` + inline import | `tsconfig.json` は `"module":"ESNext"`, `"noEmit":true`。**tsc は出力しない** |
| **Vite build + Node** | `tsc -b` で typecheck 後、`vite build --lib` で JS 出力 | **vite は library build 未設定**。config変更が必要 |
| **Python helper** | Python で JSON 比較スクリプト | `scripts/` に追加可能。backend venv を利用 |
| **Vitest runner** | `vitest run` で comparison を実行 | **既に使用中**。`npm run test` |
| **`tsc` output** | `tsc --outDir dist` で JS 出力 | `noEmit: true` を一時的に変更。**推奨しない** |

### 6.2 package追加が必要な案

| パッケージ | 用途 | 推奨度 |
| --- | --- | --- |
| `tsx` | TypeScript を直接実行 | 中。`npx tsx script.ts` |
| `ts-node` | 同上 | 低。メンテナンス問題 |
| `esbuild` | TypeScript → JavaScript 変換 | 中。高速 |

### 6.3 推奨CLI方式

**推奨: Python helper スクリプト (`scripts/compare_parity.py`)**

根拠:
- Python は既に backend venv にインストール済み
- `regressionHelpers.ts:81-93` は既に Python を `execFileSync` で呼んでいる
- JSON 読み書きが標準ライブラリで可能
- CI で追加ツール不要

**代替: Vitest テスト runner**

根拠:
- `vitest run` は既に `npm run test` で使用中
- `vitest.regression.config.ts` が既に存在
- parity comparison を test 内で実行可能

### 6.4 stdout/stderr/exit code

```bash
# Python helper
python scripts/compare_parity.py left.json right.json --output report.json
# stdout: JSON report, stderr: errors, exit: 0 (pass) / 1 (fail)

# Vitest runner
npm run test -- --run src/bridgeDefinition/__tests__/parityRegression.test.ts
# stdout: vitest output, stderr: vitest errors, exit: 0/1
```

### 6.5 短い実装 spike が必要なこと

- Vite library build の設定（`vite.config.ts` の `build.lib` セクション追加）
- Node ESM での TypeScript import（`--loader` オプション）
- CI pipeline での parity check 統合

## 7. Step 8.8 UI Integration Scope

### 7.1 ResultsPanel tab案 vs ModelComparisonWorkspace案

**案A: ResultsPanel に tab 追加**
- 現状: `BottomTab = "results" | "howToRead" | "timeHistory" | "errors" | "warnings" | "logs"` (`types.ts:557`)
- 拡張: `"parity"` を追加
- state: `App.tsx:98` で `useState<BottomTab>("results")`
- メリット: 最小侵襲。state owner 変更なし
- デメリット: large report に非最適

**案B: 新規 ModelComparisonWorkspace コンポーネント**
- 新規 route `/compare` として追加
- メリット: 専用UI。large report 向け
- デメリット: routing 追加、state 分散、i18n 追加

**推奨: 案A（ResultsPanel tab追加）** — 最小侵襲。既存構造に統合容易

### 7.2 必要ファイル・Component tree

```
ResultsPanel.tsx
  ├─ tabs 追加: { key: "parity", label: "Parity Report" }
  ├─ activeTab === "parity" 時:
  │    ├─ ParityReportPanel.tsx（新規）
  │    │    ├─ ParityMetricsSummary（既存 ParityMetrics 表示）
  │    │    ├─ ParityMismatchTable（mismatches 列挙）
  │    │    └─ ParityExportButton（JSON export）
  │    └─ ParityComparePanel.tsx（新規）
  │         ├─ Left/Right file import
  │         └─ compareSemanticParity() 呼出
  └─ JSON import/export: File upload + JSON.stringify download
```

### 7.3 UI state

- parity report は `ResultsPanel` の local state に保持
- `project` と `result` は既存 props から取得
- 左右の比較対象は file import で入力

### 7.4 Acceptance Criteria

- parity tab が `BottomTab` に追加される
- `compareSemanticParity()` が両 ProjectModel を受け取り ParityReport を返す
- JSON export が機能する
- 既存 tab に影響しない

**DoD:** typecheck pass, 既存test pass, parity UI が表示される
**PR境界:** `ResultsPanel.tsx`, `types.ts`（BottomTab 拡張）, 新規 parity コンポーネント

## 8. Corrected Task Breakdown

### Step 8.4: Adapter / Golden / Deterministic Fixture

| Task | Files | Types/Functions | Dependencies | Size | Acceptance |
| --- | --- | --- | --- | --- | --- |
| T8.4.1 Normalize loads | `semanticParity/normalize.ts`, `semanticParity/types.ts` | `NormalizedLoadCase`, `NormalizedNodalLoad`, `normalizeLoads()` | — | S | load 正規化後 sorted key |
| T8.4.2 Load parity | `semanticParity/loadParity.ts` (new) | `compareLoadParity()` | T8.4.1 | M | M015-M017 PASS |
| T8.4.3 ParityReport 拡張 | `semanticParity/types.ts`, `semanticParity/compare.ts` | `load` in `ParityMetrics`, `load` in `SemanticParityCategory` | T8.4.2 | S | typecheck pass |
| T8.4.4 P0 fixture | `__fixtures__/bridgeRegressionFixtures.ts` | `selfWeightOnly`, `supportTypeVariation` | — | S | fixture 生成可能 |
| T8.4.5 Regression helpers 拡張 | `__tests__/regressionHelpers.ts` | `compareSemanticParity()` 呼出 | T8.4.3 | S | parity report 統合 |
| T8.4.6 Golden snapshot | `__tests__/regression.golden.test.ts`, `__golden__/` | snapshot assertion | T8.4.5 | S | test pass |
| Parallelizable: T8.4.1/T8.4.4 parallel, T8.4.2 → T8.4.3 → T8.4.5 → T8.4.6 sequential |

### Step 8.5: Load / Boundary Semantic Parity

| Task | Files | Types/Functions | Dependencies | Size | Acceptance |
| --- | --- | --- | --- | --- | --- |
| T8.5.1 NormalizedModel load fields | `semanticParity/types.ts` | `NormalizedLoadCase`, `NormalizedNodalLoad`, `NormalizedMemberLoad` | — | S | 型定義 |
| T8.5.2 normalizeLoads 実装 | `semanticParity/normalize.ts` | `normalizeLoadCases()`, `normalizeNodalLoads()`, `normalizeMemberLoads()` | T8.5.1 | M | sort key 確定 |
| T8.5.3 loadParity 実装 | `semanticParity/loadParity.ts` | `compareLoadParity()` | T8.5.2 | M | M015-M017 PASS |
| T8.5.4 boundaryParity 拡張 | `semanticParity/supportParity.ts` | 拡張不要（boolean fixity のみ） | — | XS | 既存 PASS |
| T8.5.5 compare 統合 | `semanticParity/compare.ts` | `load` チェーン追加 | T8.5.3 | S | 統合 PASS |
| T8.5.6 ParityMetrics 拡張 | `semanticParity/types.ts` | `load: LoadParitySummary`, `boundary` | T8.5.1 | S | typecheck |
| T8.5.7 テスト | `semanticParity/__tests__/loadParity.test.ts` (new) | test cases | T8.5.3 | M | 全 test pass |
| Parallelizable: T8.5.1/T8.5.4 parallel, T8.5.2 → T8.5.3 → T8.5.5 sequential |

### Step 8.6: Analysis Result Parity

| Task | Files | Types/Functions | Dependencies | Size | Acceptance |
| --- | --- | --- | --- | --- | --- |
| T8.6.1 Result parity types | `semanticParity/types.ts` | `StaticResultParity`, `EigenResultParity` | — | S | 型定義 |
| T8.6.2 compareStaticResults | `semanticParity/resultParity.ts` (new) | `compareDisplacements()`, `compareReactions()`, `compareMemberEndForces()` | T8.6.1 | L | M020-M023 PASS |
| T8.6.3 compareEigenResults | `semanticParity/resultParity.ts` | `compareEigenModes()` | T8.6.1 | M | M025-M028 PASS |
| T8.6.4 Integration test | `__tests__/parityIntegration.test.ts` (new) | solver 呼出ありの parity test | T8.6.2, T8.6.3 | L | test pass |
| T8.6.5 Result golden | `__golden__/result-*.json` | result snapshot | T8.6.4 | M | snapshot pass |
| Parallelizable: T8.6.1 alone, T8.6.2/T8.6.3 parallel → T8.6.4 → T8.6.5 |

### Step 8.7: JSON Serializer / CLI

| Task | Files | Types/Functions | Dependencies | Size | Acceptance |
| --- | --- | --- | --- | --- | --- |
| T8.7.1 JSON serializer | `semanticParity/serializer.ts` (new) | `serializeParityReport()`, `deserializeParityReport()` | — | S | round-trip pass |
| T8.7.2 CLI script | `scripts/compare_parity.py` (new) | Python CLI, stdout JSON | T8.7.1 | M | CLI 実行可能 |
| T8.7.3 npm script | `frontend/package.json` | `"parity:check"` | T8.7.2 | XS | `npm run parity:check` |
| T8.7.4 CI integration | CI config | parity check step | T8.7.3 | S | CI pass |
| Parallelizable: T8.7.1/T8.7.2 parallel → T8.7.3 → T8.7.4 |

### Step 8.8: UI Report Viewer / Diff Display

| Task | Files | Types/Functions | Dependencies | Size | Acceptance |
| --- | --- | --- | --- | --- | --- |
| T8.8.1 BottomTab 拡張 | `types.ts` | `"parity"` in `BottomTab` | — | XS | typecheck |
| T8.8.2 ParityReportPanel | `components/ParityReportPanel.tsx` (new) | ParityReport 表示 | T8.8.1 | M | UI 表示 |
| T8.8.3 JSON import/export | `components/ParityReportPanel.tsx` | File upload, JSON download | T8.8.2 | S | import/export 機能 |
| T8.8.4 ResultsPanel 統合 | `components/ResultsPanel.tsx` | tab 追加, conditional render | T8.8.2 | S | tab 切替 |
| T8.8.5 テスト | `components/ParityReportPanel.test.tsx` (new) | render test | T8.8.2 | S | test pass |
| Parallelizable: T8.8.1 alone, T8.8.2 → T8.8.3/T8.8.4 parallel → T8.8.5 |

## 9. Corrected Critical Path and PR Plan

### Critical Path

```
Step 8.4 (T8.4.1→T8.4.2→T8.4.3→T8.4.5→T8.4.6)
  ↓
Step 8.5 (T8.5.1→T8.5.2→T8.5.3→T8.5.5→T8.5.7)
  ↓
Step 8.6 (T8.6.1→T8.6.2→T8.6.4→T8.6.5)
  ↓
Step 8.7 (T8.7.1→T8.7.2→T8.7.3→T8.7.4)  ← 並行可
Step 8.8 (T8.8.1→T8.8.2→T8.8.4→T8.8.5)  ← 並行可
```

### PR Plan

| PR | Step | 範囲 | マージ条件 |
| --- | --- | --- | --- |
| PR-8.4 | 8.4 | `semanticParity/` 内の load normalization + golden fixture | typecheck, 既存test pass, 新test pass |
| PR-8.5 | 8.5 | loadParity + boundaryParity + compare 統合 | typecheck, gate B metric PASS |
| PR-8.6 | 8.6 | resultParity + integration test | typecheck, gate C/D metric PASS |
| PR-8.7 | 8.7 | CLI + serializer + npm script | typecheck, CLI 実行可能 |
| PR-8.8 | 8.8 | UI parity tab + ParityReportPanel | typecheck, UI 表示確認 |

## 10. Remaining Blockers and Decisions

### Blockers

| # | ブロッカー | 影響する Step | 解消方法 |
| --- | --- | --- | --- |
| B1 | Response spectrum の `compute_member_section_forces()` は N/My/Mz のみ（Qy/Qz/Mx 未出力） | 8.6 | parity で全6成分比較時に skip。仕様で「N/My/Mz のみ」と明記 |
| B2 | Legacy generator と new generator で node ID 名前空間が異なる | 8.4, 8.5 | ID非依存 matching で回避。既に `normalize.ts` で実装済み |
| B3 | `fromLinerBridge()` は loads を空配列で返す | 8.4 | LINER adapter 拡張は別スコープ。現状では BridgeProject adapter 経路のみ検証 |
| B4 | `temperature` load は generator で skip | 8.5 | 現状では parity 比較対象外。型のみ |
| B5 | `noEmit: true` のため TypeScript → JS 変換が不可能 | 8.7 | Python helper または Vitest runner で回避 |

### Decisions

| # | 決定事項 | 理由 |
| --- | --- | --- |
| D1 | Step 8.4 の scope は adapter → golden fixture のみ。load parity は Step 8.5 | load normalization の実装を含めると Step 8.4 が肥大化 |
| D2 | CLI は Python helper を推奨 | 追加依存不要。既存 venv 利用 |
| D3 | UI は ResultsPanel tab 追加で実装 | 最小侵襲。既存 state owner 利用 |
| D4 | result parity は Backend の local 座標出力を canonical とする | Frontend の負符号変換は UI 表示専用 |
| D5 | fixture は P0 のみ Step 8.4 で追加。P1/P2 は後続 | 進捗優先 |

FOLLOWUP_RESCOPE_VERDICT: PASS
FOLLOWUP_RESCOPE_REASON: 既存コードの全経路を確認し、Step 8.4-8.8 の正しい範囲・タスク・acceptance criteria を根拠付きで定義した
