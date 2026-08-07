# ROAD_TO_BRIDGE_KNOWLEDGE_FLOW — 道路→橋梁Knowledge Flow

## 知識伝達一覧

| 道路側Knowledge | 伝達方法 | 橋梁側Knowledge | OWNER | DERIVATION | CONSUMER | VALIDATION |
|----------------|---------|----------------|-------|------------|----------|------------|
| ALIGNMENT(ACL) | 道路中心線→橋梁中心線 | ALIGNMENT(ACL) | 道路 | 道路設計 | 橋梁一般図 | 道示Ⅰ 線形 |
| STATION | 測点→支点位置 | SUPPORT_LINE | 道路 | 道路設計 | 橋梁設計 | 橋長計算 |
| COORDINATE | X/Y→格点座標 | GRID_POINT | 道路 | 測量計算 | 構造解析 | 座標照査 |
| PROFILE | 縦断勾配→橋梁縦断 | PROFILE | 道路 | 道路設計 | 橋梁高さ | 桁下空間 |
| CROSSFALL | 片勾配→横断勾配 | CROSSFALL | 道路 | 道路設計 | 橋梁断面 | 排水照査 |
| WIDTH | 車道幅員→橋梁幅員 | WIDTH | 道路 | 道路設計 | 橋梁一般図 | 有効幅員 |
| SKEW | 交角→斜角 | BEARING | 道路 | 道路設計 | 支承設計 | 斜角照査 |
| ALIGNMENT_ELEMENT | 曲線R→橋梁曲線 | ALIGNMENT_ELEMENT | 道路 | 道路設計 | 曲線橋梁 | 最小R照査 |

## 伝達ルール

- 道路側のALIGNMENT, STATION, COORDINATEは橋梁でも同一Entityとして扱う
- PROFILE, CROSSFALL, WIDTHは道路設計値が橋梁設計条件として引き継がれる
- SKEW（交角）はROAD_BRIDGE_INTERFACEを経由してBEARING（支承）へ伝達
- 各伝達はROAD_TO_BRIDGE_EVIDENCE.csv（X1.5）で証跡管理
