# Phase 6-01 Step E: Phase 6-02 Work Packages（凍結案）

## 1. 目的

Phase 6-02を内部Work Package（WP-A..K）に分割し、files/dependencies/order/acceptance/tests/PR/rollback/evidence/既存資産再利用を確定する。

- baseline: `03bf60f270aaa435506be2e5962f8a2ea513ef6e`
- 日付: 2026-08-13

## 2. WP一覧・依存関係（凍結）

```
WP-A（SubstructureDocument/Schema/PDC） ← 最基盤
  └─ WP-B（Phase 4 Support Handoff Adapter）
       └─ WP-C（Phase 5 Bearing/Reaction Handoff Adapter） ← 6課題解決
            └─ WP-D（Placement/localFrame/bearingSeat）
                 ├─ WP-E（Abutment/Pier Geometry）
                 ├─ WP-F（Footing/Foundation/Pile）
                 └─ WP-G（Terrain/Existing）
                      └─ WP-H（Design framework/Calculation status）
                           └─ WP-I（Integrated 3D/UI） ← WP-E/F/G依存
WP-J（Persistence/restart/.spacerproj） ← WP-A/C/H依存
WP-K（Reference Bridge/Electron E2E/Completion Gate） ← 全WP後
```

## 3. 各WP詳細（凍結）

### WP-A: SubstructureDocument / Schema / PDC
- files: `frontend/src/next/modules/substructure/` 新規
  - `substructureTypes.ts`（Contract A・model.ts ADAPT）
  - `substructureValidation.ts`・`substructureModule.ts`・`substructureModuleAdapter.ts`
  - `substructureDocumentDomain.ts`（build/attach）
  - `schemas/substructure/*.json`（0.2.0刷新）
- dependencies: bridgeLayout/superstructure module adapter（read）
- acceptance: Contract（A）全field build可能・schema drift test
- tests: T6-CON/SCH/PAR
- PR: 1本
- 既存資産: model.ts（canonical型）・validation.ts

### WP-B: Phase 4 Support Handoff Adapter
- files: `substructurePhase4Adapter.ts`（supportHandoff→SubstructureDocument）
- dependencies: WP-A
- acceptance: field-level mapping（B）全項目・fail-closed
- tests: T6-ADP
- PR: 1本
- 既存資産: SupportPlacementEngine（参照）・linerHandoff（旧fallback維持）

### WP-C: Phase 5 Bearing/Reaction Handoff Adapter
- files: `substructurePhase5Adapter.ts`（bearingReaction→document・6課題解決）
- dependencies: **WP-A/WP-B**（BL照合のため）
- acceptance: bearingSeats/reactionCases受領・6課題（sign/axis/ID/enum/localFrame/elevation）解決・NOT_AUTHORIZED維持
- tests: T6-BRG/RXN/ELE/LOC
- PR: 1本
- 既存資産: superstructureInterface（parse）・superstructureEnvelope（参照）

### WP-D: Placement / localFrame / bearingSeat
- files: placement/localFrame組み立て・bearingSeat（BRG-ID）反映
- dependencies: WP-B/C
- acceptance: SupportPlacementEngine（LINER正本）＋実frame・bearing seat配置
- tests: T6-GEO-001/002・T6-LOC
- PR: 1本
- 既存資産: SupportPlacementEngine・geometryBase

### WP-E: Abutment / Pier Geometry
- files: abutment/pier solid生成（既存再利用）
- dependencies: WP-D
- acceptance: inverted_t/cantilever_frame・single/wall/portal形式solid
- tests: T6-GEO-003/004
- PR: 1本
- 既存資産: SubstructureSolidGenerator・PierSolidGenerator・AbutmentSolidGenerator（model.ts形状）

### WP-F: Footing / Foundation / Pile
- files: footing/foundation/pile solid＋配置
- dependencies: **WP-D**（配置・localFrame基盤。躯体solidはWP-Eで統合）
- acceptance: buildPileGrid/derivePileLayout利用・pile head/tip
- tests: T6-GEO-005/006
- PR: 1本
- 既存資産: FoundationSolidGenerator（buildPileGrid）・model.ts PileGroup

### WP-G: Terrain / Existing
- files: terrainElevation取得・embedment導出・existing参照
- dependencies: WP-F
- acceptance: ID/reference接続・missing/stale警告
- tests: T6-TER/EXT
- PR: 1本
- 既存資産: bridgeLayoutPlacement.lookupTerrainElevation/collectExistingNearRange

### WP-H: Design framework / Calculation status
- files: runDesign接続・quantity・design status
- dependencies: WP-G
- acceptance: quantity実計算・NOT_AUTHORIZED維持・DEFER資産誤実装なし
- tests: T6-DS
- PR: 1本
- 既存資産: designEngine・geometricQuantity・calculationAdapter・adapterMapper・testCalculationEngine・calculationOutput

### WP-I: Integrated 3D / UI
- files: `superstructure`→`SubstructureSceneBuilder`（下部工レイヤ）・`SubstructureModuleShellPage`・NextApp dispatch
- dependencies: **WP-E/F/G/H**（Design status表示のためWP-H追加）
- acceptance: 統合シーン（renderCoordinate）・ID規則・UI縦断・新route
- tests: T6-3D/UI
- PR: 2本（3D→UI）
- 既存資産: viewer3d・planning UI・integratedSceneBuilder

### WP-J: Persistence / restart / .spacerproj
- files: PDC auto-save対応・derived transient・旧JSON import adapter
- dependencies: **WP-A/B/C/D/E/F/G/H**（Support Handoff・placement・Geometry再生成経路のため）
- acceptance: 縦断完走（save→restart→restore→再生成→.spacerproj）
- tests: T6-PER
- PR: 1本
- 既存資産: next/persistence・planning/persistence（import参考）

### WP-K: Reference Bridge / Electron E2E / Completion Gate
- files: RB比較・E2E・Completion Gate UI
- dependencies: 全WP
- acceptance: T6-RB/ELE/E2E PASS・Completion Gate全項目
- tests: T6-RB/ELE/E2E/REG
- PR: 1本
- 既存資産: 既存fixtures・E2E infra

## 4. 実装順序・PR境界（凍結）

- WP-A → WP-B → WP-C → WP-D → WP-E → WP-F → WP-G → WP-H → WP-I → WP-J → WP-K
- 各WP: 1〜2PRでmain merge（Phase 6-02内）
- merge後: local main / origin / rebuild/integrated-system 同期

## 5. Rollback boundary（凍結）

- 各WPは新module追加（既存実行層はKEEP・旧route維持）→ 安全に切替可
- 新正本（SubstructureDocument）は旧SubstructureProjectとは独立（旧data非破壊）

## 6. Evidence（凍結）

- WP毎: tests PASSログ＋screenshot（docs/rebuild/phase6/evidence/）
- Final: Phase 6-02 Final Report（Phase 6-02完了時）
