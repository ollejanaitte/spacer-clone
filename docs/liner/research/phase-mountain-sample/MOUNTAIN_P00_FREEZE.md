# MOUNTAIN-SAMPLE P00 — Preflight / Sample Design Freeze

## Baseline
- origin/research/liner-r1-planning @ f63da572d13409367da2509f63a211b78d6cfca5
- Step3: frontend 921 / electron 26 / backend 1074 PASS

## Sample 正式仕様（凍結）

### 基本
- id: `mountain-viaduct-500`
- title: `山岳連続高架橋500m`
- description: `急曲線・急縦断・片勾配・400m連続高架橋`
- category: showcase / demo
- disclaimer: `SHOWCASE / DEMO — 道路構造令等への完全適合を保証した実案件設計例ではない`

### 路線
| 項目 | 値 |
|------|-----|
| total route length | 500.000 m |
| station range | STA.0.000 ～ STA.500.000 |
| bridge start | STA.50.000 |
| bridge end | STA.450.000 |
| bridge length | 400.000 m |
| approach start | 0～50 m |
| approach end | 450～500 m |

### 橋梁
| 項目 | 値 |
|------|-----|
| A1 | STA.50.000 |
| P1..P7 | STA.100/150/200/250/300/350/400.000 |
| A2 | STA.450.000 |
| spans | A1-P1, P1-P2, ..., P7-A2 = 8径間 |
| nominal span | 50.000 m（等間隔） |
| pier count | 7（P1〜P7） |
| abutment count | 2（A1/A2） |

### 水平線形（構成思想）
500m内で左右に蛇行。LINE→CLOTHOID→ARC(右)→CLOTHOID→ARC(左)→CLOTHOID→ARC→CLOTHOID→LINE。
Bridge区間(50〜450)内に複数の曲率変化を含む。R/A/L は solver/validation を通過する整合値。

### 縦断（構成思想）
急上り→crest→急下り→sag→再上り→終端。400m橋梁区間が谷を越え、橋脚高が場所ごとに変化。

### 横断勾配（シーケンス）
拝み→すり付け→片勾配→すり付け→拝み→すり付け→逆方向片勾配→終端。平面曲線と連動。

### 横断断面
標準横断（車線・路肩・必要に応じ拡幅相当）。width/edgeはexplicit。

### Terrain
- 山・谷・橋梁中央付近の深い谷・起終点斜面
- DISPLAY_LAYER（Road Geometry の計算から分離）
- deterministic（固定heightfield/関数、seed固定、reloadで不変）
- Road の X/Y/Z を改変しない

### 3D
- 既存経路: Project State → backend計算 → geometry3d payload → Three.js builders
- 対象: centerline / road surface / edges / crossfall / deck / girders / A1 / P1-P7 / A2 / terrain
- camera presets: 全景 / 橋梁区間 / 路面追従（+谷側・俯瞰 任意）

### Golden / Expected Metrics（fixture化）
- total=500 / bridge=400 / A1=50 / A2=450 / P1..P7=100..400 / span=8 / nominal=50 / pier=7 / abutment=2
- 追加: 主要な水平境界・VPI標高・crossfall状態・X/Y/Z・bridge key points・terrain seed/hash

## 実装PR分割
P00 freeze → P01 schema/metadata → P02 水平 → P03 縦断/横断 → P04 bridge →
P05 terrain+geometry3d → P06 sample picker+populate → P07 camera → P08 save/load →
P09 E2E → P10 final

## 禁止
3D専用偽サンプル / Three.js側で線形変形 / frontend solver再実装 / terrainからZ逆算 /
橋脚のThree.js手置き / A1A2以外の端点 / P1-P7不等間隔 / random terrain / expected自己生成

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked）
- apollo step4c evidence（並行lane、触らない）
