# Phase 4 Design Document — Road Advanced Calculation & Utilities

**Date:** 2026-07-16  
**Status:** AUTHORITATIVE  
**Approved by:** Cursor Grok 4.5 (supervisor)  
**Authoritative effective date:** 2026-07-16  
**Planning freeze:** [phase4_planning_freeze.md](phase4_planning_freeze.md)  
**Completion gate:** [phase4_completion_gate.md](phase4_completion_gate.md)

## Purpose

Define Phase 4 feature behavior, data shapes, UI boundaries, persistence, outputs, and verification requirements for **Road Advanced Calculation & Utilities**. This document is implementation guidance; it does not modify source code.

This document is **AUTHORITATIVE** as of 2026-07-16 (supervisor: Cursor Grok 4.5).

## Collision and naming

Same rules as [phase4_planning_freeze.md § Collision and naming](phase4_planning_freeze.md#collision-and-naming):

- Canonical **Road Advanced Calculation & Utilities** (this Phase 4).
- Not Phase 4.5 (BridgeDefinition parity), not BMV2 Phase 4 (load surface), not phase3.9 “Phase 4.0-x” sub-numbers.

## Governing constraints

| Constraint | Requirement |
| --- | --- |
| Persistence write target | `project.liner.roadDesignDocument` |
| `domainDraft` | In-memory / read-old only |
| `DrawingDocument` | Non-persistent; regenerate on load |
| Schema version | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` `0.1.0` unless separate approval |
| Numerical formulas | **Extraction Required** from JIP-LINER PDF until recorded; **no fabricated formulas** |
| Frame coupling | No FEM IDs, load cases, or solver results in RDD |

## Cross-cutting: stable ID and fail-closed

Aligned with [phase4_planning_freeze.md](phase4_planning_freeze.md) § Stable ID policy and § Fail-closed policy.

### Stable ID

- All new P4 persisted entities (alignments, LDIST jobs, haunch/hoso definitions) receive stable IDs and participate in round-trip through the RDD mapper.
- Use `stableIdRegistry` and deterministic derivation (`deriveStableUuid` / namespace rules) consistent with Phase 3 bridge layout IDs.
- UI and calculators resolve entities by ID; exports include ID columns per [`report_output_spec.md`](../output/report_output_spec.md).

### Fail-closed

- Validation on save/hydrate blocks invalid P4 payloads before they reach disk.
- P4 calculators emit diagnostics instead of partial silent results when references are invalid.
- Export paths default to blocked when error-level diagnostics are present.
- No fabricated ground profile or unapproved numeric formulas.

## Architecture overview

```text
User edits (UI)
    → LinerDomainDraftVNext (in-memory)
    → domainDraftToRoadDesignDocument (mapper)
    → RoadDesignDocument (persisted)
         ├─ alignments[], capability blocks
         └─ extensions (geometry + P4 input payloads)
    → buildIntermediateResult (pipeline)
    → P4 calculators (LDIST / HAUNCH / HOSO) — pure, deterministic
    → Reports / CSV / DrawingDocument builders (derived, non-persistent)
```

Reuse: [`linerDomainDraftRoadDesignMapper.ts`](../../../frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts), [`pipeline.ts`](../../../frontend/src/liner/core/pipeline/pipeline.ts), [`formalDrawingWorkspaceDocuments.ts`](../../../frontend/src/liner/drawing/formalDrawingWorkspaceDocuments.ts).

---

## P4-D01 — Multiple alignment and line management

### Goal

Support **multiple independent horizontal alignments** per liner project with one **active alignment** driving default editors, grid generation, and P4 calculations. Preserve stable line and offset references within each alignment.

### In scope

- Multiple `RoadAlignmentEntry` records in RDD `alignments[]`.
- Active alignment ID in geometry extension payload (or dedicated extension field).
- Per-alignment: horizontal elements, stationing, vertical profile reference, cross-section templates, offset lines.
- UI: alignment list, create/rename/select active, fail-closed validation on orphan references.
- Cross-alignment **ID namespace isolation** (no shared entity IDs across alignments).

### Deferred

- Branch / merge topology (Stage 10 R8-10 / PR-23).
- Multiple independent vertical alignments per line (phase3.9 deferred item).

### Data model

| Location | Content |
| --- | --- |
| RDD `alignments[]` | One entry per alignment (`entityId`, `coordinateContextId`, `label`) |
| RDD `topologyCapability` | `state: "supported"` when ≥2 alignments or topology refs present; else `supported` for single alignment |
| Extension payload | Extend `LinerDomainDraftGeometryPayload` (version bump **within** extension, not RDD schema): `alignments: HorizontalAlignmentDraft[]`, `activeAlignmentId`, per-alignment station/profile/cross-section bundles |
| Mapper | `domainDraftToRoadDesignDocument` / `roadDesignDocumentToDomainDraft` must round-trip all alignments |

Migration: reject legacy multi-alignment draft shapes that today error in [`projectLinerMigration.ts`](../../../frontend/src/liner/schema/projectLinerMigration.ts) only after forward mapper supports them; provide pure migration from single-alignment projects (default active = sole alignment).

### UI

- **Required:** Alignment manager on setup (line tab or dedicated sub-panel).
- **Required:** Active alignment indicator in summary header.
- **Unchanged:** Review tab remains Bridge Layout (spans/piers), scoped to active alignment unless explicitly multi-bridge later.

### Verification

- Stage 8 **R8-09**: two crossing alignments, O1 per line, EXACT ID namespaces.
- Unit: mapper round-trip, active switch, no cross-alignment leakage.
- Regression: extend golden fixtures or add `gc-08-multi-alignment` when implementation starts.

---

## P4-D02 — LDIST equivalent

### Semantic authority

- JIP-LINER manual **§5.8** (distance / overhang / grid-related distance semantics).
- Stage 8 **R8-12**: skew/curved girders and overhang at stations; O1 vector distance/projection hand calc; ABS distance register.

**Formula status: Extraction Required** — do not implement numeric parity until §5.8 formulas are transcribed into an approved extraction record (path TBD under `docs/road/phase4/` or `docs/history/road/phase4/` at implementation time).

### Calculation types (design families — not formulas)

| Type family | Description | Outputs (conceptual) |
| --- | --- | --- |
| Point-to-point grid distance | Distance along projection between two referenced grid points or offset lines at a station | `distanceM`, `fromLineId`, `toLineId`, `stationPhysicalDistance` |
| Station overhang / cantilever | Overhang length from support or pier line to girder/edge line at station | `overhangM`, `side`, `referenceLineId` |
| Skew-aware distance | Distance where pier/skew angle applies (reuse pier line geometry concepts) | `distanceM`, `skewAngleRad`, diagnostics |

### Inputs

| Input | Source | Validation |
| --- | --- | --- |
| Active alignment | P4-D01 | Required |
| Grid points / offset lines | Intermediate `grid` | Referenced IDs must exist |
| Station list or explicit station | `stations.entries` or user pick | In alignment range |
| LDIST job definition | RDD extension: `ldistJobs[]` or capability-attached payload | Stable job `id`, line/point refs, station scope |
| Bridge layout (optional) | Spans/piers when overhang references pier/skew | Fail-closed if out of range |

Persist: `ldistCapability.state: "supported"` when jobs exist; input payload in extensions (preferred over new top-level RDD arrays).

### Outputs

| Output | Rule |
| --- | --- |
| Per-job result rows | `jobId`, `stationPhysicalDistance`, `displayedStation`, distances, signs, `sourceRevision`, `algorithmVersion` |
| Diagnostics | Invalid refs → `LINER_LDIST_*` codes; no silent skip |
| Derived | **Recompute** on load; optional cache in extension only if byte-identical to recompute |

### Abnormal conditions

- Missing line/grid reference → error diagnostic; no numeric result for that row.
- Station outside alignment length → error.
- Degenerate geometry (coincident points) → warning or error per extraction record once defined.
- Clothoid segments → use existing pipeline samples; document dependency on [`numerical_accuracy.md`](../design/numerical_accuracy.md) inverse/offset tolerances.

### Reports and CSV

| Section key | Columns (English keys) |
| --- | --- |
| `ldistResults` | `jobId`, `fromLineId`, `toLineId`, `stationPhysicalDistance`, `displayedStation`, `distanceM`, `overhangM`, `side`, `signConvention` |

CSV file: `ldist_results.csv` with same keys. HTML report section per [`report_output_spec.md`](../output/report_output_spec.md) pattern.

### UI

- LDIST editor panel (setup new sub-tab **or** utilities section — **required** before P4-D02 COMPLETE).
- Run/clear actions; diagnostics panel.
- **Not** placed in review (Bridge Layout) tab.

### Numerical tests

| Test | Oracle |
| --- | --- |
| Straight grid, orthogonal offset | O1 hand Pythagoras / projection |
| Skew pier line case | O1 hand vector distance (R8-12 fixture) |
| Invalid reference | EXACT diagnostic code |

**Gate:** No P4-D02 COMPLETE without committed O1 baseline fixtures and Vitest files.

---

## P4-D03 — HAUNCH equivalent

### Semantic authority

- JIP-LINER manual **§6** (haunch regions, types, elevations).
- Stage 8 **R8-13**: 2-point / 3-point / plane / range families; O1 hand planes/lines; COMBINED elevation register.

**Formula status: Extraction Required** for all type families before numeric COMPLETE.

### Type families (design — not formulas)

| Family | Intent |
| --- | --- |
| Two-point haunch | Haunch defined by two station/elevation anchors |
| Three-point haunch | Three-point definition in station/elevation plane |
| Plane haunch | Planar haunch surface over a region |
| Range haunch | Station range with boundary rules |

### Inputs

| Input | Validation |
| --- | --- |
| `haunchDefinitions[]` in extension | Stable `id`, `type` enum, station range, point refs, side |
| Active alignment + profile | Elevation datum consistent with vertical pipeline |
| Cross-section / deck references | Optional; fail-closed on missing refs |

Persist: `haunchCapability.state: "supported"` when definitions exist.

### Outputs

| Field | Unit |
| --- | --- |
| `haunchTopElevationM` | m |
| `haunchThicknessM` | m (where applicable) |
| `stationPhysicalDistance`, `displayedStation` | m |
| `side` / `sign` | enum per extraction record |

### Abnormal conditions

- Overlapping incompatible ranges → error.
- Negative thickness where manual forbids → error (R8-14-style rejection pattern).
- Profile unavailable at station → error.

### Reports and CSV

| Section / file | Keys |
| --- | --- |
| `haunchResults` / `haunch_results.csv` | `definitionId`, `type`, `stationPhysicalDistance`, `haunchTopElevationM`, `haunchThicknessM`, `side` |

### UI

- Haunch definition editor and results table (**required**).
- Link from bridge/deck context where helpful; no BridgeDefinition rewrite.

### Numerical tests

- One **O1 baseline per type family** minimum before COMPLETE.
- Boundary station rows and interior station rows per R8-13.

---

## P4-D04 — HOSO equivalent

### Semantic authority

- JIP-LINER manual **§7** (pavement thickness).
- Stage 8 **R8-14**: auto, longitudinal, transverse, 2/3-point thickness; O1 hand plane/interpolation; COMBINED thickness register; negative rejection.

**Formula status: Extraction Required** before numeric COMPLETE.

### Type families (design — not formulas)

| Family | Intent |
| --- | --- |
| Auto thickness | Rule-driven thickness from road model inputs |
| Longitudinal | Thickness varying along station |
| Transverse | Thickness varying across offset |
| Two-point / three-point | Point-defined thickness field |

### Inputs

| Input | Validation |
| --- | --- |
| `hosoDefinitions[]` in extension | `id`, `type`, station/offset scope, point refs |
| Profile + crossfall | Required for elevation-relative thickness |
| Non-negativity rules | Per extraction record |

Persist: `hosoCapability.state: "supported"` when definitions exist.

### Outputs

| Field | Unit |
| --- | --- |
| `pavementThicknessM` | m (non-negative where required) |
| `pavementElevationM` | m (if applicable) |
| `stationPhysicalDistance`, `offsetM` | m |

### Abnormal conditions

- Negative thickness → reject with diagnostic.
- Missing profile/crossfall at sample → error.
- Out-of-range station → error.

### Reports and CSV

| Section / file | Keys |
| --- | --- |
| `hosoResults` / `hoso_results.csv` | `definitionId`, `type`, `stationPhysicalDistance`, `offsetM`, `pavementThicknessM`, `pavementElevationM` |

### UI

- HOSO definition editor and results preview (**required**).

### Numerical tests

- O1 baseline per family; negative-thickness rejection test (R8-14).

---

## P4-D05 — Review diagrams and utilities UI

### Primary entry (frozen)

| Role | Path |
| --- | --- |
| **Primary** | **Formal Drawing workspace** — `/pro/liner/drawings/plan`, `/profile`, `/cross-section` ([`LinerFormalDrawingWorkspacePage`](../../../frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx)) |
| **Secondary** | [`LinerPreviewPage`](../../../frontend/src/liner/pages/LinerPreviewPage.tsx) — link or shortcut into Formal Drawing; optional read-only summary strip |

Preview does **not** replace Formal Drawing as the confirmation-diagram authority surface.

### Policy (frozen)

| Element | Decision |
| --- | --- |
| Setup `review` tab | **Bridge Layout only** — [`BridgeLayoutEditor`](../../../frontend/src/liner/components/BridgeLayoutEditor.tsx), spans/piers. **Do not** add confirmation drawing canvas here. |
| Confirmation diagrams | Delivered through **Formal Drawing workspace** (primary). Preview may link in (secondary). |
| New entry | Optional additional route allowed if it routes to or embeds Formal Drawing; must not replace Bridge Layout review. |
| `DrawingDocument` | Built at runtime; preview/print/DXF share one build (Phase 3 parity). **Not saved** to RDD. |
| Ground line | **Unavailable** — keep `地盤データ未設定` / band `—` behavior. |
| Widening band row | Remains `unavailable` until widening slice is separately approved (out of P4). |
| Stale i18n | Replace `setupTabPlaceholder.review` bullets that promise “Phase 4.0-2” in implementation PR; design intent is P4-D05. |

### Enhancements (required for P4-D05 COMPLETE)

| Diagram | Enhancement |
| --- | --- |
| **Plan** | IP/BC/EC markers, segment dimensions, coordinate tables (extend existing formal builders). |
| **Profile** | Grade, VCL, vertical curve indicators; explicit unavailable ground band. |
| **Cross-section** | Station-driven section with crossfall; tie to active alignment. |
| **Band sheet** | Crossfall values from pipeline; widening row stays unavailable. |
| **Preview (secondary)** | Link or banner directing users to Formal Drawing workspace. |

### P4 calculation overlays (optional for D05 COMPLETE)

- LDIST/HAUNCH/HOSO result annotations on diagrams are **optional** in P4-D05; **required** before final P4-D08 if supervisor demands diagram parity with JIP-LINER §8 semantics (O6 only).

### Persistence interaction

- `drawingSettings` continues RDD round-trip via geometry extension (Phase 3 pattern).
- Diagram content regenerates after reload; no `drawingDocument` in saved JSON.

---

## P4-D06 — Reports and CSV

### Goal

Deliver road **calculation reports** (HTML) and **CSV** exports from canonical intermediate results + P4 result arrays.

### Base specification

Extend [`report_output_spec.md`](../output/report_output_spec.md):

| Section | Phase | Source |
| --- | --- | --- |
| `projectInfo` | Existing | metadata + `computedAt`, `sourceRevision` |
| `alignmentSegments` | Existing | horizontal segments (active alignment or all) |
| `stationCoordinates` | Existing | `stations.entries` |
| `profileElevations` | Existing | vertical samples |
| `gridPoints` | Existing | `grid.points` |
| `ldistResults` | **P4** | P4-D02 |
| `haunchResults` | **P4** | P4-D03 |
| `hosoResults` | **P4** | P4-D04 |
| `diagnostics` | Existing + P4 codes | merged diagnostics |

### CSV exports (required files)

| File | Content |
| --- | --- |
| `grid_points.csv` | Per report spec: `gridPointId`, `displayedStation`, `offset`, `x`, `y`, `z` |
| `ldist_results.csv` | P4-D02 columns |
| `haunch_results.csv` | P4-D03 columns |
| `hoso_results.csv` | P4-D04 columns |

### UI

- Export actions on Preview and/or Formal Drawing workspace header (**at least one** user-visible path required).
- Labels via i18n; English keys in file headers.

### Rules

- Export only when computation `ready` (no error-level diagnostics blocking export unless user override is explicitly designed — default **fail-closed**).
- No re-sampling beyond intermediate result arrays.
- Formatting per [`unit_and_precision_policy.md`](../design/unit_and_precision_policy.md).

### Verification

- Vitest: column keys, row counts, finite numeric values.
- Plan: [`test_plan_cad_report.md`](../verification/test_plan_cad_report.md) checklist items for CSV/report.

---

## P4-D07 — Persistence, legacy, migration

### Write path

```text
serializeProjectForPersistence
  → domainDraftToRoadDesignDocument(domainDraft)
  → project.liner.roadDesignDocument = document
  → strip domainDraft / drawingDocument from persisted JSON
```

### Read path

```text
hydrateProjectLinerFromPersistence
  → roadDesignDocumentToDomainDraft OR migrateLinerDraftToVNext (read-old)
  → in-memory domainDraft for UI
```

### P4 field placement (preferred)

| Data | Placement |
| --- | --- |
| Multi-alignment geometry | Extension payload version bump (e.g. `0.2.0` payload, RDD schema stays `0.1.0`) |
| LDIST/HAUNCH/HOSO inputs | Extension arrays + capability `state` |
| LDIST/HAUNCH/HOSO cached results | **Discouraged**; if present, must match recompute |

### Migration framework

- Register pure steps in [`contracts/migration/registry.ts`](../../../frontend/src/contracts/migration/registry.ts).
- Legacy importer adapter [`contracts/legacy/road/adapter.ts`](../../../frontend/src/contracts/legacy/road/adapter.ts): map known fields; quarantine unknowns.
- **No** `schemaVersion` bump without separate approval document.
- **No** dual write to `domainDraft` and RDD.

### Deferred

- Full Importer target workflow (PR-26).
- Automatic migration of branch/merge topology.

### Tests

- `migrationIntegration.test.ts` pattern extended for P4 payloads.
- `linerDomainDraftRoadDesignMapper.test.ts` round-trip for each P4 field group.

---

## P4-D08 — E2E and verification integration

### E2E scenarios (minimum)

| ID | Scenario |
| --- | --- |
| P4-E2E-01 | Multi-alignment create/save/reload/active switch |
| P4-E2E-02 | LDIST job → results visible → CSV download |
| P4-E2E-03 | HAUNCH/HOSO save/reload round-trip |
| P4-E2E-04 | Formal drawing confirmation after reload (drawingSettings + regenerated DrawingDocument) |
| P4-E2E-05 | Review tab still shows Bridge Layout only (regression) |

Extend existing Playwright specs under [`frontend/tests/e2e/`](../../../frontend/tests/e2e/).

### Regression

- Add P4 cases to `test:regression` or dedicated `phase4` Vitest suite.
- Golden numeric baselines for O1 oracles committed under `examples/liner/`.

### Final verification artifact

After P4-D08 implementation, add `docs/history/road/phase4_final_verification.md` (history path; required for Phase 4 implementation COMPLETE, not for this design-document approval).

---

## Cross-cutting: units and tolerances

| Quantity | Primary doc | Phase 4 use |
| --- | --- | --- |
| Length, station (m) | [`numerical_accuracy.md`](../design/numerical_accuracy.md) | LDIST distances, HAUNCH/HOSO elevations/thicknesses |
| Offset (m) | 1e-4 m inverse projection | LDIST transverse samples |
| Angles (rad) | 1e-9 azimuth | Skew-aware LDIST |
| Display | [`unit_and_precision_policy.md`](../design/unit_and_precision_policy.md) | Reports, CSV, diagrams |

Stage 8 per-row tolerance modes (R8-12 ABS, R8-13/14 COMBINED) apply at benchmark registration time.

---

## Cross-cutting: error handling

- Fail-closed validation on save/hydrate (Phase 3 pattern).
- Stable diagnostic codes with i18n `messageKey`.
- No silent fallback for missing JIP-extracted rules — return `Extraction Required` diagnostic in dev builds if algorithm version not registered.

---

## Related documents

| Document | Path |
| --- | --- |
| Planning freeze | [phase4_planning_freeze.md](phase4_planning_freeze.md) |
| Completion gate | [phase4_completion_gate.md](phase4_completion_gate.md) |
| Domain model | [`domain_model.md`](../design/domain_model.md) |
| Calculation pipeline | [`calculation_pipeline.md`](../design/calculation_pipeline.md) |
| Line dependency graph | [`line_dependency_graph.md`](../design/line_dependency_graph.md) |
| Formal drawing UI | [`formal_drawing_ui_design.md`](../output/formal_drawing_ui_design.md) |
| JIP-LINER index | [`docs/manual/README.md`](../../manual/README.md) |
