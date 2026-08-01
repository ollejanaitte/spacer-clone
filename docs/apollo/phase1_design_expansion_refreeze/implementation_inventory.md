# LV-03 Apollo Implementation Inventory

**Verification ID:** LV-03  
**Branch:** `docs/apollo-refreeze-local-verification`  
**Recorded:** 2026-08-01  
**Method:** Code search and file inspection only (no inference from docs or UI labels alone).  
**Classification enum:** `IMPLEMENTED` | `PARTIALLY_IMPLEMENTED` | `SCAFFOLD_ONLY` | `PLANNED` | `BLOCKED` | `OUT_OF_SCOPE` | `UNKNOWN`

## Summary

| Classification | Count |
|----------------|------:|
| IMPLEMENTED | 5 |
| PARTIALLY_IMPLEMENTED | 11 |
| SCAFFOLD_ONLY | 1 |
| PLANNED | 5 |
| OUT_OF_SCOPE | 2 |
| BLOCKED | 0 |
| UNKNOWN | 0 |

Apollo Phase 1 today is an **input-and-visualization shell** (`frontend/src/apollo/`) on top of `ProjectModel.apolloPhase1Unit2`. Structural calculation, authoritative result export, and AP-DX design modules are **not wired into the Apollo route**. Shared platform code (IF3, export gates, `BridgeDefinition` generator, BSDD contracts) exists elsewhere in the monorepo but is largely **not consumed by Apollo UI**.

## Inventory table

