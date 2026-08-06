# 05 — CP Chapter Payload Contract

> **Authority:** Phase 3-E (specification freeze)
> **Base:** Phase 2 `chapter_matrix.csv`, `03_report_chapter_structure.md` §3 (CH→CP mapping), `04_report_model_entity_spec.md` (R-01..R-22), `reportModel.ts` (CH-* scaffold).
> **Judge:** Apollo architecture. No TypeScript / implementation.

## 1. Purpose

Define, per canonical `CP-*` chapter, the **payload contract**: which entities/fields are emitted, availability rule, summary vs detail projection, and state behavior (STALE / NOT_AUTHORIZED / PROHIBITED / missing). Also freeze the **CH-* deprecated alias** mapping (Phase 4 must emit CP-*, not CH-*).

## 2. CH-* deprecated alias mapping (Phase 4 must migrate to CP-*)

| CH-* (scaffold, reportModel.ts:25-42) | canonical CP-* | deprecated? |
|---|---|---|
| CH-COVER (project) | CP-01 / CP-04 | yes (split to CP-01 cover + CP-04 工事情報) |
| CH-COVER (metadata) | CP-03 | yes |
| CH-DESIGN-COND | CP-06 | yes |
| CH-STRUCTURE | CP-05 / CP-07 / CP-09 / CP-10 | yes (split) |
| CH-INPUTS | CP-07 / CP-09 / CP-10 / CP-11 / CP-12 | yes (split) |
| CH-SECTION | CP-13 | yes (NOT_AVAILABLE for CONTINUOUS) |
| CH-LOADS | CP-14 | yes |
| CH-ANALYSIS-SETTINGS | CP-16 | yes (dev-note) |
| CH-REACTIONS | CP-30 | yes (NOT_AVAILABLE) |
| CH-SHEAR | CP-31 | yes (NOT_AVAILABLE) |
| CH-MOMENT | CP-32 | yes (NOT_AVAILABLE) |
| CH-DEFLECTION | CP-33 | yes (NOT_AVAILABLE) |
| CH-DEMAND | CP-34 | yes (NOT_AUTHORIZED) |
| CH-QUANTITY | CP-25 (detail) | yes |
| CH-DRAWING-REF | CP-18 / CP-24 | yes |
| CH-WARNINGS | CP-20 | yes |
| CH-AUDIT | CP-25 (audit) | yes |
| — | CP-02 / CP-08 / CP-15 / CP-17 / CP-19 / CP-21 / CP-22 / CP-23 | new (no CH source) |

**Rule:** Phase 4 Report Model emits `chapter_id` ∈ {CP-01..CP-25, CP-30..CP-34}. CH-* IDs must NOT appear in output (only as internal deprecated alias for backward trace).

## 3. Chapter payload contracts

### CP-01 COVER (A, required; summary+detail)
- **entity:** ReportMetadata (reportId/projectId) + ReportIdentity
- **required:** reportId, projectId, mode="DEVELOPMENT", authorizationStatus="NOT_GRANTED"
- **optional:** none
- **prohibited:** formal PDF marker, AUTHORIZED
- **availability:** always emitted; summary emits id+mode+auth; detail + generatedAt+watermark
- **stale:** emit STALE badge if stale (value preserved as last)
- **not_authorized:** always NOT_AUTHORIZED badge
- **future:** none

### CP-02 SCOPE (A, required; summary+detail)
- **entity:** ReportScope (purpose/application scope)
- **required:** purpose, in_scope_systems, out_of_scope, numeric_authorization_status
- **prohibited:** treating continuous as fully in-scope for numerics
- **availability:** always emitted
- **basis:** 02_report_purpose_and_classification.md

### CP-03 METADATA (A, required; summary+detail)
- **entity:** ReportMetadata (version/timestamp/checksum)
- **required:** schemaVersion, reportId, projectId, generatedAt, inputRevision, inputChecksum, resultChecksum, quantityChecksum
- **stale:** STALE propagates (checksum reflects stale input)
- **basis:** reportModel.ts:18,163-168,301-306,326,343

