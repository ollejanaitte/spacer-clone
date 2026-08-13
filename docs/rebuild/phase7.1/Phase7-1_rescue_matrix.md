# Phase 7.1: 旧→現 完全救出マトリクス

- Phase: 7.1 Road/LINER救出監査
- baseline: d524f6fb8f39e5ce1a2b7e5dd230f162a84f6a35
- 日付: 2026-08-13

## 凡例

- 旧status: OLD_ACTIVE（残存LINER route）/ 現status: ROAD_VIEW_ONLY（現Road UI view-only）/ ROAD_PIPE（現Road計算）/ DORMANT（backend rule_engine）
- Functional parity: FULL（計算完全一致・同一kernel）/ PARTIAL / NONE
- Rescue feasibility: HIGH（そのまま再接続可能）/ MED / LOW
- Recommended action: KEEP / RESTORE / ADAPT / MERGE / REWRITE / DEFER / UNKNOWN

## マトリクス

| Category | Feature | Old LINER path/symbol | Old status | Current Road path/symbol | Current status | Git transition | Func parity | UI parity | Calc parity | Persist parity | Test evidence | Rescue feasibility | Recommended action | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 平面線形 | Straight/Arc/Clothoid/Composite | `liner/core/geometry/*` | OLD_ACTIVE | `road/horizontal.ts`（再export） | ROAD_PIPE | KEEP | FULL | NONE | FULL | NONE（roadInput） | 30+103 tests PASS | HIGH | **KEEP** | LOW | 計算は同一kernel・UIのみ旧LINER |
| 測点 | No.+形式/方程式/測点→座標/逆投影 | `liner/core/station/*` `stationAtPoint.ts` | OLD_ACTIVE | `road/stationing.ts`（再export） | ROAD_PIPE | KEEP | FULL | NONE | FULL | NONE | PASS | HIGH | **KEEP** | LOW | 同上 |
| 縦断 | Grade/Parabolic/VCL/標高/縦断図 | `liner/core/vertical*` `elevationAt.ts` `VerticalProfileChart.tsx` | OLD_ACTIVE | `road/vertical.ts`（再export） | ROAD_PIPE | KEEP | FULL | NONE（旧に縦断図有） | FULL | NONE | PASS | HIGH | **KEEP（縦断図はRESTORE候補）** | MED | 縦断図UIが旧のみ |
| 横断 | Template/offset line/断面図 | `liner/core/crossSection*` `CrossSectionPreview.tsx` | OLD_ACTIVE | `road/crossSection.ts` | ROAD_PIPE | KEEP | FULL | NONE | FULL | NONE | PASS | HIGH | **KEEP（断面図RESTORE候補）** | MED | 同上 |
| 拡幅/片勾配/crossfall | Width change/crossfall/superelevation | `liner/core/width/*` `grid/crossfallResolution.ts` `WidthChangePointEditor.tsx` | OLD_ACTIVE | `road/width.ts` | ROAD_PIPE（**但しUIでwidthChangePoints/crossSlopeIntervalsハードコード空**） | KEEP | FULL | NONE | FULL | NONE | PASS | HIGH | **KEEP+ADAPT（UI接続）** | MED | 現Roadは拡幅/crossfallを入力・保存不可 |
| 統合パイプライン | per-station幾何 | `liner/core/pipeline/pipeline.ts` | OLD_ACTIVE | `road/intermediateResult.ts` | ROAD_PIPE | ADAPT | FULL | NONE | FULL | NONE | PASS | HIGH | **KEEP** | LOW | 同一計算 |
| 3D mesh/CIM | Road mesh/CIM document | `liner/core/geometry3d`・`visual` | OLD_ACTIVE | `road/roadMesh.ts` `roadCimGeometry.ts` | ROAD_PIPE（UI消費はbridgeLayout previewのみ） | ADAPT/新規 | FULL | NONE | FULL | NONE | PASS | HIGH | **KEEP** | MED | CIMはproduction UI未消費 |
| ライン管理 | 複数line/offset line/active切替 | `liner/components/AlignmentManager.tsx` `AlignmentLineManager.tsx` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS（旧） | HIGH | **RESTORE/ADAPT（RoadModuleへ）** | MED | 旧UIそのまま利用可 |
| 平面線形UI | HorizontalElementEditor | `liner/components/HorizontalElementEditor.tsx` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **RESTORE/ADAPT** | MED | 旧editor再利用可 |
| 縦断UI | VerticalElementEditor | `liner/components/VerticalElementEditor.tsx` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **RESTORE/ADAPT** | MED | 同上 |
| 横断UI | CrossSectionTemplateEditor/CrossfallIntervalEditor | `liner/components/CrossSectionTemplateEditor.tsx` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **RESTORE/ADAPT** | MED | 同上 |
| 拡幅UI | WidthChangePointEditor/SuperelevationEditor | `liner/components/*` | OLD_ACTIVE | **無し**（ハードコード空） | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **RESTORE/ADAPT** | MED | 同上 |
| 測点UI | LinerStationProfilePanel | `liner/components/LinerStationProfilePanel.tsx` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **RESTORE/ADAPT** | MED | 同上 |
| 2D preview | Plan/Profile/Section SVG | `liner/core/visual/*` `LinerPreviewPage.tsx` | OLD_ACTIVE | `next/components/RoadPreviews.tsx`（簡略SVG） | ROAD_VIEW_ONLY | ADAPT（簡略化） | PARTIAL | PARTIAL | NONE | NONE | PASS | HIGH | **MERGE（旧visualをRoadへ）** | LOW | 旧の方が高機能 |
| 正式図面/DXF | FormalDrawingWorkspace/DXF | `liner/drawing/*` `liner/dxf/*` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS | HIGH | **KEEP（残存LINER）・Road統合はDEFER** | MED | 成果品系は後続 |
| 3D viewer | LinerMain3DPage（R3F） | `liner/pages/LinerMain3DPage.tsx` | OLD_ACTIVE | integratedSceneBuilder（road-surface） | ROAD_VIEW_ONLY | ADAPT | PARTIAL | PARTIAL | NONE | NONE | PASS | HIGH | **MERGE** | MED | 旧3D統合済み/新3Dはmesh表示 |
| Save/Load | project.liner埋込 | `liner/adapters/linerProjectDraft.ts` | OLD_ACTIVE | `roadModuleAdapter.ts`（roadInput） | ROAD_VIEW_ONLY | REWRITE | NONE（別format） | NONE | NONE | PARTIAL | PASS | MED | **ADAPT（LINER↔roadInput bridge）** | HIGH | 2つの保存経路が共存 |
| RoadDesignDocument | 契約/validation | `contracts/roadDesignDocument.ts`+mapper | OLD_ACTIVE | 同上（roadModule.validateRoadData） | ROAD_PIPE | KEEP/ADAPT | FULL | NONE | NONE | NONE | PASS | HIGH | **KEEP（正本化）** | MED | entity-registryのみ・幾何はLINER source |
| Importer（PDF転記） | JIP-LINER転記 | `liner/importer/*` | OLD_ACTIVE | **無し** | ROAD_VIEW_ONLY | DISCONNECT | NONE | NONE | NONE | NONE | PASS（22） | MED | **KEEP（残存LINER）・統合はDEFER** | MED | 独立機能 |
| backend rule_engine | Python計算core | `backend/rule_engine/*` | DORMANT | 新Roadは使用せず | DORMANT | DISCONNECT | PARTIAL | NONE | PARTIAL | NONE | PASS（test） | LOW | **DEFER（frontend正本方針）・REWRITE判断は後続** | MED | 非配線・12/23ルールstub |
| Bridge連携（pier/span） | bridge layout | `liner/core/bridge/*` `BridgeLayoutEditor.tsx` | OLD_ACTIVE | bridgeLayout module（旧LINER由来） | ROAD_VIEW_ONLY | KEEP | FULL | PARTIAL | FULL | PARTIAL | PASS | HIGH | **KEEP** | LOW | Phase 4/5で利用 |

