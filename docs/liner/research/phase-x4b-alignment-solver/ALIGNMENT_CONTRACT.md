# X4-B Alignment Contract

## Alignment 型
```
Alignment {
  alignment_id: str
  elements: [AlignmentElement]  # ordered
  source_trace?: str
}
```
既存canonical `LinearAlignment`（backend/rule_engine/geometry/station_offset.py）を
基準とし、Alignment Solverはそれを入力・管理する。

## Station Contract
- station base unit: m
- alignment start station: 0（origin）。既存 `StationDefinition.originDisplayedStation` を表示起点として利用可
- cumulative geometric length = Σ element.length
- boundary: 内部境界は要素間で contiguous（開始側inclusive）。評価は `station >= start && station <= end` 方式
- exact boundary lookup: 境界 station は後続要素へ解決（next element local=0）
- tolerance: DEFAULT_TOLERANCES.station（backend局所定義、例 1e-6）を境界位置で使用
- negative station: clamp 0 / out-of-range エラー
- end station: total length。超過は clamp total またはエラー（contractにより明示）

## 要素順序規則
- 各要素は開始点・方位が前要素終端と連続であることが期待される（continuityはP04で検証）
- ゼロ長・負の長さ要素は拒否

## Evaluation API（P03で公開）
- position_at_station(station) -> XY
- tangent_at_station(station) -> direction (azimuth)
- curvature_at_station(station) -> signed curvature
- element_at_station(station) -> element metadata

## Continuity (P04)
- POSITION_G0: 要素境界で位置一致
- TANGENT_G1: 境界方位一致
- CURVATURE_G2: 数学的に必要な場合のみ（straight→clothoid→arc 等）
- mismatch は severity に分類: WARNING / ERROR / FATAL