# Section Type Options

## Option S-A: Same L-Angle as Diagonals (Recommended)

| Property | Value |
|----------|-------|
| Section | Same `ApolloLateralAngleSectionDraft` as diagonal members |
| Dimensions | Same legA, legB, thickness |
| Orientation | Horizontal (rotated 90° from diagonal orientation) |
| Input | Reuses existing `lateralAngleSection` field |
| Schema impact | NONE |
| Implementation | `buildBracingMember` with same angle params, horizontal orientation |
| Structural note | L-angle in horizontal orientation may need to be verified for this load direction |

## Option S-B: Independent L-Angle Section

| Property | Value |
|----------|-------|
| Section | New L-angle section type for bottom chord |
| Dimensions | Could differ from diagonals |
| Input | New field in `ApolloCrossFrameAttachmentDraft` |
| Schema impact | YES — adds new field |
| Not recommended unless structural analysis requires different section |

## Option S-C: Rectangular Box / Cylinder Fallback

| Property | Value |
|----------|-------|
| Section | Simple box or cylinder (80mm default) |
| Input | None (uses fallback) |
| Schema impact | NONE |
| Visual quality | Low (no L-angle detail) |
| Acceptable for | DEVELOPMENT_ONLY visualization |

## Option S-D: Cross Beam Reuse

| Property | Value |
|----------|-------|
| Section | Same as existing cross beam |
| Schema impact | NONE |
| Risk | Role confusion — bottom chord is a BraceMember, not a CrossBeam |
| Not recommended | Cross beam and sway bracing are at different stations; combining them would require station matching logic |