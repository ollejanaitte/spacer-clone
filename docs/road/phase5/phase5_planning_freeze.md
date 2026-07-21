# Phase 5 Planning Freeze - Road Formal Drawing Completion and JIP-LINER Parity

**Date:** 2026-07-22
**Status:** AUTHORITATIVE
**Repository baseline:** `211d1817baee875c7eb512d06f721402718d1a32` (`211d181`)
**Supervisor:** Codex GPT-5.5

## Authority

This document freezes Road Phase 5 scope. Implementation is not authorized until this freeze set is merged to `main`.

| Document | Role |
| --- | --- |
| `phase5_planning_freeze.md` | Scope, names, boundaries, P5-D ledger, exclusions, policies |
| `phase5_design_document.md` | Design responsibilities and feature-level behavior |
| `phase5_completion_gate.md` | Per-step and final acceptance gates |
| `phase5_execution_plan.md` | Branch/PR sequencing and first implementation handoff |
| `phase5_existing_implementation_gap_analysis.md` | Baseline gap matrix |
| `phase5_jip_liner_formal_drawing_extraction.md` | JIP-LINER §8 extraction and adoption decisions |
| `phase5_open_decision_resolution.md` | AC-RD and OD-01..19 resolution |
| `phase5_start_position_assessment.md` | Phase 4 handoff and preflight facts |

Supporting references:

- `docs/road/output/phase5_liner_formal_drawing_design.md`
- `docs/road/output/redline_ui_and_drawing_remediation_design.md`
- `docs/road/output/drawing_model_design.md`
- `docs/road/output/formal_drawing_ui_design.md`
- `docs/road/output/drawing_standard_preset_design.md`
- `docs/road/output/dxf_export_design.md`
- `docs/road/design/crossfall_transition_design.md`
- `docs/planning/stage6-10/stage10_gap_migration_sequence.md`
- `docs/transfer/contract-index.md`

Historical references under `docs/history/**` are retained evidence only.

## Baseline Prerequisites

| Item | PR | Squash commit | Status |
| --- | --- | --- | --- |
| Phase 4 ledger docs | #165 | `80d1b29` | COMPLETE |
| Parity CLI output hygiene | #166 | `58cb82f` | COMPLETE |
| UUID cross-runtime parity CLI fix | #167 | `211d181` | COMPLETE |

PR #166 removed tracked parity CLI build artifacts and moved generated output to ignored runtime/temp locations. PR #167 resolved the Node-only parity CLI UUID type blocker. GitHub checks are 未設定; local validation remains authoritative for this freeze.

## Formal Name

**Road Formal Drawing Completion and JIP-LINER Parity**

Use "Road Phase 5" when disambiguation is required. Do not shorten this to "Stage 10 P5"; Stage 10 P5 is Frame Analysis Feature Slices. Stage 10 P6 is the broader output/GDRAW/PRINT/DRAFT roadmap phase.

## Product Boundary

In scope:

- Road/LINER formal drawing semantics.
- Runtime `DrawingDocument` generation for plan/profile/cross-section sheets.
- Plan Type A and Plan Type B formal drawing modes.
- JIP-LINER §8-supported line, section, skew angle, coordinate table, and dimension semantics.
- `DrawingSettings` persistence and deterministic reload/regeneration.
- Preview, print, and DXF parity from the same runtime `DrawingDocument`.
- DXF export for supported formal drawing sheets using current `common` preset and `AC1021`.
- AC-RD-01..20 verification.

Out of scope:

- Frame analysis, Frame.DRAFT, and `BridgeFrameAnalysisDocument` mechanics.
- Road-to-Frame apply, `TransferRecord`, or package mutation.
- `DrawingDocument` persistence.
- Synthetic ground profile.
- SXF formal delivery.
- NEXCO/regional CAD compliance claims.
- Branch/merge geometry.
- Quartic/transition widening completion.
- Per-line height tab.
- TOOL calculators.
- Full importer target workflow.
- Product-specific JIP-LINER command/file/UI cloning.

## Responsibility Boundaries

| Object / package | Responsibility |
| --- | --- |
| `RoadDesignDocument` | Persisted Road source of truth and Phase 5 drawing settings source. |
| `BridgeFrameAnalysisDocument` | Frame-owned analysis document; not written or redefined by Road Phase 5. |
| Road-to-frame package | Transfer contract; not changed by Road Phase 5. |
| `DrawingDocument` | Runtime drawing intermediate shared by preview, print, and DXF; never saved in project JSON. |
| Formal Drawing | Road-owned output generated from current road intermediate result plus drawing settings. |
| DXF exporter | Output adapter from `DrawingDocument`; not a source of engineering truth. |

## Schema / Payload Policy

- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` remains `0.1.0`.
- Geometry payload `spacer.liner/domain-draft-vnext-geometry` remains payload `0.2.0` unless a separate approved artifact authorizes a bump.
- No stale result persistence.
- No dual write to `domainDraft` as canonical save target.
- No saved `DrawingDocument`.

## Stable ID Policy

- Existing alignment, line, station, section, span, pier, and drawing primitive IDs must remain stable across save/load.
- New P5 drawing primitives must use deterministic IDs derived from semantic source IDs and sheet kind.
- Persisted references must use IDs, not array indexes.
- Missing referenced geometry is an error or explicit unsupported diagnostic, not silent omission.

## Fail-Closed Policy

- Error-level geometry, station, crossfall, drawing validation, or DXF diagnostics block completion of the affected export.
- Branch/merge inputs must be diagnosed as unsupported for formal drawing instead of approximated.
- Ground profile absence must render unavailable text and must not fabricate elevations.
- Unknown CAD preset, encoding, layer, or sheet behavior cannot be reported as compliance.

## P5-D Ledger

| D-step | Name | Type | Purpose |
| --- | --- | --- | --- |
| P5-D01 | Formal Drawing Specification Reconciliation and Fixture Gate | coding + tests | Convert this freeze into executable fixtures and evidence mapping; no behavior expansion except missing gates. |
| P5-D02 | JIP §8 Drawing Semantics Completion | coding + tests | Implement/verify supported line, section, skew angle, coordinate table, and dimension semantics. |
| P5-D03 | Preview / Print / DXF Parity and CAD Gate | coding + tests | Freeze Plan A/B, profile/band/cross-section DXF parity, `AC1021`, layer/sheet preset evidence. |
| P5-D04 | Persistence, Reload, Migration, and Fail-Closed Hardening | coding + tests | Prove `DrawingSettings` persistence, runtime regeneration, sourceRevision behavior, and no `DrawingDocument` persistence. |
| P5-D05 | Visual E2E and Phase 5 Final Verification | tests + docs | Run AC-RD visual gates, regression, E2E, and write final verification record. |

One D-step equals one branch, one PR, and one squash commit unless the supervisor splits a step before implementation.

## Dependencies

```text
P5-D01 -> P5-D02 -> P5-D03 -> P5-D04 -> P5-D05
```

P5-D03 may start only after P5-D02 exposes stable drawing primitives. P5-D04 may inspect all prior behavior but must not change schema without approval.

## GitHub Strategy

- Freeze docs branch: `docs/phase5-planning-freeze-v2`.
- Implementation branches: `feat/phase5-p5-dNN-...`.
- Stage explicit paths only; `git add .` and `git add -A` are prohibited.
- Push only for the approved docs branch and later approved D-step branches.
- Squash merge each PR.
- GitHub checks are recorded as "未設定" if none exist; local validation remains the gate.

## Planning Freeze Verdict

```
PHASE5_PLANNING_FREEZE_VERDICT: APPROVED
```
