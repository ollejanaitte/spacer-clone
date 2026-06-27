# Liner List Page

## Purpose

Define the Phase2 P2-2 line-list UI surface before implementing edit, station/profile input, preview, or viewer connection.

## Scope

- Register a list route for entering the liner workflow.
- Show current project liner integration metadata when present.
- Provide navigation to the setup route for creating or opening an editable liner draft.

## Out of Scope

- Persisting multiple editable liner domain models in `project.liner`.
- Creating `schemas/liner-project.schema.json`.
- Running geometry or mapping from the list page.
- Editing stations, profiles, or grid preview.

## Route

| Route id | Path | Purpose |
| --- | --- | --- |
| `liner.list` | `/pro/liner` | List entry point for current project liner models and draft creation. |
| `liner.setup` | `/pro/liner/setup` | Form editor entry point implemented in later P2 tasks. |

The list route is additive. Existing P1-6 setup, preview, and mapping-review route ids remain unchanged.

## Data Boundary

P2-2 must not treat `project.liner` as a full domain registry. P2-1 confirmed that the current schema stores integration metadata only.

| Source | P2-2 behavior |
| --- | --- |
| `project.liner` | Display one attached liner metadata row for the current project. |
| `project.linerTrace` | Display trace count for the attached row. |
| Draft domain data | Not persisted; created in later setup/editor tasks. |
| Intermediate / mapping data | Not computed by the list page. |

## UI Behavior

- The toolbar opens `/pro/liner`.
- Closing the list returns to `/pro`.
- Selecting the create action navigates to `/pro/liner/setup`.
- Until setup, preview, and mapping-review pages are implemented, reserved liner routes render a liner-scoped placeholder instead of falling through to the main workspace.
- The page shows an empty state when no `project.liner` metadata exists.
- All user-visible Japanese strings are under `ja.liner.*`.
- CSS selectors use global `liner-*` kebab-case classes in `frontend/src/styles.css`.

## Human Review Required

| Fact | Decision needed |
| --- | --- |
| Full editable liner domain persistence is not implemented. | Whether the list should later become a project-level registry, a file browser, or both. |
| `/pro/liner/setup` is only reserved at P2-2. | P2-2 uses a placeholder; P2-3 should replace it with the actual editor. |
