# Alignment Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `LINER → Alignment Connector → Apollo Geometry Engine`

## 1. Purpose

Adapt LINER road-alignment results into the bridge-side geometry contract. The
connector is an adapter over LINER output; it NEVER reimplements LINER math
(line/arc/clothoid/vertical/crossfall).

## 2. Inputs (candidate)

- `alignmentId`
- `station` (m, physical or displayed per contract)
- `offset` (m, right-positive)
- vertical profile reference
- crossfall reference
- coordinate frame request (point, tangent, section)

## 3. Outputs (candidate)

- `position`: XYZ (m, global)
- `tangent`, `transverse`, `vertical` (local basis, right-handed)
- `azimuth` (rad)
- `grade`, `crossfall`
- `curvature`
- `sourceStation` (station actually used at LINER)

## 4. Interface sketch (pseudocode)

```
interface AlignmentConnector {
  samplePoint(request: {alignmentId, station, offset}) -> {
    position: Vec3, azimuthRad: number, curvature: number,
    grade: number, crossfallPercent: number,
    tangent: Vec3, transverse: Vec3, vertical: Vec3,
    sourceStation: number, sourceOffset: number
  };
  sampleSection(request: {alignmentId, station, offsets[]}) -> SectionSample;
}
```

## 5. Responsibilities

- Map bridge-side station/offset requests to LINER evaluation calls.
- Carry LINER-provided XYZ, azimuth, frames, grade, crossfall into the bridge contract.
- Preserve `sourceStation`/`sourceOffset` for traceability.
- Propagate unresolved/LINER-absence states (e.g. alignment missing -> GeometryIssue).

## 6. Prohibited

- Reimplementing station->XY, clothoid, arc, or vertical math.
- Inventing coordinates when LINER has no data.

## 7. Owner

Alignment Connector owner (bridge-side); math authority remains LINER.
