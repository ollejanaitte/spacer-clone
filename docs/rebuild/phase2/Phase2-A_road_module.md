================================================================================
Phase 2-A  2-00〜2-01  監査＋Road Module接続（完了記録）
================================================================================
既存道路/LINER資産を監査し、RoadDesignDocumentをroad領域正本として
本物のRoad ModuleをProject Data Coreへ正式接続した記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 93b011876c1b973162d0f7a2364b76cbb2500057（Phase 1 final main）
- R1-01〜R1-05 / Phase 1: COMPLETE / R1-04.5（Luna）: GO
- branch     : feature/phase2-a-road-audit 他 Step別branch

--------------------------------------------------------------------------------
2. 監査結果（KEEP / ADAPT / REWRITE / DEFER）
--------------------------------------------------------------------------------
- KEEP   : Phase 1 Module Core一式・R1基盤（そのまま再利用）
- ADAPT  : RoadDesignDocument型 + validateRoadDesignDocument（road正本として利用）、
           旧LINER拡張validation（参考流用）
- REWRITE: なし（旧LINERを丸ごとコピーしない方針）
- DEFER  : 平面線形/測点/縦断/横断/拡幅/2D/3D/DXF/backend road_geometry/
           旧/pro/liner UI → Phase 2-02以降
- 記録: docs/rebuild/phase2/R2-00_road_liner_audit.md

--------------------------------------------------------------------------------
3. 責任境界Freeze
--------------------------------------------------------------------------------
- Road正本: RoadDesignDocument（Module Data Core配下road領域・{state,data,validation}形式）
- Project正本: Project Data Core唯一正本
- 接続: Road Module→Module Core/Adapter→Project Data Core→Persistence/Auto Save→Package
- 禁止: Road UI/LINER/geometryがProject JSON直接変更不可・旧/pro/liner復活禁止
- Road Module所有: RoadDesignDocument/設計入力/幾何/validation/state
- 非所有: FEM/上部工/下部工/3D Viewer/terrain/Bridge Layout/成果品
- 記録: docs/rebuild/phase2/R2-00_boundary_freeze.md

--------------------------------------------------------------------------------
4. Road Module正式接続（Phase 2-01）
--------------------------------------------------------------------------------
- roadModule.ts: RoadDesignDocument正本 + validation境界（空data=有効・不正doc拒否）
- roadModuleAdapter.ts: read/write RoadDesignDocument（Module Core経由・直接変更禁止）
- RoadModuleShellPage: Road status/metadata表示 + label変更→save
- registry road: moduleVersion 1.0.0へ更新
- NextApp: road→RoadModuleShellPage（Dummyを正式Road Moduleへ置換）

--------------------------------------------------------------------------------
5. 縦断検証（実fs）
--------------------------------------------------------------------------------
Projectトップ→[道路]→Road Module Shell→RoadDesignDocument読込→status表示→
label変更→Validation→Project Data Core更新→Auto Save→完全終了→再起動→復元→
.spacerproj Export→Import→Road Moduleデータ復元 ✅

--------------------------------------------------------------------------------
6. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- modules tests: 32/32 PASS（roadModule 3件含む）
- src/next全体: 159/159 PASS（road縦断含む）
- electron tests: 26/26 PASS
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・変更を残していない
  （証跡: docs/rebuild/evidence/phase2a-home-screen.png）
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
7. GitHub反映
--------------------------------------------------------------------------------
- PR #847 Step A1（監査）→ merge
- PR #848 Step A2（境界Freeze）→ merge
- PR #849 Step A3/A4（Road Module接続 + Validation/Auto Save/restore）→ merge
- PR #850 Step A5/A6（縦断・記録・Final Gate）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
8. 残課題（Phase 2-02以降）
--------------------------------------------------------------------------------
- 平面線形Core移植（Straight/Arc/Clothoid/Composite/Offset/測点）
- 縦断（Grade/Parabolic）/ 横断（CrossSlope/Width/Widening）/ 拡幅
- RoadDesignDocument完全schema validation（現行はlabel検証のみ）
- backend road_geometry連携
- 旧LINER計算本体のModule規格移植

--------------------------------------------------------------------------------
9. verdict
--------------------------------------------------------------------------------
Phase 2-A: COMPLETE
Phase 2-02（平面線形Core移植）には進まない。
