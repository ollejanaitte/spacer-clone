================================================================================
Phase R1  R1-00  開始前baseline・R0継承確認
================================================================================
Phase R1 開始時点の正規baseline記録。R0 成果の継承確認。

監査日: 2026-08-10

--------------------------------------------------------------------------------
1. 正規環境
--------------------------------------------------------------------------------
- 旧worktree : /home/masaharu/Projects/spacer-clone（branch: main）
- 新worktree : /home/masaharu/Projects/spacer-clone-next（branch: rebuild/integrated-system）
- remote     : origin = https://github.com/ollejanaitte/spacer-clone.git

--------------------------------------------------------------------------------
2. SHA（R1-00 開始時）
--------------------------------------------------------------------------------
- origin/main                 : 42448712c44868855a247b6b947c3e446473fecd
- rebuild/integrated-system   : 539e2ffad70c6354fdcc49507cd154a325d4706a
- 旧main worktree HEAD        : 42448712c44868855a247b6b947c3e446473fecd
- 旧main dirty                : evidence JSON 3件 + final_report.txt 削除（保護継続）

--------------------------------------------------------------------------------
3. R0 成果の main 反映
--------------------------------------------------------------------------------
R0 文書（docs/rebuild/ 11文書）は rebuild branch 上のみにあったため、
R1-00 で main へ反映する PR を作成・merge した。

- PR #812: docs(rebuild): Phase R0 rebuild policy + final report
- merge後 main SHA: 88e6ef59cc6163ca650882f045eccee18b043e6c
- 内容: 文書のみ（旧アプリ機能の変更なし）

その後 rebuild/integrated-system を main へ同期（merge、安全）。
- rebuild SHA: 4560eaf4e5404048b25392d213a6d6610ab27aea
- 検証: `git diff origin/main` が空 = rebuild の tree が main と同一

--------------------------------------------------------------------------------
4. 開発環境（新worktree）
--------------------------------------------------------------------------------
- frontend/node_modules → /tmp/wt-m2-08/frontend/node_modules（symlink、vitest/playwright/electron有）
- .venv → /home/masaharu/Projects/spacer-clone/.venv（fastapi/uvicorn/scipy 動作確認済み）
- Node.js v22.23.2 / npm 10.9.8 / Python 3.10.12

--------------------------------------------------------------------------------
5. Phase R0 方針の継承
--------------------------------------------------------------------------------
- 旧main = 旧システム安定版・移植元・比較対象（保全）
- rebuild/integrated-system = 新システム長期統合 branch
- 今回のユーザー指示により、R1 の各小ステップは
  feature branch → PR → GitHub main へ細かく merge する（R0 の「main混ぜない」方針は
  今回の明示指示が優先）。
- ただし旧システム資産を理由なく破壊・置換しない。

--------------------------------------------------------------------------------
6. R1 実装開始可否
--------------------------------------------------------------------------------
開始可。
新worktreeは独立・clean、開発環境（node_modules/.venv）準備済み、
R0 文書は main へ反映済み、rebuild は main と同期済み。

--------------------------------------------------------------------------------
7. 成果物
--------------------------------------------------------------------------------
本ファイル: docs/rebuild/r1/R1-00_baseline.md
判定: PASS
