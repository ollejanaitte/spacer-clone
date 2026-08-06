# 12 — Report Model Validation Rules

> **Authority:** Phase 3-L (specification freeze)
> **Purpose:** Phase 4 validator acceptance criteria (machine-actionable). No TS/JSON Schema here.
> **Base:** `02_report_model_responsibility.md`, `05_chapter_payload_contract.md`, `06_status_and_authorization_contract.md`, `07_validation_and_missing_data_contract.md`, `chapter_payload_matrix.csv`, `status_code_matrix.csv`.
> **Judge:** Apollo architecture.

## 1. Purpose

Define the **complete set of invariants** a `ReportModel` must satisfy. Phase 4 implements a validator from these rules; Phase 4 build/tests fail if any rule is violated. This doc is the spec-only freeze.

## 2. Validation rule table

| rule_id | rule | violation → | basis |
|---------|------|-------------|-------|
| VR-01 | Required metadata present (`schemaVersion`, `reportId`, `projectId`, `generatedAt`, `inputChecksum`, `resultChecksum`, `quantityChecksum`) | FAIL (no model) | `09_traceability_and_versioning_contract.md` |
| VR-02 | No duplicate `chapter_id` | FAIL | `05_chapter_payload_contract.md` |
| VR-03 | Every `chapter_id` ∈ CP-{01..25, 30..34} (CP-* canonical) | FAIL | `05_chapter_payload_contract.md` §2 |
| VR-04 | No CH-* chapter_id in output | FAIL (conflict) | `05_chapter_payload_contract.md` §2; DEC-PHA-0005 |
| VR-05 | Every value has allowed status code (§06 set) | FAIL | `06_status_and_authorization_contract.md` |
| VR-06 | Numeric value without unit → FAIL **only if** the quantity requires a unit (counts = `count` allowed; status codes have no unit) | WARN→FAIL on design numerics | `08_units_precision_and_display_contract.md` §3 |
| VR-07 | Numeric/boolean value missing `source.path/symbol` → FAIL | FAIL | `09_traceability` §2; `08` Principle 4 |
| VR-08 | Numeric design value displayed as `AVAILABLE`/`ADOPTED` → FAIL | FAIL (authorization breach) | `06` §3.2; O-11..O-13 fail-closed |
| VR-09 | PROHIBITED value (O-19..O-30) present in payload → FAIL | FAIL | `07` §5.4; `06` §4 |
| VR-10 | CP-08/15/16/30..34 emit a data value (not status) → FAIL | FAIL | `chapter_payload_matrix.csv` forbidden rows |
| VR-11 | STALE report exports a payload with `stale:false` on stale sources → FAIL | FAIL | `06` §4; `07` §3.5 |
| VR-12 | CP-13 CONTINUOUS emits section values → FAIL (must be NOT_AVAILABLE) | FAIL | U-03 verdict B; `05` CP-13 |
| VR-13 | Legacy `schemaVersion` missing but claimed current → FAIL | FAIL | `10_legacy_and_compatibility_contract.md` §3; R-22 |
| VR-14 | `legacyStatus` inconsistent with `schemaVersion` → FAIL | FAIL | `09_traceability` §2 |
| VR-15 | Summary status (STALE/NOT_AUTHORIZED/PROHIBITED/NOT_AVAILABLE) ≠ detail status for same source → FAIL | FAIL | `11` §6 R-9 |
| VR-16 | Evidence (checksums) inconsistent between CP-25 summary prefix and detail → FAIL | FAIL | `09` §6; `11` §5 R-9 |
| VR-17 | Version/schemaVersion not in `schemaVersions[]` → FAIL | FAIL | `09` §5; reportModel.ts:343 |
| VR-18 | `generatedAt` not valid ISO-8601 or in future → WARN→FAIL | FAIL | `09` §2 |
| VR-19 | `commitSha` not 40-hex (when present) → WARN; empty→NOT_CAPTURED → FAIL in CI | WARN/CI-FAIL | `09` §2 |
| VR-20 | Empty report (no chapters / zero rows) → FAIL | FAIL | `02` R-01 metadata; `11` §7 |
| VR-21 | Invalid report (validation INVALID/UNRESOLVED) still builds payload with INVALID tags → allowed; export rejected | reject export | `07` §3.2 (fail-closed) |
| VR-22 | Zero-fill detected (numeric value `0` for a MISSING input) → FAIL | FAIL | `07` §5.1; `reportModel.ts:85-93` |
| VR-23 | `designOrConstructionUse != "PROHIBITED"` → FAIL | FAIL | `06` §3.1; reportModel.ts:72 |
| VR-24 | `authorizationStatus != "NOT_GRANTED"` → FAIL | FAIL | `06` §3.1; reportModel.ts:71 |
| VR-25 | `developmentLabel != "UNVERIFIED_DEVELOPMENT_ONLY"` → FAIL | FAIL | reportModel.ts:73 |
| VR-26 | `formalOkNgEmitted != false` → FAIL | FAIL | `09` §2; reportModel.ts:261,345 |

## 3. Violation handling

| severity | action |
|----------|--------|
| FAIL | Report Model generation **aborts** (no payload emitted); log reason; mark INVALID. |
| WARN | Payload emitted with warning tag; logged in CP-20; export still subject to STALE/gate checks. |
| CI-FAIL | Build/CI red if in CI context (COMMIT_SHA present); warn-only in browser (`NOT_CAPTURED_IN_BROWSER`). |

## 4. Validator surface (Phase 4 design note)

The Phase 4 validator operates on a frozen `ReportModel`:
- input: `ReportModel` (built by Phase 4 generator).
- output: `{ valid: boolean, errors: ValidationError[], warnings: ValidationWarning[] }`.
- rules: VR-01..VR-26 applied in order; short-circuit on FAIL only after collecting all FAILs.
- export gate: `assertDevelopmentReportExportable` (STALE/invalid reject) + `assertFormalReportRejected` run **before** any renderer.

## 5. Phase 4 obligations

- Implement a `validateReportModel(model): {valid, errors, warnings}` covering VR-01..26.
- Assert in tests: a CONTINUOUS report satisfies VR-12 (CP-13 NOT_AVAILABLE); a PROHIBITED item never appears (VR-09/10); summary/detail status parity (VR-15); no CH-* (VR-04).
- Run validator before every report render/export.

## 6. Status

- Report Model validation rules: FROZEN (VR-01..VR-26 actionable spec).
- HEAD: fd7d0fd (no code change).
