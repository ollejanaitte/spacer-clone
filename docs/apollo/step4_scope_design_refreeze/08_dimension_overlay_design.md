# 08 — 3D Dimension Overlay Design

## Principles

1. Overlay values come from **canonical input / entities**.
2. **Never** reverse-engineer design dimensions from mesh AABB.
3. **2-point measurement** uses user-selected 3D points only; labeled `USER_MEASUREMENT`.
4. Drawing DIMENSION entities and 3D overlay share `sourceEntityIds` where applicable.
5. Separate display precision from internal float values.
6. Overlay **not** included in STL export.

## Groups

- **A Overall:** L, span, width, deck t, girder H
- **B Transverse:** spacing, overhang, curb/railing/median/haunch
- **C Girder detail:** flanges/web, spacings, splice station/plates, filler t
- **D Measure:** distance, ΔX/ΔY/ΔZ, station delta

## Technical approach (DEC-S4-0015)

- Prefer Three.js line + cone/arrow helpers + **CSS2D** labels (or existing HTML overlay if present)
- Camera-facing labels; optional depthTest off for readability with fade
- Zoom-dependent scale clamp
- Visibility groups toggles; m/mm unit switch
- Performance: only visible group entities; no per-frame string alloc storms
- Accessibility: keyboard focusable dimension list panel mirroring 3D picks

## Persistence

Display-first in 4-F; optional save of user measurements (O-05) without making them design SoR.
