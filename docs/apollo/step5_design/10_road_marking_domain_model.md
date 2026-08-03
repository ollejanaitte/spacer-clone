# 10 — Road Marking Domain Model

## Entities (v1)
CENTER_LINE · LANE_BOUNDARY · EDGE_LINE (left/right)

## Fields
- enabled bool
- width_m
- offset_from_center_m (signed +Y right)
- dash pattern: SOLID | DASHED (visual only)
- elevationOffset_m above pavement top (default small epsilon e.g. 0.002)

## DEC-S5-0004 (DECIDED_DRAFT)
**Visualization-only** in v1 — exclude from structural STL by default (`includeRoadMarkings: false`). Quantity does not invent paint volume unless later decided.
