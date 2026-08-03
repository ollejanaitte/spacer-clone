# Apollo Step 4-A — Workflow Control and Derived Status Evaluation

**Status:** IMPLEMENTATION + EVIDENCE (Step 4-A)
**Step ID:** `APOLLO_STEP_4A_WORKFLOW_STATE`
**Baseline main:** `5c10af7240303c4f3248ce20a55848bafa7015a2`
**Branch:** `feat/apollo-step4a-workflow-state`
**Updated:** 2026-08-03

## Warning

UNVERIFIED DEVELOPMENT SOFTWARE
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED

## Purpose

Implement the **workflow control plane** (WF-01..WF-15) that derives every step's
status from **current project data and canonical artifact models**, without adding
a second source of truth. Existing panels remain the **work surfaces**; this step
adds the control screen, diagnostics, and derived status evaluation.

## Scope (Step 4-A)

- `frontend/src/apollo/workflow/**` — state model, registry, dependencies,
  selectors, evaluators, diagnostics, recommended action, navigation
- `frontend/src/apollo/components/WorkflowControlScreen*` — control UI
  (status badges, step cards, diagnostics, progress summary)
- `frontend/src/apollo/ApolloPhase1Shell.tsx` — integration (control screen +
  navigation to existing panels)
- Unit + component tests, Playwright E2E (E2E-S4A-001..005)
- Evidence docs under `docs/apollo/step4_workflow_state/`
- `final_report.txt` Step 4-A section

## Out of scope (later Steps)

- Appurtenance / haunch canonical input (Step 4-B)
- Splice / filler canonical input (Step 4-D)
- Road alignment binding / local-CRS replacement (Step 4-E)
- 3D dimension overlay (Step 4-F)
- Any formal authorization or release

## Design principles (unchanged from P0)

1. Workflow is the **control plane**; existing panels are **work surfaces**.
2. State is **derived** from current data/checksums — nothing but the WF-15
   acknowledgment is persisted.
3. STALE truth source is the existing `isBridgeStructureGenerationCurrent`
   (OutputIntegration parity).
4. No copying of external SuperDesigner UI material; status is expressed as
   **label + symbol + reason**, never color-only.
5. PLANNED capability stubs are BLOCKED with `WF_CAPABILITY_PLANNED` but never
   unconditionally block downstream steps (`BINDING_PREREQUISITE_GUARD`).

## Document index

| Document | Contents |
|----------|----------|
| `workflow_registry.md` | Frozen WF-01..WF-15 registry + capabilities |
| `workflow_data_source_mapping.md` | Step → canonical data source mapping |
| `status_semantics.md` | Status priority, badges, diagnostics |
| `current_state_snapshot.md` | Derived state for empty/sample/generated projects |
| `stale_propagation.md` | STALE guard and regeneration parity |
| `capability_stub_policy.md` | PLANNED stub policy + downstream gating |
| `e2e_report.md` | E2E-S4A-001..005 results |
| `evidence_index.md` | File-by-file evidence links |
| `workflow_status_truth_table.csv` | Status → condition matrix |
| `step4a_completion_gate.md` | Completion gate + Step 4-B readiness |

## Implementation file map

| File | Role |
|------|------|
| `frontend/src/apollo/workflow/types.ts` | State model types (schema v1) |
| `frontend/src/apollo/workflow/registry.ts` | 15 frozen step definitions |
| `frontend/src/apollo/workflow/capabilityRegistry.ts` | Capability keys + gating |
| `frontend/src/apollo/workflow/dependencies.ts` | Frozen dependency edges |
| `frontend/src/apollo/workflow/selectors.ts` | Per-step evidence selectors |
| `frontend/src/apollo/workflow/evaluators.ts` | Base status + diagnostics |
| `frontend/src/apollo/workflow/recommendedAction.ts` | Single recommended step |
| `frontend/src/apollo/workflow/diagnostics.ts` | Aggregated helpers |
| `frontend/src/apollo/workflow/index.ts` | `buildWorkflowStateModel()` |
| `frontend/src/apollo/workflow/navigation.ts` | Panel navigation map |
| `frontend/src/apollo/components/WorkflowControlScreen.tsx` | Control screen |
| `frontend/src/apollo/components/WorkflowStatusBadge.tsx` | Status badge |
| `frontend/src/apollo/components/WorkflowStepCard.tsx` | Step card |
| `frontend/src/apollo/components/WorkflowDiagnosticsPanel.tsx` | Diagnostics |
| `frontend/src/apollo/components/WorkflowProgressSummary.tsx` | Progress |
| `frontend/src/apollo/__tests__/workflowRegistry.test.ts` | Registry shape tests |
| `frontend/src/apollo/workflow/__tests__/workflowState.test.ts` | State model tests |
| `frontend/src/apollo/__tests__/WorkflowControlScreen.test.tsx` | UI tests |
| `frontend/tests/e2e/apollo-step4a-workflow.spec.ts` | E2E-S4A-001..005 |

## PRs

- Primary: `feat(apollo): add workflow control and derived status evaluation`
  (branch `feat/apollo-step4a-workflow-state`)
- Report: `docs(apollo): finalize Step 4A workflow state report`
  (branch `docs/apollo-step4a-report-finalize`)
