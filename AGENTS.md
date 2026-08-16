# Repository Agent Rules

## 破壊的操作の全面禁止
- `git clean` 系コマンド全般禁止（`-n` dry-run も禁止）
- `git checkout -- <file>` / `git restore <file>` / `git reset --hard` 禁止
- `git reset` / `git revert` を勝手に実行しない
- force push / `git push -f` 禁止
- リモートへの push は明示指示があった場合のみ実行可（通常はローカルコミットのみ）
- 未追跡ファイルを勝手に削除しない
- `rm` / `Remove-Item` で working tree ファイルを削除しない
  （明示指示があるファイルを除く）
- ブランチ削除禁止

## 追加ルール
- `git add .` / `git add -A` などのワイルドカード add 禁止
  （パスを明示的に指定）
- 判断がつかない状況になったら停止して報告
- 停止時はこれまでの変更を取り消さず、現状をそのまま報告
- 事前・事後の品質チェック（typecheck / test）は必ず実施

## 停止条件
以下に該当したら直ちに停止：
- 想定外のファイルが staged された
- typecheck / test が失敗した
- 依存関係が想定と異なった
- git status に想定外の変化を検知した

## Standard Git Workflow（作業標準ルール）

すべての作業（調査・設計書作成・ドキュメント更新・実装・テスト・検証）は以下の運用に従う。

### 作業開始前

1. `git fetch origin` で最新 origin/main を取得する
2. `git rev-parse origin/main` で BASE_MAIN_SHA を確認する
3. `git worktree add --detach <WORKTREE_PATH> origin/main` で専用worktreeを作成する
4. worktree内で `git checkout -b <FEATURE_BRANCH>` でfeature branchを作成する
5. 必ず以下を報告する：
   - BASE_MAIN_SHA
   - WORKTREE_PATH
   - FEATURE_BRANCH
   - WORKING_BRANCH
   - TARGET_SCOPE

### 作業中

- すべての編集は専用worktree内でのみ行う
- mainブランチでは作業しない
- 他worktreeを編集しない
- origin/main へ直接 push しない
- main へ直接 commit しない

### 作業完了時

1. 対象ファイルのみを `git add <PATH>` で stage（ワイルドカード禁止）
2. `git commit -m "<メッセージ>"` で commit
3. `git push origin <FEATURE_BRANCH>` でリモートへ push
4. `gh pr create` で Pull Request を作成する
5. CI・レビュー・検証を経て承認を得る
6. 承認後にのみ `gh pr merge --merge` で main へ merge
7. 必ず以下を報告する：
   - COMMIT_SHA
   - FEATURE_BRANCH
   - PR_NUMBER
   - CI_STATUS
   - MERGE_READY
   - MAIN_UPDATED

### 禁止事項（再掲）

- mainブランチでの作業
- origin/mainへの直接push
- mainへの直接commit
- force push（`git push -f`）
- 未承認merge
- 他worktreeへの編集

## Frontend Test Gates (AIエージェント標準Gate)

フロントエンドの検証は [docs/development/vitest-gates.md](docs/development/vitest-gates.md) に従う。
作業ディレクトリは `frontend/`。

| 変更 | 実行Gate |
| --- | --- |
| 純ロジック | `npm run test:fast` + `npm run typecheck` |
| UIコンポーネント | `npm run test:fast` + `npm run test:ui` + `npm run typecheck` + `npm run build` |
| 3D / Canvas / Viewer | `npm run test:fast` + `npm run test:3d`（必要に応じて electron/e2e） |
| Electron | `npm run test:fast` + `npm run test:electron` + `npm run typecheck` + `npm run build` |
| マイルストーン完了 | `npm run test:full`（最終Gate・原則1回）+ `npm run typecheck` + `npm run build` |

- 全件Vitest (`test:full`) は最終Gate。作業途中で何度も回さない。
- `test:fast` は通常修正の代表的な高速Gate（約35秒）。
- SLOW / 3D テストは削除・skipしない。専用Gateと `test:full` で必ず実行する。

## 開発・テスト運用ルール

- 検証Gate・E2E運用・FAIL分類・schema/persistence・UI変更・時間制限・CI現況の
  正式ルールは [docs/development/development-test-rules.md](docs/development/development-test-rules.md) を参照。
- 本リポジトリのGitワークフロー（worktree / feature branch / PR / merge）は
  このAGENTS.mdの「Standard Git Workflow」節に従う。
  ただしAI-RIM実行時の依頼内容が明示的にmain直接作業を指示する場合は、
  依頼内容の指示を優先する。
