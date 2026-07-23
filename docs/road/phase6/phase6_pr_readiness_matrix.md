# Phase 6 PR Readiness Matrix

**Date:** 2026-07-23
**Status:** START_CONDITIONS_UPDATED

| PR | Readiness | Conditions / blocker |
| --- | --- | --- |
| PR-39A Road GDRAW annotations/layers | GO | Branch `phase6/pr39-road-gdraw` exists; P6-D03 decisions resolved by final design; validation gate passed before implementation start |
| PR-39B Road GDRAW dimensions | GO_AFTER_PR39A | Depends on PR-39A layer/settings baseline; use existing `DrawingDimension` and extend `alignmentSegmentDimensions.ts` |
| PR-39C Road bridge/structure markers | CONDITIONAL_GO | Defer if Road source data does not distinguish abutment/girder/structure range |
| PR-40 Frame PRINT | NOGO | IF3 must be verified and PRINT source contract/catalog/staleness handling must exist |
| PR-41 Frame DRAFT | NOGO | SP1 neutral/shared Frame drawing path and IF3 must be verified |
| PR-42 Viewer adapters | NOGO | IF3 viewer input/staleness/result adapter contract must be verified |

## Cross-Cutting Status

```text
SP1_STATUS: SP1_PARTIAL_ACCEPTABLE_FOR_PR39
IF3_STATUS: IF3_PARTIAL_BLOCKING_PR40_PR41_PR42
OD8_04_STATUS: OPEN_NONBLOCKING_FOR_IMPLEMENTATION
VENV_FAILURE_CLASSIFICATION: ENVIRONMENT_SETUP_MISSING
PYTHON_ENV_SETUP: COMPLETE
FULL_TEST_GATE: PASS
PR39_SPLIT_DECISION: ACCEPTED
```

OD8-04 allows semantic implementation and controlled visual test prep, but final visual release claims remain blocked.

## PR-39 Split

```text
PR39_SPLIT_DECISION: ACCEPTED
IMPLEMENTATION_BRANCH: phase6/pr39-road-gdraw
MERGE_ORDER: PR-39A -> PR-39B -> PR-39C
```

- PR-39A: builder annotations, crossfall, vertical curve, coordinate table, DXF layer presets.
- PR-39B: dimensions, section dimensions, dimension tests.
- PR-39C: Road-owned bridge / structure marker completion; may be deferred if source data is insufficient.
