# Apollo Unit 3 Scope Verification Report

## 1. Executive Summary

U3_SCOPE_DOCUMENT_VERDICT: PASS  
U3_SCOPE_BOUNDARY_VERDICT: PASS  
U3_DEPENDENCY_VERDICT: PASS  
U3_DATA_MODEL_VERDICT: CONDITIONAL  
U3_SAVE_LOAD_VERDICT: CONDITIONAL  
U3_UNDO_REDO_VERDICT: PASS  
U3_SELECTION_VERDICT: PASS  
U3_VALIDATION_VERDICT: CONDITIONAL  
U3_IMPORT_EXPORT_VERDICT: CONDITIONAL  
U3_FAIL_CLOSED_VERDICT: PASS  
U3_TEST_PLAN_VERDICT: PASS  
OVERALL_VERDICT: CONDITIONAL_GO

## 2. Repository State

- Repository: `/home/masaharu/Projects/spacer-clone-main`
- Branch: `main`
- HEAD: `e5f2bc8d7dff731cd5658cc91004002b4ae9e2d2`
- origin/main: `e5f2bc8d7dff731cd5658cc91004002b4ae9e2d2`
- git status: clean
- worktree state: single worktree on `main`

## 3. Authoritative Documents Reviewed

| file path | document role | authoritative / reference | relevant Unit 3 sections | key constraints | gaps |
| --- | --- | --- | --- | --- | --- |
| `docs/apollo/phase1-orchestration/unit3/00_scope/unit3_scope_freeze.md` | Scope freeze | authoritative | in-scope 9 units, out-of-scope boundaries, bulk edit matrix, search rules, dirty guard surfaces | no numeric authority expansion, no startup/backend/LINER changes, Unit 2 sidecar remains baseline | does not pin concrete `projectId` collision algorithm |
| `docs/apollo/phase1-orchestration/unit3/00_scope/unit3_acceptance_criteria.csv` | Acceptance matrix | authoritative | ACs for CRUD, import/export, history, selection, clipboard, bulk edit, search, navigator, dirty guard | Electron path mandatory, fail-closed negatives mandatory | issue stable identity required but concrete locator shape not fixed |
| `docs/apollo/phase1-orchestration/unit3/00_scope/unit3_user_journeys.md` | User journey coverage | reference | CRUD, dirty guard, undo/redo, copy/paste, search, navigator | implementation must preserve guided Apollo workflow | not a data contract |
| `docs/apollo/phase1-orchestration/unit3/01_architecture/unit3_architecture_delta.md` | Architecture delta | authoritative | state layers, owner boundaries, helper modules, planned source areas | snapshot history, internal clipboard, derived dirty fingerprint, search/filter as projection | import envelope strictness not fully operationalized |
| `docs/apollo/phase1-orchestration/unit3/01_architecture/unit3_history_and_selection_contract.md` | History and selection contract | authoritative | transaction boundaries, selection reset rules, filter-hidden behavior, clipboard reset | snapshot history only, max 50, mixed selection rules, viewer remains single focus | bulk edit mixed-kind exception still needs explicit implementation table |
| `docs/apollo/phase1-orchestration/unit3/01_architecture/unit3_persistence_and_guard_contract.md` | Persistence and guard contract | authoritative | file save/load, local workspace snapshots, saved baseline, guard branches, import fail-closed | workspace save does not clear dirty, Save/Discard/Cancel mandatory, Electron close guard required | does not specify user-facing malformed snapshot recovery messaging |
| `docs/apollo/phase1-orchestration/unit3/01_architecture/unit3_state_ownership.md` | State ownership | authoritative | owner map for project, baseline, history, selection, clipboard, navigator | `App.tsx` remains canonical `ProjectModel` owner | validation issue identity model remains implicit |
| `docs/apollo/phase1-orchestration/unit3/02_plan/unit3_implementation_sequence.md` | Implementation order | authoritative | order U3-A -> U3-I -> U3-C -> U3-D -> U3-E -> U3-F -> U3-G -> U3-H -> U3-B | package checkpoints, regression after each stage | none material |
| `docs/apollo/phase1-orchestration/unit3/02_plan/unit3_work_packages.csv` | File and test map | authoritative | planned files, tests, Electron scenarios per unit | limits work to Apollo-targeted files | `desktop/electron/dialogIpc.ts` inclusion for U3-B may be optional depending on final error path |
| `docs/apollo/phase1-orchestration/unit3/02_plan/unit3_risk_register.md` | Risk register | authoritative | identity drift, dirty weakness, history bleed, remap corruption, filter-hidden navigator breakage | implement fail-closed negative cases first | no blocker on its own |
| `docs/apollo/phase1-orchestration/unit3/03_gate/unit3_completion_gate.md` | Completion gate | authoritative | automated, Electron, negative, startup, regression evidence | Ubuntu and Windows startup regression still required at completion | none for scope verification |
| `docs/apollo/phase1-orchestration/unit3/03_gate/unit3_implementation_permission.md` | Planning verdict | authoritative | GO with conditions | only Apollo-targeted implementation files may change, Unit 2 history docs immutable | planning GO still needs implementation-time clarification items below |
| `docs/apollo/phase1-orchestration/unit3/final_unit3_planning_report.md` | Consolidated planning report | reference | summary of frozen Unit 3 decisions | documents that planning phase reached GO | not a replacement for source-level verification |

