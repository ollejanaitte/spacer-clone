# Phase 6 Scope Matrix

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT

## PR Scope

| PR | In scope | Out of scope | Depends on |
| --- | --- | --- | --- |
| PR-39 Road GDRAW completeness | Road formal drawing enhancements, dimensions, coordinate table, bridge markers, DXF parity | Frame PRINT, Frame DRAFT, Viewer adapters, persisted drawing docs | P5, SP1_PARTIAL_ACCEPTABLE_FOR_PR39 |
| PR-40 Frame PRINT completeness | report/CSV/PDF catalog for valid Frame result outputs | Road GDRAW changes, formal Frame DRAFT, Viewer session migration | IF3_PARTIAL_BLOCKING_PR40_PR41_PR42 means NOGO until verified |
| PR-41 formal Frame DRAFT | Frame formal drawing builders and DXF/print where supported | Road builder mutation, PRINT catalog, Viewer adapter replacement | SP1 neutral/shared Frame path and IF3 both unverified: NOGO |
| PR-42 Viewer target adapters/staleness/output UI | Viewer consumes target Frame/result state and reports staleness | Solver changes, result recomputation in adapter, output visual release claim | IF3 viewer contract unverified: NOGO |

## P6-D to PR Mapping

| D-step | PR | Output |
| --- | --- | --- |
| P6-D01 | all | planning freeze and readiness baseline |
| P6-D02 | PR-39 | GDRAW scope confirmation |
| P6-D03 | PR-39 | GDRAW/DXF implementation design |
| P6-D04 | PR-40 | PRINT implementation design |
| P6-D05 | PR-41 | Frame DRAFT implementation design |
| P6-D06 | PR-42 | Viewer implementation design |
| P6-D07 | all | validation plan |
| P6-D08 | all | readiness gate |

## Road GDRAW Candidate Scope

| Feature | Status from current planning evidence | PR-39 decision |
| --- | --- | --- |
| line drawing style/labels/extensions | PARTIAL | Implement supported semantics |
| section drawing style/labels/extensions | PARTIAL | Implement supported semantics |
| skew angle | NOT_IMPLEMENTED in D02 source | Design in P6-D03; include only if source geometry stable |
| coordinate table | PARTIAL | Improve formatting/columns deterministically |
| line dimensions | PARTIAL/UNKNOWN; `alignmentSegmentDimensions.ts` exists | Verify current capability, then complete or extend |
| section dimensions | UNKNOWN | Design helper and tests before implementation |
| curve annotations | PARTIAL | Add source-backed annotations only |
| vertical curve annotations | NOT_IMPLEMENTED/PARTIAL | Add only from authoritative profile data |
| crossfall slope display | NOT_IMPLEMENTED in D02 source | Add where template values exist |
| bridge markers | PLACEHOLDER/PARTIAL | Add stable structure markers if bridge source IDs exist |
| DXF parity | COMPLETE for Phase5 primitives | Extend mapper/layers for new primitives |

## Non-Scope Guardrails

- No schema version bump unless a separate approval document authorizes it.
- No Road-to-Frame apply or migration work.
- No final visual release claim while OD8-04 is open.
- No source-of-truth mutation from any output adapter.
- No PR-40/41/42 implementation GO until IF3 evidence is verified.

```text
PHASE6_SCOPE_VERDICT: DRAFT_READY_WITH_MIMO_FINDINGS
```
