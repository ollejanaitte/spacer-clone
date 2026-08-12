# Phase 6-01 Step A: Phase 6 Master Design（凍結案）

## 1. 位置づけ

Phase 6（下部工）の全体骨格を確定する。
Phase 6-00監査のMigration Mapをtraceabilityの基準とし、
SubstructureDocumentを下部工唯一正本として、既存実行層（model/Geometry/3D/Planning/Design framework）を最大再利用する。

- baseline: `ab30a28bd36177c4f20c673bf2b426bf4280f639`（Phase 6-00 Final Report PR #941 merge後・GitHub確認）
- 日付: 2026-08-13
- 本設計書は設計専用。Phase 6-02（実装）への越境はしない。

## 2. Phase 6 目的・スコープ

### 2.1 Phase 6 = 下部工（Substructure）

正式設計順序: 道路 → 地形・現況 → 橋梁配置 → 上部工 → **下部工** → FEM → CIM → 成果品

- Phase 6の正本: **SubstructureDocument**（modules.substructure.data.substructureDocument）
- 入力正本: BridgeLayoutDocument（Support Handoff・共通Support配置情報）＋ SuperstructureDocument（Bearing/Reaction Handoff）
- 実行層: 既存下部工資産（model/Geometry/3D/Planning/Design framework・KEEP/ADAPT）

### 2.2 IN-SCOPE（Phase 6-02で実装）

- SubstructureDocument（正本）確立・validation・persistence
- Phase 4 Support Handoff Adapter（support配置）
- Phase 5 Bearing/Reaction Handoff Adapter（bearing/reaction受領・6課題解決）
- Schema Refresh（0.2.0一本化・旧0.1.0との整合）
- Geometry（Abutment/Pier/Footing/Foundation/Pile）
- Terrain/Existing接続（基礎高さ・根入れ・interference情報）
- Design/Calculation Scope（geometric quantity実計算・構造照査はHOLD）
- Persistence（PDC auto-save/restart/.spacerproj）
- Integrated 3D（Road+Terrain+Existing+BL+Superstructure+Substructure）
- UI/Workflow（既存Planning UIの新PDC接続）
- Reference Bridge比較・E2E・Completion Gate

### 2.3 OUT-OF-SCOPE（DEFER・Phase 6-02で実装しない）

- 本格構造照査（stability/member/foundation/pileの実数値化）
- 耐震照査・鉄筋設計
- 実計算engineの本実装（backend含む）
- 高度FEM
- 図面・計算書・数量・成果品
- 未認証Reaction（NOT_AUTHORIZED）からの正式設計PASS自動生成

## 3. 正本階層（traceability: Phase 6-00 Migration Map）

```
Project Data Core（最上位正本）
├─ modules.road / terrain / existing（KEEP・referenceのみ）
├─ modules.bridgeLayout
│    └─ BridgeLayoutDocument（唯一正本）
│         └─ Support Handoff（derived・共通Support配置情報）
├─ modules.superstructure
│    └─ SuperstructureDocument（唯一正本）
│         └─ Bearing / Reaction Handoff（derived・v1.0.0）
│              └─ toSupportInterfaceEntry（v0.1.0互換DTO）
└─ modules.substructure（Phase 6-01設計・6-02実装）
     └─ SubstructureDocument（下部工唯一正本）
          ↓
     Compatibility Adapter / Connector（新）
       ├─ Phase 4 Support Handoff Adapter
       └─ Phase 5 Bearing / Reaction Handoff Adapter
          ↓
     既存Substructure実行層（KEEP/ADAPT）
       ├─ model.ts（v0.2.0 → SubstructureDocumentへADAPT）
       ├─ SupportPlacementEngine（**LINER正本を参照するplacement engine**・計算実行層）
       ├─ geometryBase / SolidGenerator / PlanProjection（KEEP）
       ├─ viewer3d（KEEP・表示変換はrenderCoordinateへ）
       ├─ Planning UI（KEEP・Host入力のみADAPT）
       ├─ design framework（KEEP・構造照査DEFER）
       └─ persistence（ADAPT・download/upload→PDC）
```

### 3.1 正本境界（絶対原則）

