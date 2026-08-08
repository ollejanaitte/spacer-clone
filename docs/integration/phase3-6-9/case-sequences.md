# CASE A / CASE B 連携シーケンス（Phase 3-7/3-9）

## CASE A（正方向）
```
① LINER draft
 → buildBridgeProjectAlignment → buildBridgeProjectGeometry → buildCommonBridgeModel
 → buildBoundGeometryInput → GeometryEngine → ② Geometry/3D
 → buildBridgeProjectSuperstructure → attachSuperstructureToManifest（② section COMPLETE）
 → buildBoundSubstructure → makePlacementSnapshots → ③ Solids
 → attachSubstructureToManifest（③ section COMPLETE）
 → buildIntegratedScene3d（terrain+①+②+③）
 → Save → Load → Replay（fingerprint 一致）
```
mutation: ① の support station 変更（例 A2 450→460）→ ②③・統合3D まで決定論伝播。

## CASE B（逆方向）
```
② sample（RB-001 / snapshot 事実）
 → reconstructAlignmentFromSample（部分 Alignment + reconstruction entries, status 付き）
 → attachReconstructionToManifest（alignment section PARTIAL = CASE B origin）
 → buildBridgeProjectGeometry → ③ binding → solids
 → ② 整合（復元 Alignment で GeometryEngine 再実行）
 → buildIntegratedScene3d → Save → Load → Replay
```
cycle guard: ①→②→① 自己ループ reject。同一 sample → 決定論（revision 安定）。

## Fail-Closed
- INFERRED→CONFIRMED 昇格禁止 / span sum 不整合 / MISSING 捏造禁止 / NOT_AUTHORIZED 昇格禁止
- Save/Load で provenance 消失禁止 / Replay で revision 変化禁止
