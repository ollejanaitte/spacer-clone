# Alignment mapping 表（Phase 3-1）

> `BridgeProjectAlignment` / CBDM `alignments` の各値の source・status・unit・生成元。

| 項目 | 生成元 | status | unit | generatedBy | 備考 |
|------|--------|--------|------|-------------|------|
| alignmentId | 入力 draft（activeAlignmentId / alignment.id） | CONFIRMED | — | — | |
| bridgeStartStation | draft piers の最上流 abutment（A1）station | CONFIRMED | m | — | ユーザー/サンプル入力 |
| bridgeEndStation | 最下流 abutment（A2）station | CONFIRMED | m | — | |
| bridgeLength | end − start | DERIVED | m | alignment-adapter | derivedFrom="bridgeEnd−bridgeStart" |
| station（測点） | support → draft pier station / 区間 → サンプル間隔 | CONFIRMED（support）/ DERIVED（区間） | m | | |
| X / Y / Z | `pointAtStationOffset(station,0)` | DERIVED | m | alignment-adapter | ジオメトリ再実装なし |
| tangent / transverse | `pointAtStationOffset(...).localFrame` | DERIVED | m | alignment-adapter | 単位ベクトル |
| azimuth / heading | `pointAtStationOffset(...).azimuth` | DERIVED | rad | | |
| curvature | `evaluateAlignmentAtDistance(...).curvature` | DERIVED | 1/m | | 直線=0 |
| grade | 縦断 profile の有限差分（±0.5m） | DERIVED / MISSING | ratio | | 縦断なし → MISSING |
| crossfall | `crossSectionAtStation(...).crossfall.rightSlopePercent` | DERIVED | % | | right_down_positive |
| width / offset | `crossSectionAtStation(...).offsetLines` の min/max | DERIVED / MISSING | m | | offsetLines なし → MISSING |
| coordinateSystem | 固定宣言（liner-global: x-east/y-north/z-up, right） | CONFIRMED | — | | |
| unitContext | 固定宣言（m / rad / % / ratio / 1/m） | CONFIRMED | — | | |

## CBDM `alignments` エンティティ

- 集約エンティティ（id=`deriveStableUuid("bridge-project.alignment", alignmentId)`）:
  `bridgeLength` / `bridgeStartStation` / `bridgeEndStation` / `coordinateSystem` / `unitSystem` / `stationCount`
- サンプル測点エンティティ（各 station）:
  `station` / `x` / `y` / `z` / `azimuth` / `curvature` / `grade` / `crossfall` / `widthM` / `widthLeft` / `widthRight` / `supportId`
