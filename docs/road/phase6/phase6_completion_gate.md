# Phase 6 Completion Gate

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT
**Phase:** P6 - Reports, Drawings, and Viewer Completion

## Global Gates

Phase6 is COMPLETE only when:

- P6-D01..P6-D08 docs are approved or superseded.
- PR-39..PR-42 are merged by approved implementation PRs.
- SP1 status is resolved or every use of non-neutral drawing/DXF infrastructure is explicitly accepted.
- IF3 is resolved before authoritative Frame PRINT/DRAFT/Viewer result output claims.
- OD8-04 is resolved before final visual release claim; until then semantic implementation and controlled visual test prep may proceed but visual release is blocked.
- No output adapter persists `DrawingDocument`, DXF, PDF, CSV, Viewer render state, or report DTOs as source truth.
- Error-level output diagnostics block export completion.
- Local typecheck and applicable tests pass on the implementation branch.
- GitHub checks are recorded as configured, passing, failing, or not configured.
- Environment setup is present for the full-test gate; current MiMo audit classified the root `.venv` failure as ENVIRONMENT_SETUP_MISSING and unrelated to docs changes.

## Per-Step Gates

| D-step | Completion criteria |
| --- | --- |
| P6-D01 | Planning freeze docs exist, ledger and PR mapping are explicit, dependencies are not overstated |
| P6-D02 | GDRAW scope inventory exists, candidate files/symbols listed, PR-39 limits and unknowns recorded; prior MiMo D02 source remains a PARTIAL_SOURCE with temporal snapshot caveat |
| P6-D03 | Road GDRAW/DXF design resolves dimension primitive, bridge marker, settings, and DXF layer decisions |
| P6-D04 | PRINT design binds report/CSV/PDF outputs to valid source/result DTOs and IF3 requirements |
| P6-D05 | Frame DRAFT design separates Frame builders from Road builders through shared drawing contracts |
| P6-D06 | Viewer design defines target adapters, staleness UI, rollback, and output/export blocking |
| P6-D07 | Validation plan maps PR-39..42 to O8/G6 commands, fixtures, and manual evidence |
| P6-D08 | Readiness gate gives GO/NOGO with unresolved dependency handling |

## PR Gates

| PR | Required gate |
| --- | --- |
| PR-39 Road GDRAW completeness | Road drawing unit tests, DXF parity tests, workspace E2E, semantic G6 evidence |
| PR-40 Frame PRINT completeness | IF3-bound result fixtures, PRINT source contract/catalog/staleness handling, report/CSV/PDF tests, stale-result blocking tests |
| PR-41 formal Frame DRAFT | SP1 neutral/shared Frame drawing path, IF3-bound result fixtures, DrawingDocument builder tests, DXF/print parity where supported, stale-result blocking |
| PR-42 Viewer target adapters | IF3 viewer input/staleness/result adapter contract, adapter contract tests, staleness tests, UI E2E for unavailable/stale/valid states |

## Required Quality Commands

Implementation branches must run at least:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run test:regression
```

Run targeted E2E per PR:

```bash
cd frontend && npm run test:e2e -- phase5-japanese-drawing-remediation.spec.ts phase5-step3-dxf-export.spec.ts
```

For docs-only preparation, validation is recommended but PASS must not be claimed unless commands are actually executed.

MiMo audit note: no tests were run in this docs-only worker. Remediate environment setup later by running approved setup such as `./start-ubuntu.sh` or setting `PYTHON` to a Python with required dependencies.

## Stop Conditions

Stop and report without cleanup when:

- typecheck or tests fail
- unexpected files are staged or changed
- implementation touches schema/package/source files outside approved PR scope
- output source-of-truth boundary is violated
- OD8-04 is still open and a final visual release claim is attempted
- IF3 remains partial and PR-40/41/42 implementation is attempted
- `.venv` remains missing at full-test gate

```text
PHASE6_COMPLETION_GATE_VERDICT: DRAFT_READY_WITH_FINDINGS
```
