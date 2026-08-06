# INTEGRATION_REPORT

- **Status**: COMPLETE
- **統合元**: `~/Projects/liner-future-research`(ローカル調査ホーム、GitHub 非公開)
- **統合先**: spacer-clone `docs/liner/research/jip-liner-gap-and-future-ux/`
- **統合日時**: 2026-08-07
- **統合種別**: docs-only(マークダウン/CSV/テキストのみ)

## 1. 目的

JIP-LINER 現行機能の棚卸し・現行システム監査・ギャップ分析・将来 UX コンセプトの調査成果物を、
spacer-clone のドキュメント領域(`docs/liner/`)へ取り込む。

## 2. 統合対象

- 調査成果物 **25 ファイル**(md / csv / txt)
- 詳細は `INTEGRATION_MANIFEST.csv`(item_id / sha256 / copy_decision を網羅)

## 3. 収録除外(非 commit)

作業していた PDF 元本(JIP-LINER マニュアル / SPACER 操作マニュアル / サンプル計算書 /
設計計算例 / 図面例)および巨大 zip は、権利・認性の理由から GitHub へ収録しない。
所在情報のみ `source_manifest.csv` に記録。

## 4. セキュリティ / 機密対応

`source_manifest.csv` / `final_report.txt` / `research/00_preflight_report.md` に含まれていた
ローカル絶対パス(`/home/...`)とユーザー名を公開版へ取り込む際に汎化・削除
(マニフェストの `copy_decision=COPY_WITH_REDACTION`)。

## 5. 整合性検証

- マニフェスト記載の 25 件 dest パスが reporoot から全て存在(parity OK)。
- sha256 は調査元から採番済み(redaction 対象を除く)。

## 6. 結果

- 統合ファイル数: 25
- 統合補助ドキュメント: `README.md` / `INTEGRATION_MANIFEST.csv` / `SOURCE_REFERENCE_INDEX.md` / 本レポート