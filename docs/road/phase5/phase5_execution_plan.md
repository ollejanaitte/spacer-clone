# Phase 5 Execution Plan

**Date:** 2026-07-22
**Status:** AUTHORITATIVE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity

## Branch and PR Ledger

| D-step | Branch | PR scope | Squash commit title |
| --- | --- | --- | --- |
| P5-D01 | `feat/phase5-p5-d01-spec-fixture-gate` | Reconciliation matrix, fixture gate, AC-RD test mapping | `feat(liner): establish P5-D01 formal drawing fixture gate` |
| P5-D02 | `feat/phase5-p5-d02-jip-section8-semantics` | Line/section/skew/coordinate/dimension semantics | `feat(liner): complete P5-D02 JIP section 8 drawing semantics` |
| P5-D03 | `feat/phase5-p5-d03-dxf-parity-cad-gate` | Preview/print/DXF parity and CAD preset gates | `feat(liner): complete P5-D03 formal drawing DXF parity` |
| P5-D04 | `feat/phase5-p5-d04-persistence-fail-closed` | Save/load, migration, fail-closed hardening | `feat(liner): complete P5-D04 drawing persistence gates` |
| P5-D05 | `feat/phase5-p5-d05-final-verification` | E2E, visual evidence, final verification docs | `test(liner): complete P5-D05 formal drawing verification` |

## P5-D01 Implementation Start Point

P5-D01 may start only after this docs PR is squash-merged and `main = origin/main`.

The implementation base must include PR #166 (`58cb82f`) and PR #167 (`211d181`), so parity CLI output hygiene and UUID cross-runtime compatibility are already resolved before P5-D01 begins.

Official P5-D01 scope:

- Read `phase5_planning_freeze.md`, `phase5_design_document.md`, `phase5_completion_gate.md`, `phase5_existing_implementation_gap_analysis.md`, `phase5_jip_liner_formal_drawing_extraction.md`, and `phase5_open_decision_resolution.md`.
- Build a test/evidence ledger that maps each gap and AC-RD row to existing tests or new P5-D02+ work.
- Add minimal missing fixture/test scaffolding only if it does not change runtime behavior.
- Confirm current formal drawing implementation boundaries before any feature implementation.

P5-D01 non-scope:

- No new drawing features.
- No schemaVersion or payloadVersion bump.
- No branch/merge, TOOL, full importer, SXF, or ground fabrication.
- No `DrawingDocument` persistence.

Changed areas expected for P5-D01:

- `frontend/src/liner/drawing/**/__tests__/**`
- `frontend/src/liner/dxf/**/__tests__/**`
- `frontend/tests/e2e/**` only if an evidence gap requires E2E mapping.
- `docs/history/road/phase5_final_verification.md` only if P5-D01 records a step verification note.

## Composer 2.5 Initial Instruction

Do not implement P5-D01 until supervisor explicitly starts it after the freeze PR is merged.

When started, Composer 2.5 must:

1. Create branch `feat/phase5-p5-d01-spec-fixture-gate` from current `main`.
2. Re-run repository preflight.
3. Read all Phase 5 authoritative docs.
4. Produce an evidence mapping before code edits.
5. Add only missing fixture/test gates required by P5-D01.
6. Run required local validation.
7. Stop on any typecheck/test failure or unexpected git status.

## Review Gate Verdicts

```
PHASE5_GAP_ANALYSIS_VERDICT: APPROVED
PHASE5_EXTRACTION_VERDICT: APPROVED
PHASE5_OPEN_DECISIONS_VERDICT: APPROVED
PHASE5_PLANNING_FREEZE_VERDICT: APPROVED
PHASE5_DESIGN_VERDICT: APPROVED
PHASE5_COMPLETION_GATE_VERDICT: APPROVED
PHASE5_EXECUTION_PLAN_VERDICT: APPROVED
```
