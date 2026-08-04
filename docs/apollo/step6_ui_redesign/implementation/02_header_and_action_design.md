# Header and Action Design — UI-1

## Current State

Single header bar mixing:
- Mode toggle (Guided / List Edit)
- File operations (Open / Save)
- Navigation (Back to Menu)
- Help (Operation Guide)
- Authorization banner (large, always expanded)

## Target State (UI-1)

### Visual Grouping

```
[Logo]  |  [Guided] [List]  |  [Open] [Save] [● saved]  |  [← Menu]  |  [ⓘ Help]  |  [Auth Badge ▼]
         ^-- mode group       ^-- file+status group        ^-- nav        ^-- help       ^-- auth
```

Dividers or subtle background tint separate the four groups.

### Action Semantics

| Group | Actions | Semantic Type | UI-1 Change |
|-------|---------|---------------|-------------|
| Mode | Guided, List Edit | Display mode switch | Existing toggle, add visual group separation |
| File | Open, Save | File I/O | Existing; add save-status badge next to Save |
| Navigation | Back to Menu | Route navigation | Existing, move to its own group |
| Help | Operation Guide | Help / info | Existing, move to its own group (icon-only in header, full content elsewhere) |

### Save Status Badge

- Not a button (no click action)
- States: "保存済み" (saved, green indicator), "変更あり" (unsaved, amber indicator), "未保存" (never saved, gray indicator)
- Position: immediately after Save button
- Derived from isBridgeStructureGenerationCurrent (STALE) + project dirty flag

### Authorization Display (Compact)

- Default: single-line display showing just the token value in a small badge
  - Example: `[NOT_GRANTED]` (compact, gray)
- Expand: click/tap badge or ▼ icon reveals full description
  - "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED"
  - "DESIGN_OR_CONSTRUCTION_USE: PROHIBITED"
  - "FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION"
- On output/analysis/formal-product screens: auto-expanded (stronger display) as before
- Collapse after 10s on non-output screens
- Formal authorization token values: NEVER MODIFIED

### Implementation

- File: `frontend/src/apollo/ApolloPhase1Shell.tsx` header section
- New: `frontend/src/apollo/components/HeaderGroup.tsx` (wraps sectioned header)
- New: `frontend/src/apollo/components/SaveStatusBadge.tsx`
- New: `frontend/src/apollo/components/CompactAuthorizationBadge.tsx`
- Update: `AuthorizationBanner.tsx` → delegate to CompactAuthorizationBadge for compact mode; keep existing for expanded/output mode
- Update: `frontend/src/apollo/i18n/catalog.ts` — add labels if needed
- CSS: update `frontend/src/styles.css` apollo-header-* rules

### Non-Goals in UI-1

- Guided/Workflow/Viewer internal redesign (UI-2/UI-3/UI-4)
- Responsive layout (UI-5)