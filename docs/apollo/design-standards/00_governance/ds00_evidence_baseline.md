# DS-00 Evidence Baseline

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27

## Repository preflight

```text
DS00_REPOSITORY_PREFLIGHT_VERDICT: PASS
```

| Check | Result | Evidence |
|-------|--------|----------|
| Repository baseline commit | `e323386bbe788687193bbc4fa0a643b1f5e65119` | `git rev-parse HEAD` at DS-00 authoring |
| Handoff package present | PASS | [APOLLO-FRAME-HANDOFF-20260726-001](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) |
| Step 1 standards baseline present | PASS | [02_standards_baseline](../../step1/02_standards_baseline/) |
| AP-00 scope/numeric guards present | PASS | [ap00/02_scope_guards](../../ap00/02_scope_guards/) |
| Pre-existing DS-00 tree | Absent (expected) | DS-00 creates `design-standards/` |

---

## Integrity anchors

| Artifact | Path | Rows / notes | SHA256 |
|----------|------|--------------|--------|
| Repository baseline | `e323386bbe788687193bbc4fa0a643b1f5e65119` | HEAD at DS-00 | — |
| JIS gap primary CSV | [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) | **34 data rows** (JIS-001…JIS-034); historical source records unresolved family/product identity per row | `6172927555afe28f442d6ea94c938452bceedfa6809d62d09d6e83f2afdb98fd` |
| READY requirements (Rank-1 aggregate) | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) | **69 data rows** | — |
| PACKAGE_INFO | [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) | Frozen bucket counts | `44af9c84b5ce9646a5c207d5e432a261b5590ecc5ea8f6a5dd79d61ea993a6b3` |
| Target standard decision (historical) | [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md) | Pre–DEC-DS00-0001 `NOT_SELECTED` | `e58fc4be211bb874330e18c60c35b7de58471fae57008a380238de33c189a21a` |
| Numeric governance (historical) | [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) | Fail-closed numeric policy | `2a99bab466121ff1b6813f8dd31eb14aa61ac8aa8da4330eb4274d699b93495e` |

---

## DS-00 verdict set (post-correction)

| Gate | Verdict token | Verdict | Notes |
|------|---------------|---------|-------|
| Repository preflight | `DS00_REPOSITORY_PREFLIGHT_VERDICT` | **PASS** | Baseline commit and intake artifacts verified |
| Existing evidence survey | `DS00_EXISTING_EVIDENCE_SURVEY_VERDICT` | **PASS_WITH_FINDINGS** | See audit summaries below; gaps expected and controlled |
| Duplicate authority | `DS00_DUPLICATE_AUTHORITY_VERDICT` | **PASS_WITH_CONTROL** | `design-standards/` current; handoff/Step 1 historical |
| Legacy standard contamination | `DS00_LEGACY_STANDARD_CONTAMINATION_VERDICT` | **PASS_WITH_CONTROL** | H29/R7 and NOT_SELECTED surfaces documented; controls in [adoption_status_model.md](adoption_status_model.md) |
| Proceed to DS-01 | `DS00_PROCEED_VERDICT` | **PASS** | Governance baseline complete after audit corrections; no numeric or freeze authorization |

**Not claimed at DS-00:** `APOLLO_FULL_DESIGN_FREEZE_VERDICT` remains `NOT_READY` per [design_freeze_assessment.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/design_freeze_assessment.md) and [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md). Full design freeze gate is **DS-09**.

---

## Grok 4.5 independent audit — historical FAIL (preserved)

**Source:** Independent adversarial read-only audit conducted 2026-07-27 by Grok 4.5. **This summary is not committed repository evidence.**

```text
DS00_PROCEED_VERDICT (pre-correction baseline): FAIL
```

| Theme | Grok finding (pre-correction) |
|-------|------------------------------|
| Target Standard status | Selection recorded as `ADOPTED_WITH_CONDITION` instead of `ADOPTED`; metadata not split into separate blocker rows |
| Prior NOT_SELECTED | Mapped to `SUPERSEDED_EQUIVALENT` instead of `REFERENCE_ONLY` historical evidence |
| Decision ledger | Used prohibited `ACCEPTED` decision status field |
| Phase 1 scope | Invented cross-section/bearing parameters; member/bracing/slab incorrectly OUT; Analyzer I/O incorrectly OUT |
| Volume applicability | Volumes IV/V marked `NOT_APPLICABLE`; unsupported official volume subtitles and unverified READY splits |
| JIS gaps | Asserted steel/rebar/bolt categories not present in gap register |
| Partial factors | Numeric freeze tied to DS-03 instead of DS-04/DS-05 split; full freeze cited as post–DS-03 |
| Analyzer I/O | Missing BLK-S1-011 mandatory DS-06 evidence requirement |
| Acquisition claims | Asserted specific ministry identifiers and distribution channels without evidence |
| Verdict tokens | Used shortened gate names inconsistent with required `*_VERDICT` suffixes |

