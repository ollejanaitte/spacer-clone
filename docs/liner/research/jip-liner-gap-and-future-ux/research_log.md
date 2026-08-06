# research_log.md

調査の実施履歴。日時・実施内容・成果物・所見を追記する。

## 2026-08-06 (UTC)
| 時刻(UTC) | 実施 |
|---|---|
| 17:20 | Preflight開始。作業フォルダ確認、資料探索、`liner-future-research`作成 |
| 17:20 | 現行リポジトリ読取り確認(HEAD c6e7348, branch docs/apollo-step10-p2ii-0-truth-gate, origin/main 7b07f62, worktree 1つ, status 3件) |
| 17:22 | `git ls-remote`で基準確立。remote HEAD=7b07f623 |
| 17:22 | スナップショット取得 `git clone --depth 1 --single-branch` @7b07f623 |
| 17:22 | マニュアル・計算例・図面例PDFをsources/へ複製(read-only化) |
| 17:25 | 各PDFテキスト抽出(pdftotext)。JIP-LINERマニュアル183P全文精読 |
| 17:26 | source_manifest.csv・README・STATUS作成 |
| 17:30~ | Phase1 JIP-LINER棚卸し開始 |

## 2026-08-07 (UTC)
| 時刻(UTC) | 実施 |
|---|---|
| 02:20~ | スナップショット(sources/repository)上で現行システム監査実施 |
| ~ | Phase1-9・外部調査・整合・final_report.txt 完遂 |

## 環境変化の記録（調査の責務外）
- 調査中、`~/Projects/spacer-clone` の HEAD が `c6e7348` → `91e5fe0`（commit #441, docs(apollo-step10): reconcile Phase 2-I truth and open Phase 2-II）へ外部の並行作業により移動。加えて `docs/apollo/step10/reference_bridge_001/phase2/phase2_ii/unread_resolution/`（未追跡）が出現し status 3件→4件。
- 本調査はこのブランチの作業中に実施されたため、HEADの移動は調査由来ではない（読取りコマンドのみ使用）。基準正本は main@7b07f623 のスナップショットで不変（read-only化済み）。
- このブランチ（step10 P2-II）の内容は監査対象外。今後の統合時はスナップショット再取得を推奨。

## 今後
- （なし。全フェーズ完了）