- Projectが最上位正本
- BridgeLayoutDocument / SuperstructureDocument / SubstructureDocumentを**複製しない**（ID/reference）
- 旧SubstructureProjectを新正本として復活させない
- Connector / Adapter内に別正本を作らない
- Terrain / Existing正本を複製しない
- Road geometryを下部工側で再実装しない
- Viewer都合で正本を書き換えない

## 4. 入力（upstream）

| 入力 | 供給元 | 方針 |
|---|---|---|
| support配置 | Phase 4 Support Handoff（buildSupportHandoff） | 正式入口（supportId/type/station/skew/XYZ/azimuth/terrain） |
| bearing/reaction | Phase 5 SuperstructureHandoff（buildSuperstructureHandoff）＋support-interface DTO | Adapter変換（6課題解決） |
| 道路Alignment | Road Module（LINER正本） | 再実装しない |
| 地形 | Terrain Module | 参照のみ（基礎高さ・根入れ） |
| 現況 | Existing Conditions | 参照のみ（interference） |

## 5. 出力（downstream）

- 下部工3D（既存Viewer経由・統合シーンへ）
- Design/Quantity結果（runDesign framework・概算数量）
- Phase 6→成果品・FEM（後続Phase）

## 6. 詳細設計書索引（Step A〜F）

| 設計書 | 内容 | Step |
|---|---|---|
| Phase6-01A_substructure_document_contract | SubstructureDocument Contract | A |
| Phase6-01B_phase4_support_handoff_mapping | Phase 4 Adapter | B |
| Phase6-01B_phase5_superstructure_handoff_mapping | Phase 5 Adapter | B |
| Phase6-01B_handoff_six_issues_resolution | 6課題解決 | B |
| Phase6-01C_schema_refresh | Schema刷新 | C |
| Phase6-01C_geometry_specification | Geometry | C |
| Phase6-01C_terrain_existing_integration | Terrain/Existing | C |
| Phase6-01D_design_calculation_scope | Design/Calculation Scope | D |
| Phase6-01D_persistence_specification | Persistence | D |
| Phase6-01D_integrated_3d_ui_design | 3D/UI | D |
| Phase6-01E_reference_bridge_expected_data | Reference Bridge | E |
| Phase6-01E_test_specification | Test Spec | E |
| Phase6-01E_phase6-02_work_packages | WP | E |
| Phase6-01E_completion_gate | Completion Gate | E |
| Phase6-01F_design_freeze_gate | Freeze Gate | F |

## 7. Phase 6-02 Work Package 概要（詳細は Step E）

WP-A SubstructureDocument/Schema/PDC / WP-B Phase4 Adapter / WP-C Phase5 Adapter /
WP-D Placement/localFrame/bearingSeat / WP-E Abutment/Pier Geometry / WP-F Footing/Foundation/Pile /
WP-G Terrain/Existing / WP-H Design framework / WP-I Integrated 3D/UI / WP-J Persistence/restart/.spacerproj /
WP-K Reference Bridge/E2E/Completion Gate

## 8. Completion Gate 概要（詳細は Step E）

SubstructureDocument valid / Schema / Phase 4+5 Handoff / 6課題 / Adapter / placement / bearing seat /
Abutment / Pier / Footing / Foundation / Pile / Terrain / Existing / Geometry / 3D / Design status /
NOT_AUTHORIZED fail-closed / Persistence / Auto Save / restart restore / .spacerproj / Reference Bridge /
Electron / E2E / regression / typecheck / lint / build

## 9. 共通規約（Phase 6-01全体）

- 単位: m / rad（skew: counterclockwise-positive）/ kN / kNm
- 座標: domain = X道路軸 / Y横断 / Z標高。Three.js = renderCoordinate（x→x, y→z, z→-y）
- Project Origin / Local Origin分離・表示変換は正本を書き換えない
- 値status: CONFIRMED / DERIVED / INFERRED / MISSING / DEFERRED / NOT_AUTHORIZED
- 未認証Reaction: 正式設計計算へ自動採用しない（HOLD_NOT_AVAILABLE / NOT_AUTHORIZED維持）