## 4. Existing Apollo Implementation Reviewed

- Apollo UI files: `frontend/src/apollo/ApolloPhase1Shell.tsx`
- Apollo state files: `frontend/src/App.tsx`, `frontend/src/apollo/workspace.ts`, `frontend/src/apollo/unit2Draft.ts`
- workspace/save files: `frontend/src/desktop/projectFileDialog.ts`, `desktop/electron/dialogIpc.ts`
- validation files: `frontend/src/apollo/unit2Draft.ts`, shared `StructuredMessage` in `frontend/src/types.ts`
- sample project files: `frontend/src/apollo/sampleProjects.ts`
- tests: `frontend/src/apollo/__tests__/ApolloPhase1Shell.test.tsx`, `frontend/src/apollo/__tests__/unit2Draft.test.ts`, related Apollo suite files
- CSS: `frontend/src/styles.css`
- fail-closed related files: `frontend/src/apollo/featureFlag.ts`, `frontend/src/apollo/entryGuard.ts`, `frontend/src/apollo/numericAuthorityGuard.ts`, `frontend/src/apollo/phase1ScopeGuard.ts`

## 5. Unit-by-Unit Scope Verification

### U3-A Project CRUD
- scope: new draft, rename, snapshot list, open snapshot, duplicate snapshot, delete snapshot, active project indication, malformed snapshot fail-closed
- out of scope: numeric save authority, solver state, result artifacts, startup scripts
- required model: active `ProjectModel`, workspace snapshot entry, explicit active snapshot identity, deterministic `projectId` uniqueness policy
- required UI: project list, create/open/rename/duplicate/delete actions, active project indicator, delete confirmation, malformed snapshot message
- required tests: create/open/rename/save/duplicate/delete transitions, malformed snapshot rejection, ordering determinism, collision path
- dependencies: Unit 2 persistence baseline only
- risks: snapshot identity drift, duplicate `projectId`, malformed localStorage silently disappearing
- gaps: duplicate and import collision algorithm is not frozen; malformed snapshot user-facing recovery text is not frozen
- verdict: CONDITIONAL_GO

### U3-I Unsaved changes guard
- scope: Save / Discard / Cancel on new draft, workspace open, file import/open, route leave, Electron close, app quit
- out of scope: browser-only generic confirm as final implementation
- required model: saved baseline fingerprint, derived dirty view, guard intent state, failed-save retention
- required UI: tri-branch dirty modal, consistent trigger text across all guarded exits
- required tests: save/discard/cancel branches, failed save, undo-to-saved-state, route leave, Electron close/quit
- dependencies: U3-A
- risks: current boolean `dirty` cannot represent undo-to-saved-state or baseline equality
- gaps: exact baseline fingerprint helper/API is not named yet, but contract is clear
- verdict: GO

