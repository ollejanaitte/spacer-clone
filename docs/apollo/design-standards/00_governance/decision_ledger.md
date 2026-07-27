# Decision Ledger — DS-00

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27

All DS-stage decisions are recorded here. Historical Step 1 decisions remain in [step1 decision_log.md](../../step1/00_governance/decision_log.md) unchanged.

---

## DEC-DS00-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS00-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Decision effect** | `ADOPTED` |

### Decision

| Parameter | Value | Adoption status |
|-----------|-------|-----------------|
| **TARGET_STANDARD** | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| **DESIGN_PHILOSOPHY** | 性能規定型設計 | `ADOPTED` |
| **VERIFICATION_FORMAT** | 部分係数法 | `ADOPTED` |

### Separate blocker rows (TARGET_STANDARD facets)

TARGET_STANDARD **selection** is adopted. The following facets remain independent `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` rows:

| Facet | Status until DS stage |
|-------|----------------------|
| Official naming strings (exact 道示 titles) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| Publication metadata (publisher, date, colophon/ISBN) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| Edition verification (令和7年10月版 Ver.2.00 vs 改訂版) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| Errata / 正誤表 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| Applicable volumes/clauses per requirement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01/DS-02 |

### Historical evidence preservation

- **Prior `NOT_SELECTED` preserved as `REFERENCE_ONLY` historical evidence** in:
  - [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) L17
  - [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md)
  - READY row column `target_standard_status=TARGET_STANDARD_NOT_SELECTED` in [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv)
- **Live integration:** DEC-DS00-0001 adopts Target Standard selection; handoff file bytes, Step 1 planning verdicts, AP-00 code guard enums, and `APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY` remain unchanged on disk.

### Remaining blockers (unchanged at DS-00)

| Facet | Status until DS stage |
|-------|----------------------|
| JIS identities (JIS-001…JIS-034 gap rows) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-02 |
| Numeric partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-04 (loads) / DS-05 (resistance/verification) |
| DS-05 member applicability classification | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-05 |
| Analyzer physical I/O evidence | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-06 (BLK-S1-011) |
| All other design numerics | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-04+ |
| Full design freeze | `OUT_OF_SCOPE` for DS-00 → **DS-09** gate |

### Rationale

User-supervisor direction closes the Target Standard selection gap (ISS-S1-008, BLK-S1-001) while preserving fail-closed evidence discipline for metadata, clauses, JIS, DS-05 classifications, DS-06 Analyzer I/O, and numerics required by Step 1 blockers and handoff `NOT_READY` freeze assessment.

### Evidence anchors

- Repository baseline: `e323386bbe788687193bbc4fa0a643b1f5e65119`
- Historical pre-decision record SHA256: `e58fc4be211bb874330e18c60c35b7de58471fae57008a380238de33c189a21a` ([target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md))

---

## DEC-DS00-0002

| Field | Value |
|-------|-------|
| **ID** | DEC-DS00-0002 |
| **Date** | 2026-07-27 |
| **Decider** | DS-00 governance baseline (Composer 2.5 worker, supervisor-directed) |
| **Decision effect** | `ADOPTED` |

### Decision

Establish `docs/apollo/design-standards/` as the **single current integration authority** for design-standard governance. Preserve all pre-existing artifacts as immutable historical evidence per [source_priority_policy.md](source_priority_policy.md).

### Rationale

Independent audits (Composer survey, Grok adversarial review) identified duplicate-authority and legacy-contamination risks without an in-repo DS integration root. DS-00 provides that root without copying standards text or editing historical paths.

---

## Pending decisions (not decided at DS-00)

These remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — see [ds00_evidence_baseline.md#blocker-evidence-matrix](ds00_evidence_baseline.md#blocker-evidence-matrix):

| Ref | Topic | Historical Step 1 ID |
|-----|-------|---------------------|
| DTR-01 | Confirm binding 道示 edition under 令和7年改訂版 label | [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md) |
| DTR-02 | Supporting manual edition map | same |
| DTR-03 | JIS gap disposition (JIS-001…JIS-034 rows) | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) |
| DTR-04 | Historical APOLLO baseline vs Target | BLK-S1-007 |
| DTR-05 | Numeric freeze scope per READY topic | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) |
| DTR-06 | Errata / 正誤表 status for R7 volumes | [standards_source_inventory.md](../../step1/02_standards_baseline/standards_source_inventory.md) |

DEC-DS00-0001 satisfies the **selection** intent of DTR-01 at label level only; DTR-01 evidentiary closure remains open for DS-01.
