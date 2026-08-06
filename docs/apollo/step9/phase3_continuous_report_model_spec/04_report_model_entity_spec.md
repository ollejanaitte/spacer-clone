# 04 — Report Model Entity Specification

> **Authority:** Phase 3-D (specification freeze)
> **Base:** Phase 2 `08_report_data_contract_boundary.md` §2 (R-01..R-12), §3 (value_kind), `reportModel.ts`; Phase 3-B responsibility (R-13..R-22); Phase 3-C `03_domain_to_report_mapping.md`.
> **Judge:** Apollo architecture. **No TypeScript / implementation.**

## 1. Purpose

Define the concrete Report Model entities (concepts) Phase 4 will implement, with per-entity field-level rules (type, nullability, precision, unit, source, authorization, validation, summary/detail). Updates `report_entity_matrix.csv`.

## 2. Entity set (R-01..R-22)

R-01 ReportMetadata · R-02 ProjectSummary · R-03 BridgeSummary · R-04 SpanSummary · R-05 SupportSummary · R-06 GirderSummary · R-07 CrossMemberSummary · R-08 GeometrySummary · R-09 ValidationSummary · R-10 AuthorizationSummary · R-11 WarningSummary · R-12 EvidenceSummary · R-13 RawDisplayValue · R-14 UnitRequired · R-15 SourceRequired · R-16 AuthorizationPerValue · R-17 StaleFlag · R-18 MissingReason · R-19 SummaryDetailProjection · R-20 RenderCouplingFree · R-21 LocaleAware · R-22 LegacyCompatibility.

> R-13..R-22 are **cross-cutting field-level rules** applied to every value-bearing entity (R-02..R-12); they are not standalone sections but invariants enforced on each value.

## 3. Entity definitions

### R-01 ReportMetadata
| field | type | null? | unit | source? | auth? | missing | basis |
|------|------|-------|------|--------|-------|---------|-------|
| schemaVersion | string | no | none | none | fixed NOT_GRANTED | n/a | reportModel.ts:18 |
| reportId | string | no | none | none | fixed NOT_GRANTED | n/a | reportModel.ts:163 / 326 |
| projectId | string | no | none | from project | fixed NOT_GRANTED | n/a | reportModel.ts:163 |
| generatedAt | iso8601 | no | none | none | fixed NOT_GRANTED | n/a | reportModel.ts:167 |
| locale | "ja-JP"\|"en" | no | none | none | fixed NOT_GRANTED | default "ja-JP" | 08 R-11 |
| developmentStatus | "UNVERIFIED_DEVELOPMENT_ONLY" | no | none | fixed | fixed NOT_GRANTED | n/a | reportModel.ts:73 |
| designOrConstructionUse | "PROHIBITED" | no | none | fixed | fixed NOT_AUTHORIZED | n/a | reportModel.ts:72 |
| authorizationStatus | "NOT_GRANTED" | no | none | fixed | fixed | n/a | reportModel.ts:71 |
| stale | boolean | no | none | from isBridgeStructureGenerationCurrent | NOT_GRANTED | n/a | reportModel.ts:74/114 |
| mode | "DEVELOPMENT" | no | none | fixed | fixed NOT_GRANTED | n/a | reportModel.ts:70 |

### R-02 ProjectSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| projectName | string | no | none | project.project.name | NOT_GRANTED | n/a | yes |
| projectId | string | no | none | project.project.id | NOT_GRANTED | n/a | yes |
| projectNumber | string\|null | yes | none | project.project.number? | NOT_GRANTED | NOT_IMPLEMENTED (O-18) | yes |
| designerName | null | n/a | n/a | (no field) | NOT_GRANTED | NOT_IMPLEMENTED | yes (emit NOT_IMPLEMENTED) |
| createdAt | iso8601 | no | none | project.project.createdAt | NOT_GRANTED | n/a | yes |
summary/detail: shared.

