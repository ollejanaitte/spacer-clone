# 06 — Status & Authorization Contract

> **Authority:** Phase 3-F (specification freeze)
> **Base:** Phase 2 `07_warning_and_status_message_spec.md` (10 state codes), `08_report_data_contract_boundary.md` §R-10/R-11/value_kind, `06_output_permission_matrix.md` (16 classifications), Phase 2.5 H/U decisions.
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Freeze the canonical **status code** set and **authorization** contract every Report Model value/chapter must carry, so Phase 4 emits consistent, non-overridable numeric-rejection semantics for continuous girder.

## 2. Status code set (canonical)

From Phase 2 §07 (10 state codes) extended for completeness:

| code | display | severity | when used | emit value? | report-model handling | phase4_impl note |
|------|---------|----------|-----------|-------------|------------------------|------------------|
| AVAILABLE | (value present) | info | complete, non-STALE, non-numeric-restricted input | yes | value + display | n/a |
| PARTIALLY_AVAILABLE | partially present | warn | partial continuous (e.g. SIMPLE section dims present, CONTINUOUS not) | yes (partial) | emit NOT_AVAILABLE sub-rows | n/a |
| NOT_IMPLEMENTED | NOT_IMPLEMENTED | warn | feature not built (CP-08/15/16/30..34; O-28 camber) | placeholder only | `row("x", null, "", "NOT_IMPLEMENTED")` | never emits numeric |
| NOT_AUTHORIZED | NOT_AUTHORIZED | high | numeric design value present but gate rejected (DS-09) | no (never as ADOPTED) | emit NOT_AUTHORIZED, not the value-as-authorized | ADOPTED fail-closed |
| PROHIBITED | PROHIBITED | high | output forbidden by policy (O-19..O-30; continuous drawings) | **never emitted** | item absent; chapter emits status only | never implement for continuous numerics |
| STALE | STALE | warn | input newer than generation (`isBridgeStructureGenerationCurrent` false) | value preserved (last) + STALE badge; export rejected | `assertDevelopmentReportExportable` rejects STALE export (reportModel.ts:96) | keep invariant |
| INVALID | INVALID | error | schema/type error (persistenceIssues / unknown field) | no | emit INVALID + reason | fail-closed |
| MISSING | MISSING | warn | required input absent (null) | NOT_AVAILABLE | `row(..., null) → "NOT_AVAILABLE"` (reportModel.ts:85-93) | never 0-fill |
| LEGACY_DATA | LEGACY_DATA | warn | v1.0.0 schemaVersion missing / old sidecar shape | preserve + tag | mark schemaVersion=UNKNOWN/LEGACY_DATA | forward-fill default (generateBsdd.ts:553) |
| HUMAN_CONFIRMATION_REQUIRED | HUMAN_CONFIRMATION_REQUIRED | high | H-01..H-03 status in CP-23 | status only | Phase 2.5 resolved → emit RESOLVED | (all resolved now) |
| CONFLICTING_EVIDENCE | CONFLICTING_EVIDENCE | high | contradictory source evidence | status only | review + reconcile | (no unresolved conflict) |
| NOT_APPLICABLE | NOT_APPLICABLE | info | item irrelevant to this bridge (e.g. camber not modeled) | placeholder only | emit NOT_AVAILABLE/NOT_IMPLEMENTED with reason | n/a |

> ■ **DISTINCTIONS (must not conflate in Phase 4):**
> - `NOT_AUTHORIZED` = value exists but **numeric gate rejected** (high) — NOT the same as `PROHIBITED`.
> - `PROHIBITED` = **policy forbids** emitting this class at all (O-19..O-30) — the item must be **absent**, not rendered as a denied value.
> - `NOT_IMPLEMENTED` = feature built-not (structural absence) — placeholder emitted.
> - `MISSING` = required input `null` — rendered `NOT_AVAILABLE`.
> - `STALE` = generation drift — value preserved + badge, export rejected.
> - `INVALID` = data error — fail-closed (not AVAILABLE).

## 3. Authorization contract

