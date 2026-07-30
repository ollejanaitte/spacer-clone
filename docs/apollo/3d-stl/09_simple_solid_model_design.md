APOLLO_3D_SIMPLE_SOLID_DATA_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_POC_ASSUMPTION_VERDICT: FROZEN_FOR_POC
APOLLO_3D_GEOMETRY_ALGORITHM_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_DISPLAY_EXPORT_ALIGNMENT_VERDICT: FROZEN
APOLLO_3D_STEP6_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS
RECOMMENDED_NEXT_STEP: STEP7_STL_EXPORT_DESIGN

# 09. PoC-B 橋梁簡易ソリッド形状設計

## 1. 目的

本書は、Apollo 3D/STL の Step 6 として、1径間、直橋、等桁高、非合成 RC 床版鋼鈑桁橋を対象に、簡易 3D solid 形状を生成するための実装前設計を固定する。  
本Stepでは production code を実装せず、current repository implementation から取得できる geometry source と、PoC 仮定値 provider に逃がす寸法責務を分離する。

## 2. 判定と前提

- `CONFIRMED`: `frontend/src/bridgeDefinition/types.ts` には `spans`、`supports`、`girders`、`crossBeams`、`bearings`、`deck`、`coordinatePolicy` が存在する。
- `CONFIRMED`: `frontend/src/bridgeDefinition/adapters/fromLinerBridge.ts` と `frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts` は deck width、girder offset、support station、cross beam station の派生 precedent を持つ。
- `CONFIRMED`: current BridgeDefinition には girder depth、flange width/thickness、web thickness、deck overhang、bearing dimensions、bracing 定義が存在しない。
- `PROVISIONAL`: Step 6 PoC は `BridgeDefinition + ApolloVisualization defaults provider` から簡易寸法を供給する。
- `ASSUMED_FOR_POC`: bracing は station 群と pattern を defaults provider または fixture で与え、SoR へ逆流させない。
- `NON_BLOCKING_FOR_IMPLEMENTATION`: pier/abutment は marker block とし、構造的ソリッドではなく locator 表示に留める。

## 2.1 PR-4 implementation update

- `CONFIRMED`: Thursday, July 30, 2026 時点の `origin/main` では Apollo runtime path に persisted `BridgeDefinition` は存在しない。
- `CONFIRMED`: PR-4 実装は `apolloPhase1Unit2 ?? ProjectModel` から longitudinal topology を read-only で取得し、`ApolloBridgeGeometryDefaultsProvider` から transverse / section / bearing / marker 寸法を注入する。
- `PROVISIONAL`: girder offsets、deck width、cross beam station fractions は current implementation で defaults provider へ隔離した。
- `ASSUMED_FOR_POC`: bearing と pier/abutment marker は support anchor を基準に派生し、正式 substructure SoR は導入していない。
- `NON_BLOCKING`: current implementation は `BridgeDefinition` persistence を追加していないため、本書 5章 source data map の `BridgeDefinition.*` 参照は Apollo runtime では「同等責務の derived rule」として解釈する。

## 3. current implementation evidence

参照パス:

- `frontend/src/bridgeDefinition/types.ts`
- `frontend/src/bridgeDefinition/adapters/fromLinerBridge.ts`
- `frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts`
- `frontend/src/bridgeDefinition/generator/structuralModelGenerator.ts`
- `frontend/src/bridge/viewer/BridgeThreeViewer.tsx`
- `frontend/src/viewer/SceneBuilder.ts`
- `frontend/src/viewer/threeUtils.ts`
- `frontend/src/liner/exports/linerFrameStl.ts`

確認事項:

- `BridgeDefinition.coordinatePolicy.axisConvention` は `x-longitudinal-y-transverse-z-up` を前提としている。
- `BridgeDefinitionGirder` は `offset` と `spanIds` を持つが、断面寸法を持たない。
- `BridgeDefinitionCrossBeam` は `station` と任意 `girderIds` を持つが、beam size は持たない。
- `BridgeDefinitionBearing` は `supportId` と `type` のみで、寸法を持たない。
- `BridgeDefinitionDeck` は `width` と任意 `thickness` を持つ。
- `fromLinerBridge.ts`
  - girders は `girderLineSets[].lines[].nominalOffset` から生成する。
  - cross beams は `substructure.crossBeams[].station` から生成する。
  - deck width は width change points または section points から求め、なければ `10.0m` default を使う。
