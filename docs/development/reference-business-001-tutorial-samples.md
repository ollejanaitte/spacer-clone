# SPACER CLONE — Tutorial Sample 区別 (Lane S / S-1 付属)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 上位文書: [reference-business-001-spec.md](reference-business-001-spec.md) (S-1)
- 本稿の位置づけ: 将来的に用意する 2 種類の sample (Reference Business 001 / Tutorial Sample) の
  区別を固定する。Wave 1 では Reference Business 001 を優先し、Tutorial Sample は要件のみ整理する。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (要件整理・実装は以後)

---

## 1. 2 種類の sample

| 項目 | Reference Business 001 | Tutorial Sample |
|---|---|---|
| 位置づけ | 本番相当・Acceptance 用 | 軽量・学習用 |
| 地形 | 国土地理院実地形 (郡上市八幡・EPSG:6674) | 合成地形 (軽量・即時表示) を想定 |
| road | 実座標系 (2,450m・長良川横断) | 簡易線形 (例: 300m 直線+曲線) を想定 |
| bridge | 実橋梁配置 (S-4 で確定) | 単純橋 (1〜2径間) を想定 |
| analysis | 本番相当 (oracle 適合) | 簡易解析 (成功体験のみ) を想定 |
| CIM | 統合3D / GLB | 簡易3D表示を想定 |
| 所要時間 | 受入確認用 (一連の操作) | 10〜20分で主要操作確認 |
| 対象 | 受け入れ判定者・実務技術者 | 新規ユーザー・学習者 |

## 2. Tutorial Sample の要件 (整理のみ・Wave 1 では実装しない)

1. 起動から 10〜20分で主要操作 (project 作成・terrain・road・bridge・save/load) を一通り体験できること
2. 軽量データで構成し、初回表示が高速であること
3. 学習目的の説明テキスト / ガイドを伴うこと
4. Acceptance 判定には使用しない (Reference Business 001 が Acceptance 用)
5. Reference Business 001 と別 fixture として管理し、混在させないこと

## 3. 管理方針

- Reference Business 001 は `lane-s/reference-business-001` 配下の sample/fixture 領域で管理。
- Tutorial Sample は別領域 (例: `frontend/src/liner/samples/tutorial-*`) で管理予定。
- 本 Wave 1 では Tutorial Sample の実装を行わない。
- **Wave 3 (S-10) で実装済み**: `frontend/src/liner/samples/reference-business-001/tutorialSample.ts`
  - 合成地形 16×16・道路 300m (直線+右カーブ)・1径間橋 100m の軽量構成。
  - RB001 とは分離 (TUTORIAL_* ID・`JSON.stringify` に RB001/gujo を含まない)。
  - Site Context (terrain) → Road → Bridge を同一 Project で接続し、Save 可能。
  - `buildTutorialSampleProject()` / `validateTutorialProject()`。

## Related Documents

- [reference-business-001-spec.md](reference-business-001-spec.md) — S-1 仕様
- [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) — 最終受入シナリオ