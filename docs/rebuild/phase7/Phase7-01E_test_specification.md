# Phase 7-01E: Test Specification（設計Freeze）

- Phase: 7-01 Step E
- baseline: `4c6df0d8ff089e5c8ad8293867321e7da023c2e3`
- 日付: 2026-08-13
- 凍結: Design Decision D-11 / D-17

## 1. 目的

Phase 7-02のtestsを事前Freezeする。各testは `test ID / purpose / input / expected / tolerance / PASS / FAIL / command / evidence` を固定。

## 2. Test命名・配置（Freeze）

- backend: `backend/tests/test_analysis_*.py`
- frontend: `frontend/src/next/modules/analysis/__tests__/*.test.ts`
- fixtures: `examples/analysis/`・`backend/tests/fixtures/analysis/`
- command: `python3 -m pytest backend/tests/ -q` / `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build`
- 下記3.xはtestカタログ（test ID・purpose・expected基準・toleranceを固定）。**exact expected値・fixture provenanceは
  本設計書+`Phase7-01E_reference_analysis_golden`で確定済み**（#24）。
  - closed-form golden: expected値をPhase7-01E_reference_analysis_golden §3に**数値で凍結**（例 simple beam δ=-0.0006504065）。
  - regression golden: tolerance 1e-6相対 + provenance（決定論出力凍結）を凍結。
  - command・evidenceの記録場所（`docs/rebuild/phase7/evidence/`）は本設計書で固定。
  - **実装者はexpected値・toleranceを変更できない**（Design Change手続きを要する）。

## 3. Testカタログ（Freeze）

### 3.1 Document / Schema / Validation

| test ID | purpose | input | expected | tolerance |
|---|---|---|---|---|
| A-DOC-001 | AnalysisDocument schema準拠 | 正規AnalysisDocument | valid | — |
| A-DOC-002 | schemaId/version const | 不正document | reject | — |
| A-DOC-003 | sourceReferences fingerprint | 上流3正本ref | 一致検証 | — |
| A-DOC-004 | ID uuid5決定論 | 同一source | 同一ID | 完全一致 |
| A-DOC-005 | 数値非有限reject | NaN座標 | reject | — |
| A-DOC-006 | 再生成determinism | 同一上流 | 同一AnalysisDocument | checksum一致 |

### 3.2 Adapter（Superstructure / Substructure / Bearing / Support / Spring / Foundation）

| test ID | purpose | expected |
|---|---|---|
| A-ADP-SUP-001 | 節点生成（support/girder panel/横桁点・重複統合） | 正規node・ID一意 |
| A-ADP-SUP-002 | 部材生成（主桁/横桁・orientationVector） | 直交性・連続性 |
| A-ADP-SUP-003 | section/material source（CONFIRMED/COMPUTED/NOT_AVAILABLE） | 正規section |
| A-ADP-SUB-001 | support位置・local frame | 正規 |
| A-ADP-SUB-002 | bearing seat接続（BRG-ID一意・girder対応） | 正規 |
| A-BRG-001 | FIXED→全DOF拘束 | 正規bool |
| A-BRG-002 | MOVABLE→縦解放 | 正規bool |
| A-BRG-003 | UNDECIDED→既定（uz+uy） | 正規 |
| A-BRG-004 | rubber→spring（CONFIRMED/NOT_AVAILABLE fallback） | 正規 |
| A-SPR-001 | 6DOF spring・local/global | 正規 |
| A-SPR-002 | spring対角加算（1DOF closed-form） | 1e-6相対 |
| A-FDN-001 | foundation spring CONFIRMED | 正規 |
| A-FDN-002 | foundation spring SOURCE_NOT_AVAILABLE | bool fallback・明示 |
| A-REL-001 | release契約保持 | 保持 |
| A-REL-002 | release→solver fail-closed（UNSUPPORTED_RELEASE） | reject |
| A-MPC-001 | rigidLink/MPC契約+ fail-closed | reject |

### 3.3 FEM Model（Node / Member / Section / Material / Coordinate / DOF）

| test ID | purpose | expected |
|---|---|---|
| A-FEM-001 | node/member生成ID一意+sourceEntityId | 正規 |
| A-FEM-002 | orientationVector直交性 | 正規（INVALID回避） |
| A-FEM-003 | section A/Iy/Iz/J（I断面closed-form） | 1e-9相対 |
| A-FEM-004 | material既定steel明示source | 正規 |
| A-FEM-005 | DOF numbering（6/node） | 正規 |
| A-FEM-006 | 未対応要素（shell）reject | UNSUPPORTED |

### 3.4 Load / Transfer / Combination

