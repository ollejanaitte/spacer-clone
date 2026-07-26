# Apollo Phase 1 — Implementation Dependency Graph

**Authority:** DESIGN PLANNING / STEP 1 (P09)  
**Date:** 2026-07-27  
**Base commit:** `555a3c5d9a4242cc8ea838973a0ce41a5ec1613b`

## Mermaid diagram

```mermaid
flowchart TB
  subgraph foundation["Foundation (ALLOWED — CONDITIONAL_GO)"]
    AP00[AP-00 Governance & flags]
    AP01[AP-01 BSDD contracts]
    AP02[AP-02 Schema / validation]
    AP03[AP-03 Workspace entry]
    AP00 --> AP01 --> AP02 --> AP03
  end

  subgraph geometry["Geometry shells (CONDITIONAL — no adopted numerics)"]
    AP04[AP-04 Basic conditions]
    AP05[AP-05 Span / girder geometry]
    AP06[AP-06 Deck / bearings]
    AP03 --> AP04 --> AP05 --> AP06
  end

  subgraph numerics_blocked["Numeric shells (NOGO until BLK-S1-001/002/004/005 cleared)"]
    AP07[AP-07 Material registry]
    AP08[AP-08 Load definitions]
    AP02 --> AP07
    AP06 --> AP08
    AP07 --> AP08
  end

  subgraph frame_path["Frame path (internal solver — BLK-S1-011 open)"]
    AP09[AP-09 Frame generation]
    AP10[AP-10 Export package]
    AP05 --> AP09
    AP06 --> AP09
    AP07 --> AP09
    AP08 --> AP09
    AP09 --> AP10
  end

  subgraph if3["IF3 integration (READY_PRIORITY — resolves BLK-S1-012)"]
    AP11[AP-11 IF3 binding & launch]
    AP12[AP-12 Result import]
    AP13[AP-13 Stale / export gate]
    AP10 --> AP11 --> AP12 --> AP13
  end

  subgraph deferred["Deferred / NOGO numerics"]
    AP14[AP-14 Design checks]
    AP15[AP-15 Drawings preview]
    AP16[AP-16 Reports / exports]
    AP17[AP-17 RB-P1-001 verification]
    AP18[AP-18 Release closure]
    AP08 --> AP14
    AP12 --> AP14
    AP05 --> AP15
    AP06 --> AP15
    AP13 --> AP16
    AP03 --> AP17
    AP09 --> AP17
    AP11 --> AP17
    AP13 --> AP17
    AP16 --> AP18
    AP17 --> AP18
    AP14 -.->|blocked| AP18
  end

  BLK001{{BLK-S1-001 Target NOT_SELECTED}}
  BLK002{{BLK-S1-002 JIS gaps}}
  BLK012{{BLK-S1-012 IF3 client binding}}
  BLK011{{BLK-S1-011 Analyzer I/O UNKNOWN}}

  BLK001 -.-> AP07
  BLK001 -.-> AP08
  BLK001 -.-> AP14
  BLK001 -.-> AP17
  BLK002 -.-> AP07
  BLK012 -.-> AP11
  BLK011 -.-> AP09
```

## Critical path (minimum viable Phase 1 demo)

```text
AP-00 → AP-01 → AP-02 → AP-03 → AP-04 → AP-05 → AP-06
  → AP-09 → AP-10 → AP-11 → AP-12 → AP-13
```

AP-07/AP-08 may proceed as **PLACEHOLDER shells** in parallel with AP-04..AP-06 but must not adopt numerics.

## External blockers (not AP-* dependencies)

| Blocker | Blocks |
|---------|--------|
| BLK-S1-001 | Adopted loads, materials, design-check numerics (AP-07, AP-08, AP-14, AP-17 golden) |
| BLK-S1-002 | Material property adoption (AP-07) |
| BLK-S1-004 | Auto numeric determination (AP-05..AP-08) |
| BLK-S1-011 | Legacy Analyzer parity claims (AP-09); internal path unaffected |
| BLK-S1-012 | Authoritative export (AP-10..AP-16); **resolved by AP-11** |
| LIM-P03-003 | PRINT visual release (AP-15, AP-16) |

## Parallelization opportunities

| Track A | Track B |
|---------|---------|
| AP-00..AP-03 foundation | — |
| AP-04..AP-06 geometry | AP-11 IF3 client fix (can start after AP-02; independent of geometry) |
| AP-09..AP-10 frame gen | AP-07/AP-08 shells (no numerics) |
| AP-13 export gates | AP-15 drawing preview (non-authoritative) |
