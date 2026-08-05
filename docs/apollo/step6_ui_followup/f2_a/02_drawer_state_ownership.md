# F2-A Drawer State Ownership

## Canonical State: Single Owner

The `project: ProjectModel` prop passed to `ApolloPhase1Shell` is the **sole canonical data source**. All edits flow through:
- `onProjectChange(nextProject, mode)` — the single mutation path
- `onResetProjectHistory` — history baseline
- `onCloseHistoryTransaction` — commit transaction
- `onUndo` / `onRedo` — undo/redo
- `onEstablishBaseline` — save baseline

## Drawer State: UI-only

Drawer open/close and target selection are **UI state** in `ApolloPhase1Shell`:

```ts
const [drawerTarget, setDrawerTarget] = useState<GuidedDetailEscape | null>(null);
```

- Opening/closing the drawer does **NOT** touch project state, history, or dirty flag.
- The drawer renders the same panel component bound to the same `project` prop.
- Edits inside the drawer use the exact same `onProjectChange` path as inline editing.

## History Rules

| Action | History Impact |
|--------|---------------|
| Open drawer | none |
| Close drawer | none |
| Edit field in drawer | one history transaction (same as inline) |
| Undo/Redo while drawer open | applies to project state; drawer re-renders |

## Dirty / Save Rules

- `isDirty` is derived from project state vs baseline. Drawer edits update it correctly because they use `onProjectChange`.
- The existing explicit "保存" button (header) and Guided footer "保存" both call `saveToFile()`.
- "次へ" never saves (already implemented in F1-B2).