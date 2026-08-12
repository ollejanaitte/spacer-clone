# Phase 5-01 Step B-01: Bridge Layout Input ＋ Adapter / Connector / Binding Mapping（凍結案）

## 1. 目的

BridgeLayoutDocument（唯一正本）から上部工へ渡す正式入力を確定し、
新データフローを**ファイル単位**で確定する。
各既存資産に対して KEEP / ADAPT / REWRITE / DEFER と変更点・新入出力・
責任範囲・禁止事項・tests を明示する。

- baseline: `6e3cc6dc795707770f87ebdd68c0d640d0a9a91c`（Step A merge後）
- 日付: 2026-08-12

## 2. 上部工への正式入力（凍結）

### 2.1 Span Handoff（Phase 5上部工の正式入口）

供給元: `bridgeLayoutSpanHandoff.buildSpanHandoff(manager, projectId, document)`

| 項目 | 型 | 規則 |
|---|---|---|
| spanId | string | 一意・chain連続 |
| index | number | 0-based・station昇順 |
| startSupportId / endSupportId | string | A1/P1..Pn/A2 |
| startStation / endStation | number (m) | physical distance |
| spanLength | number (m) | = end - start・>0 |
| startSupportSkew / endSupportSkew | number (rad) \| null | counterclockwise-positive |
| coordinateContext | { coordinatePolicyId, axisConvention: "x-along/y-transverse/z-up", unitSystem: "metric" } | 固定 |
| roadReference | RoadReference | 参照のみ |

上位工はこの支間配置を**正式入力**として受け取る。正本はBridgeLayoutDocument（編集禁止）。

### 2.2 Support Handoff（共通Support配置情報）

供給元: `bridgeLayoutSupportHandoff.buildSupportHandoff(manager, projectId, document)`

| 項目 | 型 | 規則 |
|---|---|---|
| supportId | string | A1/P1..Pn/A2 |
| supportType | "abutment" \| "pier" | — |
| station | number (m) | 昇順・A1<P1<…<A2 |
| position | { domainX, domainY, elevation } | Road Module正式API由来（LINER） |
| tangentAzimuthRad | number (rad) | 接線方位 |
| skewAngleRad | number (rad) \| null | counterclockwise-positive |
| skewSource | "automatic" \| "user" | — |
| terrainElevation | number \| null | Terrain参照 |
| roadReferenceId / coordinateContextId | string \| null | 参照 |

上部工はsupport位置・標高・skewを支承配置・3D配置の参照に利用（共通情報）。

### 2.3 上部工所有の入力（SuperstructureDocumentが正本）

- girderConfiguration（本数・offset）: 上部工所有・発明しない
- deckConfiguration（厚さ・overhang）: 上部工所有（幅はroad参照）
- structuralSystem・superstructureType: 上部工所有
- bearing形式（fixed/movable）: 上部工所有（Phase 5-02はUNDECIDED既定）

## 3. 新データフロー（ファイル単位・凍結）

```
Project Data Core
  modules.bridgeLayout.data.bridgeLayoutDocument  [canonical]
        │
        ├─ buildSpanHandoff（bridgeLayoutSpanHandoff.ts）──→ Span Handoff [derived]
        ├─ buildSupportHandoff（bridgeLayoutSupportHandoff.ts）─→ Support Handoff [derived]
        │
        ▼
  modules.superstructure（新規: Phase 5-02実装）
     superstructureModule.ts      … ModuleDefinition / createInitialModuleData
     superstructureModuleAdapter.ts … read/write/has SuperstructureDocument
     superstructureValidation.ts  … validateSuperstructureData（fail-closed）
     superstructureDocumentDomain.ts … buildSuperstructureDocument（入力統合）
        │
        ▼
  superstructureAdapter.ts [ADAPT]  … Handoff＋上部工入力 → shared facts（geometry入力準備）
        │
        ▼
  superstructureBinding.ts [ADAPT]  … SuperstructureDocument → GeometryEngineInput（fail-closed）
        │
        ▼
  CommonModelGeometryInputAdapter [ADAPT: 入力元差し替え]
        │
        ▼
  DefaultGeometryEngine.generateSnapshot（apollo/geometry/engine.ts）[KEEP]
        │
        ▼
  GeometrySnapshot [KEEP・凍結契約]
        │
        ├─ snapshot3d.ts / bridgeStructureSolids.ts [KEEP] → 3D
        ├─ buildGrillageModel [KEEP] → backend grillage/solver [KEEP]
        └─ reactionResults → Bearing / Reaction Handoff（Phase 5-02D）
```

