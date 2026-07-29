# Apollo Phase 1-NN Unit 3 Scope Freeze

- Effective date: Wednesday, July 29, 2026
- Baseline branch: `main`
- Baseline repository: `/home/masaharu/Projects/spacer-clone-main`
- Baseline HEAD: `078fdda7e95ef8fd23c7d7b32fe759b40d88c1f9`
- Scope verdict: PASS

## Objective

Freeze the implementation scope for the first Apollo Phase 1-NN productivity unit after Unit 2. Unit 3 adds non-numeric workspace productivity behaviors around the existing Apollo draft shell without expanding numeric authority, solver reach, or production publication.

## Baseline

Unit 3 planning inherits the following already-frozen behavior:

- Phase 1-NN route, flags, and fail-closed guards from [01_nn_scope/phase1_nn_acceptance_criteria.csv](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/01_nn_scope/phase1_nn_acceptance_criteria.csv:1)
- Phase 1-NN layered shell architecture from [03_architecture/phase1_nn_architecture.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/03_architecture/phase1_nn_architecture.md:1)
- Unit 2 topology shell, sidecar persistence, and Electron runtime evidence from [../unit2/00_scope/unit2_scope_freeze.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2/00_scope/unit2_scope_freeze.md:1) and [../unit2/final_phase1_nn_unit2_report.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2/final_phase1_nn_unit2_report.md:1)
- Formal Ubuntu startup path correction before any Unit 3 expansion from [../unit2-1/01_root_cause/remediation_plan.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/unit2-1/01_root_cause/remediation_plan.md:1)

## In Scope

Unit 3 shall add the following non-numeric user productivity capabilities to the Apollo shell:

1. Project CRUD for Apollo workspace drafts and Apollo file-backed projects
2. Import / Export for the Apollo non-numeric draft format through the existing JSON bridge only
3. Undo / Redo within the Apollo draft editing session
4. Multi Select for Apollo draft entities
5. Copy / Paste using an Apollo internal clipboard
6. Bulk Edit for eligible shared fields across selected Apollo entities
7. Search / Filter within the active Apollo draft
8. Validation Navigator for shell-level validation issues
9. Unsaved Changes Guard across Apollo route changes, workspace changes, and Electron close / quit flows

## Out of Scope

The following remain outside Unit 3:

- Solver execution, stiffness assembly, load processing, response calculation, or any numeric authority
- Material constants, section properties, design code checks, or verified engineering values
- Native Analyzer / SPACER / STATICS execution and compatibility claims
- Authoritative result publication, formal reports, or production export authority
- IF3 authoritative result export and any release claims tied to numeric evidence
- LINER features, routes, or persistence
- Changes to startup scripts, backend APIs, or desktop packaging behavior
- Replacing the Unit 2 sidecar schema version or deleting Unit 2 fields

## Feature Freeze

### 1. Project CRUD

- In Scope:
  Apollo draft creation, open, rename, duplicate, delete, list ordering, active project selection, invalid persisted draft handling, and Electron restart recovery for saved workspace snapshots.
- Out of Scope:
  Multi-user collaboration, cloud sync, external workspace catalogs, or non-JSON native project repositories.

### 2. Import / Export

- In Scope:
  Import and export of the Apollo draft through the repository's existing JSON file dialog bridge, with explicit schema-version validation and fail-closed rejection for invalid input.
- Out of Scope:
  Authoritative result export, IF3 production export, PDF report generation, and external format adapters.

### 3. Undo / Redo

- In Scope:
  Local Apollo edit history for non-numeric draft mutations only.
- Out of Scope:
  Cross-route global history, numeric result history, or browser-native text-field undo as a completion substitute.

### 4. Multi Select

- In Scope:
  Table-driven multi-selection for Apollo draft entities and synchronization to eligibility-dependent actions.
- Out of Scope:
  Cross-project selection, mixed viewer marquee selection, or geometric lasso tools.

### 5. Copy / Paste

- In Scope:
  Internal clipboard copy/paste of Apollo draft entities with deterministic ID remap and reference remap.
- Out of Scope:
  OS clipboard interoperability, rich text, or external application paste compatibility.

### 6. Bulk Edit

- In Scope:
  Atomic update of explicitly allowed common fields across eligible selected Apollo entities. The initial Unit 3 allowed-field matrix is frozen as:
  - `node`: `label`, `active`
  - `member`: `label`, `active`
  - `support`: `label`, `active`
  - `material`: `displayName`, `active`
- Out of Scope:
  Partial-success batch edits, free-form mass transforms, geometry coordinate transforms, relationship rewiring, or edits that require numeric recalculation.

### 7. Search / Filter

- In Scope:
  In-draft entity search and filtering by defined Apollo fields. Matching is frozen as case-insensitive exact match for entity type and case-insensitive partial match for ID, name, and label fields after trim-normalization.
- Out of Scope:
  Full-text indexing, fuzzy search, or persistence of cross-session saved searches.

