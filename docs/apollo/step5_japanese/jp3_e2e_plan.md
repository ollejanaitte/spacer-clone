# JP3 E2E plan (design only — not implementing now)

## Goals

Detect residual **user-visible** English after JP2.

## Method

1. Playwright DOM text extraction on Apollo shell flows
2. Allowlist from `technical_only_allowlist.csv`
3. Regex for Latin tokens outside allowlist
4. Exclude collapsed `[data-technical-details]` / closed `<details>`
5. Include aria-label, title, tooltip, placeholder
6. Cover dialogs + mobile viewport
7. Screenshot review checklist for authorization banners

## Flows

- sample apply / reapply modal
- Guided G01–G15
- Workflow control
- detailed panels (bridge, cross-frame, pavement, haunch, appurtenance)
- 3D / quantity / load / analysis / outputs
- stale / error / warning paths

## Pass criteria

Zero unexpected user-visible English findings; allowlist-only exceptions; a11y smoke green.
