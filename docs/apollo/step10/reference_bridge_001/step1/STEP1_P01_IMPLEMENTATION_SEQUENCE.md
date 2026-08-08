# STEP 1-P01 — IMPLEMENTATION_SEQUENCE（STEP 2/3 の実装順序）

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（STEP 2/3 の PR 順序・critical path）

## 1. 原則

- 各 PR は小さく、main へ merge、次の PR は最新 main から。
- 依存順序を守る（Geometry → 解析 → 設計 → 出力 → UI）。
- 数値認証（NOT_AUTHORIZED）は STEP 2 中は維持し、認証ゲート設計に従う。

## 2. STEP 2（本実装）PR 順序

| # | PR | Phase | 内容 | 依存 | 主要モジュール |
|---|----|-------|------|------|----------------|
| 2-01 | Grid/Panel Points | 6-2 | 格点配置（端点 + HOLD 伝播）、plane-grid→global 座標変換 | Geometry Core | `apollo/geometry/gridPoints.ts` |
| 2-02 | Deck Reference | 6-2 | 床版 reference（幅/厚/境界）、cross-girder reference | 2-01 | `apollo/geometry/deck.ts` |
| 2-03 | Member Placement | 6-2 | 主桁/横桁/横構 member placement reference | 2-01 | `apollo/geometry/members.ts` |
| 2-04 | Bearing Points | 6-2 | 支承 reference points | 2-01 | `apollo/geometry/bearings.ts` |
| 2-05 | Transverse/Section Frames | 6-2 | 横断面フレーム・elevation・skew 拡張 | 2-01 | `crossSectionFrame.ts` 拡張 |
| 2-06 | Snapshot→3D Contract | 6-3 | GeometrySnapshot→表示モデル変換（3D Connector） | 6-1 + 2-01..05 | `apollo/visualization/snapshot3d.ts` |
| 2-07 | 上部工部材 3D 生成 | 6-3 | 床版/主桁/横桁/横構/支承 solid 生成 | 2-06 | `apollo/visualization` |
| 2-08 | 下部工接続境界 | 6-3 | Substructure Connector（snapshot 供給） | 2-06 | `substructure/*` |
| 2-09 | STL/DXF export 正式化 | 6-3 | 3D export contract（snapshot 由来） | 2-07 | `apollo/export` |
| 2-10 | 解析結合（6-4a） | 6-4 | GeometrySnapshot→Structural Model→Analyzer 実行 | 6-1 + 2-03 | `structuralModelConnector.ts` + backend |
| 2-11 | RB-001 数値照合 | 6-4 | 計算書数値照合・図面 Geometry 照合・Golden Master | 2-10 | `step1/…/replay` |
| 2-12 | Project Replay | 6-4 | 入力→最終出力再現・tolerance・FAIL 分類 | 2-11 | `replay` ツール |
| 2-13 | 設計条件・荷重 | 7 | 設計条件/荷重/組合せ（設計 document） | 2-10 | `apollo/loads` 正式化 |
| 2-14 | 格子モデル生成 | 7 | GeometrySnapshot→設計格子 | 2-13 | backend `bridge_fem_generator` 拡張 |
| 2-15 | 格子解析 | 7 | 反力/断面力（Analyzer 接続） | 2-14 | backend solver |
| 2-16 | 主桁/横桁/横構/床版/支承照査 | 7 | 照査ロジック（数値認証後 GRANTED） | 2-15 | `apollo/design` |
| 2-17 | 疲労・継手・補剛材 | 7 | 疲労/継手/補剛材照査（データ境界） | 2-16 | `apollo/design` |
| 2-18 | 非合成/合成 | 7 | 合成・非合成の扱い | 2-16 | `apollo/design` |
| 2-19 | 断面自動決定 | 8 | design iteration・NG→再設計 | 2-16 | `apollo/design/autoSize` |
| 2-20 | 計算書/図面/数量/CSV/DXF/STL 出力 | 8 | 正式出力（認証ゲート） | 2-16..19 | `apollo/output` 正式化 |

## 3. STEP 3（UI 統合・最終検証）PR 順序

| # | PR | 内容 | 依存 |
|---|----|------|------|
| 3-01 | 画面/タブ/ダイアログ実装 | Phase 9 全画面（`UI_SCREEN_MATRIX` 準拠） | STEP2 |
| 3-02 | ボタン action 結線 | 全ボタン→action→API/Connector→backend→UI 反映（`UI_BUTTON_ACTION_MATRIX` 準拠） | 3-01 |
| 3-03 | validation/loading/error/warning/HOLD 表示 | 共通 UX 状態 | 3-02 |
| 3-04 | undo/redo・save/load・import/export 完成 | 現行 history/workspace を全画面へ適用 | 3-02 |
| 3-05 | 3D 表示・計算実行・帳票生成の UI 統合 | 3-02/2-20 の UI 結合 | 3-02 |
| 3-06 | Electron/Windows 統合 | 起動・パッケージング・IPC | 3-05 |
| 3-07 | Project Replay / E2E / 最終リリース判定 | 製品検証・リリース判定 | 3-01..06 |

## 4. Critical Path

```
Geometry (6-1 済) → 2-01..05 (6-2) → 2-06/07 (6-3) → 2-10 (6-4a 解析)
   → 2-13..16 (Phase 7 照査) → 2-19/20 (Phase 8) → 3-01..07 (Phase 9)
```

外れると手戻りになる箇所:
- 2-01（plane-grid→global 座標変換）は 6-2 の全 entity の前提。
- 2-06（snapshot→3D 契約）は 3D 系全体の前提（現行 ProjectModel 直接投影からの移行）。
- 2-10（解析結合）は Phase 7 全照査・Phase 8 出力の前提。
- 数値認証ゲート（OWN-026）は全数値出力の前提（GRANTED 前に本番出力しない）。

## 5. ゲート

- 各 PR: local 検証（typecheck / 該当テスト / 既存回帰）→ PR → merge。
- STEP 2 開始は `STEP2_GATE: GO`（STEP 1 Design Freeze 完了後、明示指示を待つ）。
- STEP 3 開始は STEP 2 completion + handoff 完了後、明示指示を待つ。
