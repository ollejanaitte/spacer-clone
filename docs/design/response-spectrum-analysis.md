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

MVPでは疑似加速度応答スペクトル（Sa）のみを対象とする。

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

```json
{
  "spectrumCases": [
    {
      "id": "spec-1",
      "name": "Input Spectrum",
      "valueType": "acceleration",
      "damping": 0.05,
      "points": [
        { "period": 0.0, "value": 0.0 },
        { "period": 0.1, "value": 1.0 },
        { "period": 1.0, "value": 0.5 }
      ]
    }
  ]
}
```

### 補間

周期方向の補間は線形補間とする。

```text
linear interpolation
```

### 周期範囲外

MVPでは端値固定とする。

```text
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

固有モードは累積有効質量比を利用して採用する。

MVP基準：

```text
累積有効質量比 90%以上
```

または

```text
ユーザー指定モード数
```

のいずれか先に到達した時点で打切る。

結果には採用モード一覧を保持する。

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

出力候補：

```json
{
  "responseSpectrumResult": {
    "direction": "X",
    "combination": "SRSS",
    "usedModes": [1, 2, 3],
    "modalResponses": [],
    "combinedResponse": {
      "displacements": []
    }
  }
}
```

### MVP出力

* モード別応答変位
* SRSS合成変位
* participationFactors
* effectiveMassRatios
* cumulativeEffectiveMassRatios
* 採用モード一覧

### MVP対象外

* 反力
* 部材端力
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

## 10. Result Schema拡張

result.schema.json に以下を追加予定。

```json
{
  "responseSpectrumResult": {
    "direction": "X",
    "combination": "SRSS",
    "usedModes": [],
    "modalResponses": [],
    "combinedResponse": {
      "displacements": []
    }
  }
}
```

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
* 線形補間
* 周期範囲外は端値固定
* X/Y/Z方向
* SRSS
* 累積有効質量比90%以上
* 応答変位出力

### 対象外

* CQC
* 回転慣性
* 任意方向入力
* 多方向同時入力
* 基準スペクトル生成
* 反力・断面力応答スペクトル
