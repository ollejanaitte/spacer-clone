# Decision Ledger — DS-00 / DS-01 / DS-02 / DS-03 / DS-04

**Authority:** DS-00 / DS-01 / DS-02 / DS-03 / DS-04 / CURRENT INTEGRATION
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
| Official naming strings (exact 道示 titles) | Closed at DS-01 → `ADOPTED_WITH_CONDITION` per DEC-DS01-0001 |
| Publication metadata (publisher, date, colophon/ISBN) | Closed at DS-01 → `ADOPTED_WITH_CONDITION` per DEC-DS01-0001 (LOCAL-I print ISBN blocked) |
| Edition verification (令和7年10月版 Ver.2.00 vs 改訂版) | Closed at DS-01 → `ADOPTED_WITH_CONDITION` per DEC-DS01-0001 |
| Errata / 正誤表 | Closed at DS-01 → `ADOPTED_WITH_CONDITION` per DEC-DS01-0001 |
| Applicable volumes/clauses per requirement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — open exact-evidence blocker; later applicable DS mapping (human visual confirmation) |

### Historical evidence preservation

- **Prior `NOT_SELECTED` preserved as `REFERENCE_ONLY` historical evidence** in:
  - [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) L17
  - [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md)
  - READY row column `target_standard_status=TARGET_STANDARD_NOT_SELECTED` in [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv)
- **Live integration:** DEC-DS00-0001 adopts Target Standard selection; handoff file bytes, Step 1 planning verdicts, AP-00 code guard enums, and `APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY` remain unchanged on disk.

### Remaining blockers (unchanged at DS-00)

| Facet | Status until DS stage |
|-------|----------------------|
| JIS identities (JIS-001…JIS-034 gap rows) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — classified at DS-02 per DEC-DS02-0001; zero identified |
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
| DTR-01 | Confirm binding 道示 edition under 令和7年改訂版 label | [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md) — **closed at DS-01** |
| DTR-02 | Supporting manual edition map | same |
| DTR-03 | JIS gap disposition (JIS-001…JIS-034 rows) | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) |
| DTR-04 | Historical APOLLO baseline vs Target | BLK-S1-007 |
| DTR-05 | Numeric freeze scope per READY topic | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) |
| DTR-06 | Errata / 正誤表 status for R7 volumes | [standards_source_inventory.md](../../step1/02_standards_baseline/standards_source_inventory.md) — **closed with condition at DS-01** |

DEC-DS00-0001 satisfies the **selection** intent of DTR-01 at label level only; evidentiary closure completed at DS-01 by DEC-DS01-0001.

---

## DEC-DS01-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS01-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Authored by** | Composer 2.5 (DS-01 documentation worker, supervisor-directed) |
| **Evidence reviewed by** | Codex (2026-07-27) |
| **Decision effect** | `ADOPTED` |

### Decision

Close DS-00 blocker facets for Target Standard metadata, edition/errata baseline, design philosophy framework, partial-factor method roles, and Phase 1 volume applicability. Record adopted reference baseline as **Ver2.00 plus 2026-03-31 official errata overlay** (checked 2026-07-27).

