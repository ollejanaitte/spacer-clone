# Inventory — 事前調査・Git 実測

> **Phase:** P0 / P1 preflight
> **Date:** 2026-08-08
> **作業前に実測した内容。既存成果は変更していない。**

## 1. リポジトリ実測

- 正本 repository: `spacer-clone`（remote: `https://github.com/ollejanaitte/spacer-clone.git`）
- 同一 repository の worktree が複数存在（`git worktree list` 確認済み）。
- 下記以外に `/tmp/opencode/*` に多数の作業用 worktree があるが、すべて
  `main` へ merge 済みブランチの残骸（detached / merged）。**触らない。**

### main worktree（/home/masaharu/Projects/spacer-clone）
| 項目 | 値 |
|------|-----|
| branch | `main` |
| HEAD SHA | `4e79b3c38103fc0478ec848cc5b5d98b3d003016` |
| origin/main | `4e79b3c38103fc0478ec848cc5b5d98b3d003016`（一致・未push差分なし） |
| dirty | `docs/apollo/step4c_appurtenance_haunch/evidence/{load,quantity,stl-metadata}.json`（生成時刻・digest の再現のみ。触らない） |
| untracked | なし |

### liner-r1-planning worktree（/home/masaharu/Projects/spacer-clone-liner-r1-planning）
| 項目 | 値 |
|------|-----|
| branch | `research/liner-terrain-fix-p01-coords` |
| HEAD SHA | `c7d7774f1acbfb437f0ad6e799efb2d87a923f6a` |
| dirty | 上記と同じ evidence JSON 3ファイル |
| untracked | `docs/liner/research/road-structure-ordinance/`（道路構造令調査資料） |
| origin | `origin/research/liner-terrain-fix-p01-coords`（一致） |

### 主要ブランチ差分
- merge-base (`main` ↔ `research/liner-terrain-fix-p01-coords`): `6a8f128e0e4a42420aa986626cf0d2cc6f0c0b32`
- research 側 ahead: 203 commits（道路線形の MAIN3D・山岳500m・terrain fix 等）
- research 側 behind: 271 commits（main 側の apollo step2/3・substructure phase-c1 等が未反映）

## 2. GitHub 実測

- open PR: **0 件**（すべて merge 済み）
- 直近 merge: PR #691（phase-c1-adapter-a08-closeout）が HEAD `4e79b3c` を構成。
- ①道路線形は `research/liner-*` 系列に merge 済みで、`main` への統合待ち。

## 3. 保護対象（既存成果）

作業中に下記を壊さない・触らない・勝手に reset/clean しない。

1. `main` の dirty 差分（step4c evidence JSON 3ファイル）
2. `research/liner-terrain-fix-p01-coords` の全 203 commit（未統合道路線形成果）
3. `/tmp/opencode/*` の既存 worktree
4. 契約層の既存 schema / fixture / validator（拡張は additive のみ）

## 4. 本作業の作業場

- worktree: `/tmp/opencode/bridge-project-phase1-2`
- branch: `research/bridge-project-phase1-2`
- base: `origin/main` (`4e79b3c`)
- 方針: 変更はすべてこの worktree 内で行い、小さい commit + 小さい PR で
  `main` へ段階 merge する（AGENTS.md Standard Git Workflow 準拠）。
