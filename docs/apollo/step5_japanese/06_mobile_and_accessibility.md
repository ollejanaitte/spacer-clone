# 06 — Mobile and accessibility (JP1-C)

## Mobile

- Do not lengthen L1 so that primary CTA drops below first screen without scroll cue
- Prefer short_ja on narrow widths when primary_ja wraps >2 lines
- Disclosure for L3 must not steal primary tap targets

## Accessibility

- Visible label and accessible name must match (JA)
- Do not rely on color alone for status (keep symbol + text)
- `aria-label` must be Japanese for user controls; English testids remain
- Focus order: status → primary action → secondary → technical disclosure
- Dialogs (reapply): announce L1 summary; put codes in L3

## Non-regression

JP2/JP3 must not reduce contrast, tap size, or keyboard operability versus current Apollo UI.
