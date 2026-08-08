# Phase 3-4/3-5 実装計画 — ②→BridgeProject.Superstructure→③

> **Phase:** P0 (plan)
> **Baseline:** origin/main `b8215ebaed659e45ad8ff84549fb07e706ef5487`
> **Branch:** `integration/phase3-4-5-super-substructure`

## 1. 目標

①→BridgeProject→② は Phase 3-3 で成立済み。今回、
**② → BridgeProject.Superstructure → ③下部工** を成立させ、
①→②→③ の正規データ経路 + Pier/Abutment 初期モデル + 3D + Save/Load/Replay を実動させる。

```
① LINER → BridgeProject.Alignment → BridgeGeometry (CBDM)
  → ② GeometryEngineInput → GeometrySnapshot → 3D      [Phase 3-3 成立]
  → ② BridgeProject.Superstructure (新: Phase 3-4)       [本ミッション]
  → ③ Support[] binding → Pier/Abutment 初期モデル → 3D   [新: Phase 3-5]
  → Save / Load / Replay
```

## 2. 責任境界（Phase 1-2 を尊重）

| Adapter | 責任 |
|---------|------|
| BridgeProject Adapter（superstructure / substructure） | domain ↔ 共通モデルの変換・binding・validation（計算しない） |
| Calculation Adapter（A-01） | substructure domain ↔ 計算 engine 境界（**再利用・変更しない**） |

- 同一データを2つの adapter で Support[] に変換しない（単一経路 `BridgeProject → Support model`）。
- ③の形状（pier/abutment form・寸法）は SUBSTRUCTURE_OWNER の入力。配置（station/XYZ/skew/tangent）は BridgeProject から実データ binding。
- 反力は NOT_AUTHORIZED のまま（入力データとしてのみ伝搬。昇格禁止）。

## 3. Phase 3-4（②→BridgeProject.Superstructure）

- `BridgeProjectSuperstructure` 型（bridgeProject/types.ts）: superstructureType / mainGirderArrangement（per-girder offset）/ deck / bearingSupportRelation（support×girder）/ supportFixity / analysisReference（NOT_AUTHORIZED）/ 3D reference（snapshot fingerprint）/ provenance・revision
- `superstructureAdapter.ts`: `buildBridgeProjectSuperstructure(snapshot, bsdd, input)` — GeometrySnapshot + BSDD + bridge structure input から共有事実を抽出（invent しない）
- manifest 更新: `attachSuperstructureToManifest` — `references.superstructure` / `sharedFacts.supports[].bearingSeats` / `status.sections.superstructure`
- 永続化: ProjectModel サイドカー `apolloBridgeProjectSuperstructure` + importExport/workspace hydrate・serialize

## 4. Phase 3-5（BridgeProject→③）

- `substructureBinding.ts`: CBDM `bridgeGeometry.supports` + manifest `sharedFacts.supports` → ③ `Support[]`（id/type/station/skew/XYZ/tangent/transverse/bearingSeats/elevation）。A-01 / SupportPlacementEngine を再利用
- `SupportPlacementEngine` を実行時 host に配線（実 LINER Coordinate3dInput で snapshot を正準化。buildHostCoordinates プレースホルダ置換）
- 反力 NOT_AUTHORIZED guard（入力データとしてのみ・昇格禁止）
- App.tsx bound モード（BridgeProject がある場合、③host を bound Support[] で駆動）

## 5. E2E（山岳500m）

`①→BP→②→BP.Superstructure→③→Support[]→Pier/Abutment初期モデル→3D→Save→Load→Replay`
support 対応（A1/P1..P7/A2）・station/XYZ/skew/tangent・bearing 対応・revision・provenance を検証。

## 6. PR 分割

| PR | 内容 |
|----|------|
| P0 | preflight + plan |
| P1 | Phase 3-4 contract/adapter/manifest + tests |
| P2 | Phase 3-4 sidecar persistence + round-trip |
| P3 | Phase 3-5 substructureBinding + guard + tests |
| P4 | Phase 3-5 host wiring + App bound mode + initial model |
| P5 | E2E + Save/Load/Replay + Main3D regression |
| P6 | docs + closeout + full regression + ledger |

## 7. 保護 / スコープ外

- 既存 sample / A-01 / SupportPlacementEngine / Main3D / Electron / 既存 test を壊さない
- 正式数値設計・反力認証・Workflow 全面実装はスコープ外（NOT_AUTHORIZED 維持）
