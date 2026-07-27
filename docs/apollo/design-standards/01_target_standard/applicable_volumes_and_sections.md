# Applicable Volumes and Sections — DS-01

**Authority:** DS-01 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Parent:** [target_standard_freeze.md](target_standard_freeze.md), [design_standard_scope.md](../00_governance/design_standard_scope.md)

This document assigns **Phase 1 volume roles** under the Target Standard 道路橋示方書・同解説 令和7年改訂版. Exact chapter and clause mapping remains `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` because local licensed copies are image-export PDFs requiring human visual confirmation for page/clause citations.

---

## Official volumes (R7 arrangement)

| Volume | Official MLIT label | JRA e-book ISBN (Ver2.00) | Notes |
|--------|---------------------|---------------------------|-------|
| I | 共通編 | 978-4-88950-801-7 | Common provisions volume |
| II | 鋼部材・鋼上部構造編 | 978-4-88950-802-4 | Steel members and steel superstructure |
| III | コンクリート部材・コンクリート上部構造編 | 978-4-88950-803-1 | Concrete members and concrete superstructure |
| IV | 下部構造編 | 978-4-88950-804-8 | Substructure |
| V | 上下部接続部編 (MLIT / FAQ / local print) | 978-4-88950-805-5 | JRA product page title: 上下部接続部**構造**編 — `ADOPTED_WITH_CONDITION`; see [target_standard_freeze.md](target_standard_freeze.md) |

E-book ISBN values above are from JRA Ver2.00 product pages (`RBS-*` rows) only. Local licensed copies use separate print ISBNs where recorded; LOCAL-I print ISBN remains blocked — see [ds01_evidence_register.md](ds01_evidence_register.md).

---

## Phase 1 volume adoption summary

| Volume | Phase 1 role | Adoption status | Rationale |
|--------|--------------|-----------------|-----------|
| **I** 共通編 | Primary — loads, units, common rules for superstructure design | `ADOPTED_WITH_CONDITION` | Phase 1 archetype requires common provisions; clause map blocked |
| **II** 鋼部材・鋼上部構造編 | Primary — non-composite steel plate girder superstructure | `ADOPTED_WITH_CONDITION` | Dominant READY evidence volume; clause map blocked |
| **III** コンクリート部材・コンクリート上部構造編 | Primary — RC deck slab (non-composite) | `ADOPTED_WITH_CONDITION` | Phase 1 RC deck scope; clause map blocked |
| **IV** 下部構造編 | Reference — substructure body design OUT of Phase 1 | `REFERENCE_ONLY` | Substructure body design `OUT_OF_SCOPE`; interface evidence only as needed |
| **V** 上下部接続部編 / 構造編 | Selected topics — bearings, connections, unseating prevention at boundaries | `ADOPTED_WITH_CONDITION` | Boundary/auxiliary checks per DS-00 DS-05/connection topics; title variance explicit; clause map blocked |

**Verdict alignment:** `DS01_PHASE1_APPLICABILITY_VERDICT: PASS_WITH_EVIDENCE_BLOCKERS`

---

## Volume IV — reference-only with interface exception

Phase 1 explicitly excludes **substructure body design** ([design_standard_scope.md](../00_governance/design_standard_scope.md)). Volume IV is therefore `REFERENCE_ONLY` for adoption and numerics.

**Exception:** Where superstructure design requires substructure **interface evidence**, Volume IV may be cited as `REFERENCE_ONLY` support. Such citations still require human visual confirmation and do not adopt substructure design provisions for Phase 1 computation.

---

## Volume V — selected topics only

Volume V is adopted **with conditions** for Phase 1 **boundary and connection topics** aligned with DS-00 open classifications (bearing boundary, connection boundary, unseating prevention). It is **not** a blanket adoption of the entire volume.

| Topic area | Phase 1 posture | Status |
|------------|-----------------|--------|
| Bearing boundary / bearing design references | In scope as boundary topic | `ADOPTED_WITH_CONDITION` — clause map blocked |
| Connection boundary / splice-adjacent connection rules | In scope where Phase 1 features require | `ADOPTED_WITH_CONDITION` — clause map blocked |
| Unseating prevention | In scope as auxiliary boundary check | `ADOPTED_WITH_CONDITION` — clause map blocked |
| Full connection design catalog beyond Phase 1 features | Not automatically in scope | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until DS-02 feature map |

**Title variance:** Integration records must use the official title string from the evidence source being cited (MLIT label, FAQ, local print, or JRA product page) and must not silently normalize 上下部接続部編 ↔ 上下部接続部構造編.

---

## Clause and chapter mapping — evidence blockers

| Blocker | Reason | Unlock |
|---------|--------|--------|
| Exact chapter numbers per READY requirement | Local PDFs are image exports; OCR/automation not authoritative | DS-02 with human visual confirmation |
| Exact clause / table / figure locators | Same | DS-02 `EVD-DS02-*` entries |
| Per-requirement volume split beyond Rank-1 aggregate | DS-00 forbids unverified READY volume splits | DS-02 supervised mapping |

**Rule:** DS-01 **must not** declare precise clause numbers, table numbers, or page-level bindings without human visual confirmation against the adopted edition baseline (Ver2.00 + 2026-03-31 errata overlay).

Historical Step 1 location memos (PNG extracts, page hints in READY CSV) remain `REFERENCE_ONLY` until re-verified against the DS-01 baseline.

---

## Phase 1 archetype cross-reference

Primary structure IN scope (from DS-00): straight bridge, equal depth, non-composite RC deck on steel plate girder, simple single span, 90° skew, ~4–6 main girders, static linear analysis.

Explicit OUT items (seismic, fatigue, composite action, box girder, substructure body, etc.) must not pull adoption from volumes or chapters covering those topics unless a later DS decision expands scope.

Member-level DS-05 classifications (cross girders, bracing, slab, bearings, connections) remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` at DS-01 → DS-05.

---

## Supporting manuals (not Target Standard volumes)

| Manual | Disposition |
|--------|-------------|
| R2 鋼便覧 | `REFERENCE_ONLY` |
| H31 支承便覧 | `REFERENCE_ONLY` |
| DDB | `REFERENCE_ONLY` |
| H29-aligned 道示 or examples | `OUT_OF_SCOPE` as numeric authority |

Supporting manuals do not override Target Standard volume I–V adoption posture.

---

## Evidence and register

| Resource | Path |
|----------|------|
| Edition / errata / ISBN register | [edition_and_errata_register.csv](edition_and_errata_register.csv) |
| DS-01 evidence register | [ds01_evidence_register.md](ds01_evidence_register.md) |
| Local licensed PDF checksums | Register rows `LOCAL-I` … `LOCAL-V` (external path; not in repo) |
| Phase 1 scope freeze | [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) (`REFERENCE_ONLY`) |
| READY aggregate (69 rows) | [ready_requirements.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/ready_requirements.csv) (`REFERENCE_ONLY` until DS-02 remap) |
