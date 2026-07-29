# Apollo Phase 1-NN Unit 3 Completion Gate

## Overall Rule

Unit 3 is `COMPLETE` only when all nine Unit 3 features are individually `COMPLETE`.

If any feature is `PARTIAL`, `MISSING`, `BLOCKED`, or `OUT_OF_SCOPE`, the overall Unit 3 verdict is not complete.

## Per-Feature Gates

### U3-GATE-CRUD

- scope freeze requirements implemented
- active project vs workspace snapshot contract honored
- delete confirmation required
- invalid persisted snapshot fails closed
- automated tests PASS
- Electron manual tests PASS

### U3-GATE-IMPX

- supported format limited to documented JSON contract
- schema/version validation enforced
- negative import fixtures PASS
- export/import round-trip PASS
- authoritative export remains blocked
- Electron manual tests PASS

### U3-GATE-HIST

- undo/redo transaction boundaries implemented
- history limit enforced
- redo invalidation on new action PASS
- project switch/import boundaries PASS
- keyboard shortcut path PASS in Electron

### U3-GATE-SEL

- additive, range, and select-all behavior implemented exactly as frozen
- project switch reset PASS
- filtered hidden-selection behavior PASS
- viewer synchronization rule PASS
- Electron keyboard modifier verification PASS

### U3-GATE-CLIP

- internal clipboard only
- id remap PASS
- reference remap PASS
- invalid paste atomic rejection PASS
- undo/redo integration PASS
- Electron keyboard shortcut verification PASS

### U3-GATE-BULK

- supported-field matrix enforced
- mixed ineligible selection blocked
- atomic apply PASS
- affected-count display PASS
- undo/redo integration PASS
- Electron confirmation flow PASS

### U3-GATE-FIND

- search by documented fields PASS
- filter by documented fields PASS
- result count PASS
- no-result state PASS
- hidden-selection behavior PASS
- Electron focus and keyboard path PASS

### U3-GATE-NAV

- stable issue identity PASS
- target entity and target field mapping PASS
- next/previous navigation PASS
- focus transfer PASS
- stale issue removal PASS
- import-error boundary PASS
- Electron manual navigation PASS

### U3-GATE-DIRTY

- dirty source of truth matches the saved-baseline contract
- save clears dirty only on success
- undo-to-saved-state clears dirty
- Save / Discard / Cancel branches PASS
- route change guard PASS
- workspace change guard PASS
- Electron window close guard PASS
- app quit guard PASS

## Required Global Evidence

All of the following are mandatory before Unit 3 overall completion:

- scope freeze obeyed
- implementation complete for every Unit 3 feature
- no placeholder, stub, or mock-only behavior counted as completion
- `npm run typecheck` PASS
- `npm run lint` PASS
- unit tests PASS
- integration tests PASS
- Electron manual tests PASS
- persistence round-trip PASS
- negative cases PASS
- no Numeric intrusion
- Unit 1 / Unit 2 regression PASS
- Windows startup regression PASS
- Ubuntu startup regression PASS
- `HEAD == origin/main`
- working tree clean

## Forbidden Completion Shortcuts

The following do not satisfy the completion gate by themselves:

- UI control exists but no state transition exists
- helper function exists but no route-level behavior exists
- unit test exists but Electron path is unverified
- browser `beforeunload` exists but Electron close/quit path is not guarded
- duplicate action exists but clipboard paste does not

## Final Gate Tokens

UNIT3_SCOPE_FREEZE_VERDICT: PASS when frozen docs remain unchanged by implementation
UNIT3_ACCEPTANCE_CRITERIA_VERDICT: PASS when every acceptance criterion is met
UNIT3_ARCHITECTURE_DELTA_VERDICT: PASS when implementation matches the delta documents
UNIT3_TRACEABILITY_VERDICT: PASS when every requirement maps to passing evidence
UNIT3_NUMERIC_SCOPE_GUARD_VERDICT: PASS when no prohibited numeric behavior is introduced
UNIT3_OVERALL_COMPLETION_VERDICT: PASS only when all per-feature gates pass
