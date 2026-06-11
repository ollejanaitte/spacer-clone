# 04 Input Schema

## 1. 目的

MVPの入力データである `project.json` の構造を定義する。後続実装では、この文書をもとにJSON Schema、APIバリデーション、UI入力フォーム、解析エンジン入力モデルを作成する。

## 2. 対象範囲

MVPで扱う入力は以下に限定する。

- 3次元節点座標。
- 材料定義。
- 断面定義。
- 3D梁部材定義。
- 6自由度支点条件。
- 荷重ケース。
- 節点集中荷重。
- 部材等分布荷重。
- 線形静的解析設定。

## 3. 非対象範囲

以下の入力項目は MVP 初期版では定義しない。

- 影響線載荷点、格子形状、ライン、移動荷重、活荷重自動載荷。
- 温度荷重、プレストレス、初期張力。
- 部材バネ、節点間バネ、連成バネ。
- 部材端リリース、高度な荷重組合せ。
- DXF、外部ソフト連携、ライセンス情報。

固有値解析・応答スペクトル解析の入力は、Phase E 拡張として `schemas/project.schema.json` および [eigen-analysis.md](design/eigen-analysis.md)、[response-spectrum-analysis.md](design/response-spectrum-analysis.md) を参照する。本書第 4 節は線形静的 MVP 基準を示す。

## 4. データ構造

### トップレベル

```json
{
  "project": {},
  "units": {},
  "nodes": [],
  "materials": [],
  "sections": [],
  "members": [],
  "supports": [],
  "loadCases": [],
  "nodalLoads": [],
  "memberLoads": [],
  "analysisSettings": {}
}
```

すべて必須とする。

### project

