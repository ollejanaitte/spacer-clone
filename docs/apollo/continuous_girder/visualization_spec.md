# 連続桁 — 3D 可視化・STL 出力仕様

**Authority:** Step C0（設計文書。実装は C3）
**Date:** 2026-08-02

---

## 1. 目的

連続桁 SDM から 3D ソリッドジオメトリを構築し、ビューア表示および STL エクスポートを可能にする。SIMPLE_SINGLE の可視化パイプラインを拡張する。

## 2. 可視化ソース

| ソース | 条件 |
|--------|------|
| BSDD ソリッド | `isBridgeStructureGenerationCurrent(project) === true` |
| STALE 時 | ソリッド省略（空ジオメトリ、SIMPLE_SINGLE 同一契約） |

## 3. ソリッド構成

### 3.1 上部構造

| 部材 | 幾何 | 連続桁での差分 |
|------|------|----------------|
| 主桁 | I 断面押し出し、橋軸方向全長 | `bridgeLength` 貫通（径間継ぎ目なし） |
| 床版 | 直方体スラブ | 全長 `bridgeLength` |
| 横桁 | 等間隔配置 | 既存 `crossBeamSpacing` 規則 |
| 補剛材・対傾構・横構 | 入力に応じ | SIMPLE_SINGLE と同一 |

### 3.2 下部構造（簡易モデル）

| 部材 | 位置 | 幾何（照査なし） |
|------|------|------------------|
| 橋台 | 端部支点（index 0, n） | 台形状ブロック（幅員＋オフセット） |
| 橋脚 | 中間支点（index 1..n-1） | 円柱または角柱近似 |
| 支承 | 各支点直上 | 薄板または小箱（装飾的） |

下部構造は **幾何プレースホルダ** であり、基礎・下部工設計の入力ではない。

## 4. ビューア

- 既存 Apollo 3D ビューア（VVS01 基盤）を使用
- カメラプリセット: 軸方向・平面・3D 斜め（既存維持）
- 連続桁: 中間支点位置にマーカーまたは橋脚ソリッドで視認可能にする
- 選択・ハイライト: 主桁・床版（既存契約）

## 5. STL エクスポート

| 項目 | 仕様 |
|------|------|
| トリガー | 既存 STL 出力 UI |
| 対象 | 生成 current 時の全ソリッド結合メッシュ |
| 単位 | メートル（既存 `apolloStlExport` 契約） |
| STALE 時 | エクスポート拒否または空（fail-closed、SIMPLE_SINGLE 準拠） |
| 検証 | 三角面数 > 0 |

## 6. 対象外

- 応力図・たわみ図・断面力図のオーバーレイ
- 負曲げ区間の色分け
- 曲線橋のソリッド生成
- FEM メッシュ・解析結果の可視化

## 7. テスト観点（C3/C4）

- 2 / 3 / 5 径間でソリッド生成成功
- 中間橋脚ソリッドが `spanCount - 1` 本
- STALE 後にソリッド省略、再生成で復帰
- STL 出力が三角面 > 0
- SIMPLE_SINGLE 回帰破壊なし

## 8. 数値ゲート

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
