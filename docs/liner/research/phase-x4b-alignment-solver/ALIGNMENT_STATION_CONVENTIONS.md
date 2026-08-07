# X4-B Alignment Station Conventions

## 基本
- 単位: m（メートル）
- 始点 station: alignment start = 0
- 表示station: `StationDefinition.originDisplayedStation` を加算（X4-A `displayed_station_at_physical_distance`）

## 累積station
- 要素 i の start = Σ(length of elements 0..i-1)
- 要素 i の end = start_i + length_i
- alignment end = Σ 全要素length

## 境界
- 境界 station は後続要素の local station 0 へ解決（exact boundary policy）
- 境界判定 epsilon: stationTolerance（1e-6 m 級）
- before start: out-of-range（エラー or clamp 0、contractで明示）
- after end: out-of-range（clamp total or エラー）

## 表記（既存LINER/JIP）
- No.XX+YY（stationFormat.ts）: 表示専用。solver内部は数値mのみ保持
- BP/BC/EC/KA/KE/IP等: JIP source terminology。semantic boundary pointとして
  mapping（P04）。Evidence不足の解釈は補完しない。

## Station Equation / Brake Station
- 既存実装は frontend stationRules.ts（generateStations）に存在
- backend用はX1.5 Evidenceが十分な場合のみ実装
- 不足時: DEFERRED_STATION_EQUATION として別管理。通常のgeometric station progressionと混同しない

## 未解決（P00時点）
- JIP .LIN チェーンage式テーブルのコード実装はdocsのみ（absのためP02で確定）