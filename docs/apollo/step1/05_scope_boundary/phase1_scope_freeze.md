# Phase 1 Scope Freeze — P05

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0008  
**Base commit:** `7240f1818d6de9bfbf1dbbc56113cef700ccad16` (main @ P04 merge)  
**Branch:** `docs/apollo-step1-p05-scope-boundary`

## Verdict

```text
PHASE1_SCOPE_FREEZE_VERDICT: FROZEN_NARROW
IMPLEMENTATION_AUTHORIZATION: NOT_GRANTED
TARGET_STANDARD: NOT_SELECTED (unchanged)
```

Phase 1 scope is **frozen narrowly** per handoff Phase 1 candidate (`01_scope_and_limitations.md`), P04 feature disposition (`feature281_disposition.csv`), and P03 capability inventory. This document is a **planning freeze** only. It does not authorize production implementation or numeric adoption.

## Frozen Phase 1 bridge archetype

| Dimension | Phase 1 (IN) | Explicitly OUT |
|-----------|--------------|----------------|
| Alignment | Straight bridge (直橋) | Curved / spiral alignment |
| Girder depth | Equal depth (等桁高) | Variable depth / haunched girders beyond RC slab haunch workflow |
| Composite action | Non-composite RC slab on steel plate girder (非合成RC床版鋼鈑桁) | Composite deck, steel deck, PC slab |
| Span system | Simple span, single span (単純1径間) | Continuous, multi-span systems |
| Skew | 90° (直角) | Skewed bridges |
| Cross section | Constant width, uniform cross slope, evenly spaced main girders (~4–6) | Variable width, irregular girder spacing |
| Bearings | Fixed and movable supports per handoff | Seismic isolation, advanced bearing models |
| Analysis | Static linear (静的線形) | Eigen, response spectrum, time history, fatigue, seismic design |

**Source precedence:** Handoff `AGENTS.md` / `01_scope_and_limitations.md` → P04 disposition → this freeze. Catalog `Phase1_required` labels that conflict with the narrow archetype are **subordinate** (CFL-003).

## Included (Phase 1 delivery envelope)

### Structural & geometric scope

1. **Road / alignment intake** — stationing, cross-sections, bridge layout sufficient for a straight, 90° skew, single-span plate-girder arrangement (CAP-RDD-*).
2. **Superstructure layout shell** — girder count/spacing, span length, support locations, non-composite RC slab load path assumptions (NEW_MODULE / PARTIAL per P04).
3. **Frame model for static linear analysis** — nodes, members, sections, materials, supports, load cases on internal solver path (CAP-FRM-001, CAP-IF3-001).
4. **Loads (governance-gated)** — dead load, slab load, live load **definitions** only after Target Standard and numeric governance unblock (BLK-S1-001…005).
5. **Analysis execution & IF3-gated results** — linear static run, normalized `FrameAnalysisResultResource`, fail-closed export when binding incomplete (CAP-IF3-005 gap).
6. **RC slab design shell** — load input and design workflow scaffolding for non-composite RC deck (REQ-5C-0002; NEW_MODULE).
7. **Supporting utilities** — unit system governance, project metadata, approximate steel weight where marked PHASE1_SUPPORTING in P04.

### Feature / requirement counts (from P04, unchanged)

| Artifact | Phase 1 count | Notes |
|----------|---------------|-------|
| Features PHASE1_REQUIRED | 101 | See `phase1_feature_set.csv` |
| Features PHASE1_SUPPORTING | 13 | Same |
| READY rows phase=1 | 22 | 47 READY rows deferred to phase 2+ |
| READY OUT_OF_PHASE1 | 44 | Splice, bracing, stiffener, girder/section design families |

### End-to-end planning path (not operational)

```text
Road Design Tool → RoadToFrameTransferPackage (target) → Apollo Superstructure Design
        → Frame Analysis Tool (static linear) → IF3 result resource → reports/viewer
```

Operational today: LINER draft + `ProjectModel` wire; target contracts are infrastructure-only (P03).

## Excluded (fail-closed: reject or defer)