- `fromBridgeProject.ts`
  - girders は line 群または cross section 由来 `yPositionsFor()` から生成する。
  - supports は span 境界から導出する。
  - crossBeams / bearings は空配列であり、PoC-B の充足には不足が残る。
- `structuralModelGenerator.ts`
  - mesh station と girder offsets の deterministic 展開 precedent がある。
  - cross beam は station を最寄り mesh station へ寄せて girder 間 member を生成する。
  - bearing は support kind へ情報を反映するだけで寸法ソリッドは未生成。
- `BridgeThreeViewer.tsx`
  - plane / grid / axis / group 管理 / geometry disposal の precedent を持つ。
- `linerFrameStl.ts`
  - JSCAD 経由で line/cylinder geometry を STL 化する precedent を持つ。

## 4. 対象橋梁スコープ

Step 6 PoC-B 対象:

- 1径間
- 直橋
- 桁高一定
- 主桁は simple I-section extrusion または simple box girder extrusion
- 横桁は矩形または I-section 簡略表現
- 対傾構は line/cylinder または simple X brace
- RC 床版は plate
- 支承は block
- 橋脚/橋台は locator block

対象外:

- 曲線橋
- 多径間連続系の正式ソリッド分割
- 横断勾配、縦断勾配、キャンバー
- 端横桁・対傾構の詳細継手
- 精密鋼板厚組立
- 鉄筋や床版配筋
- 解析精度に関わるソリッド品質保証

## 5. source data map

| 項目 | 正式データ | PoC仮定値 | 注入場所 | validation | 将来置換条件 |
|---|---|---|---|---|---|
| span length | `BridgeDefinition.spans[].length` | なし | source | `> 0` 必須 | なし |
| girder count | `BridgeDefinition.girders.length` | 0件時は1本 centerline | builder defaults | warning | SoR が空でないこと |
| girder spacing | `BridgeDefinition.girders[].offset` 差分 | 0件時は 0 | source | monotonic sort | girders 正式入力 |
| girder depth | なし | `2.0m` | PoC defaults provider | `> 0` | sidecar または BridgeDefinition 拡張 |
| flange width | なし | `0.55m` | PoC defaults provider | `> web thickness` | 同上 |
| flange thickness | なし | `0.03m` | PoC defaults provider | `> 0` | 同上 |
| web height | なし | `girder depth - 2 * flange thickness` | derived | finite | girder depth 正式化 |
| web thickness | なし | `0.02m` | PoC defaults provider | `> 0` | 同上 |
| cross beam stations | `BridgeDefinition.crossBeams[].station` | span 1/4, 1/2, 3/4 | defaults provider | span 内 | crossBeams 正式入力 |
| cross beam size | なし | `width 0.35m / depth 0.8m` | PoC defaults provider | `> 0` | sidecar または BridgeDefinition 拡張 |
| bracing positions | なし | cross beam 間 midpoint | derived defaults | girder 2本以上 | bracing 正式入力 |
| bracing pattern | なし | `x_single` | PoC defaults provider | enum | 正式 pattern 定義 |
| deck width | `BridgeDefinition.deck.width` | adapter default `10.0m` | source | `> 0` | なし |
| deck thickness | `BridgeDefinition.deck.thickness` | `0.24m` | source or defaults | `> 0` | SoR 入力 |
| deck overhang | なし | `0.5m` each side | PoC defaults provider | `>= 0` | sidecar / BridgeDefinition 拡張 |
| bearing dimensions | なし | `0.6 x 0.6 x 0.12m` | PoC defaults provider | `> 0` | bearing dimension SoR |
| pier/abutment marker dimensions | なし | `1.5 x 1.5 x 2.0m` | PoC defaults provider | `> 0` | substructure sidecar |

重要:

- PoC 仮定値は viewer component 内へハードコードしない。
- 仮称 `ApolloBridgeGeometryDefaultsProvider` を derived builder option として設計する。
- `BridgeDefinition` と `ProjectModel` は read-only source に留める。

