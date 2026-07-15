# Bridge Modeler V2 — Supervisor Locked Decisions (Grok 4.5)

Status: LOCKED for documentation (implementation not started)  
Date: 2026-07-14  
Supervisor: Cursor Grok 4.5  
Authority: design decisions only; MiMo documents these, does not override them.

## Naming (collision avoidance)

| Concept | Official V2 name | Forbidden / Legacy |
| --- | --- | --- |
| Legacy wizard model | keep `BridgeProject` (schema `0.1.0`) in `frontend/src/bridge/` | do not extend for V2 |
| V2 root aggregate | `BridgeModelerV2Document` | never call it `BridgeProject` |
| Road reference | `RoadAlignmentReference` | do not copy LINER geometry into V2 store |
| Bridge interval | `BridgeInterval` | — |
| Structure | `BridgeStructureModel` | distinct from `BridgeDefinition` |
| Analysis | `AnalysisModelSpec` → generates `ProjectModel` | `ProjectModel` remains FEM persistence shape |
| Shared intermediate | keep existing `BridgeDefinition` (schema `1.0.0`) as optional bridge from importer/legacy adapters into V2 structure mapping | do not replace without ADR |

Package / route:

- Frontend package root (future): `frontend/src/bridgeModelerV2/`
- Route: `/pro/bridge-modeler-v2` (product path; alias `/bridge-modeler-v2` if router allows)
- Legacy entry: Toolbar modal `BridgeWizard` — KEEP during coexistence

## ADRs

### ADR-BMV2-001 — New route, keep Legacy
V2 ships as a dedicated route/workspace. Legacy `BridgeWizard` remains reachable and unchanged until an explicit deprecation PR.

### ADR-BMV2-002 — LINER is source of truth for RoadAlignment
V2 stores `RoadAlignmentReference { linerProjectId?, linerModelId, alignmentId, sourceRevision, startStationM, endStationM, localOriginPolicy }`. Geometry is evaluated via LINER adapters at use time; no forked copy of alignment polylines as primary store.

### ADR-BMV2-003 — Four layers
1. `RoadAlignmentReference` (+ live LINER evaluation)
2. `BridgeInterval` + deck classification refs
3. `BridgeStructureModel` (supports, girders, cross girders, bearings, sections, materials)
4. `AnalysisModelSpec` / generated `ProjectModel` (nodes, members, springs, constraints, loadCases)

### ADR-BMV2-004 — Deterministic stable IDs
IDs are strings derived from semantic keys (e.g. `sup:A1`, `gir:G2`, `node:{stationMm}:{offsetMm}:{role}`), never array indices. Regeneration with same semantics must preserve IDs when possible; collisions get suffix policy documented in ID appendix.

### ADR-BMV2-005 — Separate deck / traffic load surface / FEM
Phase 4 introduces `DeckSurface`, `DeckZone`, `TrafficLoadZone`, `LoadPath`. Loads map surface → distribution → FEM targets; do not bind live loads primarily to `line_id` as Legacy Step 5 does.

### ADR-BMV2-006 — DrawingDocument is the drawing IR
Phase 5 builders emit `DrawingDocument`; DXF and preview share the same document. Bridge drawings use adapters into existing `liner/drawing` and `liner/dxf` where possible.

### ADR-BMV2-007 — Staged FEM pipeline with diagnostics
Phase 3 pipeline: collect stations → evaluate XYZ/normal/crossfall → nodes → longitudinal members → cross members → bearings/springs/constraints → assign section/material → emit `ProjectModel` + `IdCorrespondence` + `Diagnostics[]`. Not a single opaque button without diagnostics.

### ADR-BMV2-008 — Schema & persistence
- V2 document schemaVersion: `bmv2-1.0.0` (string literal in design; code later)
- Persist as separate artifact from Legacy `bridge-*.json` and from App `ProjectModel`
- Autosave: follow App project autosave patterns for the host project; V2 document embedded or sibling key under project extension — Open Decision if host schema lacks slot (record as OD-01)
- Migration: Legacy BridgeProject is **not** auto-migrated to V2 in MVP; coexistence = side-by-side. Optional one-way import adapter is P2.

