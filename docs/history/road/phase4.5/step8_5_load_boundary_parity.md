# Phase 4.5 Step 8.5 — Load and Boundary Semantic Parity

> **Status:** Implemented (PR2)
> **Date:** 2026-07-11
> **Depends on:** Step 8.4 (PR1) semantic parity envelope and real-route golden integration

## Objective

Add semantic parity for implemented load and boundary domains on top of the Step 8.2–8.4 comparison core:

- `LoadCase` identity by normalized `name + type` (id is trace metadata only)
- `NodalLoad` matching on matched node keys + load case semantic key + 6DOF vector
- uniform `MemberLoad` matching on matched member endpoint key + load case + `coordinateSystem` + uniform vector
- Support fixity parity integration via existing `supportParity.ts` (no duplication)
- Load metrics, mismatches, ambiguities, diagnostics in `ParityReport`
- ID-independent and order-independent matching
- Explicit zero vs absent semantics
- Duplicate semantic candidate handling (`indeterminate`)
- Deterministic report / serializer integration

## Implemented Scope

| Area | Implementation |
| --- | --- |
| Normalized load types | `NormalizedLoadCase`, `NormalizedNodalLoad`, `NormalizedMemberLoad` in `types.ts` |
| Normalization | `normalize.ts` extends `NormalizedModel` with optional load arrays |
| Comparison | `loadParity.ts` — `compareLoadParity` |
| Integration | `compare.ts` wires load parity into `compareNormalizedModels` / `compareSemanticParity` |
| Category | `SemanticParityCategory` extended with `"load"` |
| Metrics | `LoadParitySummary` under `ParityReport.metrics.load` |
| Summary | `ParityReportSummary.loadEquivalent` |
| Serializer | Golden path canonicalization includes `loadCases`, `nodalLoads`, `memberLoads` trace paths |
| Tests | `loadParity.test.ts` + `fixtures/loadParityFixtures.ts` |
| Golden refresh | Existing `__golden__/semantic-parity/*.report.json` updated for new `metrics.load` block |

## Semantic Rules

### Load case identity

```
loadCaseSemanticKey = `${normalizeLoadCaseName(name)}:${type}`
```

- Array order and `id` differences do not affect equivalence when semantic keys match.

### Nodal load identity

Cross-model pairing key:

```
nodalTargetKey = `${matchedNodeKey}:${loadCaseSemanticKey}`
```

Vector comparison uses scalar tolerance (`DEFAULT_SEMANTIC_TOLERANCE.scalar`) on all six components.

### Member load identity

Cross-model pairing key:

```
memberTargetKey = `${matchedEndpointKey}:${loadCaseSemanticKey}:${coordinateSystem}`
```

- `local` and `global` are **not** converted silently; different basis → different target.
- Local-basis loads emit `SEMANTIC_MEMBER_LOAD_LOCAL_BASIS` warning (I/J reversal axis transform deferred to Step 8.6).

### Explicit zero vs absent

| State | Parity behavior |
| --- | --- |
| Absent on one side | `unmatchedLeft` / `unmatchedRight` mismatch (error) |
| Explicit zero item on both sides | Matched equivalent |
| Explicit zero on one side only | Unmatched (different) |

### Duplicate candidates

Multiple loads sharing the same target key on either side → `AmbiguousMatch` (`category: "load"`) → overall status `indeterminate`.

### Total applied load (M016-style)

`totalAppliedLoadLeft/Right` sums nodal and member vector magnitudes; mismatch is `blocker` severity.

## Non-Scope (unchanged)

- Springs, releases, local node coordinate systems
- Temperature / imposed displacement / non-uniform / point / load combination / body load parity
- Mass parity
- Analysis result parity
- CLI, UI, backend, schema migration, generator/adapter behavior changes
- LINER load mapping (`fromLinerBridge` still returns empty loads)

## LINER structure-only behavior

When `rightLoadsMapped: false` (or `leftLoadsMapped: false`), load parity:

- Emits info diagnostic `SEMANTIC_LOAD_PARITY_SKIPPED_*`
- Treats absent loads conservatively (present vs absent → `different`, not false equivalence)

## Files

| Path | Role |
| --- | --- |
| `semanticParity/types.ts` | Load normalized types, `LoadParitySummary`, category extension |
| `semanticParity/normalize.ts` | Load normalization helpers |
| `semanticParity/loadParity.ts` | Load comparison logic |
| `semanticParity/compare.ts` | Integration and status derivation |
| `semanticParity/serializer.ts` | Golden path updates for load trace paths |
| `semanticParity/index.ts` | Public exports |
| `bridgeDefinition/index.ts` | Re-exports |
| `semanticParity/__tests__/loadParity.test.ts` | Required test matrix |
| `semanticParity/__tests__/fixtures/loadParityFixtures.ts` | Deterministic fixtures |
| `__golden__/semantic-parity/*.report.json` | Updated envelopes with `metrics.load` |

## Tests

```bash
cd frontend && npm run test -- semanticParity
cd frontend && npm run test -- bridgeDefinition
cd frontend && npm run test:regression
cd frontend && npm run typecheck
```

### Required cases covered

1. Equivalent load cases with different ids and array orders
2. Nodal load mismatch by target node and by vector component
3. Member load mismatch by target member and by coordinateSystem
4. Load case mismatch / missing case
5. Explicit zero load item vs absent load item
6. Duplicate semantic candidate ambiguity
7. Order independence for load arrays
8. Tolerance-sensitive comparison for near-equal load values
9. Self-weight style nodal loads compared as normal load items
10. Support fixity parity remains passing alongside load comparison
11. LINER-style absent loads do not create false load equivalence

## Status precedence (unchanged)

`invalid` > `indeterminate` > `different` > `equivalent`

Load ambiguities contribute to `indeterminate`. Load mismatches and total-applied-load failure contribute to `different`.

## Known limitations

- Per-node self-weight distribution differences across mesh densities are not collapsed; total applied load and per-target pairing still apply.
- Local `coordinateSystem` member loads warn but do not apply axis transforms (Step 8.6 / member-force convention).
- Golden reports from Step 8.4 now include a `metrics.load` block; byte-identical stability preserved after regeneration.
- Real-route legacy ↔ BridgeDefinition parity status unchanged (`single-span-simple` remains `invalid` due to topology, not load).

## Next step

- **Step 8.6 / PR3:** Static and eigen analysis result parity on the same `ParityReport` contract.

## Document History

| Date | Change |
| --- | --- |
| 2026-07-11 | Step 8.5 PR2: load/boundary parity implementation, tests, docs, golden `metrics.load` refresh. |
