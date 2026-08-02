# Phase A+ — 04 解析器同一性・物理契約（Solver Identity & Physical Contract）

**Authority:** Phase A+（P3）
**Date:** 2026-08-02
**対象ブロッカー:** PA-OQ-009（解析方式・解析器物理契約未確定）/ GATE-NR-02（解析器機械証跡不足）
**Integration base:** Phase A `04_analysis_model_rules.md`（A4）、DS-06（`docs/apollo/design-standards/06_analyzer/`）、phase1 再凍結 §5.4
**方法:** 既存コード閲覧・既存テスト実行（read-only）。application code は変更しない。

本ファイルはリポジトリ内 solver の**同一性と物理契約**をコード・テスト観察から凍結する。外部 APOLLO Analyzer / SPACER の契約は従来通り `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` であり、本観察を外部製品へ移転しない。

---

## 1. 解析器同一性レジスタ（コード観察）

Phase A A4 §2（AN-ID-001..007）を再確認した。コード上で追加確認できた範囲を追記する。

| ID | 名称 | 実体（コード観察） | 状態 |
|----|------|--------------------|------|
| AN-ID-001 | リポジトリ Python 線形静的解 | `backend/engine/`（`solver.py`/`assembly.py`/`element.py`/`dof.py`/`model.py`/`results.py`） | `PROJECT_SPECIFIC`（CONFIRMED_BY_CODE + CONFIRMED_BY_TEST） |
| AN-ID-002 | FastAPI 解析アダプタ | `backend/app/main.py` `POST /api/analysis/run`（APP_VERSION `0.3.0-preview`） | `PROJECT_SPECIFIC` |
| AN-ID-003 | IF3 正規化・永続化 | `if3_normalizer.py` / `if3_persistence.py` / `if3_checksum.py` / `if3_staleness.py`（IF3_SCHEMA_VERSION `0.1.0`） | `PROJECT_SPECIFIC` |
| AN-ID-004 | 歴史的 APOLLO Analyzer | 外部製品 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-005 | SPACER 製品シェル | 外部製品 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-006 | SPACER STATICS モジュール | 外部製品 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AN-ID-007 | フロントエンド fake 解析 | 未実装プレースホルダ | `REFERENCE_ONLY` |

追加の解析モジュール（同一リポジトリ内）:

| モジュール | 機能 | 状態 |
|-----------|------|------|
| `eigen.py` | 固有値解析 | `PROJECT_SPECIFIC`（既存テスト PASS） |
| `influence.py` | 影響線解析 | `PROJECT_SPECIFIC`（既存テスト PASS） |
| `moving_load.py` | 移動荷重解析 | `PROJECT_SPECIFIC`（既存テスト PASS） |
| `response_spectrum.py` | 応答スペクトル解析 | `PROJECT_SPECIFIC`（既存テスト PASS） |
| `time_history_*.py` | 時刻歴解析（Newmark 平均加速度法） | `PROJECT_SPECIFIC`（既存テスト PASS） |
| `mass.py` | 集中質量 | `PROJECT_SPECIFIC`（既存テスト PASS） |

`solverName` は IF3 で `scipy_sparse` / `newmark_beta` の 2 種がサポートされる（`if3_staleness.SUPPORTED_SOLVER_NAMES`）。線形静的解の `solverVersion` は SemVer で `0.3.x` がサポート対象（`SUPPORTED_SOLVER_VERSION_PATTERN = ^0\.3\.`）。

---

## 2. 入力モデル契約（CONFIRMED_BY_CODE）

`backend/engine/model.py` の `Model` データクラス・`parse_model`・`validate_model` から観察。

| 要素 | フィールド | 制約（コード観察） |
|------|-----------|--------------------|
| project | `id` / `name` / `schemaVersion` | `schemaVersion` 既定 `1.0.0` |
| nodes | `id` / `x` / `y` / `z` / `label` | 座標は有限値必須。ID 一意 |
| materials | `id` / `elasticModulus` / `shearModulus` / `poissonRatio` / `density` | E・G は正の有限値。ν は `-1 < ν < 0.5`。G 省略時は `G = E / (2(1+ν))` |
| sections | `id` / `area` / `iy` / `iz` / `j` | 全て正の有限値。断面は等方性・断面主軸前提のプリズム部材 |
| members | `id` / `nodeI` / `nodeJ` / `materialId` / `sectionId` / `orientationVector` または `orientationNode` | I/J は既存 node 参照必須。長さ 0 禁止。orientationVector と orientationNode の同時指定禁止 |
| supports | `nodeId` / `ux` / `uy` / `uz` / `rx` / `ry` / `rz` | nodeId 参照必須。拘束は真偽値で指定 |
| loadCases | `id` / `name` / `type` | ID 一意 |
| nodalLoads | `loadCaseId` / `nodeId` / `fx` / `fy` / `fz` / `mx` / `my` / `mz` | 有限値。loadCaseId/nodeId 参照必須 |
| memberLoads | `loadCaseId` / `memberId` / `coordinateSystem`(local/global) / `type`(uniform のみ) / `wx` / `wy` / `wz` | uniform のみ。座標系は local か global |
| massCases | `id` / `name` / `method`(lumped) / `source`(manual) / `items` | lumped・manual のみ |

