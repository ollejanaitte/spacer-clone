# JIP-LINER機能差分監査・線形座標計算ツール将来UX構想調査

## 概要
この作業は、JIP-LINERユーザーズマニュアル・現行 `spacer-clone`・設計計算例・図面例・公開情報をもとに、以下を調査・整理・資料化する。

1. JIP-LINERにあり現行に不足する機能
2. 現行に存在するが部分/UIのみ/計算コアのみ/未検証の機能
3. 設計実務上必要だがJIP-LINER再現だけでは不足する機能
4. ユーザー目線で追加すべき操作・表示・検証機能
5. 2D平面GUI線形入力の構想
6. 平面・縦断・横断・橋脚・スパン・主桁・横桁・3Dの連動構想
7. 上部工・骨組み解析・図面・3Dへ渡すべきデータ
8. 曲線橋・複数中心線・ランプ橋・Y字橋への拡張前提
9. 実装順序・依存関係・技術リスク

**本作業は調査・資料化のみ。実装は一切行わない。**

## 現在の開発保護方針

- `~/Projects/spacer-clone` を編集しない
- 現在使用中のworktreeを編集しない
- Apollo関連作業フォルダを編集しない
- 上部工実装フォルダを編集しない
- 現行リポジトリ内に調査成果物を作らない
- 依存関係は導入しない、build/test/lint/formatは実行しない
- Git書き込み操作・GitHub変更は行わない
- 既存ファイルは移動・削除・上書きしない
- 現行リポジトリは**読み取りのみ**（`git status`等の読取りは許可）

座標デジタル証拠・基準は `final_report.txt` に集約。成果物一覧は各フェーズのファイル。

## 調査正本

| 項目 | 値 |
|---|---|
| 調査作業フォルダ | `~/Projects/liner-future-research` |
| 基準リポジトリ | https://github.com/ollejanaitte/spacer-clone.git |
| 基準SHA | `7b07f623b7db1fc560e19c2626d488e718da8652` (main, 2026-08-06取得) |
| JIP-LINERマニュアル | `sources/manuals/JIP-LINER_マニュアル.pdf` (P183) |
| サンプルLINER計算書 | `sources/design_examples/` |

## 成果物インデックス

`STATUS.md`、`research_log.md`、`final_report.txt` を参照。