## 4. ファイル別 Mapping（凍結）

凡例: 判定 = Phase 5-00分類（KEEP / ADAPT / REWRITE / DEFER）

### 4.1 projectSuperstructure.ts — ADAPT
- 変更点: 旧`ProjectModel.apolloBridgeProjectSuperstructure` sidecar（Save/Load）は旧システム用として維持。新システムでは**使わない**。新正本はmodules.superstructure。
- 新input: なし（新システム経路）
- 新output: なし（新システムではスーパーセッション）
- 責任範囲: 旧システムのround-trip互換維持（REFERENCE）。新システムでは使用しない
- 禁止事項: 新正本を旧sidecarから作らない
- tests: `projectSuperstructure.test.ts`（旧・維持）

### 4.2 superstructureAdapter.ts — ADAPT
- 変更点: `buildBridgeProjectSuperstructure`の入力（GeometrySnapshot + options）を、
  Span/Support Handoff + 上部工入力（SuperstructureDocument側）へ対応させた
  **新adapter関数**（例: `buildSuperstructureFacts`）を新module内に追加。
  旧関数は旧システム用として維持（REFERENCE）。
- 新input: SuperstructureDocument（girderConfiguration/deckConfiguration/bearingConfiguration）
  + Span Handoff + Support Handoff
- 新output: superstructure shared facts（girder arrangement / deck / bearing relation）
  → 新`geometryInputAdapter`へ
- 責任範囲: Handoff＋上部工入力 → 数値geometry入力の正規写像。値の発明禁止
- 禁止事項: Handoff由来値を改変・補間しない。Road geometry再実装しない
- tests: 既存`superstructureAdapter.test.ts`（維持）＋新`superstructureFacts.test.ts`（Phase 5-02 WP-B）

### 4.3 superstructureBinding.ts — ADAPT（KEEP寄り）
- 変更点: `buildBoundGeometryInput`のCBDM入力を、新SuperstructureDocument由来の
  数値入力へ差し替えた新関数（例: `buildSuperstructureGeometryInput`）。
  fail-closed不変条件（supports必須・station必須・bridgeLength必須・spans==supports-1・girder offsets必須）は**そのまま維持**。
- 新input: SuperstructureDocument + Span/Support Handoff（station/skew/span由来）
- 新output: `GeometryEngineInput`（旧GeometryEngineへの互換入力）
- 責任範囲: 上部工正本→GeometryEngineInputのfail-closed変換
- 禁止事項: girder offsetを発明しない（上部工所有のまま）
- tests: 既存`superstructureBinding.test.ts`（維持）＋新binding test（WP-B）

### 4.4 CommonModelGeometryInputAdapter — ADAPT
- 変更点: `CommonModelGeometryInputAdapter.adapt(cbdm)` のCBDM依存を、
  新`SuperstructureDocument`ベースの入力へ差し替えた**新adapter**を新module内に追加。
  既存adapterは旧経路（App.tsx）用として維持。
- 新input: SuperstructureDocument（supports/girders/deck/span由来の数値）
- 新output: `GeometryEngineInput`
- 責任範囲: 上部工正本→GeometryEngineInputの抽出（値の発明なし・純粋）
- 禁止事項: 数値の補完・推定
- tests: 既存`geometryInputAdapter.test.ts`（維持）＋新adapter test（WP-B）

