# R1_P02_PR_BREAKDOWN

- **Date**: 2026-08-07
- **Base for all PRs**: `research/liner-r1-planning` (NEVER main)

| Step | Branch | Title | Content |
|---|---|---|---|
| P02-00 | research/liner-r1-p02-00-freeze | docs(liner): freeze R1-P02 external comparison scope | scope, handoff audit, comparability matrix, target cases, PR breakdown (docs only) |
| P02-01 | research/liner-r1-p02-01-comparator | feat(liner): add external reference comparison engine | comparison engine (scalar compare, unit/coordinate contract, tolerance, structured result, report) + tests |
| P02-02 | research/liner-r1-p02-02-horizontal-station | test(liner): compare horizontal and station results to external references | fixtures + actual extraction + comparison for horizontal_alignment, station |
| P02-03 | research/liner-r1-p02-03-profile-crossfall-height | test(liner): compare profile and cross-section results to external references | fixtures + actual extraction + comparison for vertical_profile, crossfall, section_height |
| P02-04 | research/liner-r1-p02-04-reporting | test(liner): add R1-P02 comparison reporting | comparison report, discrepancy ledger, coverage matrix |
| P02-04R | research/liner-r1-p02-fix-* | fix(liner): ... (only if needed) | minimal repair PR(s) with external evidence |
| P02-05 | research/liner-r1-p02-05-integration | test(liner): complete R1-P02 external golden verification | integration, full regression, BRANCH_STATUS, final report |

## Rules

- Each branch created from up-to-date `research/liner-r1-planning` after previous merge.
- PR base = `research/liner-r1-planning`; body begins `DO NOT RETARGET TO MAIN`.
- No main push / PR / merge. No force push. No squash losing provenance.
- Repair PRs only for confirmed bugs with external evidence + before/after test.