### 8. Validation Navigator

- In Scope:
  Navigation over shell-level Apollo validation issues already derived from non-numeric draft validation.
- Out of Scope:
  Numeric validation, backend solver diagnostics, or production analyzer issue browsing.

### 9. Unsaved Changes Guard

- In Scope:
  Guard prompts for Apollo route exit, workspace switch, file open, new draft, Electron close, and app quit when the current Apollo draft is dirty.
- Out of Scope:
  Autosave restoration, crash recovery, or browser-only `beforeunload` as the sole protection mechanism.

## Feature Purpose and Boundaries

| Feature | Purpose | State Ownership | Persistence Boundary | Validation Boundary | Electron Boundary |
| --- | --- | --- | --- | --- | --- |
| Project CRUD | Manage active Apollo draft lifecycle safely | Apollo shell + app project owner | `localStorage` snapshots and JSON file bridge | Reject malformed snapshot metadata and invalid hydrated drafts | Confirm restart recovery and destructive actions in Electron |
| Import / Export | Move Apollo draft state in and out deterministically | App file I/O owner with Apollo draft serializer | JSON only | Fail closed on schema / field / reference violations | Use native dialog bridge only |
| Undo / Redo | Reverse local Apollo edits predictably | Apollo history owner | Non-persistent session history | History entries may not bypass validation | Keyboard shortcuts and menu-close survival under Electron |
| Multi Select | Operate on multiple Apollo entities consistently | Apollo selection owner | Non-persistent UI state | Ineligible selections must block downstream actions | Keyboard modifiers verified in Electron |
| Copy / Paste | Reuse draft entities safely | Apollo clipboard owner | Internal clipboard only | Reject invalid payloads and broken remaps | Electron keyboard path required |
| Bulk Edit | Change repeated fields atomically | Apollo bulk-edit owner | Persist only after explicit save / snapshot / export | Pre-validate batch before apply | Confirmation and undo path required |
| Search / Filter | Reduce visible entity set without losing state integrity | Apollo search/filter owner | Session state only | Filter cannot mutate source data | Keyboard focus and result counts verified |
| Validation Navigator | Move directly to shell-level issues | Apollo validation navigation owner | Derived state only | Revalidation clears stale entries | Focus transfer required in Electron |
| Unsaved Changes Guard | Prevent accidental loss of Apollo edits | App dirty owner + Apollo route guard | Saved-hash boundary only | Guard state must reflect save/load/import/undo outcomes | Electron close / quit path required |

## Preconditions

- `HEAD == origin/main`
- Ubuntu startup regression remains green through `./start`
- Unit 2 sidecar draft remains the only Apollo persistence payload
- Numeric execution and result publication remain blocked by existing fail-closed guards

## Unit Boundaries

### Unit 1 Boundary

There is no `docs/apollo/phase1-orchestration/unit1/` directory in the current repository. For Unit 3 planning, Unit 1 responsibilities are inferred from the Phase 1-NN base stream:

- feature flags
- route entry guard
- provisional banner
- numeric execution guard
- result publication guard
- verified badge suppression

Unit 3 shall not redefine those behaviors.

### Unit 2 Boundary

Unit 2 already owns:

- Apollo sidecar draft schema version `2.0.0`
- Project metadata shell
- Node / member / support / material shell editing
- Save / reload round-trip through JSON
- Viewer reuse and single-selection synchronization
- Shell-level validation list
- Audit log

Unit 3 shall extend productivity behavior around those surfaces without removing or weakening Unit 2 contracts.

### Unit 4 Boundary

No Unit 4 freeze exists in the repository today. Unit 3 reserves the following for a future Unit 4 planning pass:

- richer adapter integration beyond JSON draft exchange
- advanced workspace orchestration not needed for the first productivity pass
- any extension that requires new backend or desktop IPC primitives beyond the current JSON dialog bridge

### Unit 5 Boundary

No Unit 5 freeze exists in the repository today. Unit 3 reserves the following for a future Unit 5 or later pass:

- authoritative publication
- formal exports and reports tied to numeric evidence
- release-grade compatibility claims

## Numeric Scope Guard

Unit 3 must preserve all Phase 1-NN numeric prohibitions:

- no solver imports
- no authoritative result rendering
- no authoritative export invocation
- no verified wording
- no machine-evidence claims

See [../03_architecture/phase1_nn_architecture.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/03_architecture/phase1_nn_architecture.md:11) and [../03_architecture/adapter_boundary.md](/home/masaharu/Projects/spacer-clone-main/docs/apollo/phase1-orchestration/03_architecture/adapter_boundary.md:1).

## Freeze Rules

- Unit 3 implementation may change only Apollo documentation and Apollo-targeted source areas required by the planned work packages.
- Unit 3 may not change startup scripts, backend APIs, numeric logic, LINER behavior, or Unit 2 historical documents.
- Unit 3 completion evidence must include Electron runtime proof; unit tests alone are insufficient.
