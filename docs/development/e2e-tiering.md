# E2E Tiering (F-4)

> **Phase:** Lane F / F-4
> **Status:** ACTIVE (enforced by `playwright.smoke/critical/full.config.ts` + `playwright.tiers.ts`)
> **Date:** 2026-08-17 (JST)

## Purpose

「毎回E2E全部を回して遅すぎる」を防ぎつつ、重要回帰を適切な頻度で検出する。

## tier 定義

| tier | 目的 | 実行頻度 | 実行時間 (2026-08-17 実測) | 件数 |
|---|---|---|---|---|
| **smoke** | 数分以内の起動 / 基本導線検査 | 頻繁 (CI / 通常commit) | **~1.1分 / 19件** | 19 |
| **critical** | 主要業務機能の回帰検査 | PR / milestone | **~2.8分 / 40件** | 40 |
| **full** | 高コストな業務 Acceptance (RB001等) | milestone / 手動 / schedule | F-7/F-8で最終実行 | 22+ |

script名 (`frontend/package.json`):

```bash
npm run test:e2e:smoke     # playwright.smoke.config.ts
npm run test:e2e:critical  # playwright.critical.config.ts
npm run test:e2e:full      # playwright.full.config.ts
npm run test:e2e:tiers     # smoke + critical (通常マージ前Gate)
```

- `test:e2e` (既定) は全spec実行の既存挙動を維持 (互換性保持)。
- tier spec一覧は `frontend/playwright.tiers.ts` の `SMOKE_SPECS` /
  `CRITICAL_SPECS` / `FULL_SPECS` が単一 source of truth。

## smoke (19件)

- `level0-navigation` — 起動 / 基本導線
- `design-platform-business-flow` / `design-platform-electron-startup` — App Shell
- `fixture-standardization` — F-3 明示fixture lifecycle
- `adapter-normal-path` / `adapter-failure-path` — Site Context adapter 正常 / fail-closed

## critical (40件)

- Save/Load/Migration: `substructure-persistence`
- Terrain reopen: `mountain-sample-workflow`
- Road/Bridge workflow: `mountain-3d-viewer`, `substructure-*`
- Unified Viewer: `camera-presets`, `mountain-main3d`
- Analysis critical path: `th-analysis-revamp`, `step3-superstructure-pipeline`
- Migration: `p4-d05`, `p4-d06`, `s3-ux10-schematic`

## full (22件以上)

- Apollo full GUI / acceptance: `apollo-step4a/4b/4c`, `apollo-step5-*`, `apollo-step5r`
- `bridgeDefinition`, `phase4-user-acceptance`, `phase5-*`
- `p2-d06`, `p3-d07`, `substructure-design-result`
- Reference Business 001 (F-7で追加)
- **KNOWN_BROKEN_PREEXISTING** (Lane F 起因ではない既知の stale spec):
  `p1-d05`, `p3-f03`, `p4-d01`, `p4-d02`, `p4-d03`, `p4-d04`, `p4-d08`
  - Wave 3 baseline (19dfdfb) 時点で既に失敗する legacy LINER save/load 系。
    saveボタン導線変更後未同期の pre-existing 問題。Lane F では修正しない
    (F-4/F-8 の責務外)。将来の legacy LINER 整備で同期すべき。

## tier 検証

`playwright.tiers.ts` の `validateTierDisjoint()` が smoke/critical/full の
**二重分類を検出**して fail させる。各 spec は1つの tier にのみ属する。

## 環境

各 tier は同一の E2E 専用環境を共有する (`playwright.config.ts` 既定値):

- backend port: `18000` (`SPACER_E2E_BACKEND_PORT`)
- frontend port: `15173` (`SPACER_E2E_FRONTEND_PORT`)
- backend data dir: `frontend/test-results/e2e-backend-data` (production と分離)
- server lifecycle: Playwright `webServer` が起動/待機/終了
- parallelism: `workers: 1` (`fullyParallel: false`) — 並列による state 混線防止

## 運用ルール

- 通常開発: `test:e2e:smoke` (軽量)
- PR / milestone: `test:e2e:tiers` (smoke + critical)
- マイルストーン最終: `test:e2e:full`
- **full を毎commitで回さない** (実行時間・コスト)