### U3-C Undo / Redo
- scope: bounded snapshot history for Apollo shell mutations only
- out of scope: command replay engine, cross-project history, search/filter history
- required model: history stack, redo stack, saved checkpoint index or equivalent baseline marker
- required UI: undo/redo buttons and keyboard shortcuts, disabled state, saved checkpoint awareness
- required tests: single edit undo, multi-entity transaction undo, redo invalidation, project/import reset, limit 50
- dependencies: U3-A, U3-I
- risks: history boundary bleed across project switch/import
- gaps: none blocking; snapshot strategy and exclusions are frozen
- verdict: GO

### U3-D Multi Select
- scope: ordered selection refs for nodes/members/supports/materials, Ctrl/Cmd toggle, Shift range, Select All visible rows
- out of scope: viewer-side multi-select, cross-project selection, hidden pane global selection
- required model: ordered entity refs, current table context, visible row projection
- required UI: multi-row selection indicators, toolbar enablement, focus ownership
- required tests: additive, range, select all, project switch reset, filter-hidden retention
- dependencies: U3-C
- risks: mixed-kind ambiguity, filter-hidden stale selection, step transitions
- gaps: explicit visible-order source for Shift range should be documented in implementation notes
- verdict: GO

### U3-E Copy / Paste
- scope: internal Apollo clipboard, deterministic id remap, internal reference remap, atomic invalid paste rejection
- out of scope: system clipboard text interchange, cross-app paste, numeric payload transfer
- required model: versioned internal clipboard payload, remap strategy, supported entity-kind matrix
- required UI: copy/paste actions, invalid paste feedback, shortcut handling
- required tests: same-project paste, deterministic remap, invalid payload rejection, undo/redo integration
- dependencies: U3-C, U3-D
- risks: silent reference corruption, unsupported mixed payloads
- gaps: exact cross-kind clipboard policy for mixed supported selections should be fixed before implementation begins
- verdict: CONDITIONAL_GO

### U3-F Bulk Edit
- scope: atomic bulk edit for frozen field matrix only
- out of scope: numeric fields, unsupported properties, partial apply
- required model: eligible selection set, patch payload, validation precheck result
- required UI: bulk edit panel/dialog, affected-count display, confirm apply, blocked reason display
- required tests: atomic apply, one history entry, mixed-type rejection, invalid value rejection
- dependencies: U3-C, U3-D
- risks: field eligibility drift into unsupported attributes
- gaps: none blocking; scope freeze defines allowed fields
- verdict: GO

### U3-G Search / Filter
- scope: case-insensitive partial id/name/label search plus exact entity-type filter
- out of scope: fuzzy matching, persistence, history entries
- required model: session-local query, type filter, visible-row projection
- required UI: query box, type filter, result count, clear filter, no-result state
- required tests: id search, partial label search, type filter, no-result, hidden-selection retention
- dependencies: U3-D
- risks: hidden selected entities confusing later bulk/nav operations
- gaps: none blocking; matching rules are frozen
- verdict: GO

### U3-H Validation Navigator
- scope: issue list, next/previous cursor, target pane opening, target field focus, stale issue removal after revalidation
- out of scope: numeric diagnostics navigator, server-side validation federation
- required model: stable issue identity, entity/field locator, navigator cursor
- required UI: issue list, next/previous controls, focus transfer, distinguish import errors from shell validation
- required tests: issue identity mapping, stale issue removal, next/previous sequencing, focus landing, filter interaction
- dependencies: U3-G, U3-D
- risks: current `StructuredMessage` has no explicit stable issue id field; filter-hidden targets can break focus transfer
- gaps: stable issue identity and locator derivation must be fixed before coding
- verdict: CONDITIONAL_GO

### U3-B Import / Export
- scope: export current Apollo-valid project JSON, import fail-closed JSON, preserve active draft only on success, reset boundaries on success
- out of scope: authoritative result export, numeric payload promotion, migration beyond explicit contract
- required model: normalized export payload, schema validation, import diagnostics, history/selection/clipboard reset, dirty baseline update
- required UI: import/export entry points, invalid import feedback, cancel-safe behavior
- required tests: serializer/hydrator round-trip, duplicate id/broken ref rejection, unknown schema rejection, cancel path, unchanged draft on failure
- dependencies: U3-A, U3-I, U3-C, U3-D, U3-E, U3-F, U3-G, U3-H
- risks: import touches every boundary and can regress dirty/history/selection/navigator at once
- gaps: unknown-field rejection rule at full project envelope level and import diagnostics shape should be fixed before implementation
- verdict: CONDITIONAL_GO

