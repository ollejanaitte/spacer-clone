# UI Window Specification

## Purpose

Define the original window and panel structure for the liner module without replicating JIP-LINER screen layouts.

## Scope

- Window types: main editor, optional detached profile view.
- Panel regions: alignment tree, property editor, plan canvas, profile canvas, diagnostics strip.
- Menu and toolbar actions.
- Entry from main application shell.

## Out of Scope

- Pixel-level visual design / CSS tokens.
- Implementation components.
- Inline Japanese strings (i18n only).

## Assumptions

- Follows existing app patterns (Electron window, React routing or modal).
- Japanese UI labels from `frontend/src/i18n/ja.ts` or dedicated locale JSON per [language policy](../development/language-policy.md).

## Design Topics

- Main window regions: left navigator, center plan view, bottom or right profile view, right property inspector.
- Toolbar: new, open, save, compute, export frame model, export report, export CAD.
- Status bar: station under cursor, computation state, dirty flag.
- Original iconography — no third-party logos.
- Keyboard shortcuts (English internal names; Japanese tooltips via i18n).

## P1-6 route and panel boundaries (preparation)

Future liner UI uses **embedded pro routes** under `/pro/liner/*` (same shell as `/pro/th/run`). Internal route ids: `liner.setup`, `liner.preview`, `liner.mappingReview`. **Not registered in P1-6** — constants only in `frontend/src/liner/uiPreparation.ts`.

| Panel | Route | Role |
| --- | --- | --- |
| Alignment input | `liner.setup` | Domain edit (alignment, profile, grid defs) |
| Station table | `liner.setup` | Read-only `stations` after compute |
| Grid preview | `liner.preview` | Plan/profile canvas from intermediate |
| Diagnostics | `liner.preview` | `ComputationDiagnostic[]` display |
| Mapping review | `liner.mappingReview` | Mapper output preview before merge |
| Headless generation summary | `liner.mappingReview` | P1-5 validation readiness |

Full inventory: [ui_preparation.md](ui_preparation.md).

## Open Questions

- Dock liner inside main window vs. separate BrowserWindow in Electron?
- Dark/light theme inheritance from app?

## Related Documents

- [input_ui_behavior.md](input_ui_behavior.md)
- [rendering_strategy.md](rendering_strategy.md)
- [legal_originality_policy.md](legal_originality_policy.md)
- [docs/08_ui_spec.md](../08_ui_spec.md)

## Pre-Implementation Checklist

- [ ] Wireframe sketch (original layout) approved.
- [x] i18n key groups enumerated (`liner.*` in `ja.ts`; see [ui_preparation.md](ui_preparation.md)).
- [x] Route/panel ids and reserved paths documented (P1-6).
- [ ] Entry point from main menu wired in React.
- [ ] No JIP-LINER menu hierarchy copied.
