# Phase 6-01 Step E: Test Specification（凍結案）

## 1. 目的

Phase 6-02実装前にテスト仕様を完成させる。
各testにtest ID / purpose / input / expected / tolerance / PASS / FAIL / command / evidenceを定義する。

- baseline: `03bf60f270aaa435506be2e5962f8a2ea513ef6e`
- 日付: 2026-08-13
- owner: Phase 6-02 WP単位（WP-A..K）
- execution: `npx vitest run <path>`（frontend）・backend pytest
- 層別fail-closed: parser/validator=ok=false+issues / binding=typed exception

## 2. テスト一覧（凍結・T6-系）

凡例: ID / purpose / input / expected / tolerance / failure

### 2.1 Contract / Schema / Parser（T6-CON / T6-SCH / T6-PAR）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-CON-001 | SubstructureDocument契約（documentKind/schemaVersion必須） | 最小document | 全必須充足 | 欠落reject |
| T6-SCH-001 | 新SubstructureDocument v0.1.0準拠 | valid | ok | NG reject |
| T6-SCH-002 | schema 0.2.0とserializer出力一致（drift検出） | serialize | 一致 | drift検出 |
| T6-SCH-003 | 旧0.1.0 project migration（position→placement） | 旧JSON | 新document | migration失敗 |
| T6-SCH-004 | unsupported version reject | 0.0.x | reject | 誤受理 |
| T6-SCH-005 | support-interface strict/lenient二段 | valid/old | 両受領 | 不正受理 |
| T6-SCH-006 | pier/abutment/foundation/pile enum拡張 | portal/wall/steel_pipe | 受領 | enum外reject |
| T6-PAR-001 | parse round-trip | valid | 同一 | 不一致 |

### 2.2 Phase 4 Adapter（T6-ADP）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-ADP-001 | supportId整合 | handoff | 一致 | 不一致reject |
| T6-ADP-002 | supportTypeマップ（virtual_pier→pier） | kind | マップ | 不明reject |
| T6-ADP-003 | station受領（finite） | station | placement.station | NaN reject |
| T6-ADP-004 | azimuth null→LINER委譲 | null | 委譲 | — |
| T6-ADP-005 | skew null→0（CCW） | null | 0 | 符号誤り |
| T6-ADP-006 | roadReference整合 | handoff | alignmentId | 未存在reject |

### 2.3 Phase 5 Adapter / 6課題（T6-BRG / T6-RXN / T6-ELE / T6-LOC）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-BRG-001 | bearingSeats全受領・ID一意 | handoff | BRG-一意 | 重複 |
| T6-BRG-002 | localOffset axis（transverse→y） | offset | y=transverse | axis誤り |
| T6-BRG-011 | 旧SEAT-ID正規化 | SEAT- | BRG- | 正規化不能 |
| T6-BRG-012 | BRG-ID一意 | seats | 一意 | 重複 |
| T6-RXN-001 | reaction up-positive・authorization維持 | handoff | up-positive/NOT_AUTHORIZED | sign誤り |
| T6-RXN-002 | combinationId→caseKind（DL→permanent） | DL-STRUCTURAL | permanent | enum違反 |
| T6-RXN-003 | LL→liveLoad・未知→既定+warning | LL/unknown | liveLoad/既定 | 不正 |
| T6-RXN-010 | 外部負値→|Fz|比較（legacy source照合・SB-15/16） | fixture | |Fz|一致 | 不一致 |
| T6-ELE-001 | girderBottom/deckElevation導出（宣言値） | 宣言 | 導出値 | 不一致 |
| T6-ELE-002 | 未宣言→NOT_AVAILABLE（+0.25m禁止） | 未宣言 | NOT_AVAILABLE | 発明値 |
| T6-LOC-001 | localFrame実frame（snapshot） | snapshot | 実frame | identity |
| T6-LOC-002 | 曲線橋frame（identityでない） | 曲線 | 実frame | identity |
| T6-LOC-003 | frame欠落→VIEWER_PLACEHOLDER明示 | 欠落 | placeholder明示 | silent |

### 2.4 Geometry / Coordinate（T6-GEO）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-GEO-001 | support XYZ→3D基準 | handoff | 配置 | ずれ |
| T6-GEO-002 | elevation→高さ基準 | elevation | 高さ | 誤り |
| T6-GEO-003 | abutment形式solid | inverted_t/cantilever | solid | 生成失敗 |
| T6-GEO-004 | pier形式solid | single/wall/portal | solid | 生成失敗 |
| T6-GEO-005 | footing/foundation/pile solid | dims | solid | 生成失敗 |
| T6-GEO-006 | 寸法validation（>0・finite・MISSING） | dims | 検証 | 不正受理 |
| T6-GEO-007 | 座標（renderCoordinate・Origin分離） | point | 変換 | 誤変換 |