## 6. Dependency and Implementation Order

- proposed order: U3-A -> U3-I -> U3-C -> U3-D -> U3-E -> U3-F -> U3-G -> U3-H -> U3-B
- verified order: same as proposed
- rationale: CRUD defines active draft identity first; dirty guard depends on stable saved baseline; history then wraps mutations; multi-select enables clipboard and bulk actions; search/filter should precede navigator because navigator must honor filtered visibility; import/export should land last because it resets or touches every other state boundary
- units that can be grouped: `U3-A + U3-I`, `U3-C + U3-D + U3-E`, `U3-F + U3-G + U3-H`
- units that should not be grouped: `U3-B` should remain last; `U3-I` should not be delayed until after history because dirty semantics depend on the saved baseline contract
- recommended implementation checkpoints:
  - checkpoint 1: CRUD plus dirty guard with Electron close contract
  - checkpoint 2: history, multi-select, clipboard
  - checkpoint 3: bulk edit, search/filter, validation navigator
  - checkpoint 4: import/export plus full regression

## 7. Scope Boundaries

- Apollo対象: `App.tsx` Apollo route ownership, `ApolloPhase1Shell.tsx`, Apollo helpers, Apollo tests, Apollo-only CSS hooks, workspace local snapshot logic, Apollo validation helpers, Electron close and dialog bridge only where Apollo guard/import needs it
- Apollo対象外: LINER, road design flows, linear coordinate launcher, generic numeric result UI, backend APIs
- Numeric対象外: numeric values, adopted authoritative values, verified results, result publication, solver orchestration
- Solver対象外: all analysis execution paths and backend calls
- Road Design対象外: road design tools, line tabs, importer flows unrelated to Apollo
- Planning Freeze変更禁止: all Unit 3 planning and Unit 2 history documents
- Electron / Windows注意点: close/quit guard must not rely only on browser `beforeunload`; final implementation still requires Ubuntu and Windows startup regression even though this scope review is read-only

## 8. Data and State Model Requirements

- projectId: canonical `ProjectModel.project.id`; duplicate/new/import collision strategy must be deterministic and documented
- entityId: existing string ids for nodes/members/supports/materials remain canonical and selection/history/clipboard must target ids, never row indexes
- schemaVersion: Apollo sidecar remains `2.0.0`; import must fail closed on unknown schema without silent migration
- dirty state: derive from saved baseline fingerprint, not write-only boolean
- save snapshot: local workspace snapshot in `localStorage`; does not clear dirty
- command history: bounded Apollo snapshot history, 50 transactions, reset on project switch/import/new draft
- selection state: ordered entity refs plus visible projection context for range/select-all rules
- clipboard payload: internal versioned Apollo-only payload with deterministic id/reference remap
- bulk edit payload: one atomic patch over eligible entities only, using frozen field matrix
- search/filter state: session-local query plus entity-type filter, no persistence, no history entry
- validation result locator: stable issue identity plus entity/pane/field target mapping required for navigator
- import/export payload: repository project JSON carrying Apollo sidecar draft, validated fail-closed before activation

## 9. Missing Specifications

### BLOCKER

- なし

### HIGH

- Validation issue stable identity and locator derivation
  - impact: U3-H cannot prove next/previous stability or stale issue removal semantics without a deterministic issue key
  - needed decision: derive navigator ids from `code + entityType + entityId + path + ordinal`, or introduce an Apollo-local wrapper type
  - recommended action: fix this in the implementation prompt before coding begins
- `projectId` collision policy for duplicate/new/import interactions
  - impact: U3-A, U3-B, U3-I can drift if duplicate snapshots or imported files collide with active/local ids
  - needed decision: define whether collision is resolved by suffix remap, timestamp remap, or explicit user-facing rejection
  - recommended action: freeze one deterministic policy at implementation kickoff
- Import envelope strictness for unknown extra fields and diagnostics surface
  - impact: U3-B fail-closed behavior can diverge between docs and code if top-level project unknowns are silently tolerated
  - needed decision: reject unknown required structure at project envelope and Apollo sidecar separately, with clear user-facing diagnostics
  - recommended action: add explicit validation table in implementation prompt

