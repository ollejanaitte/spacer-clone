# P5-2 Schema / Type Validation Summary

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 PR P5-2
> **Baseline main SHA:** `a12930c489535e6e451f8bb177bc45f9ef797f1a`

## Verdict

```
P5_2_OVERALL_VERDICT: PASS
CANONICAL_SCHEMA: FROZEN (schemas/contracts/v0.1/common-bridge-data-model.schema.json)
CANONICAL_TYPES: FROZEN (frontend/src/contracts/commonBridgeDataModel.ts)
SCHEMA_VERSION: 1.0.0
SCHEMA/TYPE SEMANTIC PARITY: PASS (schema generated from zod runtime = single source of truth)
UNIT TESTS: 14/14 PASS
TYPECHECK: PASS (tsc -b)
FRONTEND REGRESSION: PASS (338 files / 2658 tests)
```

## Deliverables

| Artifact | Path |
|----------|------|
| Canonical JSON Schema | `schemas/contracts/v0.1/common-bridge-data-model.schema.json` |
| Canonical TS types | `frontend/src/contracts/commonBridgeDataModel.ts` |
| Runtime zod schema (source of truth) | `frontend/src/contracts/runtime/schemas/commonBridgeDataModel.ts` |
| Document kind | `frontend/src/contracts/documentKind.ts` (+`common-bridge-data-model`) |
| Schema identity / version matrix | `frontend/src/contracts/contractVersionRegistry.ts` |
| Schema registry registration | `frontend/src/contracts/runtime/jsonSchema/definitions.ts` |
| Semantic metadata | `frontend/src/contracts/runtime/jsonSchema/semanticMetadata.ts` |
| Validator | `phase5/tools/validate_common_bridge_model.py` |
| Unit tests | `phase5/tools/tests/test_common_bridge_model.py` |

## Schema coverage (12 layers + envelope)

`metadata`, `alignments`, `bridgeGeometry` (spans/supports/girders/gridPoints/deck/crossMembers),
`structuralModel` (nodes/members), `materials`, `sections`, `loads` (loadCases/loadCombinations),
`analysisReference` (status NOT_AVAILABLE allowed), `design`, `reportSpecification`,
`drawingSpecification` (sheets/items), `traceability`, `resolutionRegistry`
(conflicts/humanConfirmations/holds).

## Value states

`CONFIRMED`, `HUMAN_CONFIRMATION_REQUIRED`, `CONFLICT`, `HOLD_INSUFFICIENT_SOURCE`,
`NOT_APPLICABLE`, `NOT_AVAILABLE` — discriminated union `resolvedValueSchema`.

## Schema requirements implemented

- `schemaVersion` required (SemVer; canonical `1.0.0`; unsupported major rejected)
- `additionalProperties` policy explicit (strict envelope; documented entity field bags)
- required/optional explicit; nullable meaning explicit (`selected: null` in conflicts)
- stable ID reference integrity (semantic checks)
- conflict / HCR / HOLD representation
- no NaN/Infinity (semantic non-finite check; `finiteNumberSchema` on numeric values)
- units explicit (canonical unit + sourceUnit preserved)
- analysisReference empty state allowed (NOT_AVAILABLE)

## Test results (14/14)

| # | Test | Result |
|---|------|--------|
| 1 | minimal valid bridge | PASS |
| 2 | Reference-like valid bridge | PASS |
| 3 | duplicate ID rejection | PASS |
| 4 | broken reference rejection | PASS |
| 5 | unknown schema version rejection | PASS |
| 6 | conflict value valid | PASS |
| 7 | conflict without sources invalid | PASS |
| 8 | HCR value valid | PASS |
| 9 | HOLD value valid | PASS |
| 10 | missing required metadata rejection | PASS |
| 11 | AnalysisReference empty allowed | PASS |
| 12 | JSON serialization-safe values | PASS |
| 13 | legacy project unaffected | PASS |
| 14 | existing project schema backward compatibility | PASS |

## Regression

- `npx tsc -b --pretty false`: PASS
- `npx vitest run`: 338 files / 2658 tests PASS
- Contracts suite: 13 files / 272 tests PASS
- Frontend source hygiene + Japanese-string checks: baseline unchanged
- Existing `project.schema.json`, `frontend/src/types.ts`, `bridge-definition.schema.json`:
  unchanged (backward compatible); only `documentKind` enum additions in contract
  schemas (required to admit the new document kind).
