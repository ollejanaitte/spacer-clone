# 05 Analysis Engine Specification

## 1. 目的

Python解析エンジンが実装すべきMVPの線形静的3次元骨組解析仕様を定義する。FastAPIやReactに解析ロジックが混入しないよう、数値解析の責務を明確にする。

## 2. 対象範囲

- 1節点6自由度の自由度番号付け。
- 3D Euler-Bernoulli梁要素。
- 12x12局所剛性マトリクス。
- 部材局所座標系。
- 座標変換。
- 全体剛性マトリクス組立。
- 支点境界条件処理。
- 節点集中荷重と部材等分布荷重の荷重ベクトル作成。
- `scipy.sparse.linalg.spsolve` による連立一次方程式の求解。
- 変位、反力、部材端力の計算。

## 3. 非対象範囲

- 幾何学的非線形、材料非線形。
- Timoshenko梁、せん断変形考慮。
- 部材端リリース。
- 部材バネ、節点間バネ。
- 温度荷重、プレストレス、初期張力。
- 影響線解析、移動荷重。
- 固有値解析、応答スペクトル解析。
- solver選択機能。

## 4. 入力前提

入力モデルは `docs/04_input_schema.md` に従う。

- 単位はSI固定。
- `units` は入力に存在しない。
- Materialは `elasticModulus` と `poissonRatio` を持つ。
- `shearModulus` は入力から取得しない。
- `orientationNode` は対応しない。
- `analysisSettings.solver` は存在しない。

## 5. Material処理

各部材で参照するMaterialから以下を取得する。

- `E = elasticModulus`
- `ν = poissonRatio`

せん断弾性係数 `G` は次式で内部計算する。

```text
G = E / (2(1 + ν))
```

`G` を入力値として受け取ってはならない。`E <= 0`、または `ν <= -1`、`ν >= 0.5` の場合は `INVALID_VALUE` とする。

## 6. 自由度番号付け

各節点は以下の順で6自由度を持つ。

```text
UX, UY, UZ, RX, RY, RZ
```

節点内部indexを `i` とすると、全体自由度番号は以下とする。

```text
UX = 6*i + 0
UY = 6*i + 1
UZ = 6*i + 2
RX = 6*i + 3
RY = 6*i + 4
RZ = 6*i + 5
```

## 7. 局所座標系

MVPでは `orientationVector` のみ対応する。

1. `nodeI` から `nodeJ` へ向かう単位ベクトルを局所x軸 `ex` とする。
2. `orientationVector` が指定されている場合、そのベクトルを局所y軸候補 `v` とする。
3. `orientationVector` が省略された場合、グローバルZ軸を候補とする。
4. `ex` と候補ベクトルがほぼ平行な場合は、グローバルY軸を候補とする。
5. 候補ベクトルを `ex` に直交する平面へ投影し、正規化して局所y軸 `ey` とする。
6. 局所z軸は `ez = ex cross ey` とする。
7. 数値誤差対策として、必要に応じて `ey = ez cross ex` で再直交化する。

部材長ゼロは `ZERO_LENGTH_MEMBER`、有効な局所座標系を生成できない場合は `INVALID_ORIENTATION` とする。

## 8. 12x12梁要素剛性

要素自由度順は以下とする。

```text
uix, uiy, uiz, rix, riy, riz, ujx, ujy, ujz, rjx, rjy, rjz
```

使用する物性・断面値:

- `E`: ヤング係数。
- `G`: `E / (2(1+ν))` で計算したせん断弾性係数。
- `A`: 断面積。
- `Iy`: 局所y軸まわり断面2次モーメント。
- `Iz`: 局所z軸まわり断面2次モーメント。
- `J`: ねじり定数。
- `L`: 部材長。

主要剛性:

- 軸剛性: `EA/L`
- ねじり剛性: `GJ/L`
- local `uy` 方向の曲げ変位に対応する曲げ剛性: `EIz`
- local `uz` 方向の曲げ変位に対応する曲げ剛性: `EIy`