### 4.5 LinerAlignmentConnector — ADAPT
- 変更点: 実装は不変。新システムのRoad Module参照経路（`readRoadAlignmentContext`）は
  LINER coreへ既に委譲しており同一原則。上部工側は新geometry engineへ
  `Coordinate3dInput`（Road Module正本から取得）を渡す。
- 責任範囲: LINER単一正本の原則維持。station/offset→XYZはLINERのみ
- 禁止事項: station→XYZ・clothoid・縦断を上部工側で再実装
- tests: `alignmentConnector.test.ts`（維持）

### 4.6 GeometryEngine（DefaultGeometryEngine） — KEEP
- 変更点: なし（凍結契約）
- 新input: `GeometryEngineInput`（新binding経由）
- 新output: `GeometrySnapshot`（fingerprint付き）
- 責任範囲: ジオメトリ生成の唯一実行層
- 禁止事項: 契約変更（理由なき凍結契約破壊）
- tests: `engine.test.ts`・`placement.test.ts`・parity系（維持）

### 4.7 GeometrySnapshot — KEEP（凍結契約）
- 変更点: なし。既存`types.ts`（v6.1.0）を維持
- 責任範囲: 下流（3D/analysis/design/replay）全てが仮定する凍結境界
- 禁止事項: 形状変更（必要なら事前設計＋migration。Phase 5-02では不要）
- tests: `contract.test.ts`等（維持）

### 4.8 新module群（Phase 5-02 WP-A/Bで実装）
- `superstructureModule.ts` / `superstructureModuleAdapter.ts` / `superstructureValidation.ts`
- `superstructureDocumentDomain.ts`（buildSuperstructureDocument）
- `superstructureFacts.ts`（新adapter） / `superstructureBindingNew.ts`（新binding）
- 詳細は Phase5-01E-04（Work Package）参照

### 4.9 UI shell — ADAPT（Phase 5-02）
- `NextApp.tsx`のmodule dispatchに `superstructure` → SuperstructureModuleShellPage を追加
- 新ShellPage: Bridge Layout参照＋上部工入力（girder/deck/bearing）＋3D表示＋Completion Gate
- 旧Apolloパネル（SuperstructurePipelinePanel等）は**新moduleから呼ばない**（REFERENCE）

### 4.10 Persistence — ADAPT（Phase 5-02 WP-I）
- 新SuperstructureDocumentは `next/persistence`（project.json + .spacerproj + backup）へ
  自動保存。旧`importExport.ts`は旧システム用に維持

### 4.11 tests — ADAPT
- 既存testsは維持（旧regression）。新testsはWP単位で追加（Phase5-01E-03）

## 5. 責任境界・禁止事項（凍結）

- 上部工はRoad/Terrain/Existing正本を**複製しない**（ID/referenceのみ）
- Road geometryは上部工側で**再実装しない**（LINER経由）
- Span/Support Handoffはderived。上部工から**編集しない**
- girder offset・deck厚さなど上部工所有値は**発明しない**（MISSING許容）
- 旧BridgeProject / Apolloを**新正本にしない**（compatibility boundaryとして維持）
- Connector / Adapter内に**別正本を作らない**

## 6. 判定サマリ

| ファイル | 判定 | Phase 5-02での扱い |
|---|---|---|
| projectSuperstructure.ts | ADAPT | 新経路では不使用（旧維持） |
| superstructureAdapter.ts | ADAPT | 新関数追加（旧維持） |
| superstructureBinding.ts | ADAPT | 新関数追加（旧維持） |
| CommonModelGeometryInputAdapter | ADAPT | 新adapter追加 |
| LinerAlignmentConnector | ADAPT | 実装不変・原則維持 |
| DefaultGeometryEngine | KEEP | そのまま |
| GeometrySnapshot | KEEP | 凍結契約維持 |
| 新superstructure module群 | REWRITE（新規） | WP-A/B |
| UI shell | ADAPT | WP-B |
| persistence | ADAPT | WP-I |
| 旧tests | KEEP | 維持＋新規追加 |
