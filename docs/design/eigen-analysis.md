# eigen-analysis.md

## 1. 固有値解析の目的

固有値解析は、構造物の固有周期、固有振動数、モード形を求めるための解析である。

応答スペクトル解析は、この固有値解析結果を前提とする上位機能として設計する。

## 2. 解析方程式

基本式は以下とする。

```text
K φ = λ M φ
```

ここで、

```text
K: 全体剛性マトリクス
M: 全体質量マトリクス
φ: 固有モード
λ: 固有値
ω: 固有円振動数
```

関係式は以下。

```text
λ = ω^2
f = ω / (2π)
T = 2π / ω
```

## 3. 質量マトリクス方針

MVPでは集中質量を優先する。

質量の入力単位、重力加速度による重量換算、回転慣性の扱いは明示的に設計する。

MVPの単位系は `kN, m, s` とする。

質量単位は以下とする。

```text
kN*s^2/m
```

MVPでは質量を直接入力する。

`kg`, `t`, 重量 `kN` から質量への自動換算は将来対応とする。

初期方針では、節点の並進3自由度に質量を与える。

```text
ux, uy, uz: 質量を設定
rx, ry, rz: 原則 0
```

回転慣性は将来拡張とする。

MVPでは `rx, ry, rz` の回転慣性は扱わない。

## 4. 集中質量MVP

質量ケースを定義し、各節点に集中質量を入力する。

集中質量は、節点の `ux, uy, uz` のみに与える。

例。

```json
{
  "id": "mass-1",
  "name": "固有値用質量",
  "method": "lumped",
  "source": "manual",
  "items": [
    {
      "nodeId": "N1",
      "mx": 10.0,
      "my": 10.0,
      "mz": 10.0,
      "irx": 0.0,
      "iry": 0.0,
      "irz": 0.0
    }
  ]
}
```

MVPでは `mx, my, mz` を主対象とする。

自由度の縮約は次の2段階とする。

1. 拘束自由度を除去し、自由自由度系 `Kff` を得る。
2. 自由自由度のうち、正の集中質量を持つ DOF を master、質量ゼロ DOF を slave として分離する。

slave DOF がある場合は、静的条件付き（Guyan 縮約）で master 系へ縮約する。

```text
K_reduced = Kmm + Kms * R
R = -Kss^-1 * Ksm
```

`Kmm`, `Mmm` は master DOF に対応する縮約後剛性・質量である。slave がない場合は `K_reduced = Kmm` とする。

固有値解析では、以下を解く。

```text
K_reduced φ = λ Mmm φ
```

正規化・刺激係数・有効質量の計算は master DOF 上で行い、slave DOF のモード成分は `R` から復元する。

## 5. 整合質量将来対応

整合質量は、梁要素の分布質量から 12x12 要素質量マトリクスを作成し、全体質量マトリクスへ組み立てる方式とする。

ただし初期実装では行わない。

将来対応項目。

* 材料密度の利用
* 断面積から線密度を算出
* 3D梁要素の整合質量
* 回転慣性
* 集中質量との合算

## 6. 質量ケースデータ構造

プロジェクトに `massCases` を追加する案とする。

```json
{
  "massCases": [
    {
      "id": "mass-1",
      "name": "固有値解析用質量",
      "method": "lumped",
      "source": "manual",
      "items": []
    }
  ]
}
```

将来は以下の source を検討する。

```text
manual
fromSelfWeight
fromLoadCase
fromCombination
```

## 7. 固有値ソルバ候補

Python / SciPy を前提とする。

候補。

```text
scipy.sparse.linalg.eigsh
scipy.linalg.eigh
```

初期は小規模モデルでは密行列 `eigh`、中規模以上では疎行列 `eigsh` を検討する。

MVP では master DOF 数に対して `scipy.linalg.eigh` を用いる。

検証項目は以下とする。

* `Mmm` が正定値であること
* 縮約後剛性 `K_reduced` が固有値解析対象として特異でないこと
* `Kss` が特異な slave 構成を検出すること
* ゼロまたは負の固有値を検出すること
* 要求モード数が master DOF 数を超えないこと

モード正規化は、MVPでは質量正規化に固定する。

```text
φ^T M φ = 1
```

## 8. API

エンドポイント。

```text
POST /api/analysis/eigen
```

リクエスト。`project` は必須。`massCaseId` と `modeCount` はリクエストまたは `analysisSettings.eigen` から読む。

```json
{
  "project": {},
  "massCaseId": "mass-1",
  "modeCount": 10
}
```

MVP では `normalization` は `"mass"` 固定とし、リクエスト入力は受け付けない。

レスポンスは `docs/06_result_schema.md` および `schemas/result.schema.json` に従う。固有値固有データは `eigenResult` に格納する。