| test ID | purpose | expected |
|---|---|---|
| A-LD-001 | DL-STRUCTURAL部材分布配分（総量保存） | Σ=total・1e-9相対 |
| A-LD-002 | DL-DECK配分（girder均等） | 正規 |
| A-LD-003 | **support節点のみ配分にならないguard** | 分布載荷存在 |
| A-LD-004 | memberLoads/nodalLoads backend転送 | 正規（R2） |
| A-LD-005 | 分布荷重→等価節点力（closed-form） | 1e-9相対 |
| A-CMB-001 | COMBO-1合成（loadVector合成・superposition等価） | 1e-9相対 |
| A-LD-006 | 空case（MISSINGのみ） | 0荷重実行 |

### 3.5 Grillage / Solver

| test ID | purpose | expected |
|---|---|---|
| A-SLV-001 | **grillage解析成功（R1 regression）** | status=success・非空result |
| A-SLV-002 | 横桁member解析（INVALID_ORIENTATION回避） | success |
| A-SLV-003 | 単純梁closed-form（δ/反力/M・**既存fixture規約・tolerance 1e-4相対**） | 1e-4相対 |
| A-SLV-004 | 特異model→MODEL_UNSTABLE | fail-closed |
| A-SLV-005 | solver失敗→成功表示しない（R21・HTTP mapping） | failed envelope・UI非成功 |
| A-SLV-006 | 決定論（同一入力→同一結果） | checksum一致 |
| A-SLV-007 | 性能（中規模grillage完了） | 制限時間内 |
| A-SLV-008 | 横桁member解析（INVALID_ORIENTATION回避・R1） | success |

### 3.6 Result / IF3 / Reaction / Member Force

| test ID | purpose | expected |
|---|---|---|
| A-RES-001 | IF3正規化（sourceDocumentId=AnalysisDocument） | 正規resource |
| A-RES-002 | reaction key統一（fz直接・rz→fz廃止regression） | 正規fz |
| A-RES-003 | reaction up-positive sign | 正規 |
| A-RES-004 | member force local・i/j端 | 正規 |
| A-RES-005 | source entity mapping（2段追跡） | 正規 |
| A-RES-006 | 非有限result→INVALID | INVALID |

### 3.7 Persistence / stale / restart / .spacerproj

| test ID | purpose | expected |
|---|---|---|
| A-PER-001 | AnalysisDocument保存/読込（PDC） | roundtrip一致 |
| A-PER-002 | 上流変更→AnalysisDocument再生成（revisionId++） | 再生成 |
| A-PER-003 | 上流変更→結果STALE | STALE |
| A-PER-004 | IF3 staleness（version/checksum/loadContext） | STALE |
| A-PER-005 | 古い結果が有効表示されない | gateブロック |
| A-PER-006 | autosave有効化 | 保存 |
| A-PER-007 | restart restore（AnalysisDocument+availability） | 復元 |
| A-PER-008 | .spacerproj roundtrip | 一致 |

### 3.8 Viewer / E2E / Quality

| test ID | purpose | expected |
|---|---|---|
| A-UI-001 | spring/bearing表示 | 表示 |
| A-UI-002 | combination選択 | 表示 |
| A-UI-003 | STALE/unavailable表示 | 表示 |
| A-UI-004 | renderCoordinate分離 | 表示 |
| A-E2E-001 | 上部工→解析→結果→表示E2E | 一連pass |
| A-E2E-002 | Electron起動+解析 | pass |
| A-Q-001 | typecheck | pass |
| A-Q-002 | lint | pass |
| A-Q-003 | build | pass |
| A-Q-004 | regression（backend 1077+新規・frontend既存+新規） | pass |

### 3.9 Reference golden

| test ID | purpose | expected |
|---|---|---|
| A-REF-001 | simple beam closed-form | 1e-6相対 |
| A-REF-002 | continuous beam/frame（釣合い+closed-form） | 1e-6相対 |
| A-REF-003 | spring support closed-form | 1e-6相対 |
| A-REF-004 | grillage regression+釣合い | snapshot一致+1e-9 |
| A-REF-005 | RB-S10-001統合解析（invariant+regression） | 釣合い・対称・決定論 |

## 4. PASS / FAIL基準（Freeze）

- PASS: 全assert（expected値・tolerance・fail-closed挙動）を満たす。
- FAIL: 一つでもassert失敗・error・timeout。
- 全testは決定的（ランダム値・時刻依存を排除）。

## 5. 実行command（Freeze）

| 層 | command |
|---|---|
| backend | `python3 -m pytest backend/tests/ -q` |
| frontend | `npm run typecheck`・`npm run lint`・`npm run test`・`npm run build`（frontend/） |
| e2e | `npm run test:e2e`（playwright・phase 7-02時） |
| electron | `npm run electron:compile` |

## 6. evidence（Freeze）

- 各WPのCompletion時にtest結果（pytest/vitest出力）をevidenceとして記録。
- 主要golden照合は`docs/rebuild/phase7/evidence/`へ保存。
