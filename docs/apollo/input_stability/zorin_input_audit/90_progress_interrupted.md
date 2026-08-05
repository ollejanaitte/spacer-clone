# AUI-R2: 途中経過 (INTERRUPTED)

## 進捗状況

| 項目 | 状態 |
|------|------|
| AUI-R1 inventory (PR #417) | ✅ COMPLETE - merged to main |
| AUI-R2 browser操作 | ⚠️ PARTIAL - 39件中39件PASS |
| AUI-R2 Electron操作 | ⚠️ PARTIAL - 31件PASS、結果CSV未完了 |
| AUI-R2 Drawer操作 | ✅ browserでPASS |
| AUI-R2 Focus/keyboard | ✅ browserでPASS |
| AUI-R2 Save/Reload | ✅ browserでPASS、Electronでreload未確認 |
| 日本語IME操作 | ❌ NOT_STARTED |
| Node editor操作 | ⚠️ PARTIAL - browser node label/X PASS |
| Cross-frame/lateral | ✅ browser PASS (Vのみ有効) |
| Appurtenance 6slot | ✅ browser PASS |
| Pavement radio | ✅ browser PASS |
| 数値入力境界値 | ⚠️ 一部のみ実施 |
| 3回連続試行 | ❌ NOT_STARTED |
| error register | ⚠️ 空 (不具合未発見) |
| coverage summary | ❌ NOT_CREATED |
| unverified items | ❌ NOT_CREATED |

## 実施済み詳細

### Browser (Chromium on Xvfb:99)
- 39 tests executed, 39 PASS, 0 FAIL, 0 BLOCKED
- Evidence screenshots: evidence_browser/ (38枚)
- Tested controls:
  - AUI-C-0001: project name text input
  - AUI-C-0002: project description textarea
  - AUI-C-0003: bridge system select (SIMPLE_SINGLE↔CONTINUOUS)
  - AUI-C-0004: spanLength numeric (40.0→40 canonical trimming)
  - AUI-C-0006~AUI-C-0016: 11 numeric fields (all PASS)
  - AUI-C-0021~AUI-C-0022: checkboxes (toggle PASS)
  - AUI-C-0105: cross-frame pattern radio (V enabled/PASS, IV+X disabled/NOT_APPLICABLE)
  - AUI-C-0106~AUI-C-0107: cross-frame depths
  - AUI-C-0112: pavement presence radio (all values PASS)
  - AUI-C-0121: appurtenance presence select (6 slots, all PASS)
  - AUI-C-0046~AUI-C-0047: undo/redo click
  - AUI-C-0087~AUI-C-0088: save/reload
  - AUI-C-0145: drawer open/close (Escape)
  - AUI-C-0148~AUI-C-0149: keyboard shortcuts Ctrl+Z/Y
  - Focus Tab/Shift+Tab

### Electron (Playwright _electron on Xvfb:99)
- 31 tests executed (PASS), file: 08_electron_results.csv
- Evidence screenshots: evidence_electron/ (10枚)
- Identical controls as browser tested
- Note: reload button was disabled after Electron save
- Console messages: 11 (no errors)
- Page errors: 0

## 未実施項目

### 開始していない
- 日本語IME操作 (composition, candidate, 全角数字)
- 3回連続試行による再現率
- Node editor member/support/material pane全操作
- 一覧編集モード(list mode)操作
- Continuous span layout操作
- Haunch入力操作
- マーキングtoggle操作
- STL export操作
- 数値境界値テスト (-1, 1., -, ., １２３)
- テキスト全角/記号/貼り付け
- Save/reload後値保存確認
- Undo/redoによる値復元確認

### 開始したが完了していない
- Electron reload (GUI上disabled)
- focus/keyboardの詳細ループ確認
- 全controlとの照合 (153中~40実施)

## サービス起動確認

| サービス | 状態 |
|----------|------|
| Backend (uvicorn :8000) | ✅ 起動済み |
| Vite dev (mode apollo :5173) | ✅ 起動済み |
| Electron compile (tsc) | ✅ 成功 |
| Playwright Chromium | ✅ headless起動 |
| Playwright _electron | ✅ Electron起動 |
| Xvfb :99 | ✅ 利用済み |
| DISPLAY | :99 |
| 日本語IME (ibus mozc-jp) | ✅ 利用可能 (未操作) |

## 出力ファイル

- docs/apollo/input_stability/zorin_input_audit/07_browser_results.csv
- docs/apollo/input_stability/zorin_input_audit/11_focus_keyboard_results.csv
- docs/apollo/input_stability/zorin_input_audit/13_error_register.csv (空)
- docs/apollo/input_stability/zorin_input_audit/15_evidence_index.md
- docs/apollo/input_stability/zorin_input_audit/evidence_browser/ (38 screenshots)
- docs/apollo/input_stability/zorin_input_audit/evidence_electron/ (10 screenshots)

## 次回再開手順

1. `cd frontend && DISPLAY=:99 node _zorin_audit_browser.js` (browser全操作再実行)
2. `cd frontend && DISPLAY=:99 node _zorin_audit_electron.js` (Electron全操作再実行)
3. 日本語IME操作を追加 (ibus engine mozc-jp)
4. Node editor全pane (member/support/material)操作追加
5. エラー発見時のみerror registerへ記録
6. 07〜18の全ファイル完成後PR作成

## 一時スクリプト

以下のファイルはGit管理外(Purpose: temporary, 削除予定):
- frontend/_zorin_audit_browser.js
- frontend/_zorin_audit_electron.js