### 2.5 Terrain / Existing（T6-TER / T6-EXT）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-TER-001 | terrainElevation取得 | support位置 | 標高 | ずれ |
| T6-TER-002 | embedment導出（ground→footing/pile） | 標高 | 根入れ | 誤り |
| T6-TER-003 | missing terrain=warning | なし | warning | fatal |
| T6-TER-004 | stale terrain=STALE | 変更 | STALE | 未検出 |
| T6-EXT-001 | existing reference（ID） | ref | 解決 | dangling |
| T6-EXT-002 | nearby entity取得 | range | entity | 欠落 |
| T6-EXT-003 | missing existing=warning | なし | warning | fatal |

### 2.6 Design framework / Quantity（T6-DS）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-DS-001 | quantity実計算（体積/杭長） | dims | 既存golden一致 | 誤り |
| T6-DS-002 | designStatus NOT_AUTHORIZED維持 | runDesign | 維持 | 昇格 |
| T6-DS-003 | reaction NOT_AUTHORIZED（非採用） | handoff | 入力保持 | 自動採用 |
| T6-DS-004 | calculationAdapter TEST/MOCK境界 | adapter | TEST | 変動 |
| T6-DS-005 | DEFER資産誤実装なし | — | framework維持 | 誤実装 |

### 2.7 Persistence（T6-PER）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-PER-001 | save→restart→restore | project | 復元 | 欠落 |
| T6-PER-002 | derived再生成（Handoff一致） | restore | 一致 | 不一致 |
| T6-PER-003 | Geometry再生成（fingerprint） | reload | 一致 | 不一致 |
| T6-PER-004 | .spacerproj round-trip | export/import | 一致 | 破損 |
| T6-PER-005 | digest突合（STALE） | 再計算 | STALE | 未検出 |
| T6-PER-006 | invalid/partial module | 不正 | invalid | 誤受理 |
| T6-PER-007 | migration（空module初期化） | 旧project | 初期化 | 失敗 |
| T6-PER-008 | 旧JSON import adapter | 旧JSON | 新document | 失敗 |

### 2.8 3D / UI（T6-3D / T6-UI）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-3D-001 | 統合シーン同一座標 | 全layer | 重なり | ずれ |
| T6-3D-002 | renderCoordinate決定論 | 同一 | 同一mesh | 非決定論 |
| T6-3D-003 | ID規則（sub:{supportId}） | entity | ID一致 | 不一致 |
| T6-3D-004 | reload再生成（fingerprint） | restore | 再現 | 失敗 |
| T6-UI-001 | 新route表示 | 新route | Shell表示 | 失敗 |
| T6-UI-002 | 旧route維持 | 旧route | 表示 | 破壊 |
| T6-UI-003 | ユーザー縦断（生成→edit→3D→save→restart→restore） | 全flow | 完走 | 途中失敗 |

### 2.9 Reference Bridge / Electron / E2E / Regression（T6-RB / T6-ELE / T6-E2E / T6-REG）

| ID | purpose | input | expected | failure |
|---|---|---|---|---|
| T6-RB-001 | SB-01〜07/14/22 | 参照 | 一致 | 不一致 |
| T6-RB-002 | SB-15/16（reaction受領・非採用） | fixture | 受領 | 自動採用 |
| T6-RB-003 | SB-17〜20（quantity golden） | 参照 | 一致 | 不一致 |
| T6-RB-004 | SB-21（design status） | runDesign | HOLD | 昇格 |
| T6-RB-005 | SOURCE_NOT_AVAILABLEスキップ | 未定義 | スキップ | 補完 |
| T6-ELC-001 | Electron smoke（新route） | app起動 | 表示 | 起動失敗 |
| T6-E2E-001 | 縦断E2E（Create→Layout→Super→Sub→Save→Restart→Restore） | 全flow | 完走 | 途中失敗 |
| T6-REG-001 | 既存regression（substructure/bridgeProject/apollo/next） | 既存tests | 全PASS | 破壊 |
| T6-REG-002 | typecheck / lint / build | — | PASS | 失敗 |

## 2.5 共通test属性（凍結）
- 各testに以下を必ず付与: **command**（`npx vitest run <path>`）/ **evidence**（docs/rebuild/phase6/evidence/）/ **tolerance**（明示）
- 数値tol: 長さ 1e-3 m・角度 1e-6 rad・力 1%（明示されない場合は既定）

## 3. Execution

- frontend: `npx vitest run <path>`
- E2E: Playwright（Electron）
- regression: 既存suites全件

## 4. Evidence

- 各WP完了: tests PASSログ＋screenshot（docs/rebuild/phase6/evidence/）
- Reference Bridge: T6-RB比較表（expected/actual/tol/PASS）
- Completion Gate（WP-K）: 全T6群一括結果＋Final Report