### CP-04 PROJECT (B, required; summary+detail)
- **entity:** ProjectSummary (R-02)
- **required:** projectId, projectName, createdAt
- **optional:** projectNumber (NOT_IMPLEMENTED if absent, O-18)
- **prohibited:** designerName (NOT_IMPLEMENTED, O-18)
- **basis:** reportModel.ts:163-164

### CP-05 BRIDGE_SUMMARY (B, required; summary+detail)
- **entity:** BridgeSummary (R-03)
- **required:** bridgeSystem, spanSystem, bridgeLength, width, girderCount, girderDepth, spanCount, supportCount
- **optional:** adoptionStatus
- **stale/NA:** NOT_AVAILABLE if STALE or input incomplete; CONTINUOUS bridgeLength = Σspans
- **basis:** reportModel.ts:175,184-188; generateBsdd.ts:467

### CP-06 BRIDGE_SYSTEM (B, required; summary+detail)
- **entity:** BridgeSystemSummary (R-03 bridgeSystem/spanSystem)
- **required:** bridgeSystem (BridgeSystem.CONTINUOUS), spanSystem ("continuous")
- **authorization:** UNVERIFIED→NOT_AUTHORIZED
- **basis:** reportModel.ts:175; generateBsdd.ts:467 (DEC-PHA-0001)

### CP-07 SPANS (B, required; summary+detail)
- **entity:** SpanSummary[]/SupportSummary[] (R-04/05)
- **required:** spanCount, supportCount, per-span length/stations, per-support station/role/fixity
- **optional:** spanLength (NOT_AVAILABLE for CONTINUOUS)
- **stale:** NOT_AVAILABLE if STALE
- **basis:** reportModel.ts:184-188; layoutValidation.ts:234-251

### CP-08 ALIGNMENT (A, FORBIDDEN; none)
- **prohibited:** curve/skew geometry
- **behavior:** NOT_IMPLEMENTED / always NOT_AVAILABLE
- **basis:** artifactBundle.ts:235-239 unsupportedScope (DEC-PHA-0003)

### CP-09 GIRDERS (B, required; summary+detail)
- **entity:** GirderSummary[] (R-06)
- **required:** per-girder id/offset/count/depth/spacing/segments
- **basis:** reportModel.ts:186-187; generateBsdd.ts; bridgeStructureSolids.ts

### CP-10 SUPPORTS (B, required; summary+detail)
- **entity:** SupportSummary[] (R-05)
- **required:** per-support id/station/role/fixity
- **basis:** reportModel.ts:184-188; generateBsdd.ts:116-124

### CP-11 CROSS_MEMBERS (C, required; summary+detail)
- **entity:** CrossMemberSummary (R-07)
- **required:** count, spacing, station[], swayBracing/lateralBrace/stiffener counts
- **basis:** reportModel.ts:109-110; bridgeStructureSolids.ts

### CP-12 MATERIALS (B, required; summary+detail)
- **entity:** MaterialInputSummary + adoption (R-03 adoption/R-16)
- **required:** steelUnitWeight/rcUnitWeight + adoptionStatus (PENDING/UNKNOWN; ADOPTED fail-closed under NOT_SELECTED)
- **authorization:** NOT_AUTHORIZED
- **basis:** reportModel.ts:199-200; generateBsdd.ts:418/448; adoption.ts:70; BridgeStructureInputPanel.tsx:256

