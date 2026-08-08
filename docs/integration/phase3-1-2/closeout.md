# Phase 3-1/3-2 Closeout

> **Phase:** P5
> **Baseline main:** `a2889b4dfa3330165a20ab397cec992738bd5f2a`
> **Final main:** `3e762c258585fbb034d9051b6ad114142e7f28fc`
> **Branch:** `integration/phase3-1-2-alignment-bridgegeometry`

## 1. Merge Ledger

| PR | 内容 | merge SHA |
|----|------|-----------|
| #729 | P0 実装計画 | `831ea96e2c99c9569117081dd49b17e83255a458` |
| #730 | P1 Alignment → BridgeProject Adapter | `49dc78c09f32dc57afd5a39ac93c70141904f605` |
| #731 | P2 BridgeGeometry 数値生成 | `5d1fea02ed4f84d4761940dd3d854655c2935536` |
| #732 | P3 CBDM 格納 + manifest + round-trip | `8bed902fe4f45ab38d953a362ff832777e258fdd` |
| #733 | P4 山岳500m E2E + Save/Load/Replay | `3e762c258585fbb034d9051b6ad114142e7f28fc` |
| #734 | P5 docs + closeout（本 PR） | （merge 後に記録） |

## 2. 達成事項

- A: ①線形確定値 → Alignment Adapter → BridgeProject.Alignment（CBDM `alignments`）
- B: BridgeProject.Alignment → BridgeGeometry 生成・検証 → CBDM `bridgeGeometry`
- C: Save / Load / Replay で値・unit・status・source 保持（canonical JSON round-trip）
- D: 山岳500m で線形→BP→BG が E2E 決定論再現（byte 同一）
- E: 既存 `CommonModelGeometryInputAdapter` が数値 bridgeGeometry を消費 → **Phase 3-3 準備 OK**

## 3. 未解決 blockers

- 上部工・下部工の正式数値設計は NOT_GRANTED / NOT_AUTHORIZED（本フェーズで変更なし）
- 縦断なし draft の grade は MISSING（正しい扱い）
- skew 未指定の support は DEFERRED（入力待ち）
- INFERRED は未使用（CASE B 復元で導入予定）
- 3D 座標変換（three y-up / substructure local）は runtime 境界の責務（本モジュールは変換しない）

## 4. Phase 3-3 readiness

**GO**

Phase 3-3（①→②上部工 binding）の前提:
1. CBDM が数値 `bridgeGeometry`（spans/supports）を保持 ✓
2. `CommonModelGeometryInputAdapter` が station/skew を読み取る ✓
3. 実線形は引き続き LINER draft（Coordinate3dInput）が正本 —
   `LinerAlignmentConnector` で GeometryEngine に接続可 ✓
4. 未実施（Phase 3-3 で対応）: `GeometryEngineInput` への spanLengths/bridgeLength 数値受け渡し、
   WF-01 alignment-binding 本実装
