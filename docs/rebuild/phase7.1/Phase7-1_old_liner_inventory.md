# Phase 7.1: 旧LINER資産完全棚卸し

- Phase: 7.1 Road/LINER救出監査
- baseline: d524f6fb8f39e5ce1a2b7e5dd230f162a84f6a35
- 日付: 2026-08-13
- 対象: `frontend/src/liner/`（532ファイル・3.9MB・約72,700行TS/TSX・164 testファイル）

## 判定基準の明記

- 本棚卸しは「ファイルが存在する」だけでなく、**import wiring・route到達・test実在**まで確認した。
- 全てのTS import（498件）が解決することを検証・0欠落。
- 主要な計算core・UI・export・importerは**全てmainに実在**（削除されていない）。

## A. ライン/線形管理 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| ライン作成/一覧/編集/削除 | `components/AlignmentManager.tsx`（`AlignmentManager` 19, `moveAlignment` 29） | 実在・実装済み |
| 基準線/中心線+offset line | `components/AlignmentLineManager.tsx`（`addOffsetLine` 59, `deriveLinerCenterlineId` 35） | 実在 |
| 複数line（ランプ等） | `adapters/linerUiAdapter.ts`（`addLinerAlignmentBundle` 449, `switchActiveAlignment` 412） | 実在 |
| domain↔RoadDesignDocument変換 | `adapters/linerDomainDraftRoadDesignMapper.ts`（`domainDraftToRoadDesignDocument` 543） | 実在 |

## B. 平面線形 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| Straight | `core/geometry/line.ts`（`evaluateStraightElement` 3） | 実在 |
| Arc（R・turn） | `core/geometry/arc.ts`（`signedArcCurvature` 3, `evaluateCircularArcElement` 7） | 実在 |
| Clothoid（A・Simpson積分） | `core/geometry/clothoid.ts`（`evaluateClothoidElement` 47） | 実在・Phase0近似 |
| Composite連鎖評価 | `core/geometry/horizontal.ts`（`evaluateAlignmentAtDistance` 88） | 実在 |
| C0/C1連続性 | `core/continuityC0.ts` / `continuityC1.ts` | 実在 |
| Clothoid精度gate | `core/clothoidGate.ts` | 実在 |
| 方位角/XY/local frame | `core/vector.ts`（`localFrameFromAzimuth` 59） | 実在 |
| 主要点（IP/BC/EC/PVI等） | `core/types.ts`（`HorizontalPiPointResult` 247, ProfileSegment PVC/PVI/PVT） | 実在（導出出力） |
| 3D座標API | `core/coordinate3d.ts`（`pointAtStationOffset` 411） | 実在 |

## C. 測点 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| No.+形式 | `core/station/stationFormat.ts`（`formatStationNoPlus` 38, `parseStationNoPlus` 60） | 実在 |
| 測点生成（間隔/方程式） | `core/station/stationRules.ts`（`generateStations` 50） | 実在 |
| 測点→座標 | `core/stationAtPoint.ts`（`stationAtPoint` 240） | 実在 |
| 座標→測点/offset | 同上（`projectOntoStraight/Arc/Clothoid` 73/124/169） | 実在 |
| 測点UI | `components/LinerStationProfilePanel.tsx`（32） | 実在 |

## D. 縦断 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| Grade/Parabolic（VCL） | `core/geometry/vertical.ts`（`evaluateVerticalElement` 29） | 実在 |
| 標高計算 | `core/elevationAt.ts`（`elevationAt` 39） | 実在 |
| 縦断validation（勾配制限） | `core/validateVerticalAlignment.ts`（`checkVerticalGradeLimits` 148） | 実在 |
| 縦断図 | `components/VerticalProfileChart.tsx`（128） | 実在 |
| 縦断UI | `components/VerticalElementEditor.tsx`（212） | 実在 |

## E. 横断 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| 横断template | `core/crossSectionTemplateResolution.ts`（`resolveCrossSectionTemplateForPhysicalDistance` 38） | 実在 |
| 横断勾配/crossfall | `core/grid/crossfallResolution.ts`（`resolveCrossfallState` 224, `resolveCrossfallOffset` 254） | 実在 |
| 片勾配/拡幅 | `core/width/widthResolution.ts`（`resolveWidthAtDistance` 152）+ `components/SuperelevationEditor.tsx` / `WidthChangePointEditor.tsx` | 実在 |
| 横断図 | `components/CrossSectionPreview.tsx`（SVG・173） | 実在 |
| 横断UI | `components/CrossSectionTemplateEditor.tsx` / `CrossfallIntervalEditor.tsx` | 実在 |

