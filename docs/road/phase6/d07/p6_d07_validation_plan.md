# P6-D07 Validation Plan

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT

## Purpose

Bind Phase6 implementation to O8/G6 validation evidence.

No tests were run during this docs-only audit.

## Validation Matrix

| PR | Semantic evidence | Visual evidence |
| --- | --- | --- |
| PR-39 | Road drawing primitives, DXF entities, tables, diagnostics | local screenshots/export review; final claim blocked by OD8-04 |
| PR-40 | NOGO until IF3 verified; then report/CSV/PDF DTO correctness, PRINT source contract/catalog/stale blocking | print/PDF layout review; final claim blocked by OD8-04 |
| PR-41 | NOGO until SP1 neutral/shared Frame drawing path and IF3 verified; then Frame drawing primitives and result-bound sheets | drawing screenshot/DXF review; final claim blocked by OD8-04 |
| PR-42 | NOGO until IF3 viewer input/staleness/result adapter contract verified; then Viewer adapter state and staleness behavior | Viewer screenshot review; final claim blocked by OD8-04 |

## Minimum Commands

```bash
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run test:regression
cd frontend && npm run lint
```

Targeted E2E commands must be selected per PR. Record exact command, result, and known unrelated failures.

Current environment finding:

```text
VENV_FAILURE_CLASSIFICATION: ENVIRONMENT_SETUP_MISSING
ROOT_CAUSE: root .venv missing; bridgeDefinition regression helper eagerly selects/asserts .venv Python at import time
DOCS_CHANGE_CAUSALITY: UNRELATED
```

The `.venv` issue is not implementation-blocking for PR-39, but it blocks the broader Phase6 full-test gate until approved environment setup is completed.

## Evidence Rule

Do not write PASS unless the command or manual check was actually performed.

```text
P6_D07_VALIDATION_PLAN_VERDICT: DRAFT_READY_WITH_ENV_SETUP_FINDING
```
