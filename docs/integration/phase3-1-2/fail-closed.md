# Fail-Closed 条件（Phase 3-1/3-2）

エラー時は**仮値へ置換せず throw**（`BridgeProjectAdapterError` + 安定 code）。

| Code | 条件 |
|------|------|
| `BP_NON_FINITE` | 必須 station / value が NaN・Infinity |
| `BP_BRIDGE_EXTENT_MISSING` | pier/span/supportStations が全て無く extent を決定できない |
| `BP_STATION_ORDER_INVALID` | bridgeStart ≥ bridgeEnd / support 非昇順 / sampleInterval ≤ 0 |
| `BP_STATION_OUT_OF_RANGE` | 測点が alignment 範囲外、または solver が station を評価できない |
| `BP_SPAN_SUM_MISMATCH` | span 合計 ≠ bridgeLength / support 配置と alignment length 不一致 |
| `BP_SUPPORT_MISMATCH` | span が未知 support を参照 / span の station 非昇順 / support 不足 |
| `BP_UNIT_INVALID` | unit が空 / 非正準 / 文書 schema 違反 |
| `BP_COORDINATE_UNKNOWN` | 座標系が非 right-handed / 非 z-up |
| `BP_VALUE_STATUS_INVALID` | status 不明 / MISSING・DEFERRED が value を持つ / stateReason 欠落 |
| `BP_SOURCE_INVALID` | source 分類不正（予約） |

## 検証箇所

- `validation.ts`: `assertFinite` / `assertBpValueShape` / `assertAscendingStations` /
  `assertSpanSumEqualsLength` / `assertStationInRange` / `assertCoordinateSystemKnown`
- `cbdmDocument.ts`: `commonBridgeDataModelSchema.safeParse`（構造）+
  `validateBridgeProject`（意味）。failure → throw。

## 追加の fail-closed 方針

- 反力・設計値は NOT_AUTHORIZED（`numericDesignAuthorization: NOT_GRANTED` /
  `designOrConstructionUse: PROHIBITED`）。計算・照査には使用禁止。
- `analysisReference.status = NOT_AVAILABLE`（解析 golden 無し）。
