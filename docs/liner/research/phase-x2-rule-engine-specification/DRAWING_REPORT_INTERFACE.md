# DRAWING_REPORT_INTERFACE — Drawing / Report Interface

## Drawing Engine Input

| Input | Source | Description |
|-------|--------|-------------|
| ALIGNMENT | Geometry Engine | 線形座標 |
| STATION | Geometry Engine | 測点 |
| COORDINATE | Geometry Engine | 座標 |
| PROFILE | Geometry Engine | 縦断 |
| CROSSFALL | Geometry Engine | 横断勾配 |
| WIDTH | Rule Engine | 幅員 |
| SUPPORT_LINE | Bridge Interface | 支点ライン |
| SPAN | Bridge Interface | 支間 |
| GIRDER_LINE | Bridge Interface | 主桁 |

## Report Engine Input

| Input | Source | Description |
|-------|--------|-------------|
| RULE_RESULTS | Rule Engine | 照査結果 |
| CALCULATED_VALUES | Geometry Engine | 計算値 |
| ADOPTED_VALUES | Input | 採用値 |
