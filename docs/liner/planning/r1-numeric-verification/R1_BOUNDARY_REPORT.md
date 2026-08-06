# R1_BOUNDARY_REPORT

- **適用先**: spacer-clone 上で予定中の **R1 数値検証基盤** の実装
- **本報告の目的**: R1 実装に着手する前の事前計画として、「何を実装するか」「どこまで許可/禁止か」「境界」を確定する。

## 1. 作業境界（自動化の前に明示）

- **R1 調査ホーム**: `~/Projects/liner-future-research/r1-planning/`（本計画ファイル群。編集可）
- **実装/生成対象**: spacer-clone（**編集禁止**）
- **Git/GitHub**: 本計画フェーズでは**一切変更しない**（編集禁止・push 禁止・PR 禁止・commit 禁止）

## 2. 中途状態スナップショット（事前）

R1 計画時点の spacer-clone 進行中 worktree の読み取り実績（reference のみ、変更なし）:

- **HEAD**: b6775ddf41707dddac0de24df2cf782c49ac11c2
- **branch**: `docs/apollo-step10-p2ii-a-unread-resolution`
- **origin/main（本計画参照時点）**: f1107b541ee45b6589b2ad9da2b4c045a8901310
  （※ Track A により docs/liner 統合 PR #443 をマージした commit を含む）
- **本計画の基準 SHA**: b6775ddf41707dddac0de24df2cf782c9ac11c2（作業中の現 worktree）

以後の計画文書では、上記を「R1 計画の基準」として扱う。

## 3. R1 の目的（本計画）

1. **数値の信頼性を「解析参照のみ」から「外部突合」へ引き上げる**
   - 現行ゴールデン（解析参照: Simpson 等）は独立検証として残す
   - 正本を「実 JIP-LINER 出力（SRC-004）」「実設計計算例（SRC-005）」とする2層検証へ
2. 対象 GAP:
   - GAP-1000（ゴールデン外部突合）
   - GAP-1001（描画ゴールデン自己参照 → 外部帳票突合）
   - GAP-1002（Importer 補間値 C1-C17/GE2 → PDF 実値置換）
3. **ロードマップ上の R1（短期）**: F18/F19 検証のゴールデン化と一致テスト新設

## 4. 境界（本計画フェーズで実施して良いこと）

- `r1-planning/` 配下への計画文書の作成のみ
- spacer-clone の読み取り（git status / rev-parse / branch / worktree list / 対象テストファイル / 対象ソース）
- 実装・Git・GitHub は**一切**しない

## 5. 禁止事項（本計画フェーズで実施してはならないこと）

- spacer-clone のファイルの新規作成・変更・削除・上書き
- git commit / add / push / checkout / branch 変更 / merge / reset（作業中 worktree 含む）
- GitHub 上の PR 作成・マージ・close・branch 削除
- 本計画の成果物（.md）以外を spacer-clone へ取り込む行為

## 6. 完了条件（本計画フェーズ）

- [x] 境界を文書化（本ファイル）
- [x] R1 実装計画一式（B1〜B2）を作成
- [ ] spacer-clone の非変更を監査（BEFORE ↔ AFTER の一致確認）

## 7. 判断記録の扱い

途中で判断を返す必要はないと明示され、且つ各フェーズは単独で完遂する 形式のため、
境界違反が発生した場合は B3 監査で FAIL と記録し、進行を停止する。
（本計画前の事前確認では、違反は検出されていない。）