# Phase 6 Decision Log

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT

## Decisions

| ID | Status | Decision | Impact |
| --- | --- | --- | --- |
| P6-DEC-01 | DECIDED | Phase6 name is `P6 - Reports, Drawings, and Viewer Completion` | Aligns Stage 10 P6 naming |
| P6-DEC-02 | DECIDED | Outputs are adapters over source documents/results, never source truth | Blocks persisted drawing/export artifacts |
| P6-DEC-03 | DECIDED | SP1 is PARTIAL unless implementation evidence proves neutral extraction | Prevents overclaiming shared platform readiness |
| P6-DEC-04 | DECIDED | IF3 is IF3_PARTIAL_BLOCKING_PR40_PR41_PR42 until Frame result/output binding is verified | Blocks PR-40, PR-41, and PR-42 authoritative output claims |
| P6-DEC-05 | DECIDED | OD8-04 is OPEN_NONBLOCKING_FOR_IMPLEMENTATION but blocks final visual release | Allows semantic implementation and controlled visual test prep |
| P6-DEC-06 | DECIDED | PR-39 must preserve Phase5 runtime `DrawingDocument` regeneration boundary | Prevents drawing persistence regression |
| P6-DEC-07 | DECIDED | MiMo docs-only audit verdict is PASS_WITH_FINDINGS | Required docs exist; candidate references and D02 temporal snapshot remain findings |
| P6-DEC-08 | DECIDED | `.venv` failure is ENVIRONMENT_SETUP_MISSING and unrelated to docs changes | Does not block PR-39 implementation, but blocks broader full-test gate until environment setup |
| P6-DEC-09 | DECIDED | SP1 status is SP1_PARTIAL_ACCEPTABLE_FOR_PR39 | PR-39 may proceed conditionally; PR-41 remains blocked pending neutral/shared Frame path or explicit acceptance |
| P6-DEC-10 | DECIDED | IF3 status is IF3_PARTIAL_BLOCKING_PR40_PR41_PR42 | PR-40, PR-41, and PR-42 remain NOGO |
| P6-DEC-11 | DECIDED | OD8-04 status is OPEN_NONBLOCKING_FOR_IMPLEMENTATION | Semantic implementation and controlled visual test prep may proceed; final visual release claim is blocked |

## Open Decisions

| ID | Question | Default for planning | Gate |
| --- | --- | --- | --- |
| P6-OD-01 | Are dimension primitives first-class `DrawingPrimitive` variants or structured builder overlays? | First-class only if SVG/DXF/validation support lands together | P6-D03 |
| P6-OD-02 | Which DXF layer names hold dimensions, skew angles, and structure markers? | Add explicit common-preset layers; no CAD compliance claim | P6-D03 |
| P6-OD-03 | Which bridge markers belong in Road GDRAW versus Frame DRAFT? | Road shows road-owned bridge layout markers; Frame DRAFT owns analysis/load/result drawings | P6-D03/P6-D05 |
| P6-OD-04 | What PRINT catalog sections are required for PR-40? | Include only sections backed by valid IF3 results | P6-D04 |
| P6-OD-05 | What Viewer state is persisted, if any? | Persist none; session/runtime only | P6-D06 |
| P6-OD-06 | What controlled visual environment satisfies OD8-04? | No answer in this docs pass | P7/release gate |
| P6-OD-07 | Which specific IF3 source contracts cover Frame PRINT/DRAFT/Viewer? | Treat as absent until verified | Blocks PR-40/41/42 |
| P6-OD-08 | Which neutral/shared drawing boundary is accepted for Frame DRAFT? | Treat as partial SP1 | Blocks PR-41 unless explicitly accepted |

```text
PHASE6_DECISION_LOG_VERDICT: DRAFT_READY_WITH_MIMO_FINDINGS
```
