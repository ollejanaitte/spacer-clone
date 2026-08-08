# VALIDATION_SPEC — Validation Specification

## Severity Levels

| Level | Description | Handling |
|-------|-------------|----------|
| INFO | 参考情報 | 表示のみ、計算続行 |
| WARNING | 設計可能だが注意 | ユーザー確認後続行可能 |
| ERROR | Rule違反 | ユーザー確認が必要。計算続行可能 |
| FATAL | 計算続行不可 | 入力不足・矛盾で停止 |
| NOT_APPLICABLE | Rule対象外 | スキップ |
| UNRESOLVED | 仕様未確定 | 実装保留 |

## 各RuleのValidation挙動

| Rule | missing_input | invalid_type | out_of_range | rule_violation |
|------|--------------|--------------|-------------|----------------|
| X2-R-001 道路区分 | ERROR | ERROR | WARNING | ERROR |
| X2-R-002 設計速度 | ERROR | ERROR | WARNING | WARNING |
| X2-R-007 最小曲線半径 | ERROR | ERROR | WARNING | ERROR (R<規定値) |
| X2-R-009 片勾配 | WARNING | ERROR | WARNING | ERROR |
| X2-R-010 視距 | WARNING | ERROR | WARNING | ERROR (視距不足) |
| X2-R-011 縦断勾配 | WARNING | ERROR | WARNING | WARNING (勾配超過) |
| X2-R-012 縦断曲線 | WARNING | ERROR | WARNING | WARNING |
| X2-R-013 横断勾配 | WARNING | ERROR | WARNING | WARNING |
