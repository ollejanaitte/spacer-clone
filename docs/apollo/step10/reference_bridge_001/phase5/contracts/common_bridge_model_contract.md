# Common Bridge Data Model Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1
> **Status:** FROZEN by this contract; implementation freeze happens in P5-2 (schema/types) and P5-3 (adapter/fixture)

## 1. Purpose

The Common Bridge Data Model (CBDM) is the canonical, bridge-agnostic representation
used by the Apollo core to store and reload bridge data across STEP 10 phases
(Geometry → 3D → Analysis → Design → Report → Drawing). Reference Bridge 001 is a
**reference fixture** of this model; the model itself is not Reference-Bridge-specific.

## 2. Scope boundary

- **In scope:** data model contract, schema, types, ID rules, units/coordinate rules,
  serialization, Golden adapter, Reference fixture, validation, migration foundation.
- **Out of scope (Phase 5):** geometry calculation algorithms, 3D geometry generation,
  rendering, solvers, analysis execution, design recalculation, report/drawing renderers,
  STL/DXF generation, UI. These are prohibited in Phase 5.

## 3. Logical layers

The Common Bridge Data Model MUST contain the following 12 logical layers:

| # | Layer | Contents | Empty allowed |
|---|-------|----------|---------------|
| 1 | `metadata` | bridgeId, displayName, schemaVersion, standardProfile, r7Compliance, numericDesignAuthorization, designOrConstructionUse, created/revised | No |
| 2 | `alignment` | Alignment / geometry input: alignments, stations, station equations, geometry input references | Yes (HOLD) |
| 3 | `bridgeGeometry` | Spans, supports, girders, grid points, deck, intermediate panel points | Yes (HOLD) |
| 4 | `structuralModel` | Nodes, members, connectivity, structural model references | Yes |
| 5 | `materials` | Material definitions and references | Yes |
| 6 | `sections` | Section definitions and references | Yes |
| 7 | `loads` | Load cases, load combinations, load references | Yes |
| 8 | `analysisReference` | Analysis reference slot; status NOT_AVAILABLE when no analysis Golden exists | Yes (must carry explicit state) |
| 9 | `design` | Design references / adopted design values | Yes |
| 10 | `reportSpecification` | Report items (chapters, sections, content records) | Yes |
| 11 | `drawingSpecification` | Drawing sheets and drawing items | Yes |
| 12 | `traceability` | Source → Common record links (Golden IDs, source record IDs, sheets) | No (root-level) |

`analysisReference` MUST be present with explicit status `NOT_AVAILABLE` (or contract-equivalent)
when the current contract has no Analysis Golden. It is a designed slot, not an omission.

## 4. Value state contract

Every engineering value in the model is represented by a value record that distinguishes:

| State | Meaning |
|-------|---------|
| `CONFIRMED` | Value confirmed by sources; may be used |
| `HUMAN_CONFIRMATION_REQUIRED` | Value present but needs human confirmation (e.g. OCR-derived) |
| `CONFLICT` | Conflicting candidate values with sources; no silent resolution |
| `HOLD_INSUFFICIENT_SOURCE` | Value unknown because source is insufficient; explicit reason required |
| `NOT_APPLICABLE` | Concept does not apply to this bridge |
| `NOT_AVAILABLE` | Concept valid but no value available in current contract |

`CONFLICT` values MUST carry: candidate values, candidate sources, conflict ID,
selected value (null when unresolved), resolution status.
`HUMAN_CONFIRMATION_REQUIRED` values MUST carry: value, source, human confirmation ID,
confirmation state.

See `value_state_contract.md`.

## 5. ID contract

Every entity has a stable ID (`bridgeId`, `alignmentId`, `supportId`, `girderId`,
`gridPointId`, `nodeId`, `memberId`, `materialId`, `sectionId`, `loadCaseId`,
`loadCombinationId`, `analysisResultId`, `designCheckId`, `reportItemId`,
`drawingSheetId`, `drawingItemId`, `sourceRecordId`, `traceabilityId`).

IDs are stable across save/reload, deterministic where possible, and never derived from
array index. Display names are separate from IDs. Reference-Bridge-specific prefixes are
NOT embedded into the Common contract; they live in the Reference fixture only.
See `entity_id_contract.md`.

