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

Current readiness from MiMo audit:

```text
PR39_SPLIT_DECISION: ACCEPTED
PR39A_READINESS: GO
PR39B_READINESS: GO_AFTER_PR39A
PR39C_READINESS: CONDITIONAL_GO
PR40_READINESS: NOGO
PR41_READINESS: NOGO
PR42_READINESS: NOGO
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
- do not start PR-40..42 implementation until IF3 gates are verified
- treat `.venv` setup failure as environment setup, not implementation failure, and resolve before full-test gate

## PR Readiness Rules

| PR | Current readiness | Required before GO |
| --- | --- | --- |
| PR-39A | GO | Implement builder annotations, crossfall, vertical curve, coordinate table, and DXF layer presets |
| PR-39B | GO_AFTER_PR39A | Implement dimensions and section dimension tests on top of PR-39A layer/settings baseline |
| PR-39C | CONDITIONAL_GO | Implement Road-owned bridge/structure markers only where Road source data exists; otherwise defer |
| PR-40 | NOGO | Verify IF3 and define PRINT source contract, catalog, and staleness handling |
| PR-41 | NOGO | Verify SP1 neutral/shared Frame drawing path and IF3 |
| PR-42 | NOGO | Verify IF3 viewer input, staleness, and result adapter contract |

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
PHASE6_SEQUENCE_VERDICT: PR39_SPLIT_ACCEPTED_AND_PR39A_READY
```
