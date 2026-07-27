# JIS Version Policy — DS-02

**Authority:** DS-02 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Parent:** [DEC-DS02-0001](../00_governance/decision_ledger.md#dec-ds02-0001)
**Repository baseline:** `128c0cb724270f59ada88b45a11bc1b264a57be4`

This policy governs how Apollo design standards treat JIS editions referenced by the adopted Target Standard (道路橋示方書・同解説 令和7年改訂版, Ver2.00 + 20260331 errata overlay per DEC-DS01-0001). It applies to all rows in [jis_source_register.csv](jis_source_register.csv).

---

## Core rule: no automatic newest-version adoption

Apollo **must not** adopt the latest published JIS edition, JIS "current edition" metadata, or any successor standard **unless** all of the following are satisfied for that specific register row:

1. **Primary-standard cited edition** — Human visual confirmation identifies the exact JIS number and edition year (or revision identifier) **as cited** in the licensed 道路橋示方書・同解説 Ver2.00 text, with 20260331 errata overlay applied where relevant.
2. **Official identity metadata** — JIS standard designation (`jis_number`, `jis_title`) confirmed; JISC official approval/establishment/status metadata (`edition_year`, `revision_status`) confirmed from JISC records. Do **not** treat JSA or any licensed publisher as issuing body — `issuing_body` remains blank until official JISC metadata is recorded.
3. **Supervisor equivalence decision** — If the cited edition differs from the current JIS catalog edition, a `DEC-DS02-xxxx` or later supervisor decision records `equivalence_status` and any conditions before status advances beyond `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.
4. **Register update** — [jis_source_register.csv](jis_source_register.csv) row updated with `evidence_location`, `evidence_checksum`, `reviewed_by`, and `reviewed_at`; immutable handoff [jis_source_gaps.csv](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv) remains historical provenance only.

**Prohibited:** Substituting "newest JIS," catalog-default edition, third-party equivalence tables, or 道示/DDB text for missing JIS primaries.

---

## Metadata classes (distinct fields — do not conflate)

| Class | Register fields | Binding role |
|-------|-----------------|--------------|
| **JIS standard designation** | `jis_number`, `jis_title` | Identified standard number and official title |
| **JISC official approval / establishment / status** | `edition_year`, `revision_status` | Authoritative edition/revision state from JISC metadata |
| **Issuing body** | `issuing_body` | Blank at DS-02; populate only from official JISC metadata — not from JSA or publisher role |
| **Primary-standard cited edition** | `cited_by_primary_standard`, `citing_volume`, `citing_chapter`, `citing_clause`, `citing_table`, `edition_year` (as cited) | **Authoritative for design adoption** — the edition the Target Standard invokes |
| **Current JIS catalog metadata** | `jis_number`, `jis_title`, `revision_status` from JISC | Informative catalog state; **not** auto-adopted |
| **Superseded-equivalent** | `replacement_standard`, `equivalence_status` = `SUPERSEDED_EQUIVALENT` | Historical cited edition replaced by named successor; requires supervisor decision before binding numerics |
| **Project override** | `project_specific_override` | Apollo/product convention only; `PROJECT_SPECIFIC` per [adoption_status_model.md](../00_governance/adoption_status_model.md); does not satisfy JIS primary evidence |
| **Applicability (blocker conditions)** | `applicability` | At DS-02 stores per-row acceptance blocker conditions — not material/product/test scope |
| **Material / product / test standards** | `material_or_product` + JIS identity fields | Product-grade and test-method scope; populate here (or via schema split / `notes`) — must not overwrite `applicability` blocker text without explicit schema change |

---

## Standard-type handling

| JIS role | Version rule |
|----------|--------------|
| Material specifications (e.g. steel grades) | Cited edition from 道示 clause; grade/designation must match cited JIS table |
| Product standards (bearings, fasteners, etc.) | Cited edition only; product marking and test clauses from cited edition |
| Test methods | Cited edition for acceptance criteria referenced by 道示; latest test JIS not auto-substituted |
| Withdrawn or merged standards | `replacement_standard` + supervisor `equivalence_status`; no silent redirect |

---

## Acquisition and ownership

| Field | Value |
|-------|-------|
| **Owner** | `EXTERNAL_JIS_RESEARCH` (per historical handoff gap register) |
| **Method** | Licensed copies via JSA or other licensed official provider / organizational standards library — publication/acquisition channel only |
| **Verification** | Per-row update in [jis_source_register.csv](jis_source_register.csv); checksum of licensed PDF or authorized extract in `evidence_checksum` |
| **Non-duplication** | One register row per `source_gap_id`; after identification, duplicate `jis_number` values require supervisor merge decision before any row reaches `ADOPTED` |

---

## DS-02 posture

At DS-02 authoring, all 34 historical `source_gap_id` rows (JIS-001…JIS-034) remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`. No JIS identity, cited edition, or equivalence decision is recorded. See [jis_gap_resolution_report.md](jis_gap_resolution_report.md).

---

## Related documents

| Document | Role |
|----------|------|
| [jis_source_register.csv](jis_source_register.csv) | Per-gap JIS identity and adoption register |
| [jis_gap_resolution_report.md](jis_gap_resolution_report.md) | DS-02 gap classification and verdict set |
| [adoption_status_model.md](../00_governance/adoption_status_model.md) | Allowed adoption statuses |
| [ds00_evidence_baseline.md](../00_governance/ds00_evidence_baseline.md) | BLK-S1-002 JIS SOURCE GAP blocker matrix |
