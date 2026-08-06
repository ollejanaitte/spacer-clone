# 07 — Validation & Missing Data Contract

> **Authority:** Phase 3-G (specification freeze)
> **Base:** Phase 2 `08_report_data_contract_boundary.md` §Principle 7 (missing reason), `10_acceptance_criteria.md`; `reportModel.ts` (`row()` no-zero-fill, `:238-253` NOT_AVAILABLE rows); Phase 2.5 `07_prohibited_output_reconfirmation.md`.
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Define how the Report Model handles **every** data-quality / validation case during generation — when it continues, when a chapter is skipped, what placeholder/warning/error to emit, and which cases require human confirmation. Guarantees the no-zero-fill / fail-closed invariants.

## 2. Validation case matrix

| case | generate continue? | chapter emitted? | item display | placeholder | severity | source retained? | human conf? | summary/detail |
|------|--------------------|------------------|--------------|-------------|----------|-------------------|-------------|----------------|
| required missing (input null) | yes | yes | NOT_AVAILABLE | NOT_AVAILABLE + missingReason | warn | yes (null) | no (auto) | both (NOT_AVAILABLE) |
| optional missing (input null) | yes | yes | NOT_AVAILABLE | NOT_AVAILABLE + reason | info | yes | no | both |
| invalid value (schema/type) | yes (tag) | yes | INVALID | INVALID + reason | error | yes | yes | both |
| out-of-range | yes (tag) | yes | UNVERIFIED/INVALID | NOT_AVAILABLE or value+tag | warn/error | yes | if error→yes | both |
| schema mismatch (unknown field) | yes (reject field) | yes | persistenceIssues row | NOT_AVAILABLE | error | yes | yes | detail (CP-19) |
| legacy transformed (v1.0.0) | yes | yes | value + LEGACY_DATA tag | NOT_AVAILABLE if unfillable | warn | yes + legacyStatus | no (auto) | both |
| unsupported continuous input (curve/skew) | yes | NOT_IMPLEMENTED | NOT_AVAILABLE | NOT_AVAILABLE | warn | yes | no | CP-08 NOT_IMPLEMENTED; CP-18 NOT_AVAILABLE |
| STALE (regen drift) | yes (build) | yes | STALE badge + last value | n/a | warn | yes | no | both (export rejected) |
| partial data (some spans null) | yes | yes | per-element NOT_AVAILABLE | NOT_AVAILABLE per missing | warn | yes | no | detail |
| failed import (no apolloBridgeStructureInput) | yes | yes | NOT_AVAILABLE/LEGACY | createEmptyBridgeStructureInputDraft fallback | error | none (empty) | yes | both (CP-21 STALE) |
| failed visualization (no solids) | yes | yes | NOT_AVAILABLE | NOT_AVAILABLE | warn | yes | no | CP-18 NOT_AVAILABLE |
| failed STL (no mesh) | yes | yes | NOT_AVAILABLE | NOT_AVAILABLE | warn | yes | no | CP-18 NOT_AVAILABLE |
| unknown source (unmapped field) | yes | yes | NOT_AVAILABLE | NOT_AVAILABLE + persistenceIssues | error | yes | yes | CP-19 detail |

## 3. Case handling (authoritative)

### 3-1. Required missing → NOT_AVAILABLE (never 0-fill)
- `reportModel.ts:85-93` `row()` converts `null/undefined/""` → `"NOT_AVAILABLE"`.
- `reportModel.ts:357` "No zero-fill: emit NOT_AVAILABLE placeholders for missing analysis series."
- CP-13 CONTINUOUS dims incomplete → NOT_AVAILABLE "断面入力不完全" (reportModel.ts:216); U-03 verdict B.

### 3-2. Invalid / schema mismatch → INVALID (fail-closed)
- `validateBridgeStructureInputDraft` / `validateBridgeLayoutContract` diagnostics → CP-19 `persistenceIssues` / `issues` (reportModel.ts R-09).
- Invalid value → `INVALID` + reason, never surfaced as `AVAILABLE`.
- Unknown field → persistenceIssues (unknown-field rejection); value `NOT_AVAILABLE`.