### CP-13 SECTION (B, optional-no-for-CONTINUOUS; summary+detail *simple only*)
- **entity:** SectionInputSummary / SectionProperties (R-06)
- **required:** section dimensions when complete (SIMPLE)
- **behavior:** SIMPLE → UNVERIFIED 7 rows; **CONTINUOUS → NOT_AVAILABLE** ("断面入力不完全") — U-03 verdict B
- **volume:** steelVolumePerGirder uses bridgeLength (sectionProperties.ts:107), not spanLength
- **stale/NA:** NOT_AVAILABLE if STALE or incomplete dims or CONTINUOUS
- **future:** DEC-PHA-0004 may refine (length-independent props); invariants preserved
- **basis:** reportModel.ts:119-148,206-216; sectionProperties.ts:48-108

### CP-14 LOADS (B, optional; summary+detail placeholder)
- **entity:** LoadInputSummary
- **required:** loadCase count (project.loadCases?.length)
- **prohibited:** real load case details (PROHIBITED, O-19..O-30)
- **basis:** reportModel.ts:222-223

### CP-15 LOAD_COMBOS (D-future, FORBIDDEN; none)
- **behavior:** NOT_IMPLEMENTED / always NOT_AVAILABLE
- **basis:** reportModel.ts:222-223 (count only)

### CP-16 ANALYSIS_MODEL (D-future, optional; dev-note only)
- **entity:** AnalysisModelNote
- **required:** note that analysis uses simple-span idealization (development only)
- **prohibited:** actual analysis model / negative bending
- **basis:** appurtenenceHaunchAnalysisAdapter.ts:385

### CP-17 NODES_MEMBERS (C, optional; detail only)
- **entity:** SDM entity list
- **required:** mainGirders/rcDecks/crossBeams/bracing counts (detail)
- **summary:** omitted
- **basis:** generateBsdd.ts; 04 #5

### CP-18 GEOMETRY_3D (C, required; summary+detail)
- **entity:** GeometrySummary (R-08)
- **required:** solids (kind/count/dimensions/assumptions) + STL manifest (triangles/bbox/digest/axis/digest)
- **stale:** NOT_AVAILABLE if STALE/no solids
- **basis:** bridgeStructureSolids.ts; exportApolloBinaryStl (apolloStlExport.ts:95)

### CP-19 VALIDATION (B, required; summary+detail)
- **entity:** ValidationSummary (R-09)
- **required:** complete flag + issues{code,message,path} + persistenceIssues
- **basis:** validateBridgeStructureInputDraft (validation.ts:140); layoutValidation.ts

### CP-20 WARNINGS (A, required; summary+detail)
- **entity:** WarningSummary (R-11)
- **required:** 5-line mandatory watermark + warnings[] + 10 state codes; humanConfirmationItems (H-01..H-03 now RESOLVED)
- **basis:** reportModel.ts:150-156; 07_warning_and_status_message_spec.md

### CP-21 PERSISTENCE (B, required; summary+detail)
- **entity:** PersistenceSummary
- **required:** inputRevision (draft.generatedAt) + STALE flag + sidecar key list
- **stale:** always emit STALE flag
- **basis:** reportModel.ts:116,304; generateBsdd.ts:558-561

### CP-22 AUTHORIZATION (A, required; summary+detail)
- **entity:** AuthorizationSummary (R-10)
- **required:** numericAuthorization=NOT_GRANTED; DS-09 cells NOT_AUTHORIZED; gate
- **never:** ADOPTED
- **basis:** 07 §4 boundary; 08_numeric_authorization_gate.md; DS-09

### CP-23 NOT_IMPLEMENTED (A, required; summary+detail)
- **entity:** GapList
- **required:** U-01..U-06 enumerated list; H-01..H-03 resolved status
- **basis:** 08_gap_analysis.md §4

### CP-24 REFERENCES (A, optional; detail only)
- **entity:** ReferenceList
- **required:** GOLD-* refs
- **summary:** omitted
- **basis:** reportModel.ts:344

### CP-25 EVIDENCE (A, required; detail only)
- **entity:** EvidenceSummary (R-12)
- **required:** inputRevision/checksums/generatedAt/appCommitSha/schemaVersions/dataSources/calculationReferenceIds
- **summary:** id + resultChecksum prefix only
- **basis:** reportModel.ts:301-306,344

