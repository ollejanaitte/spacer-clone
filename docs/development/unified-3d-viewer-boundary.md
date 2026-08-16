# SPACER — Unified 3D Viewer Boundary Audit (V-1)

- 作成日時: 2026-08-16 (JST)
- Lane / Wave: Lane V / Wave 1 (V-1)
- 対象 worktree: `~/Projects/spacer-clone-lane-v` (branch `lane-v/unified-3d-viewer`)
- 上位計画: [parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md) (Lane V-1)
- 目的: 将来の統合 3D Viewer で Terrain / Road / Superstructure / Bearings /
  Substructure / Existing Conditions を同時表示するための「既存 3D 描画系の境界」を
  実ファイル単位で確定し、再利用 / 先行・延期の分類を行う。
- 本稿は監査結果の記録である。production コード・Schema・test は変更していない。

---

## 1. 監査対象と座標・責務の前提

### 1.1 3D 描画系の全体像

SPACER には **2 つのアプリ系統** が並存し、それぞれ独立した 3D 描画を持つ。

```
[legacy /pro App]  frontend/src/App.tsx + frontend/src/viewer/*
  主役: Viewer3D / ThreeViewport (解析フレーム表示)
  ほか: CompareShell, Fallback2DViewport, SubstructureViewer3D, BridgeThreeViewer,
        TimeHistoryModelAnimation, MountainViaduct3dViewer (liner sample)

[new /app Next 系統]  frontend/src/next/*
  主役: SceneViewer (共有 three host) + TerrainViewer / Cim3DViewer /
        IntegratedSceneViewer / BridgeLayoutSceneViewer
  補助: 各 module の scene builder (terrainViewerBuilder / roadMesh /
        superstructureSceneBuilder / substructureSceneBuilder / existingViewerBuilder)
```

### 1.2 座標変換の正本 (確定)

- 土木 / Project 正本の **Domain 座標**: `X=道路軸方向 / Y=横断方向 / Z=標高 (up)`。
- Three.js 描画座標への変換は **`frontend/src/next/modules/renderCoordinate.ts` の
  `domainToThree` が単一正本** (`(x, y, z) → (x, z, -y)`)。
  legacy `liner/samples/mountain-viaduct-500/threeCoords.ts` はこれを委譲する。
- 解析フレーム Viewer (`frontend/src/viewer/coordinateTransform.ts`) は
  `SpacerAxisSwap` / `ViewerDisplayCoordinatePolicy` による表示用軸変換を持つ
  (liner 由来 Project の `(x, y, z) → (x, z, -y)` も同一規約)。
- **CRS (EPSG / 平面直角 / ジオイド) 変換の実装はリポジトリ内に存在しない。**
  EPSG / datum は `frontend/src/contracts/coordinateContext.ts` に宣言的に定義されるのみ。
  CRS 変換ロジックは Lane T の PORT 対象であり、Lane V で独自実装しない。

### 1.3 ProjectModel との結合 (確定)

- legacy `/pro` Viewer3D は **`ProjectModel` を直接受け取り**、node/member/support/load を
  `SceneBuilder` が解釈して描画する (`frontend/src/viewer/SceneBuilder.ts:91 rebuildModelScene`)。
  解析結果は `AnalysisResult` (IF3 resource 由来) を別 props で受ける。
- Next 系統の各 viewer は **各 module の canonical 文書** (TerrainDocument /
  RoadDocument / SubstructureDocument / ExistingConditionsDocument 等) から
  派生シーンを build する。ProjectModel は直接使わない (PDC / module document が中間)。
- **統合 Viewer は「ProjectModel を描画 I/F にしない」方針** (Lane V Wave 1 決定)。
  Viewer 向けの adapter / render model (Layer Contract) を挟む。

---

## 2. 既存 3D 描画系インベントリ (実ファイル単位)

### 2.1 解析フレーム Viewer (legacy `/pro`)

