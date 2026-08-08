# Phase 3-8 Reconstruction（②sample→①復元）Contract / Policy

> **対象:** `bridgeProject/alignmentReconstruction.ts` + `workflowReadiness.ts`

## 1. 入力（② sample から抽出可能な事実）

`reconstructionFactsFromSnapshot(snapshot)` / `reconstructionFactsFromSuperstructure(record)`:
- bridgeId / bridgeLengthM / spanLengthsM / supportIds
- supportStationsM（宣言時）/ supportSkewRads（宣言時）
- deckWidthM / girderOffsetsM（SUPERSTRUCTURE 所有）

**サンプルに無い情報は抽出しない**（RB-001 の vertical/crossfall/curve は存在しない → 扱わない）。

## 2. status 付与（Reconstruction entries）

| fieldKey | status | 根拠 |
|----------|--------|------|
| bridgeLengthM / spanLengthsM | CONFIRMED | sample 宣言 |
| supportStationM.<id> | CONFIRMED / DERIVED | 宣言 or 累積 span |
| supportSkewRad.<id> | CONFIRMED / DEFERRED | 宣言 or 未宣言 |
| horizontalGeometry | INFERRED | 曲線情報なし→straight 推定 |
| verticalProfile / crossfall | MISSING | sample に無し |
| deckWidthM | CONFIRMED / MISSING | 宣言 or 無 |
| girderOffsetM.<id> | CONFIRMED | SUPERSTRUCTURE 所有 |

## 3. 禁止 / fail-closed

- INFERRED→CONFIRMED 自動昇格禁止
- 不明値を 0 で埋めない（vertical/crossfall は MISSING）
- span sum ≠ bridge length → throw
- **cycle guard**: `reconstructAlignmentFromSample(facts, { generatingBridgeId })` で
  sample が対象 alignment 自身から生成された場合（①→②→①）→ throw
- 復元後の alignment section は **PARTIAL**（CASE B origin を明示）

## 4. CASE A/B 起点の識別

| 起点 | 表現 |
|------|------|
| CASE A | `status.sections.alignment.state = COMPLETE`・reconstruction なし |
| CASE B | `status.sections.alignment.state = PARTIAL` + `reconstruction.source/entries` + 各値 `source:"RECONSTRUCTED"` |

## 5. Cycle / revision 安定

- 同一 sample → 決定論的に同一復元（reconstruction 同一・revision 増えない）
- forward（①→②）→ backward（②→①）は cycle guard で reject
- `evaluateBridgeProjectReadiness`: nextAction / CONFIRMED / INFERRED / MISSING / NOT_AUTHORIZED /
  needsUserConfirmation を集約（Workflow Engine 用の最小 readiness）
