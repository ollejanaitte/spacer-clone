# Vertical Alignment Design

## 0. 位置づけ

- 対象Phase: Phase3.5-2
- 前提となる設計書: `typed_liner_draft_schema_vnext.md`, `horizontal_curve_completion.md`, `docs/liner/profile_rules.md`
- この設計書で扱う範囲: 高さデータ、縦断勾配、放物線縦断曲線、PVI/PVC/PVT、UI/Schema/Pipeline接続
- この設計書で扱わない範囲: 横断勾配、superelevation、Frame member分割、DXF出力

## 1. 背景と目的

現状 `frontend/src/liner/core/geometry/vertical.ts` には `grade` と `parabolic` の評価関数があるが、`buildIntermediateResult()` は固定 `z` から `buildVerticalResult()` を作るだけで、縦断domainとpipelineは未接続である。

本設計は、JIP-LINER準拠の「高さ」「縦断」タブから縦断線形を入力し、`vertical.sampledPoints` とgrid Zの基礎となる `Z_profile(s)` を生成する方法を定義する。

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| Height data | 測点ごとの既知標高。縦断要素生成の基礎データ。 |
| Grade segment | 一定勾配の縦断直線。 |
| PVI | 縦断勾配変化点。 |
| PVC | 縦断曲線始点。 |
| PVT | 縦断曲線終点。 |
| Parabolic curve | 勾配が線形変化する放物線縦断曲線。 |

## 3. 確定方針（Human Decision反映）

- Decision #3: UIはタブ分割とし、高さデータは「高さ」タブ、縦断勾配・曲線は「縦断」タブに置く。
- Decision #5: 縦断domainを `liner.domainDraft` に必須保存する。
- Decision #8: Phase3.5では単一alignment上の単一vertical alignmentを扱う。

## 4. ドメインモデル

```ts
interface VerticalAlignmentDraft {
  id: string;
  heightPoints: HeightPointDraft[];
  elements: VerticalElementDraft[];
}

type VerticalElementDraft =
  | { type: "grade"; id: string; startPhysicalDistance: number; startElevation: number; grade: number; length: number }
  | { type: "parabolic"; id: string; pvcPhysicalDistance: number; pvcElevation: number; gradeIn: number; gradeOut: number; length: number; pviPhysicalDistance?: number; pvtPhysicalDistance?: number };
```

| 名前 | 型 | 必須 | 制約 | 説明 |
|---|---|---:|---|---|
| `heightPoints[].physicalDistance` | number | Yes | alignment内 | 既知高さのphysical distance。 |
| `heightPoints[].elevation` | number | Yes | finite | 標高。 |
| `elements[].type` | enum | Yes | `grade/parabolic` | 縦断要素種別。 |
| `startPhysicalDistance` | number | grade | alignment内 | 勾配区間開始。 |
| `grade` | number | grade | finite | dZ/ds。0.02 = 2%。 |
| `pvcPhysicalDistance` | number | parabolic | alignment内 | PVC位置。 |
| `gradeIn/gradeOut` | number | parabolic | finite | 始終点勾配。 |
| `length` | number | Yes | `> 0` | 区間長。 |

## 5. アルゴリズム / 計算要件

Grade:

```text
Z(s) = Z0 + g * (s - s0)
grade(s) = g
```

Parabolic:

```text
u = s - s_pvc
r = (g_out - g_in) / L
Z(s) = Z_pvc + g_in*u + 0.5*r*u^2
grade(s) = g_in + r*u
```

PVI default:

```text
s_pvi = s_pvc + L / 2
Z_pvi = Z_pvc + g_in * (L / 2)
s_pvt = s_pvc + L
```

境界条件:

- 縦断要素はphysical distance順に並べる。
- coverage gapはgrid生成に必要なstationで未定義ならerror。
- elevation continuityは必須。
- grade continuityはparabolic接続では必須。grade segment同士の折れは許容する。

許容誤差:

| Quantity | Tolerance |
|---|---:|
| elevation continuity | 1e-6 m |
| station boundary | 1e-6 m |
| grade continuity | 1e-9 |

## 6. UI仕様

配置:

- 「高さ」タブ: height point table。
- 「縦断」タブ: grade/parabolic element table、PVI/PVC/PVT入力。

ワイヤ:

```text
[高さ]
  + 高さ点追加
  Physical Distance | Displayed Station | Elevation

[縦断]
  + 勾配区間追加  + 縦断曲線追加
  Type | Start/PVC | Length | Z/PVC Z | Grade In | Grade Out | PVI | PVT | Diagnostics
```

エラー表示:

- overlap/gap/coverage errorは表上部のdiagnosticsと該当行に表示する。
- PVI/PVC/PVTの自動計算値はread-only previewとして表示し、明示入力がある場合は差分をwarning表示する。

## 7. Pipeline統合

- Stage: `resolveVertical(profile, stationTable)`。
- 入力: `domainDraft.verticalAlignment`, `stationTable`, `horizontal.totalLength`。
- 出力: `VerticalGeometryResult`。
- 既存差分: `buildVerticalResult(stations,totalLength,z)` を廃止し、`evaluateVerticalAlignmentAtDistance()` を呼ぶ。

Pipeline sampling:

- `vertical.sampledPoints` はstation table entriesとdisplay sampling pointsの合成で生成する。
- Grid点のZ_profileはgrid stationごとに縦断評価して取得する。

## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| range overlap | error | `LINER_PROFILE_OVERLAP` |
| station outside alignment | error | `LINER_STATION_OUT_OF_RANGE` |
| elevation discontinuity | error | `LINER_PROFILE_ELEVATION_DISCONTINUITY` candidate |
| grade exceeds hard limit | error | `LINER_PROFILE_GRADE_EXCEEDS_LIMIT` |
| grade exceeds soft limit | warning | `LINER_PROFILE_GRADE_EXCEEDS_LIMIT` |
| no vertical coverage for grid point | error | `LINER_PROFILE_COVERAGE_GAP` candidate |

## 9. テスト方針

- Unit: grade, parabolic評価。
- Boundary: PVC/PVI/PVT、要素境界、coverage gap。
- Golden: GC-05縦断放物線、固定Z migrationからgrade=0。
- Pipeline: `buildIntermediateResult()` が固定Zではなく縦断評価値を `vertical.sampledPoints` に出すこと。

## 10. Migration / 後方互換

- 既存 `z` のみを持つdraftは、全alignmentを覆うgrade=0の縦断要素へ移行する。
- `heightPoints` が空でもmigrationは許容し、`verticalAlignment.elements` を生成する。
- 保存時は `liner.domainDraft.verticalAlignment` を必須fieldとする。
