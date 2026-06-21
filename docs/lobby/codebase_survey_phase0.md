# Codebase Survey: Phase 0

調査日: 2026-06-21

## ルータ構造

- React Router: 未使用
- ルーティング: `window.location.pathname` + `window.history.pushState`
- エントリ: `frontend/src/main.tsx` → `App.tsx`

## 現在のURL

| URL | 表示内容 |
|---|---|
| `/` | メインアプリ（プロモード） |
| `/th/run` | 時刻歴応答解析ウィザード（モーダル） |
| `/compare` | モデル比較モード |

## 既存のリダイレクト

- `routeRedirect.ts`: `/th/output-targets` → `/th/run`

## 依存関係

- `react-router-dom`: 未導入
- テスト: `vitest` (500件)
- ビルド: `vite` + `tsc`

## テストコマンド

```bash
cd frontend && npm test -- --run
```

## ビルドコマンド

```bash
cd frontend && npm run build
```

## URL直書き箇所

- `App.tsx:66`: `window.location.pathname.startsWith("/th/")`
- `App.tsx:71`: `window.location.pathname === "/compare"`
- `App.tsx:462`: `window.history.pushState({}, "", "/")`
- `App.tsx:500`: `window.history.pushState({}, "", "/compare")`