分析設定:

- `analysisType`: `linear_static` のみ（MVC 範囲）。`eigen`/`influence`/`responseSpectrum`/`timeHistory` は `analysisSettings` 内の独立ブロック。
- `solver`: `scipy_sparse` のみ。
- `includeShearDeformation` / `largeDisplacement`: `true` はエラー（MVC 対象外）。
- `tolerance`: 正の有限値。

---

## 3. 座標・DOF・部材ローカル系（CONFIRMED_BY_CODE）

| 面 | 観察（コード） |
|----|----------------|
| グローバル座標系 | 右手系 `(x, y, z)`。節点はグローバル座標 |
| 節点 DOF 順 | `ux, uy, uz, rx, ry, rz`（`dof.DOF_NAMES`、各節点 6 DOF） |
| 部材ローカル x 軸 | `nodeI → nodeJ` 方向（`element.length_and_rotation`） |
| ローカル y 軸 | `orientationVector`（または `orientationNode`、無指定は グローバル z を投影）。部材軸に平行な場合はエラー |
| ローカル z 軸 | `z = x × y`（右手系）、`y = z × x` で再直交化 |
| 部材端順 | I 端 6 成分 + J 端 6 成分（`member_dofs`） |
| 節点荷重順 | `fx, fy, fz, mx, my, mz` |
| 部材分布荷重 | `wx, wy, wz`（local または global）、uniform のみ |

`orientationVector` が member axis と平行な場合、`INVALID_ORIENTATION` エラー（`element.py`）。

---

## 4. 要素剛性（CONFIRMED_BY_CODE）

`element.local_stiffness`（12×12）を観察。**せん断変形なしのオイラー・ベルヌーイ梁**を仮定（`includeShearDeformation` は範囲外として拒否）。

| 成分 | 式（コード観察） |
|------|------------------|
| 軸力 | `EA/L`（DOF 0,6） |
| ねじり | `GJ/L`（DOF 3,9） |
| 曲げ yz 面 | `12EIz/L³`, `6EIz/L²`, `4EIz/L`, `2EIz/L`（DOF 1,5,7,11） |
| 曲げ zy 面 | `12EIy/L³`, `-6EIy/L²`, `4EIy/L`, `2EIy/L`（DOF 2,4,8,10） |

- 部材は等方性・断面主軸座標を前提。断面諸量 `A, Iy, Iz, J` は入力のまま使用（数値の採択は DS-03/08 ゲート対象）。
- 剛性行列は `k_global = Tᵀ k_local T` でグローバルへ変換し、CSR スパース行列へ組立（`assembly.assemble_stiffness`）。
- 非合成・合成の区別は**solver 入力に存在しない**。solver は等方性プリズム部材のみを扱い、合成断面の合成剛性・クリープ等は設計モデル層（Bridge ドメイン）の責務であり、現状未実装・未採択。

---

## 5. 荷重・解法・結果の物理契約（CONFIRMED_BY_CODE）

### 荷重ベクトル

- 節点荷重: `nodalLoads` を対応 DOF へ足し込み。
- 部材等価荷重: uniform 分布荷重を固定端相当荷重へ変換（`equivalent_uniform_load_local`）:
  - `fx = wx·L/2`, `fz = wz·L/2`
  - `fy = wy·L/2`, 端モーメント `mz = ∓wy·L²/12`
  - `fz` 側モーメント `my = ∓wz·L²/12`
- `coordinateSystem=global` の場合は `w` を部材ローカルへ変換（`rotation @ w`）してから等価荷重を計算。

### 解法（`solver.solve_model`）

1. `build_dof_map` → 全節点 6 DOF。
2. `assemble_stiffness` → CSR スパース行列。
3. `constrained_dofs` → 支持拘束 DOF。
4. 自由 DOF 部分行列 `kff` に対し `scipy.sparse.linalg.spsolve` で `u_free` を求解。
5. 拘束なし / 自由 DOF なし / 特異（`MatrixRankWarning`）→ `MODEL_UNSTABLE` エラー。
6. 求解後の非有限値検出 → `MODEL_UNSTABLE`。
7. 各 loadCase を独立求解（荷重組合せの合成は solver 外）。

