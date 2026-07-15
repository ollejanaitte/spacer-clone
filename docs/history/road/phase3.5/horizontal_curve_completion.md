# Horizontal Curve Completion Design

## 0. 位置づけ

- 対象Phase: Phase3.5-1
- 前提となる設計書: `typed_liner_draft_schema_vnext.md`, `docs/liner/geometry_core.md`, `docs/liner/station_rules.md`, `docs/liner/numerical_accuracy.md`
- この設計書で扱う範囲: 直線、円弧、クロソイドの入力、評価、C0/C1検証、sampling 3系統、逆投影API、Golden test
- この設計書で扱わない範囲: 縦断高さ、横断勾配、Frame Modelへの最終統合、DXF/STL出力実装

## 1. 背景と目的

Phase3.5-0調査で、Geometry Coreには `evaluateStraightElement()`, `evaluateCircularArcElement()`, `evaluateClothoidElement()`, `evaluateAlignmentAtDistance()` が存在する一方、`validateAlignment()` はC0/C1連続性を十分に検証していないことが判明した。また、円弧・クロソイドはUI編集対象として未整理であり、逆投影 `stationAtPoint(x,y)` も未実装である。

本設計は、Phase3.5-1で水平曲線を実装完了状態にするためのGate条件を定義する。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| C0連続 | 隣接要素の終点座標と次要素の始点座標が許容差内で一致すること。 |
| C1連続 | 隣接要素の終点方位角と次要素の始点方位角が許容差内で一致すること。 |
| G2参考診断 | 曲率連続性。Phase3.5ではwarning扱いを基本とする。 |
| Sagitta | 曲線弧と近似弦の最大離れ。polyline近似誤差の基準。 |
| 逆投影 | 任意XY点から線形上の最近傍physical distance、displayed station、offsetを求める処理。 |

## 3. 確定方針（Human Decision反映）

- Decision #2: クロソイドはSimpson積分を維持する。許容誤差、分割数、将来Fresnel置換条件を明記する。
- Decision #3: UIはタブ分割の「ライン」タブに水平線形入力を置く。
- Decision #8: Phase3.5では単一alignmentのみ扱う。
- Decision #9: 表示用、DXF用、Frame分割用samplingを分離する。

## 4. ドメインモデル

疑似TypeScript:

```ts
interface HorizontalAlignmentDraft {
  id: string;
  elements: HorizontalElementDraft[];
}

type HorizontalElementDraft =
  | StraightElementDraft
  | CircularArcElementDraft
  | ClothoidElementDraft;
```

| 名前 | 型 | 必須 | 制約 | 説明 |
|---|---|---:|---|---|
| `id` | string | Yes | unique | 要素ID。 |
| `type` | string | Yes | `straight/arc/clothoid` | union discriminator。 |
| `start.x/y` | number | Yes | finite | 要素始点。 |
| `azimuth` | number | Yes | finite rad | 始点接線方位角。 |
| `length` | number | Yes | `> 0` | 弧長。 |
| `radius` | number | arcのみ | `> 0` | 円弧半径。 |
| `turn` | enum | arc/clothoid | `left/right` | 曲線方向。 |
| `clothoidParameter` | number | clothoidのみ | `> 0` | A値。 |
| `startRadius/endRadius` | number/null | clothoidのみ | null or `> 0` | 始終点半径。 |

## 5. アルゴリズム / 計算要件

直線:

```text
x(s) = x0 + cos(theta0) s
y(s) = y0 + sin(theta0) s
kappa(s) = 0
```

円弧:

```text
sign = left ? +1 : -1
delta = sign * s / R
theta(s) = theta0 + delta
x(s) = x0 + sign * R * (sin(theta(s)) - sin(theta0))
y(s) = y0 - sign * R * (cos(theta(s)) - cos(theta0))
kappa = sign / R
```

クロソイド:

```text
kappa(s) = k0 + (k1 - k0) * s / L
theta(s) = theta0 + k0*s + 0.5*((k1-k0)/L)*s^2
x(s) = x0 + integral_0^s cos(theta(u)) du
y(s) = y0 + integral_0^s sin(theta(u)) du
```

Simpson積分:

- 最小分割数: 128区間を維持する。
- 分割数は偶数に丸める。
- Phase3.5目標精度: L <= 500 m, A >= 30 mでendpoint誤差 1e-3 m以内。
- Fresnel置換Gate: GC-08〜GC-10で1e-3 mを満たせない、またはperformance smokeでsamplingが許容時間を超える場合。

C0/C1検証:

| Check | Tolerance | Failure |
|---|---:|---|
| C0 position | 1e-6 m | error `LINER_GEOM_POSITION_DISCONTINUITY` |
| C1 azimuth | 1e-9 rad | error `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
| G2 curvature | 1e-6 1/m | warning `LINER_GEOM_CURVATURE_DISCONTINUITY` candidate |

逆投影API:

```ts
interface StationProjection {
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  distance: number;
  elementId: string;
  localDistance: number;
  localFrame: LocalFrame;
}

function stationAtPoint(alignment, stationDefinition, point): StationProjection;
```

処理:

1. 要素ごとに候補projectionを求める。
2. 直線は線分射影、円弧は中心角射影、クロソイドは初期sampling後にNewtonまたは局所探索で最小距離化する。
3. 最小 `distance` の候補を採用する。
4. offset符号は `dot(point - H(s), N(s))` とする。

Sampling 3系統:

| System | max chord | sagitta tolerance | Strictness | Consumer |
|---|---:|---:|---|---|
| Display | 0.5 m | <= 0.005 m | recommended | Preview / Review diagram |
| DXF | 0.1 m | <= 0.001 m | recommended | DXF polyline |
| Frame | 0.25 m | <= 0.0025 m | strict | Frame member subdivision |

## 6. UI仕様

- 配置: 「ライン」タブ。
- 要素表: `type`, `start`, `azimuth`, `length`, `radius`, `turn`, `clothoidParameter`, `startRadius`, `endRadius` を編集する。
- 確認図: display samplingを用い、C0/C1エラー位置を強調表示する。
- 逆投影確認: マウス位置または指定XYに対してstation/offsetを表示する。

## 7. Pipeline統合

- Stage: `resolveHorizontalAlignment(domainDraft.alignment, samplingProfile)`。
- 出力: `HorizontalGeometryResult`。
- `horizontal.sampledPoints` はsampling profile別に生成する。
- `stationAtPoint()` はUI・validation・mapperで共有するpure functionとする。

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| radius <= 0 | error | `LINER_GEOM_RADIUS_INVALID` |
| clothoid A <= 0 | error | `LINER_GEOM_CLOTHOID_PARAMETER_INVALID` |
| C0 gap | error | `LINER_GEOM_POSITION_DISCONTINUITY` |
| C1 gap | error | `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
| G2 gap | warning | `LINER_GEOM_CURVATURE_DISCONTINUITY` |
| Simpson target accuracy exceeded | warning | `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` |

## 9. テスト方針

- Unit: straight / arc / clothoid評価、localFrame、angle normalization。
- Boundary: ゼロ長、半径不正、C0/C1 gap、左右turn。
- Golden: GC-08〜GC-10 clothoid、GC-13 curved 3D連携。
- Performance smoke: display/dxf/frame samplingで許容時間内に完了すること。

## 10. Migration / 後方互換

- 既存straight-only draftは `type: straight` の要素列として読み替える。
- v0.1 fixed-z draftの水平線形は `alignment.elements` に移行する。
- 複数alignmentはPhase3.5では読み込み不可診断とし、自動統合しない。