| 分類 | ファイル | 役割 | 主な export / 関数 |
|---|---|---|---|
| Viewer component | `frontend/src/viewer/Viewer3D.tsx` | 統合 UI (ViewerControls / CompareShell / Fallback 分岐) | `Viewer3D` |
| Viewport | `frontend/src/viewer/ThreeViewport.tsx` | three.js 描画ループ・camera・orbit・raycast | `ThreeViewport` |
| Scene 構築 | `frontend/src/viewer/SceneBuilder.ts` | ProjectModel → THREE group 生成 | `createSceneGroups` / `rebuildModelScene` |
| Renderer 群 | `frontend/src/viewer/renderers/*.ts` | node/member/support/load/result/apollo solid | `renderNodes` 等 |
| Compare | `frontend/src/viewer/CompareShell.tsx` / `CompareView.tsx` | 2 台 3D を並べ camera sync | `CompareShell` |
| 座標変換 | `frontend/src/viewer/coordinateTransform.ts` | axis swap / liner policy | `applyViewerDisplayTransform` |
| threeUtils | `frontend/src/viewer/threeUtils.ts` | camera fit / box / dispose | `fitCameraToBox` / `computeModelBox` |
| ラベル | `frontend/src/viewer/labelCollisionAvoidance.ts` | ラベル衝突回避 | `cullOverlappingLabels` |
| 診断 | `frontend/src/viewer/runtimeDiagnostics.ts` | WebGL/GPU 診断 | `createUnavailableWebGlDiagnostics` |
| 表示設定 | `frontend/src/viewer/settings/displaySize.ts` | node/label/support サイズ | `loadViewerDisplaySize` |
| テスト | `frontend/src/viewer/*.test.ts(x)` | Viewer3D / SceneBuilder / coordinateTransform / threeUtils 等 | — |

### 2.2 Next 系統 (new `/app`)

| 分類 | ファイル | 役割 |
|---|---|---|
| 共有 viewer host | `frontend/src/next/components/SceneViewer.tsx` | renderer/camera/OrbitControls/resize/fit を一元化 |
| Terrain viewer | `frontend/src/next/components/TerrainViewer.tsx` | TerrainDocument → three 描画 |
| 統合 viewer | `frontend/src/next/components/Cim3DViewer.tsx` | 18 CIM レイヤの統合描画・visibility・raycast |
| 統合 scene | `frontend/src/next/modules/cim/cimSceneBuilder.ts` | module canonical → 統合 THREE scene |
| Layer 契約 | `frontend/src/next/modules/cim/integrated3dScene.ts` | 18 CimLayerId / CimEntityMetadata / attachCimMetadata |
| 座標正本 | `frontend/src/next/modules/renderCoordinate.ts` | `domainToThree` / `threeToDomain` / `domainVerticesToThree` |
| Terrain scene | `frontend/src/next/modules/terrain/terrainViewerBuilder.ts` / `terrainSurface.ts` / `terrainTiles.ts` | グリッド・TIN・LOD |
| Road scene | `frontend/src/next/modules/road/roadMesh.ts` / `roadCimGeometry.ts` | 路面メッシュ / レール |
| Superstructure scene | `frontend/src/next/modules/superstructure/superstructureSceneBuilder.ts` | 主桁 / 床版 / 横桁 / 支承 |
| Substructure scene | `frontend/src/next/modules/substructure/substructureSceneBuilder.ts` | 橋台 / 橋脚 / 基礎 |
| Existing scene | `frontend/src/next/modules/existingViewerBuilder.ts` | 既設 entity ソリッド |
| BridgeLayout scene | `frontend/src/next/modules/bridgeLayout/bridgeLayoutScene.ts` | A1/P1..Pn marker・span |
| CIM export | `frontend/src/next/modules/cim/cimExport.ts` | GLB/glTF export |
| CIM 各レイヤ | `frontend/src/next/modules/cim/{roadCimSurface,superstructureCimLayer,substructureCimLayer,analysisCimLayer}.ts` | レイヤ別 build |

### 2.3 その他 3D 描画系

| 分類 | ファイル | 役割 |
|---|---|---|
| Liner sample viewer | `frontend/src/liner/samples/mountain-viaduct-500/{viewer,scene}.tsx/ts` | R3F による Terrain/Road/Bridge レイヤ sample |
| Substructure 3D | `frontend/src/substructure/viewer3d/SubstructureViewer3D.tsx` | R3F viewer + MeshPicker |
| Substructure solid | `frontend/src/substructure/{SubstructureSolidGenerator,PierSolidGenerator,FoundationSolidGenerator,geometryBase}.ts` | 純粋ソリッド生成 (KEEP 資産) |
| Bridge wizard | `frontend/src/bridge/viewer/BridgeThreeViewer.tsx` | 旧 BridgeWizard 内 raw-WebGL |
| 統合 3D (bridgeProject) | `frontend/src/bridgeProject/integratedScene3d.ts` | terrain+road+super+sub 統合 (OrientedBox3d) |
| Time history | `frontend/src/timeHistory/TimeHistoryModelAnimation.tsx` | R3F Canvas 時歴変形 |
| Next module pages | `frontend/src/next/pages/{Terrain,BridgeLayout,Cim,Superstructure,Substructure,Road}ModuleShellPage.tsx` | 各 module の shell 内 viewer mount |

