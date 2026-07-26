# Material Property Governance — P02

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Scope:** Phase 1 — non-composite steel plate girder + RC deck

## Policy statement

Every material property value used in Step 1 planning artifacts, constants tables, or future implementation specs must be **fully traceable** or explicitly marked **PLACEHOLDER**. Missing mandatory metadata → **fail-closed** (reject adoption; do not infer from secondary sources).

While **Target Standard = NOT_SELECTED**, no material property may be promoted to **ADOPTED** status.

---

## Mandatory fields (per material property record)

| Field | Requirement |
|-------|-------------|
| `value` | Numeric or enumerated literal (no implicit defaults) |
| `unit` | SI or document-native unit with conversion rule if dual |
| `source_doc_id` | Registered ID (e.g. `SRC-RBS-II`, `SRC-JIS-GAP`, handoff `DOC-*`) |
| `source_locator` | Page **and** table/clause/figure identifier |
| `edition` | Document edition string (must match Target Standard when selected) |
| `applicability` | Phase1 scope tag + member type (e.g. `steel_main_girder`, `rc_slab_rebar`) |
| `adoption_status` | `PLACEHOLDER` \| `PROPOSED` \| `ADOPTED` \| `REJECTED` |
| `decision_id` | `DEC-S1-xxxx` when `ADOPTED`; blank only for `PLACEHOLDER` |

**Fail-closed rule:** If any mandatory field is blank or `UNKNOWN`, the record is **INVALID** and must not appear in design-freeze or implementation-bound artifacts.

---

## Source hierarchy for material properties

| Priority | Source type | Allowed use while NOT_SELECTED |
|----------|-------------|----------------------------------|
| 1 | Target 道示 edition (when selected) | PROPOSED only after Target decision |
| 2 | JIS primary standard (steel/rebar/bolt) | **Blocked** — 34 gaps; HOLD |
| 3 | Supporting 便覧 / DDB | Location memo / practice reference only; **not** ADOPTED constants |
| 4 | Handoff evidence PNG | Traceability pointer only; not standalone numeric authority |
| 5 | Inference | **Forbidden** unless labeled `INFERENCE` + decision log entry |

Handoff rule (Rank 1): `jis_source_gaps.csv` — `interim_treatment=HOLD — do not invent from secondary sources`.

---

## Material categories and current status

| Category | Examples | Primary authority | P02 status |
|----------|----------|-------------------|------------|
| Structural steel grades | SM490Y, SN490B, etc. | JIS steel + 道示 Ⅱ allowable tables | **BLOCKED** (JIS gap + NOT_SELECTED) |
| Rebar products | SD390, SD490; bar sizes | JIS rebar + 道示 Ⅲ | **BLOCKED** |
| High-strength bolts | F10T, F8T; hole diameters | JIS bolt + 道示 Ⅱ splice rules | **BLOCKED** |
| Concrete material | fck, Ec, unit weight | 道示 Ⅰ/Ⅲ | Location memos only; **not ADOPTED** |
| Physical constants | Steel unit weight, g | 道示 Ⅰ / Ⅱ | RDY-004 location memo; **not ADOPTED** |
| DDB standard sections | Plate thickness combos | DDB 2021 | Practice reference; **not ADOPTED** |

---

## Adoption status definitions

| Status | Meaning |
|--------|---------|
| `PLACEHOLDER` | Slot reserved; value explicitly absent; allowed in planning schemas |
| `PROPOSED` | Full metadata present; awaits Target Standard + supervisor decision |
| `ADOPTED` | Bound by `DEC-S1-xxxx`; eligible for design-freeze artifacts |
| `REJECTED` | Superseded or fail-closed invalid; retained for audit trail only |

**While Target Standard = NOT_SELECTED:** maximum status = `PLACEHOLDER` or `PROPOSED` (supervisor review queue). **`ADOPTED` is forbidden.**

---

## Validation checks (Step 1)

Before any P03+ artifact references a material value:

1. Verify all 8 mandatory fields populated (or status = `PLACEHOLDER` with explicit `TBD`).
2. Cross-check `source_doc_id` against [standards_applicability_matrix.csv](standards_applicability_matrix.csv).
3. If `source_doc_id=SRC-JIS-GAP`, reject unless linked JIS gap closed (ISS-S1-009).
4. If value copied from DDB/便覧, flag `SUPPORTING_ONLY` — cannot satisfy JIS-blocked requirements.
5. Log exceptions in `decision_log.md` with `DEC-S1-xxxx`.

---

## Blocker linkage

| Blocker ID | Condition |
|------------|-----------|
| BLK-S1-001 | Target Standard NOT_SELECTED |
| BLK-S1-002 | JIS primaries absent (34 gaps) |
| BLK-S1-005 | Material ADOPTED without decision_id |

See [standards_blocker_register.csv](standards_blocker_register.csv).
