# Target Standard Decision — P02

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Status:** **NOT_SELECTED** (unchanged from handoff)

## Decision record

| Field | Value |
|-------|-------|
| **Target Standard status** | **NOT_SELECTED** |
| **Binding decision ID** | *(none — DECISION_REQUIRED)* |
| **Handoff authority** | `PACKAGE_INFO.md` L17; all 69 `ready_requirements.csv` rows |
| **P02 verdict** | Governance and inventory established; **unique Target Standard selection deferred** |

P02 does **not** invent a Target Standard. Prefer NOT_SELECTED over guessing.

---

## Why NOT_SELECTED remains correct

Local evidence **does not uniquely determine** a single binding Target Standard edition for Phase 1 numeric freeze:

1. **Handoff explicit constraint** — Package frozen at `Target Standard: NOT_SELECTED`; READY rows carry `TARGET_STANDARD_NOT_SELECTED` and `NO_AUTO_NUMERIC_DETERMINATION`.
2. **Historical baseline unknown** — All READY rows flag `HISTORICAL_BASELINE_UNKNOWN_EDITION`; Stage5A/5B used location memos under `HISTORICAL_BASELINE_UNKNOWN_EDITION; TARGET_STANDARD_NOT_SELECTED`.
3. **Edition multiplicity** — Inventory confirms **令和7年10月版 Ver.2.00** 道示 (Ⅰ–Ⅴ) as highest local PDF editions, but supporting manuals (R2 鋼便覧, H31 支承便覧) declare **平成29年11月版** alignment (partially confirmed; not re-validated as Target).
4. **JIS dependency unresolved** — 34 JIS SOURCE GAP rows block material/bolt/rebar numeric authority; Target Standard cannot be closed without JIS acquisition strategy (ISS-S1-009).
5. **Supervisor gate open** — ISS-S1-008 requires explicit Target Standard selection in Step 1 governance before numeric freeze.

---

## Candidate editions (informational only — not selected)

| Candidate | Evidence | Blockers to adoption as Target |
|-----------|----------|--------------------------------|
| **道路橋示方書 令和7年10月版 Ver.2.00** (Ⅰ–Ⅴ) | `inventory/pdf_version_priority_inventory.csv`; handoff READY edition string; 11 local PDFs | JIS gaps; supervisor sign-off; supporting-manual edition map |
| **道路橋示方書 平成29年11月版** | R2 鋼便覧 / H31 支承便覧序文 refs; composite/box **examples** (deferred) | Superseded by local R7 PDFs for core volumes; not handoff Target |
| **Design-manual-only baseline** | R2 鋼便覧 + DDB practice | Explicitly **not** co-equal with 道示; forbidden as JIS substitute |

No candidate satisfies **unique decidability** from Rank 1–4 evidence alone.

---

## DECISION_REQUIRED — inputs for supervisor / P03+

Before a `DEC-S1-xxxx` Target Standard decision can be recorded:

| # | Required input | Owner | Source |
|---|----------------|-------|--------|
| DTR-01 | **Confirm Phase 1 binding 道示 edition** (R7/10 Ver.2.00 vs other) | supervisor | `inventory/phase1_document_priority.md`; ISS-S1-008 |
| DTR-02 | **Supporting manual edition map** — which 便覧/DDB editions apply under chosen 道示 Target | step1_planner + external_research | R2 鋼便覧, H31 支承, DDB 2021 alignment notes |
| DTR-03 | **JIS gap disposition** — acquire primaries vs scoped deferral vs explicit project exceptions | external_jis_research | `jis_source_gaps.csv`; ISS-S1-009 |
| DTR-04 | **Historical APOLLO baseline** — whether clone targets APOLLO historical edition or current 道示 | supervisor + frame_team | `HISTORICAL_BASELINE_UNKNOWN_EDITION` flags |
| DTR-05 | **Numeric freeze scope** — which READY 69 topics require frozen constants in Step 1 vs Step 2+ | supervisor | `ready_requirements.csv`; charter |
| DTR-06 | **Errata / 正誤表 status** for R7 道示 volumes | external_research | inventory notes `errata_status=NOT_STATED` |

Until DTR-01 through DTR-03 are resolved at minimum, Target Standard must remain **NOT_SELECTED**.

---

## Gate linkage

| Gate | Expected with NOT_SELECTED |
|------|----------------------------|
| P02 completion | **PASS_WITH_BLOCKERS** |
| Numeric value adoption | **Prohibited** (see [numeric_value_governance.md](numeric_value_governance.md)) |
| Material property adoption | **Prohibited** except PLACEHOLDER (see [material_property_governance.md](material_property_governance.md)) |
| Design freeze | **NOT_READY** (per handoff `APOLLO_FULL_DESIGN_FREEZE_VERDICT`) |

---

## Related issues

- [ISS-S1-008](../01_acceptance/handoff_issue_register.csv) — Target Standard NOT_SELECTED
- [ISS-S1-009](../01_acceptance/handoff_issue_register.csv) — JIS source gaps (34)
- [standards_blocker_register.csv](standards_blocker_register.csv) — BLK-S1-001, BLK-S1-002
