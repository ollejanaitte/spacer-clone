# Status Semantics

Implementation: `frontend/src/apollo/workflow/evaluators.ts`.

## Status priority (highest wins for the primary badge)

```
ERROR > BLOCKED > STALE > INCOMPLETE > WARNING > NOT_AUTHORIZED >
RECOMMENDED > AVAILABLE > READY > COMPLETE > NOT_STARTED > OUT_OF_SCOPE
```

COMPLETE is never overridden to NOT_AUTHORIZED; instead COMPLETE carries the
`NOT_AUTHORIZED` **badge** (development completion without formal grant).

## Status meaning

| Status | Meaning | Common conditions |
|--------|---------|-------------------|
| NOT_STARTED | prerequisites unsatisfied (downstream) | active prerequisite not COMPLETE/READY/… |
| AVAILABLE | empty input, actionable | inputState=EMPTY |
| RECOMMENDED | single recommended next action | recommended-override (max 1) |
| INCOMPLETE | partial input | inputState=PARTIAL |
| BLOCKED | cannot proceed now | capability PLANNED/UNAVAILABLE, invalid input, blocking diagnostic |
| READY | valid input, result not generated | inputState=VALID + resultState=NOT_GENERATED |
| STALE | input changed after generation | resultState=STALE (checksum moved) |
| WARNING | non-blocking warning attached | any warning diagnostic |
| ERROR | persisted data corrupted / evaluation failed | `corruptedEvidence` |
| COMPLETE | criterion satisfied | evidence.complete + current |
| OUT_OF_SCOPE | unsupported scope | capability=OUT_OF_SCOPE |

## Badges (secondary, never color-only)

`NOT_AUTHORIZED`, `DEVELOPMENT_ONLY`, `PARTIAL`, `STALE`, `LOCAL_CRS_LEGACY`,
`3D_DIMENSION_PLANNED`, `CAPABILITY_PLANNED`, `OUT_OF_SCOPE`, `WARNING`.

## Diagnostics (minimum set implemented)

| Code | Severity | Blocking | Condition |
|------|----------|----------|-----------|
| WF_INPUT_MISSING | info | no | input EMPTY |
| WF_INPUT_INVALID | error | yes | input INVALID |
| WF_PREREQUISITE_INCOMPLETE | info | no | active prerequisites not satisfied |
| WF_RESULT_NOT_GENERATED | info | no | VALID input, no result |
| WF_RESULT_STALE | warning | no | result STALE |
| WF_CHECKSUM_MISMATCH | warning | no | STALE (revision drift) |
| WF_SOURCE_MISSING | – | – | future source-missing cases |
| WF_SOURCE_DELETED | – | – | future |
| WF_CAPABILITY_PLANNED | error | yes | PLANNED stub |
| WF_CAPABILITY_UNAVAILABLE | error | yes | UNAVAILABLE |
| WF_UNSUPPORTED_SCOPE | error | yes | out-of-scope (e.g. GA drawings CONTINUOUS) |
| WF_EXECUTION_ERROR | error | yes | corrupted persisted data |
| WF_NOT_AUTHORIZED | info | no | COMPLETE (development only) |
| WF_LOCAL_CRS_WARNING | warning | no | local CRS / binding pending |
| WF_PARTIAL_SCOPE_WARNING | warning | no | PARTIAL capability |
| WF_3D_DIMENSION_PLANNED | warning | no | WF-11 dimension overlay (Step 4-F) |

## Recommended action

`resolveRecommendedStep()` returns **exactly one** recommended step:
1. first STALE producer (regeneration before new downstream work);
2. otherwise first AVAILABLE / READY / INCOMPLETE in registry order;
3. never ERROR / BLOCKED / OUT_OF_SCOPE / NOT_STARTED / COMPLETE.
