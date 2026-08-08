# Geometry Entity Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Entity model

Every geometry entity in the Apollo Geometry Engine / GeometrySnapshot carries:

- **stable ID** (deterministic, save/reload invariant, never array index)
- **parent relationship** (hierarchy: alignment -> support/girder line -> points)
- **source** (Common Model entity id + Golden/source references)
- **global coordinates** (X/Y/Z, m) — when resolvable
- **local frame** (bridge-local L/T/V or member-local frame) — when applicable
- **station** (m) — alignment position
- **traceability** (sourceRecordIds, goldenId, traceabilityId)
- **resolution state** (CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT /
  HOLD_INSUFFICIENT_SOURCE / NOT_AVAILABLE)

## 2. Entity catalog

See `geometry_entity_catalog.csv`. Minimum entity types:
- AlignmentReference
- SupportLine, SupportPoint
- GirderLine, GirderStationPoint
- GridPoint
- CrossSectionFrame
- DeckReferenceLine, DeckBoundary
- BearingReferencePoint
- CrossGirderReference, BracingReference
- MemberPlacementReference
- GeometryIssue

## 3. Stable ID rules

- ID is stable across regeneration and save/reload.
- Deterministic where possible (semantic key, e.g. `SUP:PU15`, `GIR:AG1`, `GP:{station}`).
- Display name is separate from ID.
- No array index as ID.

## 4. Resolution state propagation

- Entities inherit resolution state from their source values.
- An entity with any HOLD/conflict/HCR field is flagged accordingly; it is never
  silently defaulted.

## 5. Unresolved geometry

See `unresolved_geometry_contract.md` for generation policy (ERROR / SKIP_ENTITY /
GENERATE_PARTIAL / USE_CONFIRMED_PORTION_ONLY / HUMAN_CONFIRMATION_REQUIRED).

## 6. Relationships

See `geometry_relationship_contract.md` for parent/child and reference relations.