### ADR-BMV2-009 — Units & coordinates
- Length: metres; station internal: metres along physical distance
- Display: No. notation via existing `formatStationPlanNotation` / `formatStationDisplay`
- Frame: bridge-local X along alignment increasing station; Y right-positive transverse (align with LINER sign convention docs); Z up
- Station 0 policy for drawings: local drawing origin may translate station start to (0,0) at builder stage without mutating LINER canonical result (same spirit as Plan Type B)

### ADR-BMV2-010 — Frontend/backend split
- Domain + adapters + UI: frontend TypeScript (align with BridgeDefinition / LINER pattern)
- Heavy analysis solve: existing backend solver on `ProjectModel`
- Optional backend persistence endpoints for V2 documents: design for `/api/bridge-modeler-v2/...` but implementation is later PRs; MVP may embed in project JSON first (OD-02)

### ADR-BMV2-011 — Feature flag
`VITE_BRIDGE_MODELER_V2=true` gates route registration. Legacy wizard unaffected. Distinct from `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL`.

### ADR-BMV2-012 — Undo/redo
V2 editor maintains its own command stack for structure/interval edits (similar to section-editor pattern). FEM `ProjectModel` regeneration is not undoable step-by-step; undo reverts structure inputs then dirty-flags analysis.

### ADR-BMV2-013 — Diagnostics envelope
```ts
{ severity: 'info'|'warning'|'error'; code: string; message: string; path?: string; entityIds?: string[] }
```
Codes prefixed `BMV2_`. Fatal errors block FEM emit; warnings allow emit with banner.

### ADR-BMV2-014 — BridgeDefinition relationship
`BridgeDefinition` remains the canonical **importer/legacy** intermediate. V2 `BridgeStructureModel` is richer (explicit support lines, girder polylines, skew). Adapters: LinerBridge/Legacy → BridgeDefinition → (map) → BridgeStructureModel for reuse; V2-native authoring writes BridgeStructureModel directly.

### ADR-BMV2-015 — ProjectModel host key (OD-01 resolved)
ProjectModel 拡張キーとして正式名 `bridgeModelerV2` を採用。型: `ProjectModel.bridgeModelerV2?: BridgeModelerV2Document`。既存 `liner` / `linerTrace` と同型の camelCase 拡張スロット。Rejected: `bridge`（Legacy API payload と衝突）、`BridgeProject` 内ネスト、`generatedFem` 流用。

### ADR-BMV2-016 — Frontend domain persistence (OD-02 resolved)
Phase1〜5連続実装の正は Frontend ドメイン。永続化は host ProjectModel JSON（`bridgeModelerV2`）+ 既存 `/api/projects/save|load|autosave`。FEM生成は Frontend 段階パイプライン。Legacy `/api/fem/generate` は V2経路で使用禁止。Backend REST は将来オプション。

### ADR-BMV2-017 — GirderLine offset piecewise-linear (OD-03 resolved)
GirderLine offset は piecewise-linear。制御点 `offsetControlPoints: { stationM: number, offsetM: number }[]`（最低2点=始端・終端）。左右符号: 橋軸進行方向に対し右が正（ADR-BMV2-009準拠）。制御点外: clamp to nearest endpoint。不連続禁止。

### ADR-BMV2-018 — Full structure regeneration (OD-04 resolved)
Full structure regeneration。保持: ユーザー入力。無効化/再計算: GenerationStationSet, AnalysisModelSpec出力, ProjectModel生成物, analysisResults, DrawingDocument, DXF, IdCorrespondence。span-local partial regen は後続拡張。

### ADR-BMV2-019 — Legacy coexistence end criteria (OD-05 resolved)
直ちに Legacy BridgeWizard を撤去しない。撤去 PR 前提条件: 1) Phase5完了, 2) Legacy機能同等性チェックリスト合格, 3) データ移行不要のプロダクト承認, 4) V2 既定ONで最低2リリース, 5) 利用確認, 6) ユーザー告知完了, 7) rollback可能期間確保, 8) 専用 deprecation PR は全条件後。

## Phase boundaries (what is in / out)