Grok pre-correction **FAIL** is preserved in audit history. Corrections below address each finding.

---

## Post-correction re-review (Composer 2.5 — DS-00 audit corrections)

**Date:** 2026-07-27
**Worker:** Composer 2.5 applying DS-00 audit corrections only.

| Correction ID | Issue | Resolution |
|---------------|-------|------------|
| COR-01 | TARGET_STANDARD `ADOPTED_WITH_CONDITION` | Selection `ADOPTED`; metadata facets split to separate `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` rows |
| COR-02 | `NOT_SELECTED` → `SUPERSEDED_EQUIVALENT` | Changed to `REFERENCE_ONLY` historical evidence |
| COR-03 | `ACCEPTED` decision status | Replaced with `Decision effect: ADOPTED` |
| COR-04 | Phase 1 scope inventions and incorrect OUT list | Replaced with exact primary structure and explicit OUT list; DS-05/DS-06 classifications added |
| COR-05 | Volumes IV/V `NOT_APPLICABLE` | All volumes I–V `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-01 |
| COR-06 | Unverified READY volume splits | Removed; Rank-1 aggregate **69** READY rows only |
| COR-07 | JIS steel/rebar/bolt claims | Described as JIS-001…JIS-034 unresolved family/product identity in historical source |
| COR-08 | Partial-factor numerics / freeze gate | Method `ADOPTED`; numerics blocked to DS-04/DS-05; full freeze DS-09 |
| COR-09 | Missing Analyzer blocker | Added BLK-S1-011 |
| COR-10 | Acquisition channel assertions | Require official publisher/MLIT/JRA metadata and licensed copies only |
| COR-11 | Verdict token names | Aligned to required `DS00_*_VERDICT` names |

**Self-check:** All COR-01…COR-11 items addressed in current `docs/apollo/design-standards/` tree. Prior Grok FAIL accepted and corrected. `DS00_PROCEED_VERDICT: PASS` issued for corrected governance baseline only.

---

## Existing evidence survey — findings

```text
DS00_EXISTING_EVIDENCE_SURVEY_VERDICT: PASS_WITH_FINDINGS
```

| ID | Severity | Finding | Classification |
|----|----------|---------|----------------|
| EVS-01 | HIGH | Handoff and Step 1 record `NOT_SELECTED` / `NOT_READY` on disk | Authoritative historical (`REFERENCE_ONLY`) |
| EVS-02 | HIGH | 34 JIS rows (JIS-001…JIS-034) record unresolved family/product identity in gap register | Authoritative gap register |
| EVS-03 | MEDIUM | Edition tension: inventory cites 令和7年10月版 Ver.2.00; DEC-DS00-0001 uses 令和7年改訂版 label | Requires DS-01 verification |
| EVS-04 | MEDIUM | Supporting manuals (R2 鋼便覧, H31 支承便覧) declare H29 alignment | `REFERENCE_ONLY` until DS-02 map |
| EVS-05 | MEDIUM | 69 READY rows carry `HISTORICAL_BASELINE_UNKNOWN_EDITION` | Location memos only |
| EVS-06 | LOW | No in-repo `DS-00` artifact existed before this baseline | Resolved by DEC-DS00-0002 |
| EVS-07 | LOW | `PACKAGE_INFO.md` header `DRAFT` vs Step 1 acceptance verdicts | Interpreted per [terminology_and_status_rules.md](../../step1/00_governance/terminology_and_status_rules.md) |

---

## Composer 2.5 survey summary (non-committed)

**Source:** Read-only repository survey conducted 2026-07-27 by Composer 2.5 documentation worker. **This summary is not committed repository evidence.**

| Theme | Summary |
|-------|---------|
| Authority stack | Layered: handoff Rank 1 → Step 1 planning → AP-00 implementation guards → production `GovernedQuantity` / `numericAuthorityGuard` |
| DS-00 gap | No prior `docs/apollo/design-standards/` tree; external task ID only |
| Target Standard | Historical artifacts uniformly `NOT_SELECTED`; DEC-DS00-0001 adopts selection at label level |
| JIS gaps | 34 opaque managed gaps (JIS-001…JIS-034); HOLD policy forbids 道示 substitution |
| Status fragmentation | Step 1 `PLACEHOLDER`/`ADOPTED`, AP-00 `NumericAuthority`, frontend `GovernedQuantity` — not unified pre–DS-00 |
| Phase 1 | `FROZEN_NARROW` archetype in [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) constrains standards applicability |
| AP-* completion | AP-00/AP-01/AP-11 COMPLETE addresses scaffolding; does not imply design freeze (DS-09) |

---

## Blocker evidence matrix

Every open blocker requires **exact evidence** and an **acquisition method** before status can advance.

### BLK-S1-001 — Target Standard metadata (selection closed; facets open)

| Field | Requirement |
|-------|-------------|
| **Blocker** | Official naming, publication metadata, edition verification, and volume identity under 令和7年改訂版 |
| **DS-00 status** | Selection `ADOPTED`; each metadata facet `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| **Exact evidence required** | Per facet: official title page and colophon (奥付) from licensed copy; publication date; version string (e.g. Ver.2.00 where present); publisher and MLIT/JRA issuance metadata as printed on the official document — **no invented ministry identifier fields** |
| **Acquisition method** | Obtain licensed 道路橋示方書・同解説 令和7年改訂版 copies through official publisher or organizational standards library; human-read colophon per volume; record acquisition path in DS-01 `EVD-DS01-*` entries |
| **Verification** | Record `EVD-DS01-*` locators in DS-01; cross-check against [inventory notes](../../step1/02_standards_baseline/standards_source_inventory.md) |
| **Owner** | Supervisor + external_research |