### 2.4 参照リポジトリ (site-context-prototype) の 3D 資産 (Lane T の PORT 対象)

| 分類 | ファイル (参照のみ) | 役割 |
|---|---|---|
| 3D viewer | `app/src/TerrainViewer.tsx` | Heightfield → three mesh + orbit + raycast |
| Heightfield | `packages/core/src/terrain/heightfield.ts` | グリッド / bilinear 標高 |
| SCT1 | `packages/core/src/terrain/serialize.ts` / `importer/heightfieldBinary.ts` | バイナリ直列化 |
| GSI DEM | `packages/core/src/importer/{gsi,png,geotiff,grid,xyz,dem10bMapping}.ts` | 国土地理院 DEM 取得 |
| CRS | `packages/core/src/coordinate/{transform,epsgClassifier,adapter}.ts` | JGD2011 平面直角変換等 |
| Render 座標 | `packages/core/src/coordinate/adapter.ts` | canonical ↔ render |

---

## 3. 分類 (A〜F)

監査対象を「統合 3D Viewer 実現」の観点で分類する。

### A. 統合 Viewer の中核として再利用

| 資産 | 根拠 |
|---|---|
| `next/modules/renderCoordinate.ts` `domainToThree` | 座標変換の単一正本。統合 Viewer の canonical→render 変換としてそのまま採用 |
| `viewer/threeUtils.ts` `fitCameraToBox` / `computeModelBox` / `disposeObject` | camera fit / dispose の共通ユーティリティ |
| `next/components/SceneViewer.tsx` (パターン) | renderer/camera/orbit/fit の宿主設計。統合 Viewer の骨格の参考 |

### B. Layer として再利用

| 資産 | 根拠 |
|---|---|
| `next/modules/cim/integrated3dScene.ts` CimLayerId 18 種 | 既存レイヤ体系。V-2 の統合 Layer Contract と ID を整合させる (実装は V が別途契約) |
| `next/modules/terrain/terrainSurface.ts` グリッド→メッシュ | Terrain メッシュ生成の既存実装 (Lane T PORT 後は Lane T 成果へ委譲) |
| `next/modules/existingViewerBuilder.ts` TYPE_COLORS / buildExistingEntityMesh | Existing Conditions の描画規則 |
| `next/modules/road/roadMesh.ts` | Road 路面メッシュ生成 |
| `next/modules/superstructure/superstructureSceneBuilder.ts` | Superstructure 描画規則 |
| `next/modules/substructure/substructureSceneBuilder.ts` | Substructure 描画規則 |
| `next/modules/cim/roadCimSurface.ts` | Road リボン面 (幅変化 / 片勾配) |

### C. Adapter 経由で再利用

| 資産 | 根拠 |
|---|---|
| `viewer/coordinateTransform.ts` | legacy Viewer 固有の axis swap。統合 Viewer では「既存レガシー表示」にのみ Adapter 経由で使う |
| `substructure/geometryBase.ts` + `*SolidGenerator.ts` | ソリッド生成 (純粋) を SubstructureLayer の実データ生成で再利用 |
| `apollo/visualization/*` solid 生成 | Bearing/Superstructure solid のパラメータ生成 |
| `bridgeProject/integratedScene3d.ts` | 統合シーンの既存知見 (OrientedBox3d) を Layer 化する際の参考 |
| `contracts/coordinateContext.ts` | CRS/datum メタデータを Layer の coordinate basis 記述に利用 |

### D. mock / fixture で先行 (Lane T 未確定部分)

| 資産 | 根拠 |
|---|---|
| Terrain heightfield / mesh | Lane T の実 Terrain I/F 未確定 → mock グリッドで先行 |
| CRS (JGD2011 等) | Lane T の PORT 対象 → 統合 Viewer では mock ローカル座標で扱い、CRS 変換は実装しない |
| site-context `TerrainGenResult` / SCT1 | Lane T が PORT 済み後、Lane B の Adapter 経由で流入 |