### Phase 1 — Interval reference
In: LINER select, alignment, start/end station, revision, previews, stale detection  
Out: supports, girders, FEM, loads, drawings

### Phase 2 — Structure
In: A1/P/A2 stations, skew, girder lines/offsets, cross girders, bearings, section/material refs, 3D structure preview  
Out: full FEM mesh, traffic load zones, formal DXF

### Phase 3 — FEM generation
In: station set, XYZ evaluation, nodes/members/supports/springs, ProjectModel, IdCorrespondence, diagnostics, Viewer hookup, solve optional  
Out: moving load engine, formal drawings

### Phase 4 — Load surfaces
In: deck zones, TrafficLoadZone, load paths, dead loads, impact factor relocation, distribution mapping  
Out: full influence-line product UX (extension hooks only)

### Phase 5 — Results & drawings
In: results mapping, FEM grid drawing, support/girder plans, section composition, load marking, plan/profile generals, DrawingDocument, DXF kinds, preview parity  
Out: full report PDF productization (may reuse later)

## Open Decisions (must appear in risk/open docs)

| ID | 内容 | Status | ADR |
| --- | --- | --- | --- |
| OD-01 | Exact host project JSON key for embedding `BridgeModelerV2Document` | **RESOLVED** | ADR-BMV2-015 |
| OD-02 | Backend REST vs frontend-only persistence for MVP1 | **RESOLVED** | ADR-BMV2-016 |
| OD-03 | Whether girder "follow widening" uses continuous offset function or piecewise stations in MVP1 | **RESOLVED** | ADR-BMV2-017 |
| OD-04 | Partial regeneration granularity (span-local vs full structure) | **RESOLVED** | ADR-BMV2-018 |
| OD-05 | Coexistence end criteria for removing Legacy Wizard | **RESOLVED** | ADR-BMV2-019 |

### 矛盾解消ノート（2026-07-14 追記）

| ID | 内容 | 処理 |
| --- | --- | --- |
| C-01 | PR-BMV2-001 の前提PRを PR-BMV2-008 に更新 | 文書修正は次バッチ。ここでは方針のみ記載 |
| C-02 | AnalysisModelSpec の正は 04 の定義。01は参照に置換 | 本文書で反映済み |
| C-03 | BridgeInterval.id は Phase1で生成。形式 `intv:{stableLabelOrUuid}` | 本文書で反映済み |
| C-04 | 配列index ID禁止。xgir/dz/tlz/lp は意味キー（例 `xgir:{fromGirId}:{toGirId}:{stationMm}`） | 本文書で反映済み |
| C-05 | V2解析経路は FE ProjectModel → /api/analysis/run。/api/fem/generate はLegacy専用 | 本文書で反映済み |

## Evidence baseline (supervisor summary; MiMo to expand)

Confirmed from prior read-only survey:

- Legacy entry: `Toolbar` → `App.bridgeWizardOpen` → `BridgeWizard` (no `/bridge-modeler` route)
- Types: `frontend/src/bridge/types.ts` BridgeProject 0.1.0
- FEM: `POST /api/fem/generate` → `generate_fem_model` flat z=0 grid
- BridgeDefinition: `frontend/src/bridgeDefinition/**` schema 1.0.0
- LINER revision: `sourceRevisionFor` in `liner/core/pipeline/sourceRevision.ts`
- Drawing/DXF: LINER formal workspace only; disconnected from BridgeWizard

## Documentation set to produce

Under `docs/bridge-modeler-v2/`:

- 00_bridge_modeler_v2_master_scope.md
- 01_architecture_and_domain_model.md
- 02_phase1_liner_bridge_interval.md
- 03_phase2_bridge_structure.md
- 04_phase3_fem_generation.md
- 05_phase4_load_surface.md
- 06_phase5_results_drawing_dxf.md
- 07_persistence_versioning_migration.md
- 08_diagnostics_and_validation.md
- 09_test_and_verification_plan.md
- 10_implementation_roadmap_and_pr_plan.md
- 11_traceability_matrix.md
- 12_risk_register_and_open_decisions.md
- _evidence_inventory.md

Do not modify production code. Do not delete Legacy design docs; may add “see also V2” links only if explicitly instructed.