## 6. 仮称 contract

以下は production code ではない TypeScript 風 freeze 例である。

```ts
type ApolloBridgeGeometryDefaultsProvider = {
  girder: {
    shape: "simple_i" | "simple_box";
    depthM: number;
    flangeWidthM: number;
    flangeThicknessM: number;
    webThicknessM: number;
    transverseOffsetsM?: readonly number[];
  };
  crossBeam: {
    depthM: number;
    widthM: number;
    stationFractions?: readonly number[];
  };
  bracing: {
    pattern: "x_single" | "single_diagonal" | "none";
    diameterM: number;
  };
  deck: {
    thicknessM: number;
    overhangM: number;
    widthM?: number;
  };
  bearing: {
    widthM: number;
    lengthM: number;
    heightM: number;
  };
  marker: {
    widthM: number;
    lengthM: number;
    heightM: number;
  };
};

type ApolloSolidGeometryParameters = {
  id: string;
  sourceEntityKind: "member" | "support";
  sourceEntityId: string;
  selectionKey: string;
  validationTargetKey: string;
  displayLabel: string;
  kind:
    | "girder"
    | "cross_beam"
    | "bracing"
    | "deck"
    | "bearing"
    | "pier_marker"
    | "abutment_marker";
  visibilityGroup: string;
  exportable: boolean;
  dimensionsM: Record<string, number>;
  localFrame: {
    origin: [number, number, number];
    xAxis: [number, number, number];
    yAxis: [number, number, number];
    zAxis: [number, number, number];
  };
  path?: Array<[number, number, number]>;
};
```

実装結果メモ:

- PR-4 では `transverseOffsetsM = [-4.5, -1.5, 1.5, 4.5]`、`stationFractions = [0.25, 0.5, 0.75]`、`deck.widthM = 10.0` を default 化した。
- line-model と simple solid は同一 `ApolloVisualizationModel` に共存し、viewer visibility で line/solid と subgroup を切替可能にした。
- selection / validation highlight は `selectionKey` / `validationTargetKey` を solid 側へ持たせて継承した。

## 7. shape catalog

| 形状 | source | 用途 | STL対象 | fallback |
|---|---|---|---|---|
| main girder | `girders[]`, `spans[]`, defaults | 主桁ソリッド | 可 | line model のみ表示 |
| cross beam | `crossBeams[]` or defaults | 横桁 | 可 | 省略して warning |
| bracing | derived defaults | 対傾構 | 可 | 省略して warning |
| deck plate | `deck`, `spans`, defaults | RC 床版 | 可 | width/thickness invalid なら非出力 |
| bearing block | `supports[]`, `bearings[]`, defaults | 支承 | 可 | support marker のみ |
| pier marker | `supports[substructureKind=pier]` | 橋脚位置表示 | 不可推奨 | label anchor のみ |
| abutment marker | `supports[substructureKind=abutment]` | 橋台位置表示 | 不可推奨 | label anchor のみ |
| node/member labels | Apollo draft / line model | 補助表示 | 不可 | viewer only |

## 8. generation algorithm

### 8.1 共通座標系

- X: 橋軸方向
- Y: 橋軸直角方向
- Z: 鉛直上向き
- 単位: display model は m
- origin: model-space origin

### 8.2 主桁中心線

```text
for each girder in sorted(girders by offset, id):
  start = min(span.startStation)
  end = max(span.endStation)
  path = [(start, girder.offset, 0), (end, girder.offset, 0)]
```

0件時 fallback:

```text
path = [(0, 0, 0), (totalSpanLength, 0, 0)]
kind = centerline fallback girder
warning = BRIDGE_GEOMETRY_GIRDER_FALLBACK
```

### 8.3 transverse offsets

```text
sortedOffsets = unique(round(girders[].offset))
girderSpacing[i] = sortedOffsets[i + 1] - sortedOffsets[i]
deckCenterY = (minOffset + maxOffset) / 2
```

### 8.4 simple I-section extrusion

断面パラメータ:

- depth = defaults.girder.depthM
- flangeWidth = defaults.girder.flangeWidthM
- flangeThickness = defaults.girder.flangeThicknessM
- webThickness = defaults.girder.webThicknessM
- webHeight = depth - 2 * flangeThickness

