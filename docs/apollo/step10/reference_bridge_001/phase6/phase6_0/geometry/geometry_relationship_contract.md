# Geometry Relationship Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Hierarchy

```
AlignmentReference
  |-- SupportLine            (support station on alignment; skew)
  |    `-- SupportPoint      (bearing positions per girder)
  `-- GirderLine             (offset from alignment)
       |-- GirderStationPoint
       |-- CrossGirderReference
       `-- BracingReference
GridPoint / CrossSectionFrame  (per station, derived from alignment + girder offsets)
DeckReferenceLine -> DeckBoundary
MemberPlacementReference (from girder/station frames)
BearingReferencePoint (from SupportPoint + girder)
GeometryIssue (diagnostics)
```

## 2. Parent-child rules

- Every entity except AlignmentReference has exactly one parent.
- Deleting/marking a parent as unresolved propagates to children (state inheritance).
- IDs are unique across the snapshot; children reference parent IDs, never positions.

## 3. Cross-references

- SupportPoint -> GirderLine (bearing per girder).
- CrossSectionFrame -> GridPoint set at that station.
- MemberPlacementReference -> crossSectionFrame + girder line.
- GeometryIssue -> affected entity ID(s).

## 4. Traceability

- Each entity carries `source` (Common Model entity) and `traceability` (Golden IDs,
  sourceRecordIds) so every geometry entity is traceable to Golden.

## 5. No hidden recompute

- Relationships are generated once by the Geometry Engine; consumers follow
  references, never re-derive coordinates from parent/child data.
