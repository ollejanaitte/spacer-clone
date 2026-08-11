================================================================================
統合設計 Phase 3-A  3-00 既存地形資産監査（KEEP / ADAPT / REWRITE / DEFER）
================================================================================
監査日: 2026-08-11

--------------------------------------------------------------------------------
1. 監査対象と方針
--------------------------------------------------------------------------------
新統合システム（/app）のTerrain Module（Phase 1 Module Core上）へ接続するため、
既存の地形・3D・Viewer・座標系・CIM・現況関連資産を監査。

判定基準:
- KEEP   : 原則そのまま再利用可能
- ADAPT  : 有効だが新Terrain Module / Project Data Coreへ合わせた改修が必要
- REWRITE: 現構造では新システムへ持ち込むべきでなく新責任境界で再実装すべき
- DEFER  : Phase 3-Aでは扱わずPhase 3-02以降へ送る

注意:
- 既存Terrain資産を丸ごとコピーしない
- current factとhistorical/proposalを混同しない
- 「型だけ存在」を「実装済み」と誤判定しない
- 既存Viewerの表示用途とTerrain正本責任を混同しない

--------------------------------------------------------------------------------
2. 監査一覧
--------------------------------------------------------------------------------
| Asset | Path | Current Fact | 判定 | 理由 | 次Step |
|------|------|------|------|------|--------|
| 山岳Terrain表示サンプル | frontend/src/liner/samples/mountain-viaduct-500/terrain.ts | 実装済み（DISPLAY_LAYER専用heightfield・deterministic seed・terrainElevation関数） | ADAPT | 表示用heightfieldとして有効。Terrain正本のelevation関数として参考・流用可だが、表示専用の位置づけをTerrain Module正本と分離する必要がある。 | 3-02以降（elevation参照） |
| Domain→Three座標変換 | frontend/src/liner/samples/mountain-viaduct-500/threeCoords.ts | 実装済み（domainToThree: x→x, y→z, z→-y・domainPointsToThree・terrainPositionsToThree） | ADAPT | Phase 2 Road CIMとTerrainを同一Viewerへ重ねる座標契約として利用価値が高い。Coordinate/Unit/Origin責任境界Freezeの参考。 | 3-A（座標Freezeで流用） |
| Viewer座標変換 | frontend/src/viewer/coordinateTransform.ts | 実装済み（SpacerAxisSwap: model(x,y,z)→viewer(x,z,y)・表示用・JSON非変更） | ADAPT | 表示ポリシーとして有効。Viewer変換は表示責任・Terrain正本を書き換えないという分離をFreeze。 | 3-A（Freezeで参照） |
| Three.js Viewer | frontend/src/viewer/ | 実装済み（Viewer3D/ThreeViewport/threeUtils/SceneBuilder・旧システム表示用） | DEFER | 大規模Terrain Viewer本体はPhase 3-02以降。Phase 3-Aでは表示責任と正本責任の分離のみ確定。 | 3-02以降 |
| bridge viewer | frontend/src/bridge/viewer/BridgeThreeViewer.tsx | 実装済み | DEFER | Bridge関連はPhase 4以降。 | 4以降 |
| backend地形/TIN/DEM | backend/（terrain/tin/dem専用なし） | 実体なし | DEFER | 地形Import/生成はPhase 3-02以降。 | 3-02以降 |
| Road CIM geometry | frontend/src/next/modules/road/roadCimGeometry.ts | 実装済み | KEEP | Terrainと同一Project座標系で重ねる相手。責任境界はPhase 2で確定済み。 | 3-A（整合） |
| Phase 1 Module Core | frontend/src/next/modules/ | 実装済み | KEEP | Terrain ModuleはこのContract上へ接続。 | 3-A |
| Road Module Adapter | frontend/src/next/modules/roadModuleAdapter.ts | 実装済み | ADAPT | Terrain Module Adapterのパターンとして流用（read/write・直接変更禁止）。 | 3-A |
| Existing Conditions | 新システム側に未確立 | 実体なし | DEFER | 現況道路/河川/鉄道/既設橋/地下埋設物はPhase 3-Aで本体を作らない。責任分離のみFreeze。 | 3-02以降 |
| Terrain正本データ構造 | 新システム側に未確立 | 実体なし | REWRITE | Terrain Module Contractとして新責任境界で定義（project.jsonへの大容量埋め込み禁止・大容量格納境界確保）。 | 3-A |

--------------------------------------------------------------------------------
3. KEEP
--------------------------------------------------------------------------------
- Phase 1 Module Core一式
- Road CIM geometry（整合相手）
- Project Data Core / Persistence / Auto Save / Package

--------------------------------------------------------------------------------
4. ADAPT
--------------------------------------------------------------------------------
- 山岳Terrain表示サンプル（elevation関数参考）
- Domain→Three座標変換（threeCoords）
- Viewer座標変換（SpacerAxisSwap・表示用）
- Road Module Adapterパターン

--------------------------------------------------------------------------------
5. REWRITE
--------------------------------------------------------------------------------
- Terrain正本データ構造（新責任境界で定義・大容量格納境界を確保）

--------------------------------------------------------------------------------
6. DEFER
--------------------------------------------------------------------------------
- 地形Import（XYZ/CSV/LandXML/DEM/GeoTIFF/point cloud）: Phase 3-02
- TIN / Terrain Surface / triangulation: Phase 3-02以降
- Terrain 3D Viewer / LOD / tile streaming: Phase 3-02以降
- Existing Conditions本体（現況道路/河川/鉄道/既設橋/地下埋設物）: Phase 3-02以降
- Road + Terrain統合 / 切盛: Phase 3-02以降
- Bridge Layout / 下部工 / 上部工 / FEM / 統合3D: Phase 4以降

--------------------------------------------------------------------------------
7. current fact vs target proposal
--------------------------------------------------------------------------------
【現状（current fact）】
- 山岳Terrainは表示専用heightfield（road計算へfeedしない）
- Viewer座標変換は表示用・JSON非変更
- Terrain正本・Existing Conditionsは新システムに未確立
- backendに地形専用資産なし

【目標（target）】
- Terrain Module = 地面・地表面の正本（Phase 1 Module Core上）
- Existing Conditions = 地面以外の現況構造物（別責任）
- Coordinate/Unit/OriginをFreezeしRoad CIMと同一座標系で重ねる
- Viewer変換は表示責任・正本を書き換えない
- 大容量Terrainはproject.jsonへ埋め込まず大容量格納境界へ

--------------------------------------------------------------------------------
8. 監査の裏取り（実コード・tests）
--------------------------------------------------------------------------------
- mountain-viaduct-500/terrain.ts 実在・MOUNTAIN_TERRAIN_SETTINGS/DEEP_VALLEY等実在
- threeCoords.ts 実在・domainToThree実在（テスト: threeCoords.test.ts）
- coordinateTransform.ts 実在・SpacerAxisSwap実在（テスト: coordinateTransform.test.ts）
- viewer/ 実在（Viewer3D/ThreeViewport等）
- backend地形専用: なし（rule_engine/alignmentは道路側）
- Phase 2 Road CIM: frontend/src/next/modules/road/roadCimGeometry.ts 実在
================================================================================
