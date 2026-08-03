# Step 4-C4 — Dead Load Model

## Cases

- `DEAD_APPURTENANCE`
- `DEAD_RC_HAUNCH`

Direction: `-Z`. Segment `startStation`/`endStation` preserved (no silent full-span expansion).

## Formulas

- `w = A * γ` [kN/m]
- `Ptotal = w * L` [kN]
- Missing γ → load `NOT_AVAILABLE` (excluded from analysisEligibleLoads)

Source: C1 geometry kernel only.
