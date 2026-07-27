# Adoption Status Model — DS-00

**Authority:** DS-00 / CURRENT INTEGRATION
**Date:** 2026-07-27

## Allowed statuses

DS-00 and all later DS stages **must** use only these statuses:

| Status | Meaning | May bind computation? |
|--------|---------|----------------------|
| `ADOPTED` | Supervisor-approved; evidence requirements satisfied for the item class | Yes, when all gates clear |
| `ADOPTED_WITH_CONDITION` | Directionally adopted; explicit conditions and blockers remain | No for blocked facets |
| `REFERENCE_ONLY` | Informative; not binding for adoption or numerics | No |
| `NOT_APPLICABLE` | Outside Phase 1 archetype or DS stage scope | No |
| `OUT_OF_SCOPE` | Explicitly excluded (product, phase, or governance) | No |
| `SUPERSEDED_EQUIVALENT` | Historical edition/source replaced by a named successor | No for superseded facet |
| `PROJECT_SPECIFIC` | Apollo/product convention; not a code mandate | Shell/preview only unless separately adopted |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Progress forbidden until listed evidence acquired and recorded | No |

**Prohibited in DS documents:** `TODO`, `TBD`, `TBC`, `UNKNOWN` as a live DS status, provisional-value language, unsourced design numerics, and long standards quotations. Historical source fields that record unresolved family/product identity (e.g. gap-register `UNKNOWN` labels) may be quoted when clearly attributed to immutable artifacts.

---

## DEC-DS00-0001 status assignments

| Item | Status | Conditions / blockers |
|------|--------|----------------------|
| TARGET_STANDARD selection (令和7年改訂版 label) | `ADOPTED` | None for selection itself |
| Official naming strings | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 (BLK-S1-001) |
| Publication metadata | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 (BLK-S1-001) |
| Edition verification | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 (BLK-S1-001, DTR-06) |
| Errata / 正誤表 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 (DTR-06) |
| Volume/clause mapping | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-01 / DS-02 |
| DESIGN_PHILOSOPHY (性能規定型設計) | `ADOPTED` | None at DS-00 |
| VERIFICATION_FORMAT method (部分係数法) | `ADOPTED` | None at DS-00 for method selection |
| Numeric partial factors | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04 (load-side) / DS-05 (resistance/verification-side); exact source + supervisor decision |
| Prior `NOT_SELECTED` (handoff / Step 1) | `REFERENCE_ONLY` | Historical evidence preserved on disk; superseded for live integration only by DEC-DS00-0001 Target selection |
| Handoff `APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY` | `REFERENCE_ONLY` | Unchanged on disk; full freeze `OUT_OF_SCOPE` for DS-00; gate DS-09 |
| JIS SOURCE GAP (JIS-001…JIS-034) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Per-row evidence in DS-02; historical gap register records unresolved family/product identity |
| Numeric records (loads, factors, limits) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | Per [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) rules |
| R2 鋼便覧 / H31 支承便覧 / DDB | `REFERENCE_ONLY` | Supporting manuals; not co-equal with 道示 |
| H29-aligned local PDF examples (composite/box) | `OUT_OF_SCOPE` for Phase 1 | BLK-S1-010 |
| Evidence PNG extracts | `REFERENCE_ONLY` | Location memos; not numeric authority |
| APOLLO historical edition baseline | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DTR-04 / BLK-S1-007 |
| Analyzer physical I/O | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-06 mandatory; BLK-S1-011 |

---

## Mapping from legacy vocabularies

Historical artifacts use non-DS statuses. DS integration interprets them without editing source files:

| Legacy label (artifact) | DS-00 integration mapping |
|-------------------------|---------------------------|
| `NOT_SELECTED` (Target Standard) | `REFERENCE_ONLY` historical evidence; live Target selection `ADOPTED` per DEC-DS00-0001 |
| `PLACEHOLDER` (Step 1 numeric governance) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `PROPOSED` / `REJECTED` (Step 1) | Remains on disk; new work uses DS allowed set only |
| `TARGET_STANDARD_NOT_SELECTED` (READY CSV column) | Historical column value; integration uses DEC-DS00-0001 |
| `HISTORICAL_BASELINE_UNKNOWN_EDITION` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` (DTR-04) |
| `HOLD` (JIS gaps) | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| Gap-register unresolved family/product identity | Quoted from historical CSV only; live status `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| AP-00 `NumericAuthority: PLACEHOLDER` | Aligns with `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` for adoption paths |
| AP-00 `TargetStandardStatus: NOT_SELECTED` | Code guard state; DS-00 records intended `ADOPTED` Target selection — alignment is AP-* work |

---

## Fail-closed rules

1. Any record missing `source_locator` for a claimed `ADOPTED` numeric → treat as `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.
2. `ADOPTED` Target selection does not promote metadata, numerics, JIS identities, or DS-05 classifications without a new `DEC-DS00-xxxx` or later DS decision.
3. `REFERENCE_ONLY` and `SUPERSEDED_EQUIVALENT` must not be promoted silently to `ADOPTED`.
4. Phase 1 OUT items must not leak constants into IN-scope modules (see [design_standard_scope.md](design_standard_scope.md)).
5. Golden expected values remain `OUT_OF_SCOPE` per DEC-S1-0011 until explicit DS authorization.
6. Full design freeze requires DS-09 clearance; DS-03 alone does not authorize freeze.

---

## Mandatory metadata (when status advances beyond DS-00)

Required before any item reaches `ADOPTED` for numerics or materials (DS-04+ loads; DS-05+ resistance/verification):

| Field | Requirement |
|-------|-------------|
| `source_doc_id` | Registered document identity |
| `source_locator` | Page + table/clause/figure |
| `edition` | Aligned with verified Target Standard edition |
| `decision_id` | `DEC-DSxx-xxxx` or supervisor equivalent |
| `applicability` | Bridge type, limit state, member class |

Incomplete metadata → remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.