## 6. Units / coordinate / precision contract

- Canonical internal length unit: **m**
- Canonical force unit: **kN**
- Canonical moment unit: **kN·m**
- Canonical stress unit: **kN/m²**
- Canonical angle unit: **rad** (display/source unit always recorded)
- Canonical station/offset: station (m) along alignment; offset positive to the right (transverse), elevation positive up
- Coordinate system: right-handed, `x = longitudinal, y = transverse, z = up` (per existing coordinate-context)
- Each value record carries source unit and display precision; canonical serialization is in canonical units with documented precision
- No silent conversion: source unit is always preserved
- Precision/tolerance rules: see `unit_precision_contract.md`; finite numbers only in serialized JSON

See `unit_precision_contract.md`, `coordinate_axis_contract.md`.

## 7. Serialization contract

- Common Model ↔ JSON round-trip must preserve IDs, engineering values, units,
  resolution states, source references, and Golden references.
- Canonical serialization is deterministic (documented key/entity ordering, floating rule).
- Semantic parity is the authority; JSON text byte parity is not required.
- Serialized JSON MUST NOT contain NaN or Infinity.

See `serialization_contract.md`.

## 8. Versioning / migration contract

- `schemaVersion` is required at root (SemVer; canonical value `1.0.0`).
- Unsupported major schema version is rejected.
- Migration foundation exists; real migrations only as needed.
- Existing project schemas remain backward compatible (optional additions only).

See `versioning_migration_contract.md`.

## 9. Golden integrity

- Phase 3 / Phase 4 Golden files are read-only inputs. The adapter normalizes
  source Golden → Common representation.
- Golden is never rewritten to fit the Common Schema. Corrections require a
  Golden correction request registered in the reference bridge process.

## 10. No hard-coded bridge rule

- The CBDM core contains NO Reference-Bridge-specific values.
- Reference-specific mapping rules live in `reference_bridge_mapping_contract.md`
  and the mapping CSVs under `phase5/mapping/`.
- Reference Bridge 001 values are present only in the Reference fixture
  (`phase5/fixtures/`).

## 11. Analysis layer handling

- Phase 4 Analysis Golden = 0 (current contract).
- Phase 5 designs the `analysisReference` slot (empty/not-available state, future
  Phase 7 compatibility) but MUST NOT fabricate analysis results, run solvers, or
  generate reactions/displacements/member forces.

## 12. Carry-forward (MUST NOT be resolved silently)

| Item | Required representation |
|------|-------------------------|
| HCR-001 (drawing sheet 141 OCR, 91 records) | `HUMAN_CONFIRMATION_REQUIRED` with HCR-001 registry entry |
| CONF-P2II-001 (bottom flange 680 vs 700 mm) | `CONFLICT` with candidates [680, 700] mm and sources, selected=null |
| Intermediate panel-point coordinates (nodes 1002–1026, 2002–2026) | `HOLD_INSUFFICIENT_SOURCE` with explicit reason; no interpolation/back-calculation |
| Analysis Golden = 0 | `analysisReference.status = NOT_AVAILABLE` |

## 13. Layer-to-Phase mapping

| Common layer | Phase 3 Input Golden | Phase 4 Golden |
|--------------|----------------------|----------------|
| metadata | bridge_identity.csv | — |
| alignment | geometry_inputs.csv | model_golden (alignment.*) |
| bridgeGeometry | geometry_inputs.csv, girder_inputs.csv, deck_inputs.csv | model_golden (geometry) |
| structuralModel | — | model_golden (structural_model) |
| materials | material_inputs.csv | model_golden (material.*) |
| sections | girder_inputs.csv | design_golden (section_property.*) |
| loads | load_inputs.csv | — |
| analysisReference | — | — (NOT_AVAILABLE) |
| design | — | design_golden (design.*) |
| reportSpecification | — | report+drawing_golden (report.*) |
| drawingSpecification | — | report+drawing_golden (drawing.*) + traceability |
| traceability | source_record_ids | traceability_phase4_rd_golden.csv |

## 14. Completion criteria (this contract)

The contract is complete when P5-2 schema/types and P5-3 adapter/fixture/round-trip
implement this document and P5-4 master validation confirms every layer above.
