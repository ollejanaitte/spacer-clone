# Apollo Phase 1-NN Unit 3 Implementation Decisions

- Effective date: Wednesday, July 29, 2026
- Repository: `/home/masaharu/Projects/spacer-clone-apollo-u3`
- Baseline `origin/main`: `71593c7af899a4827a0cac6037e9f149213ef98c`
- Scope verification input: `docs/apollo/phase1-orchestration/unit3/apollo_u3_scope_verification_report.md`
- Reviewer fallback: `grok4.5` alias was not accepted by Cursor CLI on July 29, 2026. Per user instruction, Codex performed the read-only scope audit instead of switching to a prohibited model id.

## Decision Freeze

### 1. `projectId` policy

- `project.project.id` is the canonical internal `projectId`.
- User-visible project name is `project.project.name` and is fully independent from `projectId`.
- Project name accepts Japanese, Unicode, uppercase, lowercase, fullwidth, and halfwidth characters.
- `projectId` is ASCII-safe and generated only by a centralized Apollo helper.
- New project creation generates a fresh stable ID and does not derive it from name, label, description, or comment fields.
- Duplicate project creation always generates a new `projectId`.
- Duplicate project naming uses deterministic lowest-unused suffixes:
  - `source-copy`
  - `source-copy-2`
  - `source-copy-3`
- Import never silently overwrites an existing `projectId`.
- On import collision, default behavior is fail-closed rejection with user-visible diagnostics.
- Only an explicit future opt-in flow named equivalent to "別プロジェクトとして取り込む" may remap imported `projectId`; Unit 3 default flow does not auto-remap collisions.
- `projectId` is not editable through normal text fields in Apollo Unit 3.
- If shown in UI, `projectId` is rendered as read-only technical metadata.

### 2. Validation issue stable identity

- Apollo Unit 3 introduces an Apollo-local validation navigator issue wrapper instead of changing the frozen planning docs.
- Minimum fields:
  - `issueKey`
  - `severity`
  - `ruleId`
  - `entityType`
  - `entityId`
  - `paneId`
  - `fieldPath`
  - `message`
  - `focusLocator`
- `issueKey` format is deterministic and message-independent:
  - `${ruleId}|${entityType}|${entityId ?? "none"}|${fieldPath ?? "none"}|${occurrenceIndex}`
- `occurrenceIndex` is assigned after deterministic sorting by:
  - severity
  - `ruleId`
  - `entityType`
  - `entityId`
  - `fieldPath`
- Japanese localized messages are display-only and never part of issue identity.

### 3. Import envelope strictness

- Import validates the full canonical project envelope before any active state mutation.
- Validation order is:
  1. UTF-8 text decode and optional BOM removal
  2. JSON parse
  3. top-level `ProjectModel` structural validation
  4. Apollo sidecar presence and schema validation
  5. duplicate ID validation
  6. broken reference validation
  7. unknown structure rejection
- Unknown `schemaVersion` fails closed.
- Missing required fields fail closed.
- Wrong types fail closed.
- Duplicate IDs fail closed.
- Broken references fail closed.
- Unknown unsupported structure fails closed.
- Unknown fields are not passed through automatically.
- File-picker cancel leaves state unchanged.
- Parse failure leaves state unchanged.
- Validation failure leaves state unchanged.
- Only fully successful import atomically replaces active Apollo state.
- Successful import resets:
  - history
  - selection
  - clipboard
  - validation navigator cursor
- Failed import preserves:
  - current draft
  - history
  - selection
  - clipboard
- Renderer does not access filesystem directly.
- Existing context-isolated Electron bridge remains the only Apollo file I/O path.

### 4. Mixed-kind clipboard

- Unit 3 clipboard supports homogeneous selection only.
- Mixed selections such as `node + member` are not copyable.
- Copy action is disabled for mixed-kind selections.
- Apollo shows a user-visible blocked reason for mixed-kind copy attempts.
- Unsupported mixed payloads fail closed before any mutation.
- Grouped mixed clipboard payloads are explicitly out of scope for Unit 3.

### 5. Shift range

- Shift range selection uses the visible order of the current rendered table only.
- When a filter is active, visible order means the filtered visible order.
- Hidden rows are not implicitly included in a Shift range.
- Row indexes are never stored as stable entity identity.

### 6. Malformed workspace snapshot

- Malformed workspace snapshots are not silently deleted.
- Apollo workspace UI shows a non-destructive warning for malformed entries.
- Opening a malformed snapshot is rejected.
- The current active draft remains unchanged.
- Detailed diagnostics are retained for display and test assertions.
- Automatic deletion is forbidden.
- Deletion requires explicit user action and confirmation.

### 7. Dirty source of truth

- The canonical dirty source of truth is a saved-baseline fingerprint comparison.
- A write-only boolean is not authoritative.
- The fingerprint is computed from a deterministic canonical serialization of:
  - project domain data
  - Apollo-managed editable data
  - Apollo metadata included in persistence
- The fingerprint excludes session-only UI state:
  - search query
  - filters
  - selection
  - validation navigator cursor
  - hover
  - focus
  - dialog open state
