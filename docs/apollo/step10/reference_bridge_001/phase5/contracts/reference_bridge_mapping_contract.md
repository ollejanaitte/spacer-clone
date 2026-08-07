# Reference Bridge Mapping Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Purpose

Defines how Reference Bridge 001 Phase 3 Input Golden and Phase 4 Golden map into
the Common Bridge Data Model. Reference-specific mapping rules live HERE and in
`phase5/mapping/*.csv`; they are NEVER embedded in the Common model core.

## 2. Source inputs

| Input | Path (relative to `reference_bridge_001/`) | Records |
|-------|--------------------------------------------|---------|
| Phase 3 Input Golden aggregate | `phase3/golden/reference_bridge_001_input_golden.csv` | 141 |
| Phase 3 per-domain goldens | `phase3/golden/{bridge_identity,geometry_inputs,girder_inputs,material_inputs,load_inputs,cross_member_inputs,deck_inputs}.csv` | 141 total |
| Phase 4 Model Golden | `phase4/golden/reference_bridge_001_model_golden.csv` | 67 |
| Phase 4 Design Golden | `phase4/golden/reference_bridge_001_design_golden.csv` | 99 |
| Phase 4 Report + Drawing Golden | `phase4/golden/reference_bridge_001_report_drawing_golden.csv` | 3,650 (report 1,591 / drawing 2,059) |
| Phase 4 RD traceability | `phase4/traceability/traceability_phase4_rd_golden.csv` | 3,650 |
| Phase 4 HCR register | `phase4/review/human_confirmation_register.csv` | HCR-001 |
| Phase 4 conflict register | `phase4/review/conflict_resolution_register.csv` | CONF-P2II-001 |
| Phase 4 drawing coverage | `phase4/review/drawing_sheet_coverage.csv` | 141 sheets |

## 3. Mapping approach

- The adapter (`phase5/tools/build_common_model_fixture.py`) reads the CSVs
  mechanically and builds the Common Bridge Data Model JSON.
- Mapping status per Golden record is recorded in
  `phase5/validation/golden_to_common_model_parity.csv` with status:
  `MAPPED`, `MAPPED_WITH_HUMAN_TRACK`, `MAPPED_CONFLICT`, `MAPPED_HOLD`,
  `INTENTIONALLY_EXCLUDED` (with reason), `ERROR_UNMAPPED`.
- Every Golden record MUST be `MAPPED*` or `INTENTIONALLY_EXCLUDED` with a reason.
  Unexplained `ERROR_UNMAPPED` = FAIL.

## 4. Layer assignment by domain (Phase 4 golden `domain` field)

| Phase 4 domain | Common layer |
|----------------|--------------|
| `geometry` | `bridgeGeometry` (+ `alignment` for alignment.* fields) |
| `structural_model` | `structuralModel` |
| `design` | `design` |
| `report` | `reportSpecification` |
| `drawing` | `drawingSpecification` |

Phase 3 domains:
| Phase 3 file | Common layer |
|--------------|--------------|
| `bridge_identity` | `metadata` |
| `geometry_inputs` | `alignment` / `bridgeGeometry` |
| `girder_inputs` | `bridgeGeometry` (girder) / `sections` |
| `material_inputs` | `materials` |
| `load_inputs` | `loads` |
| `cross_member_inputs` | `bridgeGeometry` (cross members) |
| `deck_inputs` | `bridgeGeometry` (deck) |

## 5. Carry-forward mapping

| Item | Source | Common representation |
|------|--------|------------------------|
| HCR-001 (sheet 141 OCR, 91 drawing records) | Phase 3/4 golden with `human_confirmation_id=HCR-001` or promotion `APPROVED_WITH_HUMAN_CONFIRMATION_TRACK` | value state `HUMAN_CONFIRMATION_REQUIRED`, humanConfirmationId `HCR-001`; 91 records in drawing layer + HCR registry |
| CONF-P2II-001 | conflict_resolution_register.csv | `CONFLICT` value in sections layer (bottom flange width), candidates [0.680 m, 0.700 m] + sources, selected null, resolutionStatus UNRESOLVED |
| Intermediate panel-point coordinates (nodes 1002–1026, 2002–2026) | Phase 2 not extracted (HOLD register) | `HOLD_INSUFFICIENT_SOURCE` entries in bridgeGeometry (grid/panel points), explicit reason; no coordinates invented |
| Analysis Golden = 0 | Phase 4 seal | `analysisReference.status = NOT_AVAILABLE` |

## 6. ID mapping

- Common IDs are assigned stably by the adapter (see `entity_id_contract.md`).
- Golden IDs (`G-GEO-*`, `G-SM-*`, `G-DES-*`, `G-RPT-*`, `G-DWG-*`) and entity IDs
  (`ENT-*`, `GEO-*`, `DS-*`, etc.) are preserved as `sourceRefs`/`goldenId`.
- No Reference Bridge prefix is embedded in Common IDs.

## 7. Non-promoted / excluded

- Non-promoted candidate registers
  (`phase4/review/non_promoted_*.csv`) document why candidates were not promoted.
  Non-promoted candidates are `INTENTIONALLY_EXCLUDED` at the candidate level;
  the Golden records they would have formed do not exist and are not counted as
  unexplained unmapped.
- Report result/derived classes excluded from Phase 4 Report Golden (23) remain
  outside Golden; they do not appear in the Common fixture and are documented in
  Phase 4 traceability (`analysis_result_parity_note.md`).

## 8. Golden integrity

- Golden CSVs are read-only. The adapter normalizes, never rewrites Golden.
- Any needed Golden correction is a registered Golden correction request
  (not performed in Phase 5).
