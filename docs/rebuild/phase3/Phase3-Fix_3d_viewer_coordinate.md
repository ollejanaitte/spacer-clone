================================================================================
統合設計 Phase 3-Fix  3D Viewer大型化＋共通座標変換＋表示修正
================================================================================
確定日: 2026-08-12

--------------------------------------------------------------------------------
1. 目的
--------------------------------------------------------------------------------
Phase 4（Bridge Layout / 橋梁配置）の前に、3D表示基盤を是正する。

- Terrain 3D Viewerを実用的な大きさへ拡大
- Reference Mountain表示で「Terrainが鉛直方向へ立って見える」座標変換不具合を修正
- Domain座標 → Three.js Render座標変換を共通の Render Coordinate Adapter に一本化
- Road / Terrain / Existing Conditions が同じ変換責任境界を使用
- camera / fit-to-bounds / resize追従を是正

--------------------------------------------------------------------------------
2. 不具合原因（root cause）
--------------------------------------------------------------------------------
原因: applyDomainToThreeTransform の二重適用。

- buildTerrainThreeScene は terrain mesh と wireframe で 1つの geometry を共有。
- TerrainViewer は transform を built.mesh と built.wireframe の両方へ適用しており、
  共有 geometry に対して domain→three 変換が2回実行されていた。
- 2回目の適用で three.y = -domain.y（横断方向）・ three.z = -elevation となり、
  地形が鉛直方向に立った壁のように描画される。

  1回目: (x, y, z)      -> (x, z, -y)
  2回目: (x', y', z')   -> (x, -y, -z)   ← Terrainが鉛直に立つ

また、統合シーン（buildIntegratedThreeScene）では terrain に変換を適用しておらず
（road / existing のみ変換）、terrain 単独と同じく鉛直姿勢になっていた。

--------------------------------------------------------------------------------
3. 修正内容
--------------------------------------------------------------------------------
A. 共通 Render Coordinate Adapter（唯一の正本）
   frontend/src/next/modules/renderCoordinate.ts
   - domainToThree:  three.x = domain.x / three.y = domain.z(elevation) / three.z = -domain.y
   - threeToDomain:  逆変換（round trip）
   - domainVerticesToThree: 連続(x,y,z)配列を一括変換（Local Origin対応）
   - 既存 threeCoords.ts / terrainCoordinate.ts は本Adapterへ委譲し、
     Terrain / Road / Existing / 統合scene / camera すべてで同一変換を使用。

B. 二重適用の解消
   - TerrainViewer: applyDomainToThreeTransform を1回だけ適用
   - buildIntegratedThreeScene: terrainにも変換を1回適用（wireframeはgeometry共有）

C. Viewer大型化（3D Viewer共通ホスト）
   - components/SceneViewer.tsx を新設し、renderer/camera/OrbitControls/
     resize(ResizeObserver+window)/dispose/fit-to-bounds を共通化。
   - TerrainViewer / IntegratedSceneViewer が同一ホストを利用。
   - 高さ clamp(480px, 62vh, 780px) のresponsive対応。固定pixel依存を回避。
   - camera aspect / renderer size は ResizeObserver でコンテナ追従。
   - grid helper は地形footprintに自動フィット。

D. 統合シーン表示（Terrain+Road+Existing）をUIに追加
   - IntegratedSceneViewer を新設。
   - Terrain Moduleページに「統合シーン（Terrain+Road+Existing）を3D表示」トグルを追加。
   - ページ全体を next-page-wide（max-width 1320px）化して大型Viewerを確保。

--------------------------------------------------------------------------------
4. 最終座標仕様（Phase 3-A Freeze踏襲）
--------------------------------------------------------------------------------
- domain XYZ: X=道路軸方向 / Y=横断方向 / Z=標高（metric）
- three.x = domain.x
- three.y = domain.z（標高, Y-up）
- three.z = -domain.y（横断, 右側が+のままになるよう反転）
- Project Origin で global→project、Local Origin で project→local（描画）分離
- 変換は表示責任。Terrain / Road / Existing の正本（CIM）を書き換えない。

--------------------------------------------------------------------------------
5. 検証
--------------------------------------------------------------------------------
- renderCoordinate.test.ts: known XYZ / elevation preservation / axis direction /
  round trip / Project・Local Origin shift / 入力非破壊
- terrainViewerBuilder.test.ts: 単一適用regression（mesh=wireframe共有geometry検証）
- integratedSceneBuilder.test.ts: terrain elevation が y-up 軸にあること / road標高と
  terrain標高帯の重なり / existing同座標系
- referenceMountainScene.test.ts: Reference Mountain統合sceneの幾何（水平地表面・
  road重なり・existing位置）
- terrainUi.test.tsx: 大型Viewer / 統合ViewerトグルのDOM検証
- src/next 全体: 289 PASS（+12）
- typecheck: PASS / build: PASS
- Electron画面（playwright chromium + swiftshader）でスクリーンショット取得、
  Luna（codex CLI GPT-5.6-luna, read-only）目視判定: 総合判定 PASS
  - Terrain水平・山/谷自然な向き・Road重なり正常・Existing同一座標系・
    UI崩れなし・Viewer大型化・camera fit正常

--------------------------------------------------------------------------------
6. 対象ファイル
--------------------------------------------------------------------------------
新規:
- frontend/src/next/modules/renderCoordinate.ts
- frontend/src/next/components/SceneViewer.tsx
- frontend/src/next/components/IntegratedSceneViewer.tsx
- frontend/src/next/modules/__tests__/renderCoordinate.test.ts
- frontend/src/next/modules/__tests__/referenceMountainScene.test.ts

変更:
- frontend/src/next/modules/terrain/terrainCoordinate.ts
- frontend/src/next/modules/terrain/terrainViewerBuilder.ts
- frontend/src/next/modules/integratedSceneBuilder.ts
- frontend/src/next/modules/existingViewerBuilder.ts
- frontend/src/liner/samples/mountain-viaduct-500/threeCoords.ts
- frontend/src/next/components/TerrainViewer.tsx
- frontend/src/next/pages/TerrainModuleShellPage.tsx
- frontend/src/next/styles.css
- frontend/src/next/modules/terrain/__tests__/terrainViewerBuilder.test.ts
- frontend/src/next/modules/__tests__/integratedSceneBuilder.test.ts
- frontend/src/next/__tests__/terrainUi.test.tsx

--------------------------------------------------------------------------------
7. 証跡（screenshot）
--------------------------------------------------------------------------------
- docs/rebuild/phase3/evidence/p3f-01-reference-mountain-terrain-viewer-large.png
- docs/rebuild/phase3/evidence/p3f-02-terrain-module-page-terrain-view.png
- docs/rebuild/phase3/evidence/p3f-03-integrated-terrain-road-existing.png
- docs/rebuild/phase3/evidence/p3f-04-terrain-module-page-integrated-view.png

--------------------------------------------------------------------------------
8. 残課題（Phase 4以降）
--------------------------------------------------------------------------------
- Bridge Layout / 下部工 / 上部工 / FEM / 統合3D Viewer完成版（Phase 4以降）
- 本格point cloud / DEM / GeoTIFF Import（後続）
================================================================================
