# Partial Factor Method Framework — DS-01

**Authority:** DS-01 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Adoption status (method):** `ADOPTED`
**Parent:** [DEC-DS00-0001](../00_governance/decision_ledger.md#dec-ds00-0001), [DEC-DS01-0001](../00_governance/decision_ledger.md#dec-ds01-0001)

Apollo adopts **部分係数法** (partial factor method) as the verification format under the Target Standard 道路橋示方書・同解説 令和7年改訂版. This document defines factor **roles**, integration rules, and explicit deferrals. It does **not** publish numeric partial factors, exact verification equations, or coefficient placements.

**Prohibited term:** 部分分数法 — use 部分係数法 only.

---

## Method adoption

| Item | Status | Unlock |
|------|--------|--------|
| 部分係数法 as verification format | `ADOPTED` | — |
| Load-side (action) partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 |
| Resistance-side (material/model) partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Adjustment factors (where standard distinguishes them) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 / DS-05 per role |
| Exact verification equation forms | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 / DS-05 |
| Coefficient placement in combined equations | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 / DS-05 |

---

## Position in performance hierarchy

The partial-factor step sits within the performance-based chain defined in [performance_based_design_philosophy.md](performance_based_design_philosophy.md):

```text
… → response → resistance/limit → [partial factors] → verification equation → judgment → …
```

Partial factors translate characteristic or representative values into design values for the verification equation. They do **not** replace the required-performance or design-situation definition.

---

## Factor classes (role distinction)

| Class | Side | Role (conceptual) | DS-01 posture |
|-------|------|-------------------|---------------|
| **Load-side (action) factors** | Demand | Increase or combine actions/effects to design-level values for the relevant design situation and limit state | Role `ADOPTED`; numerics blocked → DS-04 |
| **Resistance-side factors** | Capacity | Reduce or adjust resistance/limit quantities to design-level values accounting for material and model uncertainty | Role `ADOPTED`; numerics blocked → DS-05 |
| **Adjustment factors** | Either (as defined by standard) | Modify combination, conversion, or model-specific terms where the standard treats them separately from primary load or resistance factors | Role `ADOPTED`; numerics blocked → DS-04/DS-05 per cited role |

**Integration rules:**

1. **Do not invent factors.** Any numeric factor must arrive from exact Target Standard evidence with `source_locator`, edition alignment, and supervisor decision.
2. **Prohibit double application.** The same uncertainty or action component must not receive factoring on both load and resistance sides unless the standard explicitly requires that structure for a named term. Integration must track which side owns each factor.
3. **Do not merge classes silently.** Load-side, resistance-side, and adjustment factors remain separately traceable in evidence records even when they appear in a single combined equation at DS-04/DS-05.
4. **No numeric placeholders** in DS documents, code, or schemas at DS-01.

---

## Generic comparison structure (non-normative schematic)

The following is a **schematic integration aid only**. It is **not** normative, **not** a binding equation, and **must not** be used to infer numeric factors or exact operator placement.

```text
[Design response]  compare_to  [Design resistance / limit]
     ↑                              ↑
  derived from                   derived from
  factored actions/effects       factored resistance/model
  (load-side factors)            (resistance-side factors)
        \________________  adjustment terms where separately defined  ________________/
```

**Normative equation forms, inequality direction, combination rules, and numeric coefficients** remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` for DS-04 (load-side and action combinations) and DS-05 (resistance-side, member verification, and placement in verification expressions).

---

## Deemed-to-satisfy interaction

Deemed-to-satisfy provisions may embed implicit factoring or fixed dimensions that already satisfy a performance requirement. When using such a provision:

- The integration record must state whether explicit partial-factor verification is bypassed by deemed-to-satisfy applicability.
- Hidden double factoring (e.g. applying load factors on top of a deemed-to-satisfy table already calibrated for design level) is **forbidden** unless evidenced from the cited provision.

See [performance_based_design_philosophy.md](performance_based_design_philosophy.md).

---

## Alternative verification formats

If the Target Standard permits a verification format other than 部分係数法 for a specific limit state or member class, treat it as an **alternative method** requiring documented equivalence, evidence, reviewer approval, and supervisor decision before adoption. The default adopted format for Apollo Phase 1 integration remains 部分係数法 unless a later `DEC-DSxx-xxxx` records otherwise.

---

## Downstream stages

| Stage | Deliverable |
|-------|-------------|
| DS-04 | Load-side partial factors, action combinations, load model factoring |
| DS-05 | Resistance-side partial factors, member verification equations, coefficient placement |
| Later applicable DS stage | Clause-level mapping linking limit states to volumes I–III and selected V topics |

---

## Evidence anchors

| Evidence | Locator |
|----------|---------|
| DEC-DS00-0001 verification format | [decision_ledger.md](../00_governance/decision_ledger.md#dec-ds00-0001) |
| R7 common volume (I) | Register row `RBS-I` in [edition_and_errata_register.csv](edition_and_errata_register.csv); evidence `EVD-DS01-005` |
| DS-01 evidence register | [ds01_evidence_register.md](ds01_evidence_register.md) |
| Numeric governance policy | [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) (`REFERENCE_ONLY` historical; fail-closed rules apply) |
