# Reference Bridge Definition — Phase 1 Archetype (RB-P1-001)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0011  
**Base commit:** `bf3d9dc22e027e1de661c0271ff6ba2a003e7d20` (main @ P07 merge)  
**Branch:** `docs/apollo-step1-p08-validation`

## Purpose

Define the **Phase 1 Reference Bridge** (`RB-P1-001`) as a planning exemplar for validation, acceptance testing, and traceability. This document establishes archetype constraints and separates **CONFIRMED** planning facts from **PLACEHOLDER** values that must not become golden expected results.

**This is not a production fixture.** Numeric magnitudes without adoption records remain unresolved. Target Standard numerics are **not** golden values (DEC-S1-0004, ASM-P1-006).

## Verdict

```text
REFERENCE_BRIDGE_ID: RB-P1-001
REFERENCE_BRIDGE_STATUS: DRAFT_PLANNING_ONLY
GOLDEN_NUMERICS: NOT_AUTHORIZED
TARGET_STANDARD: NOT_SELECTED (unchanged)
IMPLEMENTATION_AUTHORIZATION: NOT_GRANTED
```

## Source precedence

| Rank | Source | Use |
|------|--------|-----|
| 1 | P05 scope freeze (`phase1_scope_freeze.md`, DEC-S1-0008) | Archetype IN/OUT |
| 2 | Handoff `analysis-input/reference_bridge_input_candidates.md` (RB-001 profile) | Candidate input groups |
| 3 | P06 `schema_draft.json` / `apollo_data_model.md` | Document shape |
| 4 | P07 interface + IF3 binding design | Export/analysis gates |
| 5 | Handoff `docs/07_validation_and_test_strategy.md` | Golden data explicitly **未確定** |

Handoff RB-001 candidate numerics are **not adopted** unless marked CONFIRMED below.

---

## Phase 1 archetype (CONFIRMED)

Structural and analysis envelope frozen by DEC-S1-0008:

| Dimension | CONFIRMED value | Authority |
|-----------|-----------------|-----------|
| Bridge alignment | Straight (直橋) | DEC-S1-0008 |
| Span system | Simple, single span (単純1径間) | ASM-P1-001 |
| Skew | 90° (直角) | DEC-S1-0008 |
| Girder depth | Equal depth (等桁高) | ASM-P1-002 |
| Superstructure | Non-composite RC slab on steel plate girder (非合成RC床版鋼鈑桁) | ASM-P1-003 |
| Main girders | 4–6 evenly spaced plate girders | Handoff RB profile + P05 |
| Cross section | Constant width, uniform cross slope | Handoff RB profile |
| Cross beams | Standard transverse beams (標準横桁) — layout shell only | Handoff RB profile |
| Bearings | Fixed and movable supports (固定/可動) — detail deferred | P05 |
| Analysis | Static linear (静的線形) | ASM-P1-005 |
| Composite action | None (non-composite deck) | ASM-P1-003 |
| Member detailed design | OUT_OF_PHASE1 (splice, bracing, stiffener, girder/section design) | P04 disposition |

### Explicitly OUT (fail-closed)

Continuous/multi-span, curved/skewed (≠90°), composite/steel/PC deck, box girder detailed design, seismic/dynamic/fatigue, legacy Analyzer file round-trip.

---

## Reference Bridge identity (CONFIRMED)

| Field | Value | Notes |
|-------|-------|-------|
| `referenceBridgeId` | `RB-P1-001` | Stable planning ID |
| `documentKind` | `bridge-superstructure-design` | Maps to BSDD draft |
| `schemaDraftVersion` | `0.0.0-design-draft` | See `reference_bridge_input.json` |
| `phase1ScopeAssertion` | See archetype table | Must pass scope preflight |
| `producer` | `apollo-step1-p08-planning` | Not operational data |

---

## Geometry and layout (mixed)

### CONFIRMED (structural intent, no magnitudes)

| Item | Status | Value / rule |
|------|--------|--------------|
| Span count | CONFIRMED | Exactly 1 |
| Support count | CONFIRMED | ≥ 2 (abutment + bearing typical) |
| Girder count | CONFIRMED (range) | 4–6 main girders, equal spacing |
| Girder depth profile | CONFIRMED | `equal` |
| Deck kind | CONFIRMED | `rc_non_composite` |
| Axis convention | CONFIRMED | x-longitudinal, y-transverse, z-up |
| Coordinate confidence | PLACEHOLDER | `unknown` until road import verified |

### PLACEHOLDER (magnitudes unresolved)

