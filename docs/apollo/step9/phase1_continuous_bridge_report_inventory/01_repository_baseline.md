# 01 — Repository Baseline

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **ステータス:** CONFIRMED

## 調査日時

- Investigation start (UTC): 2026-08-05T15:27:23Z
- Investigation start (JST): 2026-08-06T00:26:23+09:00

## Repository

- URL: https://github.com/ollejanaitte/spacer-clone.git
- 名称: spacer-clone

## Branch

- main (直接編集方針)

## HEAD SHA

| 項目 | SHA | コミット |
|------|-----|----------|
| pre-PHASE1 調査基準 (pre-flight) | `cec0ab326e4e9400d6b6b98efac7602b7652e02d` | `cec0ab3 docs(apollo): save Zorin input audit progress (AUI-R2 interrupted)` |
| Phase 1-A コミット後 (本書作成時点) | `275ae82ad7a0b6d56e83e58ade8af039df4b55a8` | `275ae82 docs(apollo-step9): establish step 9 investigation entry` |

> 本 Phase 1 の「既存実装・既存テスト・既存資料」の調査は、
> pre-flight baseline `cec0ab3` を基準とする。
> Phase 1-A はドキュメント設置のみであり、production code·tests·既存設計資料には手を加えていない。

## origin/main SHA

- pre-PHASE1: `cec0ab326e4e9400d6b6b98efac7602b7652e02d`
- Phase 1-A コミット後: `275ae82ad7a0b6d56e83e58ade8af039df4b55a8`
- local main == origin/main: CONFIRMED

## Working Tree

- 状態: clean
- 未追跡ファイル数: 0 (`git ls-files --others --exclude-standard` → 0 件)
- 進行中の merge/rebase/cherry-pick: none

## 主要ディレクトリ一覧 (repository root)

```text
AGENTS.md
ARCHITECTURE.md
Bridge_Modeler_V2_改良方針案.txt
CHANGELOG.md
CONTRIBUTING.md
LICENSE
README.md
ROADMAP.md
backend/
build/
desktop/
docs/
examples/
frontend/
node_modules/
schemas/
scripts/
start
start-mac.sh
start-ubuntu.sh
start-windows.ps1
マニュアル/
(final_report.txt, level2-type2.* 等資料ファイルも存在)
```

## frontend / backend / docs 構成概要

### frontend/ (TypeScript + React + Vite + Electron)

- package.json: `spacer-clone-frontend` v0.3.0-preview
- 主要ツール: Vite, Vitest, Playwright, TypeScript, React 19, Three.js, zod
- 主要サブディレクトリ: `src/` (apollo, bridge, bridgeDefinition, contracts, data, if3, input, liner, lobby, results, viewer, verification, ...)
- テスト: `frontend/tests/e2e/` (Playwright), `frontend/src/**/__tests__/` (Vitest unit), ルート `*.test.tsx`
- 主要スクリプト: `dev`, `build`, `typecheck`, `lint`, `test`, `test:regression`, `test:all`, `test:e2e`

### backend/ (Python + FastAPI)

- `backend/app/`: main.py (FastAPI), reports.py, atomic_json.py, contract_document_store.py
- `backend/engine/`: FEM解析エンジン群 (assembly.py, bridge_fem_generator.py, bridge_model.py, solver.py, results.py, eigen.py, mass.py, moving_load.py, ... if3_* モジュール群, time_history_*)
- `backend/tests/`: バックエンドテスト

### docs/

- `docs/apollo/`: Apollo プロジェクト研究資料 (README.md, continuous_girder/, ap00/, ap01/, ap11/, design-standards/, step1〜step6_*, phase1-orchestration/, ...)
- `docs/apollo/continuous_girder/`: 連続橋正本資料 (8 ファイル)
- `docs/02_mvp_scope.md`〜`docs/20_agent_instructions.md`: MVP/仕様文書群

## AGENTS.md の主要制約

| 制約 | 内容 |
|------|------|
| 破壊的操作禁止 | git clean, checkout --, restore, reset, revert, force push, rebase 禁止 |
| wildcard add 禁止 | `git add .` / `git add -A` 禁止 (パス個別指定) |
| 未追跡ファイル削除禁止 | `rm` での working tree ファイル削除禁止 |
| 停止条件 | 予期せぬ staged ファイル / typecheck/test 失敗 / 依存関係異常 / 予期せぬ git status 変化 |
| 品質チェック必須 | 事前・事後に typecheck / test 実施 |
| push は明示指示のみ | 通常はローカルコミットのみ |

> 本作業は本手順書 (STEP 9 Phase 1) により main ブランチ直接編集を明示指示として実施する。
> AGENTS.md は最優先の制約として遵守する。

## 調査中の変更禁止範囲

- production code (`/frontend/src/**`, `/backend/**`)
- 数値解析コード (`/backend/engine/**`)
- 既存テスト (`/frontend/tests/**`, `/frontend/src/**/__tests__/**`, `/backend/tests/**`)
- 既存設計資料 (`/docs/apollo/continuous_girder/**`, 他 docs/apollo/**`)
- lockfile / package.json / package-lock.json
- dependency の追加・更新

## Phase 1 で変更予定のパス

- `docs/apollo/step9/README.md`
- `docs/apollo/step9/phase1_continuous_bridge_report_inventory/*` (新規作成のみ)

## Phase 1 で変更しないパス

- `frontend/src/**`, `frontend/tests/**`, `frontend/src/**/__tests__/**`
- `backend/**` (app および engine 含む)
- `docs/apollo/continuous_girder/**`
- `docs/apollo/**` (既存ファイル; 新規サブディレクトリ docs/apollo/step9/ のみ)
- `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`
- `schemas/**`