### 結果（`results.build_success_result`）

- **変位**: 全節点のグローバル変位 `ux..rz`。`clean`（絶対値 < 1e-14 は 0 化）。
- **反力**: `R = K·u − f` を拘束 DOF で評価。`constrainedDofs` リスト付き。
- **部材端力**: `f_i = k_local·u_local − f_equivalent`（I 6 成分 + J 6 成分）、`coordinateSystem: local` で報告。
- 結果の envelope は `analysisSummary`（`status` / `startedAt` / `finishedAt` / `durationMs` / `nodeCount` / `memberCount` / `loadCaseCount` / `totalDof` / `freeDof` / `constrainedDof` / `solver`）+ `displacements` + `reactions` + `memberEndForces` + `warnings` + `errors`。

### 符号規約・平衡（CONFIRMED_BY_TEST）

`backend/tests/test_engine_verification_cases.py`（全 PASS）で、以下の閉形式解と一致することを確認:

| ケース | 検証点（閉形式） |
|--------|------------------|
| 片持ち梁先端集中荷重 | `uy = −PL³/(3EI)`, `rz = −PL²/(2EI)`, 固定端 `fy = P`, `mz = PL` |
| 単純支持中央集中荷重 | 中央 `uy = −PL³/(48EI)`, 両支点 `fy = P/2`, 最大曲げ `M = PL/4` |
| 単純支持等分布荷重 | 中央 `uy = −5wL⁴/(384EI)`, 支点 `fy = wL/2`, 最大曲げ `M = wL²/8` |
| 3D 片持ちねじり | `rx = TL/(GJ)`, 固定端ねじり反力 `mx = T` |
| グローバル y/z 分布荷重 | `uy` と `my`、`uz` と `mz` の対応（座標系変換の検証） |

- 負の y 方向変位・負のモーメント符号が閉形式と一致（y 下向きは負の uy となる）。
- 平衡（合力 = 反力）が反力検査で担保されている。
- 不安定モデル（支持不足・剛体モード）は `MODEL_UNSTABLE` で失敗。
- 参照不正は `INVALID_REFERENCE`、重複 ID は `DUPLICATE_ID` で失敗。

> 注: 上記の単位（kN, m, kN/m², m⁴ 等）は**テストラベル**であり、外部製品・基準への単位束縛（AN-BLK-003）ではない。solver は無次元で式を評価し、単位は入力整合の責務として呼び出し側が持つ。

---

## 6. 決定性・並行実行・再現性

| 項目 | 観察 | 状態 |
|------|------|------|
| 決定性（同一入力） | 同一入力・同一環境・同一バージョンでは同一結果が期待される（逐次実行、乱数不使用） | `PROJECT_SPECIFIC`（CONFIRMED_BY_CODE） |
| 並行実行 | solver 内に明示的な並列化なし。単一スレッドの逐次計算 | `PROJECT_SPECIFIC`（CONFIRMED_BY_CODE） |
| 浮動小数点再現性 | scipy/numpy の BLAS 依存。プラットフォーム間の bit 一致は未証明 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（再現証跡が必要） |
| 内容チェックサム | `if3_checksum.sha256_content_checksum`（canonical JSON: `sort_keys` + 区切り子 `,`/`:`、非有限値拒否） | `PROJECT_SPECIFIC`（CONFIRMED_BY_CODE） |
| solver 版管理 | `solverVersion` は SemVer 必須、`0.3.x` が IF3 サポート対象 | `PROJECT_SPECIFIC`（CONFIRMED_BY_CODE） |

- 決定性・再現性の**外部証跡**（ビルド ID、ライブラリ版、ハッシュ付き実行記録）は GATE-NR-02 の機械証跡として今後必要。現状は `READY_FOR_HUMAN_REVIEW`。

---

## 7. STALE 規則（IF3 実装 + Phase A 再凍結 §6）

IF3 stale 判定（`if3_staleness.evaluate_if3_staleness`）は以下で結果を STALE/INVALID とする:

- `sourceDocumentId` / `sourceDocumentVersion` / `sourceContentChecksum` の不一致
- `analysisSettingsChecksum` の不一致
- `loadContext.entries`（kind/id/checksum のペア集合）の不一致
- `resultChecksum`（envelope 全体の sha256）不一致
- 非対応の `schemaVersion` / `solverName` / `solverVersion`

