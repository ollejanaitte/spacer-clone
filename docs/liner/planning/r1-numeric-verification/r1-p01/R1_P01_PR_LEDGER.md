# R1_P01_PR_LEDGER

- **Date**: 2026-08-07
- **Base for all PRs**: `research/liner-r1-planning`
- **Status**: all MERGED

| Step | PR | Branch | Commit (head) | Merge commit | Base SHA before | Base SHA after | files | dataset rows | unresolved | tests | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P01-00 | #448 | research/liner-r1-p01-00-freeze | 237dfae | 2c81b05 | 2bdda83 | 2c81b05 | 6 docs | 0 | 0 | n/a (docs) | PASS |
| P01-01 | #449 | research/liner-r1-p01-01-schema | 4eada20 | ef34c8c | 2c81b05 | ef34c8c | 8 (schema+validation+manifest+index+tests+report) | 0 | 0 | 25 | PASS |
| P01-02 | #450 | research/liner-r1-p01-02-alignment-profile | 75ea4a2 | e206161 | ef34c8c | e206161 | 4 (dataset+aggregate+test+report) | 28 | 0 | 32 | PASS |
| P01-03 | #451 | research/liner-r1-p01-03-bridge-ldist | 756df7d | 669bebc | e206161 | 669bebc | 4 (dataset+aggregate+test+report) | 30 | 0 | 39 | PASS |
| P01-04 | #452 | research/liner-r1-p01-04-haunch-hoso-drawing | 46827b9 | eb8928c | 669bebc | eb8928c | 5 (dataset+aggregate+unresolved+test+reports) | 9 | 2 | 45 | PASS |
| P01-05 | (this PR) | research/liner-r1-p01-05-integration | (head) | (merge) | eb8928c | (final) | 6+ (loader+mapping+index+integration test+final docs) | 67 total | 2 | 53 | PASS |

## Totals

- Dataset: 67 reference rows (golden-usable: CROSS_CHECKED/APPROVED)
- Unresolved: 2 (drawing/dxf coordinate)
- PRs merged to `research/liner-r1-planning`: 5 (P01-00..P01-04) + P01-05
- Main PRs: 0. Main merges: 0. Force pushes: 0.
