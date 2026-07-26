# Road → Apollo Interface — Data Direction & Ownership

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0008  
**Base commit:** `7240f1818d6de9bfbf1dbbc56113cef700ccad16`

## Summary

| Attribute | Value |
|-----------|-------|
| **Direction** | Road Design Tool → Apollo Superstructure Design |
| **Phase 1 pattern** | Export immutable transfer payload; Apollo imports read-only |
| **Target contract** | `RoadToFrameTransferPackage` (v0.1) — **designed, not E2E operational** |
| **Operational interim** | LINER draft fields manually aligned to superstructure inputs (no authoritative transfer apply) |

## Data flow

```text
┌─────────────────────┐     export (immutable)      ┌──────────────────────────────┐
│  Road Design Tool   │ ──────────────────────────► │ Apollo Superstructure Design │
│  (LINER / RDD SoR)  │   RoadToFrameTransferPackage │  (layout + slab shell SoR)   │
└─────────────────────┘   + TransferRecord audit      └──────────────────────────────┘
         │                                                          │
         │ owns                                                     │ consumes
         ▼                                                          ▼
  RoadDesignDocument                                    Bridge layout, stations,
  alignment, profiles,                                  cross-lines, width/slope
  road drawing primitives                               constraints for Phase 1 archetype
```

## Ownership table

| Data entity | Producer (owner) | Consumer | Mutability after handoff | Phase 1 status |
|-------------|------------------|----------|--------------------------|----------------|
| Alignment / centerline / stations | Road Design Tool | Apollo Superstructure | Read-only in Apollo | PARTIAL (CAP-RDD-001) |
| Cross-sections (width, slope) | Road Design Tool | Apollo Superstructure | Read-only | PARTIAL |
| Bridge stationing / layout anchors | Road Design Tool | Apollo Superstructure | Read-only | CANDIDATE (ENT-CAND-0001→0002) |
| Span length / girder line placement | Apollo Superstructure | — | Apollo owns post-import | Planning only |
| Slab / superstructure design choices | Apollo Superstructure | — | Not from Road | NEW_MODULE |
| Unit system declaration | Road Design Tool (governance) | Apollo Superstructure | Must match or fail | READY REQ-5C-0001 |
| Transfer package checksum / version | Road Design Tool | Apollo Superstructure | Immutable blob | INFRASTRUCTURE (CAP-TRF-001) |
| Transfer audit trail | Shared | Both | Append-only `TransferRecord` | INFRASTRUCTURE |

## Phase 1 payload expectations (minimum)

Apollo Superstructure Design requires enough road data to place a **straight, 90° skew, single-span** plate-girder system:

1. Horizontal alignment sufficient for station ticks and bridge axis (straight).
2. Cross-section template at bridge limits (constant width, uniform cross slope within handoff assumptions).
3. Bridge start/end stations and deck elevation references.
4. Unit system metadata (no numeric constants without governance).

**Explicitly NOT required from Road in Phase 1:** member sections, splice details, bracing, analyzer model, load combination rules.

## Validation & fail-closed

| Check | Owner | On failure |
|-------|-------|------------|
| Schema validation (`RoadToFrameTransferPackage`) | Road export gate | Export blocked |
| Phase 1 archetype preflight (straight, 90° skew) | Apollo import gate | `OUT_OF_PHASE1` reject |
| Checksum / version match | Apollo import | Reject stale package |
| Unit system compatibility | Apollo import | `BLOCKED: UNIT_MISMATCH` |
| Missing alignment fields | Apollo import | `BLOCKED: INCOMPLETE_TRANSFER` |

## Legacy APOLLO interfaces (not OSS Phase 1)

| IO candidate | Format | Status |
|--------------|--------|--------|
| IO-CAND-0001 alignment_file | `.alg` | NOT_CONFIRMED; not in package |
| IO-CAND-0002 design_database | `.mdb` | OUT_OF_PRODUCT_SCOPE |

OSS does not implement `.alg` import as Phase 1 requirement. Road Design Tool replaces Align/SuperDesigner road intake path.

## Open items

| ID | Topic | Owner |
|----|-------|-------|
| ISS-S1-007 | Legacy file format parity | Deferred — contract path preferred |
| CAP-TRF-* | Transfer apply UI / preflight | Stage 10; not operational |
| OD6-01 | Coordinate authority between road and frame | Step 1+ design |

## References

- P03 interface map: `../03_existing_capability/current_document_and_interface_map.md`
- Contract index: `../../../transfer/contract-index.md`
- Handoff IO: `../../handoffs/.../analysis-input/input_output_candidates.csv`
