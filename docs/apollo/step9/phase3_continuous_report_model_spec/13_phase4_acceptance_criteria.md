# 13 — Phase 4 Acceptance Criteria

> **Authority:** Phase 3-M (specification freeze)
> **Next (Phase 4) official name:** STEP 9 / Phase 4 — 連続橋 Report Model 型・変換器・validator実装
> **Precondition:** THIS Phase 3 spec (docs/apollo/step9/phase3_continuous_report_model_spec/) must be **fully frozen** before Phase 4 begins.
> **Judge:** Apollo architecture. No implementation here.

## 1. Phase 4 scope (what Phase 4 implements)

- TypeScript **types** for the Report Model (R-01..R-22 entities, value/display/unit/status).
- **Transformer** `ProjectModel → ReportModel` (`buildReportModel` extension for continuous; domain read-only).
- **Validator** `validateReportModel(model)` (VR-01..26 from `12_report_model_validation_rules.md`).
- **summary/detail projection** (one model → two views).
- **CP-* canonical chapter** emission; CH-* deprecated alias (internal only).

## 2. Phase 4 NON-scope (what Phase 4 must NOT implement)

- HTML/CSS/PDF/印刷レイアウト (renderers are external; see `11` §6 R-7/R-8).
- formal PDF generation (`assertFormalReportRejected` retained).
- continuous design drawings (PROHIBITED, H-03 DEC-PHA-0003).
- numeric analysis results / section force / OK-NG (CP-30..34 PROHIBITED/NOT_AVAILABLE).
- STL / 3D solid *generation* (only carry manifest/solids summary from viz layer).
- `ProjectModel` / design-data mutation.
- `ADOPTED`/`AUTHORIZED` numerics (fail-closed under NOT_SELECTED).
- scope-guard / numeric-authority解除 (numericAuthorityGuard.ts / featureFlag.ts unchanged).

## 3. Acceptance criteria (Phase 4 test must pass)

| AC-# | criterion | source |
|------|-----------|--------|
| AC-01 | TypeScript types match Phase 3 entity spec (R-01..R-12 + R-13..R-22 invariants) | `04_report_model_entity_spec.md` |
| AC-02 | All emitted chapters use CP-* canonical ids | `05` §2, `12` VR-03/04 |
| AC-03 | No CH-* id in report output (CH-* = internal alias only) | `05` §2; DEC-PHA-0005 |
| AC-04 | Transformer is read-only on `ProjectModel` (no mutation) | `02` N-10; `10` §6 |
| AC-05 | No value recomputation/interpolation inside Report Model | `02` N-03..N-08; `03` §3 principles |
| AC-06 | `authorizationStatus = NOT_GRANTED` report-level; value-level never ADOPTED for continuous numerics | `06` §3.1/§3.2 |
| AC-07 | PROHIBITED items (O-19..O-30; CP-08/15/16/30..34) absent from payload; status-only | `07` §5.4; `09` |
| AC-08 | STALE propagated (`assertDevelopmentReportExportable` rejects STALE export) | `06` §4; `07` §3.5 |
| AC-09 | Legacy surfaced+tagged (schemaVersion UNKNOWN/LEGACY_DATA) | `10` §4; `09` R-22 |
| AC-10 | Summary/detail projection from one ReportModel; status parity | `11` §6 R-5/R-9 |
| AC-11 | Validator `validateReportModel` implements VR-01..26; build red on FAIL | `12` |
| AC-12 | Straight simple-span (SIMPLE_SINGLE) regression: spec/section/quantity unchanged | Phase 2 `01_phase1_input_review.md`; continuous_girder/README.md §6 |
| AC-13 | Continuous save/reload regression: STALE + checksums stable | `09` §6; `10` §6 |
| AC-14 | Import/export regression: sidecar round-trip + legacy forward-fill | `10` §3; generateBsdd.ts:548-556 |
| AC-15 | Viewer/STL regression: solids + STL manifest unchanged | `03` E-SOLIDS/E-STL-MANIFEST |
| AC-16 | `reportModel.ts:85-93` `row()` no-zero-fill preserved | `07` §5.1 |
| AC-17 | `assertFormalReportRejected` / `assertDevelopmentReportExportable` / `assertIntegratedExportAllowed` retained | `06` §3.3; `12` VR-21 |
| AC-18 | CP-13 CONTINUOUS = NOT_AVAILABLE (U-03 verdict B) | `05` CP-13; `12` VR-12 |
| AC-19 | Evidence block (CP-25): inputRevision/inputChecksum/resultChecksum/quantityChecksum/generatedAt/appCommitSha/dataSources/calculationReferenceIds | `09` §2; reportModel.ts:301-306,344 |
| AC-20 | Future-ready: no code assumes HTML/PDF in Report Model (renders external) | `02` R-20; `11` §6 R-7 |
| AC-21 | Phase 4 commit list is docs-first spec freeze **only** until contract frozen; implementation commits carry explicit allowlist | AGENTS.md; directive §0 |
| AC-22 | `final_report.txt` updated each Phase 4 sub-step; local==origin/main after each push | directive §21 |

## 4. Phase 4 GO / NO-GO

### GO (start Phase 4 implementation only after Phase 3 COMPLETE and:)
- G1 Phase 3 spec fully frozen (§2-7 all COMPLETE/RECONFIRMED/LOCKED).
- G2 `chapter_payload_matrix.csv` + `status_code_matrix.csv` + `report_entity_matrix.csv` all FROZEN.
- G3 VR-01..26 written and consistent with entity/payload/status contracts.
- G4 `local == origin/main`, clean.
- G5 Phase 4 scope excludes HTML/PDF/UI/numeric/drawings/STL (§2).

### NO-GO (do not start Phase 4 implementation if any:)
- N1 Phase 3 spec not fully frozen.
- N2 any spec-internal CONFLICTING_EVIDENCE unresolved.
- N3 Phase 4 attempt to emit ADOPTED numerics / PROHIBITED values / CH-* canonical / mutate ProjectModel / render HTML/PDF.
- N4 implementation before spec freeze.

## 5. Phase 4 recommended commit sequence (design note, not executed here)

1. `refactor(apollo): report model entity types` (R-01..R-22 TS types).
2. `feat(apollo): report model transformer for continuous` (buildReportModel CP-*).
3. `feat(apollo): report model validator` (VR-01..26).
4. `test(apollo): report model CONTINUOUS path + PROHIBITED regression + summary/detail parity`.

(Phase 4 may refine via `DEC-PHA-xxxx`; must keep numeric authorization UNCHANGED.)

## 6. Phase 3 (this step) GO for Phase 4 readiness

**STEP9_PHASE4_READINESS_VERDICT: GO_WITH_NON_NUMERIC_RESTRICTIONS** (pending Phase 3 complete).

## 7. Status

- Phase 4 acceptance criteria: FROZEN.
- HEAD: 3b81061 (no code change).
