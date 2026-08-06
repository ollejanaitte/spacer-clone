# 03 — Domain → Report Model Mapping

> **Authority:** Phase 3-C (specification freeze)
> **Base:** Phase 2 `05_detailed_report_spec.md` D1-D14, `chapter_matrix.csv` data_source column, `08_report_data_contract_boundary.md` R-01..R-22, `reportModel.ts`.
> **Judge:** Apollo architecture. No TypeScript / implementation.

## 1. Purpose

Define the **conversion boundary**: which domain data maps to which Report Model entity, with required/optional/prohibited classification, raw vs display, unit, authorization, stale, and missing-data behavior. This is the Phase 4 transformation contract (no code here).

## 2. Conversion boundary principles

1. **Read-only projection** — the Report Model must not mutate `ProjectModel` / `apolloBridgeStructureInput` / `apolloBsdd` / geometry / STL sources.
2. **No recomputation** — do not recompute geometry/quantity/analysis inside the Report Model; carry upstream results verbatim (`buildApolloVisualizationModelOrThrow`, `exportApolloBinaryStl`, `buildQuantityModel`, `computeGirderSectionProperties`).
3. **No guessing of missing** — missing inputs → `NOT_AVAILABLE` + `missingReason` (never 0-fill, never blank, never infer) (reportModel.ts:357 "No zero-fill").
4. **Forbidden items hidden + tagged** — PROHIBITED/D-class data is absent from output and represented only by status (`NOT_AVAILABLE`/`NOT_AUTHORIZED`/`NOT_IMPLEMENTED`) (§07).
5. **Authorization never raised** — `NOT_AUTHORIZED`/`NOT_GRANTED` propagated, never ADOPTED/AUTHORIZED for continuous numerics (BridgeStructureInputPanel.tsx:256 fail-closed).
6. **STALE propagated** — never cleared inside the Report Model (isBridgeStructureGenerationCurrent).
7. **Legacy surfaced, not hidden** — v1.0.0 missing `schemaVersion` → `UNKNOWN`/`LEGACY_DATA`; carry `legacyStatus`.
8. **Source + evidence retained** — every value keeps `source.path/symbol/schemaVersion` + checksums.

## 3. Domain → Report Model mapping

### 3-1. Project / identity (R-01/R-02)
| domain | symbol | ProjectModel field | Report entity | req/opt/proh |
|--------|--------|--------------------|---------------|--------------|
| project id | project.project.id | `project.project.id` | ReportIdentity.projectId | req |
| project name | project.project.name | `project.project.name` | ProjectSummary.projectName | req |
| project number | project.project.number | `project.project.number?` | ProjectSummary.projectNumber | opt (NOT_IMPLEMENTED if absent) |
| designer | — | (no field) | ProjectSummary.designerName | NOT_IMPLEMENTED (O-18) |
| createdAt | project.project.createdAt | `project.project.createdAt` | ProjectSummary.createdAt | req |

### 3-2. Bridge system / structure (R-03, R-06, CP-05/CP-06/CP-07/CP-09/CP-10/CP-13)
| domain | symbol | source | Report entity / CP | req/req/opt/proh |
|--------|--------|--------|--------------------|--|
| bridgeSystem | BridgeSystem.CONTINUOUS | draft.bridgeSystem | BridgeSummary.bridgeSystem; CP-06 | req |
| spanSystem | "continuous" | BSDD.phase1ScopeAssertion.spanSystem (generateBsdd.ts:467) | BridgeSummary.spanSystem; CP-06 | req |
| bridgeLength | draft.bridgeLength | draft.bridgeLength | BridgeSummary.bridgeLength; CP-05 | req (CONTINUOUS: Σspans) |
| width | draft.width | draft.width | BridgeSummary.width; CP-05 | req |
| girderCount | draft.girderCount | draft.girderCount | BridgeSummary.girderCount; CP-05 | req |
| girderDepth | draft.girderDepth | draft.girderDepth | BridgeSummary.girderDepth; CP-05 | req |
| spanCount | — | draft.spans.length | BridgeSummary.spanCount; CP-07 | req |
| supportCount | — | draft.supports.length | BridgeSummary.supportCount; CP-07 | req |
| spanLength | draft.spanLength | draft.spanLength (null for CONTINUOUS) | CP-07 (null→NOT_AVAILABLE); U-03 | CONTINUOUS: NOT_AVAILABLE |
| spans[] | BridgeLayoutSpan[] | draft.spans + layoutValidation.ts:234-251 | SpanSummary[]/CP-07 | req |
| span lengths | spans[].length | draft.spans[].length | SpanSummary.length; CP-07; CP-13 (Σ for volume) | req |
| supports[] | BridgeLayoutSupport[] | draft.supports | SupportSummary[]/CP-10 | req |
| support role/fixity | BridgeLayoutSupport.role/fixity | draft.supports | SupportSummary.role/fixity; CP-10 | req |
| girder layout | SDM mainGirders / segments | apolloBsdd.structuralDesignModel; bridgeStructureSolids | GirderSummary.segments; CP-09 | req |
| section inputs (flange/web/deck thk) | draft.topFlangeWidth/Thickness… | draft.* | SectionInputSummary; CP-13 | opt-no-for-CONTINUOUS; NOT_AVAILABLE for CONTINUOUS (U-03) |

