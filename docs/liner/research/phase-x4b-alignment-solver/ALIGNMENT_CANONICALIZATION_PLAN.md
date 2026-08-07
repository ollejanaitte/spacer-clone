# X4-B Alignment Canonicalization Plan

## 方針
既存LINER Alignment実装（frontendが正本）のcanonical構造を監査し、
backendに上位層Alignment Solverを最小限かつ契約的に追加する。
Geometry数式はX4-A Kernel（backend/rule_engine/geometry/）に委譲する。
二重実装禁止。

## 正本認定
| # | 機能 | 正本 |
|---|------|------|
| P1 | 横断要素評価 + validateAlignment | frontend/src/liner/core/geometry/horizontal.ts (+line/arc/clothoid) |
| P2 | station progression | frontend/src/liner/core/station/stationRules.ts |
| - | backend数値mirror | backend/rule_engine/geometry/** (PASS) |

## backend Alignment Solver 構成案
```
backend/rule_engine/alignment/
├── model.py         Alignment型 / ordered elements / builder
├── station.py       station progression / cumulative / lookup
├── evaluate.py      station→XY/tangent/curvature (Kernel委譲)
├── continuity.py    G0/G1/G2検証 + semantic boundary point
├── contract.py      RuleEngine / Road→Bridge contract
└── __init__.py      public API
```
各ファイルをStep PRで独立反映し、差分を小さくする。

## X4-A Kernel再利用契約
- solver / evaluation は geometry.line_arc / geometry.clothoid / geometry.station_offset をimport
- 数式の再実装はしない

## 対象外として明確化
- Station Equation / Brake Station: 既存stationRules.tsに実装あり(=frontend)。backend用はEvidence十分な場合のみ、不足時はDEFER
- 曲線長計算Rule: NEEDS_RESEARCH（ユーザー入力として与えられたlengthはgeometryとして消費可）
- 縦断 / 複数中心線 は対象外