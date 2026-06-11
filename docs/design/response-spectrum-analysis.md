# response-spectrum-analysis.md

## 1. 応答スペクトル解析の位置付け

応答スペクトル解析は、固有値解析結果を利用して地震時最大応答を推定するモード解析法である。

本ソフトでは固有値解析（E-1）の上位解析として実装する。

MVPではユーザー入力の応答スペクトルを利用する。

道路橋示方書・鉄道構造物等設計標準などの基準スペクトル自動生成は対象外とする。

---

## 2. 固有値解析との接続

応答スペクトル解析では以下の固有値解析結果を利用する。

* 固有周期
* 固有振動数
* モード形
* participationFactors
* effectiveMasses
* effectiveMassRatios
* cumulativeEffectiveMassRatios

応答スペクトル解析は単独実行しない。

実行時には内部で固有値解析を実施するか、既存の固有値解析結果を利用する。

---

## 3. 入力スペクトル

MVP では疑似加速度応答スペクトル（Sa）のみを対象とする。

スペクトル点列は、トップレベルの `spectrumCases` 配列ではなく、次のいずれかで与える。

1. API リクエストの `spectrumPoints`
2. `project.analysisSettings.responseSpectrum.spectrumPoints`

`spectrumCaseId` は結果識別用の文字列であり、MVP では独立エンティティとして永続化しない。

### 単位系

```text
m/s²
```

将来対応：

```text
gal
g
```

### 入力形式

`analysisSettings.responseSpectrum` の例。

```json
{
  "modeCount": 10,
  "massCaseId": "mass-1",
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "targetCumulativeMassRatio": 0.9,
  "spectrumPoints": [
    { "period": 0.1, "value": 1.0 },
    { "period": 1.0, "value": 0.5 }
  ]
}
```

API リクエスト例。

```json
{
  "project": {},
  "massCaseId": "mass-1",
  "modeCount": 10,
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "targetCumulativeMassRatio": 0.9,
  "spectrumPoints": [
    { "period": 0.1, "value": 1.0 },
    { "period": 1.0, "value": 0.5 }
  ]
}
```

リクエストは `analysisSettings.responseSpectrum` より優先する。

### 補間

MVP では周期方向に **線形補間** を用い、範囲外は **端値固定** とする。

```text
Tmin ≤ T ≤ Tmax: 線形補間
T < Tmin → Sa(Tmin)
T > Tmax → Sa(Tmax)
```

外挿は行わない。

---

## 4. 減衰定数

MVPでは全モード共通減衰とする。

標準値：

```text
h = 0.05
```

将来対応：

* モード別減衰
* 部材別減衰
* Rayleigh減衰
* 構造形式テンプレート

---

## 5. 起震方向

起震方向は全体座標系で定義する。

MVP対象：

```text
X
Y
Z
```

任意方向ベクトルは対象外とする。

各方向について participationFactors を利用して刺激係数を評価する。

---

## 6. 有効モード判定

固有モードは `cumulativeEffectiveMassRatios` を利用して採用する。

手順:

1. 内部で固有値解析を実行し、要求 `modeCount` までモードを取得する。
2. 起震方向ごとに、モード順へ `cumulativeEffectiveMassRatios` を参照する。
3. 累積値が `targetCumulativeMassRatio`（MVP 既定 0.9）以上になった時点で打切る。

`usedModes` に採用モード番号を保持する。全モードを使っても基準未達の場合は、取得済みモードをすべて採用する。

---

## 7. モード合成

MVPでは SRSS を採用する。

```text
R = sqrt(Σ Ri²)
```

SRSS結果は符号付き値ではなく絶対値包絡として扱う。

CQCは対象外とする。

将来対応：

* CQC
* DSC
* NRC Ten Percent Method

---

## 8. 出力仕様

エンドポイント。

```text
POST /api/analysis/response-spectrum
```

レスポンスは `eigenResult` と `responseSpectrumResult` を同一 result に含める。線形静的結果配列は空配列とする。

```json
{
  "analysisSummary": {
    "analysisType": "response_spectrum",
    "status": "success"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "eigenResult": {},
  "responseSpectrumResult": {
    "spectrumCaseId": "spec-1",
    "direction": "X",
    "dampingRatio": 0.05,
    "combinationMethod": "SRSS",
    "targetCumulativeMassRatio": 0.9,
    "usedModes": [1, 2, 3],
    "modalResults": [],
    "combinedResult": {
      "method": "SRSS",
      "displacements": [],
      "reactions": [],
      "memberSectionForces": []
    }
  },
  "warnings": [],
  "errors": []
}
```

### MVP出力

* モード別応答変位（`modalResults[].displacements`）
* SRSS 合成変位（`combinedResult.displacements`）
* 採用モード一覧（`usedModes`）
* 各モードの `spectralAcceleration`、`participationFactor`、`modalCoordinate`

固有値由来の `participationFactors`、`effectiveMassRatios`、`cumulativeEffectiveMassRatios` は `eigenResult` 側に保持する。`responseSpectrumResult` へ重複コピーしない。

### MVP対象外

* 反力（`reactions` は空配列）
* 部材断面力（`memberSectionForces` は空配列）
* 断面力包絡

---

## 9. UI方針

### 解析条件

* 質量ケース
* モード数
* スペクトル選択
* 減衰定数
* 起震方向

### 結果表示

* 固有周期一覧
* 有効質量比一覧
* スペクトル値一覧
* モード別応答変位
* SRSS合成変位

MVPでは変形図・モード図の高度な可視化は対象外とする。

---

## 10. Result Schema 参照

応答スペクトル結果の正本は [result-schema.md](result-schema.md) および `schemas/result.schema.json` の `responseSpectrumResult` である。

MVP では `combinationMethod` は `"SRSS"` 固定とする。スキーマ上 `CQC` が列挙されていても、MVP 実装・UI では使用しない。

---

## 11. 将来拡張

### モード合成

* CQC
* DSC
* NRC

### スペクトル

* 速度応答スペクトル
* 変位応答スペクトル

### 地震入力

* 任意方向入力
* 多方向同時入力

### 設計基準

* 道路橋示方書
* 鉄道構造物等設計標準
* 地盤種別補正
* 地域補正

### 結果

* 反力
* 部材端力
* 断面力
* PDF帳票
* 3D応答表示

---

## 12. MVP確定事項

E-2 MVPでは以下を採用する。

* Saスペクトル
* m/s²
* 線形補間、範囲外は端値固定
* X/Y/Z方向
* SRSS
* 累積有効質量比 90% 以上（`targetCumulativeMassRatio = 0.9`）
* 応答変位出力

### 対象外

* CQC
* 回転慣性
* 任意方向入力
* 多方向同時入力
* 基準スペクトル生成
* 反力・断面力応答スペクトル

## 13. 設計レビュー反映

### 採用

- 実行時に内部固有値解析を必ず呼び出す
- スペクトル入力は `spectrumPoints` 点列（API または `analysisSettings.responseSpectrum`）
- 累積有効質量比によるモード打切り
- SRSS 変位包絡
- `eigenResult` と `responseSpectrumResult` の同一レスポンス保持

### 保留

- トップレベル `spectrumCases` 永続化
- 多方向同時入力、CQC、基準スペクトル自動生成

### 要再検討

- `massCaseId` を応答スペクトル設定で必須にするか、`analysisSettings.eigen.massCaseId` へフォールバックするか
- 反力・断面力 SRSS を E-2 後続フェーズで追加する順序
