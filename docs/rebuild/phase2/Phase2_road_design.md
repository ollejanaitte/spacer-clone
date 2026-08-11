================================================================================
Phase 2  道路設計完遂（完了記録）
================================================================================
既存LINER有効資産を新Road Moduleへ統合し、平面線形から道路CIMまで
一気通貫で成立させた記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 50f5ad596ee07afcdef6552625f57227dc77aa0b（Phase 2-A final main）
- R1-01〜R1-05 / Phase 1 / Phase 2-A: COMPLETE / R1-04.5（Luna）: GO
- 方針: 既存LINER coreの純粋幾何ロジックをKEEP/ADAPT・不要再実装

--------------------------------------------------------------------------------
2. Phase 2-02〜2-12結果
--------------------------------------------------------------------------------
2-02 平面線形Core: RoadHorizontal（Straight/Arc/Clothoid/Composite + C0/C1 + validation）
2-03 測点・座標: RoadStationing（interval/explicit/equation・XYZ/azimuth/curvature）
2-04 縦断線形: RoadVertical（Grade/Parabolic・3D centerline）
2-05 横断構成: RoadCrossSection（Lane/Shoulder/Sidewalk/Median/Edge/Custom・CrossSlope）
2-06 幅員変化: RoadWidth（幅員変化点/拡幅/片勾配変化・LINER符号規約）
2-07 Intermediate/Validation: buildRoadIntermediate + RoadDesignDocument完全validation
2-08 新Road UI: SVG Plan/Profile/CrossSectionプレビュー + Validation + 保存状態
2-09 道路3D: buildRoadMesh（smooth road surface mesh・XYZ+normal）
2-10 CIM/Pavement: buildRoadCimGeometry（metadata/surface/pavementEnvelope）
2-11 Persistence: road inputs保存→restart復元→.spacerproj縦断
2-12 Reference E2E: 山岳道路sample一本通し ✅

--------------------------------------------------------------------------------
3. RoadDesignDocument / geometry architecture
--------------------------------------------------------------------------------
- RoadDesignDocument: road領域正本（Phase 2-A Freeze維持・完全schema validation接続）
- Module Data Core配下の{state,data,validation}にroadInput（label/horizontal/vertical/crossSections）を格納
- geometry: 既存LINER coreをKEEP/ADAPT（horizontal/station/vertical/crossSection/width）

--------------------------------------------------------------------------------
4. Intermediate Result / validation
--------------------------------------------------------------------------------
- buildRoadIntermediate: 入力値とderived geometryを分離
- sampled point: physicalDistance/displayedStation/XYZ/azimuth/curvature/grade/幅員/横断勾配
- invalid input拒否・error details・Module Status連携

--------------------------------------------------------------------------------
5. Road UI / Road 3D / Road CIM / Pavement
--------------------------------------------------------------------------------
- Road UI: SVGプレビュー（Plan/Profile/CrossSection）+ Intermediate Result + Validation + 保存状態
- Road 3D: smooth road surface mesh（3D centerline+横断+幅員+縦断+横断勾配）
- Road CIM: alignment/station/section/profile metadata + coordinate context + unit + version
- Pavement: topSurface/bottomSurface/thickness envelope

--------------------------------------------------------------------------------
6. Reference Road sample / 数値比較
--------------------------------------------------------------------------------
- 山岳道路Reference: Straight+Clothoid+Arc+Composite / Grade+Parabolic / 横断 / 幅員変化 / 片勾配変化
- C0/C1連続性をLINER evaluatorで保証した連続線形
- LINER符号規約（cross slope: 右down正）を踏襲し数値整合

--------------------------------------------------------------------------------
7. Persistence / Auto Save / .spacerproj
--------------------------------------------------------------------------------
- Road inputs（label/horizontal/vertical/crossSections）をAuto Save
- 再起動復元・Intermediate/CIM/3D再現・export/import復元 を実fsで確認
- invalid input非保存・既存Project非破壊

--------------------------------------------------------------------------------
8. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- road tests: 40/40 PASS
- src/next全体: 208/208 PASS
- electron tests: 26/26 PASS
- LINER core regression: 450/450 PASS（既存geometry完全維持）
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・変更を残していない
  （証跡: docs/rebuild/evidence/phase2-home-screen.png）
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
9. GitHub反映
--------------------------------------------------------------------------------
- PR #852 Phase 2-02 → merge
- PR #853 Phase 2-03 → merge
- PR #854 Phase 2-04 → merge
- PR #855 Phase 2-05 → merge
- PR #856 Phase 2-06 → merge
- PR #857 Phase 2-07 → merge
- PR #858 Phase 2-08 → merge
- PR #859 Phase 2-09 → merge
- PR #860 Phase 2-10 → merge
- PR #861 Phase 2-11 → merge
- PR #862 Phase 2-12（記録）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
10. 残課題（Phase 3以降）
--------------------------------------------------------------------------------
- Terrain / 現況・切盛（Phase 3）
- Bridge Layout / 下部工 / 上部工 / FEM（Phase 4以降）
- 統合3D Viewer本体（Phase 8相当）
- 成果品（DXF/Drawing統合）
- 道路構造令自動設計の拡張

--------------------------------------------------------------------------------
11. verdict
--------------------------------------------------------------------------------
Phase 2: COMPLETE
Phase 3（地形・現況）には進まない。