```json
{
  "analysisSummary": {
    "analysisType": "eigen",
    "status": "success"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "eigenResult": {
    "massCaseId": "mass-1",
    "normalization": "mass",
    "totalMassByDirection": [],
    "modes": [
      {
        "modeNo": 1,
        "eigenvalue": 0.0,
        "circularFrequency": 0.0,
        "frequency": 0.0,
        "period": 0.0,
        "modalMass": 0.0,
        "participationFactors": [],
        "effectiveMassRatios": [],
        "effectiveMasses": [],
        "cumulativeEffectiveMassRatios": [],
        "shape": []
      }
    ]
  },
  "warnings": [],
  "errors": []
}
```

詳細型定義は [result-schema.md](result-schema.md) を参照する。

## 9. 出力データ構造

モードごとに以下を出力する。フィールド名は `schemas/result.schema.json` の `eigenMode` に合わせる。

* `modeNo`: 次数
* `eigenvalue`: 固有値
* `circularFrequency`: 固有円振動数
* `frequency`: 固有振動数
* `period`: 固有周期
* `shape`: モード形
* `modalMass`: モード質量
* `participationFactors`: 刺激係数
* `effectiveMasses`: 有効質量（絶対値）
* `effectiveMassRatios`: 有効質量比
* `cumulativeEffectiveMassRatios`: 累積有効質量比

結果全体には `eigenResult.totalMassByDirection` を方向別総質量として付与する。

刺激係数、有効質量、有効質量比は以下で定義する。

```text
Γ = φ^T M r / φ^T M φ
M_eff = Γ^2 φ^T M φ
有効質量比 = M_eff / (r^T M r)
```

ここで、`r` は起震方向ベクトルとする。

質量正規化時は以下となる。

```text
φ^T M φ = 1
Γ = φ^T M r
M_eff = Γ^2
```

## 10. UI案

左ペインまたは解析設定に以下を追加する。

```text
解析
  - 線形静的解析
  - 固有値解析
  - 応答スペクトル解析
```

固有値解析画面。

* 質量ケース選択
* 求めるモード数
* 正規化方法
* 起震方向別の刺激係数表示
* 固有周期一覧
* モード図表示

## 11. 検証ケース

初期検証ケース。

1. 1自由度ばね質点系
2. 片持ち梁の一次固有周期
3. 2質点せん断型モデル
4. 拘束条件付き3D骨組モデル
5. 質量ゼロ自由度を含むモデル

## 12. 実装フェーズ

### Phase 1

* 質量ケーススキーマ追加
* 集中質量入力
* 全体質量マトリクス作成
* 拘束自由度除去
* 固有値解析実行
* 固有周期・固有振動数出力

### Phase 2

* モード形表示
* 刺激係数
* 有効質量
* 有効質量比

### Phase 3

* 応答スペクトル解析へ接続
* SRSS/CQC
* 各次応答値
* 最大応答値

### Phase 4

* 整合質量
* 減衰モデル拡張
* 時刻歴解析の準備

## Phase E-1b: 有効質量・累積参加率の出力

固有値解析結果には、既存の `participationFactors`、`effectiveMassRatios`、`modalMass` を維持したうえで、実務確認用に以下を追加する。

- `totalMassByDirection`: X/Y/Z 方向別の解析対象質量。拘束自由度を除いた現在の有効質量比分母 `rᵀMr` と同じ値とする。単位は UI/docs 上で `kN·s²/m` と表記する。
- `effectiveMasses`: 各モード・各方向の絶対有効質量。
- `cumulativeEffectiveMassRatios`: モード順に加算した累積有効質量比。強制的に 1.0 へ丸めない。

方向は X/Y/Z 固定とし、回転慣性 `irx/iry/irz` は本フェーズでは使用しない。`totalMass` が 0 の方向では、有効質量、有効質量比、累積有効質量比を 0 とする。応答スペクトル解析、CQC は本フェーズの対象外とする。

## Phase E-1c: 品質確認（完了）

Phase E-1b 追加項目について、自動テストと手動確認を完了した。

- `effectiveMasses = effectiveMassRatios * totalMassByDirection` の方向別整合
- `totalMassByDirection` が 0 の方向で NaN/inf が出ないこと
- `eigen_modes.csv` 列順の維持
- 旧 result への後方互換（optional 欠落を許容）

検証記録は `docs/verification/eigen-analysis-phase-e1c-verification.md` を参照する。

## 13. 設計レビュー反映

### 採用

- 集中質量 MVP、`method: "lumped"` / `source: "manual"` の入力形式
- 質量正規化 `φ^T M φ = 1` の固定
- ゼロ質量 DOF への静的条件付き（Guyan 縮約）
- `eigenResult` を Result Schema 上の独立ブロックとして保持
- Phase E-1b の有効質量・累積参加率出力

### 保留

- 整合質量、回転慣性、モード別減衰
- `normalization: "max"` の UI/API 公開
- 大規模モデル向け疎固有値ソルバ（`eigsh`）への切替基準

### 要再検討

- `massCases` をトップレベル必須にするか、解析実行時のみ必須にするか
- 固有値結果 CSV と result JSON の列・フィールド完全同期方針
