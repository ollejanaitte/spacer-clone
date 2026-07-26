# Standards Source Inventory — P02

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Base commit:** `b0913a8bacd32a001540a60cb4c93a91961cfd95`  
**Phase 1 design scope:** 非合成鋼鈑桁、RC床版、単純桁、1径間、直橋、等桁高、静的線形解析

## Purpose

Catalogue standards-related sources available to Step 1 planning: (a) immutable handoff traceability, (b) external bridge-standards-research finalized findings, and (c) original PDF editions held locally (names/locations only — **not copied into spacer-clone**).

## Source precedence reminder

Per [source_precedence.md](../00_governance/source_precedence.md): Rank 1 handoff package supersedes Rank 4 local research when in conflict. Original PDFs (Rank 6) are reference-only and repo-external.

---

## A. Handoff package (Rank 1) — traceability without primary PDFs

| Artifact | Location (repo-relative) | Role |
|----------|--------------------------|------|
| `PACKAGE_INFO.md` | `docs/apollo/handoffs/.../PACKAGE_INFO.md` | Target Standard: **NOT_SELECTED**; frozen bucket counts |
| `ready_requirements.csv` | `standards/ready_requirements.csv` | 69 READY rows; all `target_standard_status=TARGET_STANDARD_NOT_SELECTED` |
| `jis_source_gaps.csv` | `standards/jis_source_gaps.csv` | 34 managed JIS gaps (JIS-001…JIS-034); no primary JIS bundled |
| `external_traceability_crosswalk.csv` | `standards/external_traceability_crosswalk.csv` | Stage5A/5B crosswalk; edition notes per row |
| Evidence PNGs | `evidence/images/` (69 files) | Location memos only; not numeric authority |

**Handoff standard document IDs cited in READY rows:**

| Doc ID | Handoff label | READY row count | Primary PDF in handoff |
|--------|---------------|-----------------|------------------------|
| DOC-RBS-I | 道路橋示方書・同解説 Ⅰ 共通編 | 3 | No |
| DOC-RBS-II | 道路橋示方書・同解説 Ⅱ 鋼部材・鋼上部構造編 | 63 | No |
| DOC-RBS-III | 道路橋示方書・同解説 Ⅲ コンクリート部材・コンクリート上部構造編 | 1 | No |
| DOC-DDB | デザインデータブック | 2 | No |

Handoff edition string (all READY rows): `令和7年10月版 Ver.2.00（表紙・奥付確認済み・Target未選定）` with flag `HISTORICAL_BASELINE_UNKNOWN_EDITION`.

---

## B. Bridge-standards-research (Rank 4) — finalized local findings

**Tree root:** `~/Projects/bridge-standards-research/` (read-only; not in spacer-clone repo)

| Area | Key artifacts | Status |
|------|---------------|--------|
| `inventory/` | `phase1_document_priority.md`, `pdf_version_priority_inventory.csv`, `pdf_quick_inventory.csv`, SHA256 logs | Phase1 PDF edition review complete |
| `research/stage5b/` | `stage5b_research_summary.md`, package reports PKG-003…007, evidence refs | Stage5B COMPLETE_WITH_OPEN_ITEMS |
| `planning/stage5c/` | `apollo_requirements.csv`, `validation_rules.csv`, `traceability_matrix.csv` | Planning outputs |
| `handoff/` | `apollo-decoding/` zip manifests | Upstream handoff build artifacts |
| `validation/` | (via work/stage5_handoff) verification CSVs | Build verification |
| `stage5a_*.csv/md` | `stage5a_external_research_handoff.csv` (273 rows), `stage5a_unresolved_questions.md` (15 UNKNOWN) | External research handoff spec |

**Stage5B research coverage (273 handoff items):**

| Result status | Count | Notes |
|---------------|------:|-------|
| RESEARCHED | 101 | Primary external location memos |
| LINKED_TO_PRIMARY_RESULT | 97 | Linked to package primary |
| BLOCKED_BY_SOURCE_GAP | 34 | Matches handoff JIS gaps 1:1 |
| RETURN_TO_APOLLO | 41 | APOLLO-internal / project decisions |
| UNKNOWN | 15 | Manual extraction gaps (Stage5A) |

---

## C. Original PDF editions — `260726_設計基準/` (Rank 6; local only)

**Path:** `~/Projects/bridge-standards-research/260726_設計基準/`  
**Count:** 11 PDFs (names only; do not ingest wholesale; do not copy into spacer-clone)

