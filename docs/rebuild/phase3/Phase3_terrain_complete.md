================================================================================
統合設計 Phase 3  地形・現況 完遂（完了記録）
================================================================================
地形ImportからTerrain/TIN/Surface、3D Viewer、大規模地形/LOD、Existing Conditions、
Road+Terrain+Existing統合、CIM、Persistence、Reference Mountain E2Eまで
一気通貫で成立させた記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 3b038487b6f4be3a29666837238e03ea3dad7e65（Phase 3-A final main）
- R1-01〜R1-05 / Phase 1 / Phase 2 / Phase 3-A: COMPLETE / R1-04.5（Luna）: GO
- Phase 3-A引継ぎ: Terrain Module Contract・座標/Origin Freeze・責任分離

--------------------------------------------------------------------------------
2. Phase 3-02〜3-12結果
--------------------------------------------------------------------------------
3-02 地形Import: XYZ/CSVパース（NaN/Infinity/malformed/empty/size拒否・bounds）
3-03 座標/Unit/Origin: global→project→local変換・Three変換(x→x,y→z,z→-y)
3-04 Terrain Core: grid→TIN mesh・getGridElevation双線形補間・点群→surface
3-05 Terrain 3D Viewer: Three.js scene・OrbitControls・camera fit・Local Origin
3-06 大規模/LOD: tile分割・camera距離LOD・mesh削減
3-07 Existing Conditions Core: Contract（type/layer/geometry/metadata）+ metadata配下格納
3-08 現況3D: river/road/railway/bridge= tube・pipe/underground= cylinder
3-09 統合: Terrain+Road CIM+Existing 同一Project座標系・elevation整合
3-10 CIM: Terrain CIM + Existing CIM（共通参照境界）
3-11 Persistence: Terrain+Existing save→restart→.spacerproj完全復元
3-12 Reference Mountain E2E: 山・谷・河川・既設・道路統合→保存→復元→移送 ✅

--------------------------------------------------------------------------------
3. Terrain Import形式 / Coordinate / TIN / Surface / getElevation
--------------------------------------------------------------------------------
- Import: XYZ/CSV（tab/;/comma自動検出）・large pointsはasset参照で非埋込
- Coordinate: Project Origin/Local Origin・domain XYZ規約・metric
- TIN: grid 2三角形/cell・deterministic・依存なし
- Surface: 点群→binning→heightfield・getGridElevation双線形補間（TIN外null）

--------------------------------------------------------------------------------
4. Terrain Viewer / Large Terrain / LOD
--------------------------------------------------------------------------------
- Viewer: Three.js・OrbitControls・ambient/directional light・grid・wireframe切替
- Large Terrain: tile分割（連続bounds）・camera距離LOD 4段階・mesh削減
- Local Origin適用で大座標精度劣化を防止

--------------------------------------------------------------------------------
5. Existing Conditions / Underground / Road統合
--------------------------------------------------------------------------------
- Existing: 現況道路/河川/鉄道/既設橋/地下管路（entity/layer/visibility/metadata）
- Underground: pipe/underground = cylinder（diameter中心線）
- 統合: Road CIM参照（別正本を作らない）・Terrain+Existing+Road同一座標系

--------------------------------------------------------------------------------
6. Terrain / Existing CIM Geometry
--------------------------------------------------------------------------------
- Terrain CIM: coordinate/unit/origin/bounds/surfaceReference/source/version
- Existing CIM: entity/type/layer/geometry/metadata/coordinate/version
- 後続Bridge Layout / Integrated 3Dが内部実装を知らずに参照可能

--------------------------------------------------------------------------------
7. Persistence / Auto Save / .spacerproj / large asset
--------------------------------------------------------------------------------
- Terrain+Existing: Auto Save→再起動復元→.spacerproj Export/Import完全復元
- large asset: surfaceReference/assetReferences参照（project.json非埋込）
- invalid data非保存・既存非破壊

--------------------------------------------------------------------------------
8. Reference Mountain E2E
--------------------------------------------------------------------------------
山岳（2峰+谷）+ 河川 + 既設道路 + 鉄道 + 地下水管 + 計画道路（Clothoid/Arc）を
統合し、Terrain Surface/3D/tile/LOD/Road mesh/Existing 3D/CIMを生成。
保存→完全終了→再起動→完全復元→.spacerproj Export→Import→完全復元 ✅

--------------------------------------------------------------------------------
9. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- terrain tests: 33/33 PASS（import/coordinate/surface/tiles/viewer）
- existing tests: 8/8 + viewer 5/5 + cim 4/4 + integration 5/5 + persistence 2/2 + e2e 2/2
- src/next全体: 277/277 PASS
- electron tests: 26/26 PASS
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・変更を残していない
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
10. GitHub反映
--------------------------------------------------------------------------------
- PR #870 Phase 3-02 → merge
- PR #871 Phase 3-03 → merge
- PR #872 Phase 3-04 → merge
- PR #873 Phase 3-05 → merge
- PR #874 Phase 3-06 → merge
- PR #875 Phase 3-07 → merge
- PR #876 Phase 3-08 → merge
- PR #877 Phase 3-09 → merge
- PR #878 Phase 3-10 → merge
- PR #879 Phase 3-11 → merge
- PR #880 Phase 3-12 → merge
- PR #881 完成Gate → merge
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
11. 残課題（Phase 4以降）
--------------------------------------------------------------------------------
- Bridge Layout / 下部工 / 上部工 / FEM / 統合3D Viewer完成版（Phase 4以降）
- 本格切土・盛土設計 / 土量計算（Phase 4以降）
- 成果品（DXF/Drawing統合）
- 本格point cloud / DEM / GeoTIFF Import（後続）

--------------------------------------------------------------------------------
12. verdict
--------------------------------------------------------------------------------
統合設計 Phase 3: COMPLETE
Phase 4（Bridge Layout / 橋梁配置）には進まない。
