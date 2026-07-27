# Test Responsibility Matrix — AP-00 P03

**Authority:** AP-00 / P03  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0005

## Purpose

Assign validation ownership for Apollo Phase 1 modules so AP-* PRs know what to test, where helpers live, and what is forbidden in fixtures.

## Module matrix

| Module / area | Owner PR | Test location | Helpers | Forbidden in tests |
|---------------|----------|---------------|---------|-------------------|
| Feature flag (`featureFlag.ts`) | AP00-P01 | `__tests__/featureFlag.test.ts` | — | Claiming flag ON by default |
| Entry guard (`entryGuard.ts`) | AP00-P01 | `__tests__/entryGuard.test.ts` | — | Workspace body exposure when OFF |
| Phase 1 shell (`ApolloPhase1Shell.tsx`) | AP00-P01 | `__tests__/ApolloPhase1Shell.test.tsx` | — | Production design-input UI |
| Scope guard (`phase1ScopeGuard.ts`) | AP00-P02 | `__tests__/phase1ScopeGuard.test.ts` | `testing/phase1Fixtures.ts` | Golden bridge dimensions |
| Numeric authority (`numericAuthorityGuard.ts`) | AP00-P02 | `__tests__/numericAuthorityGuard.test.ts` | `testing/numericFixtures.ts` | `GOLDEN_EXPECTED` registration |
| Error catalog (`errors.ts`) | AP00-P02 | `__tests__/errors.test.ts` | `testing/assertGuardResult.ts` | Renaming stable `AP00_*` codes |
| Test helpers (`testing/*`) | AP00-P03 | `__tests__/testingHelpers.test.ts` | — | ADOPTED without `decisionId` |
| Source hygiene script | AP00-P03 | `__tests__/apolloSourceHygiene.test.ts` | — | Analyzer parity claims |
| Suite discoverability | AP00-P03 | `__tests__/apolloSuite.test.ts` | — | — |

## Helper responsibilities

| Helper | Responsibility |
|--------|----------------|
| `buildInScopePhase1Archetype()` | Canonical IN_SCOPE `Phase1BridgeScopeInput` |
| `buildPhase1ArchetypePreset()` | Named positive/negative archetype variants |
| `buildPlaceholderNumericRecord()` | Safe PLACEHOLDER `NumericValueRecord` |
| `buildUserProvidedNumericRecord()` | Non-authoritative user shell record |
| `buildSemanticOnlyRegistration()` | RB harness input without golden numerics |
| `assertGuardOk()` | Pass assertion for `ApolloGuardResult` |
| `assertGuardFailsClosed()` | Fail-closed assertion with optional codes |
| `assertGuardIssueCodes()` | Stable error code containment |

Import path for downstream AP-* tests:

```typescript
import {
  buildInScopePhase1Archetype,
  buildPlaceholderNumericRecord,
  assertGuardFailsClosed,
} from "../testing";
```

## PR-type responsibilities

| PR type | Required tests |
|---------|----------------|
| AP-00 guard change | Update table-driven cases; run full `src/apollo` suite |
| AP-00 docs-only | No test run required; merge gate doc review |
| AP-01 schema | Extend helpers; no golden numerics |
| AP-02 validation | Integration tests calling P02 guards |
| AP-03+ workspace | Shell tests; reuse archetype fixtures |

## Verification commands (worker baseline)

```bash
cd frontend
npm run typecheck
npm test -- --run src/apollo
npm run lint
npm run build
node ../scripts/check_apollo_source_hygiene.mjs src/apollo
```

## Cross-references

- [validation_strategy.md](validation_strategy.md)
- [merge_gate.md](merge_gate.md)
- [source_hygiene_gate.md](source_hygiene_gate.md)
