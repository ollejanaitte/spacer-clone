# ENGINE_API — Rule Engine API Specification

## Endpoint: evaluate

### Request
```json
{
  "version": "1.0",
  "project_context": {"road_class": "第1種第1級", "design_speed": 120},
  "inputs": {"curve_radius": 710, "superelevation": 6},
  "geometry_context": {"alignment_type": "circular", "station": "10+00.000"},
  "rule_ids": ["X2-R-001", "X2-R-007"]
}
```

### Response
```json
{
  "version": "1.0",
  "results": [
    {"rule_id": "X2-R-001", "output": "第1種第1級", "validation": "PASS", "severity": "INFO"},
    {"rule_id": "X2-R-007", "output": "最小曲線半径710m", "validation": "PASS", "severity": "INFO"}
  ],
  "warnings": [],
  "errors": [],
  "trace": [{"rule_id": "X2-R-001", "evidence": "EV-011", "source_page": "p138-139"}]
}
```
