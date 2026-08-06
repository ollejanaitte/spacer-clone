# JIP-LINER Gap & Future UX — Research Integration

本ディレクトリは、spacer-clone への統合に先立って実施された調査（JIP-LINER 現行機能の棚卸し・現行システム監査・ギャップ分析・将来 UX コンセプト）の成果物を、spacer-clone のドキュメント領域へ取り込んだものです。

## 取り扱い方針

- **原本非収録**: 調査の参照元である PDF（JIP-LINER マニュアル・SPACER 操作マニュアル・サンプル計算書・設計計算例・図面例）は著作権/権利関係の観点から GitHub へ収録しません。参照元の所在は `source_manifest.csv` に記録しています。
- **個人情報パスの汎化**: 元調査物に含まれていたローカル絶対パス（`/home/...`）は公開版へ取り込む際に汎化・削除しています（`INTEGRATION_MANIFEST.csv` の `copy_decision=COPY_WITH_REDACTION` を参照）。
- **由来の追跡**: 各成果物の出所は `origin-README.md`（調査元 README の写し）と `SOURCE_REFERENCE_INDEX.md` で確認できます。

## ディレクトリ構成

```
jip-liner-gap-and-future-ux/
├── README.md                        # 本ファイル（統合案内）
├── INTEGRATION_MANIFEST.csv         # 統合対象ファイルの管理台帳（sha256・コピー判定・扱い）
├── INTEGRATION_REPORT.md            # 統合作業の実施報告
├── SOURCE_REFERENCE_INDEX.md        # 調査成果物の出所インデックス
├── origin-README.md                 # 調査元 README の写し
├── STATUS.md                        # 調査ステータス
├── research_log.md                  # 調査ログ
├── open_questions.md                # 未解決事項
├── final_report.txt                 # 調査最終報告
├── source_manifest.csv              # 参照元（原本）の所在一覧（パス汎化済み）
├── evidence_register.csv            # エビデンス登録台帳
├── matrices/                        # インベントリ・ギャップ・機能一覧（CSV）
├── research/                        # フェーズ別調査レポート（md）
└── roadmap/                         # 将来ロードマップ（md）
```

## 主な成果物

| 成果物 | 内容 |
|---|---|
| `matrices/current_system_inventory.csv` | 現行システム（SPACER/Apollo 相当）の機能・項目インベントリ |
| `matrices/gap_matrix.csv` | JIP-LINER と現行システムのギャップ行列 |
| `matrices/jip_liner_feature_inventory.csv` | JIP-LINER 機能インベントリ |
| `research/02_current_system/current_system_audit.md` | 現行システム監査（フェーズ2） |
| `research/03_gap_analysis/gap_analysis.md` | ギャップ分析（フェーズ3） |
| `research/06_editor2d/editor2d_architecture.md` | 2D エディタ将来アーキテクチャ構想 |
| `roadmap/roadmap.md` | 将来 UX 実装ロードマップ |

## 参照先

- この調査の作業ホーム: `~/Projects/liner-future-research`（ローカル・GitHub 非公開）
- 統合先リポジトリ: spacer-clone（`docs/liner/` 領域）
