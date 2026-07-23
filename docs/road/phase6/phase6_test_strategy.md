# Phase 6 Test Strategy

**Date:** 2026-07-23
**Status:** PR39_START_CONDITIONS_RESOLVED

## Rule

Do not record PASS for future implementation changes until commands are executed after those changes. The PR-39 start-condition resolution pass did execute the baseline gate before implementation work.

```text
VENV_FAILURE_CLASSIFICATION: ENVIRONMENT_SETUP_MISSING
DOCS_CHANGE_CAUSALITY: UNRELATED
PYTHON_ENV_SETUP: COMPLETE
TYPECHECK: PASS
LINT: PASS
FULL_TEST_GATE: PASS
BUILD: PASS
```

The previous full-test gate failure was caused by a missing root `.venv`. Repository-local `.venv` setup is complete and ignored by Git. Future implementation PRs must rerun the gate after code changes.

## Test Layers

| Layer | Purpose | Example target |
| --- | --- | --- |
| Unit | builders, primitives, dimensions, mappers, diagnostics | `frontend/src/liner/drawing/__tests__/`, `frontend/src/liner/dxf/__tests__/` |
| Regression | golden/fixture stability and cross-phase behavior | `npm run test:regression` |
| E2E | workspace export, print controls, Viewer states | `frontend/tests/e2e/` |
| Semantic output | O8/G6 entity/table/result correctness | JSON/DXF/report assertions |
| Visual | screenshots/PDF/raster/CAD viewer checks | local only until OD8-04 resolves |

## PR-39 Road GDRAW Tests

Required targets:

- dimension calculation unit tests
- drawing builder primitive tests
- coordinate table formatting tests
- DXF mapper/layer tests for new primitives
- drawing validation fail-closed tests
- workspace E2E for preview/export
- golden fixture update only when expected and reviewed

Candidate commands:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test -- src/liner/drawing/__tests__/
cd frontend && npm run test -- src/liner/dxf/__tests__/
cd frontend && npm run test:e2e -- phase5-japanese-drawing-remediation.spec.ts phase5-step3-dxf-export.spec.ts
```

PR-39A readiness is GO before implementation. Conditions before implementation completion:

- keep the accepted PR-39 split: PR-39A -> PR-39B -> PR-39C
- recheck candidate files because `frontend/src/liner/drawing/dimensions/alignmentSegmentDimensions.ts` already exists
- rerun required validation after implementation changes

## PR-40 PRINT Tests

Current readiness: NOGO until IF3 is verified and PRINT source contract/catalog/staleness handling exist.

Required targets:

- report catalog unit tests
- CSV column/order tests
- PDF/print layout semantic tests
- stale/missing result blocking tests
- manual print visual evidence when OD8-04 environment exists

## PR-41 Frame DRAFT Tests

Current readiness: NOGO until SP1 neutral/shared Frame drawing path and IF3 are verified.

Required targets:

- Frame drawing builder tests
- DrawingDocument validation tests
- supported DXF/print adapter tests
- stale result blocking tests
- unavailable feature diagnostics

## PR-42 Viewer Tests

Current readiness: NOGO until IF3 viewer input/staleness/result adapter contract is verified.

Required targets:

- adapter contract tests
- valid/stale/missing result state tests
- UI E2E for staleness and output controls
- no recompute-in-adapter tests where feasible

## Final Validation Set

Before each implementation PR completion:

```bash
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run test:regression
cd frontend && npm run lint
```

Run E2E relevant to the changed output. Run full E2E before final P6 completion if runtime permits, but classify unrelated failures clearly.

```text
PHASE6_TEST_STRATEGY_VERDICT: PR39_BASELINE_GATE_PASS
```
