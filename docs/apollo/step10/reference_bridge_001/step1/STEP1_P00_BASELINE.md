# STEP 1-P00 — Baseline / Inventory / Scope Freeze

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫 STEP 1
> **Baseline main SHA:** `8598d65ec6ef7fa2af0e5a6a3baf3abb4b506e92`
> **Status:** FROZEN（本ドキュメントの記載が STEP 1 の作業ベースライン）

## 1. 目的

STEP 1 の前提を確定する。既存実装・既存設計書の現状を実査した結果を inventory として
記録し、STEP 2/3 実装前に解消すべき設計ギャップを明示する。

## 2. 現状インベントリ（実査結果）

### 2.1 プロジェクト・リポジトリ

| 項目 | 値 |
|------|----|
| 正本 | https://github.com/ollejanaitte/spacer-clone.git |
| ローカル正規作業 | /home/masaharu/Projects/spacer-clone |
| ブランチ | main（local main = origin/main 同期方針） |
| CI | GitHub Actions なし（frontend `tsc`/`vitest`/`playwright`、backend `pytest` が実在） |

### 2.2 Phase 進行状況

| Phase | 状態 | 証拠 |
|-------|------|------|
| Phase 5 Common Bridge Data Model | COMPLETE / SEALED | `docs/apollo/step10/reference_bridge_001/phase5/phase5_seal.md` |
| Phase 6-0 Geometry Architecture | COMPLETE / SEALED | `phase6/phase6_0/phase6_0_seal.md`（SEAL-RB-S10-001-P6-0） |
| Phase 6-1 Geometry Core | COMPLETE | `phase6/phase6_1/completion/p6_1_completion_report.md` |
| Phase 6-2 Bridge Geometry | 設計のみ（未実装） | `phase6/phase6_0/backlog/README.md` 6.2A..6.2E |
| Phase 7 設計計算エンジン | 未実装（全数値 NOT_AUTHORIZED） | Phase A / DS-00..09、`frontend/src/apollo/*` development 表示 |
| Phase 8 自動設計・出力 | 未実装（開発系出力のみ） | `apollo/{drawing,report,quantity,output}` |
| Phase 9 UI 統合・製品化 | 部分的（ApolloPhase1Shell） | `frontend/src/App.tsx`、Electron パッケージング存在 |

### 2.3 実装済みコア（STEP 2 の土台）

| 領域 | 場所 | 能力 |
|------|------|------|
| Geometry Core | `frontend/src/apollo/geometry/` | GeometrySnapshot / DefaultGeometryEngine / LinerAlignmentConnector / CommonModelGeometryInputAdapter / placement / crossSectionFrame（36 tests） |
| LINER 線形 | `frontend/src/liner/core/` | line/arc/clothoid / vertical / crossfall / station / coordinate3d |
| 構造解析 | `backend/engine/` | 3D フレーム linear static / eigen / influence / moving-load / response-spectrum / time-history / bridge_fem_generator（generic grid） |
| 3D 表示 | `frontend/src/viewer/` | imperative Three.js viewer、Apollo solids renderer、camera/selection/visibility |
| 下部工 3D | `frontend/src/substructure/` | R3F viewer、SupportPlacementEngine（LINER 接続） |
| UI | `frontend/src/App.tsx` + `apollo/ApolloPhase1Shell.tsx` | /pro/apollo ルート、guided（G01..G15）+ list モード |
| 出力 | `apollo/{drawing,report,quantity,output,export}` + `liner/dxf` | GA G-01..07 / 標準断面 / 16章 report（正式 PDF 拒否）/ quantity CSV / 統合 ZIP / DXF / STL |

### 2.4 既存設計書（正本として扱う）

- `docs/apollo/step10/reference_bridge_001/phase6/phase6_0/`（contracts・connectors・coordinates・geometry・mapping・seal）
- `docs/apollo/design-standards/` DS-00..09（設計規準・荷重・組合せ・解析モデル・照査・数値認証ゲート）
- `docs/apollo/step10/reference_bridge_001/phase5/`（Common Model 契約・fixture）
- `docs/apollo/3d-stl/`（3D contract freeze・solid・STL export）
- `docs/frame/`（解析エンジン MVP spec・Stage 6-10）
- `schemas/contracts/v0.1/`（common-bridge-data-model / bridge-superstructure-design-document / frame-analysis-result 等）

## 3. 主要設計ギャップ（STEP 1 で設計確定すべき事項）

| GAP | 内容 | 解消先 PR |
|-----|------|-----------|
| GAP-01 | Phase 6-2 の grid/panel・deck・member・cross-girder・bearing・transverse frame・plane-grid→global 座標変換の設計が未確定 | P04 |
| GAP-02 | GeometrySnapshot → 3D モデル変換契約が未確定（現行は ProjectModel 直接投影） | P04 |
| GAP-03 | 上部工設計計算エンジンの責務境界・入出力・計算規準（荷重/組合せ/格子/反力/断面力/照査）が未確定（Phase A はブロック状態） | P05 |
| GAP-04 | Phase 8 自動断面決定・NG→再設計・計算書/図面/数量/CSV/DXF/STL 出力フローが未確定 | P05/P07 |
| GAP-05 | Phase 9 全 UI 画面・ボタンの action 先が未確定（現状 stub/未実装表示多数） | P06 |
| GAP-06 | Golden Master / Project Replay 仕様・tolerance・FAIL 分類が未確定 | P07 |
| GAP-07 | 解析・設計の数値認証（NOT_AUTHORIZED → GRANTED）の移行経路とゲート設計が未確定 | P05/P08 |
| GAP-08 | 一気通貫 interface/connector/schema/単位/座標変換の網羅マトリクスが未確定 | P02/P03 |
| GAP-09 | STEP 2 実装順序・STEP 3 統合順序・acceptance criteria が未確定 | P10 |

## 4. スコープ・ガード

- 本 STEP では production 実装・UI 本実装・大規模リファクタを行わない。
- 既存完成機能・既存契約・Phase 5 Common Model・Phase 6-0 契約を破壊しない。
- LINER 数式の別実装・Geometry への数式複製・隠れ座標変換・単位曖昧・ID 喪失・
  unresolved 値の捏造は禁止（各 PR で横断監査）。
- 解消不能項目は「deferred」として理由・影響・開始条件・担当 Phase を明記。

## 5. STEP 1 完了ゲート（本 STEP の判定基準）

1. 最終ゴールまでの全機能の実装先が確定
2. 全主要データの producer / owner / consumer が確定
3. 未定義 interface / connector / schema / 単位 / 座標変換 = 0
4. UI 主要画面の未定義 action / ボタン接続先 = 0
5. backend API 責務未定義 = 0
6. 計算エンジンの責務境界未定義 = 0
7. 3D / 計算 / 図面で Geometry 責務が一本化
8. RB-001 Golden Master / Replay 仕様確定
9. acceptance criteria / STEP2 順序 / STEP3 順序確定
10. 実装 blocking HOLD = 0（解消不能は deferred として明記）

最終判定: `DESIGN_FREEZE: PASS` / `IMPLEMENTATION_READY: PASS` / `STEP2_GATE: GO`
