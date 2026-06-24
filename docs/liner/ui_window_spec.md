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

## Open Questions

- Modal dialog vs. dedicated route `/liner`?
- Dock liner inside main window vs. separate BrowserWindow in Electron?
- Dark/light theme inheritance from app?

## Related Documents

- [input_ui_behavior.md](input_ui_behavior.md)
- [rendering_strategy.md](rendering_strategy.md)
- [legal_originality_policy.md](legal_originality_policy.md)
- [docs/08_ui_spec.md](../08_ui_spec.md)

## Pre-Implementation Checklist

- [ ] Wireframe sketch (original layout) approved.
- [ ] i18n key groups enumerated for all menus and panels.
- [ ] Entry point from main menu documented.
- [ ] No JIP-LINER menu hierarchy copied.
