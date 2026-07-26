# Blocker Dependency Matrix — Step 1 → AP-*

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Sources:** [blocker_register.csv](../../step1/04_gap_analysis/blocker_register.csv), [implementation_pr_breakdown.csv](../../step1/08_roadmap/implementation_pr_breakdown.csv), [completion_gate.md](../../step1/08_roadmap/completion_gate.md)

Maps **open Step 1 blockers** to **blocked or constrained AP-* implementation units**. Unblock requires external disposition (DTR-*) or explicit AP-* fix (e.g. AP-11 for IF3).

---

## HIGH blockers

### BLK-S1-001 — Target Standard NOT_SELECTED

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Owner | Governance (all tools) |
| External gate | DTR-01 |
| Unlock | Target Standard selected and recorded in decision log |

**Blocks or constrains:**

| AP-* | Effect |
|------|--------|
| AP-04 | No adopted road design loads |
| AP-07 | ADOPTED material constants **FORBIDDEN** |
| AP-08 | Adopted load magnitudes **FORBIDDEN** |
| AP-12 | Code-check numerics |
| AP-14 | Numeric design checks **FORBIDDEN** |
| AP-17 | Golden numerics comparison |
| AP-18 | Full release closure |
| Any Target-Standard-dependent module | Completion blocked |

**Allowed under CONDITIONAL_GO:** PLACEHOLDER / null shells only.

---

### BLK-S1-002 — JIS SOURCE GAP (34 rows)

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Owner | Governance / standards |
| External gate | DTR-03 |
| Unlock | Primary JIS sources dispositioned per P02 HOLD policy |

**Blocks or constrains:**

| AP-* | Effect |
|------|--------|
| AP-07 | Material adoption from unresolved JIS tables |
| AP-14 | Material-dependent numeric checks |
| AP-18 | Release closure |

---

### BLK-S1-004 — No auto numeric determination

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Owner | Apollo Superstructure / governance |
| Unlock | Numeric governance policy satisfied; no 道示 auto-fill |

**Blocks or constrains:**

| AP-* | Effect |
|------|--------|
| AP-05 | Auto dimensions from code |
| AP-06 | Auto deck/bearing numerics |
| AP-08 | Load generation from 道示 tables **FORBIDDEN** |
| AP-14 | Auto-filled check inputs |

**Allowed:** User-entered non-authoritative values; PLACEHOLDER in shells.

---

### BLK-S1-011 — Analyzer physical I/O UNKNOWN

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Owner | Frame Analysis Tool |
| Issue | LIM-P03-004 |
| Unlock | Physical I/O confirmed or explicitly waived for Phase 1 |

**Blocks or constrains:**

| AP-* | Effect |
|------|--------|
| AP-09 | Legacy Analyzer file parity claims **FORBIDDEN** |
| AP-18 | Full acceptance requiring Analyzer parity |

**Allowed:** Internal OSS solver path (`ProjectModel` / BFAD adapter) without parity claims.

---

### BLK-S1-012 — IF3 client binding missing

| Field | Value |
|-------|-------|
| Severity | MEDIUM (HIGH impact on export) |
| Owner | Frame Analysis Tool |
| Issue | LIM-P03-001 |
| Unlock | **AP-11** wires `if3` metadata in `apiClient.runAnalysis` |

**Blocks or constrains:**

| AP-* | Effect |
|------|--------|
| AP-10 | Authoritative export gated downstream |
| AP-11 | This PR **resolves** the blocker |
| AP-16 | Authoritative CSV/PDF export |

**Priority:** AP-11 is READY_PRIORITY under CONDITIONAL_GO.

---

## MEDIUM / LOW blockers (selected)

### BLK-S1-005 — Material governance traceability

| AP-* | Effect |
|------|--------|
| AP-06, AP-07 | ADOPTED materials require `decision_id` + `source_locator` |

### BLK-S1-010 — Composite/box scope leakage

| AP-* | Effect |
|------|--------|
| Apollo inputs | Reject composite/box at preflight |

### LIM-P03-003 — PRINT visual release

| AP-* | Effect |
|------|--------|
| AP-13, AP-16 | PRINT visual baseline claims blocked |

### LIM-P03-011 — Frame DRAFT NOGO

| AP-* | Effect |
|------|--------|
| AP-15 | Standard section drawings **DEFERRED** |

### OD8-04 — Drawing scope

| AP-* | Effect |
|------|--------|
| AP-15 | Arrangement preview only; production CAD deferred |

---

## Decision / policy blockers (non-BLK)

| ID | Topic | Blocks |
|----|-------|--------|
| DEC-S1-0004 | Target NOT_SELECTED | See BLK-S1-001 |
| DEC-S1-0011 | GOLDEN_NUMERICS: NOT_AUTHORIZED | AP-17 golden comparison |
| Handoff | DESIGN_FREEZE: NOT_READY | AP-14 numeric checks |
| Handoff | IMPLEMENTATION_START: NOT_AUTHORIZED | Global; superseded by CONDITIONAL_GO for listed AP-* |

---

## Matrix view (blocker × AP-*)

| Blocker | AP-00 | AP-01 | AP-02 | AP-03 | AP-04 | AP-05 | AP-06 | AP-07 | AP-08 | AP-09 | AP-10 | AP-11 | AP-12 | AP-13 | AP-14 | AP-15 | AP-16 | AP-17 | AP-18 |
|---------|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| BLK-S1-001 | | | | | C | | | **B** | **B** | | | | C | | **B** | | | C | **B** |
| BLK-S1-002 | | | | | | | | **B** | | | | | | | **B** | | | | **B** |
| BLK-S1-004 | | | | | | C | C | | **B** | | | | | | **B** | | | | |
| BLK-S1-011 | | | | | | | | | | C | | | | | | | | | **B** |
| BLK-S1-012 | | | | | | | | | | | C | **R** | | C | | | C | | |
| DEC-S1-0011 | | | | | | | | | | | | | | | | | | **B** | |

Legend: **B** = blocked (numeric/forbidden); **C** = conditional (shell only); **R** = resolving PR; empty = no direct blocker.

---

## External disposition trackers (reference)

| DTR | Topic | Unblocks |
|-----|-------|----------|
| DTR-01 | Target Standard selection | BLK-S1-001 |
| DTR-02 | Supporting manuals | Standards baseline |
| DTR-03 | JIS primary gaps | BLK-S1-002 |
| DTR-04 | Historical vs Target edition | CFL-001 traceability |

Full register: [blocker_register.csv](../../step1/04_gap_analysis/blocker_register.csv).
