# Phase 3-3 実装計画 — ①道路線形 → ②上部工 binding

> **Phase:** P0 (plan)
> **Baseline:** origin/main `4635caadef509223fdbaa9f3f970ef5fd568083a`
> **Branch:** `integration/phase3-3-liner-superstructure-binding`

## 1. 目標

①LINER の確定幾何を、BridgeProject（CBDM）を唯一の共通契約として経由し、
②上部工 GeometryEngineInput へ正式 binding する。

```
①LINER draft (Coordinate3dInput)
  → buildBridgeProjectAlignment   (Phase 3-1)
  → buildBridgeProjectGeometry    (Phase 3-2)
  → buildCommonBridgeModel        (CBDM: alignments + bridgeGeometry)
  → CommonModelGeometryInputAdapter (拡張) → GeometryEngineInput (数値)
  → DefaultGeometryEngine (実線形を接続) → GeometrySnapshot → 3D
```

**②は①の LINER domain を直接参照せず、必ず BridgeProject 契約を介する。**
（実線形の評価は engine 内部の LinerAlignmentConnector 経由。数値（support/span/skew/width）は CBDM 由来。）

## 2. 現状の課題（調査結果）

| # | 課題 | 対応 |
|---|------|------|
| 1 | `CommonModelGeometryInputAdapter` が `spanLengthsM`/`bridgeLengthM`/`deckSpecs` を出力しない | 拡張して数値 CBDM から入力（legacy fixture は無値のまま＝invent しない） |
| 2 | `DefaultGeometryEngine` が `input.supports[].stationM/skewRad` を無視（span 累積・skew=0 固定） | 明示 station があれば採用（全部 finite 時）。skew は per-support。backward-compat 維持 |
| 3 | `SuperstructurePipelinePanel` が RB001 ハードコード（`RB001_ALIGNMENT` / `buildRb001GeometryInput`） | BridgeProject-bound mode を追加（実線形 + CBDM）。SAMPLE mode は維持・明示分離 |
| 4 | WF-01 alignment-binding = PLANNED / Step 4-E / PENDING_FUTURE_STEP | 今回必要範囲で IMPLEMENTED / ACTIVE 化 |
| 5 | panel に project が渡っていない | ApolloPhase1Shell から project を thread |

## 3. モジュール変更

### P1: engine binding（`apollo/geometry/placement.ts` + `engine.ts`）
- `SupportPlacementRequest` に `supportStationsM?: number[]` / `skewRads?: (number\|undefined)[]` を追加。
  `placeSupportLines`: 明示 stations（全支持分）があれば採用、無ければ従来の span 累積。skew は per-support（無ければ 0）。
- `engine.generateSnapshot`: `input.supports` が**全て finite stationM** を持つ場合、それを
  正準の support station（global alignment station）として使用。
  - bridgeStart/bridgeEnd = 先頭/末尾 station。bridgeLength と整合を検証（fail-closed）。
  - girder line の stationStart/End = bridgeStart/bridgeEnd。
  - skew = input.supports[].skewRad（finite 時）。
  - legacy（station 無し）は従来挙動のまま。

### P2: adapter 拡張（`apollo/geometry/geometryInputAdapter.ts`）
- `spanLengthsM`: `bridgeGeometry.spans[].fields.spanLength`（startStation 順に整列）
- `bridgeLengthM`: alignment aggregate `bridgeLength`（または last−first support station）
- `deckSpecs`: `bridgeGeometry.deck[].fields.widthM` → `{deckId, widthM}`（thickness/elevation は無ければ undefined）
- 「数値を invent しない」不変条件を維持（legacy fixture は空のまま）

### P3: binding facade + WF-01
- `frontend/src/bridgeProject/superstructureBinding.ts`（新規）:
  `buildBoundGeometryInput(commonModel, options)` → GeometryEngineInput。
  内部で `CommonModelGeometryInputAdapter` を再利用 + 検証（support 欠落 / station 欠落 / unit / 順序 → fail-closed）。
  `options.girderOffsetsM` は SUPERSTRUCTURE 入力として受け取る（CBDM からは来ない）。
- WF-01: `capabilityRegistry.ts` alignment-binding → `IMPLEMENTED` / `gatingGuard: "ACTIVE"` /
  `dependencies.ts` `BINDING_PREREQUISITE_GUARD` → `"ACTIVE"` / `isBindingPrerequisiteActive()` → true。
  workflow test 更新。

### P4: panel + E2E
- `SuperstructurePipelinePanel` に `project?` を thread。`linerDraftFromProject(project)` から
  実線形 + CBDM チェーンを構築し、BridgeProject-bound mode で実行。
  SAMPLE（RB001）mode と明示分離。girder 配置は SUPERSTRUCTURE 入力（girderSpacing 等）。
- E2E（module test）: 山岳500m → bound snapshot（9 supports / 8 spans / skew=π/2 / width=12）/
  mutation propagation / save-load-replay 決定論。

## 4. スコープ外（Phase 3-4 以降）

- ②→BridgeProject Adapter 本格実装 / ③下部工接続 / ①→②→③ E2E / 復元 Engine /
  正式数値認証 / Workflow Engine 全体

## 5. 検証

- 各 PR: 影響範囲 unit + `tsc -b`
- closeout: frontend vitest full + backend pytest + e2e（mountain-main3d / adapter）+ contracts
