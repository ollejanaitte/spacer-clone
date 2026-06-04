# 04 Input Schema

## 1. 目的

MVPで扱う `project.json` の入力データ構造を定義する。後続実装では、この文書をもとにJSON Schema、APIバリデーション、UI入力表、解析エンジン入力モデルを作成する。

## 2. 基本方針

- MVPは線形静的解析のみを対象とする。
- 単位は全システムでSI系に固定し、入力に `units` は持たない。
- 単位変換機能は実装しない。
- 材料は `elasticModulus` と `poissonRatio` を保持する。
- せん断弾性係数 `G` は入力に保持せず、解析エンジンが `G = E / (2(1+ν))` で計算する。
- 部材局所座標系は `orientationVector` のみで定義する。
- solverはMVPで固定し、入力で選択しない。

### 固定単位

| 種別 | 単位 |
|---|---|
| 長さ | m |
| 力 | kN |
| モーメント | kN·m |
| 応力・弾性係数 | kN/m² |
| 断面積 | m² |
| 断面2次モーメント | m⁴ |

## 3. トップレベル構造

```json
{
  "project": {},
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

すべて必須項目とする。空配列は許可するが、解析実行時には成立条件を満たす必要がある。

## 4. project

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

- `id`: プロジェクトID。必須、一意。
- `name`: 表示名。必須。
- `schemaVersion`: MVPでは `1.0.0`。
- `description`: 任意の説明。空文字可。
- `createdAt`, `updatedAt`: ISO 8601文字列。

## 5. nodes

```json
{
  "id": "N1",
  "x": 0.0,
  "y": 0.0,
  "z": 0.0,
  "label": "optional"
}
```

- `id`: 節点ID。必須、一意。
- `x`, `y`, `z`: グローバル座標。単位はm。
- `label`: 任意の表示名。

## 6. materials

```json
{
  "id": "MAT1",
  "name": "Steel",
  "elasticModulus": 205000000.0,
  "poissonRatio": 0.3,
  "density": 0.0
}
```

- `id`: 材料ID。必須、一意。
- `name`: 表示名。必須。
- `elasticModulus`: ヤング係数 `E`。単位はkN/m²、正の数。
- `poissonRatio`: ポアソン比 `ν`。MVPでは `-1 < ν < 0.5` を有効範囲とする。
- `density`: MVP解析では使用しない任意情報。保持してよいが自重計算には使わない。

`shearModulus` は保持しない。解析エンジンは `elasticModulus` と `poissonRatio` から、次式でせん断弾性係数を内部計算する。

```text
G = E / (2(1 + ν))
```

## 7. sections

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

- `id`: 断面ID。必須、一意。
- `name`: 表示名。必須。
- `area`: 断面積。単位はm²、正の数。
- `iy`: 部材局所y軸まわり断面2次モーメント。単位はm⁴、正の数。
- `iz`: 部材局所z軸まわり断面2次モーメント。単位はm⁴、正の数。
- `j`: ねじり定数。単位はm⁴、正の数。

## 8. members

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

- `id`: 部材ID。必須、一意。
- `nodeI`, `nodeJ`: 既存節点ID。I端とJ端は異なる節点でなければならない。
- `materialId`: 既存材料ID。
- `sectionId`: 既存断面ID。
- `orientationVector`: 部材局所y軸の候補方向を与えるグローバルベクトル。
- `label`: 任意の表示名。

`orientationVector` はゼロベクトル不可で、部材軸方向と平行であってはならない。省略時の既定方向は解析エンジン仕様に従う。

## 9. supports

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

- `nodeId`: 既存節点ID。
- `ux`, `uy`, `uz`: 並進自由度の拘束有無。
- `rx`, `ry`, `rz`: 回転自由度の拘束有無。
- `true` は該当自由度を拘束することを示す。
- 同一節点に複数のsupportを定義してはならない。

## 10. loadCases

```json
{
  "id": "LC1",
  "name": "Dead Load",
  "type": "static"
}
```

MVPでは `type` は `static` のみとする。

## 11. nodalLoads

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

- `loadCaseId`: 既存荷重ケースID。
- `nodeId`: 既存節点ID。
- `fx`, `fy`, `fz`: 節点集中力。単位はkN。
- `mx`, `my`, `mz`: 節点集中モーメント。単位はkN·m。
- 未使用成分は `0.0` として明示する。

## 12. memberLoads

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

- `loadCaseId`: 既存荷重ケースID。
- `memberId`: 既存部材ID。
- `coordinateSystem`: `local` または `global`。
- `type`: MVPでは `uniform` のみ。
- `wx`, `wy`, `wz`: 部材全長に作用する等分布荷重。単位はkN/m。

## 13. analysisSettings

```json
{
  "analysisType": "linear_static",
  "includeShearDeformation": false,
  "largeDisplacement": false
}
```

- `analysisType`: MVPでは `linear_static` 固定。
- `includeShearDeformation`: MVPでは `false` 固定。Timoshenko梁は扱わない。
- `largeDisplacement`: MVPでは `false` 固定。

`solver` と `tolerance` は入力に持たない。solverは `scipy.sparse.linalg.spsolve` 固定とし、許容誤差は品質基準とテスト仕様で管理する。

## 14. エラー処理

- 必須フィールド欠落は `SCHEMA_ERROR`。
- ID重複は `DUPLICATE_ID`。
- 存在しない参照は `INVALID_REFERENCE`。
- 非有限値、負またはゼロの剛性関連値は `INVALID_VALUE`。
- 部材長ゼロは `ZERO_LENGTH_MEMBER`。
- `orientationVector` が無効な場合は `INVALID_ORIENTATION`。
- 支点不足は検証または解析で `MODEL_UNSTABLE`。
- エラーには可能な限り `path`, `entityType`, `entityId` を含める。

## 15. 完了条件

- `project.json` の全必須項目が定義済み。
- `units`, `shearModulus`, `orientationNode`, `solver`, `tolerance` がMVP入力に含まれていない。
- UI、API、Engine担当がこの文書だけで入力モデルを作成できる。
- `docs/05_analysis_engine_spec.md` と矛盾しない。
