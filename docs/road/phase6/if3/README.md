# IF3 Result / Output Contract Design Package

**Date:** 2026-07-26
**Status:** DESIGN_DEFINED_AND_IF3_A_THROUGH_E_IMPLEMENTED
**Scope:** Phase 6 IF3 semantic result/output contract and IF3-A through IF3-E implementation gates

## Purpose

This package defines and records the IF3 Frame result resource contract, lifecycle/staleness,
consumer boundaries, and implementation slices.

IF3 was `NOGO` before the design package. IF3-A through IF3-D landed on `origin/main` before
`3f24b98`. IF3-E adds READ_OLD_WRITE_TARGET compatibility classification and completion-gate sync.

## Documents

| Document | Purpose |
| --- | --- |
| [if3_result_output_contract_design.md](./if3_result_output_contract_design.md) | Canonical `FrameAnalysisResultResource` contract, payload, binding, provenance, persistence, schema policy |
| [if3_result_lifecycle_and_staleness.md](./if3_result_lifecycle_and_staleness.md) | Lifecycle, staleness state machine, retention, reload behavior |
| [if3_consumer_contracts.md](./if3_consumer_contracts.md) | Report, Viewer, DRAFT, PRINT contracts and fail-closed consumer behavior |
| [if3_implementation_plan.md](./if3_implementation_plan.md) | IF3-A through IF3-E implementation slices, files, tests, stop conditions |
| [if3_completion_gate.md](./if3_completion_gate.md) | Review/freeze gates with design vs implementation status |
| [if3_evidence_matrix.md](./if3_evidence_matrix.md) | Evidence baseline and implementation gap matrix |
| [if3_open_questions.md](./if3_open_questions.md) | Open choices that remain for implementation planning |

## Authoritative Flow

```text
BridgeFrameAnalysisDocument
  -> Analysis Request
  -> Solver Raw Result
  -> Normalized IF3 Result Resource
  -> Report / Viewer / DRAFT adapters
```

Report, Viewer, and DRAFT must not directly consume raw solver results as the authoritative path.
Old `AnalysisResult` values are compatibility input only until wrapped, validated, checksummed, and
bound into a supported IF3 result resource.

## Post-Implementation Readiness

| PR | Verdict after IF3-E |
| --- | --- |
| PR-40 Frame PRINT | `CONDITIONAL_GO` — IF3 semantic adapters exist; PRINT catalog completeness remains |
| PR-41 Frame DRAFT | `NOGO` — SP1 neutral/shared Frame drawing path still unverified |
| PR-42 Viewer adapters | `CONDITIONAL_GO` — IF3 viewer adapters exist; P6-D06 completeness checklist remains |

OD8-04 remains open and continues to block final visual-release claims.