```json
{
  "id": "project-001",
  "name": "MVP Frame Model",
  "schemaVersion": "1.0.0",
  "description": "",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

- `id`: 文字列、必須。
- `name`: 文字列、必須。
- `schemaVersion`: MVPでは `1.0.0`。
- `description`: 文字列、空文字可。
- `createdAt`, `updatedAt`: ISO 8601文字列。

### units

```json
{
  "length": "m",
  "force": "kN",
  "moment": "kN_m",
  "modulus": "kN_per_m2",
  "area": "m2",
  "inertia": "m4"
}
```

MVPではSI単位のみを許可する。単位変換は実装しない。

### nodes

```json
{
  "id": "N1",
  "x": 0.0,
  "y": 0.0,
  "z": 0.0,
  "label": "optional"
}
```

- `id`: 一意。
- `x`, `y`, `z`: グローバル座標、単位m。
- `label`: 任意。

### materials

```json
{
  "id": "MAT1",
  "name": "Steel",
  "elasticModulus": 205000000.0,
  "shearModulus": 79000000.0,
  "poissonRatio": 0.3,
  "density": 0.0
}
```

- `elasticModulus`: `kN/m2`、正数。
- `shearModulus`: `kN/m2`、正数。
- `poissonRatio`, `density`: MVP解析では任意情報。

### sections

```json
{
  "id": "SEC1",
  "name": "Box Section",
  "area": 0.02,
  "iy": 0.0001,
  "iz": 0.0001,
  "j": 0.00005
}
```

- `area`: 断面積、`m2`。
- `iy`: 部材局所y軸まわり断面2次モーメント、`m4`。
- `iz`: 部材局所z軸まわり断面2次モーメント、`m4`。
- `j`: ねじり定数、`m4`。

### members

```json
{
  "id": "M1",
  "nodeI": "N1",
  "nodeJ": "N2",
  "materialId": "MAT1",
  "sectionId": "SEC1",
  "orientationVector": { "x": 0.0, "y": 0.0, "z": 1.0 },
  "label": ""
}
```

- `nodeI`, `nodeJ`: 既存節点ID。
- `materialId`: 既存材料ID。
- `sectionId`: 既存断面ID。
- `orientationVector`: 任意。省略時は解析エンジンの既定局所座標則を使う。
- `orientationNode`: 任意。`orientationVector` と同時指定不可。

### supports

```json
{
  "nodeId": "N1",
  "ux": true,
  "uy": true,
  "uz": true,
  "rx": true,
  "ry": true,
  "rz": true
}
```

- 各booleanは該当自由度を拘束することを示す。
- 同一節点に複数supportを定義してはならない。

### loadCases

```json
{
  "id": "LC1",
  "name": "Dead Load",
  "type": "static"
}
```

MVPでは `type` は `static` のみ。

### nodalLoads

```json
{
  "id": "NL1",
  "loadCaseId": "LC1",
  "nodeId": "N2",
  "fx": 0.0,
  "fy": -10.0,
  "fz": 0.0,
  "mx": 0.0,
  "my": 0.0,
  "mz": 0.0
}
```

- 力は `kN`。
- モーメントは `kN_m`。
- 未使用成分も `0.0` として明示する。

### memberLoads

```json
{
  "id": "ML1",
  "loadCaseId": "LC1",
  "memberId": "M1",
  "coordinateSystem": "local",
  "type": "uniform",
  "wx": 0.0,
  "wy": -2.0,
  "wz": 0.0
}
```

- `type`: MVPでは `uniform` のみ。
- `coordinateSystem`: `local` または `global`。
- 荷重強度は `kN/m`。
- 部材全長に作用する等分布荷重のみ扱う。

### analysisSettings

```json
{
  "analysisType": "linear_static",
  "solver": "scipy_sparse",
  "includeShearDeformation": false,
  "largeDisplacement": false,
  "tolerance": 1e-9
}
```

MVPでは `includeShearDeformation` と `largeDisplacement` は必ず `false`。

## 5. Phase E 拡張（固有値・応答スペクトル）

線形静的 MVP 完了後、以下を `project.json` へ追加する。正本は `schemas/project.schema.json` である。

### massCases（任意配列）

```json
{
  "id": "mass-1",
  "name": "固有値解析用質量",
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

MVP では `method: "lumped"`、`source: "manual"` のみ。`mx/my/mz` を主対象とし、`irx/iry/irz` は 0 固定。

### analysisSettings.eigen（任意）

```json
{
  "massCaseId": "mass-1",
  "modeCount": 10
}
```

### analysisSettings.responseSpectrum（任意）

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

スペクトルはトップレベル `spectrumCases` ではなく、`spectrumPoints` 点列で保持する。補間は **線形補間**、周期範囲外は **端値固定** とする。詳細は [response-spectrum-analysis.md](design/response-spectrum-analysis.md) を参照する。

## 6. エラー処理

- 必須フィールド欠落は `SCHEMA_ERROR`。
- ID重複は `DUPLICATE_ID`。
- 存在しない参照は `INVALID_REFERENCE`。
- 非有限値、負またはゼロの剛性値は `INVALID_VALUE`。
- 部材長ゼロは `ZERO_LENGTH_MEMBER`。
- 支点不足は検証または解析で `MODEL_UNSTABLE`。
- エラーには `path`、`entityType`、`entityId` を可能な限り含める。

## 7. テスト観点

- 正常な片持梁モデルがスキーマ検証を通る。
- 必須トップレベル項目欠落を検出する。
- 節点、材料、断面、荷重ケースの不正参照を検出する。
- 重複IDを検出する。
- `NaN`、`Infinity`、文字列数値を拒否する。
- MVP外フィールドを追加した場合の扱いがJSON Schemaで明確である。

## 8. 完了条件

- `project.json` の全必須項目が定義されている。
- JSON Schema実装者がこの文書だけでスキーマを作成できる。
- UI担当が入力表を作成できる。
- Engine担当が解析入力モデルを作成できる。
- MVP外機能の入力が非対象として明記されている。
- Phase E 拡張入力は設計書および `schemas/project.schema.json` と矛盾しない。