### MEDIUM

- Mixed-kind clipboard policy
  - impact: copy/paste UX may be inconsistent if mixed supported selections are copied together
  - needed decision: permit only homogeneous selections or define ordered grouped payload semantics
  - recommended action: decide at start of U3-E
- Shift-range source ordering under filter/sort
  - impact: multi-select range behavior can feel nondeterministic
  - needed decision: range follows current visible table order
  - recommended action: record in implementation notes and tests
- Malformed workspace snapshot user-facing recovery messaging
  - impact: fail-closed is safe, but UX may be unclear
  - needed decision: toast, inline warning, or audit log only
  - recommended action: choose one in U3-A

### LOW

- Whether `desktop/electron/dialogIpc.ts` needs custom error-channel enrichment for invalid import
  - impact: may affect message fidelity only
  - needed decision: app-side diagnostics may be sufficient
  - recommended action: evaluate during U3-B without widening scope

## 10. Test Plan

- automated tests:
  - `npm run typecheck`
  - `npm run lint`
  - Apollo unit tests for CRUD, dirty baseline, history, selection, clipboard, bulk edit, search/filter, navigator, import/export
  - workspace persistence tests
  - invalid import fixture tests
  - fail-closed tests for schema, duplicate ids, broken refs, unknown structures
  - `npm run build`
  - `git diff --check`
- component tests:
  - guarded new/open/import flows
  - undo/redo toolbar and shortcuts
  - selection modifiers
  - bulk edit confirmation and blocked state
  - navigator focus transfer
- manual Electron scenarios:
  - open Apollo
  - load sample
  - create new project
  - rename project
  - save workspace snapshot
  - reopen from project list
  - duplicate snapshot
  - delete snapshot with confirmation
  - trigger unsaved changes guard
  - undo / redo
  - multi select
  - copy / paste
  - bulk edit
  - search / filter
  - navigate validation errors
  - export
  - import
  - reject invalid import
  - confirm analysis remains unavailable
  - confirm no numeric/solver call path opens
- fail-closed tests:
  - schema mismatch
  - broken refs
  - duplicate ids
  - unknown required structure
  - invalid clipboard payload
  - blocked bulk edit
  - failed save during dirty guard
- import/export round-trip tests:
  - export -> mutate in memory -> import -> exact Apollo-managed field equality
  - history/selection/clipboard reset on successful import
  - unchanged draft on cancel or invalid import
- regression tests:
  - existing Apollo UI/UX flow from PR #207
  - numeric guard buttons remain blocked
  - LINER untouched
- GitHub integration checks:
  - PR diff scope
  - CI green
  - latest `origin/main`
  - merge conflict audit
  - post-merge reflection and clean local main

## 11. Candidate Changed Files

- implementation files:
  - `frontend/src/App.tsx`
  - `frontend/src/apollo/ApolloPhase1Shell.tsx`
  - `frontend/src/apollo/workspace.ts`
  - `frontend/src/apollo/unit2Draft.ts`
  - `desktop/electron/main.ts`
  - `desktop/electron/dialogIpc.ts`
- test files:
  - `frontend/src/apollo/__tests__/ApolloPhase1Shell.test.tsx`
  - new Apollo helper tests such as `history.test.ts`, `selection.test.ts`, `clipboard.test.ts`, `bulkEdit.test.ts`, `searchFilter.test.ts`, `validationNavigator.test.ts`, `importExport.test.ts`
  - `frontend/src/App.apolloNavigation.test.tsx`
- CSS files:
  - `frontend/src/styles.css` only through Apollo-scoped selectors
- utility files:
  - new `frontend/src/apollo/history.ts`
  - new `frontend/src/apollo/selection.ts`
  - new `frontend/src/apollo/clipboard.ts`
  - new `frontend/src/apollo/bulkEdit.ts`
  - new `frontend/src/apollo/searchFilter.ts`
  - new `frontend/src/apollo/validationNavigator.ts`
- type definition files:
  - `frontend/src/types.ts` only if an Apollo-local issue wrapper or helper type cannot avoid shared-type widening

## 12. Do-Not-Change Files

