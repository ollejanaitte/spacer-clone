# 現状データフロー — ①②③の実態

> **Phase:** P1
> **方法:** 実コード・schema・fixture・test の横断調査（2026-08-08, main `4e79b3c` + research `c7d7774`）。
> **凡例:** [S]=ソース正本 / [D]=導出 / [M]=欠落または未実装

## 1. 全体像

```
①道路線形 (LINER)
  domainDraft (schema/types.ts 0.3.0) ──serialize──▶ RoadDesignDocument (0.1.0)
  │  horizontal/vertical/crossfall/width/pier
  ▼
  Coordinate3dInput (liner/core/coordinate3d.ts)
  ▼
②上部工 (APOLLO)
  LinerAlignmentConnector ──▶ GeometryEngine ──▶ GeometrySnapshot (6.1.0)
  ──▶ BSDD (bridge-superstructure-design 0.1.0) ──▶ 3D / STL / Report / Replay
  ──▶ Analysis(grillage)  ※設計数値は NOT_AUTHORIZED / NOT_GRANTED
  ▼
③下部工 (SUBSTRUCTURE)
  linerPiersToSupportHandoff (station+skewのみ) → Support[]
  superstructureInterface (support-interface.json: bearingSeats+reactionCases)
  → CalculationAdapterInput → Test/Mock Engine → CalculationAdapterResult
  → SubstructureProject (0.2.0) / AdapterEnvelope (0.1.0)
```

## 2. ①道路線形

| データ | 型 / 位置 | 単位 | 備考 |
|--------|-----------|------|------|
| station（測点） | `GeneratedStation` / `core/types.ts:186-193` | m | physicalDistance / displayedStation を分離 |
| X/Y/Z | `Vec2/Vec3` / `core/types.ts:10-19` | m | right-handed, Z-up, rad |
| tangent / azimuth | `azimuth` / `core/types.ts:136,142,150` | rad | 各要素に保持 |
| 平面線形 | `LinearAlignment`（straight/arc/clothoid）/ `core/types.ts:157-167` | m / rad | C0/C1 判定あり |
| 縦断 | grade/parabolic / `schema/types.ts:373-405` | grade=ratio | K/R 値方式は不採用 |
| 横断勾配 | `CrossSlopeIntervalDraft` / `schema/types.ts:423-431` | % | signConvention=right_down_positive |
| 幅員 | `WidthChangePointDraft` / `schema/types.ts:546-551` | m | 左/右オフセット |
| 橋梁幾何 | `SpanDraft/PierDraft` / `schema/types.ts:518-536` | m / rad | skewAngleRad は alignment 左法線基準 |
| terrain | RESEARCH のみ DISPLAY_LAYER / `samples/.../terrain.ts:15-20` | m | 計算には使用しない（明記） |

**Persistence:** RoadDesignDocument（RDD, `contracts/roadDesignDocument.ts:85-114`）。
本体は**参照エントリのみ**（alignments/stationing/profiles/crossSections/bridges は
id+ref）。実幾何は extension `spacer.liner/domain-draft-vnext-geometry` に全量を内包
（`adapters/linerDomainDraftRoadDesignMapper.ts:34-35,624-628`）。

**Capability:** bridgeGeometryCapability=absent / drawingCapability=absent
（`linerDomainDraftRoadDesignMapper.ts:729,733`）。RDD/TransferPackage は frame 力学データを**禁止**
（`roadDesignDocument.ts:116-134`）。

**3D:** MAIN は汎用 `Viewer3D` 経由の headless frame project。RESEARCH は
`BridgeGeometry3dPayload`（`core/geometry3d/types.ts:83-94`, units=m, global）
＋ Three.js 座標変換（`threeCoords.ts:1-47`, three.y=domain.z）。

**橋梁→下部工連携（MAIN のみ実装）:** `substructure/planning/linerHandoff.ts:1-60`
→ `SubstructurePlanningHost`（station/skew のみ引継ぎ。形状はサンプル既定値）。

## 3. ②上部工

| データ | 型 / 位置 | 単位 | 備考 |
|--------|-----------|------|------|
| 橋長 / 支間 | `AlignmentReference.bridgeLengthM/spanLengthsM` / `apollo/geometry/types.ts:61-68` | m | RB001: 134.001 / 40.201+51.0+40.2 |
| 支持線 | `SupportLine`（stationM/skewRad/transverseAxis） / `types.ts:70-77` | m / rad | |
| 斜角 | `SupportLine.skewRad` / `types.ts:74` | rad | 正準は rad, source に deg 保存 |
| 主桁線 | `GirderLine.offsetM` / `types.ts:99-106` | m | |
| 床版 | `DeckReference` / `types.ts:164-186` | m | RB001: 幅 8.01, 厚 0.23 |
| 中間格点 | `GridPanelPoint` / `types.ts:126-139` | — | **中間点は HOLD_INSUFFICIENT_SOURCE** |
| 支承 | `BearingPoint` / `types.ts:188-195` | m | engine で生成 |
| ハンチ | `Haunch` / BSDD | m | RECT/TRAPEZOID |

**Flow:** Geometry（`geometry/engine.ts:76-196` がスナップショットを計算）→ 3D
（`visualization/snapshot3d.ts`）→ Analysis（grillage, 結果は NOT_GRANTED）→ Design
（checks 全 NOT_AUTHORIZED）→ Replay（`replay/replay.ts:56-155`）→ Output。

