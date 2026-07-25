# IF3 Completion Gate

**Date:** 2026-07-25
**Status:** DESIGN_DEFINED_IMPLEMENTATION_CONDITIONAL

## Gate Semantics

`PASS` means this design package defines the gate sufficiently for review. `CONDITIONAL` means the
implementation must still prove the gate. No implementation gate is marked complete by these docs.

## Machine-Checkable Gates

| Gate | Status | Required evidence |
| --- | --- | --- |
| `IF3_CONTRACT_VERDICT_PRE_DESIGN_RECORDED` | PASS | Docs state IF3 was `NOGO` before design |
| `RESULT_RESOURCE_CONTRACT_DEFINED` | PASS | `FrameAnalysisResultResource` fields, statuses, payload, identity, versioning defined |
| `SINGLE_SOURCE_OF_TRUTH_DEFINED` | PASS | Source flow defined from `BridgeFrameAnalysisDocument` to normalized IF3 resource to consumers |
| `RAW_ANALYSIS_RESULT_NON_AUTHORITATIVE_DEFINED` | PASS | Old `AnalysisResult` marked compatibility input only |
| `STABLE_RESULT_ID_IMPLEMENTED` | CONDITIONAL | Code generates and validates `resultId` |
| `ANALYSIS_RUN_ID_IMPLEMENTED` | CONDITIONAL | Code generates and validates `analysisRunId` |
| `MODEL_RESULT_BINDING_IMPLEMENTED` | CONDITIONAL | Binding validator checks document ID/version/checksum/settings/load/solver |
| `RESULT_PROVENANCE_IMPLEMENTED` | CONDITIONAL | Result resource carries required provenance and consumers block missing provenance |
| `STALENESS_STATE_MACHINE_DEFINED` | PASS | Lifecycle/staleness doc defines states, triggers, and consumer behavior |
| `STALENESS_IMPLEMENTED` | CONDITIONAL | Code computes stale/current/invalid/unsupported states |
| `PERSISTENCE_POLICY_DEFINED` | PASS | Hybrid persistence policy selected |
| `PERSISTED_RESULT_REFS_AUTHORITATIVE_IMPLEMENTED` | CONDITIONAL | `persistedResultRefs` populated and validated as authoritative refs |
| `CONSUMER_CONTRACTS_DEFINED` | PASS | Report, Viewer, DRAFT, PRINT contracts unified around IF3 resource |
| `REPORT_RAW_RESULT_BLOCKED` | CONDITIONAL | Report/CSV/PDF cannot consume raw result authoritatively |
| `VIEWER_RAW_RESULT_BLOCKED` | CONDITIONAL | Viewer adapter uses IF3 result IDs/staleness |
| `DRAFT_RAW_RESULT_BLOCKED` | CONDITIONAL | DRAFT result sheets require IF3-valid DTOs |
| `PRINT_BOUNDARY_DEFINED` | PASS | PRINT owns physical rendering only |
| `FAIL_CLOSED_RULES_DEFINED` | PASS | Missing identity, mismatch, stale, unsupported, invalid, partial, ambiguous, duplicate block |
| `DIAGNOSTIC_CATALOG_DEFINED` | PASS | Required IF3 diagnostic codes defined |
| `SCHEMA_CHANGE_REQUIRED_DECLARED` | PASS | `IF3_SCHEMA_CHANGE_REQUIRED: YES` |
| `RESULT_SCHEMA_IMPLEMENTED` | CONDITIONAL | New result resource schema and registry entry exist |
| `BRIDGE_DOC_RESULT_REFS_SCHEMA_IMPLEMENTED` | CONDITIONAL | Frame document schema updated if required |
| `OLD_ANALYSIS_RESULT_POLICY_DEFINED` | PASS | `READ_OLD_WRITE_TARGET` policy defined |
| `MIGRATION_POLICY_IMPLEMENTED` | CONDITIONAL | Legacy compatibility/migration tests pass |
| `IF3_A_COMPLETE` | CONDITIONAL | Contract schema slice complete with tests |
| `IF3_B_COMPLETE` | CONDITIONAL | Normalizer/validator/staleness slice complete with tests |
| `IF3_C_COMPLETE` | CONDITIONAL | Persistence/registry slice complete with tests |
| `IF3_D_COMPLETE` | CONDITIONAL | Consumer adapters slice complete with tests |
| `IF3_E_COMPLETE` | CONDITIONAL | Migration/completion slice complete with tests |

## PR-40 / PR-41 / PR-42 Reopen Conditions

Design freeze alone must not make PR-40, PR-41, or PR-42 `GO`.

Recommended post-design status:

| PR | Post-design status | Reopen condition |
| --- | --- | --- |
| PR-40 Frame PRINT | `CONDITIONAL_GO_AFTER_IF3_A_B_D_RELEVANT_TESTS` | Result schema, normalizer/validator/staleness, and Report/CSV/PDF IF3 adapters complete |
| PR-41 Frame DRAFT | `CONDITIONAL_GO_AFTER_IF3_A_B_D_AND_SP1_FRAME_PATH` | IF3 result contract/adapters complete and SP1 neutral/shared Frame drawing path verified |
| PR-42 Viewer adapters | `CONDITIONAL_GO_AFTER_IF3_A_B_C_D_RELEVANT_TESTS` | Result schema, staleness, persistence/reload availability, and Viewer adapter complete |

OD8-04 remains a visual-release blocker. It does not block semantic IF3 design or controlled
implementation prep, but final visual release claims remain blocked until OD8-04 is resolved.

## Freeze Recommendation

`IF3_DESIGN_FREEZE_RECOMMENDATION: CONDITIONAL_FREEZE_READY_FOR_REVIEW`

Freeze is appropriate only for the design contract. Implementation remains `CONDITIONAL` until the
IF3-A through IF3-E evidence is produced.