Phase A A4 §6 の設計変更 STALE トリガ（主桁位置・支間・支点条件・断面・材料・荷重・床版重量・鋼重更新）は設計モデル層の規則であり、IF3 は資源 ID/バージョン/チェックサムで機械的に検出する。

---

## 8. エラー・失敗モード（CONFIRMED_BY_CODE）

| エラー | 発生条件 |
|--------|----------|
| `SCHEMA_ERROR` | 必須要素欠落・対応外の値（solver 名、analysisType、type 等） |
| `INVALID_REFERENCE` | node/material/section/loadCase 参照不正 |
| `DUPLICATE_ID` | ID 重複 |
| `INVALID_VALUE` | 非有限値・非正値・poissonRatio 範囲外等 |
| `ZERO_LENGTH_MEMBER` | 部材長 0 |
| `INVALID_ORIENTATION` | orientationVector が部材軸と平行 |
| `MODEL_UNSTABLE` | 拘束なし・自由 DOF なし・特異行列・非有限解 |
| `SOLVER_ERROR` | spsolve 失敗等の予期しない障害 |
| `POSTPROCESS_ERROR` | 結果に NaN/Inf |

エラー時は `errors` 配列に構造化エラー（`code`/`message`/`path`）が入り、`analysisSummary.status = failed`、結果配列は空になる（fail-closed）。

---

## 9. 外部 SPACER・旧Apollo との関係（BLOCKED 維持）

- 本観察は**リポジトリ内 solver** の契約である。SPACER / 旧 APOLLO Analyzer は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（AN-BLK-001..011）であり、本観察を外部製品の単位・座標・符号・I/J の約束へ移転しない。
- SPACER パリティ（GATE-NR-04）は Phase A+ P4 で計画のみ扱う。solver と SPACER を「同一」と推定・記録しない。
- リポジトリ solver を「SPACER の実装」と呼称しない。

---

## 10. 分類サマリ

| 項目 | 分類 |
|------|------|
| 入力モデル契約（節点・部材・断面・材料・荷重） | CONFIRMED_BY_CODE |
| 座標・DOF 順・部材ローカル系・端順・符号 | CONFIRMED_BY_CODE |
| 要素剛性・等価荷重・反力・部材端力の式 | CONFIRMED_BY_CODE |
| 閉形式検証（曲げ・せん断・ねじり・分布荷重・変換） | CONFIRMED_BY_TEST（`test_engine_verification_cases.py` 等、全 PASS） |
| IF3 正規化・チェックサム・stale・バージョン | CONFIRMED_BY_CODE + 既存テスト PASS |
| 決定性・並行（単一スレッド） | PROJECT_SPECIFIC（CONFIRMED_BY_CODE） |
| 浮動小数点再現性の外部証跡 | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT |
| 単位束縛（AN-BLK-003） | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT |
| 座標・DOF・I-J・符号の外部束縛（AN-BLK-004） | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT |
| 外部 Analyzer / SPACER 契約（AN-BLK-001,002,005） | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT |
| 荷重ケース/組合せマッピング（AN-BLK-010） | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT |
| 非合成断面の合成剛性・設計モデル処理 | UNKNOWN（未実装・未採択） |
| 数値実装許可 | NOT_AUTHORIZED（A7 ゲート） |

---

## 11. P3 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存コード・テストのみを根拠にしている | PASS |
| application code を変更していない | PASS |
| 外部 SPACER / 旧 Apollo を「同一」と推定・記録していない | PASS |
| 数値・式を捏造していない（コード・テストから観察のみ） | PASS |
| 単位束縛・外部契約を BLOCKED のまま維持 | PASS |
| 長文の基準本文転載なし | PASS |
| 既存 DS-06 / Phase A A4 の決定を書き換えていない | PASS |
| 未完の TODO / TBD なし | PASS |

---

## 12. P3 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PB-0005 | 2026-08-02 | リポジトリ solver の同一性・物理契約をコード・テスト観察から 04 に凍結。入出力・DOF・座標・要素剛性・荷重・反力・部材端力・IF3 チェックサム/stale は CONFIRMED_BY_CODE/TEST、決定性は PROJECT_SPECIFIC。浮動小数点再現性・単位束縛・外部解析器契約・荷重組合せマッピングは BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT を維持。PA-OQ-009・GATE-NR-02 は PARTIALLY_RESOLVED 相当（リポジトリ側文書化完了・外部証跡は人間/外部実行待ち）として READY_FOR_HUMAN_REVIEW 維持。 |
