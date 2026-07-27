# Load Governance Report — DS-04

**Classification and register freeze — DS-04 does not adopt load numerics**

**Authority:** DS-04 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Parent:** [DEC-DS04-0001](../00_governance/decision_ledger.md#dec-ds04-0001)
**Repository baseline:** `c89d2cecf0877334668b9cea109121887c206896`
**Audit correction:** Composer 2.5 post Codex/Grok audit — 2026-07-27

DS-04 establishes the governed **load model register**, **load-side partial-factor register**, **load combination register**, and **simultaneity/exclusivity rules** for Apollo Phase 1 (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear analysis) under Target Standard 道路橋示方書・同解説 令和7年改訂版 (Ver2.00 + 20260331 errata overlay per DEC-DS01-0001). DS-04 **does not adopt** any load magnitude, load model identity, impact/dynamic factor, load partial factor, combination coefficient, simultaneity coefficient, or favorable/unfavorable rule. Every numeric field remains blank. No R7 load clause, table, or numeric has been visually confirmed at DS-04.

---

## Critical constraints (inherited from DS-01 / DS-02 / DS-03)

| Constraint | DS-04 disposition |
|------------|-------------------|
| R7 load numerics / clause / table locators | **Zero** visually confirmed — all locators blank |
| RBS / handoff evidence PNGs | Location/workflow memos only — **not** numeric or model-identity authority |
| `ready_requirements.csv` RDY-002/003 | REFERENCE_ONLY location memos — do not adopt live-load notation or magnitudes |
| `open_items.csv` OPEN-002…OPEN-009 | REFERENCE_ONLY — arbitrary-load term mapping unresolved |
| SPACER PRINT, runtime examples, old editions | **Forbidden** as adoption sources |
| Material unit weights (γ, γc) | DS-03 material properties — **not** load factors (see taxonomy below) |
| Resistance partial factors | DS-05 — separately gated |
| Analyzer sign mapping | DS-06 — blocked (BLK-S1-011) |
| Full design freeze | `OUT_OF_SCOPE` for DS-04 → **DS-09** gate |
| Manuals / schema / handoff as physical-load rows | **Forbidden** — reference evidence stays in `source` metadata only; no fake `REFERENCE_ONLY` LM rows for manuals |

---

## Taxonomy — load model vs load effect vs factors

| Concept | Register | DS-04 posture |
|---------|----------|---------------|
| **Load model** | `load_model_register.csv` | Physical action definition (dead, live, wind, temperature, etc.) — identity and distribution blocked until 道示 I evidence |
| **Load effect** | (downstream analysis) | Internal forces/displacements from applying load models — not a register row at DS-04 |
| **Load-side partial factor** | `load_factor_register.csv` | γ-type factors on actions (`factor_role=load_partial_factor`) — one candidate shell per physical load; numerics blocked |
| **Adjustment factor** | `load_factor_register.csv` | Dynamic/impact adjustment (`factor_role=adjustment_factor`) — **sole numeric owner** LF-DS04-010 on LM-DS04-006; LM-DS04-007 is REFERENCE_ONLY pointer only |
| **Combination coefficient** | `load_combination_register.csv` | Generic blocked shell only — no component loads or coefficients at DS-04 |
| **Resistance partial factor** | DS-05 | Material/model reduction factors — **out of DS-04 scope** |
| **Material unit weight** | DS-03 `material_properties_register.csv` | Input to dead-load **model** (volume × γ) — **not** a load factor |

**Prohibited conflation:** Do not record MAT-DS03-008/015 unit weights in `load_factor_register.csv`. Do not treat combination coefficients as load partial factors without evidenced 道示 role separation.

**Dynamic/impact single ownership:** LM-DS04-007 is `REFERENCE_ONLY` non-combinable metadata pointing to LF-DS04-010. The adjustment numeric is applied exactly once to LM-DS04-006 live load via LF-DS04-010. LM-DS04-007 must not appear as a combination component. **Double application is forbidden.**

---

## `phase1_status` vs `adoption_status` (load model register)

`phase1_status` uses the **exact DS-04 enum only**:

| `phase1_status` | Meaning |
|-----------------|---------|
| `PHASE1_REQUIRED` | Mandatory for Phase 1 archetype load-case taxonomy |
| `PHASE1_OPTIONAL` | Evidence-gated optional inclusion |
| `REFERENCE_ONLY` | Non-combinable metadata pointer (LM-DS04-007 only) |
| `FUTURE_PHASE` | Deferred beyond current Phase 1 (construction-stage taxonomy) |
| `OUT_OF_SCOPE` | Explicitly excluded from Phase 1 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Cannot classify further without exact evidence |

`adoption_status` uses the [governance adoption enum](../00_governance/adoption_status_model.md). A load may be `PHASE1_REQUIRED` while `adoption_status` remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` for magnitudes and model identity (e.g. self-weight, RC deck, live load).

---

## Source hierarchy for loads

| Rank | Source class | Load role at DS-04 | Adoption posture |
|------|--------------|-------------------|------------------|
| 1 | **道路橋示方書・同解説** R7 Ver2.00 + 20260331 | Primary authority for load models, factors, combinations | Volume I role `ADOPTED_WITH_CONDITION` (DS-01); **clause/table locators blocked** |
| 2 | **Licensed 道示 PDF** (local image-export) | Evidence acquisition artifact | Acquisition channel — not substitute for human visual confirmation |
| 3 | **Handoff READY / crosswalk / open_items** | Traceability to requirement topics | `REFERENCE_ONLY` location memos in `source` column — not LM rows |
| 4 | **DS-03 material register** | Unit weights for dead-load models | Material numerics blocked — chain into LM-DS04-001/002 |
| 5 | **R2 鋼便覧 / DDB** | Workflow/dimension reference | `REFERENCE_ONLY` in `source` metadata — RDY-069 steel_weight is not load authority |
| 6 | **Step 1 schema / SPACER runtime** | Data-model shape | **Forbidden** as numeric authority |

**Blocking rule (BLK-S1-004):** No load magnitude, factor, or combination coefficient may reach `ADOPTED` until the evidence chain is complete per [adoption_status_model.md](../00_governance/adoption_status_model.md).

---

## Phase 1 load applicability

| Lane | Scope | DS-04 posture |
|------|-------|---------------|
| **Phase 1A** | Static linear analyzer load cases | `PHASE1_REQUIRED` load **models**: structural self-weight, RC deck dead, live load (identity blocked). `PHASE1_OPTIONAL` evidence-gated: pavement, curb/railing, temperature, wind, support movement |
| **Phase 1B** | Design checks using factored combinations | All combination/factor rows blocked — pending 道示 I evidence + DS-05 resistance side |
| **FUTURE_PHASE** | Construction-stage taxonomy | LM-DS04-011 — current adoption `NOT_APPLICABLE`; deferred by supervisor decision |
| **OUT** | Seismic, fatigue, erection-stage analysis | LM-DS04-012…014 — must not leak into Phase 1 case sets |

**Static linear does not exclude wind or temperature.** `PHASE1_OPTIONAL` means evidence-gated adoption, not archetype exclusion.

---

## Fail-closed policies (no invented code rules)

| Policy domain | DS-04 disposition | Unlock |
|---------------|-------------------|--------|
| **Design situation / limit state** | `design_situation_unspecified` and `limit_state_unspecified` on all LF, COMB, and SX rows | Exact 道示 I provisions with human visual confirmation |
| **Sign convention** | Not assigned at DS-04 | Exact 道示 I provisions + DS-06 analyzer sign mapping |
| **Max/min extraction** | SX-DS04-004 rule-class shell blocked | 道示 I live-load envelope rules + DS-06 |
| **Zero inclusion** | SX-DS04-005 rule-class shell blocked | 道示 I combination omission rules |
| **Favorable / unfavorable** | SX-DS04-003 rule-class shell blocked | 道示 I permanent-action favorable/unfavorable rules |
| **Simultaneity** | SX-DS04-001 rule-class shell blocked | 道示 I ψ/concurrent-action tables |
| **Exclusivity** | SX-DS04-002 rule-class shell blocked | 道示 I exclusive case definitions |
| **Combination patterns** | One generic COMB-DS04-001 shell — no invented ULS/SLS patterns or component loads | Evidenced component rows at unlock |

SPACER product sign/envelope semantics may be cited `REFERENCE_ONLY` for future DS-06 mapping — not binding at DS-04.

---

## Register schemas

### load_model_register.csv

| Column | Type / allowed values | Meaning |
|--------|----------------------|---------|
| `load_id` | Unique ID `LM-DS04-###` | Stable load model identifier |
| `phase1_status` | Exact enum: `PHASE1_REQUIRED` \| `PHASE1_OPTIONAL` \| `REFERENCE_ONLY` \| `FUTURE_PHASE` \| `OUT_OF_SCOPE` \| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Phase 1 taxonomy classification |
| `adoption_status` | Governance adoption enum | Numeric/model adoption posture — independent of `phase1_status` |
| `notes` | Free text | Exact evidence package: artifact, acquisition, acceptance, owner |

### load_factor_register.csv

| Column | Type / allowed values | Meaning |
|--------|----------------------|---------|
| `factor_id` | Unique ID `LF-DS04-###` | Stable factor identifier |
| `design_situation` | `design_situation_unspecified` at DS-04 | No invented persistent/transient/environmental assignment |
| `limit_state` | `limit_state_unspecified` at DS-04 | No invented ULS/SLS assignment |
| `factor_value` | Numeric or blank | **Blank at DS-04** |
| `adoption_status` | Governance adoption enum | All rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `evidence_package_ref` | Package ID | Cross-ref to report packages A–E |
| `notes` | Free text | Exact evidence package: artifact, acquisition, acceptance, owner |

One candidate shell per in-scope physical load plus one `adjustment_factor` row (LF-DS04-010). No duplicate ULS/SLS factor rows per load.

### load_combination_register.csv

| Column | Type / allowed values | Meaning |
|--------|----------------------|---------|
| `component_row_id` | Unique ID `COMB-ROW-DS04-###` | Primary key — unique even for shell row |
| `combination_id` | Grouping key `COMB-DS04-###` | Combination family identifier |
| `design_situation` | `design_situation_unspecified` at DS-04 | No invented combination situation |
| `limit_state` | `limit_state_unspecified` at DS-04 | No invented ULS/SLS membership |
| `adoption_status` | Governance adoption enum | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `evidence_package_ref` | Package ID | Cross-ref to report package D |
| `notes` | Free text | Exact evidence package: artifact, acquisition, acceptance, owner |

The user-required component columns remain present. At DS-04, `component_load_id` and `coefficient` are blank, while sign, favorability, simultaneity, exclusivity, max/min, and zero-inclusion fields carry explicit fail-closed `*_unspecified` tokens. Prohibited: referencing LM-DS04-007 in combination rows.

### simultaneity_and_exclusivity_rules.csv

| Column | Type / allowed values | Meaning |
|--------|----------------------|---------|
| `rule_id` | Unique ID `SX-DS04-###` | Stable rule identifier |
| `rule_type` | `simultaneity` \| `exclusivity` \| `favorable_unfavorable` \| `max_min_extraction` \| `zero_inclusion` | Rule class only — no load-pair columns |
| `design_situation` | `design_situation_unspecified` at DS-04 | Unspecified until evidence |
| `limit_state` | `limit_state_unspecified` at DS-04 | Unspecified until evidence |
| `relationship_coefficient` | Numeric or blank | **Blank at DS-04** |
| `adoption_status` | Governance adoption enum | All rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `notes` | Free text | Exact evidence package: artifact, acquisition, acceptance, owner |

Five generic rule-class shells only. No `load_id_primary`, `load_id_secondary`, or `load_id_set` — no load-pair or co-occurrence assumptions.

---

## Register summaries

### load_model_register.csv

| Metric | Count |
|--------|------:|
| Total rows | 14 |
| `PHASE1_REQUIRED` | 3 |
| `PHASE1_OPTIONAL` | 5 |
| `REFERENCE_ONLY` | 1 |
| `FUTURE_PHASE` | 1 |
| `OUT_OF_SCOPE` | 3 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (`phase1_status`) | 1 |
| `adoption_status` = `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 10 |
| `adoption_status` = `OUT_OF_SCOPE` | 3 |
| `adoption_status` = `NOT_APPLICABLE` | 1 |
| Rows with non-empty numeric fields | **0** |
| Duplicate `load_id` | **0** |

| load_id | phase1_status | adoption_status | Category |
|---------|---------------|-----------------|----------|
| LM-DS04-001 | PHASE1_REQUIRED | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | structural self weight |
| LM-DS04-002 | PHASE1_REQUIRED | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | RC deck dead |
| LM-DS04-003 | PHASE1_OPTIONAL | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | pavement |
| LM-DS04-004 | PHASE1_OPTIONAL | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | curb/railing |
| LM-DS04-005 | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | other superimposed dead |
| LM-DS04-006 | PHASE1_REQUIRED | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | live load (identity unspecified) |
| LM-DS04-007 | REFERENCE_ONLY | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | dynamic/impact pointer → LF-DS04-010 |
| LM-DS04-008 | PHASE1_OPTIONAL | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | temperature |
| LM-DS04-009 | PHASE1_OPTIONAL | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | support movement |
| LM-DS04-010 | PHASE1_OPTIONAL | BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | wind |
| LM-DS04-011 | FUTURE_PHASE | NOT_APPLICABLE | construction-stage taxonomy |
| LM-DS04-012 | OUT_OF_SCOPE | OUT_OF_SCOPE | seismic |
| LM-DS04-013 | OUT_OF_SCOPE | OUT_OF_SCOPE | fatigue |
| LM-DS04-014 | OUT_OF_SCOPE | OUT_OF_SCOPE | erection-stage analysis |

### load_factor_register.csv

| Metric | Count |
|--------|------:|
| Total rows | 10 |
| `load_partial_factor` | 9 |
| `adjustment_factor` | 1 |
| `design_situation_unspecified` | 10 |
| `limit_state_unspecified` | 10 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 10 |
| Rows with non-empty `factor_value` | **0** |
| Duplicate `factor_id` | **0** |
| All `load_id` references valid in LM register | **10/10** |
| Material unit weights misclassified as factors | **0** |

| factor_id | load_id | factor_role |
|-----------|---------|-------------|
| LF-DS04-001 | LM-DS04-001 | load_partial_factor |
| LF-DS04-002 | LM-DS04-002 | load_partial_factor |
| LF-DS04-003 | LM-DS04-003 | load_partial_factor |
| LF-DS04-004 | LM-DS04-004 | load_partial_factor |
| LF-DS04-005 | LM-DS04-005 | load_partial_factor |
| LF-DS04-006 | LM-DS04-006 | load_partial_factor |
| LF-DS04-007 | LM-DS04-008 | load_partial_factor |
| LF-DS04-008 | LM-DS04-009 | load_partial_factor |
| LF-DS04-009 | LM-DS04-010 | load_partial_factor |
| LF-DS04-010 | LM-DS04-006 | adjustment_factor (impact — sole numeric owner) |

### load_combination_register.csv

| Metric | Count |
|--------|------:|
| Total component rows | 1 |
| Distinct `combination_id` | 1 |
| Distinct `component_row_id` | 1 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 1 |
| Rows with non-empty `component_load_id` | **0** |
| Rows with non-empty `coefficient` | **0** |
| Duplicate `component_row_id` | **0** |
| LM-DS04-007 referenced | **0** (prohibited) |

### simultaneity_and_exclusivity_rules.csv

| Metric | Count |
|--------|------:|
| Total rows | 5 |
| `simultaneity` | 1 |
| `exclusivity` | 1 |
| `favorable_unfavorable` | 1 |
| `max_min_extraction` | 1 |
| `zero_inclusion` | 1 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 5 |
| Rows with non-empty `relationship_coefficient` | **0** |
| Duplicate `rule_id` | **0** |
| Load-pair or load-set columns | **0** (removed) |

### Adopted numerics (all registers)

| Metric | Count |
|--------|------:|
| Adopted sourced load numerics | **0** |
| Adopted unsourced load numerics | **0** |

---

## Exact evidence packages

### Package A — Permanent / dead load models (LM-DS04-001…005)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| A1 | 道示 I permanent-action taxonomy and dead-load provisions | Licensed Ver2.00+20260331 PDF human read | `source_clause` on load models; no SPACER substitution | DS-04_LOADS |
| A2 | DS-03 unit weights MAT-DS03-008/015 adopted | DS-03 unlock chain | Dead-load model magnitudes via volume integration only | DS-03 then DS-04 |
| A3 | DS-06 analyzer I/O | BLK-S1-011 evidence | Confirms mandatory Phase 1A dead-load inputs | DS-06 |
| A4 | Supervisor decision | `DEC-DS04-xxxx` | Links models to Phase 1 case set | APOLLO_SUPERVISOR |

### Package B — Live load model and impact (LM-DS04-006 / LM-DS04-007 pointer / LF-DS04-010)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| B1 | 道示 I live-load model tables/figures | Licensed PDF human visual confirmation | Exact notation class magnitude distribution recorded — no invented L/T/TL identities | DS-04_LOADS |
| B2 | Dynamic/impact adjustment provision | Same | LF-DS04-010 unlocked with evidenced adjustment factor applied once to LM-DS04-006; LM-DS04-007 remains pointer-only | DS-04_LOADS |
| B3 | RDY-003 cross-check | REFERENCE_ONLY in `source` metadata | Location memo may guide search — not adoption | DS-04_LOADS |

### Package C — Load partial factors (LF-DS04-001…009)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| C1 | 道示 I load partial-factor tables | Licensed PDF human read | `factor_value` + `source_clause` + `source_table` per row; design_situation and limit_state populated only from evidence | DS-04_LOADS |
| C2 | Favorable/unfavorable rules | Package D (SX-DS04-003) | Consistent favorability at unlock | DS-04_LOADS |
| C3 | Supervisor decision | `DEC-DS04-xxxx` | Per-row adoption | APOLLO_SUPERVISOR |

### Package D — Combinations and simultaneity (COMB-DS04-001 / SX-DS04-*)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| D1 | 道示 I combination expressions and coefficient tables | Licensed PDF human read | Evidenced component rows replace generic shell; each with unique `component_row_id` | DS-04_LOADS |
| D2 | Simultaneity ψ and exclusivity rules | Same | SX rule-class shells unlocked with evidenced tokens | DS-04_LOADS |
| D3 | Sign / max-min / zero-inclusion policies | Same + DS-06 | Analyzer mapping for envelopes | DS-04 + DS-06 |

### Package E — Optional environmental / displacement (LM-DS04-008…010)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| E1 | 道示 I wind and temperature action chapters | Licensed PDF human read | Optional models adopted only via DEC-DS04-xxxx | DS-04_LOADS |
| E2 | Support movement (SD) provisions | Same | LM-DS04-009 + LF-DS04-008 unlocked | DS-04_LOADS |

### Package F — Scope boundary (LM-DS04-011…014)

| Step | Artifact | Acquisition | Acceptance | Owner |
|------|----------|-------------|------------|-------|
| F1 | User-supervisor scope decision | DEC-DS04-0001 in current decision ledger | LM-DS04-011 `FUTURE_PHASE` / current adoption `NOT_APPLICABLE` | APOLLO_SUPERVISOR |
| F2 | Scope expansion decision | DEC-S1-xxxx | Construction-stage unlock | APOLLO_SUPERVISOR |

---

## Performance-based partial-factor traceability

| Chain link | DS-01 status | DS-04 status |
|------------|--------------|--------------|
| 性能規定型設計 philosophy | `ADOPTED` | Unchanged |
| 部分係数法 method | `ADOPTED` | Unchanged |
| Load-side factor **roles** | `ADOPTED` (conceptual) | Register structure `ADOPTED`; numerics **blocked** |
| Resistance-side factors | Deferred DS-05 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — DS-05 mapping not done |
| Verification equation placement | Blocked DS-04/DS-05 | Generic combination shell only — no equation |

DS-05 resistance-side mapping is **not** complete at DS-04. Performance traceability verdict is `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`, not `PASS`.

---

## Cross-references

| Artifact | Role |
|----------|------|
| [load_model_register.csv](load_model_register.csv) | Per-load-model governed register |
| [load_factor_register.csv](load_factor_register.csv) | Load-side partial and adjustment factors |
| [load_combination_register.csv](load_combination_register.csv) | Generic blocked combination shell |
| [simultaneity_and_exclusivity_rules.csv](simultaneity_and_exclusivity_rules.csv) | Five rule-class shells |
| [partial_factor_method_framework.md](../01_target_standard/partial_factor_method_framework.md) | Factor class definitions |
| [material_properties_register.csv](../03_materials/material_properties_register.csv) | Unit weights for dead loads — not factors |
| [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) | RDY-002/003 location memos |
| [open_items.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/open_items.csv) | OPEN-002…009 arbitrary-load mapping |
| [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) | Historical fail-closed rules |

---

## DS-04 verdict tokens

```text
DS04_LOAD_MODEL_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS04_LOAD_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_COMBINATION_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIMULTANEITY_EXCLUSIVITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIGN_RULE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_PERFORMANCE_TRACEABILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_UNSOURCED_NUMERICS_VERDICT: PASS
DS04_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

`PASS_WITH_EXACT_EVIDENCE_BLOCKERS` on load models — all candidate, pointer, FUTURE_PHASE, and OOS loads classified with operational blockers; no invented model identities; `phase1_status` and `adoption_status` separated.

`BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` on factors, combinations, simultaneity, sign rules, and performance traceability — zero sourced numerics; every blocked row has exact evidence package in `notes`/`evidence_package_ref` or report packages A–F.

`PASS` on unsourced numerics — zero non-empty numeric fields across all DS-04 CSV registers.

`COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS` — governance complete with exact classifications and blockers; **not** equivalent to numeric adoption, DS-05 resistance mapping, analyzer sign mapping (DS-06), or design-freeze clearance (DS-09).

---

## DTR disposition at DS-04

| Ref | Topic | DS-04 disposition |
|-----|-------|-------------------|
| DTR-05 | Numeric freeze scope per READY topic | **Load registers created** — load numerics remain blocked; resistance factors still DS-05 |
| BLK-S1-004 | Numeric auto-determination | **Registers established** — adoption forbidden until per-row 道示 chain |

DTR-02, DTR-04 remain open. JIS identities (DTR-03) unchanged from DS-02. Material numerics (DS-03) unchanged.

---

## Related documents

| Document | Role |
|----------|------|
| [decision_ledger.md](../00_governance/decision_ledger.md#dec-ds04-0001) | DEC-DS04-0001 |
| [target_standard_freeze.md](../01_target_standard/target_standard_freeze.md) | Target Standard baseline |
| [applicable_volumes_and_sections.md](../01_target_standard/applicable_volumes_and_sections.md) | Volume I primary for loads |
| [design_standard_scope.md](../00_governance/design_standard_scope.md) | Phase 1 OOS items |
| [ds00_evidence_baseline.md](../00_governance/ds00_evidence_baseline.md) | BLK-S1-004 matrix |
