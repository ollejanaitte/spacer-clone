# Reference Bridge 001 Definition

## 1. Purpose

Define `Reference Bridge 001` (`RB-S10-001`) as the **Step 10 reproduction target**
for a 3-span continuous steel plate girder bridge with a curved alignment section.
This document establishes machine and human identifiers, separates the new
reference bridge from the existing `RB-P1-001`, and records the Phase 0 status.

## 2. Identity

| Field | Value |
|---|---|
| `referenceBridgeId` | `RB-S10-001` |
| `displayName` | Reference Bridge 001 |
| `developmentLabel` | UNVERIFIED_DEVELOPMENT_ONLY |
| Phase 0 status | SOURCE_BACKED_GOLDEN_CANDIDATE |
| Bridge type | 3-span continuous steel plate girder bridge |
| Curve | Includes curved alignment (R=160m and R=3000m reported in source) |
| Original source | Kanazawa IC A-ramp / Asahidake Elevated Bridge A-ramp (PU15-AR2) |
| Source originals | `05_source_original_manifest_policy.md` + `source_original_manifest.csv` |

## 3. Reference Bridge Crosswalk

| `referenceBridgeId` | `displayName` | Bridge type | Span condition | Composite deck | Curve | Phase | Authorization | Golden numerics | Role | Action in Step 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `RB-P1-001` | Phase 1 Reference Bridge (planning draft) | straight | single simple span | non-composite RC | none | 1 | DRAFT_PLANNING_ONLY / NOT_AUTHORIZED | NOT_AUTHORIZED | Planning archetype | Retained as-is; not renamed, deleted, or overwritten |
| `RB-S10-001` | Reference Bridge 001 | 3-span continuous | continuous (3 spans) | steel plate girder | curved section | 10 | SOURCE_BACKED_GOLDEN_CANDIDATE | NOT_YET_EVALUATED | Reproduction target | New; input from originals; numerics NOT adopted until Phase 9 |

## 4. RB-P1-001 (existing — do not touch)

`RB-P1-001` is the Phase 1 planning archetype. Its defining facts:

- **Bridge type:** straight bridge, single simple span
- **Structural type:** non-composite RC deck steel plate girder, 4–6 main girders
- **Curve:** none
- **Authorization:** DRAFT_PLANNING_ONLY; Golden numerics NOT_AUTHORIZED
- **Location:** `docs/apollo/step1/07_validation/reference_bridge_definition.md`

`RB-P1-001` is retained as a legacy Phase 1 asset. Step 10 does **not**:

- rename `RB-P1-001`
- delete `RB-P1-001`
- overwrite `RB-P1-001`
- change `RB-P1-001` numerics, schema, or tests
- merge `RB-P1-001` and `RB-S10-001`

## 5. RB-S10-001 (new — reproduction target)

`RB-S10-001` is a distinct reference bridge. Its known facts (Phase 0):

- **Bridge type:** 3-span continuous steel plate girder
- **Spans:** 3 spans (continuous)
- **Deck:** steel plate girder
- **Curve:** includes a curved alignment section; horizontal curvature reported
  with R=160m and R=3000m in the source
- **Original:** Kanazawa IC A-ramp / Asahidake Elevated Bridge A-ramp (PU15-AR2)
- **Status:** SOURCE_BACKED_GOLDEN_CANDIDATE

### Phase 0 confirmed / Phase 0 unconfirmed

**Confirmed at Phase 0:**

- A steel plate girder bridge original exists with the expected SHA256 and page count
  (see `source_original_manifest.csv`).
- The original identifies as 3-span continuous.
- The original reports horizontal curvature (R=160m / R=3000m).
- The identifier `RB-S10-001` does not collide with `RB-P1-001`.

**Unconfirmed at Phase 0 (to be verified in Phase 1):**

- Exact span lengths, pier locations, bearings
- Superstructure section properties and materials
- Load cases, analysis model, and numeric results
- The exact correspondence between every drawing sheet and every calculation
  page (sheet-to-page mapping and revision relationship)
- Whether the original is a single self-contained set or assembled from multiple
  revisions

## 6. Golden policy (Phase 0)

At Phase 0, `RB-S10-001` is a **candidate only**. Its numerics are NOT adopted as
golden expected values. Numeric adoption, if authorized, must proceed through:

1. Phase 2 (complete structural decomposition) — establish page-level provenance
2. Phase 9 (design check reproduction) — confirm same design results
3. Phase 13 (integrated reproduction) — confirm report and drawing parity
4. Human engineering review and `adoption_status: ADOPTED`
5. New `DEC-S10-xxxx` decision or supervisor approval

Until numeric adoption is granted, `RB-S10-001` numerics remain
`NOT_EVALUATED` and are separated from any test expected values (fail-closed on
auto-fill, consistent with Step 1 policy for `RB-P1-001`).

## 7. Non-targets

`RB-S10-001` does **not** authorize:

- Production fixture commitment
- Numeric golden expected values output
- UI changes for curve-specific features without Phase 6+ architecture
- Modification of existing Phase 1 `RB-P1-001` assets

## 8. Phase 0 verdict

`RB-P1-001` and `RB-S10-001` are confirmed as distinct identifier-space members.
No collision. `RB-S10-001` is registered as SOURCE_BACKED_GOLDEN_CANDIDATE with
numerics NOT_EVALUATED.

## Identifier cross-reference

| Concept | `RB-P1-001` | `RB-S10-001` |
|---|---|---|
| `referenceBridgeId` | RB-P1-001 | RB-S10-001 |
| `displayName` | Phase 1 Reference Bridge | Reference Bridge 001 |
| Step 9 / Step 10 asset retention | Retained unchanged | New |
| Curve | none | curved section (R=160m / R=3000m) |
| Numerics | NOT_AUTHORIZED | NOT_EVALUATED (candidate) |
