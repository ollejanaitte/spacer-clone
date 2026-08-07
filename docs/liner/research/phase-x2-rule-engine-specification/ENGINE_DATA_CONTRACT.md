# ENGINE_DATA_CONTRACT — Rule Engine ↔ Geometry Engine

## Contract

| Field | Type | Unit | Producer | Consumer | Required |
|-------|------|------|----------|----------|----------|
| road_class | string | - | Input | Rule Engine | YES |
| design_speed | integer | km/h | Input | Rule Engine | YES |
| curve_radius | float | m | Geometry Engine | Rule Engine | conditional |
| superelevation | float | % | Input | Rule Engine | conditional |
| grade | float | % | Geometry Engine | Rule Engine | conditional |
| station | string | - | Geometry Engine | Both | conditional |
| alignment_type | string | - | Input | Geometry Engine | YES |