疑似コード:

```text
profile = ISection(flangeWidth, flangeThickness, webThickness, webHeight)
extrude profile along girder path
local z range = [-depth, 0]
top flange top = z = 0
```

### 8.5 simple box girder

PoC では必要時のみ選択可能とし、初期値は `simple_i`。

```text
outerWidth = flangeWidth
outerDepth = depth
wallThickness = webThickness
solid = hollow box prism along girder path
```

### 8.6 cross beam placement

```text
stations =
  if BridgeDefinition.crossBeams.length > 0
    then crossBeams[].station
    else defaults(span quarter points)

for each station:
  for adjacent girder pair:
    create beam from (station, leftOffset, zCrossBeam)
                  to (station, rightOffset, zCrossBeam)
```

仮定:

- `zCrossBeam = -0.35 * girderDepth`
- `girderIds` 指定時は対象 girder pair のみ

### 8.7 bracing line / cylinder

```text
for each crossBeam interval:
  if pattern == x_single:
    create diagonal cylinders between
      (stationA, leftOffset, zBrace)
      (stationB, rightOffset, zBrace)
    and
      (stationA, rightOffset, zBrace)
      (stationB, leftOffset, zBrace)
```

fallback:

- girders < 2 なら bracing 非生成
- station interval 不足なら bracing 非生成

### 8.8 deck plate

```text
deckStart = min(span.startStation)
deckEnd = max(span.endStation)
deckLeft = minOffset - overhang
deckRight = maxOffset + overhang
deckTop = 0
deckBottom = -deckThickness
solid = box/extruded plate spanning [deckStart, deckEnd] x [deckLeft, deckRight]
```

### 8.9 bearing block

```text
for each support:
  centerOffset = nearest girder offset to 0, or 0
  origin = (support.station, centerOffset, -girderDepth - bearingHeight/2)
  solid = oriented box(bearingLength, bearingWidth, bearingHeight)
```

### 8.10 pier / abutment marker

```text
for each support:
  if substructureKind == pier:
    marker kind = pier_marker
  else if substructureKind == abutment:
    marker kind = abutment_marker
  else:
    skip
```

marker は location evidence であり、製造用 STL 対象にしない。

### 8.11 local frame / orientation

- girder / deck / beam は local x を橋軸方向へ向ける
- cross beam は local x を横断方向へ向ける
- bracing は start->end vector を local x とする
- local z は常に world +Z

### 8.12 end trimming

- span 外へはみ出す geometry は生成しない
- cross beam / bracing は deck 幅外へ延長しない
- bearing は support station のみで生成し、span 境界調整はしない

### 8.13 zero-length / invalid dimensions

| 事象 | 方針 |
|---|---|
| zero span | shape 非生成、warning |
| duplicate girder offset | 1本へ集約、warning |
| negative girder depth | shape 非生成、error |
| deck width <= 0 | deck 非生成、warning |
| cross beam station outside span | nearest valid station へ clamp、warning |
| unsupported shape | line fallback または skip |

## 9. display と STL の共通責務

推奨アーキテクチャ:

```text
ApolloVisualizationModel
        ├─ ApolloSolidGeometryParameterBuilder
        │     └─ ApolloSolidGeometryParameters[]
        ├─ ThreeSceneBuilder
        └─ StlGeometryBuilder
```

共通化するもの:

- sourceEntityId
- geometry kind
- dimensions
- local frame
- path
- visibility group
- exportable flag

分離するもの:

- display color / opacity / hover / outline
- STL triangle tessellation
- label / marker 表示

### 9.1 display-only simplification

- label anchors
- translucent deck
- helper axis / grid
- pier/abutment marker

### 9.2 export-only simplification

- labels 除外
- marker 除外
- bearing type iconography 除外
- scene-only helper 除外

## 10. visibility groups

- `line-model`
- `main-girders`
- `cross-beams`
- `bracing`
- `deck`
- `bearings`
- `substructure-markers`
- `labels`

初期表示:

- girders, deck: on
- cross-beams, bracing, bearings: on
- substructure-markers, labels: viewer option