### 3-3. Legacy (v1.0.0) → LEGACY_DATA (surfacing, not hiding)
- Missing `schemaVersion` → `UNKNOWN`/`LEGACY_DATA` (Phase 2 `08` Principle 12).
- `generateBsdd.ts:548-556` `parseBridgeStructureInputDraft` forward-fills sidecar to 1.1.0-development defaults (minimal compat shim; DEC-PHA-0002).
- Legacy fields kept + tagged; never silently reinterpreted as current.

### 3-4. Unsupported continuous input → NOT_IMPLEMENTED/PROHIBITED
- curve/skew → CP-08 `NOT_IMPLEMENTED` (artifactBundle.ts:235-239, H-03 DEC-PHA-0003).
- Numeric results → CP-30..34 `NOT_AVAILABLE`/`NOT_AUTHORIZED`; O-19..O-30 `PROHIBITED` (absent).

### 3-5. STALE → badge + preserved value + export rejected
- `isBridgeStructureGenerationCurrent` false → `stale=true` (reportModel.ts:114,304).
- `assertDevelopmentReportExportable` rejects STALE export (reportModel.ts:96).
- Summary shows STALE flag; detail preserves last value + reason.

## 4. Missing-data representation (per status code)

| data state | Report Model code | display | emit value? | principle |
|------------|-------------------|---------|-------------|-----------|
| input null (required) | MISSING → NOT_AVAILABLE | "NOT_AVAILABLE" | no | no zero-fill (reportModel.ts:85-93,357) |
| feature not built | NOT_IMPLEMENTED | "NOT_IMPLEMENTED" | no | surface gap |
| invalid | INVALID | "INVALID" | no | fail-closed |
| forbidden numeric | PROHIBITED | (absent) | **never** | policy |
| gate rejected numeric | NOT_AUTHORIZED | "NOT_AUTHORIZED" | no | never ADOPTED |
| stale | STALE | badge + last value | preserved (export rejected) | preserve + reject |
| legacy | LEGACY_DATA | tag | value if available | surfaced, not hidden |
| empty string "" | MISSING | "NOT_AVAILABLE" | no | `row()` rule |

## 5. Principles (Phase 4 must enforce)

1. **No zero-fill** — missing numeric = `NOT_AVAILABLE`, never `0`.
2. **No blank masking** — missing ≠ empty string; render explicit status.
3. **NOT_IMPLEMENTED never shown as empty** — emit `NOT_IMPLEMENTED` placeholder.
4. **Forbidden ≠ Available** — PROHIBITED/D-class data absent (status-only), never rendered as a denied-but-present value.
5. **Invalid ≠ Available** — INVALID fails closed; never surfaced as a usable result.
6. **Fail-closed generation** — invalid/legacy-transformed-with-unknown mapping → INVALID/HUMAN_CONFIRMATION_REQUIRED, not silently AVAILABLE.
7. **Source retention** — every placeholder carries `source.path/symbol` + `missingReason`; no evidence loss on missing values.
8. **Human confirmation triggers** — INVALID, schema mismatch, failed import, conflicting evidence → `humanConfirmationItems` flagged in CP-23 (H-01..H-03 already RESOLVED; new CONFLICTING_EVIDENCE if found).
9. **Summary/detail consistency** — same codes/projections as `05_chapter_payload_contract.md` §4; summary is a strict subset.

## 6. Phase 4 obligations

- Implement `row()`-equivalent (no zero-fill) for all CP-* payload values.
- Emit `missingReason` for every NOT_AVAILABLE/NOT_IMPLEMENTED/INVALID.
- CP-19 carries `persistenceIssues` + `issues` (validateBridgeStructureInputDraft + layoutValidation).
- Prohibited items (CP-08/15/16/30..34; O-19..O-30) **absent** from value payload; status-only.
- Retain gates: `assertDevelopmentReportExportable` (STALE reject), `assertFormalReportRejected`.

## 7. Status

- Validation & missing-data contract: FROZEN.
- HEAD: 1b6afd4 (no code change).