| Facet | DS-01 status | Conditions / remaining blockers |
|-------|--------------|----------------------------------|
| TARGET_STANDARD selection (令和7年改訂版) | `ADOPTED` | Application start 2026-04-01 recorded per MLIT official press release (報道発表資料) |
| Official naming strings and ISBNs (volumes I–V) | `ADOPTED_WITH_CONDITION` | Volume V title variance; e-book ISBN 801–805 on RBS rows only; LOCAL-I print ISBN blocked; LOCAL-II–V print ISBN 812-3/813-0/814-7/815-4 |
| Publication metadata and edition baseline | `ADOPTED_WITH_CONDITION` | Ver2.00 (2025-12-19); local image-export PDFs Ver2.00-compatible; 20260331 overlay separate |
| Errata / 正誤表 | `ADOPTED_WITH_CONDITION` | ERR-20251212 reflected in Ver2.00; ERR-20260331 active overlay; some entries not yet in electronic/paper |
| DESIGN_PHILOSOPHY (性能規定型設計) | `ADOPTED` | Hierarchy and deemed-to-satisfy rules in [performance_based_design_philosophy.md](../01_target_standard/performance_based_design_philosophy.md) |
| VERIFICATION_FORMAT method (部分係数法) | `ADOPTED` | Numeric factors and exact equations `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-04 / DS-05 |
| Phase 1 volume I | `ADOPTED_WITH_CONDITION` | Primary; clause map blocked |
| Phase 1 volume II | `ADOPTED_WITH_CONDITION` | Primary; clause map blocked |
| Phase 1 volume III | `ADOPTED_WITH_CONDITION` | Primary; clause map blocked |
| Phase 1 volume IV | `REFERENCE_ONLY` | Substructure body OUT_OF_SCOPE; interface evidence only |
| Phase 1 volume V (selected topics) | `ADOPTED_WITH_CONDITION` | Bearings/connections/unseating boundaries; title variance; clause map blocked |
| H29 道示 as numeric authority | `OUT_OF_SCOPE` | Legacy exclusion per DS-01 |
| Supporting manuals (R2 鋼便覧, H31 支承便覧, DDB) | `REFERENCE_ONLY` | Not co-equal with Target Standard |
| Clause/chapter mapping per requirement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Open exact-evidence blocker; later applicable DS mapping (human visual confirmation required) |

### DS-01 verdict tokens

```text
DS01_TARGET_STANDARD_VERDICT: PASS_WITH_CONDITION
DS01_EDITION_ERRATA_VERDICT: PASS_WITH_CONDITION
DS01_PERFORMANCE_BASED_DESIGN_VERDICT: PASS
DS01_PARTIAL_FACTOR_METHOD_VERDICT: PASS
DS01_PHASE1_APPLICABILITY_VERDICT: PASS_WITH_EVIDENCE_BLOCKERS
DS01_LEGACY_VERSION_EXCLUSION_VERDICT: PASS
DS01_COMPLETION_VERDICT: COMPLETE_WITH_EVIDENCE_BLOCKERS
```

### Rationale

User-supervisor direction closes DS-00 metadata facets at DS-01 using verified official evidence (MLIT press release PDF, JRA publication announcement, errata SHA256 anchors, verified JRA e-book product URLs, local licensed PDF checksums) while preserving fail-closed discipline for LOCAL-I print ISBN, image-export clause citations, numeric partial factors, and exact verification equations. Volume V title variance is recorded explicitly as `ADOPTED_WITH_CONDITION`.

### Evidence anchors

| Evidence | Locator | SHA256 / note |
|----------|---------|---------------|
| DS-01 evidence register | [ds01_evidence_register.md](../01_target_standard/ds01_evidence_register.md) | `EVD-DS01-001` … `EVD-DS01-014` |
| MLIT official press release | https://www.mlit.go.jp/report/press/content/001906067.pdf | `60ef4608873161151720ae8038b7d63b84ade064538f67e0169d04c5268049a8` |
| JRA publication announcement | https://e-book.road.or.jp/blogs/news/%E9%9B%BB%E5%AD%90%E7%89%88-%E9%81%93%E8%B7%AF%E6%A9%8B%E7%A4%BA%E6%96%B9%E6%9B%B8-%E5%90%8C%E8%A7%A3%E8%AA%AC-%E4%BB%A4%E5%92%8C%EF%BC%97%E5%B9%B4%E6%94%B9%E8%A8%82%E7%89%88-%E3%82%92%EF%BC%91%EF%BC%91%E6%9C%88%EF%BC%95%E6%97%A5%E3%81%AB%E7%99%BA%E5%88%8A%E3%81%97%E3%81%BE%E3%81%99 | URL verified 2026-07-27 |
| Errata 20251212 | https://www.road.or.jp/img/books/corrigenda/pdf/20251212.pdf | `50c3a1f0ef2b05251d4791c426ac333a5e3d0bc5496995682766069f4ed23c7f` |
| Errata 20260331 | https://www.road.or.jp/img/books/corrigenda/pdf/20260331.pdf | `22b8767d46041f5521820736419e5425a4d501f2698aec1cc6553f684809b4e5` |
| Edition register | [edition_and_errata_register.csv](../01_target_standard/edition_and_errata_register.csv) | — |
| DS-01 freeze document | [target_standard_freeze.md](../01_target_standard/target_standard_freeze.md) | — |
| Repository baseline | `f56b520a451f95bc67d544b04a5153d0439f8193` | DS-01 authoring baseline |

### DTR disposition at DS-01

| Ref | Topic | DS-01 disposition |
|-----|-------|-------------------|
| DTR-01 | Binding 道示 edition under 令和7年改訂版 label | **Closed** — Ver2.00 + 20260331 overlay |
| DTR-06 | Errata / 正誤表 status for R7 volumes | **Closed with condition** — overlay model recorded |

DTR-02, DTR-04, DTR-05 remain open for DS-02+.

---

## DEC-DS02-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS02-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Authored by** | Composer 2.5 (DS-02 documentation worker, supervisor-directed) |
| **Evidence reviewed by** | Codex — final approved 2026-07-27 after Grok 4.5 independent re-audit |
| **Decision effect** | `ADOPTED` — applies only to the 34-row blocked classification and JIS version policy; no JIS identity or numeric value adopted |

### Decision

Classify all 34 historical JIS SOURCE GAP placeholder rows (JIS-001…JIS-034) from immutable handoff [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) into governed [jis_source_register.csv](../02_jis/jis_source_register.csv). Record honest fail-closed disposition: every row `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`; zero JIS identities resolved; no automatic newest-version JIS adoption.

| Facet | DS-02 status | Conditions / remaining blockers |
|-------|--------------|----------------------------------|
| Gap row count (34 placeholders) | `PASS_AS_HISTORICAL_PLACEHOLDER_COUNT` | Matches immutable handoff SHA256 `6172927555afe28f442d6ea94c938452bceedfa6809d62d09d6e83f2afdb98fd` |
| JIS identity per row | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | All `jis_number`/`jis_title` blank; historical rows undifferentiated |
| JIS edition per row | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Cited edition not confirmed |
| Primary-standard citation locators | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | All `citing_*` fields blank |
| Equivalence / replacement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | No supervisor equivalence decisions |
| Applicability / material scope | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Per-row acceptance blocker conditions stored in register `applicability` column; future material/product/test scope must populate `material_or_product` (or a schema split / `notes` field) — must not overwrite blocker conditions without explicit schema change |
| Licensed JIS primary source | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Owner EXTERNAL_JIS_RESEARCH; no 道示/DDB substitution |
| JIS version policy | `ADOPTED` | [jis_version_policy.md](../02_jis/jis_version_policy.md) — forbids automatic newest-version adoption |
| Clause/chapter mapping per requirement | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (unchanged) | Open exact-evidence blocker; later applicable DS mapping (human visual confirmation) — **out of DS-02 scope** |

### DS-02 verdict tokens

```text
DS02_GAP_COUNT_VERDICT: PASS_AS_HISTORICAL_PLACEHOLDER_COUNT
DS02_JIS_IDENTITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_JIS_EDITION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_CITATION_RELATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_EQUIVALENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_APPLICABILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_SOURCE_GAP_RESOLUTION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS02_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

