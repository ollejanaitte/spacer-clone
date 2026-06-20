# 改善候補一覧（TH-10 完了後）

## 現状サマリ

| 項目 | 状態 |
|------|------|
| フロントエンド テスト | 40 files / 434 tests 全 PASS |
| TypeScript 型チェック | エラーなし |
| Lint | パス |
| Vite ビルド | 成功（1.8 MB JS） |
| バックエンド | venv 未構築（手元環境） |

---

## 改善候補一覧（リスク低い順 → 高い順）

### リスク低・効果中

| # | 改善内容 | 根拠ファイル | 効果 |
|---|----------|-------------|------|
| 1 | **ビルドサイズ最適化**（dynamic import / code splitting） | Vite build warning 1.8MB | 起動速度・メモリ改善 |
| 2 | **テストカバレッジ向上**（SceneBuilder 0%, InputCheck 0%, SectionRun 0%, renderers 多く低カバレッジ） | `npm run test -- --run` coverage | 回帰防止 |
| 3 | **A/B比較：同一IDメトリクス差分テーブル** | `docs/design/model-comparison-view.md` §10 推奨初実装 | 比較ビューの実用性向上 |
| 4 | **回転DOF（RX/RY/RZ）の3D可視化設計** | `docs/handover/2026-06-next-tasks.md` §「回転自由度を可視化する場合は…表示仕様設計が必要」 | 解析結果の完全性 |

### リスク中低・効果中

| # | 改善内容 | 根拠ファイル | 効果 |
|---|----------|-------------|------|
| 5 | **固有値モード変位表示不具合の修正** | `docs/handover/2026-06-next-tasks.md` 最優先 | ユーザー報告バグ修正 |
| 6 | **変位表示総点検**（静的/固有値/応答スペクトル/時刻歴 × 6自由度） | `docs/handover/2026-06-next-tasks.md` | 表示整合性の保証 |
| 7 | **ラベル衝突回避（優先度ベース非表示 + 選択中強制表示）** | `docs/design/viewer-rendering-improvements.md` Phase A/C | 大規模モデルの可読性 |

### リスク中・効果中高

| # | 改善内容 | 根拠ファイル | 効果 |
|---|----------|-------------|------|
| 8 | **Line2 / LineMaterial 導入**（部材線幅の確実な制御） | `docs/design/viewer-rendering-improvements.md` Phase B | 線幅UIの信頼性 |
| 9 | **A/B比較：Bモデル永続保存** | `docs/design/model-comparison-view.md` §4, Phase2-D | 比較作業の永続化 |
| 10 | **時刻歴結果表の改善** | `docs/handover/2026-06-next-tasks.md` 未実装リスト | 結果確認の利便性 |
| 11 | **断面力分布図・カラーマップ・モーメント円弧矢印** | `docs/handover/2026-06-next-tasks.md` 残課題 | 構造設計者の必須表示 |

### リスク中高・効果高

| # | 改善内容 | 根拠ファイル | 効果 |
|---|----------|-------------|------|
| 12 | **A/B比較：同期再生・オーバーレイ・別ウィンドウ** | `docs/design/model-comparison-view.md` Phase2-C, Phase3 | 比較体験の大幅向上 |
| 13 | **SPACER比較モデル整備** | `docs/handover/2026-06-next-tasks.md` 検証 | 信頼性向上 |

### リスク高・効果中（実装難度）

| # | 改善内容 | 根拠ファイル | 効果 |
|---|----------|-------------|------|
| 14 | **非線形時刻歴解析**（Newmark-β Newton-Raphson 拡張） | `docs/design/time-history-analysis.md` §14 | 機能拡張（長期） |
| 15 | **PDF帳票の動的解析結果出力強化** | `docs/handover/2026-06-next-tasks.md` | 帳票の完全性 |

---

## 推奨着手順

1. **第1フェーズ（低リスク・低コスト）**: #1〜#3
2. **第2フェーズ（バグ修正・品質）**: #5〜#7
3. **第3フェーズ（機能拡張）**: #8〜#11
4. **第4フェーズ（長期拡張）**: #12〜#15