- Undo back to the saved-baseline fingerprint clears dirty.
- Redo restoring a divergence sets dirty again.
- Workspace snapshot save does not clear dirty.
- File save, file open, import success, and explicit discard update the saved baseline according to the persistence contract.

### 8. Electron close and quit guard

- Browser `beforeunload` is fallback only and is not the completion implementation.
- Apollo uses one shared `Save / Discard / Cancel` contract for:
  - new project
  - open workspace snapshot
  - file open/import
  - route leave
  - window close
  - app quit
- Failed save must not close or switch.
- Cancel must keep state unchanged.
- Pending IME composition must be safely flushed or explicitly resolved before guard continuation.
- Responsibility split:
  - renderer: computes dirty state, runs guard contract, finalizes composition state
  - preload: exposes approved IPC bridge only
  - main: intercepts close/quit lifecycle and waits for renderer decision
- Renderer direct filesystem access is forbidden.

### 9. IME composition contract

- Policy token:
  - `IME_COMPOSITION_COMMIT_POLICY: DEFER_AUTHORITATIVE_COMMIT_UNTIL_COMPOSITION_END`
- Apollo implements Apollo-local composition-aware inputs and helpers rather than importing LINER internals directly.
- Authoritative draft commits are deferred until composition end.
- Composition display state is maintained locally per input.
- Composition sessions must:
  - preserve in-progress text
  - avoid caret jumps
  - avoid selection corruption
  - suppress app-level shortcuts
  - suppress Enter-triggered submit/navigation
- `compositionend` commits exactly once.
- Blur and guard transitions flush pending composition safely.

### 10. Undo and redo transaction policy for IME

- Policy token:
  - `IME_HISTORY_TRANSACTION_POLICY: ONE_COMPOSITION_SESSION_EQUALS_ONE_HISTORY_TRANSACTION`
- One IME composition session equals one history transaction.
- Intermediate IME drafts do not create per-keystroke history entries.
- Equal-value commits create no history entry.
- Project switch, import success, and new draft reset history boundaries.
- Direct non-IME typing is coalesced into bounded text-edit transactions and closed on blur, Enter commit, or focus move.

### 11. Search normalization

- Policy token:
  - `SEARCH_NORMALIZATION_POLICY: TRIM + CASE_INSENSITIVE_COMPARISON + NFKC_FOR_COMPARISON_ONLY`
- Persisted values are never modified for search.
- Both query and candidate are normalized for comparison only.
- Normalization steps are:
  1. trim
  2. `normalize("NFKC")`
  3. locale-stable lowercase comparison
- Entity type filter remains case-insensitive exact match.
- ID/name/label search remains partial match after comparison normalization.
- Unit 3 explicitly excludes kana/kanji fuzzy equivalence and romaji transliteration.

### 12. Numeric normalization

- Policy token:
  - `NUMERIC_INPUT_UNICODE_POLICY: ACCEPT_FULLWIDTH_ASCII_NUMERIC_CHARACTERS + NORMALIZE_ON_COMMIT + REJECT_NON_NUMERIC_TEXT`
- Numeric fields use split draft vs committed numeric state.
- Accepted commit-time conversions:
  - `０-９` -> `0-9`
  - `．` -> `.`
  - `＋` -> `+`
  - `－` and `−` -> `-`
  - leading and trailing fullwidth or halfwidth spaces are trimmed
- Rejected examples remain invalid:
  - `百二十三`
  - `１２３ｍ`
  - `橋長１２３`
  - `1,234.5`
  - `１２３，４`
  - `Infinity`
  - `NaN`
- Empty string and incomplete tokens such as `-`, `.`, and `-.` are not coerced to `0`.
- Invalid commit must preserve the previous valid domain value and show an explicit error.

### 13. UTF-8 import and export

- Export JSON is UTF-8.
- Export content type is equivalent to `application/json;charset=utf-8`.
- Import accepts UTF-8 and may strip UTF-8 BOM.
- UTF-16 or undecidable encodings are rejected rather than misread.
- Japanese and fullwidth file names are supported through the Electron native dialog path.
- Round-trip string fidelity is required for:
  - project name
  - description
  - node/member/support/material names, labels, and comments
  - Japanese text
  - uppercase/lowercase
  - fullwidth/halfwidth
  - symbols
  - whitespace
  - newlines

## Audit Notes

- Current Unit 2 implementation does not satisfy these conditions yet:
  - `dirty` is a write-only boolean in `App.tsx`
  - Apollo workspace silently drops malformed entries during normalization
  - `projectId` is editable in Apollo detail editors and duplicate logic is non-deterministic
  - numeric inputs commit on every `onChange`
  - no IME-aware Apollo-specific input layer exists
  - no history, multi-select, clipboard, bulk edit, search/filter, or validation navigator state helpers exist
  - no Electron close/quit guard contract exists for Apollo
- These gaps are implementation work, not planning changes.

## Verdict

U3_IMPLEMENTATION_CONDITION_FREEZE_VERDICT: PASS
