# Decision Ledger — DS-00 / DS-01 / DS-02

**Authority:** DS-00 / DS-01 / DS-02 / CURRENT INTEGRATION
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
