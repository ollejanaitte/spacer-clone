# R1_P01_PR_BREAKDOWN

- **Date**: 2026-08-07
- **Base for all PRs**: `research/liner-r1-planning` (NEVER main)

| Step | Branch | Title | Content |
|---|---|---|---|
| P01-00 | research/liner-r1-p01-00-freeze | docs(liner): freeze R1-P01 reference dataset scope | scope/source/data-contract/extraction-rules/PR-breakdown docs |
| P01-01 | research/liner-r1-p01-01-schema | feat(liner): add R1 reference dataset schema | types/schema/validation/manifest loader + focused tests |
| P01-02 | research/liner-r1-p01-02-alignment-profile | testdata(liner): add alignment and profile references | horizontal/station/vertical/crossfall/section-height dataset |
| P01-03 | research/liner-r1-p01-03-bridge-ldist | testdata(liner): add bridge geometry references | pier/span/girder_point/girder_span/panel/transverse/overhang/ldist dataset |
| P01-04 | research/liner-r1-p01-04-haunch-hoso-drawing | testdata(liner): add haunch hoso and drawing references | haunch/hoso/drawing_coordinate/dxf dataset + unresolved |
| P01-05 | research/liner-r1-p01-05-integration | test(liner): validate R1 reference datasets | full validation, manifest, parity, field mapping, final report |

## Rules

- Each branch created from up-to-date `research/liner-r1-planning` after previous merge.
- Push to origin, open PR base=`research/liner-r1-planning`.
- PR body includes `DO NOT RETARGET TO MAIN`.
- Merge after focused test / CI.
- ff-only sync integration branch after each merge.
- No main push / PR / merge. No force push. No squash that loses provenance.