### Rationale

User-supervisor direction requires DS-02 to disposition JIS gaps without inventing standard identities. Historical handoff rows share identical unresolved `UNKNOWN` fields and empty `requirement_id` — they are placeholder slots, not evidence of 34 distinct JIS standards. DS-02 creates the governed register, version policy, and gap resolution report; classifies every row; and records exact evidence blockers. No row is marked resolved.

### Evidence anchors

| Evidence | Locator | SHA256 / note |
|----------|---------|---------------|
| Immutable handoff gap CSV | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) | `6172927555afe28f442d6ea94c938452bceedfa6809d62d09d6e83f2afdb98fd` |
| DS-02 JIS register | [jis_source_register.csv](../02_jis/jis_source_register.csv) | `4b5be44b10fba67a660a34b6c535b4cbf38cd72401cfdd94ef83bd34aaf59e1c` |
| DS-02 gap report | [jis_gap_resolution_report.md](../02_jis/jis_gap_resolution_report.md) | — |
| DS-02 version policy | [jis_version_policy.md](../02_jis/jis_version_policy.md) | — |
| DS-01 edition baseline | [edition_and_errata_register.csv](../01_target_standard/edition_and_errata_register.csv) | Ver2.00 + 20260331 overlay |
| Repository baseline | `128c0cb724270f59ada88b45a11bc1b264a57be4` | DS-02 authoring baseline |

