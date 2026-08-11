================================================================================
統合設計 Phase 3-A  3-00 監査＋3-01 Terrain Module Contract（完了記録）
================================================================================
既存地形資産を監査し、Terrain ModuleをPhase 1 Module Coreへ正式接続した記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 1c555f69168af96fa1b79dd13a4d3fb12c45ce50（Phase 2 final main）
- R1-01〜R1-05 / Phase 1 / Phase 2: COMPLETE / R1-04.5（Luna）: GO
- branch     : feature/phase3-a-terrain-audit 他 Step別branch

--------------------------------------------------------------------------------
2. 監査結果（KEEP / ADAPT / REWRITE / DEFER）
--------------------------------------------------------------------------------
- KEEP   : Phase 1 Module Core / Road CIM geometry / R1基盤
- ADAPT  : 山岳Terrain表示サンプル（elevation関数）/ threeCoords座標変換 /
           Viewer座標変換（SpacerAxisSwap・表示用）/ Road Adapterパターン
- REWRITE: Terrain正本データ構造（新責任境界で定義・大容量格納境界確保）
- DEFER  : Import（XYZ/CSV/LandXML/DEM/GeoTIFF/point cloud）/ TIN / Surface /
           3D Viewer / LOD / Existing Conditions本体 → Phase 3-02以降
- 記録: docs/rebuild/phase3/R3-00_terrain_asset_audit.md

--------------------------------------------------------------------------------
3. Terrain / Existing Conditions 責任分離
--------------------------------------------------------------------------------
- Terrain Module = 地面・地表面の正本（source/points/elevation/TIN/surface/coordinate context/metadata/validation）
- Existing Conditions = 地面以外の現況構造物（現況道路/河川/鉄道/既設橋/建物/防潮堤/池/地下埋設物）
- Phase 3-AではExisting Conditions本体を作らず、責任分離のみFreeze
- 記録: docs/rebuild/phase3/R3-00_terrain_existing_split.md

--------------------------------------------------------------------------------
4. Coordinate / Unit / Origin 責任境界
--------------------------------------------------------------------------------
- domain XYZ規約: X=道路軸方向 / Y=横断方向 / Z=標高（Phase 2 Road CIMと同一）
- Three.js変換（表示責任）: x→x, y→z, z→-y（threeCoords踏襲）
- Project Origin / Local Origin 分離（大座標をThree.jsへ直接投入しない）
- unit: metric
- Viewer変換は表示責任・Terrain正本を書き換えない
- 記録: docs/rebuild/phase3/R3-00_coordinate_origin_freeze.md

--------------------------------------------------------------------------------
5. Terrain Module Contract（Phase 3-01）
--------------------------------------------------------------------------------
- terrainModule.ts: Terrain正本最小構造（terrainId/schemaVersion/source/
  coordinateContext/bounds/surfaceReference/assetReferences）+ validator
  （metric/axis規約検証）
- terrainModuleAdapter.ts: read/writeTerrainDocument（Module Core経由・直接変更禁止・invalid reject）
- TerrainModuleShellPage: status/metadata確認 + source name保存
- NextApp: terrain→TerrainModuleShellPage

--------------------------------------------------------------------------------
6. 最小縦断（実fs）
--------------------------------------------------------------------------------
Terrain metadata保存→Auto Save→完全終了→再起動→復元→.spacerproj Export→Import→
Terrain metadata復元 ✅
invalid terrain doc非保存・既存Project非破壊

--------------------------------------------------------------------------------
7. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- terrain module tests: 6/6 PASS
- terrainPersistence: 2/2 PASS
- src/next全体: 216/216 PASS
- electron tests: 26/26 PASS
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・変更を残していない
  （証跡: docs/rebuild/evidence/phase3a-home-screen.png）
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
8. GitHub反映
--------------------------------------------------------------------------------
- PR #864 Step A1/A2（監査+判定）→ merge
- PR #865 Step A3/A4（責任分離+座標Freeze）→ merge
- PR #866 Step A5（Terrain Module Contract）→ merge
- PR #867 Step A6（最小縦断）→ merge
- PR #868 Step A7（記録・Final Gate）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
9. 残課題（Phase 3-02以降）
--------------------------------------------------------------------------------
- 地形Import（XYZ/CSV/LandXML/DEM/GeoTIFF/point cloud）
- TIN / Terrain Surface / triangulation
- Terrain 3D Viewer / LOD / tile streaming
- Existing Conditions本体
- Road + Terrain統合 / 切盛
- Bridge Layout / 下部工 / 上部工 / FEM / 統合3D / 成果品

--------------------------------------------------------------------------------
10. verdict
--------------------------------------------------------------------------------
統合設計 Phase 3-A: COMPLETE
Phase 3-02（地形データImport）には進まない。
