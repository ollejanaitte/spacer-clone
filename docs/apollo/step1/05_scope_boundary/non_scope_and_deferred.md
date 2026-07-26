# Non-Scope and Deferred Items — Phase 1

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0008  
**Base commit:** `7240f1818d6de9bfbf1dbbc56113cef700ccad16`

## Purpose

Consolidated register of everything **explicitly outside** Phase 1 frozen scope or **deferred** to later phases. This document does not replace P04 registers; it is the planning view for P05 scope boundary.

## Structural archetype exclusions

| Exclusion | Rationale | Revisit trigger |
|-----------|-----------|-----------------|
| Continuous / multi-span girders | Phase 1 = 単純1径間 | Phase 2+ scope decision |
| Curved alignment / spiral | Phase 1 = 直橋 | Road/Frame curvature support |
| Skewed bridges (≠ 90°) | Phase 1 = 斜角90 | Grillage/skew modeling |
| Composite action (RC/steel) | Phase 1 = 非合成 | BLK-S1-010; composite PDFs local only |
| Steel deck | Not RC slab on plate girder | Deck type expansion |
| PC members / PC slab | Not in handoff Phase 1 candidate | PC program scope |
| Box girder / I-girder detailed shapes | Plate girder only | Section family decision |
| Variable / haunched girder depths (beyond slab haunch) | Phase 1 = 等桁高 | Girder program scope |

## Analysis & design exclusions

| Exclusion | P04 disposition / READY | Notes |
|-----------|-------------------------|-------|
| Seismic analysis & design | OUT_OF_PHASE1 | Solver exists; not in Phase 1 freeze |
| Eigen / modal | OUT_OF_PHASE1 | CAP-FRM-002 exists; scope excluded |
| Response spectrum / time history | OUT_OF_PHASE1 | CAP-FRM-004/006; excluded |
| Fatigue checks | LATER_PHASE | Not in READY phase=1 |
| Girder design (Girder program) | LATER_PHASE / OUT_OF_PHASE1 READY | 47 READY rows phase 2+ |
| Section design (Section program) | LATER_PHASE | REQ-5C-0021 OUT_OF_PHASE1 |
| Splice design (Splice program) | OUT_OF_PHASE1 | 20+ READY rows |
| Bracing design (sway/lateral) | OUT_OF_PHASE1 | REQ-5C-0052+ |
| Stiffener design | OUT_OF_PHASE1 | REQ-5C-0060+ |
| Formal SuperDrawing parity | LATER_PHASE | CAP-OUT-003 deferred |
| CAD `.gsp` / AutoCAD round-trip | OUT_OF_PRODUCT_SCOPE | Legacy desktop |

## Product / integration exclusions

| Item | Count (P04) | Category |
|------|-------------|----------|
| Legacy MS-Access `.mdb` workflow | 26 features | OUT_OF_PRODUCT_SCOPE |
| MS-Word RTF reports | multiple | OUT_OF_PRODUCT_SCOPE |
| y-Mater NPDATA export | IO-CAND-0010 | OUT_OF_PRODUCT_SCOPE |
| Align `.alg` direct import | IO-CAND-0001 | NOT_CONFIRMED; OSS uses LINER |
| Analyzer physical file I/O | IO-CAND-0003/0004 | UNKNOWN; deferred BLK-S1-011 |

## Deferred by governance (not scope, but blocks Phase 1 delivery)

| Blocker | Description | Phase 1 impact |
|---------|-------------|----------------|
| BLK-S1-001 | Target Standard NOT_SELECTED | No binding loads/materials |
| BLK-S1-002 | 34 JIS SOURCE GAP | Material adoption HOLD |
| BLK-S1-004 | No auto numerics | Live load, factors blocked |
| BLK-S1-007 | Historical baseline unknown | Traceability PROVISIONAL |
| BLK-S1-012 | IF3 client binding gap | Authoritative export blocked |
| BLK-S1-013 | READY rows are location memos | No numeric implementation |

## Feature disposition summary (281 features)

| Disposition | Count | Phase 1 relevance |
|-------------|------:|-------------------|
| PHASE1_REQUIRED | 101 | In scope |
| PHASE1_SUPPORTING | 13 | In scope |
| LATER_PHASE | 88 | Deferred |
| OUT_OF_PRODUCT_SCOPE | 26 | Non-OSS |
| DUPLICATE_ALIAS | 23 | N/A |
| UNKNOWN | 25 | Needs resolution before implementation |
| BLOCKED | 5 | Governance / standard |

## READY 69 summary

| gap_bucket | Count |
|------------|------:|
| OUT_OF_PHASE1 | 44 |
| NEW_MODULE | 12 |
| BLOCKED_BY_STANDARD | 5 |
| MINOR_EXTENSION | 3 |
| EXISTING_PARTIAL | 1 |
| BLOCKED_BY_ANALYZER_BOUNDARY | 1 |
| DUPLICATE_OR_ALIAS | 3 |

**Phase 1 READY rows (phase=1):** 22 — remainder deferred to phase 2+.

## Conflict: catalog vs narrow scope (CFL-003)

Many catalog rows carry `Phase1_required` while P04 marks them `LATER_PHASE` or `OUT_OF_PRODUCT_SCOPE` (splice, bracing, drawing, legacy integrations). **P04 disposition wins** for implementation prioritization until a new decision amends DEC-S1-0008.

## Explicit non-goals (unchanged from Step 1 charter)

- Production code implementation in P05
- Handoff package mutation
- Target Standard selection
- Numeric invention for loads, materials, or code checks

## References

- P04: `../04_gap_analysis/feature281_disposition.csv`, `blocker_register.csv`, `conflict_register.csv`
- Freeze: `phase1_scope_freeze.md`
- Handoff: `../../handoffs/.../docs/01_scope_and_limitations.md`