### BLK-S1-002 — JIS SOURCE GAP (34 rows)

| Field | Requirement |
|-------|-------------|
| **Blocker** | Primary JIS sources for gap rows JIS-001…JIS-034 |
| **Historical source note** | Gap register records unresolved family/product identity per row; DS-00 does not infer product categories |
| **Exact evidence required** | For each gap row: resolved standard family/product identity, standard number, edition year, and applicable clause; primary PDF or authorized extract |
| **Acquisition method** | Licensed or organization-approved JIS copies via official publisher or organizational standards library; map each JIS-00n row in DS-02 gap disposition table |
| **Verification** | Update gap register in DS-02 (new CSV under `design-standards/`); never edit handoff [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) |
| **Interim** | HOLD — no 道示/DDB substitution per CSV `interim_treatment` |
| **Owner** | EXTERNAL_JIS_RESEARCH |

### BLK-S1-003 — Supporting manual edition map

| Field | Requirement |
|-------|-------------|
| **Blocker** | R7 道示 vs H29-aligned 便覧/DDB |
| **Exact evidence required** | Publisher statements in R2 鋼道路橋設計便覧 and H31 道路橋支承便覧 tying each manual to a 道示 edition; explicit scope of which Phase 1 topics may cite each manual |
| **Acquisition method** | Human-read prefaces (序文) in repo-external PDFs listed in [standards_source_inventory.md](../../step1/02_standards_baseline/standards_source_inventory.md) §C |
| **Verification** | DS-02 `DEC-DS02-*` edition map table |
| **Owner** | step1_planner + supervisor |

### BLK-S1-004 — Numeric auto-determination ban

| Field | Requirement |
|-------|-------------|
| **Blocker** | No loads/factors/limits without adopted records |
| **Exact evidence required** | Per-quantity `source_locator` from verified 道示 clause/table after BLK-S1-001 closure |
| **Acquisition method** | Licensed 道示 PDF human verification; record in DS-04 (loads) / DS-05 (resistance/verification) numeric registers |
| **Verification** | Each numeric `ADOPTED` requires `DEC-DS04-*` / `DEC-DS05-*` + complete metadata per [adoption_status_model.md](adoption_status_model.md) |
| **Owner** | supervisor |

### BLK-S1-005 — Material property adoption

| Field | Requirement |
|-------|-------------|
| **Blocker** | Material ADOPTED forbidden without JIS + 道示 chain |
| **Exact evidence required** | Resolved JIS identity from BLK-S1-002 + product grade + 道示 reference clause |
| **Acquisition method** | Close BLK-S1-002 first; then 道示 material references for Phase 1 members |
| **Verification** | DS-05 material register |
| **Owner** | supervisor |

### BLK-S1-006 — Traceability locators

| Field | Requirement |
|-------|-------------|
| **Blocker** | Missing page-table-clause locators |
| **Exact evidence required** | Verified locator string for every adopted record |
| **Acquisition method** | Human PDF read (image-export PDFs per BLK-S1-008); no OCR-only |
| **Verification** | DS-01+ locator audit checklist |
| **Owner** | step1_planner |

### BLK-S1-007 — Historical APOLLO baseline

| Field | Requirement |
|-------|-------------|
| **Blocker** | `HISTORICAL_BASELINE_UNKNOWN_EDITION` on all 69 READY rows |
| **Exact evidence required** | Documented decision: clone targets APOLLO historical edition vs current 道示 Target; impact on traceability labels |
| **Acquisition method** | Supervisor workshop with frame_team; cite APOLLO manual edition evidence (repo-external) |
| **Verification** | `DEC-DS01-*` or `DEC-DS02-*` historical baseline record |
| **Owner** | supervisor + frame_team |

### BLK-S1-008 — Image-export PDF quality

