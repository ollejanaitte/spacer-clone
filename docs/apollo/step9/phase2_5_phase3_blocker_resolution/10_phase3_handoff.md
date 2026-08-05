# 10 — Phase 3 Handoff (Phase 2.5)

> **Authority:** Phase 2.5-K (handoff)
> **Next step:** STEP 9 / Phase 3 — 連続橋計算書用 Report Model 仕様凍結
> **Current HEAD:** 492e2d7 (local == origin/main, clean)

## 1. Phase 3 purpose (unchanged from Phase 2)

**STEP 9 / Phase 3 — 連続橋計算書用 Report Model 仕様凍結**

Freeze the Report Model **type / transformation / validation contract** for the continuous-girder confirmation report. Spec-first; HTML/PDF rendering stays outside the Report Model.

## 2. Canonical inputs to Phase 3

| source | role |
|--------|------|
| `phase1_continuous_bridge_report_inventory/` (12 files, COMPLETE) | Phase 1 positive 本 |
| `phase2_continuous_bridge_report_spec/` (15 files, COMPLETE @ 96ea018) | Chapter structure, permission, data contract, traceability, acceptance |
| `phase2_5_phase3_blocker_resolution/blocker_matrix.csv` | H-01/H-02/H-03 + U-03 status |
| `phase2_5_phase3_blocker_resolution/decision_register.csv` | 6 DEC-PHA decisions (RESOLVED) |
| `phase2_5_phase3_blocker_resolution/02~05`, `06`, `07` | Architect decision rationale |
| `chapter_matrix.csv` (30 chapters CP-01..25 + CP-30..34) | Canonical chapter set |
| `output_permission_matrix.csv` (O-01..O-30) | Canonical output permissions |
| `08_report_data_contract_boundary.md` (R-01..R-12, 12 principles) | Report Model boundary |
| `11_phase3_handoff.md` (Phase 2) | Original handoff (superseded by this doc for decision state) |

## 3. Phase 3 — what changed after Phase 2.5

| item | Phase 2 handoff | Phase 2.5 (this) |
|------|-----------------|------------------|
| H-01/H-02/H-03 | UNRESOLVED (GO with H pending) | **RESOLVED/ADOPTED** (DEC-PHA-0001..0003) |
| U-03 spanLength gate | "前提条件 (refactor before impl)" | **VERDICT=B**: CP-13 NOT_AVAILABLE-for-CONTINUOUS absorbed in spec; refactor deferred to Phase 3 impl via DEC-PHA-0004 |
| Phase 3 GO | GO_WITH_NON_NUMERIC_RESTRICTIONS (pending H) | **GO_WITH_NON_NUMERIC_RESTRICTIONS (H resolved)** |
| CH/CP | CH-* scaffold noted | **CP-* canonical**; CH-* dev scaffold only (DEC-PHA-0005) |
| PROHIBITED | O-19..O-30 PROHIBITED | **Reconfirmed** + invariants (DEC-PHA-0006) |

## 4. Report Model target (Phase 3 implementation)

- R-01 ReportMetadata, R-02 ProjectSummary, R-03 BridgeSummary, R-04/05 Span/Support, R-06 GirderSummary (continuous segments), R-07 CrossMemberSummary, R-08 GeometrySummary (solids+STL manifest), R-09 ValidationSummary, R-10 AuthorizationSummary (DS-09 cells), R-11 WarningSummary (H-01..H-03 now RESOLVED), R-12 EvidenceSummary.
- `value_kind` canonical set (§08 §3): `input | stored | display | generated_geometry | analysis_result | design_check | adopted` — `analysis_result`/`design_check`/`adopted` carry no values now.
- **CP-13 (section):** for CONTINUOUS = NOT_AVAILABLE (U-03 B). Phase 3 may execute DEC-PHA-0004 refactor (make `computeGirderSectionProperties` length-independent; `steelVolumePerGirder` from `bridgeLength`/`Σspans`; drop `spanLength` from the gate) — ONLY if it preserves: NOT_AVAILABLE when section dims incomplete; zero-fill forbidden; row status `UNVERIFIED`; `authorizationStatus` `NOT_GRANTED`; no ADOPTED numerics.

## 5. Non-target (Phase 3 must NOT implement)

- HTML/PDF/CSS rendering inside Report Model (`render*` are external; `renderReportModelHtml` stays a dev-only HTML print sheet).
- Formal PDF generation (`assertFormalReportRejected` retained).
- Numeric analysis results / section forces / OK-NG (CP-30..34 = NOT_AVAILABLE/NOT_AUTHORIZED; O-19..O-30 PROHIBITED).
- Continuous design drawings (CP-14 = STANDARD_SECTION dev ref only; H-03 DEC-PHA-0003).
- `Phase1SpanSystem` dependency (DEC-PHA-0001); use `BridgeSystem`.

## 6. Implementation preconditions (GO gate)

Phase 3 START = spec freeze (docs). Phase 3 implementation of Report Model code may begin only after:
- Spec contract frozen (chapters/types/transformation/validation) — this Phase 3 step.
- GO conditions G1–G4 (`08_phase3_entry_gate.md`) remain GREEN.
- Any new chapter/field via `DEC-PHA-xxxx` (no new CH-* IDs).

## 7. Test policy (Phase 3)

- `reportModel.test.ts`: add CONTINUOUS path (G-07) — assert CP-13 = NOT_AVAILABLE, CP-30..34 = NOT_AVAILABLE, CP-06 emits `BridgeSystem.CONTINUOUS` non-numeric, watermark/warnings present.
- Assert every `chapter_id` in `chapter_matrix.csv` appears OR is explicitly NOT_IMPLEMENTED/NOT_AVAILABLE per the matrix.
- Assert every `PROHIBITED` item (O-19..O-30) is **absent** from report output.
- Assert `assertFormalReportRejected` / `assertDevelopmentReportExportable` retained.
- Regression: preserve `NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE` invariants (Phase 2.5 `07_prohibited_output_reconfirmation.md`).

## 8. Data-model connections (Phase 3 survey, unchanged)

| existing API | Report concept |
|--------------|-----------------|
| `getBridgeStructureInputDraft` | R-03/04/05/06/09/12 sources |
| `isBridgeStructureGenerationCurrent` | R-01 stale (STALE gate) |
| `buildQuantityModel` | R-12 / CP-25 |
| `computeGirderSectionProperties` | CP-13 (U-03 gate; DEC-PHA-0004 refactor deferred) |
| `buildApolloVisualizationModelOrThrow` | R-08 solids |
| `exportApolloBinaryStl` | R-08 STL manifest |
| `validateBridgeStructureInputDraft` | R-09 validation |
| `getBridgeStructureUnitWeightAdoption` | R-03 + R-10 adoptionStatus (NOT_SELECTED fail-closed) |
| `buildIntegratedOutputs` | §08 principle 6 consistency gate |

> ■ U-03 refactor is a Phase 3 **implementation** task (DEC-PHA-0004), not a spec-freeze precondition. Phase 3 spec freeze proceeds with CP-13 = NOT_AVAILABLE-for-CONTINUOUS as the frozen contract.

## 9. State

- Phase 3 entry: **GO_WITH_NON_NUMERIC_RESTRICTIONS**.
- HEAD: 492e2d7 (clean).
- Next: STEP 9 / Phase 3 spec freeze docs (Report Model type/transformation/validation contract), documentation-only until contract frozen.

Proceeding to Phase 2.5-L (completion + final report closeout).
