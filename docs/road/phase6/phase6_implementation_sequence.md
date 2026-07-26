# Phase 6 Implementation Sequence

**Date:** 2026-07-23
**Status:** PR39_SPLIT_ACCEPTED

## Ordered Sequence

```text
P6-D01 -> P6-D02 -> P6-D03 -> P6-D04 -> P6-D05 -> P6-D06 -> P6-D07 -> P6-D08
```

Implementation PR order:

```text
PR-39A Road GDRAW annotations/layers
  -> PR-39B Road GDRAW dimensions
  -> PR-39C Road bridge/structure markers
  -> PR-40 Frame PRINT
  -> PR-41 Frame DRAFT
  -> PR-42 Viewer adapters
```

PR-40..42 may prepare docs/fixtures in parallel only if IF3 contracts are not bypassed.

Current readiness after IF3-E:

```text
PR39_STATUS: COMPLETE
IF3_STATUS: IF3_A_THROUGH_E_PASS_FOR_SEMANTIC_GATES
PR40_READINESS: CONDITIONAL_GO
PR41_READINESS: NOGO
PR42_READINESS: CONDITIONAL_GO
```

## Branch Pattern

| Work | Suggested branch |
| --- | --- |
| docs freeze | `docs/phase6-planning-freeze` |
| PR-39A/B/C | `phase6/pr39-road-gdraw` |
| PR-40 | `feat/phase6-pr40-frame-print` |
| PR-41 | `feat/phase6-pr41-frame-draft` |
| PR-42 | `feat/phase6-pr42-viewer-adapters` |

## Step Tasks

| Step | Tasks |
| --- | --- |
| P6-D01 | approve scope docs, dependency posture, stop conditions |
| P6-D02 | reconcile D02 source with current repo evidence, update PR-39 candidate list |
| P6-D03 | decide dimension primitive/settings/DXF layer design and Road GDRAW tests; recheck `alignmentSegmentDimensions.ts` because it already exists |
| P6-D04 | define Frame PRINT catalog, CSV/PDF DTOs, stale-result blocking |
| P6-D05 | define Frame DRAFT sheets and shared drawing adapter imports |
| P6-D06 | define Viewer target adapter, staleness UI, rollback path |
| P6-D07 | create O8/G6 command/evidence matrix |
| P6-D08 | issue implementation GO/NOGO with unresolved dependency table |

## Implementation Cadence

For each PR:

- start from clean branch
- stage explicit paths only
- keep code/test/docs changes inside approved PR scope
- run typecheck and targeted tests before broad tests
- record commands and results in the PR completion note
- do not claim PASS for commands not run
- do not claim PR-40 catalog completeness until the PR-40 body lands
- treat OD8-04 as blocking final visual-release claims only
- treat `.venv` setup failure as environment setup, not implementation failure, and resolve before full-test gate

## PR Readiness Rules

| PR | Current readiness | Required before GO |
| --- | --- | --- |
| PR-39A | COMPLETE | Merged on main |
| PR-39B | COMPLETE | Merged on main |
| PR-39C | COMPLETE | Merged on main |
| PR-40 | CONDITIONAL_GO | IF3 A–E verified; implement PRINT catalog completeness while retaining stale/legacy fail-closed behavior |
| PR-41 | NOGO | Verify SP1 neutral/shared Frame drawing path |
| PR-42 | CONDITIONAL_GO | IF3 viewer adapters verified; complete remaining P6-D06 checklist items |

## Rollback

| PR | Rollback posture |
| --- | --- |
| PR-39A | previous Road output path remains available; disable new drawing settings if needed |
| PR-39B | remove dimension generation helpers or toggles; keep prior PR-39A annotations |
| PR-39C | defer/hide unsupported Road bridge marker additions; no source data rollback |
| PR-40 | previous report path remains available; hide incomplete report catalog |
| PR-41 | hide formal DRAFT entry point; no source data rollback |
| PR-42 | keep old Viewer adapter; no state migration rollback |

```text
PHASE6_SEQUENCE_VERDICT: PR39_COMPLETE_READY_FOR_PR40_CONDITIONAL
```
