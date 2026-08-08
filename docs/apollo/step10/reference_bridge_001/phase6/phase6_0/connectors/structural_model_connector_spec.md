# Structural Model Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `GeometrySnapshot → Structural Model Connector → Frame/Structural Model`

## 1. Purpose

Map GeometrySnapshot bridge geometry into the frame/structural model (nodes,
members, supports). The connector reads snapshot coordinates; it never recomputes
bridge geometry.

## 2. Inputs

- GeometrySnapshot (supports, girderLines, gridPoints, crossSectionFrames,
  memberPlacementReferences, bearingPoints)

## 3. Outputs

- Frame nodes (id, x/y/z from snapshot global coords)
- Members (nodeI/nodeJ from placement references + local axis from snapshot frames)
- Supports (nodeId + restraint mapping)
- Eccentricity references (bearing/member offsets)

## 4. Responsibilities

- geometry entity -> node
- placement reference -> member (nodeI/nodeJ)
- local axis mapping (snapshot frames -> member local axes)
- support point mapping
- eccentricity reference (bearing point offsets)

## 5. Prohibited

- station->XYZ recomputation
- girder line regeneration
- support skew recomputation
- crossfall/elevation recomputation

## 6. Interface sketch (pseudocode)

```
interface StructuralModelConnector {
  buildNode(snapshotGridPoint) -> Node;
  buildMember(snapshotMemberPlacementReference) -> Member;
  buildSupport(snapshotSupportPoint) -> Support;
  localAxis(snapshotFrame) -> OrientationVector;
}
```

## 7. Existing duplication addressed

- Replaces the independent FEM grid generators (bridge_fem_generator,
  structuralModelGenerator) with snapshot consumption (DUP-008/009).
- Replaces substructure/UI snapshot producers that disagree with the canonical
  snapshot (DUP-010/011/012).

## 8. Owner

Structural Model layer consumes via connector; coordinate authority = GeometrySnapshot.
