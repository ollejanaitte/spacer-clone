# Roadmap

このロードマップは、現時点の実装、既存設計メモ、検証ドキュメントから整理した公開向けの開発計画です。詳細な設計判断は `docs/` 配下の各仕様書を優先します。

## Short Term

短期では、現在の Preview 機能を OSS として理解・検証しやすい状態に整えます。

- LINER の完成度向上
  - 平面線形、縦断、横断、グリッド生成 UI の安定化
  - マッピングレビューから `project.json` 生成までの導線改善
  - インポータ、保存/読込、復旧フローの検証
- DXF Export 改善
  - LINER plan/profile DXF の仕様固定
  - layer、unit、text、station tick の出力検証
  - SVG Export 仕様との整合
- UI 改善
  - 解析結果表示、Viewer 操作、時刻歴ダッシュボードの導線整理
  - 大規模モデルのラベル、線幅、表示速度改善
  - A/B 比較ビューの差分表示
- 検証強化
  - SPACER 比較モデルの追加
  - 静的/固有/応答スペクトル/時刻歴の 6 自由度表示点検
  - LINER golden fixture の拡充
- OSS 基盤
  - `LICENSE` の追加
  - CI の標準化
  - Release / versioning 方針の明文化
  - GitHub Issues / Discussions テンプレート整備

## Mid Term

中期では、橋梁モデルと解析モデル生成を実務ワークフローに近づけます。

- 橋梁モデル自動生成
  - Bridge Wizard の入力支援強化
  - 支承、横桁、床版、主桁などのモデル生成ルール拡張
  - 生成モデルの検証レポート出力
- 鋼橋断面定義
  - 断面ライブラリ
  - 断面諸元の計算/検証
  - 部材属性との連携
- 解析モデル生成
  - LINER と Bridge Wizard の生成モデル統合
  - 荷重ケース、質量ケース、支点条件の自動生成
  - 生成 FEM の schema / validation 強化
- 解析機能拡張
  - 影響線と移動荷重の UI 完成
  - 移動荷重 envelope の可視化
  - 動的解析結果表と PDF 帳票の強化
- Viewer / Report
  - 断面力分布図、反力図、モーメント円弧表示
  - カラーマップ、凡例、ラベル衝突回避
  - HTML/PDF 帳票テンプレート整理

## Long Term

長期では、橋梁設計・CIM 連携・高度解析の基盤を目指します。

- 施工ステップ解析
  - 架設ステップ、荷重履歴、ステージ別境界条件
- 動的解析
  - 非線形時刻歴解析
  - 減衰モデル拡張
  - 入力地震波管理と解析ケース管理
- ケーブル橋
  - ケーブル要素
  - 初期張力
  - 幾何非線形解析
- CIM / BIM 連携
  - IFC Export / Import
  - LandXML alignment 連携
  - 3D モデル属性連携
- 設計照査
  - 道路橋示方書などに基づく照査モジュール
  - 荷重組合せ
  - 許容値、照査結果、帳票
- 外部連携
  - 解析モデル交換形式
  - CAD / GIS / FEM ツール連携
  - Plugin / extension API

## Tracking

詳細な設計・検証メモ:

- [docs/design/mvp-implementation-roadmap.md](docs/design/mvp-implementation-roadmap.md)
- [docs/handover/2026-06-next-tasks.md](docs/handover/2026-06-next-tasks.md)
- [docs/handover/2026-06-improvement-candidates.md](docs/handover/2026-06-improvement-candidates.md)
- [docs/liner/README.md](docs/liner/README.md)
