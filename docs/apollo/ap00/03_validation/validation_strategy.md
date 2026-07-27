# Validation Strategy — AP-00 P03

**Authority:** AP-00 / P03  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0005

## Purpose

Define how Apollo Phase 1 implementation PRs are validated before merge. P03 establishes **test responsibility**, **source hygiene**, and **merge gates** without introducing golden numerics or production validation pipelines (owned by AP-02).

## Scope (P03)

| In scope | Out of scope (later AP-*) |
|----------|---------------------------|
| Vitest suites under `frontend/src/apollo/` | Full workspace validation pipeline (AP-02) |
| Reusable test helpers in `frontend/src/apollo/testing/` | BSDD schema promotion tests (AP-01) |
| Fail-closed guard contract tests (P02) | Reference Bridge numeric harness (AP-17) |
| Source hygiene script for Apollo tree | E2E Apollo workspace flows (AP-03+) |
| PR merge checklist documentation | CI workflow wiring (supervisor / follow-up) |

## Validation layers

```text
L1  Unit — guard modules (scope, numeric authority, entry flag)
L2  Integration — shell + route gating (feature flag default OFF)
L3  Hygiene — forbidden parity claims; fixture ADOPTED metadata
L4  Merge gate — human checklist per AP-* PR (see merge_gate.md)
```

## Test runner entry points

From `frontend/`:

```bash
npm run typecheck
npm test -- --run src/apollo
npm run lint
npm run build
```

The meta suite `frontend/src/apollo/__tests__/apolloSuite.test.ts` documents discoverable AP-00 test modules.

## Fixture policy

| Policy | Detail |
|--------|--------|
| No golden expected numerics | DEC-S1-0011; use `SEMANTIC_ONLY` / `PLACEHOLDER` |
| IN_SCOPE archetype fixtures | Use `buildInScopePhase1Archetype()` — scope-contract constants only |
| PLACEHOLDER numerics | Use `buildPlaceholderNumericRecord()` |
| ADOPTED in negative tests | Must include `decisionId` + `sourceLocator` when asserting adoption guards |

## Source hygiene

Manual / CI-recommended check:

```bash
node scripts/check_apollo_source_hygiene.mjs frontend/src/apollo
```

See [source_hygiene_gate.md](source_hygiene_gate.md).

## Inherited constraints

- DEC-S1-0008 — narrow Phase 1 archetype
- DEC-S1-0004 — Target Standard NOT_SELECTED
- DEC-S1-0011 — GOLDEN_NUMERICS NOT_AUTHORIZED
- DEC-AP00-0004 — fail-closed scope and numeric guards

## Consumers

| AP-* | Usage |
|------|-------|
| AP-01 | Import guard helpers; extend numeric fixture builders |
| AP-02 | Wire validation pipeline to P02 guards |
| AP-03+ | Shell and workspace tests import archetype fixtures |

## Cross-references

- [test_responsibility_matrix.md](test_responsibility_matrix.md)
- [merge_gate.md](merge_gate.md)
- [P02 scope guard contract](../02_scope_guards/phase1_scope_guard_contract.md)
- [P02 numeric authority model](../02_scope_guards/numeric_authority_model.md)
- Step 1 [test_strategy.md](../../../step1/07_validation/test_strategy.md)
