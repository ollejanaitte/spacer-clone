# Phase 6-1 — Geometry Core

> **Reference Bridge:** RB-S10-001 (Reference Bridge 001)
> **Status:** COMPLETE
> **Seal base:** Phase 6-0 `SEAL-RB-S10-001-P6-0` (main `87365d4`)

## Scope

Phase 6-1 implements the Geometry Core boundary layer defined by the Phase 6-0
freeze: the GeometrySnapshot contract, the Geometry Engine interface, the
Alignment Connector (over LINER) and Geometry Input Adapter (over the Common
Bridge Data Model), support/girder placement, cross-section frames and the
Reference Bridge 001 Golden parity gate.

## PR chain

| PR | Scope | GitHub | Status |
|----|-------|--------|--------|
| 6.1A | GeometrySnapshot contract types + Geometry Engine / Alignment Connector / Input Adapter interfaces | #580 | MERGED |
| 6.1B | Alignment Connector (LINER reuse) + Common Model Geometry Input Adapter | #581 | MERGED |
| 6.1C | Support line + girder line placement (RB-001) | #582 | MERGED |
| 6.1D | Cross-section placement frames with skew | #583 | MERGED |
| 6.1E | Geometry Engine + Golden parity + closeout | this PR | MERGED |

## Module layout

```
frontend/src/apollo/geometry/
  types.ts                 # GeometrySnapshot contract types
  contracts.ts             # GeometryEngine / AlignmentConnector / GeometryInputAdapter interfaces
  alignmentConnector.ts    # LinerAlignmentConnector (reuses LINER pointAtStationOffset etc.)
  geometryInputAdapter.ts  # CommonModelGeometryInputAdapter (extraction only, no geometry calc)
  placement.ts             # placeSupportLines / placeGirderLines / supportStationsFromSpans
  crossSectionFrame.ts     # buildCrossSectionFrame(s) with skew
  engine.ts                # DefaultGeometryEngine + computeFingerprint
  index.ts                 # public exports
```

## Hard constraints honoured

- Alignment math is LINER authority; Geometry Core only adapts/assembles (no
  line/arc/clothoid/vertical/crossfall reimplementation).
- Common Bridge Data Model unchanged (schemaVersion 1.0.0).
- HOLD / CONFLICT / HCR / NOT_AVAILABLE are propagated, never invented.
- Engine is UI-agnostic (no React/Three.js imports).

## Verification

- `tsc -b` clean (whole frontend).
- `vitest run src/apollo/geometry/` 36/36 PASS (contract 11, connector 9, adapter 5,
  placement 6, frames 3, engine/parity 7 minus overlaps counted once).
- RB-001 Golden parity: support stations `[0, 40.201, 91.201, 134.001]`, girder
  endpoint offsets `1.47689/1.55372` (AG1) and `-3.02859/-2.94155` (AG2), grid
  point set `GRID-1001/1027/2001/2027`, 4 orthogonal cross-section frames,
  deterministic fingerprint.

## Next

Phase 6-2 Bridge Geometry (grid/panel points, deck reference, members/cross-girders,
bearings, transverse frames) — see `08_phase6_2_handoff.md`.