## 11. performance budget

- `PROVISIONAL_THRESHOLD`: 1径間 PoC で triangle budget 500k 未満
- girder 4本、cross beam 5〜9本、brace 数十本を想定
- instancing 候補:
  - bearing block
  - pier/abutment marker
- LOD は不要
- full rebuild を前提とし、incremental solid patch は導入しない

## 12. invalid / missing fallback

| 欠損 | 分類 | 方針 |
|---|---|---|
| girder section dimensions 欠損 | `ASSUMED_FOR_POC` | defaults provider |
| deck thickness 欠損 | `ASSUMED_FOR_POC` | defaults provider |
| bracing definition 欠損 | `MISSING` | PoC defaults or skip |
| bearing dimensions 欠損 | `ASSUMED_FOR_POC` | defaults provider |
| support substructure kind 欠損 | `PROVISIONAL` | marker 省略 |
| cross beam entries 欠損 | `PROVISIONAL` | quarter-point defaults |

## 13. implementation file forecast

想定追加/変更候補:

- `frontend/src/apollo/visualization/*`
  - solid geometry parameter builder
- `frontend/src/apollo/export/*`
  - STL 用 geometry adapter
- `frontend/src/viewer/*`
  - solid scene builder / visibility integration
- `frontend/src/apollo/__tests__/*`
  - dimension / deterministic tests
- `docs/apollo/3d-stl/*`
  - defaults / algorithm 補足

変更禁止:

- Solver
- Numeric
- LINER calculation
- Backend
- Apollo Unit 3 editing behavior
- package upgrades

## 14. test dimensions

最低限テストする寸法:

- span = `30.0m`
- girder count = `4`
- girder offsets = `[-4.5, -1.5, 1.5, 4.5]m`
- girder depth = `2.0m`
- flange width = `0.55m`
- flange thickness = `0.03m`
- web thickness = `0.02m`
- deck width = `10.0m`
- deck thickness = `0.24m`
- bearing = `0.6 x 0.6 x 0.12m`

これらは `ASSUMED_FOR_POC` であり、実測または正式設計入力で置換可能。

## 15. implementation entry gate

- Step 1 visualization contract と Step 2 ownership freeze が `origin/main` に存在
- defaults provider の責務が viewer component 外に隔離されている
- solid geometry parameter builder が display/export 共通 source になる
- bracing / bearing / marker の exportable flag が定義済み
- deterministic sort rule が girder id / station / kind で固定されている

## 16. implementation completion gate

- main girder solids が deterministic に生成される
- cross beam solids が station/girder pair に基づき生成される
- deck solid が width/thickness から生成される
- bearing blocks が support location に生成される
- pier/abutment markers が export から除外される
- invalid dimensions で crash せず warning/fallback になる
- display geometry と STL geometry が共通 parameter source を使う
- Viewer mesh が Apollo 設計正本へ混入しない

## 17. unresolved items

| 項目 | 分類 | 内容 | 見直し条件 |
|---|---|---|---|
| bracing 正式 SoR | `MISSING` | current BridgeDefinition に項目なし | sidecar または BridgeDefinition 拡張時 |
| girder detailed section | `PROVISIONAL` | I-section のみ PoC 対応 | section catalog 導入時 |
| bearing dimensions | `ASSUMED_FOR_POC` | type ごとの正式寸法なし | bearing design data 入手時 |
| pier/abutment actual geometry | `DEFERRED` | marker block のみ | substructure visualization phase |
| multi-span deck split | `DEFERRED` | Step 6 は 1径間優先 | PoC-B 拡張時 |

## 18. 実装開始判断

- `APOLLO_3D_SIMPLE_SOLID_DATA_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_POC_ASSUMPTION_VERDICT: FROZEN_FOR_POC`
- `APOLLO_3D_GEOMETRY_ALGORITHM_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_DISPLAY_EXPORT_ALIGNMENT_VERDICT: FROZEN`
- `APOLLO_3D_STEP6_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`

Step 6 は、BridgeDefinition が持つ位置情報を最大限利用しつつ、不足する断面寸法を PoC defaults provider に固定することで、production SoR を汚さずに実装開始可能である。
