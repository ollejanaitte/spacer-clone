# Phase 3-1 Adapter 責任

> **Phase:** P5 (docs)
> **対象:** `frontend/src/bridgeProject/alignmentAdapter.ts`（Phase 3-1）

## 1. 役割

①道路線形（LINER domain）の確定データを、共通正本 BridgeProject（CBDM）が
安全に受け取れる形（BridgeProject.Alignment）へ変換する。

## 2. Adapter 責任

| 責任 | 実装 |
|------|------|
| domain → BridgeProject 変換 | `buildBridgeProjectAlignment(input, options)` |
| unit 正規化 | m / rad / % / ratio / 1/m（`BpUnitContext`） |
| status / provenance 付与 | 各値に `BpValue`（status/source/generatedBy/sourceReference/derivedFrom） |
| validation | `validation.ts`（finite / station順 / extent / unit / status shape） |
| fail-closed | 不正入力は throw（仮値置換しない） |
| 決定論 | 同一入力 → 同一出力（純関数） |

## 3. Adapter 責任外

- 上部工設計 / 下部工設計 / 正式解析 / 反力計算 / Workflow Engine
- ジオメトリ再実装（`pointAtStationOffset` / `crossSectionAtStation` /
  `evaluateAlignmentAtDistance` に委譲）

## 4. 再利用（新規乱立なし）

- `liner/core/coordinate3d.ts`（測点評価）
- `liner/core/geometry/horizontal.ts`（curvature）
- `contracts/runtime/schemas/commonBridgeDataModel.ts`（格納先 zod）
- `contracts/legacy/idStability.ts`（決定論 ID）/ `contracts/legacy/checksum.ts`（round-trip）

## 5. 入出力

- 入力: `Coordinate3dInput`（BuildIntermediateInput または LinerDomainDraftVNext）
  + `AlignmentAdapterOptions`（alignmentId / bridgeStart・End / sampleInterval / supportStations）
- 出力: `BridgeProjectAlignment`（bridgeStart/End/Length + 決定論サンプル列）
  → `cbdmDocument.buildCommonBridgeModel` で CBDM に格納

## 6. 決定論の根拠

- サンプル測点集合は bridgeStart/End/interval から決定的に生成
- 各測点の値は LINER solver の決定論出力のみ
- ID は `deriveStableUuid`（決定論）
- シリアライズは canonical JSON（キーソート）+ checksum