### DTR disposition at DS-02

| Ref | Topic | DS-02 disposition |
|-----|-------|-------------------|
| DTR-03 | JIS gap disposition (JIS-001…JIS-034 rows) | **Classified with evidence blockers** — register created; identities unresolved |

DTR-02, DTR-04, DTR-05 remain open for later DS stages.

---

## DEC-DS03-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS03-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Authored by** | Composer 2.5 (DS-03 documentation worker, supervisor-directed) |
| **Decision effect** | `ADOPTED` — applies only to material property register, applicability matrix, source hierarchy, and E–G–ν consistency policy; **no material numeric value adopted** |

### Decision

Establish governed DS-03 material properties freeze for Phase 1 archetype (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear). Record fail-closed disposition: all numeric material property rows `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` with blank `value` and blank `unit`; zero JIS identities inferred beyond DS-02; RBS/handoff/schema evidence `REFERENCE_ONLY` for numerics.

| Facet | DS-03 status | Conditions / remaining blockers |
|-------|--------------|----------------------------------|
| Material properties register (44 rows) | `ADOPTED` | Register structure and classification only |
| Applicability matrix (18 groups) | `ADOPTED` | Phase 1A/1B mapping recorded |
| Steel properties (E, G, ν, γ, strengths, grade, thickness) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS + 道示 II chain; BLK-S1-002; BLK-S1-005 |
| RC deck concrete properties | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 道示 III clause map blocked; human visual confirmation |
| Reinforcing steel properties | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS rebar identity blocked per DS-02 |
| High-strength bolt properties | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS + 道示 II/V; handoff splice_bolt memos location-only |
| Welding material matching | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS welding standards + base metal grade |
| Bearing boundary materials | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 道示 V boundary topics; clause map blocked |
| Corrosion / protection | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 道示 I/II durability/coating locators blocked |
| Creep / shrinkage (static linear Phase 1) | Phase 1A matrix `NOT_APPLICABLE`; register `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` pending DS-05 applicability |
| Weld toughness (`MAT-DS03-033`) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` pending DS-05 applicability and R7/JIS evidence |
| Fatigue / composite connector materials | `OUT_OF_SCOPE` | Phase 1 archetype exclusion |
| R2 鋼便覧 / DDB / schema_draft.json | `REFERENCE_ONLY` | Not numeric authority |
| JIS chain (JIS-001…JIS-034) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Unchanged from DEC-DS02-0001 |
| Adopted sourced material numerics | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Count = 0 at DS-03 |
| Resistance partial factors on materials | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 — separately gated from DS-03 source adoption |
| Full design freeze | `OUT_OF_SCOPE` for DS-03 | DS-09 gate |

### DS-03 verdict tokens

```text
DS03_MATERIAL_COVERAGE_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_VALUE_SOURCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS03_UNIT_VERDICT: PASS_FOR_GOVERNANCE_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_APPLICABILITY_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS03_INTERNAL_CONSISTENCY_VERDICT: PASS
DS03_UNSOURCED_NUMERICS_VERDICT: PASS
DS03_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

### Rationale

User-supervisor direction requires DS-03 to classify Phase 1 material property requirements without inventing JIS identities, edition-specific clause locators, or numeric constants. DS-03 creates the register, applicability matrix, and source report; records exact evidence packages per material category; and preserves fail-closed discipline from BLK-S1-005 and DEC-DS02-0001. No row receives an adopted numeric value at DS-03.

### Evidence anchors