### R-03 BridgeSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| bridgeSystem | enum | no | none | draft.bridgeSystem | UNVERIFIED→NOT_AUTHORIZED | n/a | yes |
| spanSystem | string | no | none | BSDD.phase1ScopeAssertion.spanSystem | UNVERIFIED→NOT_AUTHORIZED | n/a | yes |
| bridgeLength | number\|null | continuous-null→Σ | m | draft.bridgeLength | UNVERIFIED | NOT_AVAILABLE if null/STALE | yes |
| width | number\|null | yes | m | draft.width | UNVERIFIED | NOT_AVAILABLE | yes |
| girderCount | number\|null | yes | count | draft.girderCount | UNVERIFIED | NOT_AVAILABLE | yes |
| girderDepth | number\|null | yes | m | draft.girderDepth | UNVERIFIED | NOT_AVAILABLE | yes |
| spanCount | number | no | count | spans.length | UNVERIFIED | n/a | yes |
| supportCount | number | no | count | supports.length | UNVERIFIED | n/a | yes |
| adoptionStatus | enum | no | none | getBridgeStructureUnitWeightAdoption | NOT_AUTHORIZED | n/a | yes |
summary/detail: shared.

### R-04 SpanSummary (array)
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| id | string | no | none | draft.spans[i].id | UNVERIFIED | n/a | yes |
| length | number | no | m | spans[].length | UNVERIFIED | n/a | yes |
| stationStart | number | no | m | derived | UNVERIFIED | n/a | yes |
| stationEnd | number | no | m | derived | UNVERIFIED | n/a | yes |
detail only (CP-07). summary: counts only.

### R-05 SupportSummary (array)
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| id | string | no | none | draft.supports[i].id | UNVERIFIED | n/a | yes |
| station | number | no | m | supports[].station | UNVERIFIED | n/a | yes |
| role | enum | no | none | supports[].role | UNVERIFIED | n/a | yes |
| fixity | enum | no | none | supports[].fixity | UNVERIFIED | n/a | yes |
detail only (CP-10). summary: counts only.

### R-06 GirderSummary (per girder group; continuous segments)
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| id | string | no | none | SDM mainGirders | UNVERIFIED | n/a | yes |
| offset | number | no | m | draft girder offset | UNVERIFIED | n/a | yes |
| count | number | no | count | girderCount | UNVERIFIED | n/a | yes |
| depth | number\|null | yes | m | girderDepth | UNVERIFIED | NOT_AVAILABLE | yes |
| spacing | number\|null | yes | m | girderSpacing | UNVERIFIED | NOT_AVAILABLE | yes |
| segments | SpanSummary[] | no | none | continuous segments | UNVERIFIED | n/a | yes |
summary/detail shared (CP-09).

### R-07 CrossMemberSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| count | number | no | count | crossBeam station count | UNVERIFIED | n/a | yes |
| spacing | number\|null | yes | m | draft.crossBeamSpacing | UNVERIFIED | NOT_AVAILABLE | yes |
| station | number[] | no | m | SDM crossBeams | UNVERIFIED | n/a | yes |
| swayBracing | number\|null | yes | count | SDM swayBracings | UNVERIFIED | NOT_AVAILABLE | yes |
| lateralBracing | number\|null | yes | count | SDM lateralBracings | UNVERIFIED | NOT_AVAILABLE | yes |
| stiffener | number\|null | yes | count | SDM stiffeners | UNVERIFIED | NOT_AVAILABLE | yes |
summary/detail shared (CP-11/CP-17).

### R-08 GeometrySummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| solids | object | no | none | buildApolloVisualizationModelOrThrow | UNVERIFIED→NOT_AUTHORIZED | NOT_AVAILABLE if no solids/STALE | yes |
| stl | object | no | none | exportApolloBinaryStl | UNVERIFIED→NOT_AUTHORIZED | NOT_AVAILABLE if not exported | yes |
| assumptions | string[] | no | none | "bsdd-continuous-girder-segments" etc | UNVERIFIED | n/a | yes |
summary/detail shared (CP-18).

### R-09 ValidationSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| complete | boolean | no | none | validateBridgeStructureInputDraft | UNVERIFIED | n/a | yes |
| issues | {code,message,path}[] | no | none | validators (validation.ts; layoutValidation.ts) | UNVERIFIED | n/a | yes |
| persistenceIssues | {code,message,path}[] | no | none | unknown-field rejection | UNVERIFIED | n/a | yes |
summary/detail shared (CP-19).

### R-10 AuthorizationSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| authorizationStatus | "NOT_GRANTED" | no | none | fixed | NOT_GRANTED | n/a | yes |
| memberChecks | {member,check,status}[] | no | none | DS-09 cells | NOT_AUTHORIZED | sparse for continuous | yes |
| gate | "BLOCKED"\|"PASS" | no | none | NR-01..07 | NOT_AUTHORIZED | BLOCKED | yes |
summary/detail shared (CP-22).

