# Phase 3-6~3-9 実装計画

> **Phase:** P0 (plan)
> **Baseline:** origin/main `deba537c0c0282156eb12d9845bf81840e761497`
> **Branch:** `integration/phase3-6-9-case-a-b`

## 1. 目標

CASE A（①→②→③）と CASE B（②sample→①復元→③）の両ルートを、
BridgeProject を唯一の共通契約として、統合3D・Save/Load/Replay まで成立させる。

```
CASE A: ①LINER → BP.Alignment/Geometry → ②Geometry/3D → BP.Superstructure → ③Support[] → 統合3D → Save/Load/Replay
CASE B: ②sample → BP → ①復元/補完（status付き）→ ②整合 → ③ → 統合3D → Save/Load/Replay
```

## 2. 再利用（新規乱立なし）

- ①→②→③ チェーン: Phase 3-1..3-5 の `bridgeProject/*`（alignmentAdapter / bridgeGeometryGenerator / superstructureAdapter / substructureBinding / cbdmDocument / superstructureBinding）をそのまま再利用
- Main 3D: `liner/samples/mountain-viaduct-500/{scene,viewer,threeCoords,substructure,markers}.ts` を再利用
- reconstruction contract: `contracts/bridgeProject.ts` の `reconstruction` セクション（未使用・今回初 producer）
- status: `source:"RECONSTRUCTED"` + `reconstruction.source` + `status.sections.alignment.state=PARTIAL` で CASE A/B 起点を区別（契約変更なし）

## 3. Phase 3-8（先にコア実装）

- `bridgeProject/alignmentReconstruction.ts`:
  - 入力: `BridgeProjectSuperstructure`（または GeometrySnapshot 相当の共有事実）
  - 出力: 部分 `BridgeProjectAlignment`（直線 INFERRED）+ `BridgeProjectReconstruction`（entries に status）
  - status: bridgeLength/spanLengths/supportStation/skew/deckWidth = CONFIRMED（sample 宣言）
            supportStation 無し→ DERIVED（span 累積）/ horizontal=INFERRED / vertical・crossfall=MISSING / skew 無し=DEFERRED
  - fail-closed: 必須事実欠落 throw / INFERRED→CONFIRMED 自動昇格禁止 / cycle guard（source が生成元と同一なら reject）
- origin marker: `status.sections.alignment.state=PARTIAL` + `reconstruction.source` + 各値 `source:"RECONSTRUCTED"`

## 4. Phase 3-6（統合3D）

- `bridgeProject/integratedScene3d.ts`（純データ）:
  - terrain/road（既存 buildUnified3DScene）+ ② superstructure solids + ③ substructure SolidGroup を同一 three-space に融合
  - 座標: domainToThree(x-east/y-north/z-up→three)。substructure は origin+basis、superstructure は bridge-local origin を pointAtStationOffset で global 化
  - `consistency`（support XYZ = substructure solid origin = snapshot support position）を検証関数として出力
- viewer: `MountainViaduct3dViewer` に solids 層を追加（optional prop・既存 layer 維持）

## 5. Phase 3-7（CASE A E2E）

- 山岳500m: ①→BP→②→BP.Superstructure→③→統合3D→Save/Load/Replay（fingerprint 一致）
- mutation: 線形入力変更（例: A2 station 450→460）→ ②③ まで決定論伝播
- workflow-ready: 次に実行可能な正規アクションを判定する最小 readiness（CONFIRMED/INFERRED/MISSING/NOT_AUTHORIZED 集約）

## 6. Phase 3-9（CASE B E2E）

- ②sample（RB-001 事実 or 山岳 superstructure）→ reconstruction → 部分 Alignment（status 付き）→ ②整合 → ③ → 統合3D → Save/Load/Replay
- cycle guard: ①→②→① 自己ループ reject・revision storm なし
- CASE A 回帰再実行

## 7. PR 分割

| PR | 内容 |
|----|------|
| P0 | preflight + plan |
| P1 | Phase 3-8 reconstruction engine + origin/cycle guard + tests |
| P2 | Phase 3-6 integratedScene3d + consistency + tests |
| P3 | Phase 3-6 viewer solids wiring + tests |
| P4 | Phase 3-7 CASE A E2E + workflow-ready |
| P5 | Phase 3-9 CASE B E2E + CASE A regression |
| P6 | docs + closeout + full regression |

## 8. スコープ外

正式数値設計・反力認証・Workflow Engine 全面実装・UI 刷新・新構造形式。NOT_AUTHORIZED 維持。