## 救出判定集計

- **KEEP（計算kernel・同一）**: 平面/縦断/横断/測点/拡幅/統合/3Dmesh/CIM/bridge — 8項目
- **RESTORE/ADAPT（UIが旧のみ残存 → Road Moduleへ接続）**: ライン管理・平面UI・縦断UI・横断UI・拡幅UI・測点UI — 6項目（全てrescue HIGH）
- **MERGE（旧visual/3DをRoadへ統合）**: 2D preview・3D viewer — 2項目
- **REWRITE（persistence経路）**: Save/Load（roadInput経路の正本化） — 1項目
- **DEFER（成果品/独立/backend）**: 正式図面/DXF・Importer・backend rule_engine — 3項目

## 重要判定

1. **計算kernelは100%残存**（旧LINER TS kernel = 新Road計算wrapper = 同一コード）。救出不要。
2. **UIの大部分は旧LINERのみ**（現Roadはview-only）。ユーザー入力・編集導線は旧LINERにしか無い。
3. **新Road UIがwidth/crossfallを入力・保存できない**のは重大gap（`roadModuleAdapter.ts`の`RoadInputsData`にfield自体が無い）。
4. **2つのpersistence経路が共存**（project.liner vs modules.road.data.roadInput）→ 正本一意化が必要。
5. **backend/rule_engineはDORMANT**（非配線・stub多数）→ frontend正本方針との整合判断が必要。

## Road/LINER統合復旧ロードマップ（推奨・Rescue Phase案）

### Phase R1: 入力導線の復旧（最優先・HIGH）
- Road Module UIへ旧LINER editor（Horizontal/Vertical/CrossSection/Width/Crossfall/Station）を**RESTORE/ADAPT接続**。
- 旧LINER kernelをそのまま消費（新Road計算wrapperと同一なので二重実装なし）。
- roadInputへwidthChangePoints/crossSlopeIntervalsを追加（現在field欠落）。

### Phase R2: 正本一意化（HIGH）
- `modules.road.data.roadInput`（緩い型）と`project.liner.roadDesignDocument`（entity-registry）の関係を正本として確定。
- RoadDesignDocumentを正本化し、LINER domainDraft→RoadDesignDocument→計算の経路を一本化。

### Phase R3: 表示/成果統合（MED）
- 旧LINER visual（Plan/Profile/Section SVG・正式図面・DXF）をRoad ModuleへMERGE。
- 3D（旧LinerMain3D + 新integratedSceneBuilder）を統合。

### Phase R4: backend判定（MED・後続）
- backend/rule_engineをfrontend正本方針でどう扱うか確定（継続KEEP / REWRITE / 廃止候補）。
- 12個のstubルール（X2-R-005/006/008/009/010/011/012/013/014/015/016/017/018）の扱いを確定。

### Phase R5: 成果品/Importer（LOW・DEFER）
- 正式図面/DXF・PDF Importerは残存LINERで維持・統合は後続。
