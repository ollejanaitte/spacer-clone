# E2E Fixture Standard (F-3)

> **Phase:** Lane F / F-3
> **Status:** ACTIVE (enforced by `tests/e2e/helpers/fixture.ts` + `fixture-standardization.spec.ts`)
> **Date:** 2026-08-17 (JST)

## 正式ルール

**「画面初期状態をE2E fixture代わりにしない」**

各 E2E テストは、UI 操作前に `tests/e2e/helpers/fixture.ts` を介して明示的に
Project state を作成する。テストは以下に依存しない:

- 前のテストが作った Project / UI 残骸
- onboarding 表示状態・localStorage の偶然値
- 手動 seed 済み production DB
- 固定 backend data dir の共有

## E2E 専用環境 (Playwright)

`frontend/playwright.config.ts` が E2E 専用環境を提供する:

| 項目 | 値 | 備考 |
|---|---|---|
| backend port | `18000` (`SPACER_E2E_BACKEND_PORT`) | 開発用 8000 と分離 |
| frontend port | `15173` (`SPACER_E2E_FRONTEND_PORT`) | 開発用 5173 と分離 |
| backend data dir | `frontend/test-results/e2e-backend-data` | production DB と分離 |
| server lifecycle | Playwright `webServer` が起動/待機/終了 | `reuseExistingServer: false` |
| workers | `1` (`fullyParallel: false`) | 並列による state 混線防止 |

`/app` (PDC) の runtime persistence はブラウザ実行時は in-memory
(`MemoryFileSystemGateway`) のため、**`page.goto` (full reload) は state を失う**。
初期 `goto` 後は SPA 内ナビ (`nav-business-list` 等) で遷移する。

## 標準 fixture helper

`tests/e2e/helpers/fixture.ts`:

| Function | 用途 |
|---|---|
| `uniqueBusinessNumber(prefix)` | テストごとに一意な businessNumber 生成 |
| `createProjectViaUi(page, fixture)` | 新規 PDC Project を明示作成 |
| `openProjectViaUi(page, fixture)` | 保存済み Project を明示オープン (projectId 返却) |
| `deleteProjectViaUi(page, businessNumber)` | テスト終了時の cleanup |

## fixture 候補

| fixture | 明示ID | deterministic | schema-valid | 用途 |
|---|---|---|---|---|
| empty / new Project | fixture 生成時 UUID | 可 (同一入力→同一state) | 可 | 初期状態テスト |
| minimal valid Project | `businessNumber` 由来 | 可 | 可 | 基本 save/load |
| Tutorial Sample | `TUT-*` | 可 | 可 | 軽量 E2E |
| Reference Business 001 | `RB001-*` | 可 | 可 | 業務 Acceptance |
| migrated legacy Project | legacy fixture | 可 | 可 (migration後) | migration E2E |
| invalid Project | fail-closed | 可 | 不可 (意図的) | fail-closed E2E |
| terrain-ready Project | `GUJO_*` | 可 | 可 | terrain reopen E2E |
| analysis-ready Project | `RB001-ANL-*` | 可 | 可 (NOT_RUN) | analysis E2E |

## 禁止事項

- 前テストの Project に依存する E2E を書かない
- onboarding / 初期表示状態を fixture 代わりにしない
- timeout 待ちで fixture 準備しない
- production DB を共有しない
- 巨大万能 fixture を作らない (helper は必要最小限に共通化)

## 検証

`fixture-standardization.spec.ts` が以下を検証する:

1. create → open → delete の明示 fixture lifecycle
2. 同一 prefix でも独立した Project が作成され、前テスト残骸に依存しない