| # | Target | Classification | Evidence (inspected paths) | Notes |
|---|--------|----------------|------------------------------|-------|
| 1 | Apollo route / workspace | **IMPLEMENTED** | `frontend/src/apollo/routes.ts` (`/pro/apollo`); `ApolloRouteHost.tsx`; `workspace.ts` (localStorage `apollo_phase1_nn_workspace_v1`, CRUD, max 12 projects); `ApolloPhase1Shell.tsx` (guided + list editor) | Route host, unsaved-guard, history, workspace persistence operational. |
| 2 | BSDD contracts | **PARTIALLY_IMPLEMENTED** | `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`; `contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts`; `contracts/runtime/parsers.ts` (`parseBridgeSuperstructureDesignDocumentValue`); tests in `contracts/__tests__/bridgeSuperstructureDesignDocument.test.ts` | Type, semantic validation, JSON Schema, and parser exist. **No Apollo producer/consumer** (`grep` over `frontend/src/apollo/**` finds zero `BSDD`/`BridgeSuperstructure` references). No backend persistence for BSDD (`backend/**` has no matches). |
| 3 | Lifecycle / stale / validation | **PARTIALLY_IMPLEMENTED** | BSDD: `BsddLifecycleStatus`, `BsddValidationStatus`, `BsddAnalysisBindingStatus` in `bridgeSuperstructureDesignDocument.ts`; IF3 staleness: `backend/engine/if3_staleness.py`, `frontend/src/results/if3ResultGate.ts`; Apollo draft validation: `unit2Draft.ts` (`validateApolloPhase1Unit2Draft`), `validationNavigator.ts` | Three parallel subsystems; **not integrated** in Apollo route. Apollo shell states calculation/output disabled (`ApolloPhase1Shell.tsx` onboarding slide). |
| 4 | Bridge basic conditions | **PARTIALLY_IMPLEMENTED** | `phase1ScopeGuard.ts` (alignment, skew 90°, girder count 4–6, deck type, span system, analysis type); `types.ts` (`Phase1BridgeScopeInput`); `ApolloPhase1Shell.tsx` project metadata editor | Scope **preflight guards** exist; no persisted bridge-condition form bound to BSDD `phase1ScopeAssertion`. |
| 5 | Span / support / girder geometry | **PARTIALLY_IMPLEMENTED** | `unit2Draft.ts` (nodes, members, supports CRUD + validation); `visualization/builder.ts` (span extraction, girder solids from member geometry); `bridgeDefinition/types.ts` (canonical span/support/girder types, separate layer) | Apollo edits discrete nodes/members/supports. Girder solids use **default dimensions**, not user girder-section input. `BridgeDefinition` not referenced from `apollo/**`. |
| 6 | Deck definition | **PARTIALLY_IMPLEMENTED** | BSDD `BsddDeck` (`deckKind: "rc_non_composite"`) in contracts; `visualization/types.ts` + `builder.ts` (`DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.deck`, deck solids per span) | Visualization deck is **heuristic** (width/thickness defaults). No Apollo deck editor or governed deck parameters. |
| 7 | Cross beam / floor system shell | **PARTIALLY_IMPLEMENTED** | `visualization/builder.ts` (cross-beam solids at `stationFractions`; bracing between stations); `visualization/types.ts` (`crossBeam`, `bracing` defaults); `ApolloVisualizationRenderer.ts`, `threeUtils.ts` (visibility groups) | **Display-only** geometry from defaults; no editable cross-beam/floor-system design entities in `unit2Draft`. |
| 8 | Material / section registry | **PARTIALLY_IMPLEMENTED** | `unit2Draft.ts` (`materialReferences`, `sourceStatus: "blocked_by_numeric_evidence"`); `ProjectModel.materials` / `sections` via `buildApolloPhase1Unit2ViewProject`; LINER `section-list/` (separate importer path) | Apollo UI shows material **names/refs only** (`ApolloPhase1Shell.tsx` materials pane). BSDD `sectionIntentRefId` exists in contracts only. No unified section-intent registry in Apollo. |
| 9 | Load shell | **SCAFFOLD_ONLY** | BSDD `BsddLoadCase` / `BsddLoad` types in contracts; `unit2Draft.ts` clears `loadCases`/`nodalLoads`/`memberLoads` in view projection (`buildApolloPhase1Unit2ViewProject`); `importExport.ts` preserves `loadCases` on project import; no load editor in `ApolloPhase1Shell.tsx` | Load **types** and import passthrough exist; Apollo workspace **strips loads** for editing view and provides **no load UI**. |
| 10 | Frame generation | **PARTIALLY_IMPLEMENTED** | `bridgeDefinition/generator/structuralModelGenerator.ts` (BridgeDefinition → `ProjectModel`); `liner/mapper/` frame generation tests | Generator is **platform/LINER** capability. **Zero** `BridgeDefinition` / `structuralModelGenerator` references under `apollo/**`. |
| 11 | IF3 binding | **IMPLEMENTED** | `if3/buildRunAnalysisIf3Metadata.ts`; `if3/projectModelSourceBinding.ts` (interim BFAD namespace); `contracts/bridgeSuperstructureDesignDocument.ts` (`BsddAnalysisBinding`, `if3Metadata` validation); backend `engine/if3_*.py`, `tests/test_if3_*.py` | Binding uses **interim `ProjectModel` checksum**, not BSDD document. Works in main Pro app; **blocked in Apollo route** (no run/export UI). |
| 12 | Result import | **PARTIALLY_IMPLEMENTED** | `results/if3ResultGate.ts`, `results/if3ResultViewModel.ts`, `results/if3LegacyCompatibility.ts`; `Viewer3D.tsx` consumes `if3Result`; backend normalizer/persistence | IF3 result pipeline is **main-app** feature. Apollo route has **no result import or display**. |
| 13 | Export gates | **IMPLEMENTED** | `exports/if3ExportGate.ts` (`evaluateIf3ExportGate`, `If3ExportBlockedError`); `results/if3ResultGate.ts`; tests `exports/if3ExportGate.test.ts`, `if3/__tests__/if3ExportGateBinding.test.ts` | Authoritative CSV/PDF export gated on `VALID` IF3 resource. Separate from Apollo STL export (geometry-only). |
| 14 | 3D solid viewer | **IMPLEMENTED** | `apollo/visualization/builder.ts`; `viewer/renderers/ApolloVisualizationRenderer.ts`; `viewer/SceneBuilder.ts`; `ApolloPhase1Shell.tsx` embeds `Viewer3D`; main viewer handoff in `App.tsx` (`viewerDisplayModel`, `apolloVisualizationModel`) | Line + solid rendering, visibility toggles, selection. |
| 15 | STL export | **IMPLEMENTED** | `apollo/export/apolloStlExport.ts`; `apollo/export/apolloExportManifest.ts`; `apollo/export/index.ts`; tests `apollo/__tests__/apolloStlExport.test.ts` | Binary STL + JSON manifest; group toggles (girders, cross-beams, bracings, deck, bearings, markers). |
| 16 | RC slab design shell | **PLANNED** | BSDD `deckKind: "rc_non_composite"` type only; `manual_traceability.csv` AP-DX-04/12 `PLANNED` | No `rcSlab` / slab-design module in codebase. |
| 17 | Girder design shell | **PLANNED** | `manual_traceability.csv` AP-DX-03 `PLANNED`; scope guard allows plate-girder archetype only | No girder-design editor or check module. |
| 18 | Stiffener model | **PLANNED** | `manual_traceability.csv` AP-DX-06 `PLANNED`; `phase1ScopeGuard.ts` does not model stiffeners | No stiffener entity types or UI. |
| 19 | Splice model | **PLANNED** | `manual_traceability.csv` AP-DX-07 `PLANNED` | No splice entity types or UI. |
| 20 | Floor system / bracing model | **PARTIALLY_IMPLEMENTED** | `visualization/builder.ts` (bracing pattern solids); `visualization/types.ts` (`bracing.pattern`) | **Visualization heuristic only** — not a persisted floor-system/bracing design model. |
| 21 | Steel weight | **PLANNED** | `manual_traceability.csv` AP-DX-16 `PLANNED`; no `steelWeight` / `鋼重` code matches in `frontend/src` or `backend/` | — |
| 22 | Fatigue | **OUT_OF_SCOPE** | `phase1ScopeGuard.ts` rejects dynamic analysis types (`EIGEN`, `RESPONSE_SPECTRUM`, `TIME_HISTORY`); no fatigue code matches | Refreeze AP-DX-18 is future; Step 1 guards exclude from Phase 1 analysis. `manual_traceability.csv` lists AP-DX-18 as PLANNED (forward-looking); this row reflects current code scope, not traceability status. |
| 23 | Drawing preview | **OUT_OF_SCOPE** | LINER drawing preview under `frontend/src/liner/drawing/` and e2e specs; **no** drawing preview under `apollo/**` | Apollo Phase 1 scope is not drawing workspace. |
| 24 | Report model / exports | **PARTIALLY_IMPLEMENTED** | `exports/resultPdfReport.ts`, `exports/if3PrintDto.ts`, `exports/if3PrintCatalog.ts`, `exports/resultCsvExport.ts`; docs reference future `ReportModel` (`manual_traceability.csv` MT-000) | IF3-gated PDF/CSV for **analysis results** in main app. No `ReportModel` type in code; no Apollo calculation reports. |

