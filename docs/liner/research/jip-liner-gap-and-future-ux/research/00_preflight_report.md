# Phase 0: Preflight Report

## 基本情報

```text
RESEARCH_ROOT: ~/Projects/liner-future-research
REPOSITORY_REMOTE: https://github.com/ollejanaitte/spacer-clone.git
REMOTE_DEFAULT_BRANCH: main
REMOTE_BASELINE_SHA: 7b07f623b7db1fc560e19c2626d488e718da8652
```

- 基準SHA取得方法: `git ls-remote https://github.com/ollejanaitte/spacer-clone.git` (2026-08-06T17:22:00Z)
- スナップショット取得方法: `git clone --depth 1 --single-branch` (main) → sources/repository/
- スナップショットHEAD: `7b07f623` (commit message: docs(apollo-step10): seal Phase 2-I source decomposition (#440))

## 現行ローカルリポジトリの状態（読取りのみで確認）

```text
LOCAL_REPOSITORY_TOUCHED:
  - spacer-clone(with worktree docs/apollo-step10-p2ii-0-truth-gate) は「git status/git rev-parse/git branch/git worktree list」
    の読取りコマンドのみ実行。ファイルの変更・作成・削除・上書きは一切なし。
  - HEAD: c6e7348d7e9ab8ecfda5adb847085ef280086588
  - branch: docs/apollo-step10-p2ii-0-truth-gate
  - origin/main: 7b07f623b7db1fc560e19c2626d488e718da8652 (= 今回の基準SHAと一致)
  - git status --short 件数: 3
  - worktree一覧:
      spacer-clone(with worktree docs/apollo-step10-p2ii-0-truth-gate)         c6e7348 [docs/apollo-step10-p2ii-0-truth-gate]
      /tmp/opencode/p2i_verify                    7b07f62 (detached HEAD)
  - 現行進行中(上部工Apollo)のブランチはdocs/apollo-step10-p2ii-0-truth-gate。その差分内容は閲覧していない。
  - ローカル未反映作業(上記ブランチ/3件)は今回の正本にしない。

ACTIVE_WORKTREE_MODIFIED: なし (調査によって変更したworktreeは存在しない)
GIT_WRITE_OPERATION_EXECUTED: なし
IMPLEMENTATION_OPERATION_EXECUTED: なし
```

## 調査対象・非対象

- 調査対象（正本）: 公開リポジトリ `main@7b07f62` のスナップショット + 各種PDF資料
- 非対象: ローカル未反映の上部工進行中ブランチ、Apollo実装フォルダ、実装作業
- 資料不足対応: 見つからない資料は本レポート/OQに記録し、入手済み資料で継続

## 資料探索結果

探索対象: `~/Projects`, `~/Downloads`, `~/Desktop`, 既知資料フォルダ

見つかった主要資料:
- `~/Projects/spacer-clone/マニュアル/JIP-LINER_マニュアル.pdf` (P183, 正本)
- `~/Projects/spacer-clone/マニュアル/SPACER操作マニュアル.pdf` (未複製)
- `~/Projects/spacer-clone/001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF`
- `~/Projects/鋼鈑桁橋_設計計算例.pdf` / `鋼鈑桁橋_図面例.pdf`
- `~/Projects/Scope_of_Work/` (曲線橋step10調査一式。Phase8の既存検討として参照)
- `~/Projects/26080_ApolloUIデザイン修正指示内容.odp`

見つからなかった資料（`open_questions.md` にも記録）:
- JIP-LINERの帳票ビューワ(TV)・プロットビューワ(PV)の独立操作マニュアル
- LINER単体の詳細データ構文マニュアル（本文中に言及される「LINERマニュアル」）
- APOLLO/SuperDesigner専用マニュアル
- Y字橋・ランプ橋の実設計計算例
- クロソイド内部アルゴリズムの公式文書

探索ツール: `find`/`ls`（読取り）。ファイルハッシュは `sha256sum`。

## 隔離・安全確認

- 調査フォルダ `~/Projects/liner-future-research` を新規作成。既存の上書きなし（初回作成時に存在しないことを確認）
- スナップショットは調査フォルダ内のみ。取得後に `.git` とPDFを read-only 化
- 現行リポジトリ・worktreeへの書き込みなし
- 外部サイトは読取りのみ（GitHub clone・公式PDFの参照）

## 結論

```text
PREFLIGHT_VERDICT: PASS
```

- 調査フォルダは現行開発から完全独立
- 現行リポジトリは読取りのみ・変更なし
- 基準SHA(7b07f62)はローカルorigin/mainと一致し、再現可能