| Item | Status | Draft marker | Blocker / note |
|------|--------|--------------|----------------|
| Span length | PLACEHOLDER | `null` + `adoptionStatus: UNKNOWN` | No adopted source locator |
| Bridge width | PLACEHOLDER | `null` | Road cross-section not frozen |
| Cross slope | PLACEHOLDER | `unknown` | Constant slope assumed; value TBD |
| Girder spacing | PLACEHOLDER | `null` | Depends on width + count selection |
| Girder offset from centerline | PLACEHOLDER | `null` per girder | Layout TBD within 4–6 range |
| Deck thickness | PLACEHOLDER | `null` | REQ-5C-0083; BLK-S1-001 |
| Haunch geometry | PLACEHOLDER | `not_applicable` at shell stage | REQ-5C-0084–0086; module absent |
| RC slab reinforcement | PLACEHOLDER | `not_applicable` until slab module | REQ-5C-0092 |
| Section dimensions (flange/web) | PLACEHOLDER | `not_applicable` | Girder/section design OUT_OF_PHASE1 |
| Splice / bracing / stiffener | PLACEHOLDER | `not_applicable` | OUT_OF_PHASE1 |
| Bearing detail model | PLACEHOLDER | fixity enum only | Detailed bearing design deferred |

**Rule:** PLACEHOLDER fields must not appear in golden regression expected values until promoted to `ADOPTED` with `source_locator`.

---

## Materials (PLACEHOLDER)

| Item | Status | Notes |
|------|--------|-------|
| Steel designation | PLACEHOLDER | e.g. `SN400B` label allowed; yield/E/G/γ **null** |
| RC deck material | PLACEHOLDER | Unit weight and constants **null** |
| Material adoption | BLOCKED | BLK-S1-001, BLK-S1-002, BLK-S1-005 |

No JIS or 道示 values may be copied into RB-P1-001 as golden.

---

## Loads and load cases (PLACEHOLDER shell)

| Load case kind | Status | Magnitude | Notes |
|----------------|--------|-----------|-------|
| `dead` | CONFIRMED (kind) | PLACEHOLDER | Case shell only |
| `slab` | CONFIRMED (kind) | PLACEHOLDER | Non-composite slab load path |
| `live` | CONFIRMED (kind) | PLACEHOLDER | REQ-5C-0003; BLK-S1-001 |
| Load combinations | `not_applicable` Phase 1 | — | ENT-DEF-0001 deferred |

Live-load lane factors, impact, and combination rules are **blocked** until Target Standard selection.

---

## Analysis and results expectations (CONFIRMED process, PLACEHOLDER numerics)

| Item | Status | Expectation |
|------|--------|-------------|
| Analysis type | CONFIRMED | `static_linear` |
| Solver path | CONFIRMED | OSS internal (`ProjectModel` / BFAD target); not legacy Analyzer I/O |
| IF3 binding | CONFIRMED (required) | `AnalysisBinding` + run-time metadata before authoritative export |
| Section forces | PLACEHOLDER | Expected magnitudes **未確定** per handoff validation plan |
| Reactions | PLACEHOLDER | Expected magnitudes **未確定** |
| Displacements | PLACEHOLDER | Expected magnitudes **未確定** |
| Golden analysis comparison | NOT_AUTHORIZED | Until supervisor adopts benchmark with traceable source |

---

## Input artifact groups (from handoff RB-001)

Mapped to Phase 1 scope; groups 4–5 partial (OUT_OF_PHASE1 detail deferred):

| Group | Handoff topic | Phase 1 scope |
|-------|---------------|---------------|
| 1 | Project folder / units | Shell + `UnitContext` |
| 2 | Span, girder count/spacing, skew, profile, supports | Layout shell (numerics PLACEHOLDER) |
| 3 | RC slab thickness / haunch | Slab module shell (NEW_MODULE) |
| 4 | Girder section / splice / stiffener | **OUT** — intent refs only |
| 5 | Cross beams / bracing / bearings | Cross beam layout shell; bracing **OUT** |
| 6 | Loads / grillage / deflection check | Static linear load cases; grillage via Frame export |
| 7 | Reports / steel weight | IF3-gated exports; approximate weight PHASE1_SUPPORTING |

---

## Validation use

RB-P1-001 supports:

1. **Schema / contract validation** — parseable BSDD-shaped draft (`reference_bridge_input.json`)
2. **Scope preflight** — reject OUT_OF_PHASE1 mutations
3. **Fail-closed numeric checks** — null/unknown must not auto-fill
4. **IF3 / export gate scenarios** — binding present vs UNBOUND paths
5. **Traceability** — link to READY phase=1 rows and capabilities (see `traceability_matrix.csv`)

RB-P1-001 does **not** authorize:

- Code-check pass/fail against 道示 or DDB numerics
- Analyzer physical file byte comparison
- Visual/drawing golden baselines (OD8-04)

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Draft input JSON | `reference_bridge_input.json` |
| Validation catalog | `validation_catalog.csv` |
| Test strategy | `test_strategy.md` |
| Traceability matrix | `traceability_matrix.csv` |
| Acceptance test plan | `acceptance_test_plan.md` |
| Phase 1 scope freeze | `../05_scope_boundary/phase1_scope_freeze.md` |
| Design-draft schema | `../06_architecture/schema_draft.json` |

## Change control

Promotion of PLACEHOLDER → CONFIRMED numeric requires: `adoption_status: ADOPTED`, `source_locator`, Target Standard alignment (when selected), and new `DEC-S1-xxxx` or supervisor approval. RB-P1-001 revision increments do not amend the handoff package.
