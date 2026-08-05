# Focus Lifecycle Design

## Principles

1. Focus is managed by the drawer, not by callback identity.
2. Callback identity is not a UI lifecycle event.
3. Parent re-render is not a close event.
4. Canonical commit is not a close event.
5. Focus management is separate from input value management.

## Lifecycle

```
closed ──open──▶ open (autofocus first focusable)
  ▲                 │
  │                 │ parent rerender (same open): NO focus change
  │                 ▼
  └──close/unmount── (restore focus to trigger, remove listeners)
```

## State Transitions

| Transition | Autofocus | Restore | Listener |
|------------|-----------|---------|----------|
| closed → open | YES (first focusable) | NO | register |
| open → open (same props) | NO | NO | keep |
| open → open (new onClose identity) | NO | NO | keep |
| open → open (Enter commit rerender) | NO | NO | keep |
| open → open (isDirty update) | NO | NO | keep |
| open → closed (Escape/button/backdrop/done) | NO | YES | remove |
| open → unmount | NO | YES | remove |
| closed → closed | NO | NO | none |

## Key Implementation Details

- `onCloseRef.current = onClose` updated in a separate effect.
- Focus effect deps: `[open]` only.
- Escape reads `onCloseRef.current`.
- Trigger captured on open; restored only on real close/unmount.
- Trigger restoration guarded: if trigger not in DOM, no-op (no throw).