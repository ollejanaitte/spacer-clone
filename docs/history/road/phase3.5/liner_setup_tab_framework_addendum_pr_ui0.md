# Liner Setup Tab Framework - PR-UI-0 補遺

> 作成日: 2026-06-30
> 用途: Pre-Decision #5 に基づく PR-UI-0 調査結果と採用方針の記録
> 関連: master_pre_decision_document.md §5, implementation_priority_and_pr_breakdown.md PR-UI-0

## 1. 背景

Phase3.5 の Liner 線形入力 UI は JIP-LINER 準拠の 6 タブ構成（ライン / 測点 / 高さ / 縦断 / 横断 / 確認図）を前提とする。
PR-UI-0 ではタブ切替の骨格のみを先行実装し、各タブの本実装は後続 PR に委ねる。

Pre-Decision #5 により、実装着手前に既存 Tab 実装・UI 依存・レイアウト慣習を調査し、
新規 npm 依存を追加せずプロジェクト慣習に合わせることが求められる。

## 2. 調査結果

### 2.1 既存 Tab 系コンポーネント

| 調査対象 | 結果 |
|---|---|
| `frontend/src/components/ResultsPanel.tsx` | 自作 tabs 実装あり。`.tabs` / `.tab` / `.tab-body` クラス、`button` による切替、controlled `activeTab` + `onTabChange` パターン |
| `frontend/src/liner/` 配下 | Tab コンポーネントなし。`LinerEditPage` は `liner-edit-panel` / `liner-edit-table` の縦積みフォーム構成 |
| 共通 Tab コンポーネント | 専用の再利用可能 Tab コンポーネントは存在しない |

### 2.2 UI ライブラリ依存 (`frontend/package.json`)

| 項目 | 結果 |
|---|---|
| Radix UI (`@radix-ui/*`) | **なし** |
| その他 Tab 専用 UI ライブラリ | **なし** |
| 既存 UI 依存 | React, lucide-react, プロジェクト内 CSS |

### 2.3 既存 Liner ページのレイアウト

- `LinerEditPage`: ヘッダー + 2 カラム（入力パネル群 + 下書き概要サイドバー）
- 入力は `liner-edit-panel` セクション単位で縦積み
- `LinerStationProfilePanel` は測点・オフセット等を含む独立コンポーネント

## 3. 採用方針

Pre-Decision #5 に従い、以下を採用する。

1. **Radix UI 等の新規依存追加は行わない**
2. **ResultsPanel と同様の軽量自作 Tab** を Liner 専用に `LinerSetupTabs.tsx` として新規作成
3. **WAI-ARIA**: `role="tablist"` / `role="tab"` / `role="tabpanel"`、`aria-selected` / `aria-controls` / `aria-labelledby` を付与
4. **タブ ID と表示順** は `uiPreparation.ts` の `LinerSetupTabId` / `LINER_SETUP_TAB_IDS` で単一管理
5. **ラベル** は `ja.ts` の `liner.setupTabs.*` に集約（uiPreparation は labelKey パスのみ保持）
6. **CSS** は既存 `liner-edit-*` トーンに合わせ、`liner-setup-tabs-*` 名前空間で追加

## 4. PR-UI-0 で実装した内容

| ファイル | 変更内容 |
|---|---|
| `frontend/src/liner/pages/LinerSetupTabs.tsx` | 6 タブの tablist / tabpanel コンポーネント（新規） |
| `frontend/src/liner/pages/LinerEditPage.tsx` | ヘッダー・概要サイドバー維持、タブ内に既存パネルを配置 |
| `frontend/src/liner/uiPreparation.ts` | `LinerSetupTabId`, `LINER_SETUP_TAB_IDS`, `LINER_SETUP_TAB_LABEL_KEYS` |
| `frontend/src/i18n/ja.ts` | `liner.setupTabs` タブラベル |
| `frontend/src/styles.css` | `liner-setup-tabs` 系スタイル |
| `frontend/src/liner/pages/LinerEditPage.test.tsx` | 6 タブ表示・切替の最低限テスト |

### 4.1 タブと中身の対応（PR-UI-0 時点）

| タブ ID | 表示名 | 中身 |
|---|---|---|
| `line` | ライン | 基本情報 + 平面線形（既存 `LinerEditPage` 内容） |
| `station` | 測点 | `LinerStationProfilePanel`（分割せずそのまま） |
| `height` | 高さ | empty stub（`aria-label` / `data-testid` のみ、後続 PR-2a-3 受け皿） |
| `vertical` | 縦断 | empty stub（`aria-label` / `data-testid` のみ、後続 PR-2a-4 受け皿） |
| `crossSection` | 横断 | empty stub（`aria-label` / `data-testid` のみ、後続 PR-3a-3 / PR-3a-4 受け皿） |
| `review` | 確認図 | empty stub（`aria-label` / `data-testid` のみ、後続 PR 受け皿） |

### 4.2 意図的に変更していないもの

- routing（`liner.setup` パス等）
- npm 依存
- 各 stub タブの本機能 UI

## 5. 後続 PR への申し送り

- PR-1c-1 以降: `line` タブ内の HorizontalElementEditor 拡張
- PR-2a-3 / PR-2a-4: `height` / `vertical` タブ stub を HeightDataPanel / VerticalGradePanel に差し替え
- PR-3a-3 / PR-3a-4: `crossSection` タブ stub を CrossfallPanel / CrossSectionTemplatePanel に差し替え
- タブ ID の追加・変更は `uiPreparation.ts` と `ja.ts` を同時更新すること

## 6. Pre-Decision #5 適合確認

- [x] 既存 Tab 実装を調査し ResultsPanel パターンを参考にした
- [x] package.json に Tab UI 専用ライブラリが無いことを確認した
- [x] 新規 npm 依存を追加していない
- [x] Radix UI を導入していない
- [x] 調査結果と採用方針を本補遺に記録した
