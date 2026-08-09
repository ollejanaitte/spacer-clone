# Track A Integration Preflight Report

## 調査成果物側 (~/Projects/liner-future-research)
DONE

| 確認 | 結果 |
|---|---|
| フォルダ存在 | OK |
| final_report.txt | 存在（FINAL_VERDICT: COMPLETE） |
| README.md / STATUS.md / evidence_register.csv | 存在 |
| research/ / matrices/ / roadmap/ | 存在 |
| handoffs/ | 存在しない（本調査では未使用）→ 記載外として扱う |
| .git / シンボリックリンク / キャッシュ / 一時ファイル | 無し |
| 大容量 | sources/repository(532M, clone)・PDF原本が大多数 |
| 収録対象(sources/ 除く)テキスト | 26 file / 約 174KB |
| PDF原本 | sources/manuals + sources/design_examples に多数 |

## 収集対象と非対象

- コピー対象: README.md, STATUS.md, research_log.md, open_questions.md, final_report.txt, source_manifest.csv(redaction), matrices/**, research/**, roadmap/**（PDF・clone除く）
- 収録禁止: sources/（repository clone, manuals PDF, design_examples PDF）、diagrams/（存在しない）

## 正本リポジトリ側 (/home/masaharu/Projects/spacer-clone)

```
REPOSITORY_PATH: /home/masaharu/Projects/spacer-clone
CURRENT_BRANCH: docs/apollo-step10-p2ii-a-unread-resolution (main でない・進行中 Apollo 作業用)
GIT_STATUS_SHORT: 未整理変更あり（上部工/Apollo 作業中）
WORKTREE_LIST: 2 件（上記 worktree + /tmp/opencode/p2i_verify detached 7b07f623）
ORIGIN_MAIN / DEFAULT_REMOTE: origin.main
UPSTREAM_HEAD(remote): 53833ee... (baseline 7b07f623 以降に更新済み)
```

## Track A 中断条件の判定

- 「spacer-clone の未整理変更」「branch != main」「上部工進行中」を確認。
- **対策**: 実行は origin/main ベースの clean clone で行い、進行中 worktree 自体へは書込まない。
- よって Track A は「進行中作業の上書きを避ける」形で安全に進められる。

PREFLIGHT_VERDICT: PASS（進めると判断）