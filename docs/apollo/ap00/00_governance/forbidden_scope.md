# Forbidden Scope — Implementation Phase 1

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Sources:** [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md), [step1_verdicts.md](../../step1/final/step1_verdicts.md), [completion_gate.md](../../step1/08_roadmap/completion_gate.md)

Items below are **forbidden** in implementation PRs until explicit unblock via decision log entry and supervisor approval. Violations require PR rejection.

---

## 1. Out-of-Phase-1 scope (Phase 1外)

Per DEC-S1-0008 narrow archetype freeze, the following MUST be rejected at preflight or flagged `OUT_OF_PHASE1`:

| Category | Examples | System response |
|----------|----------|-----------------|
| Continuous / multi-span | Interior supports, continuity effects | `UNSUPPORTED: OUT_OF_PHASE1` |
| Curved / skew | Spiral alignment, skew ≠ 90° | `UNSUPPORTED: OUT_OF_PHASE1` |
| Composite / alternate decks | Composite action, steel deck, PC slab | `UNSUPPORTED: OUT_OF_PHASE1` |
| Box girder / detailed member design | Girder, Section, Splice programs | `LATER_PHASE` / `OUT_OF_PHASE1` |
| Bracing / stiffener design | Sway/lateral bracing, stiffeners | `OUT_OF_PHASE1` |
| Seismic / dynamic / fatigue | Eigen, RS, TH, fatigue checks | `OUT_OF_PHASE1` |
| Legacy desktop parity | `.mdb`, `.alg`, MS-Word RTF, AutoCAD `.gsp`, y-Mater NPDATA | `OUT_OF_PRODUCT_SCOPE` |
| CAD production drawings | SuperDrawing authoritative output | `LATER_PHASE` |

Catalog `Phase1_required` labels that conflict with narrow scope are **subordinate** to P04 disposition (CFL-003).

---

## 2. Target Standard numerics

| Rule | Blocker | Impact |
|------|---------|--------|
| Target Standard is **NOT_SELECTED** (DEC-S1-0004) | BLK-S1-001 | No binding load factors, code limits, or standard-dependent constants |
| No auto numeric determination from 道示 / example PDFs | BLK-S1-004 | No auto-fill of dimensions, loads, or factors |
| Material constants require `source_locator` + `decision_id` | BLK-S1-005, BLK-S1-006 | ADOPTED without governance metadata → fail-closed |

**Forbidden:** Any PR that commits ADOPTED numerics, live-load magnitudes, material yield/strength tables, or design-check PASS claims dependent on Target Standard.

**Allowed:** PLACEHOLDER, null, or user-entered **non-authoritative** values in geometry/material/load **shells** (AP-04..AP-08 scaffolding).

---

## 3. JIS source gaps

| Rule | Blocker | Impact |
|------|---------|--------|
| 34 JIS SOURCE GAP rows open | BLK-S1-002 | Material adoption from unresolved JIS tables forbidden |
| HOLD policy | P02 governance | No 道示/DDB substitution for missing primaries |

**Forbidden:** AP-07 ADOPTED material properties; AP-14 numeric checks referencing unresolved JIS sources.

---

## 4. Golden values and Reference Bridge production fixtures

| Rule | Source | Impact |
|------|--------|--------|
| `GOLDEN_NUMERICS: NOT_AUTHORIZED` | DEC-S1-0011 | No golden expected values in tests or fixtures |
| RB-P1-001 draft is planning-only | P08 | `reference_bridge_input.json` PLACEHOLDER fields must not become production fixture |
| AP-17 | CONDITIONAL_NO_GOLDEN | Integration harness semantic-only; no numeric comparison |

**Forbidden:** Committing RB-P1-001 as authoritative production test fixture; golden PDF/JSON expected values; false PASS on PLACEHOLDER inputs.

---

## 5. Analyzer parity

| Rule | Blocker | Impact |
|------|---------|--------|
| Physical Analyzer I/O **UNKNOWN** | BLK-S1-011 | No legacy `.mdb`/`.alg` round-trip claims |
| Internal solver path only for Phase 1 | P05 ASM-P1-007 | AP-09 may use OSS `ProjectModel` / BFAD adapter |

**Forbidden:** PRs claiming Analyzer file compatibility, legacy SuperDesigner wire format parity, or requiring unresolved Analyzer I/O for Phase 1 acceptance.

**Allowed:** Internal static linear solver path with explicit "no Analyzer parity" labeling.

---

## 6. IF3 and authoritative export

| Rule | Blocker | Impact |
|------|---------|--------|
| Missing `if3` client metadata | BLK-S1-012, LIM-P03-001 | Authoritative CSV/PDF/result export blocked |
| Export authority matrix | P07 | STALE / UNBOUND → fail-closed |

**Forbidden:** Merging export-gate bypass; `canExportAuthoritative` true without binding complete (except AP-11 fix scope).

**Allowed:** AP-11 wiring of `apiClient.runAnalysis` `if3` metadata — explicit unblock path.

---

## 7. Design freeze and release

| Rule | Source | Impact |
|------|--------|--------|
| Design freeze **NOT_READY** (handoff) | APOLLO_FULL_DESIGN_FREEZE_VERDICT | No code-check numerics (AP-14) |
| AP-18 deferred | P09 | No Phase 1 release closure without HIGH blocker disposition |
| Implementation start (handoff) | NOT_AUTHORIZED | Step 1 package verdict unchanged |

**Forbidden:** AP-18 merge; authoritative design-check PASS; feature-flag default **on** without supervisor sign-off.

---

## 8. Repository and process forbidden operations

Per `AGENTS.md` and AP-00 branch rules:

| Forbidden operation | Rationale |
|--------------------|-----------|
| `git add -A` / `git add .` | Explicit-path staging only |
| `git clean`, `git reset --hard`, force push | Destructive ops banned |
| Modifying `docs/apollo/step1/**` | Step 1 frozen |
| Modifying `docs/apollo/handoffs/**` | Handoff immutable |
| Stacked PRs (branch on unmerged branch) | One PR one responsibility |
| Committing secrets, `.env`, credentials | Security |

---

## 9. Quick reference — forbidden by AP-*

| AP-* | Forbidden specifically |
|------|------------------------|
| AP-07 | ADOPTED material constants, JIS table values |
| AP-08 | Adopted load magnitudes; auto-generation from 道示 |
| AP-09 | Analyzer file parity claims |
| AP-14 | 道示-compliant slab/girder numeric checks; false PASS |
| AP-17 | Golden expected values; RB-P1-001 production fixture |
| AP-18 | Release without blocker disposition |

Full authorization: [implementation_authorization_matrix.md](implementation_authorization_matrix.md).
