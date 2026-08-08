# STEP 1-P06 — UI_BUTTON_ACTION_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（「ボタンはあるが処理先未定義」を残さない）
> 凡例: 「→」= action フロー。S=state更新 / V=validation / A=API/Connector / B=backend / R=UI反映 / E=error

## 1. グローバル（Apollo シェル / メニュー）

| ボタン | 表示条件 | action フロー |
|--------|----------|---------------|
| メニューへ戻る | 常時 | click → S(遷移) → `/pro` へ。未保存時は UnsavedChangesGuard ダイアログ（保存/破棄/キャンセル）→ E(guard) |
| 開く | 常時 | click → ファイル選択 → S(読込中) → V(importExport round-trip, fail-closed) → A(persistence) → R(project 反映) → E(不整合=load失敗表示) |
| 保存 | dirty | click → S(保存中) → V(schema) → A(/api/projects/save or file) → B(atomic store) → R(baseline更新・SaveStatusBadge) → E(保存失敗表示) |
| 保存せずに戻る | — | click → S → 遷移（変更破棄を確認） |
| undo / redo | history 有無 | click → S(history.ts, snapshot/coalesced) → R(project 反映 + dirty 更新) → E(なし) |
| guided ↔ list 切替 | 常時 | click → S(モード) → R(レイアウト切替) |
| 全工程表示 | guided | click → S(表示) → R(progress) |
| STL 出力 | モデル生成済 | click → S(生成中) → A(Export Connector /apollo/export) → B(なし, client) → R(download .stl+.apollo.json) → E(検証失敗は失敗クローズ) |

## 2. 設計入力パネル

| ボタン | 表示条件 | action フロー |
|--------|----------|---------------|
| 構造を生成（BridgeStructureInputPanel） | 入力妥当 | click → S(生成中) → V(入力検証) → A(bridgeStructure 生成 → apolloBsdd) → R(構造反映・3D 更新) → E(検証エラー表示) |
| サンプル適用 / 再適用 | 常時 | click → V → R(入力反映) → E(確認ダイアログ SampleReapply) |
| 付属物追加/編集（DeckAppurtenanceInputPanel） | 常時 | click → S → V(station 範囲/寸法) → A(bridgeStructure 再生成) → R → E |
| ハンチ設定（RcDeckHaunchInputPanel） | 常時 | click → S → V → A(構造再生成) → R → E |
| 横構取付（CrossFrameAttachmentInputPanel） | V のみ選択可 | click → S(パターン/深さ) → V → A(構造反映) → R → E（逆V/X は P09 で判断） |
| 荷重確認（LoadConfirmationDevelopmentPanel） | 構造生成済 | click → A(loads モデル生成, client) → R(表・JSON export) → E(stale ゲート) |
| 数量（QuantityModelDevelopmentPanel） | 構造生成済 | click → A(quantity 生成, client) → R(表・CSV/JSON) → E(stale ゲート) |
| 計算書（ReportModelDevelopmentPanel） | 構造生成済 | click → A(report 生成, client) → R(HTML/JSON/CSV) → 正式 PDF は認証ゲート（disabled）→ E |
| 出力統合（OutputIntegrationPanel） | 全 artifact | click → A(outputIntegration) → R(ZIP bundle + consistency check) → E(不整合一覧) |

## 3. 解析・設計（Phase 7/8 新規ボタン — 接続先を確定）

| ボタン | 表示条件 | action フロー |
|--------|----------|---------------|
| 格子生成 | 設計条件+GeometrySnapshot 準備済 | click → S(生成中) → V(格子パラメータ) → A(CN-04 Structural) → B(POST /api/design/grillage/generate) → R(格子表示) → E(生成失敗表示) |
| 解析実行 | 格子生成済 | click → S(解析中) → V(モデル整合) → A(CN-05) → B(POST /api/design/analyze) → R(反力/断面力表) → E(解析エラー・認証ゲート) |
| 照査実行 | 解析完了 | click → S(照査中) → A(CN-06) → B(POST /api/design/check) → R(照査結果表 OK/NG) → E(NG は再設計提案へ) |
| 断面自動決定 | 照査 NG | click → S(iteration) → B(POST /api/design/autosize) → R(断面更新・再照査) → E(非収束警告) |
| 計算書生成 | 認証 GRANTED | click → B(POST /api/design/report) → R(プレビュー→PDF/ZIP) → E(NOT_AUTHORIZED はゲート表示) |

## 4. Replay / 検証（Phase 6-4）

| ボタン | 表示条件 | action フロー |
|--------|----------|---------------|
| Project Replay 実行 | RB-001 fixture 選択 | click → S(実行中) → B(POST /api/replay/run) → R(結果 + discrepancy 分類) → E(FAIL 一覧) |
| スクリーンショット保存 | 3D/図面表示 | click → A(画面キャプチャ) → R(evidence 保存) |

## 5. 監査（dead-end 排除）

- 上記フローは全て V → A → B → R → E を完結させる。
- 現状 stub/disabled（正式計算書・G15 成果物・逆V/X・構造解析表示）は
  「処理先未定義」ではなく「Phase 7/8 実装待ち（P09 で deferred 明記）」として
  STEP 1 では確定済み扱いとする。
- STEP 3 完了時に `API未接続 / stub / placeholder / TODO` を 0 にすることを acceptance に含む。