| Field | Requirement |
|-------|-------------|
| **Blocker** | 道示 PDFs are image exports — unreliable text extraction |
| **Exact evidence required** | Human-verified locator for each cited page; optional structured extraction pipeline sign-off |
| **Acquisition method** | Manual page review; consider searchable PDF replacement if org licenses permit |
| **Verification** | Locator audit log in DS-01 |
| **Owner** | external_research |

### BLK-S1-009 — Evidence PNG license

| Field | Requirement |
|-------|-------------|
| **Blocker** | Redistribution rights for evidence extracts |
| **Exact evidence required** | Receiving org written confirmation of internal-use and redistribution rights |
| **Acquisition method** | Legal/org compliance review per [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) license section |
| **Verification** | Compliance memo referenced by `DEC-DS01-*` |
| **Owner** | receiving_org |

### BLK-S1-010 — Phase 2 PDF leakage

| Field | Requirement |
|-------|-------------|
| **Blocker** | Composite/box example PDFs in local inventory |
| **Exact evidence required** | Explicit Phase 1 exclusion attestation in DS scope docs (present in [design_standard_scope.md](design_standard_scope.md)) |
| **Acquisition method** | N/A — control is scope enforcement |
| **Verification** | Phase 1 preflight rejects composite/box constants |
| **Owner** | supervisor |

<a id="blk-s1-011"></a>

### BLK-S1-011 — Analyzer physical I/O evidence (DS-06 mandatory)

| Field | Requirement |
|-------|-------------|
| **Blocker** | Mandatory Analyzer physical input/output evidence for Phase 1 static linear frame analysis path |
| **DS-00 status** | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — Analyzer I/O is **not** OUT of Phase 1 |
| **Exact evidence required** | (1) Documented Analyzer input file format specification or canonical sample inputs with field-level mapping to Apollo frame model exports; (2) documented Analyzer output file format specification or canonical sample outputs with field-level mapping to `FrameAnalysisResultResource` normalization; (3) acceptance probe: round-trip or parity test plan identifying pass/fail criteria for at least one representative Phase 1 simple-span model; (4) version/edition identifier for the Analyzer build or format revision in use |
| **Acquisition method** | Obtain Analyzer format documentation, licensed sample files, or supervised capture from authorized Analyzer installation; record provenance in DS-06 `EVD-DS06-*` entries — do not commit proprietary binaries without rights review |
| **Verification** | DS-06 `DEC-DS06-*` records evidence IDs, probe results, and any residual gaps; BLK-S1-011 closes only when acceptance probe criteria are met or explicitly waived by supervisor decision |
| **Owner** | frame_team + supervisor |

### DTR-06 — Errata / 正誤表

| Field | Requirement |
|-------|-------------|
| **Blocker** | Errata status for R7 volumes |
| **Exact evidence required** | Publisher or MLIT 正誤表 listings per volume; dated errata sheets |
| **Acquisition method** | Official 道路橋示方書 support pages and publisher errata bulletins via licensed or organizational access |
| **Verification** | DS-01 errata register linked to each volume |
| **Owner** | external_research |

### ISS-S1-008 — Target selection (naming)

| Field | Requirement |
|-------|-------------|
| **Blocker** | Explicit Target Standard selection |
| **DS-00 resolution** | **Closed** — `ADOPTED` per [DEC-DS00-0001](decision_ledger.md#dec-ds00-0001) |
| **Remaining evidence** | See BLK-S1-001 metadata facets, DTR-06 |
| **Owner** | supervisor |

---

## Duplicate authority control record

```text
DS00_DUPLICATE_AUTHORITY_VERDICT: PASS_WITH_CONTROL
```

| Path | Role after DS-00 |
|------|-------------------|
| `docs/apollo/design-standards/` | Current integration authority |
| `docs/apollo/handoffs/.../apollo_frame_team_handoff/` | Immutable Rank-1 evidence |
| `docs/apollo/step1/02_standards_baseline/` | Historical planning (pre–DEC-DS00-0001 for Target) |
| `docs/apollo/ap00/02_scope_guards/` | Implementation enforcement (align in future AP-* PRs) |

---

## Legacy standard contamination control record

```text
DS00_LEGACY_STANDARD_CONTAMINATION_VERDICT: PASS_WITH_CONTROL
```

Controls: DEC-DS00-0001 R7 Target selection `ADOPTED`; H29 manuals `REFERENCE_ONLY`; composite/box `OUT_OF_SCOPE`; handoff bytes immutable; no standards text copied into DS tree; prior `NOT_SELECTED` preserved as `REFERENCE_ONLY`.

---

## Proceed gate

```text
DS00_PROCEED_VERDICT: PASS
```

DS-01 may begin edition verification and official metadata capture. DS-00 does not authorize implementation numeric changes, handoff edits, or full design freeze (DS-09).