### CP-30 REACTIONS / CP-31 SHEAR / CP-32 MOMENT / CP-33 DEFLECTION (D-future, FORBIDDEN; none)
- **behavior:** NOT_AVAILABLE (no zero-fill)
- **basis:** reportModel.ts:238,243,248,253

### CP-34 DEMAND (D-future, FORBIDDEN; none)
- **behavior:** NOT_AUTHORIZED; formalOkNg NOT_EMITTED
- **basis:** reportModel.ts:259-261

## 4. Projection rules (summary vs detail)

- **summary:** CP-01..CP-06, CP-07 (counts), CP-11 (counts), CP-12 (status), CP-18 (counts), CP-19 (complete flag), CP-20 (watermark+count), CP-21 (STALE flag), CP-22 (auth), CP-23 (count), CP-25 (id+checksum prefix).
- **detail:** all emit-able CP-* plus per-element arrays (CP-07/CP-10/CP-09 per-element, CP-17, CP-24, CP-25 full).
- **detail-only (summary omitted):** CP-17, CP-24, CP-25 full evidence.
- **FORBIDDEN (never emitted):** CP-08, CP-15, CP-16(only dev-note), CP-30..34.
- **No field recomputation** across projections; summary is a strict field/count subset of detail.

## 5. Availability rule table (machine: chapter_payload_matrix.csv)

| chapter_id | required_optional_forbidden | summary_ok | detail_ok | STALE behavior | PROHIBITED behavior |
|------------|----------------------------|------------|-----------|----------------|---------------------|
| CP-01..CP-07, CP-09, CP-11 | required | yes | yes | NOT_AVAILABLE if STALE (badge + preserve) | n/a |
| CP-08 | forbidden | no | no | always NOT_AVAILABLE | NOT_AVAILABLE |
| CP-10 | required | yes | yes | NOT_AVAILABLE if STALE | n/a |
| CP-12 | required | yes | yes | NOT_AVAILABLE if STALE | ADOPTED fail-closed |
| CP-13 | optional-no-for-CONTINUOUS | simple-only | simple-only | NOT_AVAILABLE if STALE/incomplete | NOT_AVAILABLE for CONTINUOUS (U-03) |
| CP-14 | optional | yes | yes | NOT_AVAILABLE if STALE | detail values PROHIBITED (O-19..O-30) |
| CP-15 | forbidden | no | no | always NOT_AVAILABLE | NOT_AVAILABLE |
| CP-16 | optional | no | dev-note only | n/a | n/a (note only) |
| CP-17 | optional | no | yes | NOT_AVAILABLE if STALE | n/a |
| CP-18 | required | yes | yes | NOT_AVAILABLE if STALE/no solids | n/a |
| CP-19 | required | yes | yes | n/a | n/a |
| CP-20 | required | yes | yes | always emit | n/a |
| CP-21 | required | yes | yes | always emit STALE flag | n/a |
| CP-22 | required | yes | yes | always NOT_AUTHORIZED | always NOT_AUTHORIZED |
| CP-23 | required | yes | yes | always emit | n/a |
| CP-24 | optional | no | yes | n/a | n/a |
| CP-25 | required | yes(id+ck) | yes full | n/a | n/a |
| CP-30..34 | forbidden | no | no | always NOT_AVAILABLE/NOT_AUTHORIZED | NOT_AVAILABLE/NOT_AUTHORIZED |

## 6. Phase 4 obligations

- Emit CP-* chapter_id only (no CH-*).
- Honor availability/STALE/NOT_AUTHORIZED/PROHIBITED/missing rules per `chapter_payload_matrix.csv`.
- Preserve CH→CP split semantics (CH-STRUCTURE → CP-05/06/07/09/10, etc.).

## 7. Status

- Chapter payload contract: FROZEN. `chapter_payload_matrix.csv` = machine form.
- HEAD: 6ab40bb (no code change).
