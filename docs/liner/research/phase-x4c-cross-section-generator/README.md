# Phase X4-C — LINER Cross Section Generator

**目的:** X4-AのCanonical Geometry KernelとX4-BのCanonical Alignment Solverを正本とし、
任意Stationにおける道路横断面幾何（中心線・左右構成点・道路端・断面高・3次元座標）を
決定論的に生成する「Cross Section Generator」をproduction codeとして確立する。

## 責務
確定済み/入力済みの以下から、stationごとの横断面XYZを決定論的に生成する。
- Alignment Solverのstation pose（center XY / tangent / normal）
- 幅員情報（外部入力）
- 横断勾配情報（外部入力）
- 中心標高情報（利用可能な縦断標高 or explicit input）

**重要:** ここでの「3次元座標」は数値幾何データ。Three.js等の3D表示・メッシュ・STLは含まない。

## 非対象
- 拡幅を設計基準から決定するRule（NEEDS_RESEARCH、実装禁止）
- 横断勾配・片勾配の設計Rule（X3 Rule Engineの判定責務、侵食しない）
- Vertical Alignment Solverの新設
- 橋梁構造設計（主桁配置・桁高・支承・床版厚・横桁・構造断面）
- Y字橋 / JCT / Alignment Graph / 複数中心線 / 分岐Cross Section
- Drawing Engine / 3D rendering / STL / Apollo redesign / SPACER解析

## 方針
- Geometry数式はX4-A Kernel / X4-B Alignment Solverのcanonical APIのみ利用
- 既存LINER cross section実装のsource-of-truthをcanonical化・adapter化
- 二重実装禁止
- Cross Section Generatorに道路構造令Rule判定を埋め込まない

## Step構成
| Step | 内容 | ブランチ |
|------|------|----------|
| P00 | Existing Cross Section Audit / Scope Freeze | liner-x4c-p00-audit |
| P01 | Cross Section Model / Contracts | liner-x4c-p01-model |
| P02 | Width / Crossfall Evaluation | liner-x4c-p02-width-crossfall |
| P03 | Local Section Geometry | liner-x4c-p03-local-geometry |
| P04 | Global XYZ / Elevation Adapter | liner-x4c-p04-global-xyz |
| P05 | Rule Engine / Road→Bridge Adapters | liner-x4c-p05-adapters |
| P06 | Project Replay / Regression | liner-x4c-p06-verification |
| P07 | Completion / X4-D Gate | liner-x4c-p07-x4d-gate |

## 成果物
- [X4C_PRECHECK_REPORT](./X4C_PRECHECK_REPORT.md)
- [X4C_SCOPE](./X4C_SCOPE.md)
- [CROSS_SECTION_CODE_INVENTORY.csv](./CROSS_SECTION_CODE_INVENTORY.csv)
- [CROSS_SECTION_CANONICALIZATION_PLAN](./CROSS_SECTION_CANONICALIZATION_PLAN.md)
- [CROSS_SECTION_CONTRACT](./CROSS_SECTION_CONTRACT.md)
- [WIDTH_CROSSFALL_CONVENTIONS](./WIDTH_CROSSFALL_CONVENTIONS.md)
- [ELEVATION_PIVOT_CONTRACT](./ELEVATION_PIVOT_CONTRACT.md)
- [X4C_FILE_IMPACT_MATRIX.csv](./X4C_FILE_IMPACT_MATRIX.csv)