### 3-1. Report-level (fixed, never granted for continuous development)
| field | value | basis |
|------|-------|-------|
| `authorizationStatus` | `NOT_GRANTED` | final_report.txt invariant; reportModel.ts:71 |
| `designOrConstructionUse` | `PROHIBITED` | reportModel.ts:72 |
| `developmentLabel` | `UNVERIFIED_DEVELOPMENT_ONLY` | reportModel.ts:73 |
| `formalOkNgEmitted` | `false` | reportModel.ts:345/261 |

### 3-2. Value-level (authorizationStatus per value)
Canonical set: `NOT_AUTHORIZED | UNVERIFIED | ADOPTED` (Phase 2 `08` §Principle 5).
- `UNVERIFIED` — input-derived geometry/counts/lengths (CP-05..CP-11, CP-18, CP-19).
- `NOT_AUTHORIZED` — any numeric design value / DS-09 cells (CP-12 adoption, CP-13 when emitted for SIMPLE, CP-22, CP-34).
- `ADOPTED` — **fail-closed under NOT_SELECTED** (Target Standard NOT_SELECTED → never ADOPTED for continuous numerics; BridgeStructureInputPanel.tsx:256). Phase 4 must never newly produce `ADOPTED` numerics (O-11..O-13 adoption status may be PENDING/UNKNOWN, never ADOPTED).

### 3-3. Gate integrity (Phase 4 must preserve)
- `assertFormalReportRejected` — formal PDF always rejected (reportModel.ts:103-107).
- `assertDevelopmentReportExportable` — rejects STALE / non-DEVELOPMENT / !=NOT_GRANTED (reportModel.ts:95-101).
- `assertIntegratedExportAllowed` (outputIntegration.ts:169) — consistency gate retained.
- Numeric authorization `NOT_GRANTED`/`NOT_AUTHORIZED` propagated; never `ADOPTED`/`AUTHORIZED`.

## 4. Status code matrix (machine: status_code_matrix.csv)

Key rows enforced per chapter/value (full set in CSV):

| use-case | code | emit value? | source |
|----------|------|-------------|--------|
| input geometry present | UNVERIFIED | yes | reportModel.ts:184-188 |
| CP-13 SIMPLE section dims complete | UNVERIFIED | yes (7 rows) | reportModel.ts:206-216 |
| CP-13 CONTINUOUS | NOT_AVAILABLE | placeholder | reportModel.ts:216; U-03 B |
| CP-30..34 numeric results | NOT_AVAILABLE | NEVER | reportModel.ts:238,243,248,253; O-19..O-30 |
| CP-34 demand | NOT_AUTHORIZED | NEVER | reportModel.ts:259-261 |
| DS-09 cell | NOT_AUTHORIZED | NEVER | 08_numeric_authorization_gate.md |
| CP-08/15/16/3x data | PROHIBITED | NEVER | chapter_matrix forbbiden; O-19..O-30 |
| STALE | STALE badge + last value | export rejected | isBridgeStructureGenerationCurrent; reportModel.ts:96 |
| missing input | NOT_AVAILABLE | placeholder | reportModel.ts:85-93 (no zero-fill) |
| feature not built | NOT_IMPLEMENTED | placeholder | reportModel.ts:238 etc. |
| v1.0.0 legacy | LEGACY_DATA | tag | generateBsdd.ts:553 migration |

## 5. Phase 4 obligations

- Map every value/chapter to exactly one status code from `status_code_matrix.csv`.
- Enforce: `NOT_AUTHORIZED ≠ PROHIBITED ≠ NOT_IMPLEMENTED ≠ MISSING ≠ STALE ≠ INVALID`.
- `PROHIBITED` items (O-19..O-30; CP-08/15/16/30..34) must be **absent** from payload (status placeholder only, never the value-as-result).
- Retain all three gates (`assertFormalReportRejected`/`assertDevelopmentReportExportable`/`assertIntegratedExportAllowed`).

## 6. Status

- Status & authorization contract: FROZEN. `status_code_matrix.csv` machine form.
- HEAD: 4bf43bc (no code change).
