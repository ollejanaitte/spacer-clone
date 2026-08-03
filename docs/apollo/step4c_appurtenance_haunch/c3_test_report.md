# Step 4-C3 Test Report

## Targeted

- `frontend/src/apollo/__tests__/step4c3AppurtenanceHaunchQuantity.test.ts`
- Legacy GOLD-QTY-001/002 regression via `quantityModel.test.ts`

## Coverage

- Schema bump 1.1.0-development
- Formula parity with C1 kernel
- Null unit weight → weight NOT_AVAILABLE
- EXPLICIT_NONE invents nothing
- Haunch not double-counted into RC_DECK
- CSV/JSON + STALE export guard

## Authorization

NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED (unchanged)
