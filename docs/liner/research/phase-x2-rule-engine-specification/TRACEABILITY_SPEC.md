# TRACEABILITY_SPEC — Traceability Specification

## Trace Chain

```
SOURCE_DOCUMENT → EVIDENCE → STANDARD_RULE → INPUT → EVALUATION → FORMULA/LOOKUP → OUTPUT → VALIDATION → GEOMETRY → DRAWING/REPORT → BRIDGE → APOLLO
```

## Trace Record Fields

| Field | Description | Required |
|-------|-------------|----------|
| trace_id | 一意識別子 | YES |
| rule_id | 対象Rule | YES |
| source_evidence_id | 証跡ID | YES |
| input_snapshot | 入力値 | YES |
| evaluation_result | 評価結果 | YES |
| formula_id | 使用Formula | conditional |
| output_snapshot | 出力値 | YES |
| validation_result | 照査結果 | YES |
| downstream_consumer | 下流Consumer | YES |
| timestamp_policy | 時刻印 | RECOMMENDED |
| rule_version | Rule Version | YES |
