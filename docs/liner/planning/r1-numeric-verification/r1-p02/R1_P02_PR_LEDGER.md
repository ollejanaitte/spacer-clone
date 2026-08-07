# R1_P02_PR_LEDGER

- **Date**: 2026-08-07
- **Base for all PRs**: `research/liner-r1-planning`
- **Status**: all MERGED

| Step | PR | Branch | Merge commit | Base before | Base after | files | comparisons | pass | fail | not_comparable | tests | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P02-00 | #458 | research/liner-r1-p02-00-freeze | 6375e35 | 1eac7d1 | 6375e35 | 6 docs | 0 | 0 | 0 | 0 | n/a (docs) | PASS |
| P02-01 | #459 | research/liner-r1-p02-01-comparator | 1057fef | 6375e35 | 1057fef | 7 (engine+tests+doc) | 0 | 0 | 0 | 0 | 19 | PASS |
| P02-02 | #464 | research/liner-r1-p02-02-horizontal-station | eb4c88e | 1057fef | eb4c88e | 5 (fixtures+adapter+test+doc) | 14 | 11 | 0 | 3 | 25 | PASS |
| P02-03 | #467 | research/liner-r1-p02-03-profile-crossfall-height | b05ae25 | eb4c88e | b05ae25 | 4 (adapter+test+doc) | 14 | 11 | 0 | 3 | 31 | PASS |
| P02-04 | #468 | research/liner-r1-p02-04-reporting | 8ab6eff | b05ae25 | 8ab6eff | 6 (reporting+tests+docs) | 28 | 22 | 0 | 6 | 37 | PASS |
| P02-04R | — | — | — | — | — | — | — | — | — | — | — | NOT_EXECUTED (no bug) |
| P02-05 | (this PR) | research/liner-r1-p02-05-integration | (merge) | 8ab6eff | (final) | docs + BRANCH_STATUS | 28 | 22 | 0 | 6 | 37+ | PASS |

## Totals

- PRs merged to `research/liner-r1-planning`: 5 (P02-00..P02-04) + P02-05
- Repair PRs: 0 (no confirmed bug; NOT_COMPARABLE is data-coverage, not a bug)
- Comparisons: 28 total, 22 INPUT_PARITY PASS, 0 derived, 6 NOT_COMPARABLE, 0 FAIL
- Main PRs: 0. Main merges: 0. Force pushes: 0.