### R-11 WarningSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| watermark | string | no | none | fixed "UNVERIFIED DEVELOPMENT OUTPUT" | NOT_GRANTED | n/a | yes |
| warnings | string[] | no | none | reportModel.ts:150-156 + validators | UNVERIFIED | always emit list | yes |
| states | {code,display,severity,position}[] | no | none | §07 10 state codes | NOT_GRANTED | n/a | yes |
| humanConfirmationItems | enum[] | no | none | H-01..H-03 | NOT_AUTHORIZED | RESOLVED list | yes |
summary/detail shared (CP-20).

### R-12 EvidenceSummary
| field | type | null? | unit | source? | auth? | missing | Phase4 |
|------|------|-------|------|--------|-------|---------|--------|
| inputRevision | iso8601\|"STALE_OR_UNGENERATED" | no | none | draft.generatedAt | NOT_GRANTED | "STALE_OR_UNGENERATED" if null | yes |
| inputChecksum | string | no | none | buildInputChecksum | NOT_GRANTED | n/a | yes |
| resultChecksum | string | no | none | computeContentChecksum(report) | NOT_GRANTED | n/a | yes |
| quantityChecksum | string | no | none | buildQuantityModel | NOT_GRANTED | n/a | yes |
| appCommitSha | string\|null | yes | none | options.appCommitSha | NOT_GRANTED | NOT_CAPTURED_IN_BROWSER | yes |
| calculationReferenceIds | string[] | no | none | reportModel.ts:344 | NOT_GRANTED | n/a | yes |
| formalOkNgEmitted | false | no | none | fixed | NOT_AUTHORIZED | n/a | yes |
| dataSources | {chapterId,path,symbol,schemaVersion}[] | no | none | chapter_matrix.csv | NOT_GRANTED | n/a | yes |
summary: subset (id/checksums/date); detail: full (CP-25).

### R-13 RawDisplayValue (cross-cutting rule)
Every value-bearing field: `value: number|string|boolean|enum|null` + `display: string`. `null → "NOT_AVAILABLE"`. No zero-fill (reportModel.ts:95-93).

### R-14 UnitRequired (cross-cutting)
Every numeric value carries `unit` (m, kN, kN·m, kN/m3, count). Unit-less fields explicitly `unit: none`.

### R-15 SourceRequired (cross-cutting)
Every numeric/boolean carries `source.path/symbol/schemaVersion`; missing → `LEGACY_DATA`/`UNKNOWN`.

### R-16 AuthorizationPerValue (cross-cutting)
Every numeric/boolean carries `authorizationStatus: NOT_AUTHORIZED|UNVERIFIED|ADOPTED`; ADOPTED fail-closed (never newly ADOPTED for continuous numerics).

### R-17 StaleFlag (cross-cutting)
Every value carries `stale: boolean` + optional `staleReason`; propagated, never cleared.

### R-18 MissingReason (cross-cutting)
Absence = `NOT_AVAILABLE` + `missingReason` ∈ {NOT_IMPLEMENTED, NOT_BOUND, GATE_BLOCKED, UNKNOWN, LEGACY_DATA, STALE}; never blank/zero.

### R-19 SummaryDetailProjection (cross-cutting)
Same Report Model projects summary (fields subset + counts) and detail (per-element arrays). No field recomputation across projections.

### R-20 RenderCouplingFree (cross-cutting)
No HTML/CSS/print/PDF knowledge in entities; `render*` are external adapters.

### R-21 LocaleAware (cross-cutting)
Number formatting locale-aware (3-digit grouping); `ja-JP`/`en` (future).

### R-22 LegacyCompatibility (cross-cutting)
v1.0.0 missing schemaVersion → `UNKNOWN`/`LEGACY_DATA`; legacy JSON surfaced, not hidden.

## 4. Phase 4 obligations

- Implement entities R-01..R-12; enforce cross-cutting rules R-13..R-22 on every value.
- Emit `chapter_id` from CP-* set (see `05_chapter_payload_contract.md`).
- Preserve `value_kind`/`authorizationStatus`/`stale`/`missingReason` per value.

## 5. Status

- Entity spec: FROZEN. `report_entity_matrix.csv` updated with value_type/nullable/precision/unit_required/source_required/authorization_required/validation_required/summary_detail/phase4_impl.
- HEAD: 6e3b238 (no code change).
