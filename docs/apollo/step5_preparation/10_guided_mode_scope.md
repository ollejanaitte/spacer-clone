# 10 — Guided Mode Scope

## Reuse

- Control plane: existing `WorkflowStateModel` / WF-01..15 registry
- Data plane: same `apolloBridgeStructureInput` (+ future pavement/marking models)
- Forbidden: Guided-only duplicate project store

## UX requirements (candidates for 5-2)

- One theme per screen (paper-slide)
- Back / Save-and-next
- Current position + progress
- What this screen decides
- Input values + errors/missing
- Impact notes for 3D / quantity / load
- Switch to detailed editors without data fork
- Accessibility / mobile
- Developer diagnostics collapsed by default

## Current gap (from S5-1A)

Shell `GuidedStep` (start/sample/basics/editor/validation) ≠ REQ-S5-006 Workflow paper-slide mode.

Candidate slides: see `guided_step_candidate_matrix.csv`.
