# STEP 1-P10 — STEP3_INTEGRATION_HANDOFF

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **対象:** STEP 3 担当モデル（UI 統合・Project Replay・Electron・最終製品検証）

## 1. STEP 3 の開始条件

- STEP 2 完了（Phase 6-2..8 実装 merge + handoff）を main で確認
- `STEP1_P10_STEP2_HANDOFF.md` の完了物が揃っている

## 2. 統合順序（P01 準拠）

3-01 画面/タブ/ダイアログ → 3-02 ボタン action 結線 → 3-03 validation/loading/error/warning/HOLD → 3-04 undo/save/load/import/export → 3-05 3D/計算/帳票 UI 結合 → 3-06 Electron/Windows → 3-07 Replay/E2E/最終リリース判定

## 3. 各 PR の統合ガイド

| PR | 対象 | 正本 | 完了条件 |
|----|------|------|----------|
| 3-01 | 全画面・タブ・ダイアログ | `STEP1_P06_UI_SCREEN_MATRIX.md` | 新画面（設計条件/荷重/格子/解析結果/照査/断面決定/計算書/Replay）+ 既存画面維持 |
| 3-02 | 全ボタン結線 | `STEP1_P06_UI_BUTTON_ACTION_MATRIX.md` | 全ボタン S→V→A→B→R→E 完結、dead-end 0 |
| 3-03 | UX 状態（loading/error/warning/HOLD） | `STEP1_P08_ERROR_HOLD_TRACEABILITY.md` | 状態表示統一 |
| 3-04 | undo/redo・save/load・import/export | 既存 history/workspace/importExport | 全画面適用・再現性 |
| 3-05 | 3D/計算実行/帳票生成 UI | P04 3D、OUTPUT_MATRIX | UI から一気通貫実行 |
| 3-06 | Electron/Windows | `docs/development/packaging-windows.md` | 起動・パッケージ・IPC |
| 3-07 | Replay/E2E/最終判定 | GOLDEN_REPLAY_SPEC、TEST_ACCEPTANCE | Replay PASS、E2E PASS、リリース判定 |

## 4. 最終製品検証（3-07）

- RB-001 Project Replay: 入力 → Geometry → 解析 → 設計 → 出力 を一括再現、FAIL_* = 0
- E2E（Playwright）: Replay フロー + 主要 UI フロー
- screenshot / visual evidence: 3D・図面・画面を保存
- ビルド: `tsc -b` + `vite build` PASS、Electron 起動 PASS
- 数値認証ゲートの表示確認
- リリース判定（`FORMAL_RELEASE_READINESS`）はゲート基準に従う

## 5. 受け渡し物（STEP 3 完了時）

- Phase 9 completion report + 最終製品検証レポート
- `final_report.txt` 最終更新、リリース判定結果
- 残課題は deferred として明記
