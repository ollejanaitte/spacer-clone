# Performance-Based Design Philosophy — DS-01

**Authority:** DS-01 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Adoption status:** `ADOPTED`
**Parent:** [DEC-DS00-0001](../00_governance/decision_ledger.md#dec-ds00-0001), [DEC-DS01-0001](../00_governance/decision_ledger.md#dec-ds01-0001)

Apollo adopts **性能規定型設計** (performance-based design) as the design philosophy for the Target Standard 道路橋示方書・同解説 令和7年改訂版. MLIT official press release (報道発表資料) dated 2025-08-22 — title 「橋、高架の道路等の技術基準」（道路橋示方書）の改定について — records the R7 revision context; this document does not restate press-release claims as binding clause content.

This document defines the **integration hierarchy** and the boundary between performance requirements and deemed-to-satisfy provisions. It does **not** restate standards text, numeric limits, or verification equations.

---

## Design philosophy adoption

| Item | Status | Binding for computation? |
|------|--------|---------------------------|
| 性能規定型設計 as Apollo design philosophy | `ADOPTED` | Yes — as structural framework for verification workflow |
| Specific performance levels and limit-state criteria per member | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | No until later applicable DS mapping with visual clause evidence |
| Deemed-to-satisfy provision tables and shortcuts | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | No until cited with visual evidence |

---

## Verification hierarchy (exact order)

Apollo integration follows this chain. Each step must be traceable to Target Standard evidence before numerics bind.

```text
required performance
  → design situation
    → limit state
      → response (action / demand side)
        → resistance / limit (capacity side)
          → partial factors (load-side, resistance-side, adjustment — roles only at DS-01)
            → verification equation (form blocked at DS-01)
              → judgment (pass / fail / not applicable)
                → applicability (bridge type, member class, limit state scope)
                  → deemed-to-satisfy (optional shortcut path)
                    → evidence / source
```

### Step definitions

| Step | Role in integration |
|------|---------------------|
| **Required performance** | States what the structure must achieve for the applicable design situation. Governs **what** must be verified. |
| **Design situation** | Defines the loading, environmental, and structural configuration context under which verification applies. |
| **Limit state** | Identifies the failure or serviceability mode being checked. |
| **Response** | Demand-side quantity derived from analysis or prescribed action (forces, stresses, displacements, etc.). |
| **Resistance / limit** | Capacity-side quantity or limit derived from material, geometry, and resistance model. |
| **Partial factors** | Separate treatment of load-side (action), resistance-side (material/model), and adjustment factors where the standard distinguishes them. **Numeric values are not adopted at DS-01.** |
| **Verification equation** | Compares factored response to factored resistance/limit. Exact equation forms and coefficient placement remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-04 (loads) and DS-05 (resistance/verification). |
| **Judgment** | Formal pass/fail (or not applicable) outcome for the limit state under the design situation. |
| **Applicability** | Confirms the check applies to the Phase 1 archetype, member class, and adopted volumes. |
| **Deemed-to-satisfy** | Prescriptive shortcut that demonstrates compliance without full performance-path calculation when conditions are met. |
| **Evidence / source** | Registered document, edition, errata overlay, and human-verified locator for every adopted facet. |

---

## Performance requirements vs deemed-to-satisfy provisions

| Concept | Meaning | Apollo treatment |
|---------|---------|------------------|
| **Performance requirement** | States a required performance level and expects verification via the performance path (analysis → response → resistance → partial factors → equation → judgment). | Primary integration path. Requires full evidence chain per limit state. |
| **Deemed-to-satisfy provision** | Prescriptive rule, table, or geometric/material constraint that is **accepted as satisfying** the performance requirement when its stated conditions are met. | May be used only when applicability conditions are evidenced and the provision is cited with visual confirmation. Does not override performance requirements where the standard requires the performance path. |

**Rules:**

1. Deemed-to-satisfy provisions are **not** interchangeable with performance requirements unless the Target Standard explicitly allows that substitution for the member and limit state in question.
2. Using a deemed-to-satisfy shortcut without confirming applicability conditions is **forbidden** for adopted computation paths.
3. Where both a performance path and a deemed-to-satisfy path exist, the integration record must state which path is taken and cite evidence for that path.

---

## Alternative methods and equivalency

When the Target Standard permits alternative verification methods (including alternatives to the partial-factor performance path or to specific deemed-to-satisfy provisions), Apollo requires **all** of the following before adoption:

| Requirement | Description |
|-------------|-------------|
| **Documented equivalence** | Written demonstration that the alternative achieves the same required performance for the stated design situation and limit state. |
| **Evidence** | Source locator (volume, clause/table/figure) with human visual confirmation; edition aligned with [edition_and_errata_register.csv](edition_and_errata_register.csv) baseline. |
| **Reviewer approval** | Independent technical reviewer sign-off recorded in the decision ledger or linked DS evidence entry. |
| **Supervisor approval** | User-supervisor decision (`DEC-DSxx-xxxx`) before the alternative binds integration or code paths. |

Alternative methods **must not** be assumed equivalent from prior editions (including H29) or supporting manuals (`REFERENCE_ONLY`).

---

## Relationship to partial-factor method

性能規定型設計 sets the **philosophical and hierarchical frame**. **部分係数法** is the adopted **verification format** for expressing the comparison between response and resistance under factored design situations. See [partial_factor_method_framework.md](partial_factor_method_framework.md).

At DS-01:

- Philosophy hierarchy: `ADOPTED`
- Method selection: `ADOPTED`
- Numeric factors and exact equations: `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

---

## Phase 1 scope interaction

Performance-based design applies within the Phase 1 bridge archetype boundaries defined in [design_standard_scope.md](../00_governance/design_standard_scope.md). Topics explicitly `OUT_OF_SCOPE` for Phase 1 (seismic, fatigue, substructure body design, etc.) do not require performance-path adoption at DS-01 even if volumes I–V discuss them.

Volume-level Phase 1 roles: [applicable_volumes_and_sections.md](applicable_volumes_and_sections.md).

---

## Evidence anchors

| Evidence | Locator |
|----------|---------|
| MLIT official press release (報道発表資料) | [001906067.pdf](https://www.mlit.go.jp/report/press/content/001906067.pdf) — SHA256 `60ef4608873161151720ae8038b7d63b84ade064538f67e0169d04c5268049a8` (`EVD-DS01-001`) |
| R7 volume I (common provisions) | Register row `RBS-I` in [edition_and_errata_register.csv](edition_and_errata_register.csv); evidence `EVD-DS01-005` |
| DS-01 evidence register | [ds01_evidence_register.md](ds01_evidence_register.md) |
| DEC-DS00-0001 philosophy parameter | [decision_ledger.md](../00_governance/decision_ledger.md#dec-ds00-0001) |
