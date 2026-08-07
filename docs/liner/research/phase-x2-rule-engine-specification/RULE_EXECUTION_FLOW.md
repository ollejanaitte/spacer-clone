# RULE_EXECUTION_FLOW — Rule Engine 実行Flow

## 実行パイプライン

```
Input
 ↓
1. Input Normalizer（単位正規化・型検証）
 ↓
2. Applicability Resolver（適用判定）
 ↓
3. Rule Evaluator（評価）
   ├── TABLE_LOOKUP（表参照）
   ├── DIRECT_FORMULA（計算）
   └── CONDITIONAL（条件判定）
 ↓
4. Constraint Validator（制約検証）
 ↓
5. Exception Resolver（例外解決）
 ↓
6. Warning/Error Generator（警告・エラー生成）
 ↓
7. Trace Recorder（トレース記録）
 ↓
Output
```

## 実行順序（dependency順）

| Order | Rule | Dependency | 備考 |
|-------|------|-----------|------|
| 1 | X2-R-001 道路区分 | - | 全Ruleの前提 |
| 2 | X2-R-002 設計速度 | X2-R-001 | |
| 3 | X2-R-003 設計車両 | - | |
| 4 | X2-R-007 最小曲線半径 | X2-R-002 | |
| 5 | X2-R-009 片勾配 | X2-R-007 | |
| 6 | X2-R-011 縦断勾配 | X2-R-002 | |
| 7 | X2-R-012 縦断曲線 | X2-R-011 | |
| 8 | X2-R-013 横断勾配 | - | |
| 9 | X2-R-004/005/006 幅員 | X2-R-001 | |
| 10 | X2-R-008 緩和区間 | X2-R-002 | |
| 11 | X2-R-010/014 視距 | X2-R-002 | |
| 12 | X2-R-015/016/017 | 幾何 | |
| 13 | X2-R-018 例外 | 各Rule | 最終段 |

## 境界

- Rule Engine: 評価・照査（order 1-13）
- Geometry Engine: 幾何計算（X2-R-008の座標・X2-R-015のLDIST等）
- Drawing/Report: 出力（下流）
