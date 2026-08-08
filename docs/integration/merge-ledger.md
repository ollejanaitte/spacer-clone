# Merge Ledger — Phase 1-2

> **Phase:** P5
> 各 PR の目的・merge SHA を記録する。baseline は各 PR 直前の origin/main。

## Baseline
- **BASE_MAIN_SHA:** `4e79b3c38103fc0478ec848cc5b5d98b3d003016`（作業開始時 origin/main）

## Merged PRs

| PR | 内容 | Feature branch | Base main (before) | Merge SHA (origin/main after) | 検証 |
|----|------|-----------------|---------------------|-------------------------------|------|
| #717 | P0/P1 inventory + current data flow + duplicates/conflicts/gaps | `research/bridge-project-phase1-2` | `4e79b3c` | `2344c87368236840888628a9dcf88b877b46e898` | docs only |
| #718 | P2 responsibility boundary | `research/bridge-project-phase1-2` | `2344c87` | `a370f2c05e3ddf8dbb2d22a4e74024cee8034010` | docs only |
| #719 | P3 BridgeProject contract + CBDM value-state extension | `research/bridge-project-phase1-2` | `a370f2c0` | `d479d93266c83dc59942dff472987f37a237f554` | typecheck + contracts 280 tests + adapters + P5 validator |
| #720 | P4 adapter boundaries + CASE A/B sequences | `research/bridge-project-phase1-2` | `d479d932` | `cd1f315973ec88f6b2c54234dad91db12a64f151` | docs only |
| #721 | P5 closeout (phase3 order / blockers / ledger) | `research/bridge-project-phase1-2` | `cd1f3159` | `e83a7f1b74535d8be8990ff333421f3e34041fb3` | docs only |

## 作業ブランチ
- `research/bridge-project-phase1-2`（worktree: `/tmp/opencode/bridge-project-phase1-2`）
- 全 PR をこのブランチから `main` へ `--merge`。merge 後に rebase して baseline を更新。

## 保護対象（未変更を確認）
- `main` の dirty evidence JSON（step4c）3ファイル — 触っていない
- `research/liner-terrain-fix-p01-coords` の 203 commit — 触っていない
- `/tmp/opencode/*` の既存 worktree — 触っていない
