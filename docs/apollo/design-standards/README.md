# Apollo Design Standards — DS-00 Governance Baseline

**Authority:** CURRENT INTEGRATION AUTHORITY (design standards)
**Stage:** DS-00 — governance baseline only
**Date:** 2026-07-27
**Repository baseline:** `e323386bbe788687193bbc4fa0a643b1f5e65119`

`docs/apollo/design-standards/` is the **single current integration authority** for Apollo design-standard governance, adoption status, source priority, and evidence requirements. DS-00 establishes rules and pointers; it does **not** copy standards text, adopt numerics, or amend historical artifacts.

## DS-00 proceed verdict

```text
DS00_REPOSITORY_PREFLIGHT_VERDICT: PASS
DS00_EXISTING_EVIDENCE_SURVEY_VERDICT: PASS_WITH_FINDINGS
DS00_DUPLICATE_AUTHORITY_VERDICT: PASS_WITH_CONTROL
DS00_LEGACY_STANDARD_CONTAMINATION_VERDICT: PASS_WITH_CONTROL
DS00_PROCEED_VERDICT: PASS
```

Full design-standard freeze remains **not authorized** at DS-00; full freeze gate is **DS-09**. See [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md).

## Governance documents

| Document | Role |
|----------|------|
| [design_standard_scope.md](00_governance/design_standard_scope.md) | DS-00 scope, Phase 1 bridge archetype boundaries, later-stage deferrals |
| [source_priority_policy.md](00_governance/source_priority_policy.md) | Authority stack; historical vs current integration paths |
| [adoption_status_model.md](00_governance/adoption_status_model.md) | Allowed adoption statuses and fail-closed rules |
| [copyright_and_evidence_policy.md](00_governance/copyright_and_evidence_policy.md) | Evidence handling, redistribution, no standards copying |
| [decision_ledger.md](00_governance/decision_ledger.md) | Supervisor decisions including DEC-DS00-0001 |
| [ds00_evidence_baseline.md](00_governance/ds00_evidence_baseline.md) | Integrity anchors, audit summaries, blocker evidence matrix |

## User-supervisor decision (summary)

Recorded **2026-07-27** as [DEC-DS00-0001](00_governance/decision_ledger.md#dec-ds00-0001):

| Field | Value | DS-00 adoption status |
|-------|-------|----------------------|
| TARGET_STANDARD | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| DESIGN_PHILOSOPHY | 性能規定型設計 | `ADOPTED` |
| VERIFICATION_FORMAT | 部分係数法 | `ADOPTED` |

TARGET_STANDARD **selection** is formally adopted. Official naming strings, publication metadata, edition verification, errata, and volume/clause mapping each remain separate `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` rows until DS-01 (see [decision_ledger.md](00_governance/decision_ledger.md#dec-ds00-0001) and BLK-S1-001). Partial-factor **method** is adopted; numeric partial factors remain blocked until exact source evidence plus supervisor decision (load-side DS-04; resistance/verification-side DS-05). Prior `NOT_SELECTED` labels in handoff and Step 1 artifacts are preserved as `REFERENCE_ONLY` historical evidence.

## Historical artifacts (immutable — do not edit)

| Artifact class | Path | Role under DS-00 |
|----------------|------|------------------|
| Handoff package | [../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) | Rank-1 immutable intake evidence |
| Step 1 planning | [../step1/README.md](../step1/README.md) | Historical planning synthesis (pre–DS-00 standards baseline) |
| AP-00 governance | [../ap00/README.md](../ap00/README.md) | Implementation governance (orthogonal to design-standard content) |

## Related Apollo navigation

- [Apollo root](../README.md)
- [Phase 1 scope freeze (planning)](../step1/05_scope_boundary/phase1_scope_freeze.md)
- [Step 1 target standard record (historical)](../step1/02_standards_baseline/target_standard_decision.md)
