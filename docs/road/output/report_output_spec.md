# Report Output Specification

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define structured report content (HTML, CSV; PDF post-MVP) generated from intermediate results. Table schemas use stable English internal keys; Japanese labels applied at render time via i18n.

## Scope

- Report sections and data sources per field.
- Table column schemas (shared conceptual model with CAD listings).
- Sort order and pagination.
- Inclusion of diagnostics, traceability, and timestamps.

## Out of Scope

- Structural analysis result reports ([docs/frame/output/10_report_spec.md](../../frame/output/10_report_spec.md)).
- Copying third-party report layouts.

## Assumptions

- Reports rendered after successful computation (`ready` state).
- Numeric values formatted per [unit_and_precision_policy.md](../design/unit_and_precision_policy.md).
- No re-sampling; tables reflect intermediate result arrays directly.

## Design Topics

### 1. Report sections

| Section key | Source | Description |
| --- | --- | --- |
| `projectInfo` | Domain metadata + `computedAt`, `sourceRevision` | Run header |
| `alignmentSegments` | `horizontal.segments` | Segment summary table |
| `stationCoordinates` | `stations.entries` + samples | Chainage table |
| `profileElevations` | `vertical.sampledPoints` | Profile samples |
| `gridPoints` | `grid.points` | Full grid coordinate listing |
| `ldistResults` | P4-D02 `ldistResults` rows | Grid distance / overhang results |
| `haunchResults` | P4-D03 `haunchResults` rows | Haunch elevation / thickness results |
| `hosoResults` | P4-D04 `hosoResults` rows | Pavement thickness / elevation results |
| `frameMappingTrace` | `linerTrace` or derived from grid + mapping | Frame entity trace |
| `diagnostics` | `diagnostics[]` | Warnings and errors |

### 2. Table schemas (English keys)

#### alignmentSegments

| Column key | Type | Source field |
| --- | --- | --- |
| `segmentId` | string | `segment.id` |
| `segmentType` | enum | line / arc / clothoid |
| `startPhysicalDistance` | number | m |
| `endPhysicalDistance` | number | m |
| `startDisplayedStation` | number | m |
| `endDisplayedStation` | number | m |
| `length` | number | m |
| `startRadius` | number | m, ∞ as null |
| `endRadius` | number | m |

#### stationCoordinates

| Column key | Type |
| --- | --- |
| `entryId` | string |
| `displayedStation` | number |
| `physicalDistance` | number |
| `x` | number |
| `y` | number |
| `elevation` | number |
| `equationId` | string? |

#### profileElevations

| Column key | Type |
| --- | --- |
| `physicalDistance` | number |
| `displayedStation` | number |
| `profileElevation` | number |
| `grade` | number |

#### gridPoints

| Column key | Type |
| --- | --- |
| `gridPointId` | string |
| `longitudinalIndex` | integer |
| `transverseIndex` | integer |
| `displayedStation` | number |
| `offset` | number |
| `x`, `y`, `z` | number |
| `role` | string |
| `spanId` | string? |

#### frameMappingTrace

| Column key | Type |
| --- | --- |
| `frameEntityId` | string |
| `frameEntityType` | enum |
| `gridPointId` | string? |
| `materialId` | string? |
| `sectionId` | string? |
| `sourceRevision` | string |

#### diagnostics

| Column key | Type |
| --- | --- |
| `level` | enum |
| `code` | string |
| `messageKey` | string |
| `entityPath` | string? |
| `station` | number? |

#### ldistResults (P4-D02)

| Column key | Type | Source field |
| --- | --- | --- |
| `jobId` | string | `jobId` |
| `fromLineId` | string? | `fromLineId` |
| `toLineId` | string? | `toLineId` |
| `stationPhysicalDistance` | number | m |
| `displayedStation` | number | m |
| `distanceM` | number? | m |
| `overhangM` | number? | m |
| `side` | enum? | left / right |
| `signConvention` | string? | algorithm sign metadata |

#### haunchResults (P4-D03)

| Column key | Type | Source field |
| --- | --- | --- |
| `definitionId` | string | `definitionId` |
| `type` | enum | haunch family |
| `stationPhysicalDistance` | number | m |
| `haunchTopElevationM` | number | m |
| `haunchThicknessM` | number? | m |
| `side` | enum? | left / right / both |

#### hosoResults (P4-D04)

| Column key | Type | Source field |
| --- | --- | --- |
| `definitionId` | string | `definitionId` |
| `type` | enum | hoso family |
| `stationPhysicalDistance` | number | m |
| `offsetM` | number? | m |
| `pavementThicknessM` | number | m |
| `pavementElevationM` | number? | m |

### 3. CSV export

- One file per table or combined workbook (implementation choice).
- Header row uses English keys; HTML report shows localized column headers.
- Grid CSV: columns match `gridPoints` table.
- Required CSV files (P4-D06):
  - `grid_points.csv` — `gridPoints` schema
  - `ldist_results.csv` — when LDIST rows present
  - `haunch_results.csv` — when HAUNCH rows present
  - `hoso_results.csv` — when HOSO rows present
- Export is **fail-closed** when error-level diagnostics are present or P4 row `sourceRevision` ≠ intermediate `sourceRevision`.

### 4. HTML template

- Original CSS layout; sections in order listed above.
- Error appendix always included when diagnostics non-empty.

### 5. Filename pattern

```text
{projectName}_liner_report_{date}.html
{projectName}_liner_grid_{date}.csv
{projectName}_ldist_results_{date}.csv
{projectName}_haunch_results_{date}.csv
{projectName}_hoso_results_{date}.csv
```

## Open Questions

- PDF generation in MVP or HTML/CSV only? **MVP: HTML + CSV.**

## Related Documents

- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [cad_output_spec.md](cad_output_spec.md)
- [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md)
- [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md)
- [legal_originality_policy.md](../design/legal_originality_policy.md)
- [test_plan_cad_report.md](../verification/test_plan_cad_report.md)

## Pre-Implementation Checklist

- [x] Section list and column schemas defined.
- [x] English keys documented for all tables.
- [x] P4 sections (`ldistResults`, `haunchResults`, `hosoResults`) documented.
- [ ] Sample report reviewed against originality policy.
- [x] CSV column tests in test_plan_cad_report (Vitest: `roadReportExport.test.ts`).
