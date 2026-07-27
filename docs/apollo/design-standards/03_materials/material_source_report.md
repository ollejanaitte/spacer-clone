# Material Source Report — DS-03

**Classification and register freeze — DS-03 does not adopt material numerics**

**Authority:** DS-03 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Parent:** [DEC-DS03-0001](../00_governance/decision_ledger.md#dec-ds03-0001)
**Repository baseline:** `9b86881396e806f51d815a4b3308c09bd2d73bc6`

DS-03 establishes the governed **material properties register** and **applicability matrix** for Apollo Phase 1 (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear analysis) under Target Standard 道路橋示方書・同解説 令和7年改訂版 (Ver2.00 + 20260331 errata overlay per DEC-DS01-0001). DS-03 **does not adopt** any material numeric value, JIS identity, or clause locator. Every numeric property row remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` with blank `value` and blank `unit`.

---

## Critical constraints (inherited from DS-01 / DS-02)

| Constraint | DS-03 disposition |
|------------|-------------------|
| 34 JIS gap rows (JIS-001…JIS-034) | Undifferentiated placeholders — **zero** JIS numbers inferred ([DEC-DS02-0001](../00_governance/decision_ledger.md#dec-ds02-0001)) |
| RBS / handoff evidence PNGs | Location/workflow memos only — **not** numeric authority |
| `schema_draft.json`, `reference_bridge_input.json` | Non-authoritative — `REFERENCE_ONLY` |
| SPACER built-ins, old editions, common textbook values | **Prohibited** as adoption sources |
| Partial-factor **method** | `ADOPTED` per DEC-DS01-0001; partial-factor **numerics** remain DS-05 |
| Full design freeze | `OUT_OF_SCOPE` for DS-03 → **DS-09** gate |

---

## Source hierarchy for material properties

Rank follows [source_priority_policy.md](../00_governance/source_priority_policy.md) with DS-03 material-specific routing:

| Rank | Source class | Material role at DS-03 | Adoption posture |
|------|--------------|------------------------|------------------|
| 1 | **道路橋示方書・同解説** R7 Ver2.00 + 20260331 | Primary design-standard authority for material selection rules, deemed-to-satisfy provisions, and design material strengths | Volume roles `ADOPTED_WITH_CONDITION` (DS-01); **clause/table locators blocked** — human visual confirmation required |
| 2 | **JIS product / test standards** (when cited by 道示) | Mandatory chain for grade identities and tabulated mechanical properties (steel, rebar, bolts, welds) | All rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` via [jis_source_register.csv](../02_jis/jis_source_register.csv) |
| 3 | **Licensed 道示 PDF** (local image-export) | Evidence acquisition artifact for locators | Acquisition channel — not a substitute for completed locator + supervisor decision |
| 4 | **Handoff READY / crosswalk CSVs** | Traceability to requirement topics (`girder_material`, `slab_material`, `splice_bolt`) | `REFERENCE_ONLY` location memos |
| 5 | **R2 鋼便覧 / H31 支承便覧 / DDB** | Supporting workflow and dimension references | `REFERENCE_ONLY` — not co-equal with 道示 |
| 6 | **Step 1 schema / planning shells** | Data-model shape for `MaterialDefinition` | `REFERENCE_ONLY` — null numerics until register unlock |
| 7 | **APOLLO historical / SPACER runtime** | Legacy product behavior | **Forbidden** as numeric authority |

**Blocking rule (BLK-S1-005):** No material property may reach `ADOPTED` with a numeric `value` until the evidence chain is complete per row type per [adoption_status_model.md](../00_governance/adoption_status_model.md):

| Row type | Required chain |
|----------|----------------|
| **道示 cites JIS / product property** | Resolved JIS identity (post DS-02 evidence package), product grade, 道示 citing clause/table with human visual confirmation, supervisor `DEC-DS03-xxxx` or later DS decision |
| **道示-native constants** (no JIS citation) | Exact 道示 clause/table locator with human visual confirmation — **no invented JIS citation** |

---

## Phase 1A vs Phase 1B vs supporting

| Lane | Scope | Material properties | DS-03 posture |
|------|-------|---------------------|---------------|
| **Phase 1A** | Static linear analyzer inputs (stiffness, self weight, optional thermal) | Steel E–G–ν triplet (MAT-DS03-004/005/006) and unit weight subject to DS-06 I/O confirmation; RC deck Ec, νc, γc conditional on DS-06 confirming deck shell model; rebar Es/γs conditional on DS-06 confirming reinforced stiffness; no concrete G row at DS-03 | All numeric rows **blocked** — register defines candidate property set only |
| **Phase 1B** | Design checks (strength, connection, bearing boundary, durability) | Fy, Fu, Fc, fy, bolt strengths, weld matching, bearing/coating, creep/shrinkage if DS-05 classifies applicable | All numeric rows **blocked** — pending evidence chain; resistance partial factors separately gated at DS-05 |
| **Supporting / reference** | Manuals, schema shells, handoff memos | Section tables, workflow hints | `REFERENCE_ONLY` — no computation binding |

---

## E–G–ν consistency policy (no values inserted)

DS-03 adopts the **consistency rule** as governance policy only — applied **only to material categories for which all three properties (E, G, ν) are required**:

| Category | DS-03 registered triplet | Notes |
|----------|--------------------------|-------|
| **structural_steel** | MAT-DS03-004 (E), MAT-DS03-005 (G), MAT-DS03-006 (ν) | Current registered steel triplet; Phase 1A subject to DS-06 I/O confirmation |
| **rc_deck_concrete** | Ec (MAT-DS03-012), νc (MAT-DS03-013) only | **No concrete G row at DS-03** — concrete G remains conditional on DS-06; if DS-06 requires G, add a blocked row in a later controlled revision |
| **reinforcing_steel** | Es only (MAT-DS03-021) | No G/ν triplet registered at DS-03 |

Policy rules:

1. **Single authority:** When E, G, and ν are all required for a category, adopted values must originate from the same evidenced provision set (道示 clause and cited JIS table if applicable) — not mixed sources.
2. **Derived G (steel only when evidenced):** If 道示 specifies G only via E and ν for structural steel, record G as `constant_or_derived` and store the evidenced formula reference in `source_clause` at adoption time — do not compute G at DS-03.
3. **No unstated defaults:** Values `0`, `1`, `0.3`, or any unstated “typical” constants are **prohibited** in analyzer bindings, schema defaults, and tests until the corresponding register row is `ADOPTED` with full metadata.
4. **Cross-material independence:** Consistency triplets are evaluated **per material_category** — do not reuse steel ν for concrete.
5. **Unit coherence:** When a triplet applies, all moduli must use the documented stress-unit system per [dimensional units policy](#dimensional-units-conversion-rounding-and-storage) before binding to Phase 1A.

---

## Dimensional units, conversion, rounding, and storage

### Document-native units

At adoption time each row must record the **document-native unit** exactly as stated in the evidenced 道示 or JIS table in the `unit` column. DS-03 does not pre-select SI vs kN-m vs N-mm.

### Conversion policy

| Quantity kind | Storage rule |
|---------------|--------------|
| Stress (E, G, strengths) | Store native value + native unit + `quantity_kind`; convert to analyzer canonical system only at export with logged conversion factor |
| Force per volume (γ unit weight) | Distinguish γ (force/volume) from ρ (mass/volume); ρ rows use `conversion_pending_g_policy` until sourced gravity/unit policy exists and DS-06 confirms density is required |
| Thermal expansion α | Store per temperature basis stated in source (per °C or per K as cited) |
| Dimensionless (ν) | Store as ratio without unit |

### Rounding and storage

- **No silent rounding** at register ingest — store full precision from source table until a supervisor rounding rule is recorded in `DEC-DS03-xxxx`.
- **No float sentinels** — blocked properties remain null/absent in schema bindings; not `0.0`.
- **Thickness / diameter bands** — store as lookup keys matching JIS table row labels, not interpolated mid-band values unless 道示 permits interpolation with evidenced rule.

---

## Prohibited runtime and schema defaults

| Prohibited practice | Rationale |
|--------------------|-----------|
| Default `yieldStrength` / `elasticModulus` in `schema_draft.json` examples promoted to production | Schema is `REFERENCE_ONLY` |
| SPACER or APOLLO built-in material libraries | Not evidenced |
| Filling nulls with `0` or `1` for “unset” | Fail-closed per [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) |
| OCR of evidence PNGs for strength tables | Location memos only |
| 道示 substitution for missing JIS primaries | [jis_version_policy.md](../02_jis/jis_version_policy.md) |
| Auto-newest JIS edition | Forbidden without equivalence decision |

---

## Strength, thickness, temperature, and age applicability

| Dimension | Register handling | DS-03 status |
|-----------|-------------------|--------------|
| **Steel thickness bands** | `thickness_range` on MAT-DS03-002/003/010 | Blocked until JIS plate tables + grade adopted |
| **Rebar diameter** | `MAT-DS03-024` matrix | Blocked until bar size set + JIS table rows evidenced |
| **Concrete strength class / age** | `MAT-DS03-011`, `MAT-DS03-017` | Blocked until 道示 III provisions confirmed |
| **Temperature** | `temperature_range` on thermal rows | Blocked until DS-04 load case set defines thermal range |
| **Creep / shrinkage** | `MAT-DS03-018`, `MAT-DS03-019` | Phase 1A matrix lane `NOT_APPLICABLE`; register and Phase 1B `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` pending DS-05 applicability |
| **Weld toughness** | `MAT-DS03-033` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` pending DS-05 applicability and R7/JIS evidence — fatigue exclusion alone insufficient |
| **Concrete shear modulus G** | No row at DS-03 | Conditional on DS-06; if required, add blocked row in later controlled revision |
| **Fatigue categories** | `MAT-DS03-040` | `OUT_OF_SCOPE` Phase 1 |
| **Composite connectors** | `MAT-DS03-041` | `OUT_OF_SCOPE` — non-composite deck |

---

## Exact evidence packages to unlock categories

### Package A — Structural steel (GRP-STL-*)

| Step | Artifact | Acquisition | Acceptance |
|------|----------|-------------|------------|
| A1 | JIS structural steel product standard identity | Licensed JIS via EXTERNAL_JIS_RESEARCH | `jis_number` + JISC metadata in register; DEC-DS02 row advanced |
| A2 | 道示 II grade selection clause/table | Licensed Ver2.00+20260331 PDF human read | `source_clause` + `source_table` on MAT-DS03-001 |
| A3 | JIS thickness/yield/tensile tables | Licensed JIS primary | Populated MAT-DS03-002/003/010 |
| A4 | 道示 II elastic constants | Human visual confirmation | MAT-DS03-004/005/006 with E-G-ν consistency |
| A5 | Supervisor decision | `DEC-DS03-xxxx` | Links grade to Phase 1 member classes |

### Package B — RC deck concrete (GRP-RC-*)

| Step | Artifact | Acquisition | Acceptance |
|------|----------|-------------|------------|
| B1 | 道示 III strength class and Ec provisions | Licensed PDF human read | MAT-DS03-011/012 locators |
| B2 | Unit weight / ν / thermal if needed | Same | MAT-DS03-013/014/015 |
| B3 | JIS cited for materials if any | Package A JIS process | Cross-reference in notes |

### Package C — Reinforcing steel (GRP-RB-*)

| Step | Artifact | Acquisition | Acceptance |
|------|----------|-------------|------------|
| C1 | JIS rebar standard identity | Licensed JIS | Register JIS row + MAT-DS03-020 |
| C2 | Grade/diameter mechanical tables | Licensed JIS | MAT-DS03-022/023/024 |
| C3 | 道示 III rebar provisions | Human visual confirmation | Locators on strength rows |

### Package D — Bolts, welds, bearings, corrosion (GRP-BLT-*, GRP-WLD-*, GRP-BRG-*, GRP-COR-*)

| Step | Artifact | Acquisition | Acceptance |
|------|----------|-------------|------------|
| D1 | JIS bolt/weld identities | Licensed JIS | Unblock MAT-DS03-026/031 |
| D2 | 道示 II/V connection and bearing clauses | Human visual confirmation | Splice and bearing rows |
| D3 | Base steel grade adopted | Package A complete | Weld matching rows |
| D4 | Coating environment class | 道示 I/II durability clauses | MAT-DS03-037 then 038/039 |

### Package E — Phase 1A analyzer binding (cross-cutting)

| Step | Artifact | Acquisition | Acceptance |
|------|----------|-------------|------------|
| E1 | DS-06 analyzer I/O contract | [ds00_evidence_baseline.md](../00_governance/ds00_evidence_baseline.md#blk-s1-011) | Confirms which Phase 1A constants are mandatory inputs — steel and RC/rebar sets conditional until evidenced |
| E2 | GRP-STL-PHY and GRP-RC-PHY rows confirmed by DS-06 | Packages A+B after E1 | `ADOPTED` with numerics only for confirmed inputs |
| E3 | No 0/1 placeholders | Code/schema audit | Fail-closed validation |

---

## Register and matrix summary

### material_properties_register.csv

| Metric | Count |
|--------|------:|
| Total rows | 44 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 39 |
| `NOT_APPLICABLE` | 0 |
| `OUT_OF_SCOPE` | 2 |
| `REFERENCE_ONLY` | 3 |
| Rows with non-empty `value` | **0** |
| Rows with non-empty `unit` (as sourced data) | **0** |
| **Adopted sourced numerics** | **0** |
| **Adopted unsourced numerics** | **0** |
| Duplicate `property_id` | **0** |

### material_applicability_matrix.csv

| Metric | Count |
|--------|------:|
| Total property groups | 18 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 14 |
| `NOT_APPLICABLE` | 0 |
| `OUT_OF_SCOPE` | 2 |
| `REFERENCE_ONLY` | 2 |
| Duplicate `property_group_id` | **0** |

### Material categories covered

| Category | Register rows | Numeric adoption |
|----------|--------------|------------------|
| Structural steel | MAT-DS03-001…010, 040 | 0 |
| RC deck concrete | MAT-DS03-011…019 | 0 |
| Reinforcing steel | MAT-DS03-020…025 | 0 |
| High-strength bolts | MAT-DS03-026…030 | 0 |
| Welding | MAT-DS03-031…033 | 0 |
| Bearing boundary | MAT-DS03-034…036 | 0 |
| Corrosion / protection | MAT-DS03-037…039 | 0 |
| Scope exclusions / reference | MAT-DS03-041…044 | 0 |

---

## Cross-references

| Artifact | Role |
|----------|------|
| [material_properties_register.csv](material_properties_register.csv) | Per-property governed register |
| [material_applicability_matrix.csv](material_applicability_matrix.csv) | Phase 1A/1B group mapping |
| [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) | Historical numeric fail-closed rules |
| [partial_factor_method_framework.md](../01_target_standard/partial_factor_method_framework.md) | Resistance-side factors → DS-05 |
| [jis_source_register.csv](../02_jis/jis_source_register.csv) | JIS chain blockers |
| [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) | RDY-025 girder_material, RDY-069 steel_weight (location only) |
| [external_traceability_crosswalk.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/external_traceability_crosswalk.csv) | slab_material / splice_bolt traceability |
| [schema_draft.json](../../step1/06_architecture/schema_draft.json) | Non-authoritative material shell |

---

## DS-03 verdict tokens

```text
DS03_MATERIAL_COVERAGE_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_VALUE_SOURCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_UNIT_VERDICT: PASS_FOR_GOVERNANCE_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_APPLICABILITY_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_INTERNAL_CONSISTENCY_VERDICT: PASS
DS03_UNSOURCED_NUMERICS_VERDICT: PASS
DS03_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

Supplemental category verdicts (numeric readiness — all blocked):

```text
DS03_STEEL_PROPERTIES_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_CONCRETE_PROPERTIES_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_REBAR_PROPERTIES_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_BOLT_PROPERTIES_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_WELDING_PROPERTIES_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_BEARING_BOUNDARY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_CORROSION_PROTECTION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_JIS_CHAIN_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_PHASE1A_ANALYZER_INPUTS_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_PHASE1B_DESIGN_CHECKS_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
```

`PASS_WITH_EXACT_EVIDENCE_BLOCKERS` on coverage/applicability — register and matrix complete; every in-scope property classified with explicit blockers; no invented numerics.

`BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` on value source and all material numeric categories — zero sourced values adopted.

`PASS_FOR_GOVERNANCE_WITH_EXACT_EVIDENCE_BLOCKERS` on units — dimensional policy recorded; ρ rows blocked pending g-policy and DS-06.

`COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS` — governance complete; **not** equivalent to numeric adoption, JIS resolution, or design-freeze clearance (DS-09).

---

## DTR disposition at DS-03

| Ref | Topic | DS-03 disposition |
|-----|-------|-------------------|
| DTR-05 | Numeric freeze scope per READY topic | **Material property register created** — numerics remain blocked; partial factors still DS-05 |
| BLK-S1-005 | Material property adoption | **Register established** — adoption still forbidden until JIS + 道示 chain per row |

DTR-02, DTR-04 remain open. JIS identities (DTR-03) classified at DS-02; unchanged at DS-03.

---

## Related documents

| Document | Role |
|----------|------|
| [decision_ledger.md](../00_governance/decision_ledger.md#dec-ds03-0001) | DEC-DS03-0001 |
| [target_standard_freeze.md](../01_target_standard/target_standard_freeze.md) | Target Standard baseline |
| [applicable_volumes_and_sections.md](../01_target_standard/applicable_volumes_and_sections.md) | Volume II/III/V roles for materials |
| [ds00_evidence_baseline.md](../00_governance/ds00_evidence_baseline.md) | BLK-S1-005 matrix |
