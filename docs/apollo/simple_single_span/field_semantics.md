# 単径間単純桁 — 入力フィールド意味定義（Field Semantics）

**Authority:** Step S0
**Date:** 2026-08-02

本ファイルは、Apollo 橋梁構造入力の各フィールドの責務・UI表示名と内部フィールド名の対応・
単径間での導出規則を定義する。**調査結果は既存実装の実測に基づく**。

---

## 1. 内部フィールドと責務（現行実装の調査結果）

内部型: `frontend/src/apollo/bridgeStructure/types.ts` の `ApolloBridgeStructureInputDraft`
フィールド定義: `BRIDGE_STRUCTURE_INPUT_FIELDS`（types.ts:67-85）

| 内部フィールド名 | 現行UI表示名 | 単位 | 責務（調査結果） |
|------------------|--------------|------|------------------|
| spanLength | 径間長 | m | 1 径間の長さ。現行は等径間の径間長 |
| bridgeLength | 橋長 | m | 総延長。構造モデル長として使用（主桁長） |
| width | 幅員 | m | 床版幅（全幅員） |
| girderCount | 主桁本数 | 本 | 主桁本数（整数） |
| girderSpacing | 主桁間隔 | m | 主桁間隔 |
| girderDepth | 主桁高 | m | 主桁高 |
| topFlangeWidth | 上フランジ幅 | m | 上フランジ幅 |
| topFlangeThickness | 上フランジ厚 | m | 上フランジ厚 |
| bottomFlangeWidth | 下フランジ幅 | m | 下フランジ幅 |
| bottomFlangeThickness | 下フランジ厚 | m | 下フランジ厚 |
| webThickness | ウェブ厚 | m | ウェブ厚 |
| deckThickness | 床版厚 | m | 床版厚 |
| crossBeamSpacing | 横桁間隔 | m | 横桁間隔（任意ではない） |
| stiffenerSpacing | 補剛材間隔 | m | 補剛材間隔（任意） |
| swayBracingInterval | 対傾構間隔（横桁N本ごと） | 本 | 対傾構の設置間隔（任意・整数） |
| steelUnitWeight | 鋼の単位体積重量 | kN/m³ | 鋼の単位体積重量（任意） |
| rcUnitWeight | RC床版の単位体積重量 | kN/m³ | RC床版の単位体積重量（任意） |
| lateralBracingEnabled | 横繋（チェックボックス） | — | 横構（下フランジ水平ブレース）有効化 |
| generatedAt | — | — | 生成時刻（STALE 判定に使用） |

## 2. 径間数と長さの関係（現行実装の調査結果）

`frontend/src/apollo/bridgeStructure/validation.ts:23-30` の `resolveSpanCount`:

```
spanCount = round(bridgeLength / spanLength)
（割り切れない場合 null → 生成拒否）
```

- **単径間単純桁（SIMPLE_SINGLE）では `spanCount = 1`、すなわち `bridgeLength == spanLength`**
- SDM 自体は長さを直接持たない。BSDD 側の `bridge.spans[].length`（GovernedQuantity）と
  `bridge.supports[].station` に `effectiveSpanLength` ベースで格納される
  （`generateBsdd.ts:110, 315, 343`）
- 主桁長・鋼重算出は `bridgeLength` を使用（`sectionProperties.ts:107`）

## 3. 用語修正（Step S1 で適用）

| 現行UI表示名 | 修正後UI表示名 | 対象フィールド |
|--------------|----------------|----------------|
| 径間長 | **支間長** | spanLength |
| 橋長 | **構造モデル長** | bridgeLength |

- 「支間長」は単径間の径間長を指す（spanLength）
- 「構造モデル長」は総延長・主桁長（bridgeLength）を指す
- バリデーション文言も追随する（validation.ts:108「径間長は橋長以下…」等）

## 4. 単径間での導出規則

### 4.1 構造モデル長 = 支間長（単径間）

- 単径間（spanCount = 1）では `bridgeLength == spanLength` が本来の形
- UI 上、単径間では構造モデル長を支間長から**内部導出**できる
- ただし、**既存の `bridgeLength` フィールドを即削除しない**
  - additive backward compatibility 優先
  - 内部導出する場合は、`bridgeLength` の入力を省略可能にし、導出値を表示・使用する

### 4.2 legacy データの扱い（黙って修正しない）

- 既存保存データ（project の `apolloBridgeStructureInput`）に
  `bridgeLength != spanLength` のレガシー値がある場合、**黙って修正しない**
- `resolveSpanCount` が `null`（割り切れない）なら、現行どおり生成拒否（fail-closed）
- `bridgeLength` が `spanLength` の整数倍（多径間相当）のレガシーデータは、
  単径間として扱わず、現行の等径間単純支持としての挙動を維持する
  （SIMPLE_MULTIPLE は DEFERRED。今回の整理対象は「単径間」のみ）

### 4.3 schema version / migration 要否

- **実測判断の結果**: フィールドの追加・削除を行わず、表示名と導出規則の追加のみの場合は
  **schema version bump 不要**（additive）
- フィールド追加（例: bridgeSystem / spans[]）は Step C1 で実施し、その際に
  `validateBridgeStructureInputPersistence`（validation.ts:154-200）の allowed set と
  必要に応じた version 管理を検討する

## 5. 単径間単純桁の SDM 表現（現行生成の調査結果）

`generateBsdd.ts` の `buildBridgeSuperstructureDesignDocument`:

- `spanIds = 1`（spanCount=1 のとき）、`supportIds = 2`（A1 / A2）
- `supports[].fixity = "pinned"`（両端）、`role = "abutment"`（両端）
- `spanSystem = "simple"`（phase1ScopeAssertion）
- 主桁は `mainGirders`（girderCount 本）、`girderSectionSegments = []`（現行は空）
- 横桁は `crossBeamCount = floor(bridgeLength / crossBeamSpacing) + 1`
- 補剛材・対傾構・横構は入力に応じて生成
- すべて `designStatus: "NOT_AUTHORIZED"`

## 6. 対応形式の明示

- パネル UI に「単径間単純桁（現在対応）」の表示を追加する（Step S1）
- 構造形式の選択 UI（単径間単純桁 / 連続桁）は Step C2 で追加する
  （本 Step S0 では文書のみ。UI の構造形式選択は追加しない）
