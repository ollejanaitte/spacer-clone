# ROAD_BRIDGE_INTERFACE_SPEC — Road→Bridge Interface

## 8 Interfaces (X1.8 正本)

| Interface | SOURCE | OWNER | DERIVATION | CONSUMER | VALIDATION | TRACE | VERSION |
|-----------|--------|-------|------------|----------|------------|-------|---------|
| ALIGNMENT(ACL) | 道路設計 | 道路 | 道路中心線 | 橋梁一般図 | 道示Ⅰ 線形 | TR-001 | v1.0 |
| STATION | 道路設計 | 道路 | 測点→支点位置 | 橋梁設計 | 橋長計算 | TR-002 | v1.0 |
| COORDINATE | 測量 | 道路 | X/Y→格点座標 | 構造解析 | 座標照査 | TR-003 | v1.0 |
| PROFILE | 道路設計 | 道路 | 縦断勾配 | 橋梁高さ | 桁下空間 | TR-004 | v1.0 |
| CROSSFALL | 道路設計 | 道路 | 片勾配→横断勾配 | 橋梁断面 | 排水照査 | TR-005 | v1.0 |
| WIDTH | 道路設計 | 道路 | 車道幅員→橋梁幅員 | 橋梁一般図 | 有効幅員 | TR-006 | v1.0 |
| SKEW | 道路設計 | 道路 | 交角→斜角 | 支承設計 | 斜角照査 | TR-007 | v1.0 |
| ALIGNMENT_ELEMENT | 道路設計 | 道路 | 曲線R→橋梁曲線 | 曲線橋梁 | 最小R照査 | TR-008 | v1.0 |
