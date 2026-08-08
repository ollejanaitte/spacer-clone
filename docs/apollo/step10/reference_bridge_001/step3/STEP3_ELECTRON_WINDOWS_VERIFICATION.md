# STEP 3 — Electron / Windows 検証レポート

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 3
> **Status:** VERIFIED（unit + compile + 起動構成確認。実機 Windows 起動は packaging 工程で再確認）

## 1. 検証項目と結果

| 項目 | 結果 | 根拠 |
|------|------|------|
| Electron ユニットテスト | PASS (26/26) | `npm run electron:test`（aboutConfig / closeGuard / dialogIpc / gpuMode） |
| Electron main コンパイル | PASS | `tsc -p desktop/electron/tsconfig.json` |
| backend 起動構成 | 確認済み | `desktop/electron/main.ts` が `spacer-backend.exe`（packaged）/ `backend/.venv`（dev）を spawn、IPC（closeGuard / dialog）有り |
| フロントエンド接続 | 確認済み | Vite `base: "./"`、preload、`file://` ロード構成 |
| Windows 起動スクリプト | 確認済み | `start-windows.ps1`（GpuMode、依存 SHA、`backend\.venv\Scripts\python.exe`、log 出力） |
| Windows パッケージ | 確認済み | `docs/development/packaging-windows.md`、`npm run pack:win` / `dist:win` |
| Electron smoke script | 存在確認 | `frontend/scripts/verifyApolloElectron.mjs` / `verifyApolloUnit2Electron.mjs` |
| 実機 Windows 起動 | 環境制約により本セッションでは未実行 | packaging 工程（STEP 3 完了後の Windows 実機検証）で実施 |

## 2. 起動導線（設計どおり）

```
start-windows.ps1
  ├─ 依存チェック / GpuMode 解決
  ├─ backend 起動（spacer-backend.exe または .venv python + uvicorn）
  └─ Electron（main.ts）
        ├─ backend 起動待ち（/health）
        └─ BrowserWindow → frontend/index.html（file://）
             └─ /pro/apollo → 上部工パイプライン（STEP 3 実装）
```

## 3. 備考

- 本セッションは Linux 環境のため実機 Windows 起動は実施不可。起動構成・コンパイル・
  ユニットテスト・スクリプト存在を検証済みとし、実機確認は packaging 工程の残課題として記録。
- 数値認証（NOT_AUTHORIZED）は Electron 経由でも維持（backend ゲート + UI バナー）。
