# X4-B Scope

## 目的
X4-AのCanonical Geometry Kernelを唯一の幾何基盤として、単一中心線Alignmentを
組み立て・評価する上位層Alignment Solverを確立する。

## 対象
- backend/rule_engine/alignment/（新規上位層）
- backend Geometry Kernel（契約に基づき再利用）
- Rule Engine integration contract
- Road→Bridge Alignment contract

## 非対象
- 複数中心線 / 分岐 / Y字橋 / JCT / Alignment Graph
- 縦断Alignment（phase x4-bは平面Alignmentが主対象）
- 曲線長を決定する設計Rule（Curve Length Rule = NEEDS_RESEARCH）
- 拡幅 / 建築限界Rule
- GUI大規模改修 / Drawing / 3D / Apollo redesign / 上部工

## 境界
- Geometry数式はX4-A Kernelに委譲（二重実装禁止）
- Alignment Solverへ道路設計Ruleを埋め込まない
- Rule EngineへGeometry algorithmを埋め込まない

## 完了後gate
X4C_GATE_VERDICT算出。GO判定後もPhase X4-Cは自動開始しない。