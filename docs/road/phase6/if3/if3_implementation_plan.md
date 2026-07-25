# IF3 Implementation Plan

**Date:** 2026-07-25
**Status:** DESIGN_DEFINED_IMPLEMENTATION_NOT_STARTED

## Implementation Rule

This document defines implementation slices only. It does not claim IF3 is implemented.

Each slice must start from the design in this package, stage explicit paths only, and run the relevant
typecheck/test gates. Stop immediately if dependencies differ from the expected design, if tests
fail, or if git status shows unexpected changes.

## Order

```text
IF3-A Contract Schema
  -> IF3-B Normalizer / Validator / Staleness
  -> IF3-C Persistence / Registry
  -> IF3-D Consumer Adapters
  -> IF3-E Migration / Compatibility / Completion Gate
```

## IF3-A: Contract Schema

Purpose: define the shared `FrameAnalysisResultResource` schema, types, version registry entry, and
diagnostic codes.

Scope:

- Add result-resource contract types.
- Add schema/version support.
- Add payload result-kind catalog types.
- Add diagnostics and validation issue codes.
- Define canonical checksum inputs.

Non-scope:

- No solver behavior change.
- No report/viewer/DRAFT behavior change.
- No persistence registration.

Likely files:

- `frontend/src/contracts/**`
- shared schema/type registry files used by contract validation
- backend schema/type equivalents if the backend owns runtime validation

Schema/migration impact: `IF3_SCHEMA_CHANGE_REQUIRED: YES`; add new result resource schema. Do not
claim old `AnalysisResult` migration yet.

Tests:

- Schema accepts valid resource.
- Missing `resultId`, provenance, checksum, or binding fails.
- Unknown major version fails closed.
- Duplicate/invalid result-kind payload fails.

Completion gate:

- Contract fields, statuses, diagnostics, and versioning are implemented and tested.

Stop conditions:

- Existing contract registry cannot support independent result-resource schema without redesign.
- Dependencies conflict with `BridgeFrameAnalysisDocument` schema/version rules.

## IF3-B: Normalizer, Validator, And Staleness

Purpose: convert raw solver output into validated IF3 resources and compute source-relative
availability/staleness.

Scope:

- Generate `analysisRunId` and `resultId` in backend-owned flow.
- Wrap old raw `AnalysisResult` as compatibility input.
- Populate source document binding, settings checksum, load context, solver metadata, provenance,
  diagnostics, payload, and result checksum.
- Validate numeric payload, stable entity IDs, result kinds, and binding.
- Implement staleness comparison against current source document/settings/load context.

Non-scope:

- No authoritative persistence registration.
- No Report/Viewer/DRAFT replacement yet.

Likely files:

- `backend/engine/results.py`
- `backend/engine/solver.py`
- `backend/app/main.py`
- new backend/frontend shared result validator modules
- `frontend/src/contracts/contentChecksum.ts`
- `frontend/src/contracts/provenance.ts`

Schema/migration impact: consumes IF3-A schema; may require source-document checksum utilities.

Tests:

- Raw success normalizes to `SUCCEEDED`.
- Solver failure normalizes to `FAILED`.
- NaN/Infinity produces `INVALID_NUMERIC_RESULT`.
- Source checksum mismatch computes `STALE`.
- Missing provenance fails closed.

Completion gate:

- No authoritative consumer can receive a raw result without IF3 validation in the new path.

Stop conditions:

- Backend cannot access exact source document identity/checksum at analysis-run time.
- Analysis settings/load checksums cannot be computed deterministically.

## IF3-C: Persistence And Registry

Purpose: persist and resolve immutable result resources through authoritative references.

Scope:

- Persist result metadata, resource payload when required, checksum, and diagnostics.
- Populate `BridgeFrameAnalysisDocument.persistedResultRefs` as authoritative references.
- Register and resolve current-result pointers when implemented.
- Validate duplicate IDs and unresolved references.
- Define reload availability catalog.

Non-scope:

- No final Report/Viewer/DRAFT replacement.
- No deletion/retention UI unless separately scoped.

Likely files:

- `frontend/src/contracts/bridgeFrameAnalysisDocument.ts`
- persistence/repository modules under backend/frontend storage areas
- project save/load paths in `backend/app/main.py` if the current storage layer remains the carrier

Schema/migration impact: likely `BridgeFrameAnalysisDocument` schema change to make
`persistedResultRefs` authoritative. Migration required for old documents with absent references.

Tests:

- Save/reload preserves result refs.
- Referenced result validates against checksum.
- Duplicate `resultId` blocks registration.
- Missing resource ref produces `MISSING`.
- Current pointer is validated before use.

Completion gate:

- Reload can build a deterministic result availability catalog.

Stop conditions:

- Atomic save/reload cannot include source document and result refs safely.
- Existing project persistence would require dual-writing target and legacy sources without an
  approved migration policy.

## IF3-D: Consumer Adapters

Purpose: move Report, Viewer, and DRAFT behind IF3-aware adapters.

Scope:

- Report/CSV/PDF consume result-resource DTOs.
- Viewer result view models use `resultId` and availability state.
- DRAFT sheet eligibility consumes valid result DTOs.
- PRINT consumes only valid report/DRAFT eligibility and physical-rendering DTOs.
- Disable export/render controls for missing, stale, invalid, unsupported, ambiguous, and blocked
  partial states.

Non-scope:

- No solver recomputation in adapters.
- No SP1 redesign except DRAFT adapter boundary.
- No OD8-04 visual release claim.

Likely files:

- `frontend/src/results/resultViewModel.ts`
- `frontend/src/exports/resultCsvExport.ts`
- `frontend/src/exports/resultPdfReport.ts`
- `frontend/src/exports/memberForceReport.ts`
- `backend/app/reports.py`
- Frame DRAFT modules when introduced

Schema/migration impact: no new schema beyond IF3-A/C unless adapter DTOs are persisted.

Tests:

- Valid result renders/exports.
- Stale result blocks export.
- Missing result shows unavailable state.
- Unsupported result version blocks.
- Ambiguous selection blocks.
- Raw `AnalysisResult` cannot reach authoritative output path.

Completion gate:

- PR-40/41/42 consumers share the same IF3 validation and staleness contract.

Stop conditions:

- A consumer requires solver rows not represented by the result payload schema.
- Viewer/DRAFT attempts to persist session state into source/result resources.

## IF3-E: Migration, Compatibility, And Completion Gate

Purpose: finish read-old/write-target compatibility and freeze IF3 gates.

Scope:

- Implement `OLD_ANALYSIS_RESULT_POLICY: READ_OLD_WRITE_TARGET`.
- Quarantine legacy results missing identity/binding/provenance as non-authoritative.
- Add migration diagnostics.
- Update PR readiness gates after IF3-A through IF3-D evidence.
- Record command/test evidence.

Non-scope:

- No final visual release while OD8-04 remains open.
- No claim that transient legacy results are losslessly migrated.

Likely files:

- migration registry/schema files
- result compatibility adapters
- Phase 6 readiness docs after implementation evidence exists

Schema/migration impact: migration registry required for result resource and likely frame-document
result refs.

Tests:

- Old raw result is readable as compatibility input only.
- Unknown version fails closed.
- Migration does not invent missing result identity or provenance.
- Save/reload/migration idempotence.
- Completion gate records exact commands and results.

Completion gate:

- IF3 implementation evidence can be used to reopen PR-40/41/42 conditions.

Stop conditions:

- Legacy result migration would require invented binding/provenance.
- Full validation commands fail.

