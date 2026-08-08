# X4-C Scope

## 目的
X4-AのCanonical Geometry KernelとX4-BのCanonical Alignment Solverを正本として利用し、
任意Stationにおける道路横断面幾何を決定論的に生成するCross Section Generatorを確立する。

## 対象
- backend/rule_engine/crosssection/（新規上位層、Alignment Solver上の横断面生成）
- Alignment Solverからのstation pose取得（center XY / tangent / normal）
- 幅員・横断勾配・中心標高のexplicit input消費
- local offset → global XYZ変換
- left/right edge生成
- Rule Engine contract接続（cross section座標計算をRule Engineへ埋め込まない）
- Road→Bridge contractへ横断面幾何を供給

## 非対象（実装禁止）
- 拡幅Rule（設計基準から拡幅量を決定）
- 幅員自動設計ロジック
- 横断勾配・片勾配の設計Rule（X3 Rule Engineの責務）
- Vertical Alignment Solverの新設
- 橋梁構造設計ロジック
- Y字橋 / JCT / Alignment Graph / 複数中心線 / 分岐Cross Section
- Drawing Engine / 3D rendering / STL / Apollo redesign / SPACER解析

## 境界
- Cross Section Generatorは「確定済みの幅員・横断勾配・中心標高を指定Stationの実座標XYZへ変換する」
  Geometry Generatorであり、設計値を決定するRule Engineではない
- Geometry KernelへCross Section座標算出を埋め込まない（collexの責務分離: invariant）
  - Kernel: 低レベル幾何（ベクトル・角度・座標変換）
  - Alignment Solver: station pose取得
  - Rule Engine: 判定・入力値要求
  - Cross Section Generator: 確定値のXYZ変換

## 完了後gate
X4D_GATE_VERDICT算出。GO判定後もPhase X4-Dは自動開始しない。