**正本文書:** BSDD（`bridge-superstructure-design-document`）+ CBDM
（`common-bridge-data-model`）。設計値は `GovernedQuantity {value, units,
adoptionStatus, sourceLocator}` + `designStatus: NOT_AUTHORIZED`。

**CURRENT GAP（①との結合）:** WF-01 alignment-binding は `PLANNED`（Step 4-E）。
デモ用線形は `SuperstructurePipelinePanel.tsx:30-37` のハードコード直線。
`CommonModelGeometryInputAdapter` は ID + resolution state のみ返し、数値幾何
（spanLengths/bridgeLength/girderOffsets）は**渡していない**
（`geometry/geometryInputAdapter.ts:132-161`）。

**CURRENT GAP（③への反力）:** 支点反力は NOT_AUTHORIZED。`BSDD.analysisBindings=[]`
（`generateBsdd.ts:461`）。③へ渡す reactionCases は現状、サンプル入力のみ。

## 4. ③下部工

| データ | 型 / 位置 | 単位 | 備考 |
|--------|-----------|------|------|
| 橋脚 | `PierData` / `substructure/model.ts:96-109` | m | single_column_rect / wall / portal_frame |
| 橋台 | `AbutmentData` / `model.ts:118-132` | m | inverted_t / cantilever_frame |
| 基礎 | `PileGroup` / `model.ts:87-94` | m / 本 | bored_pile / steel_pipe |
| 支持配置 | `SupportPlacement` / `model.ts:24-33` | m / rad | station / offset / skewRad |
| 反力 | `SupportReactions` / `design/designTypes.ts:24-30` | kN | 入力データとしてのみ保持 |
| 計算 | `CalculationAdapterInput/Result` / `design/calculationAdapter.ts:59-109` | m / kN / deg | schemaVersion 0.1.0 |

**Flow:** Pier モデル → `mapSupportToAdapterInput`（`design/adapterMapper.ts:100-155`）
→ `calculateTest`（`design/testCalculationEngine.ts:130-208`, **TEST/MOCK**）→
`AdapterResultPanel` → Save/Load（`adapterPersistence.ts`, `substructure-project.json`）。

**正本文書:** `schemas/substructure/{substructure-project, support-interface,
pier, abutment, foundation}.json`（v0.1.0）。**契約層（v0.1 contract family）には未統合**。

**CURRENT GAP（②→③）:** support-interface.json は手動アップロード。
BFAD / frame-analysis-result-resource は一切参照していない（grep 0 hit）。

**CURRENT GAP（①→③の実座標）:** `SupportPlacementEngine`（`SupportPlacementEngine.ts:87-147`）
は LINER `Coordinate3dInput` を消費できるが、**実行時 host には未配線**。
host は `buildHostCoordinates`（`SubstructurePlanningHost.tsx:64-80`）で
x=station/y=offset/z=zOverride の直線プレースホルダを使用。

## 5. 契約層（共通）の実態

| 契約 | documentKind | 内容 | 状態 |
|------|--------------|------|------|
| common-bridge-data-model | `common-bridge-data-model` | metadata/alignments/bridgeGeometry/structuralModel/materials/sections/loads/analysisReference/design/report/drawing/traceability/resolutionRegistry | 実装・frozen(P5) |
| road-design-document | `road-design` | alignments/stationing/profiles/crossSections/bridges + capability | 実装 |
| bridge-superstructure-design | `bridge-superstructure-design` | bridge/materialDefinitions/loadCases/analysisBindings/structuralDesignModel | 実装 |
| bridge-frame-analysis | `bridge-frame-analysis` | structuralModel/loadDefinitions/analysisSettings/transferBindings | 実装（skeleton） |
| frame-analysis-result-resource | — | 求解結果 resource（supportReaction 等） | 実装 |
| engineering-project | `engineering-project` | roadDesignRef/frameAnalysisRefs/transferRecordRefs の参照 manifest | 実装（薄い） |
| road-to-frame-transfer-package | `road-to-frame-transfer-package` | road の選択+幾何を frame へ | 実装・**producer なし** |

**CBDM value-state（6状態）:** CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT /
HOLD_INSUFFICIENT_SOURCE / NOT_APPLICABLE / NOT_AVAILABLE（`runtime/schemas/
commonBridgeDataModel.ts:122-138`）。authority 4値: PLACEHOLDER /
USER_PROVIDED_UNVERIFIED / SOURCE_TRACED / ADOPTED。

**CBDM に無いもの:** superstructure セクション（BSDD が別文書）、substructure セクション
（lab schema のみ）、Model3D セクション（runtime のみ）。→ BridgeProject の拡張対象。

## 6. データフロー上の主な断絶

1. **①→②:** 実線形（station→XYZ/azimuth/curvature/grade/crossfall）は LINER 由来だが、
   ②はハードコード直線で代用。CBDM の alignment 値は `"plane grid"`（実幾何なし）。
2. **②→③:** 支点反力が未認証（NOT_AUTHORIZED）で、③は反力を入力データとしてしか持てない。
3. **①→③:** 実座標配置エンジンが host に未配線。station/skew のみ引継ぎ、形状はサンプル既定値。
4. **契約層↔③:** 下部工は契約層 family 外（schemas/substructure/）。BFAD/result を未参照。
5. **road-to-frame-transfer-package:** producer 不在（契約のみ）。実経路は headless frame project。
6. **Model3D:** 契約外。3D payload（BridgeGeometry3dPayload）は RESEARCH 側にのみ存在。
