# STEP 1-P05 — ANALYSIS_DESIGN_ARCHITECTURE（Phase 6-4 / Phase 7 / Phase 8）

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** Phase A（`docs/apollo/phase_a_integrated_freeze/`）・`docs/apollo/design-standards/` DS-00..09・
> `docs/frame/analysis/05_analysis_engine_spec.md`・`backend/engine/**`・`schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`

## 1. Phase 6-4 — Reference Bridge 001 完全再現（数値・図面・Replay）

| 項目 | 設計 | 実装（STEP2 PR） |
|------|------|------------------|
| 計算書数値照合 | RB-001 設計計算書（CH1..CH2, 141 図面）の数値を Golden として、解析/設計結果を tolerance 付き照合 | 2-10/2-11 |
| 図面 Geometry 照合 | 図面寸法（G-GEO / DWG-*）を GeometrySnapshot と照合 | 2-11 |
| Golden Master | RB-001 入力 fixture + expected + provenance + tolerance（`GOLDEN_REPLAY_SPEC` 準拠） | 2-11 |
| tolerance | 位置 mm 級 / 力 kN 級 / 比率 % 級（Replay spec で定義） | 2-11 |
| Project Replay | 入力 fixture → Geometry → 解析 → 設計 → 出力を一括再現（2-12） | 2-12 |
| discrepancy classification | ID/数値/単位/座標/未解決 等の FAIL 分類 | 2-12 |
| screenshot / visual evidence | 3D 表示・図面・画面の evidence 保存 | 2-12/3-07 |
| E2E | Playwright による再現フロー E2E | 3-07 |

## 2. Phase 7 — 上部工設計計算エンジン（責務境界）

### 2.1 責務境界

- **Design Engine は「設計 document（入力）」＋「解析結果」→「照査・断面決定・traceability」を生成**。
- 解析自体は既存 Analyzer（backend solver）が担う。Design Engine は格子モデル生成（GeometrySnapshot→設計格子）と照査ロジックを担う。
- 数値は全て認証ゲート（OWN-026）を経由。Phase A のブロック状態（全数値 NOT_AUTHORIZED）を初期状態とする。

### 2.2 処理フロー

```
設計条件・断面・荷重（bridge-superstructure-design-document）
  → 格子モデル生成（GeometrySnapshot + 設計条件 → backend grillage model）
  → 格子解析（Analyzer /api/design/analyze）
  → 反力 / 断面力（外割・極値）
  → 照査（主桁/横桁/横構/床版/支承/補剛材/継手/疲労）→ 判定（OK/NG）
  → 断面自動決定（NG→再設計 iteration, Phase 8）
  → 設計結果（traceability 付き）
```

### 2.3 対象照査（Phase A 05 に基づくスコープ）

| 照査 | 状態 | 実装 PR |
|------|------|---------|
| 主桁（7 limit states） | BLOCKED（認証後） | 2-16 |
| 変位（たわみ） | BLOCKED | 2-16 |
| RC 床版（4） | BLOCKED | 2-16 |
| 床組（横桁・横構 7） | BLOCKED | 2-16 |
| 補剛材 | BLOCKED | 2-17 |
| 継手 | BLOCKED | 2-17 |
| 支承 | BLOCKED | 2-16 |
| 疲労 | OUT_OF_SCOPE（データ境界のみ） | 2-17 |
| 非合成 / 合成 | 非合成が基準（nonCompositeAssertion） | 2-18 |

### 2.4 非合成 / 合成

- 既定 = 非合成（`bridge-superstructure-design-document` の `nonCompositeAssertion: compositeAction=false`）。
- 合成の扱いは Phase 7 ではデータ境界まで（合成検討フラグ + 計算は別工程で判定）。

## 3. Phase 8 — 自動設計・出力

| 機能 | 設計 | 実装 PR |
|------|------|---------|
| 断面自動決定 | 照査 NG → 断面寸法変更（フランジ厚/ウェブ厚等）→ 再照査 iteration | 2-19 |
| NG→再設計フロー | iteration 上限・収束判定・初期値 | 2-19 |
| 計算書 | 16 章 ReportModel + 解析/設計章（認証後） | 2-20 |
| 図面 | GA（G-01..07）+ 標準断面 + 部材表 | 2-20 |
| 数量表 | quantity model（CSV/JSON） | 2-20 |
| CSV/DXF/STL | 既存出力を正式化（ゲート） | 2-20 |
| print/export | PDF（window.print/正式 PDF）、ZIP bundle | 2-20 |

## 4. traceability

- 設計結果は Common ID → Golden ref → 設計計算書章 → 解析ケースまで遡れる。
- 各照査結果は `design result` document に「式・規準 source（DS-xx / R7 条文）・入力値・判定」を保持。
- 出力 artifact は checksum + manifest（既存 `artifactBundle` / `ApolloStlExportManifest` 踏襲）。

## 5. テスト

- unit: 各照査ロジック（入力→判定、tolerance）
- integration: fixture → 解析 → 照査 → 出力
- parity: RB-001 計算書数値照合（tolerance 付き）
- 回帰: 既存 41 backend tests + frontend 全 tests 維持
