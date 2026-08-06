# 09 — Traceability & Versioning Contract

> **Authority:** Phase 3-I (specification freeze)
> **Base:** Phase 2 `09_traceability_and_evidence_spec.md` (4 granularity evidence fields + future numeric evidence), `08_report_data_contract_boundary.md` R-12, `reportModel.ts` metadata/checksum, `final_report.txt` Step 4-B/4-B-Closeout/5-3/6 history.
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Define the **traceability / provenance** fields the Report Model must carry so every emitted value can be audited back to a source revision, schema version, and generation commit — and so future numeric-result chapters (Phase 4+) can be added without re-specifying provenance.

## 2. Provenance field set (canonical)

| field | required? | display/internal | source | missing behavior | summary vs detail | future use |
|-------|-----------|------------------|--------|------------------|-------------------|------------|
| reportModelVersion | required | internal | `REPORT_MODEL_SCHEMA_VERSION` (reportModel.ts:18 = "1.0.0-development") | fail (never missing) | both (internal) | n/a |
| reportSpecVersion | required | internal | Phase 3 spec freeze marker (this Phase) | fail | both | spec evolution tracking |
| schemaVersion | required | internal | project.apolloBridgeStructureInput / apolloBsdd | `UNKNOWN`/`LEGACY_DATA` if absent | both | legacy detection (R-22) |
| applicationVersion | optional | internal | build/App version (options.appCommitSha path) | `NOT_CAPTURED_IN_BROWSER` | both | audit |
| generatedAt | required | internal | `new Date().toISOString()` (reportModel.ts:117/333) | fail | both | reproducibility |
| sourceRevision | required | internal | `draft.generatedAt` (reportModel.ts:116); "STALE_OR_UNGENERATED" if null | `STALE_OR_UNGENERATED` | both | input freshness |
| commitSha | optional → required-in-CI | internal | `options.appCommitSha` (reportModel.ts:306/342); `NOT_CAPTURED_IN_BROWSER` in browser | `NOT_CAPTURED_IN_BROWSER` | detail; summary prefix | build provenance |
| inputRevision | required | detail | `draft.generatedAt` (reportModel.ts:116/328) | `STALE_OR_UNGENERATED` if null | detail; summary=revision prefix | input identity |
| inputChecksum | required | both | `buildInputChecksum(draft)` (reportModel.ts:115/329) | fail | both (summary prefix) | integrity |
| resultChecksum | required | both | `computeContentChecksum(resultPayload)` (reportModel.ts:322/331) | fail | both | integrity |
| quantityChecksum | required | both | `computeContentChecksum(quantity)` (reportModel.ts:302/332) | fail | detail; summary=prefix | integrity |
| projectId | required | both | `project.project.id` (reportModel.ts:163/327) | fail | both | identity |
| bridgeId | optional | internal | (future bridge uid) | `NOT_AVAILABLE` | detail | cross-project trace |
| sourcePath | required (per value) | per-value | chapter_matrix.csv `data_source` | `MISSING` if no source | detail | audit trail |
| sourceSymbol | required (per value) | per-value | e.g. `draft.bridgeLength`, `reportModel.ts:175` | `MISSING` | detail | audit trail |
| authorizationStatus | required | both | fixed / DS-09 / NOT_SELECTED gate | fail | both | numeric gate (Phase 4+) |
| validationStatus | required | both | `validateBridgeStructureInputDraft` result | `INVALID`/`UNRESOLVED` | both | input validity |
| legacyStatus | required | both | schemaVersion presence + sidecar parse | `UNKNOWN`/carried | both | legacy detection |
| humanConfirmationStatus | required (CP-23) | both | H-01..H-03 (Phase 2.5 RESOLVED) | `RESOLVED` list | both (CP-23) | decision tracking |
| calculationReferenceIds | required | internal | reportModel.ts:344 (`GOLD-SP-001`,`GOLD-AN-001`,`GOLD-QTY-001`) | fail | detail | future numeric evidence anchors |
| dataSources | required (CP-25) | detail | chapter_matrix.csv basis column | fail | detail only | full audit trail |

## 3. Granularity (Phase 2 §4 evidence 4 granularity applied)

1. **Report-level:** reportModelVersion, schemaVersion, generatedAt, inputRevision, checksums, commitSha, calculationReferenceIds.
2. **Chapter-level:** availability (AVAILABLE/NOT_AVAILABLE/NOT_IMPLEMENTED/PROHIBITED/STALE), source path/symbol, validation status.
3. **Field-level:** raw value + display + unit + authorization + stale + missingReason.
4. **Element-level:** per-span, per-support, per-girder (CP-07/CP-09/CP-10/CP-11 detail).

## 4. Future numeric evidence (Phase 4+ extension points — NOT implemented in Phase 3)

When numeric results (CP-3x) become available under a later DEC-PHA grant, the provenance model extends with:
- `calculationReferenceId` (e.g. `GOLD-AN-001`, `GOLD-SP-001`) — already present (reportModel.ts:344).
- `formulaId` / `expressionRef` — reserved.
- `engineVersion` (solver/symbolic engine version) — reserved.
- `evaluationTime` / `iteration` — reserved.
- `numericAuthorizationId` (e.g. DS-09 cell id) — reserved.
- `engineeringReviewRef` (ER-001/ER-002 style) — reserved.

**Phase 3 does NOT create numeric result fields.** These extensions are declared as reserved placeholders so Phase 4 numeric implementation does not break the traceability contract.

## 5. Version semantics

- `REPORT_MODEL_SCHEMA_VERSION = "1.0.0-development"` (reportModel.ts:18): Report Model output schema version. Bumped via `DEC-PHA` only.
- `schemaVersion` (input): bridge-structure input draft schema (1.0.0 / 1.1.0-development per Step 4-B); `generateBsdd.ts:548-556` migrates legacy → current (DEC-PHA-0002).
- `reportSpecVersion`: Phase 3 spec freeze marker (this document). Distinguishes Report Model *schema* (data shape) from Report Model *spec* (this contract).

## 6. Reproducibility & integrity

- `inputChecksum + resultChecksum + quantityChecksum` enable exact regeneration detection (reportModel.ts:321-332).
- `inputRevision` (draft.generatedAt) + `generatedAt` (report time) enable staleness reasoning.
- `commitSha` (when captured in CI) anchors to exact build.
- Phase 4 must expose all of the above in CP-25 (evidence) detail; summary emits reportId + checksum prefixes.

## 7. Phase 4 obligations

- Emit all required provenance fields above.
- Never drop checksums/source under STALE/missing (preserve + tag).
- `dataSources[]` per CP-25 links every chapter to its `chapter_matrix.csv` basis.
- Reserve future numeric evidence slots without emitting values (PROHIBITED/UNKNOWN).

## 8. Status

- Traceability & versioning contract: FROZEN (with Phase 4+ numeric evidence extension declared).
- HEAD: 6771eb7 (no code change).
