# Phase 7.1: 現Road Module完全棚卸し

- Phase: 7.1 Road/LINER救出監査
- baseline: d524f6fb8f39e5ce1a2b7e5dd230f162a84f6a35
- 日付: 2026-08-13
- 対象: `frontend/src/next/modules/road/`（10ファイル・約57KB）+ RoadDesignDocument契約 + backend/rule_engine

## 1. 新Road Module（frontend/src/next/modules/road/）

全て「LINER kernelをKEEP/ADAPT・再実装しない」と明記された計算wrapper。

| ファイル | 機能 | 公開API |
|---|---|---|
| `horizontal.ts` | 平面線形validation+評価（LINER kernel再export） | `createRoadHorizontal`（68） |
| `vertical.ts` | 縦断評価・3D centerline | `evaluateRoadCenterline3D`（84） |
| `stationing.ts` | 測点表・座標 | `createRoadStationing`（49） |
| `crossSection.ts` | 横断構成・offset照会 | `buildRoadCrossSection`（64） |
| `width.ts` | 拡幅・crossfall | `evaluateRoadWidth`（40） |
| `intermediateResult.ts` | **統合per-station幾何パイプライン** | `buildRoadIntermediate`（61） |
| `roadMesh.ts` | 3D道路表面mesh | `buildRoadMesh`（41） |
| `roadCimGeometry.ts` | CIM geometry document | `buildRoadCimGeometry`（67） |
| `referenceSamples.ts` | Reference Mountain（test fixture） | `createMountainRoadSample`（21） |
| `geometryTypes.ts` | type re-export | — |

## 2. RoadDesignDocument契約

- `frontend/src/contracts/roadDesignDocument.ts`（650行）
- **entity-registry型**（alignments/profiles/crossSections/bridgesへのentityId参照のみ・幾何値は非保持）
- validation `validateRoadDesignDocument`（504）実在
- 実際の幾何値は旧LINER domainDraft由来（`linerDomainDraftRoadDesignMapper`経由）

## 3. Module Core統合

- `frontend/src/next/modules/roadModule.ts` + `roadModuleAdapter.ts`
- ModuleDataRecord {state,data,validation}・`project.modules.road.data.roadInput`（緩い型）をUI保存pathとして使用
- `writeRoadDesignDocument`（厳格schema）は**production UIから未使用**（testのみ）
- registry: road dependencies=["terrain"]

## 4. Road UI — 重要判定

**新Road Module UIは compute/view-only。入力・編集導線は存在しない。**

- `frontend/src/next/pages/RoadModuleShellPage.tsx`（169行）
  - 唯一の編集可能field = 道路名（`road-label-input`）
  - horizontal/vertical/crossSectionsは `useState`（Reference Mountain既定 or 保存値）で**UI input未接続**
  - `widthChangePoints: []`・`crossSlopeIntervals: []` をハードコード（編集不可・非保存）
  - 表示は読み取り専用SVG preview（RoadPlanPreview/RoadProfilePreview/RoadCrossSectionPreview）
- 旧LINERの編集器（HorizontalElementEditor / VerticalElementEditor / CrossSectionTemplateEditor / CrossfallIntervalEditor / WidthChangePointEditor等13種）は**新Road UIに無い**

## 5. backend/rule_engine（Python・LINER計算coreのport）

- **DORMANT**: `backend/app/main.py`に rule_engine import ゼロ・`/api/rules` `/api/road` route無し
- frontendからも未消費（doc-comment参照のみ）
- testのみで使用（backend/tests/ 約55ファイル）
- 12/23ルールがstub（常にPASS）・実ルールも公式値は`NEEDS_RESEARCH`/`DEFERRED`
- geometry/line_arc・clothoid・station_offset・vertical/model は「frontend LINER kernelのPython mirror」と自己宣言

## 6. 新Road Moduleの接続実態

| 接続 | 状態 |
|---|---|
| Road Module → LINER kernel | KEEP/ADAPT（計算はLINER TS kernelを再export） |
| Road Module UI → 入力編集 | **無し（view-only）** |
| Road Module → RoadDesignDocument | 保存は `roadInput`（緩い型）・`roadDesignDocument`書き込みは未使用 |
| Road Module → backend rule_engine | **無し（HTTP接続なし）** |
| Road Module → terrain | 依存登録 + Reference Mountain共有 |
| Road Module → 3D | `buildRoadMesh` → integratedSceneBuilder（`road-surface`） |
| Road Module → downstream（bridgeLayout/superstructure） | `readRoadInputs`経由で参照 |

## 7. 実測test結果（本監査で再実行）

- `road intermediateResult/roadMesh/roadCimGeometry` : PASS（103件セットの一部）
- Road Module tests 8ファイルは全てPASS（既存CIでもgreen）

## 8. 結論

- 新Road Moduleは**計算パイプラインとしては成立**（horizontal→vertical→station→crossSection→width→intermediate→mesh→CIM）。
- ただし**authoring/editing能力が無い**（旧LINERの編集器は残存LINERのみ）。
- RoadDesignDocumentはentity-registry契約として存在（幾何値はLINER domainDraftがsource）。
- backend/rule_engineは**非接続のDORMANT Python port**。
