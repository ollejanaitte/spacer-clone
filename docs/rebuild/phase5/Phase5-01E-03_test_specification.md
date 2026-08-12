# Phase 5-01 Step E-03: Test Specification（凍結案）

## 1. 目的

Phase 5-02実装前にテスト仕様を完成させる。
各テストに test ID / purpose / input / expected / tolerance / failure condition / owner / execution command / evidence を定義する。

- baseline: `242667fce9532daa35c1240847305559bea911fb`
- 日付: 2026-08-12
- owner: Phase 5-02 WP単位（WP-A..J）
- execution: `npx vitest run <path>`（frontend）・backendは `pytest`
- evidence: docs/rebuild/phase5/evidence/（screenshots・実行ログ）

## 2. テスト分類・共通規則

- 分類: Unit / Contract / Schema / Parser / Validation / Adapter / Binding / Geometry / Coordinate /
  Curved Bridge / Skew / Load / Analysis / Design Check / Bearing / Reaction Handoff /
  Persistence / Auto Save / Restart Restore / .spacerproj / 3D / Electron / E2E / Reference Bridge / Regression
- ID規則: `T5-<CAT>-<NNN>`（例 T5-GEO-001）
- **fail-closed方式の層分け（明確化）**:
  - parser / validator: 不正入力は**例外を投げず** `ok=false + issues` を返す
  - binding層（GeometryEngineInput生成）: **typed exception**（既存`BridgeProjectAdapterError`流儀）
  - testは各層の規約に従う（T5-BND系はthrow期待・T5-VAL/PAR系はok=false期待）
- 決定論: 同一入力→同一出力（fingerprint）
- tolerance: 明示されない比較は 1e-9（厳密）

## 3. テスト一覧（凍結）

### 3.1 Contract / Schema（T5-CON / T5-SCH）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-CON-001 | SuperstructureDocument契約（documentKind/schemaVersion必須） | 最小document | 全必須field充足 | 欠落reject |
| T5-CON-002 | 型整合（girderConfiguration等） | 型ずれ入力 | 型エラー | — |
| T5-SCH-001 | JSON Schema準拠（0.1.0） | valid document | ok | NG時reject |
| T5-SCH-002 | schemaVersion不整合 | 0.2.0 | reject | 誤受理はfail |

### 3.2 Parser / Validation（T5-PAR / T5-VAL）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-PAR-001 | parseSuperstructureDocument round-trip | valid JSON | 同一document | 不一致fail |
| T5-VAL-001 | fail-closed統合規則（BridgeLayout未設定→reject） | module空 | write reject | 誤受理 |
| T5-VAL-002 | girder offset欠落 | MISSING | reject（発明しない） | 補完fail |
| T5-VAL-003 | composite action禁止 | composite=true | reject | 誤受理 |

### 3.3 Adapter / Binding（T5-ADP / T5-BND）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-ADP-001 | superstructureFacts（Handoff+上部工入力→shared facts） | valid入力 | 全field充足・値不変 | 改変fail |
| T5-BND-001 | superstructureBindingNew→GeometryEngineInput | SuperstructureDocument | supports/spans/girders/offset一致 | 不一致fail |
| T5-BND-002 | fail-closed不変条件（support欠落・station欠落等） | 不正入力 | throw（既存BP_CODES相当） | 通過fail |

### 3.4 Geometry / Coordinate / Curved / Skew（T5-GEO / T5-COO / T5-CUR / T5-SKW）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-GEO-001 | girder lines生成（G1..Gn・等間隔offset式） | girderCount=2, spacing=8 | offsets ±4.0 | 誤差fail |
| T5-GEO-002 | deck reference（width/thickness/overhang） | deckConfiguration | edgeOffset・elevation整合 | 不一致 |
| T5-COO-001 | domain→renderCoordinate変換 | domain point | x→x,y→z,z→-y | 誤変換 |
| T5-CUR-001 | 曲線alignment上のgirder line（mountain/curved） | curved入力 | LINER由来XYZ一致 | 再実装検出fail |
| T5-SKW-001 | skew（counterclockwise-positive） | skew 0.25 | support line/横断面frame一致 | 符号反転fail |

### 3.5 Load / Analysis / Design Check（T5-LD / T5-AN / T5-DC）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-LD-001 | 死荷重case生成（DL-STRUCTURAL/DL-DECK） | 断面・床版 | case・値・provenance | 欠落 |
| T5-LD-002 | 活荷重は入力境界（空） | LL | liveLoadReference null | 本実装検出 |
| T5-AN-001 | grillage model生成（node/member/support） | snapshot | RB001構成（S-6）一致 | 構成不一致 |
| T5-AN-002 | solver往復（authorizationゲート） | backend grillage | NOT_GRANTED維持 | 昇格fail |
| T5-DC-001 | 基本照査（曲げ/せん断/たわみ/横桁/支承） | 解析結果＋断面 | OK/NG判定 | 計算誤り |
| T5-DC-002 | 自動昇格禁止（NOT_AUTHORIZED→OK） | 未承認状態 | 昇格しない | 昇格fail |

