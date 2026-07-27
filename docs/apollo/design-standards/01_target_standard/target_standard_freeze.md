# Target Standard Freeze — DS-01

**Authority:** DS-01 / CURRENT INTEGRATION
**Stage:** DS-01 — Target Standard identification and freeze posture
**Date:** 2026-07-27
**Repository baseline:** `f56b520a451f95bc67d544b04a5153d0439f8193`
**Parent decision:** [DEC-DS00-0001](../00_governance/decision_ledger.md#dec-ds00-0001), [DEC-DS01-0001](../00_governance/decision_ledger.md#dec-ds01-0001)

DS-01 closes the Target Standard **selection** and metadata facets that DS-00 left as `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`. DS-01 does **not** authorize numeric adoption, clause-level mapping with visual confirmation, or full design freeze (DS-09 gate).

---

## Frozen Target Standard identity

| Field | Value | Adoption status |
|-------|-------|-----------------|
| **Family label** | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| **MLIT official press release (報道発表資料)** | 「橋、高架の道路等の技術基準」（道路橋示方書）の改定について (2025-08-22) | `ADOPTED` |
| **Application start (new designs)** | 2026-04-01 | `ADOPTED` |
| **Publisher / distributor** | 日本道路協会 (JRA) | `ADOPTED` |
| **Electronic baseline** | Ver2.00 (2025-12-19, errata-reflected) | `ADOPTED_WITH_CONDITION` |
| **Errata overlay** | Official errata published 2026-03-31 | `ADOPTED_WITH_CONDITION` |
| **Adopted reference baseline** | Ver2.00 **plus** 2026-03-31 official errata overlay (checked 2026-07-27) | `ADOPTED_WITH_CONDITION` |
| **Local licensed copies** | Image-export PDFs at external path (see [edition_and_errata_register.csv](edition_and_errata_register.csv)) | `ADOPTED_WITH_CONDITION` |
| **Volume V title string** | JRA product page: 上下部接続部**構造**編 vs MLIT/JRA FAQ/local print: 上下部接続部編 | `ADOPTED_WITH_CONDITION` — **not normalized** |
| **Numeric partial factors** | Load-side and resistance-side coefficients | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-04 / DS-05 |
| **Exact verification equations** | Coefficient placement and equation forms | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` → DS-04 / DS-05 |
| **Clause-level applicability map** | Per-chapter / per-clause binding | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` — open exact-evidence blocker; later applicable DS mapping (human visual confirmation required) |

---

## Official volume arrangement (R7)

Per MLIT official press release and JRA publication metadata (checked 2026-07-27). E-book ISBN values apply to JRA Ver2.00 product pages only (`RBS-*` rows); local licensed copies use separate print ISBNs where recorded (`LOCAL-*` rows).

| Volume | Official MLIT label | JRA e-book title / e-book ISBN | Title variance |
|--------|---------------------|--------------------------------|----------------|
| I | 共通編 | 978-4-88950-801-7 (e-book) | None recorded |
| II | 鋼部材・鋼上部構造編 | 978-4-88950-802-4 (e-book) | None recorded |
| III | コンクリート部材・コンクリート上部構造編 | 978-4-88950-803-1 (e-book) | None recorded |
| IV | 下部構造編 | 978-4-88950-804-8 (e-book) | None recorded |
| V | 上下部接続部編 (MLIT / FAQ / local print) | Product page: 上下部接続部**構造**編; e-book ISBN 978-4-88950-805-5 | **Recorded as `ADOPTED_WITH_CONDITION`** — do not silently normalize |

Full register: [edition_and_errata_register.csv](edition_and_errata_register.csv). Governed evidence: [ds01_evidence_register.md](ds01_evidence_register.md).

---

## Publication timeline (press release and publisher sources)

| Event | Date | Evidence |
|-------|------|----------|
| MLIT official press release — 「橋、高架の道路等の技術基準」（道路橋示方書）の改定について | 2025-08-22 | [MLIT press PDF](https://www.mlit.go.jp/report/press/content/001906067.pdf) — SHA256 `60ef4608873161151720ae8038b7d63b84ade064538f67e0169d04c5268049a8` (`EVD-DS01-001`) |
| JRA publication announcement | 2025-10-31 | [JRA e-book news](https://e-book.road.or.jp/blogs/news/%E9%9B%BB%E5%AD%90%E7%89%88-%E9%81%93%E8%B7%AF%E6%A9%8B%E7%A4%BA%E6%96%B9%E6%9B%B8-%E5%90%8C%E8%A7%A3%E8%AA%AC-%E4%BB%A4%E5%92%8C%EF%BC%97%E5%B9%B4%E6%94%B9%E8%A8%82%E7%89%88-%E3%82%92%EF%BC%91%EF%BC%91%E6%9C%88%EF%BC%95%E6%97%A5%E3%81%AB%E7%99%BA%E5%88%8A%E3%81%97%E3%81%BE%E3%81%99) (`EVD-DS01-002`) |
| Electronic sale Ver1.00 | 2025-11-05 | JRA e-book product pages (`EVD-DS01-005` … `EVD-DS01-009`) |
| Electronic sale Ver2.00 (errata-reflected) | 2025-12-19 | JRA e-book product pages (`EVD-DS01-005` … `EVD-DS01-009`) |
| Errata 20251212 (reflected in Ver2.00) | 2025-12-12 | [20251212.pdf](https://www.road.or.jp/img/books/corrigenda/pdf/20251212.pdf) — SHA256 `50c3a1f0ef2b05251d4791c426ac333a5e3d0bc5496995682766069f4ed23c7f` (`EVD-DS01-003`) |
| Errata overlay (some entries not yet in electronic/paper) | 2026-03-31 | [20260331.pdf](https://www.road.or.jp/img/books/corrigenda/pdf/20260331.pdf) — SHA256 `22b8767d46041f5521820736419e5425a4d501f2698aec1cc6553f684809b4e5` (`EVD-DS01-004`) |
| Application start for designs newly commenced (per press release) | 2026-04-01 | MLIT official press release (`EVD-DS01-001`) |

**Condition on adopted baseline:** Ver2.00 is the electronic errata-reflected edition; the 2026-03-31 errata overlay is applied separately because some new errata entries are not yet reflected in electronic or paper media. Local licensed image-export PDFs are Ver2.00-compatible (II–V: 改訂版第1刷; I: Ver2.00 history) but remain subject to the 2026-03-31 overlay and human visual confirmation for clause citations.

---

## DEC-DS00-0001 parameter freeze (DS-01 confirmation)

| Parameter | Value | DS-01 status |
|-----------|-------|--------------|
| **TARGET_STANDARD** | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` |
| **DESIGN_PHILOSOPHY** | 性能規定型設計 | `ADOPTED` — see [performance_based_design_philosophy.md](performance_based_design_philosophy.md) |
| **VERIFICATION_FORMAT** | 部分係数法 | `ADOPTED` — see [partial_factor_method_framework.md](partial_factor_method_framework.md) |

---

## Legacy version exclusion

| Source class | DS-01 disposition |
|--------------|-------------------|
| 平成29年11月版 (H29) 道示 and H29-aligned numerics | `OUT_OF_SCOPE` as numeric authority for Apollo integration |
| H29-aligned local PDF examples (composite/box) | `OUT_OF_SCOPE` for Phase 1 (per DS-00) |
| R2 鋼便覧 / H31 支承便覧 / DDB | `REFERENCE_ONLY` — not co-equal with Target Standard |
| Step 1 / handoff `NOT_SELECTED` artifacts | `REFERENCE_ONLY` historical evidence |
| Prior edition strings (e.g. inventory-only 令和7年10月版 labels without errata overlay) | Superseded for live integration by this DS-01 baseline |

H29 and older manuals may inform background understanding but **must not** supply binding numerics, clause citations, or deemed-to-satisfy shortcuts for Phase 1 integration.

---

## DS-01 verdict set

```text
DS01_TARGET_STANDARD_VERDICT: PASS_WITH_CONDITION
DS01_EDITION_ERRATA_VERDICT: PASS_WITH_CONDITION
DS01_PERFORMANCE_BASED_DESIGN_VERDICT: PASS
DS01_PARTIAL_FACTOR_METHOD_VERDICT: PASS
DS01_PHASE1_APPLICABILITY_VERDICT: PASS_WITH_EVIDENCE_BLOCKERS
DS01_LEGACY_VERSION_EXCLUSION_VERDICT: PASS
DS01_COMPLETION_VERDICT: COMPLETE_WITH_EVIDENCE_BLOCKERS
```

| Gate | Verdict | Notes |
|------|---------|-------|
| `DS01_TARGET_STANDARD_VERDICT` | **PASS_WITH_CONDITION** | Selection adopted; official naming/ISBN `ADOPTED_WITH_CONDITION`; LOCAL-I print ISBN blocked |
| `DS01_EDITION_ERRATA_VERDICT` | **PASS_WITH_CONDITION** | Ver2.00 + 2026-03-31 overlay; local copies image-export; V title variance explicit |
| `DS01_PERFORMANCE_BASED_DESIGN_VERDICT` | **PASS** | Philosophy and hierarchy adopted; deemed-to-satisfy rules recorded |
| `DS01_PARTIAL_FACTOR_METHOD_VERDICT` | **PASS** | Method adopted; numerics and exact equations deferred to DS-04/DS-05 |
| `DS01_PHASE1_APPLICABILITY_VERDICT` | **PASS_WITH_EVIDENCE_BLOCKERS** | Volume roles assigned; clause map blocked pending visual evidence |
| `DS01_LEGACY_VERSION_EXCLUSION_VERDICT` | **PASS** | H29 excluded as numeric authority; supporting manuals `REFERENCE_ONLY` |
| `DS01_COMPLETION_VERDICT` | **COMPLETE_WITH_EVIDENCE_BLOCKERS** | DS-01 deliverables complete; downstream blockers explicit |

**Not claimed at DS-01:** `APOLLO_FULL_DESIGN_FREEZE_VERDICT` remains `NOT_READY`; full freeze gate is **DS-09**.

---

## DS-01 document index

| Document | Role |
|----------|------|
| [performance_based_design_philosophy.md](performance_based_design_philosophy.md) | Performance hierarchy, deemed-to-satisfy vs performance requirements, alternative methods |
| [partial_factor_method_framework.md](partial_factor_method_framework.md) | Partial-factor method roles; load/resistance/adjustment distinction; numeric deferral |
| [applicable_volumes_and_sections.md](applicable_volumes_and_sections.md) | Phase 1 volume applicability; clause map blockers |
| [edition_and_errata_register.csv](edition_and_errata_register.csv) | Edition, ISBN kind, errata, and locator register |
| [ds01_evidence_register.md](ds01_evidence_register.md) | Governed DS-01 evidence index (`EVD-DS01-*`) |

---

## Self-check (DS-01)

| Check | Result |
|-------|--------|
| Edited only `01_target_standard/**`, root README, `decision_ledger.md` | PASS |
| All required verdict tokens present | PASS |
| No live `TODO` / `TBD` / `TBC` / `UNKNOWN` status labels | PASS |
| No unsourced design numerics or invented partial factors | PASS |
| No long standards quotations | PASS |
| Term 部分係数法 used (not 部分分数法) | PASS |
| Volume V title variance recorded `ADOPTED_WITH_CONDITION`, not normalized | PASS |
| Local PDFs referenced by path/checksum only; not copied into repo | PASS |
| No precise clause numbers declared without visual evidence | PASS |
| CSV columns match required schema | PASS — see register file (`isbn_kind` distinguishes e-book vs print) |
| DS-01 evidence register linked | PASS — [ds01_evidence_register.md](ds01_evidence_register.md) |
| DEC-DS01-0001 recorded in decision ledger | PASS |
