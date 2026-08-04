# 08 — Accessibility Policy

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
Carries forward Step 5 JP mobile/a11y rules; applies to Step 6 UI chrome.

## Requirements

1. **Not color-only:** status badges keep symbol + Japanese label.
2. **Focus visible** on mode switch, progress jumps, sticky actions, WF rows, mobile tabs.
3. **Keyboard order (Guided):** header → progress → inspector controls → viewer toggle → sticky actions.
4. **`aria-current`** for active mode, active G slide, selected WF step, active mobile tab.
5. **Accessible names in Japanese** for user controls; English `data-testid` OK.
6. **Sticky/footer** must be reachable by keyboard without pointer.
7. **Contrast** must not regress vs JP3 baselines for auth strip and badges.

## Verification (each UI PR as applicable)

- Keyboard pass on changed surfaces
- Focus visibility spot-check
- Step4A a11y badge assertions remain green
- Mobile a11y smoke from JP3 patterns