| file path | reason |
| --- | --- |
| `docs/apollo/phase1-orchestration/unit3/00_scope/*` | planning freeze and acceptance criteria are already frozen |
| `docs/apollo/phase1-orchestration/unit3/01_architecture/*` | architecture baseline for Unit 3 must not be silently rewritten during implementation |
| `docs/apollo/phase1-orchestration/unit3/02_plan/*` | work package and order are frozen planning artifacts |
| `docs/apollo/phase1-orchestration/unit3/03_gate/*` | completion gate must remain an external check, not implementation-tuned |
| numeric solver and analysis source areas outside Apollo route | Numeric and Solver are explicitly out of scope |
| LINER source areas | Apollo-only scope; no regression risk should be introduced there |
| road design and linear coordinate source areas | explicitly non-targeted by this verification |
| startup scripts such as `start-ubuntu.sh` and `start-windows.ps1` | implementation permission forbids touching startup paths for Unit 3 work |
| backend APIs and build config | out of scope and unnecessary for Apollo shell productivity features |

## 13. Risk Register

| risk | severity | affected unit | mitigation | owner |
| --- | --- | --- | --- | --- |
| active project identity drifts from workspace snapshot identity | HIGH | U3-A | define active snapshot identity and collision rules first | implementation lead |
| boolean dirty leaks into final guard logic | HIGH | U3-I | replace with saved-baseline fingerprint before adding dialogs | implementation lead |
| history crosses import or project switch boundary | HIGH | U3-C | enforce reset hooks in one shared boundary helper | implementation lead |
| mixed-kind selection enables unsupported actions | MEDIUM | U3-D, U3-F, U3-E | central eligibility table and disabled-state tests | implementation lead |
| clipboard remap creates broken refs | HIGH | U3-E | deterministic remap helper and negative fixtures | implementation lead |
| filter-hidden entity breaks navigator focus | MEDIUM | U3-G, U3-H | visible-projection aware navigation tests | implementation lead |
| import accepts unknown incompatible structures | HIGH | U3-B | explicit envelope validation and unchanged-draft tests | implementation lead |
| Electron close guard diverges from route guard | HIGH | U3-I | shared Save/Discard/Cancel decision path plus Electron tests | implementation lead |

## 14. GO / NOGO Decision

U3_A_TO_U3_B_IMPLEMENTATION_READINESS: CONDITIONAL_GO

判定理由:

- 正本設計書、Planning Freeze、依存順序、完了ゲートは揃っており、9ユニットの責務境界も概ね閉じています。
- fail-closed 境界、Numeric / Solver 非対象、Apollo 対象ファイルの範囲も明確です。
- ただし、実装開始前に短い補強が必要な HIGH 項目が残っています。
- 具体的には `projectId` 衝突解決、validation issue の stable identity、Import の envelope-level fail-closed 診断方針を実装プロンプト冒頭で固定してから着手すべきです。
- これらは設計書全面改稿を要する BLOCKER ではありませんが、未固定のまま一気実装へ進むと後半ユニットで状態契約が揺れる可能性があります。

## 15. Next Recommended Action

CONDITIONAL_GO のため、次の条件を実装プロンプト冒頭ゲートへ入れることを推奨します。

- `projectId` の衝突時ポリシーを固定すること
- validation navigator 用の stable issue key と field locator 派生規則を固定すること
- import の fail-closed 判定を Apollo sidecar だけでなく full project envelope でも定義すること
- mixed-kind clipboard の許容/禁止方針を実装前に固定すること
- dirty source of truth を saved-baseline fingerprint に置換してから UI guard を実装すること
- Electron close/quit guard は browser `beforeunload` の補助ではなく同一 Save/Discard/Cancel 契約で実装すること
- `workspace.ts` の duplicate/new/import 後の id 一意性をテストで拘束すること
- `frontend/src/styles.css` を触る場合は Apollo 専用セレクタに限定すること
- Unit 2 / PR #207 の既存 Apollo UI/UX テストを回帰基準に含めること
- Numeric / Solver / LINER / startup scripts / planning docs を変更しないこと

## 16. Final Verdict

APOLLO_U3_SCOPE_VERIFICATION_FINAL_VERDICT: COMPLETE
