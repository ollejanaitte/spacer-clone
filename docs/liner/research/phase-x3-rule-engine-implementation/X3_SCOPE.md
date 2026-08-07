# Phase X3 Scope

## 目的
X2仕様を正本として、READY_FOR_IMPLEMENTATION 18 Ruleを段階的実装。

## 実装順序
1. Core Infrastructure (RuleRegistry, Loader, Evaluator, Validator, Trace)
2. Vertical Slice (1-3 Rules: 道路区分, 設計速度, 最小曲線半径)
3. Core Road Rules (設計車両, 車線幅員, 中央帯, 路肩, 横断勾配)
4. Alignment Rules (片勾配, 視距, 縦断勾配, 縦断曲線, 緩和区間, 例外)
5. Geometry/Road-Bridge Interfaces
6. Integration/Regression

## 対象外
- NEEDS_RESEARCH: 曲線長, 拡幅
- BLOCKED: 建築限界
- 曲線橋 / Y字橋 / JCT / Apollo / SPACER / 上部工 / 3D実装