### 3-3. Cross members / bracing (R-07, CP-11/CP-17)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| crossBeamSpacing | draft.crossBeamSpacing | draft.crossBeamSpacing | CrossMemberSummary.spacing; CP-11 | req |
| crossBeam stations | SDM crossBeams | apolloBsdd crossBeams | CrossMemberSummary.station[]; CP-11 | req |
| swayBracings | SDM swayBracings | apolloBsdd | CrossMemberSummary.swayBracing count; CP-11/CP-17 | opt |
| lateralBracings | SDM lateralBracings | apolloBsdd | CrossMemberSummary.lateralBrace count; CP-11/CP-17 | opt |
| stiffeners | SDM stiffeners | apolloBsdd | CrossMemberSummary.stiffener count; CP-11/CP-17 | opt |

### 3-4. Materials / adoption (R-03 adoption, R-10, CP-12)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| steelUnitWeight | draft.steelUnitWeight | draft.steelUnitWeight; generateBsdd.ts:446-449 | MaterialInputSummary.steelUnitWeight; CP-12 (UNVERIFIED/PENDING/UNKNOWN) | opt |
| rcUnitWeight | draft.rcUnitWeight | draft.rcUnitWeight | MaterialInputSummary.rcUnitWeight; CP-12 | opt |
| adoption status | GovernedQuantity.adoptionStatus | getBridgeStructureUnitWeightAdoption (adoption.ts:70); generateBsdd.ts:442/448 | R-03 adoptionStatus; CP-12 (PENDING/UNKNOWN; ADOPTED fail-closed under NOT_SELECTED) | req |

### 3-5. Loads (CP-14)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| loadCases | project.loadCases | project.loadCases | LoadInputSummary.count; CP-14 | req (count only; GOLD-AN placeholder) |
| load case details | — | (not exposed) | NOT_IMPLEMENTED / NOT_AUTHORIZED; CP-14 | proh |

### 3-6. Geometry / visualization / STL (R-08, CP-18)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| solids | solidGeometryParameters / groups | buildApolloVisualizationModelOrThrow (builder.ts:1026); bridgeStructureSolids | GeometrySummary.solids; CP-18 | req |
| STL manifest | triangles/bbox/digest | exportApolloBinaryStl (apolloStlExport.ts:95) | GeometrySummary.stl; CP-18 | req |

### 3-7. Validation / status (R-09/R-11, CP-19/CP-20/CP-21/CP-22)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| validation diagnostics | ApolloGuardIssue[] | validateBridgeStructureInputDraft (validation.ts:140); validateBridgeLayoutContract (layoutValidation.ts) | ValidationSummary.issues; CP-19 | req |
| STALE | bool | isBridgeStructureGenerationCurrent (generateBsdd.ts:558-561) | R-01.stale + CP-21 | req |
| numeric auth | DS-09 cells | DS-09 (numeric_authorization_gate); numericAuthorityGuard.ts | AuthorizationSummary.NOT_AUTHORIZED; CP-22 | req |
| warnings/diagnostics | string[] | reportModel.ts:150-156 + validators | WarningSummary; CP-20 | req |
| phase guards | AP00_SCOPE_* / PENDING_STEP_4E | phase1ScopeGuard.ts; featureFlag.ts | WarningSummary.humanConfirmationItems (H-01..H-03 now RESOLVED) | req |

### 3-8. Evidence / versioning (R-12, CP-03/CP-21/CP-25)
| domain | symbol | source | Report entity / CP | req |
|--------|--------|--------|--------------------|-----|
| inputRevision | draft.generatedAt | draft.generatedAt | EvidenceSummary.inputRevision; CP-25 | req |
| inputChecksum | contentChecksum | buildInputChecksum (generateBsdd.ts) | EvidenceSummary.inputChecksum; CP-25 | req |
| resultChecksum | contentChecksum | computeContentChecksum(reportModel.ts:321-322) | EvidenceSummary.resultChecksum; CP-25 | req |
| quantityChecksum | contentChecksum | buildQuantityModel (quantityModel.ts:632) | EvidenceSummary.quantityChecksum; CP-25 | req |
| appCommitSha | — | options.appCommitSha | EvidenceSummary.appCommitSha; CP-25 | opt |
| schemaVersions | REPORT_MODEL_SCHEMA_VERSION; quantity.schemaVersion; BSDD schemaVersion | reportModel.ts:18,343; generateBsdd.ts | AuditMetadata.schemaVersions; CP-03 | req |
| calculationReferenceIds | GOLD-SP/AN/QTY-001 | reportModel.ts:344 | EvidenceSummary.calculationReferenceIds; CP-25 | req |
| import/export manifest | sidecar keys | importExport manifest (CP-21 D7) | PersistenceSummary; CP-21 | opt |

### 3-9. CP-13 section (U-03 gate) — CONFIRMED boundary
- Source: `computeGirderSectionProperties` (sectionProperties.ts:48-108), gated reportModel.ts:119-148.
- CONTINUOUS → `draft.spanLength === null` → `section = null` → CH-SECTION/CP-13 = `NOT_AVAILABLE` ("断面入力不完全").
- Report Model **carries** the property set verbatim when dims complete AND spanLength present (SIMPLE); for CONTINUOUS = NOT_AVAILABLE (U-03 verdict B; DEC-PHA-0004 may refine in Phase 4). `steelVolumePerGirder` uses `bridgeLength` (sectionProperties.ts:107), not `spanLength`.

## 4. Boundary assertions (Phase 4 must enforce)

- Report Model never writes back to `ProjectModel`.
- Report Model never calls the solver/analyzer (no `runAnalysis` in Report Model path).
- Report Model never renders HTML/PDF (only `renderReportModelHtml` is an external adapter over `reportModelToCalculationCsv`/`renderReportModelHtml`).
- PROHIBITED items (O-19..O-30; CP-15/16/30..34) never appear in payload — only status placeholders.

## 5. Status

- Domain→Report mapping: FROZEN. `report_entity_matrix.csv` = machine form.
- HEAD: e849fbb (no code change).