| Category | Examples | Disposition |
|----------|----------|-------------|
| Continuous / multi-span | Interior supports, continuity effects | LATER_PHASE / OUT_OF_PHASE1 |
| Curved / skew | Spiral alignment, skewed grillage | OUT_OF_PHASE1 |
| Composite / alternate decks | Composite action, steel deck, PC members | LATER_PHASE; BLK-S1-010 |
| Box girder / non-plate sections | Box, I-girder detailed design | LATER_PHASE |
| Member detailed design | Girder, Section, Splice programs | LATER_PHASE (88 features) |
| Bracing / stiffener design | Sway bracing, lateral bracing, stiffeners | OUT_OF_PHASE1 READY rows |
| Seismic / dynamic / fatigue | Eigen, RS, TH, fatigue checks | OUT_OF_PHASE1 (solver exists but not in Phase 1 scope) |
| Legacy desktop parity | `.mdb`, `.alg`, MS-Word RTF, AutoCAD `.gsp`, y-Mater NPDATA | OUT_OF_PRODUCT_SCOPE |
| CAD drawing parity | SuperDrawing production drawings | LATER_PHASE |
| Analyzer physical I/O | Legacy SuperDesigner ↔ Analyzer file formats | UNKNOWN; internal solver path only for Phase 1 |

## Assumptions (explicit, revisable only via decision_log)

| ID | Assumption | Risk if violated |
|----|------------|------------------|
| ASM-P1-001 | Single operational span with simply supported boundary conditions | Continuous models rejected at preflight |
| ASM-P1-002 | Main girders are equal-depth steel plate girders | Variable-depth requests fail-closed |
| ASM-P1-003 | RC slab is non-composite with girder (no shear connectors) | Composite requests deferred |
| ASM-P1-004 | Skew angle = 90°; bridge axis perpendicular to supports | Skewed geometry rejected |
| ASM-P1-005 | Static linear analysis sufficient for Phase 1 verification | Dynamic/seismic requests out of scope |
| ASM-P1-006 | Target Standard numerics are **not** invented (DEC-S1-0004) | Any auto-filled load/factor rejected |
| ASM-P1-007 | Frame Analysis Tool uses OSS `ProjectModel` / BFAD target path; legacy Analyzer file I/O not required for Phase 1 | BLK-S1-011 remains open for parity |
| ASM-P1-008 | Historical APOLLO edition ≠ Target Standard until DTR-04 resolved (CFL-001) | Traceability labels remain PROVISIONAL |

## Fail-closed rules

1. **Scope preflight** — Inputs indicating continuous, curved, skewed, composite, box, steel deck, PC, seismic, or fatigue intent MUST be rejected or flagged `OUT_OF_PHASE1` before analysis or numeric adoption.
2. **Numeric freeze** — No load factors, material constants, or code limits without ADOPTED records and `source_locator` (BLK-S1-004, BLK-S1-006).
3. **Standards** — Target Standard `NOT_SELECTED` blocks binding numerics (BLK-S1-001).
4. **IF3 export** — Missing `if3` client binding → authoritative CSV/PDF/result export blocked (DEC-S1-0006, BLK-S1-012).
5. **Analyzer boundary** — Do not claim legacy Analyzer file compatibility until ISS-S1-007 resolved (BLK-S1-011).
6. **Catalog conflicts** — `Phase1_required` catalog labels outside narrow scope follow P04 disposition, not catalog phase_class alone (CFL-003).

## Unsupported cases (user-visible)

| Case | System response |
|------|-----------------|
| User selects continuous girder / multi-span | `UNSUPPORTED: OUT_OF_PHASE1` — defer to Phase 2+ |
| User requests composite deck or steel deck | `UNSUPPORTED: OUT_OF_PHASE1` |
| User imports skewed bridge geometry | `UNSUPPORTED: OUT_OF_PHASE1` |
| User requests splice / bracing / stiffener design | `UNSUPPORTED: OUT_OF_PHASE1` |
| User requests seismic or fatigue check | `UNSUPPORTED: OUT_OF_PHASE1` |
| User expects `.mdb` / `.alg` round-trip | `UNSUPPORTED: OUT_OF_PRODUCT_SCOPE` |
| User runs export without IF3 binding | `BLOCKED: IF3_GATE` |
| User requests adopted live-load numerics before Target Standard | `BLOCKED: BLK-S1-001` |

## Related artifacts

| Artifact | Path |
|----------|------|
| Authoritative feature disposition (281) | `../04_gap_analysis/feature281_disposition.csv` |
| Phase 1 feature subset (114) | `phase1_feature_set.csv` |
| Responsibility boundaries | `responsibility_matrix.md` |
| Road → Apollo interface | `road_to_apollo_interface.md` |
| Apollo → Frame interface | `apollo_to_frame_interface.md` |
| Deferred / non-scope register | `non_scope_and_deferred.md` |
| P04 gap analysis | `../04_gap_analysis/gap_analysis_report.md` |

## Change control

Scope expansion (e.g., continuous spans, composite decks) requires a new `DEC-S1-xxxx` entry, P04 disposition update, and supervisor approval. P05 freeze does not amend the handoff package.