つまり、局所y軸まわり断面2次モーメント `Iy` はlocal `uz` 方向の曲げに対応し、局所z軸まわり断面2次モーメント `Iz` はlocal `uy` 方向の曲げに対応する。

符号規約はテスト仕様の理論値と一致させる。

## 9. 座標変換

- 局所軸から方向余弦行列 `R` を作成する。
- 並進・回転の各ブロックに `R` を配置し、12x12変換行列 `T` を作る。
- 実装では `u_local = T @ u_global` を採用する。
- 全体剛性への変換は `k_global = T.T @ k_local @ T` とする。
- 等価節点荷重と部材端力の後処理も同じ変換規約を使う。

## 10. 全体剛性マトリクス組立

- 全自由度数は `6 * nodeCount`。
- 各部材の12自由度を全体自由度へマッピングする。
- SciPy sparse形式で組み立てる。
- 推奨は `coo_matrix` へ集約し、求解前にCSRまたはCSCへ変換する。

## 11. 境界条件処理

MVPでは拘束自由度を消去する。

1. 全体剛性 `K` と荷重 `F` を作成する。
2. supportから拘束自由度集合を作る。
3. 自由自由度 `freeDofs` を抽出する。
4. `Kff * Uf = Ff` を解く。
5. 拘束自由度変位は0とする。

支点が不足して剛体モードが残る場合、成功結果を返してはならない。

## 12. 荷重ベクトル作成

- 節点集中荷重は該当節点の6自由度へ直接加算する。
- 部材等分布荷重は、局所座標系の等価節点荷重へ変換してから全体座標へ戻し、全体荷重へ加算する。
- `coordinateSystem = global` の部材荷重は、先に部材局所座標へ変換する。
- MVPでは部材全長に作用する等分布荷重のみ扱う。

## 13. Solver

solver選択機能は実装しない。MVPでは以下に固定する。

```python
scipy.sparse.linalg.spsolve
```

- 入力行列はCSRまたはCSCとする。
- 特異行列、ゼロピボット、非有限解は解析失敗とする。
- solver例外は `SOLVER_ERROR` とする。
- 剛体モードや支点不足が検出できる場合は `MODEL_UNSTABLE` を優先してよい。

## 14. 結果計算

- 変位: 全節点の `ux, uy, uz, rx, ry, rz`。
- 反力: `R = K_full @ U_full - F_full` で計算する。
- 部材端力: `f_local = k_local @ u_local - f_equiv_local` で計算する。
- 部材端力は局所座標系でI端、J端を出力する。
- 結果形式は `docs/06_result_schema.md` に従う。

## 15. エラー処理

- 参照不正は解析前に `INVALID_REFERENCE`。
- 部材長ゼロは `ZERO_LENGTH_MEMBER`。
- 局所座標系を定義できない場合は `INVALID_ORIENTATION`。
- 支点不足または特異行列は `MODEL_UNSTABLE` または `SOLVER_ERROR`。
- 後処理失敗は `POSTPROCESS_ERROR`。
- 解析失敗時は部分的な成功結果を返してはならない。
- 結果JSONに `NaN`、`Infinity` を出力してはならない。

## 16. テスト観点

- 片持梁の先端集中荷重。
- 単純梁の中央集中荷重。
- 単純梁の等分布荷重。
- 3D片持梁のねじり。
- 支点不足モデルの失敗。
- 不正参照モデルの失敗。
- 全節点自由かつ支点なしモデルの剛体モード検出。
- 局所座標系が直交正規化されること。
- 全体剛性が対称であること。

## 17. 完了条件

- `docs/11_test_spec.md` の必須検証ケースが通る。
- `docs/12_quality_gate.md` の数値許容誤差を満たす。
- エンジン単体でAPIやUIなしに解析できる。
- 結果を `docs/06_result_schema.md` に変換できる。
