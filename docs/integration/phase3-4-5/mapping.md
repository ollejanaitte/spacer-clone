# Phase 3-4/3-5 Mapping 表

## 1. ② → BridgeProject.Superstructure（superstructureAdapter）

| Target | Source (②) | Transform | Unit | Provenance | Required | Fail |
|--------|-----------|-----------|------|------------|----------|------|
| superstructureType | options / BSDD phase1ScopeAssertion | 既定 `plate_girder_rc_slab_non_composite` | — | SUPERSTRUCTURE 宣言 | yes | — |
| spanSystem | options / BSDD | `"simple" \| "continuous"` | — | SUPERSTRUCTURE 宣言 | yes | — |
| mainGirderArrangement[].girderId/offsetM | snapshot.girderLines[].girderId/offsetM | 直接 | m | CONFIRMED（入力） | yes（≥1） | offset 非有限 |
| deck.widthM | snapshot.deckReferences[0].widthM | 直接 | m | CONFIRMED | no | — |
| deck.thicknessM | input.deckThickness | 直接 | m | CONFIRMED | no | 未宣言→MISSING |
| bearingSupportRelation[] | snapshot.bearingPoints（support×girder 重複除去） | 直接 | — | DERIVED | yes | — |
| analysisReference | 定数 | NOT_AUTHORIZED | — | — | yes | — |
| model3DReference | snapshot.fingerprint / snapshotVersion | 直接 | — | DERIVED | yes | — |

## 2. CBDM → ③ Support[]（substructureBinding）

| Target (Support) | Source (CBDM/manifest) | Transform | Unit | Provenance | Fail |
|------------------|------------------------|-----------|------|------------|------|
| supportId | `bridgeGeometry.supports[].id` | 直接 | — | CONFIRMED | support 0件 |
| supportType | `fields.kind`（abutment→abutment / else pier） | 直接 | — | DERIVED | — |
| placement.station / alignmentId | `fields.station/stationM` + alignments[0].id | 直接 | m | CONFIRMED | station 欠落 |
| skewRad | `fields.skew/skewRad` | rad | CONFIRMED | — | — |
| bearingSeats | manifest sharedFacts.supports[].bearingSeats | transverseOffsetM → position.y | m | CONFIRMED | — |
| pier/abutment 形状 | SUBSTRUCTURE-owned `generateSample` | 初期テンプレート | m | — | — |

## 3. 反力（buildBoundReactions）

| Target | Source | 扱い |
|--------|--------|------|
| SupportReactions | manifest sharedFacts.reactions | **入力データとしてのみ**（NOT_AUTHORIZED 必須）。CONFIRMED/DERIVED → fail-closed |
| sourceRevision | manifest.revisionId | `manifest-rev-N` |

## 4. 配置（SupportPlacementEngine）

- `placement.source = "liner"` + 実 LINER `Coordinate3dInput` → `computeAllPlacements` が position/tangent/transverse（skew 適用後）を正準計算。
- 未指定時のみ従来 placeholder（bound mode では常に実線形）。
- FATAL（LINER データなし等）→ fail-closed（3D 生成停止）。
