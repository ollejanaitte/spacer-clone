# Reference Bridge 001 — Geometry Mapping (P6-0-D)

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-3
> **Purpose:** freeze the mapping from the Common Bridge Data Model (Phase 5) to the
> Geometry Engine input entities that Phase 6-1 will realize.

## File

- `reference_bridge_001_geometry_mapping.csv` (25 mappings, GM-001 .. GM-025)

## Columns

| Column | Meaning |
|--------|---------|
| `mapping_id` | stable mapping identifier (GM-xxx) |
| `common_model_entity` | Common Bridge Data Model layer / collection path |
| `common_model_id` | Common entity ID(s) in the Phase 5 fixture (`ALN-ACL`, `SUP-*`, `GIRDER-*`, `GRID-*`, `DECK-01`, `NODE-*`, `MAT-*`) |
| `geometry_input_entity` | Geometry Engine input entity that Phase 6-1 exposes |
| `geometry_entity_type` | frozen entity type (`AlignmentReference`, `SupportLine+SupportPoint`, `GirderLine+GirderStationPoint`, `GridPoint`, `DeckReferenceLine+DeckBoundary`, `CrossSectionFrame input`, `StructuralModel node/member`, `MemberPlacementReference`, `CrossGirderReference`, `BearingReferencePoint`, `drawing reference`, `material reference`) |
| `geometry_entity_id_rule` | ID rule for the generated entity |
| `golden_reference` | resolved Golden IDs (G-GEO / GIN / G-SM / G-DES / G-AD / G-DWG). Ranges (`GIN-0001..0004`) expand to individual IDs. Informal shorthand (`G-GEO-00xx`, `G-DES-0003/0005/0011`) is allowed and resolved by inspection. |
| `source_reference` | source locators (CH1-VAL-xxx, DWG-xxx, STRMOD, CAL-*). |
| `resolution_state` | value resolution state: `CONFIRMED` / `HUMAN_CONFIRMATION_REQUIRED` / `CONFLICT` / `HOLD_INSUFFICIENT_SOURCE` / `NOT_AVAILABLE` |
| `readiness` | Phase 6-1 readiness: `READY` / `HOLD` / `CONFLICT` / `READY_WITH_HUMAN_TRACK` / `NOT_APPLICABLE` |
| `notes` | free-form |

## Resolution-state policy

- `CONFIRMED` / `READY` -> usable by Geometry Engine in Phase 6-1.
- `HOLD_INSUFFICIENT_SOURCE` / `HOLD` -> intermediate panel points (GRID-1002..1026 etc.)
  are not extracted in Phase 2; no interpolation is performed. Propagation only.
- `CONFLICT` -> CONF-P2II-001 (bottom flange 680 vs 700 mm) passed with candidates; no selection.
- `HUMAN_CONFIRMATION_REQUIRED` / `READY_WITH_HUMAN_TRACK` -> HCR-001 (sheet 141 OCR);
  propagated with `humanConfirmationId`; not geometry-blocking.
- `NOT_AVAILABLE` / `NOT_APPLICABLE` -> analysisReference (Analysis Golden = 0).

## Verification

`tools/validate_p6_0_pr3a_mapping.py` validates headers, enums, ID uniqueness and
Golden reference resolution against the Phase 3 input golden and Phase 4 model /
design / report-drawing goldens. Informal tokens and expected HOLD ranges are
reported separately (informal count) and are not failures.