| Evidence | Locator | SHA256 / note |
|----------|---------|---------------|
| DS-03 material register | [material_properties_register.csv](../03_materials/material_properties_register.csv) | 44 rows; 0 non-empty value |
| DS-03 applicability matrix | [material_applicability_matrix.csv](../03_materials/material_applicability_matrix.csv) | 18 groups |
| DS-03 source report | [material_source_report.md](../03_materials/material_source_report.md) | — |
| DS-02 JIS register | [jis_source_register.csv](../02_jis/jis_source_register.csv) | All rows blocked |
| DS-01 edition baseline | [edition_and_errata_register.csv](../01_target_standard/edition_and_errata_register.csv) | Ver2.00 + 20260331 overlay |
| Immutable handoff gap CSV | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) | `6172927555afe28f442d6ea94c938452bceedfa6809d62d09d6e83f2afdb98fd` |
| Repository baseline | `9b86881396e806f51d815a4b3308c09bd2d73bc6` | DS-03 authoring baseline |

### DTR disposition at DS-03

| Ref | Topic | DS-03 disposition |
|-----|-------|-------------------|
| DTR-05 | Numeric freeze scope per READY topic | **Material register created** — material numerics remain blocked; loads still DS-04 |
| BLK-S1-005 | Material property adoption | **Register established** — adoption forbidden until per-row JIS + 道示 chain |

DTR-02, DTR-04 remain open. DTR-03 disposition unchanged from DS-02.

---

## DEC-DS04-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS04-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Authored by** | Composer 2.5 (DS-04 documentation worker, supervisor-directed) |
| **Decision effect** | `ADOPTED` — applies only to load model, load-side factor, combination, and simultaneity register structure and classification; **no load numeric value adopted** |

### Decision

Establish governed DS-04 loads / factors / combinations freeze for Phase 1 archetype (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear). Record fail-closed disposition: all load-side numeric fields blank; zero R7 load clause/table locators visually confirmed; RBS/handoff evidence `REFERENCE_ONLY` for numerics and model identities.

