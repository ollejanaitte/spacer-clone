# 08 — Scope Boundary (Step 5)

## Step boundaries

| Step | Role |
|------|------|
| 5-1 | Verification / scope / design-doc **preparation** (this package) |
| 5-2 | Full design documents + completion check |
| 5-3 | Implementation + verification |
| 4-D〜H | Separate Apollo packages — not Step 5 substitutes |

## IN SCOPE (Step 5 overall, for 5-2/5-3 design & impl)

- Complete editable sample preset + apply transaction
- Guided Mode on WorkflowStateModel control plane
- Pavement / road-marking domain + visualization
- 3D structural audit corrections (topology/section representation as decided)
- Cross beam vs cross frame / sway bracing responsibility clarity
- Lateral bracing L-angle representation (after ER + decision)
- Haunch / appurtenance sample integration
- Sample end-to-end generation path
- Related quantity/load updates **if** required by new entities
- E2E / user acceptance under development-only labels

## OUT OF SCOPE

- Formal bridge design approval / OK/NG member checks
- Fabrication detail, connections, fatigue, weld/bolt design
- Formal standard adoption as numeric truth
- Curve / skew / widening unless separately decided
- Photorealistic rendering
- Direct copy of legacy Apollo assets
- Step 4-E local CRS binding implementation (may document dependency)
- Step 4-G report/drawing/ZIP (may document dependency)

## Formal boundary (always)

DEVELOPMENT_RESULT_LABEL: UNVERIFIED_DEVELOPMENT_ONLY  
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED  
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED  
STRUCTURAL_ENGINEERING_CORRECTNESS: NOT_AUTHORIZED by GUI or sample alone
