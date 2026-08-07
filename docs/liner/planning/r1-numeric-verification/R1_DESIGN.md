# R1_DESIGN

- **適用範囲**: spacer-clone 上で計画する「R1 数値検証基盤」の設計（実装前）
- **種別**: 計画・設計文書（実装は行わない）

## 1. 設計方針

1. **外部突合を正本**、解析参照を独立検証として残す2層検証。
2. ゴールデンフィクスチャの「由来（provenance）」を管理し、自己参照 / 補間を排除。
3. 既存のテスト基盤（ゴールデン・fixture）を利用し、破壊的変更を避ける。

## 2. 対象データ系（数値検証の焦点）

### 2.1 平面線形（Alignment）
- 直線/円/クロソイドの座標計算（評価: 実 JIP 出力との一致）
- 拡幅（1次/4次）は R2 計画領域。R1 では既存実装検証のみ。

### 2.2 縦断（PH）・横断（GR）
- grade/parabolic、crossSlope の既存実装の数値ゴールデン化

### 2.3 橋梁骨格（LDIST / HAUNCH / HOSO）
- 格点間距離・張出し長（GAP_DONE）を実設計例（SRC-005）と突合
- ハンチ対応型（native 相当）の値表検証

### 2.4 描画（GDRAW）
- 平面図 / 座標テーブル / 寸法線の外部帳票突合（GAP-1001）

### 2.5 Importer
- C1-C17 / GE2 の interpolated → PDF 実値置換（GAP-1002）

## 3. フィクスチャ（ゴールデン）スキーマ案

```text
golden {
  id;            // e.g. "R1-AL-001"
  feature;       // 機能名
  source;        // LAYER2_EXTERNAL  | LAYER1_ANALYTIC | DERIVED
  reference;     // 由来（実設計例/実JIP出力/Simpson）
  input_hash;    // 入力データの sha256
  expected;      // 期待値（外部突合値）
  tolerance;     // 許容誤差
  note;          // 出張・丸め・桁落ちの記録
}
```

- `source=LAYER2_EXTERNAL` が正本（合否）。
- `source=LAYER1_ANALYTIC` は独立検証・情報。
- `DERIVED` は内部由来（報告用）。

## 4. テスト設計

### 4.1 一致テスト（fixture-driven）
- 入力 → 実装出力 → LAYER2_EXTERNAL 期待値と照合
- 全項目一致で PASS。1 件でも不一致で FAIL（レポートに差分掲載）

### 4.2 命令セット
```text
test_r1_consistency   : Layer2 突合（正本）
test_r1_analytic      : Layer1 解析参照（独立）
test_r1_importer_fix  : C1-C17/GE2 実値置換の確認
```

### 4.3 判定・CI
- ローカル: `npm test` 相当を拡張（実装上は spacer-clone の既存構成に準拠）
- CI: デフォルト禁止（ローカル判定）。CI 化は R2 で合意。

## 5. 許容誤差（設計決定・提案）

| 量 | 許容 |
|---|---|
| 座標（X/Y/Z） | 1e-6 m |
| 長さ（距離） | 1e-6 m |
| 角度 / 方位 | 1e-9 rad |
| 係数（割合） | 1e-9 |

> ※実設計例が PDF 由来のため、人手読み取り桁が原因の誤差が残る可能性：
> 差分が出た場合は「出張記録」に記録し、tolerance の決定試料にする。

## 6. 対象外（本 R1 計画）

拡幅（F1）、セクションS×主桁G 格点（F8）、主桁G 円弧/折れ桁（F9）は R2 で対応。
本 R1 は「**外部突合の仕組み**」の確立に集中。

## 7. 非機能

- 性能: fixture 数は小規模（数十件）。評価は普通のテスト実行。
- 再利用: フィクスチャ一式をサブディレクトリ化し、R2 以降も参照可能に。
- 保守: 由来・改変履歴をフィクスチャ metadata に保持。