# Numeric Value Governance — P02

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Scope:** Loads, factors, limits, dimensions, and all non-material numerics for Phase 1

## Policy statement

Numeric values (loads, safety factors, deflection limits, minimum thicknesses, pitch/edge distances, etc.) follow the same fail-closed traceability model as material properties. **Auto-determination is banned** while Target Standard = NOT_SELECTED.

Handoff READY rows explicitly carry `NO_AUTO_NUMERIC_DETERMINATION` and `TARGET_STANDARD_NOT_SELECTED`.

---

## Mandatory fields (per numeric record)

| Field | Requirement |
|-------|-------------|
| `value` | Numeric literal or bounded range per source |
| `unit` | Document-native or SI with stated conversion |
| `quantity_kind` | e.g. `live_load`, `deflection_limit`, `min_slab_thickness`, `bolt_pitch_min` |
| `source_doc_id` | Registered source ID |
| `source_locator` | Page + table/clause/figure |
| `edition` | Must align with Target Standard when selected |
| `applicability` | Bridge type, load case, member, limit state |
| `adoption_status` | `PLACEHOLDER` \| `PROPOSED` \| `ADOPTED` \| `REJECTED` |
| `decision_id` | Required for `ADOPTED` |

**Fail-closed:** Incomplete records are **INVALID**. Tools, agents, and planners must not fill gaps by "typical" industry values.

---

## Ban on auto-determination (Target Standard NOT_SELECTED)

The following are **explicitly prohibited** until Target Standard selection (`DEC-S1-xxxx`) and blocker clearance:

| Prohibited action | Rationale |
|-------------------|-----------|
| Filling APOLLO default numerics from 道示/DDB without Target decision | ISS-S1-008; handoff `NO_AUTO_NUMERIC_DETERMINATION` |
| Using R2 便覧 or DDB values as code-mandatory | Supporting sources only |
| Substituting 道示 for missing JIS product values | `jis_source_gaps.csv` HOLD policy |
| Deriving limits from evidence PNG OCR alone | Evidence = location memo; not numeric authority |
| Selecting R7 vs H29 edition by convenience | Edition tension — supervisor decision required |
| Promoting Stage5B page refs to frozen constants | Location memos ≠ numeric freeze |

---

## Placeholder rules

When a numeric value is required in a planning template but cannot be adopted:

```
value: TBD
unit: TBD
quantity_kind: <required>
source_doc_id: TBD
source_locator: TBD
edition: TBD
applicability: <scope>
adoption_status: PLACEHOLDER
decision_id: (blank)
blocker_id: BLK-S1-001 | BLK-S1-002 | ...
```

**PLACEHOLDER is valid** for Step 1 schemas. **PLACEHOLDER must not be silently coerced to zero or historical APOLLO internals.**

---

## Numeric categories — Phase 1

| Category | Example quantities | Authority | P02 status |
|----------|-------------------|-----------|------------|
| Live / dead loads | TL-25, pedestrian, barrier | 道示 Ⅰ | Location memos (RDY-003); not frozen |
| Load combinations / factors | γf, ψ | 道示 Ⅰ | PLACEHOLDER |
| Deflection limits | Live load deflection ratio | 道示 Ⅱ | PLACEHOLDER |
| Min slab / cover | Slab thickness, cover | 道示 Ⅲ | PLACEHOLDER; JIS rebar blocked |
| Steel check limits | Width-thickness ratios, λp | 道示 Ⅱ | PLACEHOLDER |
| Splice / bolt layout | Pitch, edge distance, μ | 道示 Ⅱ + JIS bolt | **BLOCKED** (JIS) |
| Standard dimensions | Girder depth tables | DDB | REFERENCE_ONLY |
| Software limits | Max girder count, grid points | APOLLO manual | RETURN_TO_APOLLO; not standard numerics |

---

## Relationship to READY 69 requirements

All 69 `ready_requirements.csv` rows:

- `target_standard_status` = `TARGET_STANDARD_NOT_SELECTED`
- `open_flags` includes `HISTORICAL_BASELINE_UNKNOWN_EDITION`
- Scope note: "数値確定・APOLLO入力値照合・適合判定は対象外"

Step 1 numeric governance **aligns with handoff**: READY establishes **where** rules live, not **which numbers** to implement.

---

## Unlock sequence

1. Supervisor records Target Standard → `DEC-S1-xxxx` (resolves ISS-S1-008 / BLK-S1-001)
2. Edition-specific table/clause reads verified against Rank 6 PDFs (read-only)
3. JIS gaps closed or explicitly scoped out → ISS-S1-009 / BLK-S1-002
4. Per-quantity `PROPOSED` → supervisor `ADOPTED` with decision_id
5. Design freeze gate re-evaluated (handoff `APOLLO_FULL_DESIGN_FREEZE_VERDICT`)

Until step 1 completes: **numeric freeze prohibited**.

---

## Blocker linkage

| Blocker ID | Condition |
|------------|-----------|
| BLK-S1-001 | Target Standard NOT_SELECTED |
| BLK-S1-002 | JIS source gaps (34) |
| BLK-S1-004 | Numeric auto-determination attempted without governance |
| BLK-S1-006 | ADOPTED numeric without source_locator |

See [standards_blocker_register.csv](standards_blocker_register.csv), [target_standard_decision.md](target_standard_decision.md).
