# Capability Stub Policy (PLANNED steps)

Future capabilities are registered as PLANNED stubs so the workflow is stable
and honest about unimplemented features. Policy (from Step 4-A design):

## Rule

- A step whose capability is `PLANNED` / `UNAVAILABLE` is **BLOCKED** with the
  stable diagnostic code `WF_CAPABILITY_PLANNED` (or `WF_CAPABILITY_UNAVAILABLE`).
- The stub's completionCriterion records the future step that will evaluate it
  (e.g. WF-01 → Step 4-E, WF-03/05 → Step 4-B, WF-06 → Step 4-D).
- **PLANNED stubs never unconditionally block downstream steps.** The
  alignment-binding guard is `BINDING_PREREQUISITE_GUARD = "PENDING_STEP_4E"`
  in `dependencies.ts`; `activePrerequisitesOf()` excludes PLANNED capabilities
  so e.g. WF-02 stays actionable in an empty project.

## Current stubs

| Step | Capability | Implemented in |
|------|------------|----------------|
| WF-01 | alignment-binding | Step 4-E |
| WF-03 | appurtenance-input | Step 4-B |
| WF-05 | haunch-input | Step 4-B |
| WF-06 | splice-input | Step 4-D |

## Verification

- Unit: empty project → WF-01/03/05/06 BLOCKED + `WF_CAPABILITY_PLANNED`;
  WF-02 remains RECOMMENDED (downstream not blocked).
- E2E-S4A-004: stubs show BLOCKED with disabled primary CTA and the blocking
  diagnostic code in the disabled-reason line.

## Why not "hide" future steps

The control plane must show the full WF-01..WF-15 sequence so users understand
scope and dependency. Hiding would imply absence; a visible BLOCKED stub with a
reason is more honest and matches the design's status model.