## F. 橋梁連携候補 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| Pier/Span評価 | `core/bridge/bridgeLayoutEvaluation.ts`（`evaluateBridgeLayout` 298） | 実在 |
| Skew幾何 | `core/bridge/pierLineGeometry.ts` | 実在 |
| Pier/Span UI | `components/BridgeLayoutEditor.tsx`（105） | 実在 |
| 下部工handoff | `substructure/planning/linerHandoff.ts`（`linerPiersToSupportHandoff`） | 実在（`/pro/liner/substructure`） |

## G. 表示・成果 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| 平面/縦断/横断SVG payload | `core/visual/`（`buildPlanPayload`/`buildProfilePayload`/`buildSectionPayload`） | 実在 |
| 正式図面workspace | `pages/LinerFormalDrawingWorkspacePage.tsx` + `drawing/builders/formalBuilders.ts` | 実在 |
| DXF export | `dxf/export/exportFormalDrawingDxf.ts` + serializer/mapper | 実在 |
| 座標表/要素表 | `drawing/tables/planCoordinateTable.ts` / `core/output/tables` | 実在 |
| 3D | `pages/LinerMain3DPage.tsx` + `samples/mountain-viaduct-500/viewer.tsx`（R3F） | 実在 |
| STL export | `exports/linerFrameStl.ts` | 実在 |

## H. データ管理 — 実在

| 機能 | path / symbol | status |
|---|---|---|
| Save/Load（project.liner + roadDesignDocument埋込） | `adapters/linerProjectDraft.ts`（`serializeProjectForPersistence` 145, `hydrateProjectLinerFromPersistence` 99） | 実在 |
| Importer（PDF転記・JIP-LINER） | `importer/`（`ImporterProjectService.ts`・storage・migration・normalize） | 実在 |
| Sample data | `samples/mountain-viaduct-500/`（500m高架橋）+ importer組み込み | 実在 |
| headless frame生成 | `headless/createHeadlessLinerFrameProject.ts` + `mapper/frameModelMapper.ts` | 実在 |

## I. テスト — 実在（164ファイル）

| 領域 | 件数・内容 |
|---|---|
| core unit/regression | `core/__tests__/` 28（geometry・clothoid・station・coordinate3d・pipeline・golden各） |
| bridge | `core/bridge/__tests__/`（bridgeLayoutEvaluation・pierLineGeometry） |
| width/grid | widthResolution・crossfallResolution・measuredGridGeneration |
| verification（R1/P02外部reference比較） | `core/verification/__tests__/`（comparator・reporting等） |
| haunch/hoso/ldist | `core/{haunch,hoso,ldist}/__tests__/` |
| components | 16（editor各・診断panel） |
| pages | Edit(565)・List・Preview・Main3D・FormalDrawingWorkspace・MappingReview |
| drawing/dxf | `drawing/__tests__/`・`dxf/__tests__/`（golden・parity gate） |
| importer | 22 |
| samples | 16（mountain*） |
| schema/adapters/mapper/headless | 各テスト |
| App-level E2E | `App.linerReset.test.tsx`・`App.linerDelete.test.tsx`・`App.linerSaveLoad.test.tsx`(479)・`App.linerSubstructureEntry.test.tsx` |

## 実測test結果（本監査で再実行）

- `App.linerReset/Delete` + `geometry/station/pipeline` : 30 passed
- `App.linerSaveLoad` + `clothoid/coordinate3d/golden各/bridgeLayout/widthResolution/dxf/drawing` + `road intermediateResult/roadMesh/roadCimGeometry` : 103 passed

## 主要エントリ（route）

| Entry | route |
|---|---|
| LinerLauncherPage | `/pro/linear-coordinate` |
| LinerListPage | `/pro/liner` |
| LinerEditPage | `/pro/liner/setup` |
| LinerPreviewPage | `/pro/liner/preview` |
| LinerFormalDrawingWorkspacePage | `/pro/liner/drawings/*` |
| LinerMain3DPage | `/pro/liner/main3d` |
| LinerMappingReviewPage | `/pro/liner/mapping-review` |
| Importer | `/pro/importer/*` |
| Substructure（LINER由来） | `/pro/liner/substructure` |

## 結論

- 確認対象の**tracked LINER資産（532ファイル・164 tests）はmainに残存**し、主要route（`/pro/linear-coordinate`・`/pro/liner/*`）がApp.tsxから接続済みである。
- これは「ファイル保存・route接続」の意味での残存であり、以下の**含意はしない**（過大解釈を避ける）:
  - 全research branch成果の意味的supersetである（ファイル数の大小と機能完全性は別）
  - 全機能がproduction品質である
  - 「完成済み実務資産」である（残存LINERは実装・test済みだが、正式採用は別途判断）
  - 現Road Moduleと完全parityである（UI面で大きく非対称）
- 旧LINERの正本候補 = **現mainの frontend/src/liner（TS計算kernel+UI+164 tests）**。
- backend/rule_engine（Python・X2-X4d）は別途DORMANTとして存在（新Road棚卸/transitionで評価）。
