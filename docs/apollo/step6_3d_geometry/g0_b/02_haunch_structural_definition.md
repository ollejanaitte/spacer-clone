# G0-B Structural Meaning Verification

## Haunch Structural Definition

- RC床版ハンチ (RC deck haunch) = the tapered transition between the girder top flange and the RC deck slab
- Top surface: contacts the underside (soffit) of the RC deck slab
- Bottom surface: contacts the upper face of the girder top flange
- Height: the vertical distance from top flange upper face to deck soffit
- RECT cross-section: constant width (topWidth = bottomWidth)
- TRAPEZOID cross-section: wider at top (toward deck), narrower at bottom (toward girder)
- Extent: continuous along the girder length, one per girder
- Role: transfers shear between deck and girder, increases effective deck thickness locally

## Cross-Frame (V-Brace) Identification

The V-shaped sway bracing pattern with 2 diagonals without a bottom chord is not a self-contained triangulated frame. In typical practice, a V-brace at the bottom chord level would be connected by a horizontal member. The existing separate cross beam (横桁) at each station serves a different structural role (distributing loads transversely at the lower girder region).

The missing member is identified as the **sway bracing bottom chord** (対傾構下弦材 / sway bracing horizontal strut). This member:
- Connects left and right girder web lower attachment points
- Is part of the SwayBracing entity (not a CrossBeam)
- Completes the V-frame triangulation
- Resists tension/compression forces between the two diagonal members

## Term Mapping

| User Image Term | Correct Engineering Term | Current Entity | Exists? |
|----------------|------------------------|----------------|---------|
| ハンチ | RC床版ハンチ | RcDeckHaunch (in BSDD) | YES |
| V形対傾構 | V-type sway bracing | SwayBracing + BraceMember (2) | YES (partial) |
| (missing) | 対傾構下弦材 / bottom chord | BraceMember | NO |
| 横桁 | Cross beam | CrossBeam | YES |
| 下横構 | Lower lateral bracing | LateralBracing (lower) | YES (optional) |

## Decision

| Decision | Verdict | Source |
|----------|---------|--------|
| Haunch should touch deck soffit | YES — currently haunchHeight != deckThickness/2 offset | Code audit |
| V-brace needs bottom chord | YES — structural requirement for triangulated frame | Engineering judgment |
| Bottom chord = BraceMember | YES — reuses existing BraceMember entity | Schema analysis |
| Bottom chord ≠ CrossBeam | YES — different station, different role | Station analysis |
| No schema change needed | YES — BraceMember array is unbounded | generateBsdd.ts analysis |