## Maintenance checks (LV-03 plan §69)

Commits `d3f1ec6` (fix: expose solid bridge model in main viewer) and `1fbcb3e` (test: main viewer model handoff) are **present on the inspected branch**:

| Commit | Files still containing handoff logic | Test coverage still present |
|--------|--------------------------------------|-----------------------------|
| `d3f1ec6` | `App.tsx` (`viewerDisplayModel`, `apolloVisualizationBuild`, conditional `apolloVisualizationModel` prop); `Viewer3D.tsx`; `ViewerControls.tsx`; `viewer/types.ts` | — |
| `1fbcb3e` | — | `App.apolloNavigation.test.tsx` (`passes Apollo display-model availability…`, `hands off the Apollo model when selected`); `ViewerControls.test.tsx` (Apollo line/solid toggles, display-model select) |

**Verdict:** 3D main-viewer solid handoff **maintained**.

## 3D vs analysis model boundary

| Layer | Representation | Apollo route | Main Pro viewer |
|-------|----------------|--------------|-----------------|
| Design input | `apolloPhase1Unit2` draft (nodes/members/supports/material refs) | Edited | Read-only when draft present |
| Visualization | `ApolloVisualizationModel` (line elements + `solidGeometryParameters`) | Built + rendered | Optional `displayModel === "apollo"` |
| FEM / analysis | `ProjectModel` nodes/members/supports/loads | Stripped in view projection; calculation disabled in UI | Full model; IF3 run + results |
| Authoritative docs | BSDD (contracts) / interim BFAD (IF3 binding) | Not produced | IF3 uses interim BFAD from `ProjectModel` |

## Gaps and uncertainties

1. **BSDD ↔ Apollo draft mapping** — No code path maps `apolloPhase1Unit2` to `BridgeSuperstructureDesignDocument`. Future AP-DX work must define this explicitly.
2. **Section intent registry** — `sectionIntentRefId` on BSDD girder lines has no registry implementation; only placeholder `ProjectModel.sections`.
3. **Cross-beam / bracing identity** — Solid IDs (`solid:cross-beam:…`, `solid:bracing:…`) are visualization-derived, not stable design IDs for traceability (refreeze AP-DX-05).
4. **Governance** — Refreeze AP-DX modules (stiffener, splice, fatigue, steel weight) remain `PLANNED` / `NOT_AUTHORIZED` per `manual_traceability.csv`; inventory confirms no premature implementation.
5. **LV-01 sync** — LV-01 re-run 2026-08-01 19:38:37 JST **PASS** — local `main` = `origin/main` `f0983878ccbb816f591214b6242c3688ecb5a060`; verification branch HEAD `cccf4c3…` contained `origin/main` at LV-01 baseline (see `local_verification_report.md` LV-01). Post-finalization `git merge --no-ff origin/main` 2026-08-01 JST integrated `f826d32a224f4e4c464a3669e1dcba60a58c4d63` (Docs/apollo refreeze local verification #241); docs-only conflict resolution; no application code changes — prior LV-01..LV-08 verdicts remain authoritative (minimal recheck; see `final_report.txt` section 22).

## Refreeze reconciliation

- Items classified `PLANNED` or `OUT_OF_SCOPE` align with `scope_and_architecture_freeze.md` §2.2 and `manual_traceability.csv` `implementation_status` / `numeric_authority`.
- No evidence that refreeze "未実装" features were already fully implemented under different names.
- Risk of **duplicate implementation** if AP-DX work re-builds existing `BridgeDefinition` generator or IF3 gates instead of extending them.

## LV-03 verdict

`LV03_IMPLEMENTATION_INVENTORY_VERDICT: PASS` — All minimum inventory targets classified with code evidence. No `UNKNOWN` classifications required.
