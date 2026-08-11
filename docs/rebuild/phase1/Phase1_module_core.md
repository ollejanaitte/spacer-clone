================================================================================
Phase 1  Module Core / 設計モジュール共通接続基盤（完了記録）
================================================================================
道路・地形・橋梁配置・下部工・上部工・FEM・CIM・成果品の8領域を、
今後すべて同じ作法でProject Data Coreへ接続できる共通Module Coreを確立した記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 26cdc12ea3dd5ffb84ff7cf0d2999e1a2599723d（R1-05 final main）
- R1-01〜R1-05: COMPLETE / R1-04.5（Luna Vision委任）: GO
- branch     : feature/phase1-module-core 他 Step別branch

--------------------------------------------------------------------------------
2. Module Core全体構成
--------------------------------------------------------------------------------
frontend/src/next/modules/
- contract.ts    : ModuleDefinition / ModuleStatus(5) / ModuleState / ModuleDataRecord
- registry.ts    : 8Module定義の共通管理（metadata/dependencies/versions）
- state.ts       : Module State管理（dirty/lastModified/lastValidated/validationErrors）
- adapter.ts     : Module↔Project Data Core接続境界（Project JSON直接変更禁止）
- validation.ts  : Module validator / Project validation
- moduleService.ts: Module変更→validate→Data Core→auto-save縦断
- dummyModule.ts : Dummy Module（Phase 1-07縦断用）

--------------------------------------------------------------------------------
3. Phase 1-01〜1-07結果
--------------------------------------------------------------------------------
Phase 1-01 Module Contract: ModuleDefinition/ModuleStatus/State/DataRecord型 + runtime guard
Phase 1-02 Module Registry: 8Module定義を共通管理（ハードコード乱立解消）
Phase 1-03 Module State/Status: updateModuleState/markModuleDirty/Validated/Completed/Reset
Phase 1-04 Data Core Adapter: read/writeModule（Manager経由・直接変更禁止・auto-save連携）
Phase 1-05 Validation/Auto Save: updateModuleData縦断・NG時正本書込拒否
Phase 1-06 Projectトップ/Module Shell: 8Module表示+status・Shell+placeholder・routing
Phase 1-07 Dummy縦断: Dummy値変更→validate→Data Core→auto-save→再起動復元→export/import復元

--------------------------------------------------------------------------------
4. 対象8Module
--------------------------------------------------------------------------------
road / terrain / bridgeLayout / substructure / superstructure / analysis / cim / deliverables
各Module本体の計算・3D・設計処理はPhase 2以降（Phase 1では実装しない）。

--------------------------------------------------------------------------------
5. Module Contract / Registry / State
--------------------------------------------------------------------------------
- ModuleDefinition: moduleId/type/displayName/moduleVersion/dataVersion/status/input/output/validation/dependencies
- Registry: 8Moduleを中央管理（getModuleDefinition/getModuleIds/createInitialModules）
- State: notStarted/working/invalid/needsUpdate/completed + dirty/lastModified/lastValidated/validationErrors
- 過剰な抽象化なし・各設計ツールがProject JSONを直接変更しない

--------------------------------------------------------------------------------
6. Adapter / Validation / Auto Save連携
--------------------------------------------------------------------------------
- Adapter: Module↔Project Data Core（Project Data Core唯一正本・R1-02 schema尊重）
- Validation: Module変更→Module validation→Data Core更新→Project validation→R1-04 Auto Save
- NG時: 壊れたModuleを正本保存しない・validation errorを黙殺しない
- R1-04 Persistenceは作り直さず既存基盤へ接続

--------------------------------------------------------------------------------
7. Dummy Module縦断（Phase 1-07）
--------------------------------------------------------------------------------
Projectトップ → Dummy Module開く → Dummy値変更 → Status更新 → Validation →
Project Data Core更新 → Auto Save → アプリ完全終了 → 再起動 → Dummyデータ復元 →
.spacerproj Export → Import → Moduleデータ復元 を実fsテストで確認

--------------------------------------------------------------------------------
8. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- modules tests: 26/26 PASS
- src/next全体: 153/153 PASS（Dummy縦断含む）
- electron tests: 26/26 PASS
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・変更を残していない（証跡:
  docs/rebuild/evidence/phase1-home-screen.png）
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
9. GitHub反映
--------------------------------------------------------------------------------
- PR #839 Phase 1-01 → merge
- PR #840 Phase 1-02 → merge
- PR #841 Phase 1-03 → merge
- PR #842 Phase 1-04 → merge
- PR #843 Phase 1-05 → merge
- PR #844 Phase 1-06 → merge
- PR #845 Phase 1-07（記録）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
10. 残課題（Phase 2以降）
--------------------------------------------------------------------------------
- 道路線形計算本体 / 道路3D/CIM
- 地形生成本体 / 現況構造物
- 橋梁配置計算 / 下部工 / 上部工 / FEM解析 / CIM統合3D / 成果品生成
- Phase 1では対象外の設計機能本体

--------------------------------------------------------------------------------
11. verdict
--------------------------------------------------------------------------------
Phase 1: COMPLETE
Phase 2（道路設計）以降には進まない。
