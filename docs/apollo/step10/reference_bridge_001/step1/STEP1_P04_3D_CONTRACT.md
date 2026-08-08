# STEP 1-P04 — 3D_CONTRACT（Phase 6-3）

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Phase 6-3 実装対象）
> **正本:** `docs/apollo/3d-stl/01_visualization_contract_freeze.md`（既存 3D 契約 freeze）・
> `frontend/src/viewer/**`・`frontend/src/apollo/visualization/**`・`frontend/src/substructure/**`・
> Phase 6-1 GeometrySnapshot

## 1. 方針（既存契約との関係）

- 既存 freeze: **ProjectModel が SoR、`ApolloVisualizationModel` は表示専用派生モデル**（表示のみ・モデル非保存）。
- Phase 6-3 はこれを **GeometrySnapshot 由来へ移行**（OWN-008 Single Source of Bridge Geometry）。
  - 解析/設計側で使う geometry（主桁/横桁/横構/床版/支承配置）は snapshot を source とする。
  - 表示専用の補完（マーカー・視認用補助・camera・visibility・color）は表示層のみ。
- 二重 geometry 防止: 3D/図面/数量が独自の主桁/支承配置を持たない。

## 2. Snapshot → 3D モデル変換（3D Connector, CN-07）

```
GeometrySnapshot
  ├─ girderLines        → 主桁 solid（I 断面: top flange + web + bottom flange）
  ├─ crossGirderRefs     → 横桁 solid
  ├─ memberPlacementRefs → 横構（sway/lateral bracing）
  ├─ deckReferences      → 床版 solid（幅×厚×境界）
  ├─ bearingPoints       → 支承 block
  └─ supportLines        → 下部工接続境界（pier/abutment 配置起点）
        ▼
ApolloVisualizationModel（snapshot 由来の solid parameters）
        ▼
Three.js (frontend/src/viewer) / R3F (frontend/src/substructure)
```

## 3. 描画契約（Three.js / R3F）

| 項目 | 契約 | 実装 |
|------|------|------|
| 座標 | model-space Z-up → 表示 Y-up（3D Connector のみ swap） | `viewer/threeUtils.ts` / `substructure/viewer3d/threeFactory.ts` |
| 部材 ID | `userData { type, id, designEntityId/kind }`（selection/picking 用） | `ApolloVisualizationRenderer.ts` |
| selection | raycast → `onSelectionChange({type,id})` | `ThreeViewport.tsx` |
| camera | presets iso/xy/yz/xz + fit | `threeUtils.ts` |
| visibility | グループ毎 toggle（girders/crossBeams/bracing/deck/bearings 等） | `Viewer3D.tsx` |
| 上部工/下部工境界 | substructure は snapshot supports を消費（別 R3F ビューア） | `substructure/` |
| 表示のみ | camera/visibility/color はモデルに非保存 | 既存 freeze 踏襲 |

## 4. STL / DXF export 契約（Export Connector, CN-11）

- STL: `exportApolloBinaryStl`（JSCAD、mm、binary）+ `.apollo.json` manifest（既存）。
  Phase 6-3 は solid を snapshot 由来へ切替（`includedGroups` は既存）。
- DXF: `liner/dxf` + `renderDrawingDxf`。mm 出力。snapshot 由来の寸法線。
- 単位変換（m→mm）は Export Connector の単一ポリシー（DUP-016/017 解消）。

## 5. 下部工接続境界（CN-12）

- `SupportPlacementEngine`（substructure）が snapshot の supportLines を消費。
- 現行は LINER `pointAtStationOffset` 直接接続 → Phase 6-3 で snapshot support 経由へ統一（RC-003 解消）。
- 下部工は参考値・未検証（別ラボ）のまま、境界のみ接続。

## 6. 既存実装との関係（変更を最小化）

- `ApolloVisualizationModel` / `ApolloSolidGeometryParameter` / `Viewer3D` / `ThreeViewport` は
  **表示契約として維持**（破壊しない）。
- 追加するのは「snapshot → solid parameters」の adapter（`visualization/snapshot3d.ts`）。
- BSDD 経路（`bridgeStructureSolids.ts`）は Phase 6-2 後に snapshot 経路へ一本化（Phase 6-4/7 で判断）。

## 7. テスト

- unit: snapshot→solid 変換（部材 ID・localFrame・寸法）
- integration: snapshot → ApolloVisualizationModel → 既存 renderer が受理
- parity: RB-001 主桁/横桁/床版/支承の寸法・配置が Golden（G-GEO-0017/0018 等）と一致
- STL: 既存 STL 検証（triangle 有限値・bbox・digest）回帰維持
