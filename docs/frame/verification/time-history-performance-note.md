# Linear Time History Performance Note

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE - EXISTING TIME-HISTORY EXTENSION
> Time-history is an existing extension, not one of the six baseline module labels. Current facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md); target result binding, persistence, gaps, and acceptance remain governed by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md).
<!-- DOC-AUTHORITY:END -->

## Current Readiness Level

The TH-7 preview is intended for internal smoke testing with small and medium projects. It is not a benchmarked production performance release.

## Smoke Fixtures

- Small: `examples/time-history-small.json`, 2 nodes, 1 member, 11 samples.
- Medium: `examples/time-history-medium.json`, 3 nodes, 2 members, 21 samples.

Both fixtures are intentionally short so that UI state transitions, API envelopes, table rendering, and chart rendering can be verified quickly during regression checks.

## Frontend Display Limits

- Result table display is capped at 100 rows.
- Chart display is down-sampled to about 1000 points.
- The source response arrays are not mutated by either display limit.

## Production Follow-up

Before wider release, add measured benchmarks for:

- Small, medium, and large structural models.
- Short, moderate, and long ground motion records.
- API response size and serialization time.
- Frontend render time for result table and chart states.
- Browser memory behavior after repeated analysis runs.

The current preview should not be used as evidence that large production records meet performance targets.
