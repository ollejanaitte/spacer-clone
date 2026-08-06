# 14 — Phase 4 Handoff

> **Authority:** Phase 3-N (handoff)
> **Next (Phase 4) official name:** STEP 9 / Phase 4 — 連続橋 Report Model 型・変換器・validator実装
> **Current HEAD:** 8b9c911 (local == origin/main, clean).

## 1. Phase 4 purpose

Implement the **Report Model type / transformer / validator** for the continuous-girder (CONTINUOUS) confirmation report, exactly per the Phase 3 spec frozen in this directory. Spec-first: types → transformer → validator → tests. **No HTML/PDF/UI/drawings/numeric/STL in Phase 4.**

## 2. Canonical spec for Phase 4

All of `docs/apollo/step9/phase3_continuous_report_model_spec/`:
`README.md`, `01_phase2_5_input_review.md`, `02_report_model_responsibility.md`, `03_domain_to_report_mapping.md`, `04_report_model_entity_spec.md`, `05_chapter_payload_contract.md`, `06_status_and_authorization_contract.md`, `07_validation_and_missing_data_contract.md`, `08_units_precision_and_display_contract.md`, `09_traceability_and_versioning_contract.md`, `10_legacy_and_compatibility_contract.md`, `11_summary_detail_projection_contract.md`, `12_report_model_validation_rules.md`, `13_phase4_acceptance_criteria.md`, `14_phase4_handoff.md` (+ `report_entity_matrix.csv`, `chapter_payload_matrix.csv`, `status_code_matrix.csv`).

Phase 2 positives (`phase1_continuous_bridge_report_inventory/`, `phase2_continuous_bridge_report_spec/`) and Phase 2.5 (`phase2_5_phase3_blocker_resolution/`) remain authoritative references (read-only).

## 3. Implementation targets

- **Types** (`reportModel.ts` / new entity files): R-01..R-12 concepts + R-13..R-22 cross-cutting field rules (raw/display/unit/status/source/stale/missingReason/legacyStatus).
- **Transformer** (`buildReportModel` ext.): read-only `ProjectModel → ReportModel`; CP-* chapter emission; CH-* deprecated alias map internally.
- **Validator** (`validateReportModel`): VR-01..26.
- **Projection:** summary/detail from single `ReportModel` (`11_summary_detail_projection_contract.md`).
- **CSV drivers:** consume `report_entity_matrix.csv`, `chapter_payload_matrix.csv`, `status_code_matrix.csv` as the canonical lookup tables.

## 4. Non-targets (Phase 4 must NOT touch)

- HTML/CSS/PDF/印刷レイアウト (renderer stays external).
- formal PDF (`assertFormalReportRejected` retained).
- continuous design drawings (PROHIBITED).
- numeric analysis results / CP-30..34 / O-19..O-30 (PROHIBITED/NOT_AVAILABLE).
- STL / 3D solid generation (carry manifest/solids summary only).
- `ProjectModel` / `apolloBridgeStructureInput` / `apolloBsdd` mutation.
- scope-guard / numeric-authority / feature-flag changes (`phase1ScopeGuard.ts`, `numericAuthorityGuard.ts`, `featureFlag.ts`).
- lockfile / dependencies.

## 5. Anticipated TypeScript surfaces (names only — types, not implementation logic)

- `ReportModel` (R-01..R-22), `ReportChapter` (CP-* ids), `ReportRow {value, display, unit, status, source, authorizationStatus, stale, missingReason}`.
- `ReportMetadata`, `BridgeSummary`, `SpanSummary[]`, `SupportSummary[]`, `GirderSummary`, `CrossMemberSummary`, `GeometrySummary`, `ValidationSummary`, `AuthorizationSummary`, `WarningSummary`, `EvidenceSummary`, `LegacyCompatibilitySummary`.
- `validateReportModel(model): {valid, errors, warnings}`.
- `buildReportModel(project, options): ReportModel` (continuous path; CP-13 NOT_AVAILABLE per U-03).

## 6. Status / chapter contracts Phase 4 owns

- `status_code_matrix.csv` (codes AVAILABLE..NOT_APPLICABLE incl. PROHIBITED/STALE/INVALID).
- `chapter_payload_matrix.csv` (CP-01..34 availability + summary/detail + STALE/NA/PROHIBITED behavior).
- `report_entity_matrix.csv` (entity→domain source + raw/display/unit/source).

## 7. Legacy support

- Tag v1.0.0 missing `schemaVersion` as `UNKNOWN`/`LEGACY_DATA` (do not reinterpret) (`10_legacy_and_compatibility_contract.md`).
- Forward-fill sidecar defaults via the existing `generateBsdd.ts:548-556` shim (DEC-PHA-0002) — Report Model only **reads** the normalized draft; does not re-migrate.
- Original `ProjectModel` never mutated.

## 8. Test targets

- `reportModel.test.ts` CONTINUOUS path (G-07): CP-13 = NOT_AVAILABLE, CP-30..34 = NOT_AVAILABLE, CP-06 emits `BridgeSystem.CONTINUOUS` non-numeric, watermark present.
- PROHIBITED regression: no O-19..O-30 value in any report.
- summary/detail status parity; evidence checksum prefix vs full consistency.
- Validator tests for VR-01..26 (esp. VR-03/04 CP-* only, VR-09/10 PROHIBITED absent, VR-12 CP-13 CONTINUOUS NOT_AVAILABLE, VR-13 legacy).
- Straight simple-span regression (AC-12) + continuous save/reload (AC-13).

## 9. Change-prohibited zones (Phase 4 must not touch)

`frontend/src/apollo/phase1ScopeGuard.ts`, `numericAuthorityGuard.ts`, `featureFlag.ts`, `appurtenanceHaunchAnalysisAdapter.ts` (analysis), `apolloStlExport.ts` / `bridgeStructureSolids.ts` (STL/solids generation), `styles.css`/components (UI), `backend/`, `schemaVersion` semantics of `apolloBridgeStructureInput` draft shape (migration shim stays).

## 10. Commit split plan (Phase 4, design note)

1. `refactor(apollo): report model entity types` (types only).
2. `feat(apollo): report model transformer (continuous + CP-*)` (read-only build).
3. `feat(apollo): report model validator (VR-01..26)`.
4. `test(apollo): report model CONTINUOUS + PROHIBITED + projection + regression`.

Each commit: `git diff --check` → explicit `git add <paths>` → push → `local == origin/main` → clean. No `git add .`.

## 11. GitHub / final_report policy (Phase 4)

- main-branch direct, immediate push per commit (no PR/worktree/branch).
- `final_report.txt` updated each sub-step with `STEP9_PHASE4_*` verdicts + SHA; final block: `STEP9_PHASE3_STATUS: COMPLETE`, `STEP9_PHASE4_STATUS`, `STEP9_PHASE4_GO_READINESS`.

## 12. Stop conditions (Phase 4)

- Unexpected staged file, typecheck/test failure, dependency change, local≠origin, worktree dirty → stop, report, do not revert.

## 13. Phase 3 closeout status

- **STEP9_PHASE3_STATUS: COMPLETE** (this step set, pending §15 closeout commit).
- **STEP9_PHASE4_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS** (subject to §15 final verification).
- HEAD: 8b9c911 (clean).

Proceeding to Phase 3-O (completion + final verification).