| Facet | DS-04 status | Conditions / remaining blockers |
|-------|--------------|----------------------------------|
| Load model register (14 rows) | `ADOPTED` | Register structure and classification only; `phase1_status` exact enum + separate `adoption_status` |
| Load factor register (10 rows) | `ADOPTED` | One candidate shell per physical load + one impact adjustment; all `factor_value` blank; `design_situation_unspecified` / `limit_state_unspecified` |
| Load combination register (1 shell row) | `ADOPTED` | Generic blocked shell; no `component_load_id` or `coefficient` at DS-04 |
| Simultaneity/exclusivity rules (5 rule-class shells) | `ADOPTED` | No load-pair assumptions; all coefficients blocked |
| Structural self-weight / RC deck dead | `PHASE1_REQUIRED` phase1_status | `adoption_status` blocked — DS-03 unit-weight chain + DS-06 I/O |
| Live load model | `PHASE1_REQUIRED` phase1_status | Model identity and magnitudes `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| Dynamic/impact adjustment | `REFERENCE_ONLY` phase1_status (LM-DS04-007 pointer) | Sole numeric owner LF-DS04-010 on LM-DS04-006; double application forbidden |
| Temperature / wind / support movement | `PHASE1_OPTIONAL` phase1_status | Evidence-gated — static linear does not exclude |
| Construction-stage taxonomy | `FUTURE_PHASE` phase1_status | Distinct from erection-stage `OUT_OF_SCOPE` |
| Seismic / fatigue / erection-stage analysis | `OUT_OF_SCOPE` phase1_status | Phase 1 archetype exclusion |
| Load-side partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | All LF rows blocked |
| Combination coefficients | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | All COMB rows blocked |
| Simultaneity / exclusivity / favorability | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | All SX rows blocked |
| Sign / max-min / zero-inclusion policies | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-06 sign mapping also blocked (BLK-S1-011) |
| Resistance partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-05 — separately gated |
| Adopted sourced load numerics | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Count = 0 at DS-04 |
| Full design freeze | `OUT_OF_SCOPE` for DS-04 | DS-09 gate |

### DS-04 verdict tokens

```text
DS04_LOAD_MODEL_VERDICT: PASS_WITH_EXACT_EVIDENCE_BLOCKERS
DS04_LOAD_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_COMBINATION_FACTOR_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIMULTANEITY_EXCLUSIVITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_SIGN_RULE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_PERFORMANCE_TRACEABILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS04_UNSOURCED_NUMERICS_VERDICT: PASS
DS04_COMPLETION_VERDICT: COMPLETE_WITH_EXACT_EVIDENCE_BLOCKERS
```

### Rationale

User-supervisor direction requires DS-04 to classify Phase 1 load requirements without inventing live-load model identities, magnitudes, impact/dynamic factors, load factors, combination coefficients, simultaneity rules, or favorable/unfavorable provisions. DS-04 creates the registers, taxonomy, fail-closed policies, and evidence packages; preserves fail-closed discipline from BLK-S1-004 and DEC-DS01-0001 partial-factor method. No row receives an adopted numeric value at DS-04. Post-audit correction: `phase1_status`/`adoption_status` separated; dynamic/impact single ownership via LF-DS04-010; generic combination and rule-class shells only; DS-05 resistance mapping blocks performance traceability.

### Evidence anchors

| Evidence | Locator | SHA256 / note |
|----------|---------|---------------|
| DS-04 load model register | [load_model_register.csv](../04_loads/load_model_register.csv) | 14 rows; 0 non-empty numerics |
| DS-04 load factor register | [load_factor_register.csv](../04_loads/load_factor_register.csv) | 10 rows; 0 non-empty factor_value |
| DS-04 combination register | [load_combination_register.csv](../04_loads/load_combination_register.csv) | 1 shell row; no component_load_id or coefficient |
| DS-04 simultaneity rules | [simultaneity_and_exclusivity_rules.csv](../04_loads/simultaneity_and_exclusivity_rules.csv) | 5 rule-class shells |
| DS-04 governance report | [load_governance_report.md](../04_loads/load_governance_report.md) | — |
| DS-03 material register | [material_properties_register.csv](../03_materials/material_properties_register.csv) | Unit weights for dead loads — not factors |
| DS-01 edition baseline | [edition_and_errata_register.csv](../01_target_standard/edition_and_errata_register.csv) | Ver2.00 + 20260331 overlay |
| Handoff READY RDY-002/003 | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) | Location memos only |
| Repository baseline | `c89d2cecf0877334668b9cea109121887c206896` | DS-04 authoring baseline |

### DTR disposition at DS-04

| Ref | Topic | DS-04 disposition |
|-----|-------|-------------------|
| DTR-05 | Numeric freeze scope per READY topic | **Load registers created** — load numerics remain blocked; resistance factors still DS-05 |
| BLK-S1-004 | Numeric auto-determination | **Registers established** — adoption forbidden until per-row 道示 chain |

DTR-02, DTR-04 remain open. JIS identities (DTR-03) unchanged from DS-02. Material numerics (DS-03) unchanged.

---

## DEC-DS05-0001

| Field | Value |
|-------|-------|
| **ID** | DEC-DS05-0001 |
| **Date** | 2026-07-27 |
| **Decider** | User-supervisor |
| **Authored by** | Composer 2.5 (DS-05 documentation worker, supervisor-directed) |
| **Decision effect** | `ADOPTED` — applies only to performance requirement, limit state, verification equation, limit value, and deemed-to-satisfy register structure and classification; **no verification numeric value or equation adopted** |

### Decision

Establish governed DS-05 performance verification / limit state freeze for Phase 1 archetype (straight, constant-depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear). Record fail-closed disposition: all verification equation forms, resistance partial factors, limit numerics, deemed-to-satisfy rules, and comparison rules blocked; zero R7 verification clause/table locators visually confirmed; RBS/handoff evidence `REFERENCE_ONLY` for equations and numerics. Separate Phase 1A static-linear analysis from Phase 1B design verification — analysis response availability does not authorize a check.

| Facet | DS-05 status | Conditions / remaining blockers |
|-------|--------------|----------------------------------|
| Performance requirement register (28 rows) | `ADOPTED` | Register structure and classification only |
| Limit state register (23 rows) | `ADOPTED` | Coverage linked to requirements; all adoption blocked |
| Verification equation register (23 rows) | `ADOPTED` | All `equation_summary` and `comparison_rule` blank; zero numerics |
| Limit value register (11 rows) | `ADOPTED` | All `limit_value`, `unit`, and `comparison_rule` blank |
| Deemed-to-satisfy register (2 shells) | `ADOPTED` | Generic blocked shells — no invented prerequisites |
| Main girder verification candidates | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | User formal DS-05 primary structure vs Step1 narrow boundary conflict unresolved (PKG-SCOPE-P1B) |
| Cross girder / sway / lateral bracing candidates | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Pending supervisor Phase1B member table — not split by Step1 roadmap alone |
| RC deck verification candidates | `PHASE1_REQUIRED` | Phase 1B shell within narrow scope — adoption blocked |
| Bearing / connection boundary candidates | `PHASE1_REFERENCE` | Boundary-only reference posture — adoption blocked |
| Fatigue / seismic / composite / nonlinear / erection | `OUT_OF_SCOPE` | Phase 1 archetype exclusion |
| Resistance partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Plain blocked token only; zero adopted numerics; no orphan resistance-factor register IDs |
| Verification equations / comparison rules | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | PKG-R7-V |
| Limit values | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | PKG-R7-V |
| Response-to-check conversion | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-06 PKG-DS06 |
| Double factor application | `ADOPTED` policy | Prohibited unless evidenced R7 structure |
| Allowable-stress substitution | `OUT_OF_SCOPE` | Performance-based partial-factor method only |
| Adopted sourced verification numerics | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Count = 0 at DS-05 |
| Full design freeze | `OUT_OF_SCOPE` for DS-05 | DS-09 gate |

### DS-05 verdict tokens

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

### Rationale

User-supervisor direction requires DS-05 to classify Phase 1 performance verification requirements without inventing R7 equation forms, resistance factors, limit values, deemed-to-satisfy rules, or comparison operators. DS-05 creates the registers, Phase 1A/1B separation policy, evidence packages, and scope-conflict record; preserves fail-closed discipline from DEC-DS01-0001 partial-factor method and DEC-DS04-0001 load-side deferral. No row receives an adopted numeric value or normative equation at DS-05. User formal DS-05 primary structure vs Step1 `FROZEN_NARROW` boundary is **not** silently resolved — PKG-SCOPE-P1B remains open. `ready_requirements.csv` has no phase column.

### Evidence anchors

| Evidence | Locator | SHA256 / note |
|----------|---------|---------------|
| DS-05 performance register | [performance_requirement_register.csv](../05_verification/performance_requirement_register.csv) | 28 rows |
| DS-05 limit state register | [limit_state_register.csv](../05_verification/limit_state_register.csv) | 23 rows |
| DS-05 verification register | [verification_equation_register.csv](../05_verification/verification_equation_register.csv) | 23 rows; 0 equation numerics |
| DS-05 limit value register | [limit_value_register.csv](../05_verification/limit_value_register.csv) | 11 rows; 0 limit numerics |
| DS-05 deemed-to-satisfy register | [deemed_to_satisfy_register.csv](../05_verification/deemed_to_satisfy_register.csv) | 2 shell rows |
| DS-05 scope report | [phase1_verification_scope.md](../05_verification/phase1_verification_scope.md) | — |
| DS-04 load registers | [load_governance_report.md](../04_loads/load_governance_report.md) | Load-side chain — not resistance |
| DS-03 material register | [material_properties_register.csv](../03_materials/material_properties_register.csv) | Resistance input chain blocked |
| DS-01 edition baseline | [edition_and_errata_register.csv](../01_target_standard/edition_and_errata_register.csv) | Ver2.00 + 20260331 overlay |
| Handoff READY girder/splice/bracing rows | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) | Location memos only; no phase column; scope conflict unresolved |
| Step1 scope freeze | [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) | DEC-S1-0008 FROZEN_NARROW |
| Repository baseline | `274a2f20bd794f396d9ed09741b26974374a84e4` | DS-05 authoring baseline |

### DTR disposition at DS-05

| Ref | Topic | DS-05 disposition |
|-----|-------|-------------------|
| DTR-05 | Numeric freeze scope per READY topic | **Verification registers created** — verification numerics remain blocked; DS-06 response mapping still blocked |
| BLK-S1-004 | Numeric auto-determination | **Registers established** — adoption forbidden until per-row 道示 chain |

DTR-02, DTR-04 remain open. JIS identities (DTR-03) unchanged from DS-02. Load numerics (DS-04) and material numerics (DS-03) unchanged.
