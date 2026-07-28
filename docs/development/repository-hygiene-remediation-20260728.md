# Repository Hygiene Remediation — 2026-07-28

**Authority:** OPERATIONAL  
**Status:** ACTIVE

## Scope

This note records the July 28, 2026 repository-hygiene remediation outcome for current Markdown defects and a pre-existing malformed historical CSV snapshot.

## Confirmed current Markdown defects

The following active documentation defects were corrected in place because they are authoritative current docs and the failures were simple broken relative links:

- `docs/apollo/ap00/02_scope_guards/numeric_authority_model.md`
- `docs/apollo/ap00/02_scope_guards/phase1_scope_guard_contract.md`
- `docs/apollo/ap00/03_validation/validation_strategy.md`

## Accepted historical CSV artifact

The following CSV failure remains intentionally unresolved in place:

- Exact file: `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/features/feature_catalog.csv`
- Historical row: row 2
- Observed defect: row width `23` vs header width `36`
- Immediate cause: the redacted evidence text field on row 2 contains an unmatched quote and terminates early during CSV parsing

### Why in-place repair is prohibited

This file is inside the frozen handoff snapshot documented at [APOLLO-FRAME-HANDOFF-20260726-001 README](../apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md), which states:

- the directory stores an immutable snapshot for future reference
- the package content is a frozen snapshot
- files must not be edited in place
- any correction requires a new revision package

Additional repository evidence:

- [handoff_review.md](../apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/reports/handoff_review.md) records that the package copy of `feature_catalog.csv` had `/home/` strings redacted while the source catalog remained unchanged
- [final_post_ea_01_report.md](../apollo/post-ea-01/06_final/final_post_ea_01_report.md) already records a repository-wide CSV structure failure caused by this historical handoff file

## Validator handling decision

No existing repository CSV validator configuration or file-scoped exclusion mechanism was found for this handoff snapshot. The repository contains exact-width CSV validators for:

- `docs/apollo/design-standards/**`
- `docs/apollo/evidence-collection/**`

but no existing validator policy or config that supports a precise per-file exclusion for this handoff path without adding new broad validation machinery.

Therefore:

- the historical snapshot file remains unchanged
- no broad repository-wide validator exemption is added
- no silent exclusion is introduced
- the failure is recorded here as an accepted historical artifact
- if active use ever requires a corrected CSV, it must be published as a replacement revision package rather than by editing the frozen snapshot

## Validation outcome reference

Current repository-hygiene validation on July 28, 2026:

- targeted Markdown validation: PASS
- repository-wide Markdown validation for tracked `*.md`: PASS
- repository-wide CSV width validation across tracked `*.csv`: FAIL only for the historical file listed above
- `git diff --check`: PASS