### E. 重複実装候補 (統合 Viewer で一本化の検討)

| 資産 | 根拠 |
|---|---|
| legacy `viewer/SceneBuilder.ts` + Next `cimSceneBuilder.ts` | レイヤ概念が分散。統合 Viewer の Layer Contract で一本化していく (既存は互換維持) |
| legacy `threeUtils` と Next 各 viewer の camera fit | 同種の fit ロジックが複数。統合 Viewer 内では単一に |
| `MountainViaduct3dViewer` と `Cim3DViewer` | いずれも「統合表示」の前身。統合 Viewer で置き換えていく (Wave 1 では実装しない) |

### F. 後続 Wave へ延期

| 資産 | 根拠 |
|---|---|
| LOD / terrain tile (`terrainTiles.ts`) | 実 Terrain 接続 (V-3) 以降で評価 |
| CIM export (GLB/glTF) | V-3 以降 |
| 本格 properties UI / clipping / measurement | Wave 1 範囲外 |
| TimeHistory / IF3 overlay 統合 | 後続 Wave |
| 旧レガシー Viewer の置き換え | 互換維持のため移行計画が必要 (後続) |

---

## 4. 既存レイヤ概念の棚卸し

| 系統 | レイヤ定義 | 数 |
|---|---|---|
| Next CIM | `integrated3dScene.ts` `CimLayerId` | 18 (terrain / existing / roadPavement / bridgeLayout / superstructure / substructure / foundation / bearing / femNodes / femMembers / supports / springs / loads / deformed / reaction / result / labels / reference) |
| Liner sample | `mountain-viaduct-500/scene.ts` `SceneLayer` | terrain / road / superstructure / substructure / frame 等 |
| legacy Viewer | `viewer/types.ts` `ViewerVisibility` | nodes / members / supports / apollo solid 群 / loads / labels / result 群 |

→ 統合 Viewer の V-2 Layer Contract は CIM の 18 レイヤのうち、
  **Terrain / Road / Superstructure / Bearing / Substructure / Existing Conditions** を
  Viewer 向けに再契約する (CIM レイヤとは ID を整合させる)。

---

## 5. ギャップと統合 Viewer への含意 (確定)

1. **統一描画 I/F が存在しない。** `/pro` の Viewer3D は ProjectModel 直結、Next の
   Cim3DViewer は module document 直結。どちらも「Viewer がデータ源を直接解釈する」構造で、
   描画 I/F の共通契約がない。→ **V-2 で Layer Contract + adapter / render model を新設する。**
2. **Terrain 実データの接続先が未確定。** Lane T が site-context の GSI DEM / Heightfield /
   SCT1 を PORT 中。統合 Viewer は「TerrainLayer が受け取る data shape」を先に確定し、
   mock で検証する (V-3 で Lane T 成果へ接続)。
3. **CRS 変換実装なし。** 統合 Viewer の canonical 座標は「プロジェクトローカル平面 (m)」を
   既定とし、CRS 変換は Lane T / Lane B 境界に押し出す。
4. **ソリッド生成は純粋関数として資産化済み** (substructure 系)。Layer データ生成で再利用できる。
5. **共通 viewer host (SceneViewer パターン) が存在**し、統合 Viewer の骨格として流用できる。

---

## 6. 他 Lane との境界メモ (V-1 時点)

| Lane | 境界 |
|---|---|
| T | Terrain / CRS / Heightfield / SCT1 の正本。統合 Viewer は TerrainLayer の data shape を要求として整理し、実装は待たない |
| B | site-context → SPACER 変換。`SiteContextTerrainImportResult` / `SiteContextImportReport` を Terrain/Existing の流入先として参照可能 |
| A | ProjectModel / Schema 正本。統合 Viewer は ProjectModel を描画 I/F にしない |
| U | App Shell / route。統合 Viewer の component 入口・props を引渡し (V-2 後) |
| S | Reference Business 001 の sample fixture。統合 Viewer の受入条件を引渡し |

---

## 7. 監査の制約と記録

- 本監査では production コード・Schema・test・設定を変更していない。
- 監査は主に実ファイルの読み取りと既存設計文書
  (Phase 6-01C/01D・Phase 3-A coordinate freeze・Phase 8-01 CIM 契約) との突合による。
- 既知の重複・分散は §5 の通り記録し、Wave 1 で解消せず後続に回す。

→ **V-2 (統合 Layer Contract) へ進める。**