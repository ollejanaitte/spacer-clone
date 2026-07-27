# Design Standard Scope — DS-00

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Repository baseline:** `e323386bbe788687193bbc4fa0a643b1f5e65119`

## Purpose

Define what DS-00 governs, what it defers to later DS stages, and the **Phase 1 bridge archetype** boundaries that constrain design-standard applicability. DS-00 does not authorize numeric adoption or full design freeze.

---

## DS-00 IN scope

| Area | DS-00 deliverable | Adoption posture |
|------|-------------------|------------------|
| Integration authority declaration | `docs/apollo/design-standards/` as single current path | `ADOPTED` |
| Target Standard selection | 道路橋示方書・同解説 令和7年改訂版 per DEC-DS00-0001 | `ADOPTED` |
| Design philosophy | 性能規定型設計 | `ADOPTED` |
| Verification format (method) | 部分係数法 | `ADOPTED` |
| Source priority and historical preservation | [source_priority_policy.md](source_priority_policy.md) | `ADOPTED` |
| Adoption status vocabulary | [adoption_status_model.md](adoption_status_model.md) | `ADOPTED` |
| Copyright and evidence rules | [copyright_and_evidence_policy.md](copyright_and_evidence_policy.md) | `ADOPTED` |
| Evidence integrity anchors | [ds00_evidence_baseline.md](ds00_evidence_baseline.md) | `ADOPTED` |
| Blocker register with evidence requirements | [ds00_evidence_baseline.md#blocker-evidence-matrix](ds00_evidence_baseline.md#blocker-evidence-matrix) | `ADOPTED` |
| Phase 1 archetype boundary (by reference) | Frozen narrow scope per [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) | `REFERENCE_ONLY` |

---

## DS-00 OUT of scope (deferred to DS-01+)

| Area | Status | Unlock stage |
|------|--------|--------------|
| Official naming strings (exact 道示 titles) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 |
| Publication metadata (publisher, date, ISBN/colophon) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 |
| Edition verification (令和7年10月版 Ver.2.00 vs 改訂版 label) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 |
| Errata / 正誤表 status | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 |
| Volume/clause mapping per requirement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 / DS-02 |
| JIS identity resolution (34 SOURCE GAP rows) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-02 |
| Numeric partial factors and other design numerics | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 (loads) / DS-05 (resistance/verification) |
| DS-05 member applicability classification | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Analyzer physical I/O evidence | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-06 (BLK-S1-011) |
| Supporting manual edition map (R2 鋼便覧, H31 支承便覧, DDB) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-02 |
| Full design freeze (`APOLLO_FULL_DESIGN_FREEZE_VERDICT`) | `OUT_OF_SCOPE` for DS-00 | DS-09 gate |
| Production code, tests, schema numerics | `OUT_OF_SCOPE` | AP-* under [ap00](../../ap00/README.md) |

---

## Phase 1 bridge archetype — primary structure (IN)

Historical Step 1 planning evidence: [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) (DEC-S1-0008, `FROZEN_NARROW`, `REFERENCE_ONLY`). The primary/OUT tables below and the DS-05/DS-06 classifications in this document govern current design-standard applicability.

| Dimension | Phase 1 (IN) |
|-----------|--------------|
| Alignment | Straight bridge (直橋) |
| Girder depth | Equal depth (等桁高) |
| Deck / girder system | Non-composite RC deck on steel plate girder (非合成RC床版鋼鈑桁) |
| Span system | Simple span, single span (単純1径間) |
| Skew | 90° (直角) |
| Main girders | About 4–6 main girders |
| Analysis | Static linear (静的線形) |

### Planning reference counts (Rank-1 aggregate only)

| Artifact | Count | Source |
|----------|-------|--------|
| READY rows (Rank-1 handoff aggregate) | 69 | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) |
| Features PHASE1_REQUIRED | 101 | [phase1_feature_set.csv](../../step1/05_scope_boundary/phase1_feature_set.csv) |
| Features PHASE1_SUPPORTING | 13 | same |

Per-volume READY splits are **not** verified at DS-00 and must not be used as adoption evidence.

---

## Phase 1 bridge archetype — explicit OUT

The following are **explicitly OUT** of Phase 1 archetype scope:

| Category | Disposition |
|----------|-------------|
| Continuous girders | `OUT_OF_SCOPE` |
| Multi-span | `OUT_OF_SCOPE` |
| Curved alignment | `OUT_OF_SCOPE` |
| Skewed bridges (non–90° skew) | `OUT_OF_SCOPE` |
| Variable section | `OUT_OF_SCOPE` |
| Composite action | `OUT_OF_SCOPE` |
| Box girder | `OUT_OF_SCOPE` |
| Steel deck | `OUT_OF_SCOPE` |
| PC bridge | `OUT_OF_SCOPE` |
| Seismic design | `OUT_OF_SCOPE` |
| Fatigue checks | `OUT_OF_SCOPE` |
| Erection-stage analysis | `OUT_OF_SCOPE` |
| Nonlinear analysis | `OUT_OF_SCOPE` |
| Substructure body design | `OUT_OF_SCOPE` |
| Checks not explicitly adopted in Phase 1 | `OUT_OF_SCOPE` |

Legacy desktop parity (`.mdb`, `.alg`, MS-Word RTF, AutoCAD `.gsp`, y-Mater NPDATA), CAD drawing parity (SuperDrawing production drawings), and other product exclusions not listed above are governed by Step 1 planning artifacts and are not restated here.

---

## DS-05 applicability — not automatically OUT

The following are **not** automatically OUT of Phase 1. Their exact DS-05 applicability classification remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-05:

| Topic | DS-00 status | Unlock |
|-------|--------------|--------|
| Member detailed design | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Cross girders | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Sway / lateral bracing | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| RC slab | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Bearing boundary | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |
| Connection boundary | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 |

---

## DS-06 — Analyzer physical I/O (mandatory, not OUT)

Analyzer physical I/O is **not** OUT of Phase 1. It is a mandatory DS-06 deliverable and remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` at DS-00 pending BLK-S1-011 evidence acquisition and acceptance requirements. See [ds00_evidence_baseline.md#blk-s1-011](ds00_evidence_baseline.md#blk-s1-011).

---

## Standards applicability within Phase 1 IN scope

| Standard family | Phase 1 applicability | DS-00 status |
|-----------------|----------------------|--------------|
| 道路橋示方書・同解説 Volume I | Applicability unverified | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| 道路橋示方書・同解説 Volume II | Applicability unverified | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| 道路橋示方書・同解説 Volume III | Applicability unverified | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| 道路橋示方書・同解説 Volume IV | Applicability unverified | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| 道路橋示方書・同解説 Volume V | Applicability unverified | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-01 |
| JIS product standards (JIS-001…JIS-034 gap rows) | Family/product identity unresolved in historical source | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-02 |
| R2 鋼便覧 / H31 支承便覧 / DDB | Supporting reference | `REFERENCE_ONLY` |
| H29-era alignment examples in local PDF inventory | Historical research input | `REFERENCE_ONLY` |

DS-00 does **not** assert unsupported official volume subtitles or per-volume READY row counts.

---

## Change control

Amendments to DS-00 scope require a new `DEC-DS00-xxxx` entry in [decision_ledger.md](decision_ledger.md). Phase 1 archetype expansion requires `DEC-S1-xxxx` per [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) — DS-00 does not amend Step 1 freeze documents.
