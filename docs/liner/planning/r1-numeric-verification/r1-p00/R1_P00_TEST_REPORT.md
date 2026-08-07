# R1_P00_TEST_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P00
- **Test command**: `npx vitest run src/liner/core/verification`

## Focused tests

| File | Coverage | Result |
|---|---|---|
| `__tests__/types.test.ts` | classification valid/invalid, unit valid/invalid, coordinate system valid/invalid, review status, rounding policy | PASS |
| `__tests__/units.test.ts` | m/mm conversion, dxf mapping, unit comparability, group mismatch | PASS |
| `__tests__/rounding.test.ts` | precision rounding, negative zero, boundary values, policy separation (report/ui/serialization), invalid policy | PASS |
| `__tests__/tolerance.test.ts` | absolute/relative/exact, NaN/Infinity rejection, unit mismatch rejection, coordinate-system mismatch rejection, verdict helpers | PASS |
| `__tests__/coordinate.test.ts` | coordinate system validation, sign convention validation (all six), aggregation | PASS |
| `__tests__/provenance.test.ts` | missing provenance fail-closed, invalid review_status, invalid source_unit, non-finite source_value, authoritative/unresolved helpers | PASS |
| `__tests__/verificationMetadata.test.ts` | valid metadata, empty id/feature, unknown classification, explicit UNKNOWN, non-finite expected, null expected, invalid tolerance, missing comparison rule, unresolved provenance fail-closed, rounding policy | PASS |

**Total: 79 tests, 7 files — ALL PASS.**

## Required coverage checklist

### Types / schema
- valid classification — PASS
- invalid classification rejection — PASS
- valid unit — PASS
- invalid unit rejection — PASS
- valid coordinate system — PASS
- invalid coordinate system rejection — PASS
- unknown handling — PASS
- missing provenance fail-closed — PASS

### Tolerance
- absolute tolerance — PASS
- relative tolerance — PASS
- exact comparison — PASS
- NaN rejection — PASS
- Infinity rejection — PASS
- unit mismatch rejection — PASS
- coordinate-system mismatch rejection — PASS

### Rounding
- internal precision vs display rounding separation — PASS
- serialization precision — PASS
- negative zero — PASS
- boundary values — PASS

### Backward compatibility
- legacy fixtures untouched (existing liner/core golden tests) — PASS (311 tests)
- existing verification tests unchanged — PASS (20 tests)
- existing project load unaffected — PASS (full suite)

## Regression

- `npm run typecheck` — PASS
- `npm run lint` — my new files pass hygiene + Japanese-string checks (pre-existing
  unrelated violations in Apollo/viewer files exist on baseline; none caused by R1-P00).
- `npx vitest run src/liner/core` — 311 tests PASS
- `npx vitest run src/verification` — 20 tests PASS
- `npm run build` — PASS
- `npm test` (full frontend) — 2498 tests / 320 files PASS (after provisioning the
  repository `.venv` for the Python-dependent golden suite)

## Note

- The Python-dependent golden suite required the repo `.venv`; a symlink to the
  main-worktree venv was created locally (environment-only, not committed) so the
  regression suite could run. A side-effect regeneration of
  `docs/apollo/step4c_appurtenance_haunch/evidence/*.json` was reverted to the committed
  state (`git restore`) after the run.
