# Phase 1 Verification Scope — DS-05

**Classification and register freeze — DS-05 does not adopt verification numerics**

**Authority:** DS-05 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Parent:** [DEC-DS05-0001](../00_governance/decision_ledger.md#dec-ds05-0001)
**Repository baseline:** `274a2f20bd794f396d9ed09741b26974374a84e4`

DS-05 establishes the governed **performance requirement register**, **limit state register**, **verification equation register**, **limit value register**, and **deemed-to-satisfy register** for Apollo Phase 1 (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear analysis) under Target Standard 道路橋示方書・同解説 令和7年改訂版 (Ver2.00 + 20260331 errata overlay per DEC-DS01-0001). DS-05 **does not adopt** any verification equation form, resistance partial factor, limit numeric, deemed-to-satisfy rule, clause/table locator, or comparison rule. Every in-scope numeric and equation field remains blank. **Zero** R7 verification provisions have been visually confirmed at DS-05.

---

## Critical constraints (inherited from DS-01 / DS-02 / DS-03 / DS-04)

| Constraint | DS-05 disposition |
|------------|-------------------|
| R7 verification equation / limit / deemed rule / clause / table locators | **Zero** visually confirmed — all locators blank |
| RBS / handoff evidence PNGs | Location/workflow memos only — **not** equation, factor, or limit authority |
| `ready_requirements.csv` splice/girder/bracing rows | `REFERENCE_ONLY` location memos — do not adopt as Phase 1B authorization; **no phase column** in that CSV |
| SPACER PRINT, runtime examples, old editions, 鋼便覧 allowable-stress workflows | **Forbidden** as adoption sources |
| Performance-based partial-factor method | `ADOPTED` per DEC-DS01-0001 — **not** reducible to allowable-stress verification |
| Load-side partial factors | DS-04 — all blocked; DS-05 references `DS04_load_factor_and_combination_chain_blocked` only |
| Material design values | DS-03 — all numerics blocked |
| Analyzer response mapping | DS-06 — blocked (BLK-S1-011) |
| Full design freeze | `OUT_OF_SCOPE` for DS-05 → **DS-09** gate |
| Design situation taxonomy | `design_situation_unspecified` blocked token on all candidate rows — **taxonomy unresolved** at DS-05 |

---

## Phase 1A vs Phase 1B separation (mandatory)

| Lane | Scope | DS-05 posture |
|------|-------|---------------|
| **Phase 1A** | Static linear analysis execution and IF3-gated result export | **No verification authorized.** Analysis response availability does **not** authorize any design check. Register rows classify future candidates only. |
| **Phase 1B** | Design verification using partial-factor method | All verification equations, resistance factors, limits, and deemed rules **blocked** pending evidence packages PKG-R7-V, PKG-DS03, PKG-DS04, PKG-DS06, and PKG-SCOPE-P1B where applicable. |
| **BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT** | Main girder, cross girder, sway bracing, lateral bracing candidates | Recorded as supervisor-listed candidate coverage — **not** Phase 1B authorized until PKG-SCOPE-P1B supervisor Phase1B member table. |
| **OUT_OF_SCOPE** | Fatigue, seismic, composite, nonlinear, erection | Explicit exclusion rows in performance register — no verification equation rows. |

**Fail-closed rule:** Completing Phase 1A analysis MUST NOT auto-enable Phase 1B checks. A separate evidence chain and supervisor decision is required per row.

---

## Unresolved scope conflict (not silently resolved)

| Source | Posture | Conflict |
|--------|---------|----------|
| User-supervisor formal DS-05 / primary structure instruction | Scope-candidate authority | Lists main girder, cross girder, bracing, RC deck, bearing, and connection as Phase 1 verification candidates |
| Step1 `phase1_scope_freeze.md` (DEC-S1-0008) | `FROZEN_NARROW` planning authority | Member detailed design (Girder, Section, Splice) → **LATER_PHASE**; bracing/stiffener design → **OUT_OF_PHASE1** |
| Handoff `ready_requirements.csv` | Rank-1 immutable intake | Location memos for girder/splice/bracing rows — **no phase column**; `target_standard_status` column only |
| DS-05 classification | Fail-closed register posture | Records **candidate** requirements without claiming R7 identity; assigns `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` for main/cross/bracing pending PKG-SCOPE-P1B |

**Conflict fact (corrected):** The conflict is **user formal DS-05 primary structure vs Step1 narrow implementation boundary and catalog dispositions** — not a nonexistent handoff phase column. `ready_requirements.csv` has no phase column.

**Required resolution (PKG-SCOPE-P1B):**

| Field | Requirement |
|-------|-------------|
| Artifact | Supervisor decision `DEC-DS05-xxxx` or `DEC-S1-xxxx` amending Phase 1B verification envelope |
| Acquisition | Written supervisor ruling reconciling user formal Phase 1 structure vs Step1 `FROZEN_NARROW` boundary |
| Acceptance | Explicit per-member-class Phase 1B IN/OUT table; no silent promotion of handoff location memos |
| Owner | User-supervisor |

Until PKG-SCOPE-P1B closes, main girder, cross girder, and bracing verification rows remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` regardless of Step1 catalog dispositions alone.

### Non-evidentiary volume routing candidates (DS-01 prose only)

When PKG-R7-V evidence is acquired, supervisor may route verification provisions to 道示 volumes I–V per [applicable_volumes_and_sections.md](../01_target_standard/applicable_volumes_and_sections.md). These routing candidates are **not** per-row evidence at DS-05 and are **not** recorded in register `source_volume` fields (all blank).

---

## Register inventory

| Register | Rows | Adopted numerics | Adopted equations |
|----------|------|------------------|-------------------|
| [performance_requirement_register.csv](performance_requirement_register.csv) | 28 | 0 | — |
| [limit_state_register.csv](limit_state_register.csv) | 23 | 0 | — |
| [verification_equation_register.csv](verification_equation_register.csv) | 23 | 0 | 0 (all `equation_summary` blank — no equation form adopted) |
| [limit_value_register.csv](limit_value_register.csv) | 11 | 0 | — |
| [deemed_to_satisfy_register.csv](deemed_to_satisfy_register.csv) | 2 | 0 | — |

### Performance requirement classification counts

| `phase1_status` | Count | Members / topics |
|-----------------|-------|------------------|
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 15 | Main girder (8), cross girder (3), sway bracing (2), lateral bracing (2) |
| `PHASE1_REQUIRED` | 4 | RC deck (bending, shear, serviceability, minimum reinforcement/detailing) |
| `PHASE1_REFERENCE` | 4 | Bearing boundary (2), connection boundary (2) — boundary-only reference posture; adoption blocked |
| `OUT_OF_SCOPE` | 5 | Fatigue, seismic, composite, nonlinear, erection |

### Adoption status counts (performance register)

| `adoption_status` | Count | Scope |
|-------------------|-------|-------|
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 23 | PR-DS05-001…023 |
| `OUT_OF_SCOPE` | 5 | PR-DS05-024…028 explicit exclusions |

### Candidate coverage boundary

DS-05 candidate coverage is **limited exactly** to supervisor-listed verification modes (main girder ULS/SLS, cross girder, bracing, RC deck, bearing boundary, connection boundary). R7 completeness for those modes remains blocked. DS-05 does **not** expand coverage with speculative punching, unseating, or stiffener checks beyond this list.

---

## Response-to-check conversion responsibility

| Responsibility | Owner | DS-05 posture |
|----------------|-------|---------------|
| Extract design response quantities from Phase 1A analysis output | **DS-06** | Unit, sign, local coordinate, I-J end mapping, envelope selection — all blocked |
| Map analysis output to `response_quantity` fields in verification register | **DS-06** with DS-05 traceability | No quantity mapping without PKG-DS06 acceptance; quantity tokens explicitly non-authoritative |
| Apply load-side partial factors from DS-04 | **DS-04 chain** at combination stage | Reference `DS04_load_factor_and_combination_chain_blocked` — factors not applied at DS-05 |
| Apply resistance-side partial factors | **DS-05** (blocked token) | `resistance_factor_role_and_value_pending_R7_evidence` — no numeric, no orphan factor IDs |
| Apply adjustment factors | **Blocked** | `adjustment_factors` blank unless evidenced |
| Authorize pass/fail judgment | **Blocked** | `comparison_rule` blank in VER/LV — no comparison form adopted |

### Blank equation and comparison fields

All `equation_summary` and `comparison_rule` fields in VER and LV registers are **intentionally blank**. Blank means **no equation or comparison form adopted** at DS-05. A blank `limit_concept` on a resistance-type candidate likewise means that DS-05 has not adopted a separate limit concept; it does not mean that no R7 limit applies. `response_quantity`, `resistance_quantity`, `response_concept`, `resistance_concept`, and nonblank `limit_concept` tokens remain explicitly **non-authoritative** candidate placeholders pending R7 evidence and DS-06 mapping.

### Double factor application prohibition

1. **Load + resistance:** The same action component must not receive factoring on both load and resistance sides unless evidenced R7 provision explicitly requires that structure for a named term.
2. **Analysis + combination:** Do not apply DS-04 load factors to analysis output that is already at design-value level per evidenced combination rule.
3. **Deemed-to-satisfy + explicit factors:** Do not apply load/resistance factors on top of deemed-to-satisfy provisions already calibrated for design level unless evidenced (see DTS register).
4. **Dynamic/impact:** Sole ownership remains LF-DS04-010 on LM-DS04-006 per DS-04 — no duplicate impact application at DS-05.
5. **Material unit weights:** DS-03 γ values are dead-load model inputs — not resistance factors.

---

## Evidence packages

| Package ID | Artifact | Acquisition | Acceptance | Owner |
|------------|----------|-------------|------------|-------|
| **PKG-R7-V** | Licensed 道示 verification clauses, tables, equation forms, comparison rules, resistance partial factors | Licensed Ver2.00+20260331 PDF human visual confirmation | Per-row `source_clause`, `source_table`, `equation_summary`, `comparison_rule`, and factor placement recorded without SPACER/runtime/old-edition substitution | DS-05_VERIFICATION |
| **PKG-DS03** | Adopted material design values from [material_properties_register.csv](../03_materials/material_properties_register.csv) | Per-row JIS + 道示 chain per DEC-DS03-0001 | Resistance quantities use adopted MAT rows only — currently all blocked | DS-03_MATERIALS |
| **PKG-DS04** | Adopted load models, load factors, combinations from DS-04 registers | Per DEC-DS04-0001 evidence packages | Load-side factors applied exactly once at evidenced combination stage — currently all blocked | DS-04_LOADS |
| **PKG-DS06** | Analyzer response unit/sign/coordinate/I-J mapping and envelope rules | BLK-S1-011 evidence acquisition | `response_quantity` fields mappable from IF3 output without ambiguity | DS-06_ANALYZER_IO |
| **PKG-SCOPE-P1B** | Supervisor decision resolving user formal Phase 1 structure vs Step1 narrow Phase 1B boundary | Written `DEC-DS05-xxxx` or `DEC-S1-xxxx` with per-member Phase1B member table | Explicit per-member-class Phase 1B IN/OUT table | User-supervisor |

Every blocked register row references exact PKG(s) in `evidence_package` or `evidence_location`. No blocked row lacks an operational evidence path.

---

## Partial-factor application (resistance side)

DS-05 verification rows reference blocked resistance-factor token `resistance_factor_role_and_value_pending_R7_evidence` (no orphan resistance-factor register IDs). No `factor_value` is populated. Resistance-side numerics remain separately gated from DS-03 material source adoption and DS-04 load-side factors per [partial_factor_method_framework.md](../01_target_standard/partial_factor_method_framework.md).

| Verdict token | Value |
|---------------|-------|
| `DS05_PARTIAL_FACTOR_APPLICATION_VERDICT` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

---

## Deemed-to-satisfy posture

Two generic blocked shells (`DTS-DS05-001` steel member, `DTS-DS05-002` RC deck detailing). All `rule_summary`, `prerequisites`, `limitations`, `alternative_method_allowed`, and `approval_requirement` fields are **blank intentionally** — do not imply an alternative method exists.

| Verdict token | Value |
|---------------|-------|
| `DS05_DEEMED_TO_SATISFY_VERDICT` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

---

## Forbidden practices at DS-05

| Practice | Disposition |
|----------|-------------|
| Allowable-stress verification as substitute for performance-based partial-factor method | **Forbidden** |
| Formulas or numerics from memory, old standards, manuals, runtime, SPACER | **Forbidden** |
| Labeling candidate engineering names as confirmed R7 terminology | **Forbidden** |
| Prohibited provisional status tokens | **Forbidden** — per [adoption_status_model.md](../00_governance/adoption_status_model.md) |
| Promoting handoff location memos to Phase 1B authorization without PKG-SCOPE-P1B | **Forbidden** |
| Splitting reference vs OUT_OF_SCOPE for cross girder/bracing based only on Step1 implementation roadmap | **Forbidden** — pending supervisor Phase1B member table |
| Orphan resistance/adjustment factor register IDs | **Forbidden** — use plain blocked tokens only (`resistance_factor_role_and_value_pending_R7_evidence`; blank `adjustment_factors`) |

---

## DS-05 verdict tokens

```text
DS05_PERFORMANCE_REQUIREMENT_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS05_LIMIT_STATE_COVERAGE_VERDICT: PASS_FOR_SUPERVISOR_CANDIDATE_SET_WITH_EXACT_EVIDENCE_BLOCKERS
DS05_VERIFICATION_EQUATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_LIMIT_VALUE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_PARTIAL_FACTOR_APPLICATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_DEEMED_TO_SATISFY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_PHASE1_SCOPE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS05_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

Completion requires all candidate and excluded rows classified, zero orphan IDs, and every blocked row operationally linked to exact evidence package(s).

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Performance requirements | [performance_requirement_register.csv](performance_requirement_register.csv) |
| Limit states | [limit_state_register.csv](limit_state_register.csv) |
| Verification equations | [verification_equation_register.csv](verification_equation_register.csv) |
| Limit values | [limit_value_register.csv](limit_value_register.csv) |
| Deemed-to-satisfy | [deemed_to_satisfy_register.csv](deemed_to_satisfy_register.csv) |
| DS-04 loads | [load_governance_report.md](../04_loads/load_governance_report.md) |
| DS-03 materials | [material_source_report.md](../03_materials/material_source_report.md) |
| Step1 scope freeze | [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) |
| Handoff READY | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) |
