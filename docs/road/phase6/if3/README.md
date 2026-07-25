# IF3 Result / Output Contract Design Package

**Date:** 2026-07-25
**Status:** DESIGN_DEFINED_REVIEW_READY
**Scope:** Phase 6 IF3 semantic result/output contract only

## Purpose

This package promotes the IF3 investigation into review-ready design docs for Frame result resources,
result lifecycle, staleness, and output consumers.

IF3 was `NOGO` before this design package. The repository contains conceptual persisted-result
requirements and partial contract infrastructure, but it does not currently implement the concrete
IF3 result resource, stable result identity, authoritative result binding, result staleness, or
result provenance.

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

## Post-Design Readiness

Design freeze can change IF3 from "missing design" to "design-defined", but it does not by itself
make PR-40, PR-41, or PR-42 implementation-ready. Those PRs become `CONDITIONAL_GO` only after the
relevant implementation slices are completed and validated.

