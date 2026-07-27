# Copyright and Evidence Policy — DS-00

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27

## Principles

1. **Preserve, do not reproduce** — 道路橋示方書, JIS, DDB, and supporting manual text stay repo-external. DS documents cite paths, locators, and hashes only.
2. **Immutable handoff** — Files under [apollo_frame_team_handoff](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/) are historical evidence; never edited to match DS-00.
3. **Evidence ≠ authority** — PNG location memos and research summaries support traceability; they do not authorize numerics without primary verification.
4. **CLI transcripts are not committed evidence** — Composer and Grok audit session outputs are summarized in [ds00_evidence_baseline.md](ds00_evidence_baseline.md) for orientation only; they are not repository artifacts and carry no adoption weight.

---

## Redistribution and license

| Asset class | Location | Policy |
|-------------|----------|--------|
| Handoff evidence PNGs | `docs/apollo/handoffs/.../evidence/images/` | Internal verification per [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md); redistribution not auto-approved (BLK-S1-009) |
| Handoff CSV/MD | Handoff `standards/` | Immutable package content; SHA256 in [ds00_evidence_baseline.md](ds00_evidence_baseline.md) |
| External PDFs | `~/Projects/bridge-standards-research/260726_設計基準/` (11 files) | Repo-external; names/locations in [standards_source_inventory.md](../../step1/02_standards_baseline/standards_source_inventory.md) |
| APOLLO manuals | Repo-external | `RETURN_TO_APOLLO` items; not standards substitutes |
| DS-00 governance MD | `docs/apollo/design-standards/` | Project documentation; no standards text embedded |

**Acquisition rule for primaries:** Obtain licensed or organization-approved copies of 道示 volumes and JIS standards through official publishers or organizational standards libraries. Record acquisition path and publisher/MLIT/JRA metadata as printed on the official document in DS-01+ decision entries — do not commit full PDFs to spacer-clone without explicit rights review, and do not assert a specific distribution channel without recorded evidence.

---

## Evidence types and admissibility

| Evidence type | Admissible for | Not admissible for |
|---------------|----------------|-------------------|
| Handoff SHA256 / MANIFEST | Integrity verification | Clause interpretation |
| `ready_requirements.csv` row + evidence PNG | Location memo traceability | Numeric freeze |
| `external_traceability_crosswalk.csv` | Stage5A/5B crosswalk | Edition binding without verification |
| `jis_source_gaps.csv` | Gap inventory (34 rows; JIS-001…JIS-034) | JIS identity invention |
| Local PDF cover/colophon read (human) | Edition string verification | Automated OCR-only adoption |
| `inventory/pdf_version_priority_inventory.csv` (external) | Candidate edition ranking | Target Standard without DEC-DS00-0001 follow-through |

---

## Integrity verification

Verify package files against recorded hashes before citing them as evidence:

| File | SHA256 |
|------|--------|
| [PACKAGE_INFO.md](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/PACKAGE_INFO.md) | `44af9c84b5ce9646a5c207d5e432a261b5590ecc5ea8f6a5dd79d61ea993a6b3` |
| [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) | `6172927555afe28f442d6ea94c938452bceedfa6809d62d09d6e83f2afdb98fd` |
| [target_standard_decision.md](../../step1/02_standards_baseline/target_standard_decision.md) (historical) | `e58fc4be211bb874330e18c60c35b7de58471fae57008a380238de33c189a21a` |
| [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) (historical) | `2a99bab466121ff1b6813f8dd31eb14aa61ac8aa8da4330eb4274d699b93495e` |

Full manifest: [SHA256SUMS.txt](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/SHA256SUMS.txt).

---

## Prohibited evidence practices

| Practice | DS-00 disposition |
|----------|-------------------|
| Long quotations from 道示 / JIS in DS files | Forbidden |
| Embedding unsourced numeric constants | Forbidden |
| Treating Grok/Composer CLI output as committed evidence | Forbidden — survey summaries only |
| Editing handoff to change `NOT_SELECTED` or `NOT_READY` | Forbidden — use [decision_ledger.md](decision_ledger.md) |
| Using DDB or 便覧 values as JIS substitutes | Forbidden per gap HOLD policy |
| OCR-only promotion of image-export PDFs | Forbidden without human-verified locator (BLK-S1-008) |

---

## Legacy standard contamination control

```text
DS00_LEGACY_STANDARD_CONTAMINATION_VERDICT: PASS_WITH_CONTROL
```

| Risk | Control |
|------|---------|
| H29 vs R7 edition mixing | DEC-DS00-0001 adopts R7 改訂版 Target selection; H29-aligned supporting manuals remain `REFERENCE_ONLY` until DS-02 edition map |
| Composite/box example PDFs in local inventory | `OUT_OF_SCOPE` for Phase 1 (BLK-S1-010) |
| Historical APOLLO edition ≠ Target | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (DTR-04) |
| Stage5B location memos promoted to numerics | Fail-closed; DS-04/DS-05 gates |
| Prior `NOT_SELECTED` relabeled as superseded | Preserved as `REFERENCE_ONLY` historical evidence |

---

## Evidence recording format (DS-01+)

When evidence is acquired, record:

```text
evidence_id: EVD-DSxx-nnnn
artifact_path: <repo-relative or external path>
sha256: <if file>
locator: <volume/chapter/clause/table/page>
acquisition_method: <official publisher / org library / licensed copy>
verified_by: <role>
decision_id: DEC-DSxx-xxxx
```

DS-00 does not create `EVD-*` rows; it defines the requirement.