### 3.6 Bearing / Reaction Handoff（T5-BRG / T5-RXN）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-BRG-001 | bearingSeats全交点・ID一意・座標/標高 | snapshot | BRG-{supp}-{girder}一意 | 重複 |
| T5-RXN-001 | reactionCases符号規約・NOT_AUTHORIZED | analysis | Fz up-positive | 符号反転 |
| T5-RXN-002 | 新Handoff→support-interface互換（導出） | 新Handoff | per-support受領可 | 互換性破壊 |

### 3.7 Persistence / AutoSave / Restart / .spacerproj（T5-PER / T5-AUT / T5-RST / T5-PKG）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-PER-001 | save→restore SuperstructureDocument | project.json | 復元一致 | 欠落 |
| T5-AUT-001 | Auto Save発火・serialized | module書込 | 保存完了 | 二重書き込み |
| T5-RST-001 | restart restore＋Geometry再生成（fingerprint） | restart | fingerprint一致 | 不一致 |
| T5-PKG-001 | .spacerproj round-trip（manifest+checksum） | export→import | 一致 | 破損 |

### 3.8 3D / Electron / E2E / Reference Bridge / Regression（T5-3D / T5-ELE / T5-E2E / T5-RB / T5-REG）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-3D-001 | 統合シーン（BL+Superstructure・決定論） | 正本 | 同一mesh（fingerprint） | 非決定論 |
| T5-3D-002 | 全5レイヤ（Road/Terrain/Existing/BL/Super）重なり | 同一Project | 同一座標配置 | ずれ |
| T5-ELE-001 | Electron smoke（上部工Shell表示） | app起動 | 画面表示 | 起動失敗 |
| T5-E2E-001 | 縦断E2E（Create→Layout→Super→Save→Restart→Restore） | 全フロー | 完走・再現 | 途中失敗 |
| T5-RB-001 | Reference Bridge比較（RB-01〜07/10/12） | RB001入力 | expected一致 | 不一致 |
| T5-REG-001 | 既存regression維持（bridgeProject/apollo/substructure/next） | 既存tests | 全PASS | 破壊 |

### 3.9 追加テスト（Sol reviewで検出された不足分・凍結）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T5-REV-001 | revisionId / status遷移（DRAFT→VALIDATED→STALE） | 状態遷移 | 規則どおり | 不正遷移 |
| T5-REV-002 | layoutFingerprint変更→STALE化 | layout変更 | STALE検出 | 未検出 |
| T5-DOC-001 | documentId安定（同bridgeId→同documentId） | bridgeId | 同一ID | 変動 |
| T5-CHN-001 | span/support chain（A1-P1-…-A2・derived一致） | 正本 | chain完全 | 欠損 |
| T5-DNG-001 | dangling ID（girder/support参照切れ） | 不正document | reject | 誤受理 |
| T5-DER-001 | derived非永続化（serializeに含まれない） | 保存 | 配列不在 | 混入 |
| T5-MIG-001 | migration（旧project空module→初期化） | 旧project | 読込・初期化 | 失敗 |
| T5-MIG-002 | 未知schemaVersion拒否 | 不正version | reject | 誤受理 |
| T5-DIG-001 | analysis digest突合（reload再計算） | 再計算 | digest一致 | 不一致 |
| T5-DIG-002 | digest不一致→STALE | モデル変更 | STALE | 未検出 |
| T5-CRC-001 | crash recovery（.spacerbak復元） | 破損/中断 | 復元 | 失敗 |
| T5-PH6-001 | Phase 6 schema互換（toSupportInterfaceEntry導出） | 新Handoff | v0.1.0形式 | 非互換 |

## 4. Execution コマンド（凍結）

- frontend: `cd frontend && npx vitest run <path>`
- backend: `cd backend && .venv/bin/python -m pytest tests/`
- 全テスト: `npx vitest run src/next`（Phase 5-02の新module含む）＋ regression
- E2E: Playwright（Electron）

## 5. Evidence（凍結）

- 各WP完了時: tests PASSログ＋対象screenshot（docs/rebuild/phase5/evidence/）
- Reference Bridge: T5-RB-001の比較表（expected/actual/tol/PASS）
- Completion Gate（WP-J）: 全T5群の一括結果＋Final Report
