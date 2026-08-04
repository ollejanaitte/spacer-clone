# Fullscreen White Overlay Root Cause Analysis

## Investigation Results

### Current Architecture
- **No React portals used** — all dialogs render inline
- **No Fullscreen API usage** — no requestFullscreen/exitFullscreen anywhere
- **No global body scroll locking** — dialogs do not set overflow:hidden on body
- **z-index hierarchy**: max 2000 for `.apollo-guard-backdrop`

### Dialog patterns
All Apollo dialogs use the same pattern:
```html
<div class="apollo-guard-backdrop" role="presentation" style="position:fixed; inset:0; z-index:2000; background:rgba(15,23,42,0.45)">
  <section class="apollo-guard-dialog" role="dialog" aria-modal="true" style="background:#fff; border-radius:14px; width:min(480px,100%)">
```

### Root Cause Suspects

1. **apollo-guard-dialog background**: `#fff` white background on the dialog panel. If the backdrop CSS fails (e.g., stacking context issue from transform/opacity/isolation on ancestor elements), the white dialog panel may be the only visible element, appearing as a white overlay.

2. **`.apollo-unit2-editor` and `.apollo-unit2-visual-panel`** have `isolation: isolate` — this creates new stacking contexts. If a dialog renders inside one of these containers (inline, no portal), it will be clipped to that container's stacking context, potentially appearing behind or being cut off by the container boundaries.

3. **The `runGuardedAction` hook** in ApolloPhase1Shell creates temporary dialogs that are mounted/unmounted. If the cleanup doesn't properly remove the backdrop, a transparent overlay with pointer-events:none issues could remain.

4. **No React portals** means all dialogs render inside the `.apollo-phase1-shell` main element. If this element has `isolation: isolate` or `transform` or `opacity` that creates a new stacking context, the fixed-position backdrop will be constrained to that context, potentially not covering the full viewport.

5. **Electron**: Main window has standard frame. No fullscreen/kiosk mode. Splash screen is frameless but only shown on startup.

### Confirmed in CSS
- `.apollo-guard-backdrop`: `position: fixed; inset: 0; z-index: 2000; background: rgba(15, 23, 42, 0.45);`
- `.apollo-guard-dialog`: `background: #fff` (white)
- No `overflow: hidden` on body when dialog is open
- No `pointer-events: none` on backdrop

### Why it appears white
The most likely scenario: In certain viewport sizes or after certain operations, the `apollo-guard-dialog` panel stretches to fill the viewport (width: min(480px,100%) in a full-width container) and the semi-transparent backdrop either disappears (stacking context issue) or is not rendered. The white dialog background then covers the screen.

### Fix Strategy
1. Ensure dialogs use React portals to render at document.body level (not inside isolated stacking contexts)
2. Add body scroll locking when dialogs are open
3. Ensure cleanup removes all dialog elements
4. Fix stacking context issues