| # | Filename |
|---|----------|
| 1 | `道路橋示方書・同解説　Ⅰ　共通編.pdf` |
| 2 | `道路橋示方書・同解説　Ⅱ　鋼部材・鋼上部構造編.pdf` |
| 3 | `道路橋示方書・同解説　Ⅲ　コンクリート部材・コンクリート上部構造編.pdf` |
| 4 | `道路橋示方書・同解説　Ⅳ　下部構造編.pdf` |
| 5 | `道路橋示方書・同解説　Ⅴ　上下部接続部編.pdf` |
| 6 | `R2鋼道路橋設計便覧.pdf` |
| 7 | `H31道路橋支承便覧.pdf` |
| 8 | `2021_デザインデータブック.pdf` |
| 9 | `20220102_令和4年1月 鋼橋構造詳細の手引き(改訂3版).pdf` |
| 10 | `20220101_合成桁の設計例と解説令和4年1月_日本橋梁建設協会.pdf` |
| 11 | `令和3年6月_細幅箱桁橋の設計例と解説～道示　平成29年11月版対応.pdf` |

Edition details confirmed in `inventory/pdf_version_priority_inventory.csv` (cover/colophon review; image PDFs; text extraction limited).

---

## D. Phase 1 applicability classification

### Phase1-applicable (PRIMARY / SUPPORTING)

| Class | Documents | Phase 1 use |
|-------|-----------|-------------|
| **PRIMARY** | 道示 Ⅰ・Ⅱ・Ⅲ (R7/10 Ver.2.00 per inventory) | Loads, materials, steel/concrete design rules for non-composite plate girder + RC deck |
| **SUPPORTING** | 道示 Ⅳ・Ⅴ; R2 鋼道路橋設計便覧; H31 支承便覧; 2021 DDB; 鋼橋構造詳細の手引き | Substructure/bearing boundary refs; practice checks; standard dimensions (non-mandatory) |

### Deferred — OUT_OF_PHASE1

| Document | Reason |
|----------|--------|
| `20220101_合成桁の設計例と解説…pdf` | 合成桁 — Phase 1 is **非合成** |
| `令和3年6月_細幅箱桁橋の設計例と解説…pdf` | 細幅箱桁 — Phase 1 is **鋼鈑桁** |
| 鋼床版 dedicated design examples | Not in Phase 1 scope per charter/inventory (RC deck only) |

### Not inventoried locally — REFERENCE_ONLY / gap

| Source family | Handoff status | Local research status |
|---------------|----------------|----------------------|
| JIS steel (JIS_STEEL) | 34 gaps; JIS-001…034 UNKNOWN family | No JIS primary PDFs in `260726_設計基準` |
| JIS rebar (JIS_REBAR) | Covered by gap rows | No JIS primary PDFs |
| JIS bolt (JIS_BOLT) | Covered by gap rows | No JIS primary PDFs |
| APOLLO manuals | Excluded from handoff by design | Rank 5; repo-external |

---

## E. Crosswalk — local research vs JIS gaps

| Topic area | Local RBS/DDB coverage | JIS gap remainder |
|------------|------------------------|-------------------|
| Unit system, live loads, load combinations | DOC-RBS-I located (READY RDY-001,003; Stage5B PKG-003) | None for pure RBS topics |
| Steel member checks, splices, bracing | DOC-RBS-II located (63 READY rows; PKG-004) | **JIS bolt/steel specs** — 34 gaps block numeric material/bolt values |
| RC slab / haunch | DOC-RBS-III partial (1 READY row); RBS concrete refs in Stage5A | **JIS rebar** product specs — gap rows |
| Standard sections / DDB practice data | DOC-DDB located (PKG-007); supporting only | DDB ≠ mandatory standard; not JIS substitute |
| Bearing / substructure | RBS IV/V + H31 manual in inventory (supporting) | Project-specific inputs; not JIS-blocked |

**Conclusion:** Local research **covers RBS/DDB location memos** for Phase 1 READY subset. **All 34 JIS SOURCE GAP rows remain open** — handoff explicitly forbids substituting 道示/DDB for missing JIS primaries (`interim_treatment=HOLD — do not invent from secondary sources`).

---

## F. Inventory gaps / caveats

1. **Target Standard NOT_SELECTED** — no single binding edition for numeric freeze (ISS-S1-008).
2. **Edition tension** — inventory confirms R7/10 Ver.2.00 道示; R2 便覧 and H31 支承便覧 declare H29/11 alignment (partially confirmed only).
3. **JIS primaries absent** — design-freeze blocking per package (ISS-S1-009).
4. **Image PDFs** — OCR/text extraction unreliable; governance requires page/table/clause citations from verified reads.
5. **Evidence license** — PNG extracts internal-use only (ISS-S1-010).

See [standards_applicability_matrix.csv](standards_applicability_matrix.csv), [target_standard_decision.md](target_standard_decision.md), [standards_blocker_register.csv](standards_blocker_register.csv).
