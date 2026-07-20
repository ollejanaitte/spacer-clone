# P4-D03 Implementation Plan — HAUNCH Equivalent

**Date:** 2026-07-21  
**Status:** AUTHORITATIVE / PLAN APPROVED  
**Authoritative scope:** [p4_d03_scope.md](p4_d03_scope.md) (AUTHORITATIVE)  
**Extraction record:** [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) (APPROVED — D03-C01 satisfied; freezes S3/S6/S9/S14/S15/S16/S17)  
**Pattern reference:** [p4_d02_implementation_plan.md](p4_d02_implementation_plan.md)  
**Baseline:** `2e2931f` (P4-D02 COMPLETE)  
**algorithmVersion:** `haunch-0.1.0`  
**Branch:** `feat/phase4-p4-d03-haunch-equivalent`

---

## 1. Purpose

P4-D03（HAUNCH Equivalent）の **実装手順・ファイル分割・テスト・互換性** を定義する。本書は実装承認用計画であり、**コード変更・branch・commit・push は含まない**。

**In scope for implementation:** contracts (discriminated union) → validation → pure calculator (`core/haunch/`) → persistence/hydrate → state/adapter/pipeline → utilities tab HAUNCH section → export builder (`haunchReportExport`) → unit/O1 fixtures → regression → minimal E2E smoke.

**Out of scope:** HOSO (D04)、確認図注記 (D05)、CSV/HTML **ダウンロード UI** (D06)、専用 extension key、legacy migration 統合 (D07)、P4-E2E-03 **最終ゲート** (D08)、Type 14 plane variant (S14 defer)、JIP types 3–5/10–13/15–17 (unsupported fail-closed)、RDD `schemaVersion` bump、結果キャッシュ永続化。

---

## 2. Architecture summary

```text
LinerEditPage (utilities tab — LDIST section + HAUNCH section)
  ↔ BuildIntermediateInput.haunchDefinitions?  (UI passthrough, D02 ldistJobs pattern)
  ↔ domainDraftFromLinerDraft / buildIntermediateInputFromDomainDraft
  ↔ LinerDomainDraftVNext.haunchDefinitions[]  (ordered list per S17)
  ↔ domainDraftToRoadDesignDocument
       ├─ extensions["spacer.liner/domain-draft-vnext-geometry"] payloadVersion v0.2.0
       └─ haunchCapability.state ("supported" | "absent")
  ↔ buildIntermediateResult(active bundle) → profile elevation datum (S3)
  ↔ computeHaunchResults(definitions, intermediate, sourceRevision)  [pure]
       ├─ resolveHaunchScope (range modifiers, S17 ordered chain)
       ├─ per-family: two_point | three_point | plane | range
       → HaunchResultRow[] + ComputationDiagnostic[]  (memory only)
  ↔ buildHaunchReportSection / buildHaunchResultsCsv  [pure, D03-C06]
```

**Range family note:** `range` / `section_range_modifier` は **スコープ修飾のみ** — 単体では numeric row を emit しない（extraction §5.5）。後続定義の station フィルタに適用。

---

## 3. File inventory

### 3.1 New files

| Path | Role | Gate |
| --- | --- | --- |
| `frontend/src/liner/core/haunch/types.ts` | Result types, `HAUNCH_ALGORITHM_VERSION`, compute I/O | D03-C02 |
| `frontend/src/liner/core/haunch/diagnostics.ts` | `LINER_HAUNCH_*` codes + `messageKey` | D03-C05 |
| `frontend/src/liner/core/haunch/validateHaunchDefinitions.ts` | Definition-level fail-closed validation | D03-C05 |
| `frontend/src/liner/core/haunch/anchorResolution.ts` | Anchor `mode: elevation \| haunch` → \(z_{\text{top}}\); profile \(z_{\text{ref}}\) at station (S3/S16) | D03-C02 |
| `frontend/src/liner/core/haunch/resolveHaunchScope.ts` | Ordered definition chain; range modifier \(\mathcal{S}_{\text{active}}\) (S17) | D03-C02 |
| `frontend/src/liner/core/haunch/computeTwoPoint.ts` | Variants: `two_support_points`, `one_point_longitudinal_gradient` | D03-C02 |
| `frontend/src/liner/core/haunch/computeThreePoint.ts` | Variants: `affine_plane_three_points`, `parabola_three_points` (S9) | D03-C02 |
| `frontend/src/liner/core/haunch/computePlane.ts` | Variant: `one_point_two_gradients` only (S14 defer Type 14) | D03-C02 |
| `frontend/src/liner/core/haunch/computeRange.ts` | Variant: `section_range_modifier` — scope + diagnostics only | D03-C02 |
| `frontend/src/liner/core/haunch/computeHaunchResults.ts` | Orchestrator; attaches `algorithmVersion` | D03-C02 |
| `frontend/src/liner/core/haunch/index.ts` | Public exports | — |
| `frontend/src/liner/core/haunch/__tests__/computeHaunchResults.test.ts` | Unit + O1 baselines (per family) | D03-C02/C03 |
| `frontend/src/liner/core/haunch/__tests__/validateHaunchDefinitions.test.ts` | Invalid ref / unsupported type tests | D03-C05 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-two-point-linear.json` | O1 type 1 | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-two-point-gradient.json` | O1 type 2 | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-three-point-plane.json` | O1 type 6 | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-three-point-parabola.json` | O1 type 9 (**MVP 必須**, S9) | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-plane-gradients.json` | O1 type 7 (Plane 最小必須) | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-range-filter.json` | O1 type 8 scope filter | D03-C03 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-degenerate-collinear.json` | Fail-closed degenerate | D03-C05 |
| `frontend/src/liner/core/haunch/__tests__/fixtures/gc-haunch-unsupported-type-12.json` | `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` | D03-C05 |
| `frontend/src/liner/exports/haunchReportExport.ts` | `buildHaunchResultsCsv`, `buildHaunchReportSection` | D03-C06 |
| `frontend/src/liner/exports/haunchReportExport.test.ts` | Column keys, row count, error block | D03-C06 |
| `frontend/src/liner/components/HaunchDefinitionEditor.tsx` | Definition list + family/variant forms | D03-C06 |
| `frontend/src/liner/components/HaunchResultsPanel.tsx` | Results table | D03-C06 |
| `frontend/src/liner/components/HaunchDiagnosticsPanel.tsx` | `LINER_HAUNCH_*` filter display | D03-C06 |
| `frontend/src/liner/components/__tests__/HaunchDefinitionEditor.test.tsx` | Component smoke | D03-C06 |
| `frontend/tests/e2e/p4-d03-haunch.spec.ts` | Minimal smoke: editor visible + save extension field | D03-C06 (final round-trip: D08) |

**Optional (non-blocking for D03-C03):** `gc-haunch-plane-normal.json` — Type 14 future O1; **S14 defer** のため D03 では作成しない。

### 3.2 Modified files（最小差分 — 実在確認済み）

| Path | Change |
| --- | --- |
| `frontend/src/liner/schema/types.ts` | `HaunchDefinitionDraft` discriminated union; `haunchDefinitions?` on `LinerDomainDraftVNext` |
| `frontend/src/liner/core/pipeline/pipeline.ts` | `BuildIntermediateInput.haunchDefinitions?` passthrough (optional; ignored by pipeline body) |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `haunchCapability` dynamic; preserve `haunchDefinitions` in geometry payload v0.2.0 |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.test.ts` | Round-trip + capability `supported`/`absent` |
| `frontend/src/liner/adapters/linerProjectDraft.ts` | `domainDraftFromLinerDraft` / `buildIntermediateInputFromDomainDraft` round-trip `haunchDefinitions` |
| `frontend/src/liner/adapters/linerProjectDraft.test.ts` | Saved extension contains definitions |
| `frontend/src/liner/adapters/linerUiAdapter.ts` | `updateLinerHaunchDefinitions`, `addHaunchDefinition`, `updateHaunchDefinition`, `removeHaunchDefinition` |
| `frontend/src/liner/schema/projectLinerMigration.ts` | Preserve `haunchDefinitions` in `DOMAIN_DRAFT_PRESERVED_FIELDS` / hydrate clone paths |
| `frontend/src/liner/pages/LinerEditPage.tsx` | Wire HAUNCH section below LDIST in utilities tab; `useMemo` → `computeHaunchResults` |
| `frontend/src/liner/pages/LinerEditPage.test.tsx` | HAUNCH panel `data-testid` presence; review tab unchanged |
| `frontend/src/i18n/ja.ts` | `liner.haunch.*` strings + diagnostics message keys |

**Not modified in D03:** `frontend/src/contracts/roadDesignDocument.ts` (`haunchCapability` block already exists), `roadDesignDocument.ts` schema bump, golden GC-01..07, Bridge Layout / formal drawing builders, `report_output_spec.md` download wiring (D06), `core/ldist/**` (no numeric coupling).

---

## 4. Contracts / types（discriminated union）

### 4.1 Schema (`frontend/src/liner/schema/types.ts`)

Align with scope §7.3 and extraction record §4.3 / §11 freezes. **JIP raw type numbers (1–17) are not exposed** on the API surface.

```typescript
export type HaunchTypeFamily = "two_point" | "three_point" | "plane" | "range";

export type HaunchSide = "left" | "right" | "both";

export type HaunchAnchorMode = "elevation" | "haunch"; // S16

export interface HaunchAnchorDraft {
  id: string;
  stationPhysicalDistanceM: number;
  /** Lateral offset d along section traverse (three_point / plane). */
  lateralOffsetM?: number;
  mode: HaunchAnchorMode;
  /** Signed value per mode: elevation (m) or haunch thickness (m). */
  valueM: number;
  lineId?: string; // girder / offset line for plan position P(G,Σ)
  supportSectionId?: string; // optional support section ref (type 1 anchors)
}

export interface HaunchDefinitionBase {
  id: string;
  alignmentId: string;
  label?: string;
  stationRange: { fromM: number; toM: number };
  side?: HaunchSide; // S6 — omit = all calculation lines on definition
  spanId?: string; // optional filter (D02 N3 pattern)
  lineIds?: string[]; // calculation lines (girders); omit = active bundle default set
  deckRefId?: string;
  pavementPlusDeckThicknessM?: number; // span default override (semantic context; S3 profile-only MVP)
  enabled?: boolean;
}

export type HaunchDefinitionDraft =
  | (HaunchDefinitionBase & {
      family: "two_point";
      variant: "two_support_points";
      anchors: [HaunchAnchorDraft, HaunchAnchorDraft];
    })
  | (HaunchDefinitionBase & {
      family: "two_point";
      variant: "one_point_longitudinal_gradient";
      anchor: HaunchAnchorDraft;
      longitudinalGradient: number; // g_parallel — user-declared; invalid → validation error
    })
  | (HaunchDefinitionBase & {
      family: "three_point";
      variant: "affine_plane_three_points";
      anchors: [HaunchAnchorDraft, HaunchAnchorDraft, HaunchAnchorDraft];
    })
  | (HaunchDefinitionBase & {
      family: "three_point";
      variant: "parabola_three_points";
      anchors: [HaunchAnchorDraft, HaunchAnchorDraft, HaunchAnchorDraft];
      /** Independent variable u = physical station along girder (S9). */
      girderLineId: string;
    })
  | (HaunchDefinitionBase & {
      family: "plane";
      variant: "one_point_two_gradients";
      anchor: HaunchAnchorDraft;
      longitudinalGradient: number;
      transverseGradient: number;
      referenceLineId?: string; // d=0 reference girder
    })
  | (HaunchDefinitionBase & {
      family: "plane";
      variant: "two_points_normal_gradient";
      /** Present in union for forward compat; MVP rejects at validation → LINER_HAUNCH_UNSUPPORTED_TYPE (S14). */
      anchors: [HaunchAnchorDraft, HaunchAnchorDraft];
      normalGradient: number;
    })
  | (HaunchDefinitionBase & {
      family: "range";
      variant: "section_range_modifier";
      supportSectionFromId?: string;
      supportSectionToId?: string;
    });

// LinerDomainDraftVNext
haunchDefinitions?: HaunchDefinitionDraft[];
```

**Legacy / import guard:** If persisted JSON contains unknown `family`/`variant` or JIP type number fields, hydrate as plain object but `validateHaunchDefinitions` emits `LINER_HAUNCH_UNSUPPORTED_TYPE` — no silent coercion.

### 4.2 Calculator types (`core/haunch/types.ts`)

```typescript
export const HAUNCH_ALGORITHM_VERSION = "haunch-0.1.0" as const;

export interface HaunchResultRow {
  definitionId: string;
  type: HaunchTypeFamily;
  stationPhysicalDistance: number;
  displayedStation: number;
  haunchTopElevationM: number;
  haunchThicknessM?: number;
  side?: HaunchSide;
  lineId?: string;
  sourceRevision: string;
  algorithmVersion: typeof HAUNCH_ALGORITHM_VERSION;
}

export interface HaunchComputeInput {
  definitions: readonly HaunchDefinitionDraft[];
  intermediate: CanonicalLinerIntermediateResult;
  sourceRevision: string;
  linerAlignments?: readonly AlignmentBundleDraft[];
  activeAlignmentId?: string;
  crossSections?: readonly CrossSectionTemplateDraft[];
  fallbackAlignmentId?: string;
}

export interface HaunchComputeOutput {
  rows: HaunchResultRow[];
  diagnostics: ComputationDiagnostic[];
}
```

### 4.3 UI passthrough

Add to `BuildIntermediateInput` (`pipeline.ts`):

```typescript
haunchDefinitions?: HaunchDefinitionDraft[];
```

Pattern mirrors `ldistJobs`: edited in UI draft, merged into `LinerDomainDraftVNext` on save via `domainDraftFromLinerDraft`.

---

## 5. Domain model

| Concept | Representation | Notes |
| --- | --- | --- |
| Definition chain | `haunchDefinitions[]` ordered per alignment (+ optional `spanId`) | S17 — JIP type sequence semantics |
| Active scope | `resolveHaunchScope` mutable set \(\mathcal{S}_{\text{active}}\) | Reset at span/alignment boundary; range modifiers intersect |
| Elevation datum | \(z_{\text{ref}}(s)\) from `buildIntermediateResult` profile sample | S3 — no deck-aware conversion in MVP |
| Top elevation | \(z_{\text{top}} = z_{\text{ref}} + h\) when anchor `mode: "haunch"`; else anchor elevation | S3/S16 |
| Thickness output | \(h = z_{\text{top}} - z_{\text{ref}}\); negative → `LINER_HAUNCH_NEGATIVE_THICKNESS` | S6 |
| Girder plan position | \(P(G,\Sigma)\) via section slice + offset line intersection | Reuse `sectionLineIntersection` patterns from `core/ldist/` |
| Parabola (type 9) | \(z(u)=au^2+bu+c\), \(u\) = station along `girderLineId` | S9 |
| Type 1 chord length | Plan XY chord between support intersections | S15 — validation only where JIP text references 平面主桁長 |
| Range modifier | No `HaunchResultRow`; may emit scope diagnostics | extraction §5.5 |

**Capability surface (RDD):**

```typescript
haunchCapability?: { state: "absent" | "supported" };
```

Definitions length ≥ 1 → `supported`; else `absent`.

---

## 6. Pure calculation（`core/haunch/`）

### 6.1 Module layout

| Function | Responsibility |
| --- | --- |
| `validateHaunchDefinitions(defs, context)` | Pre-flight; unsupported variants; ref checks |
| `resolveHaunchAlignmentBundles(...)` | Mirror `resolveLdistAlignmentBundles` — per-alignment definition groups |
| `resolveHaunchScope(definitions)` | Apply ordered range modifiers; yield per-definition effective station sets |
| `resolveProfileElevationAt(station, intermediate)` | \(z_{\text{ref}}\); missing → `LINER_HAUNCH_PROFILE_UNAVAILABLE` |
| `resolveAnchorTopElevation(anchor, zRef)` | S16 mode conversion |
| `intersectGirderAtSection(lineId, section, grid)` | Plan \((x,y)\) for three_point plane eval |
| `computeTwoPoint(def, stations, ctx)` | Linear \(z(s)\) per §5.2 |
| `computeThreePoint(def, stations, ctx)` | Affine plane or parabola per §5.3 |
| `computePlane(def, stations, ctx)` | \(z(s,d)\) per §5.4 Variant A only in MVP |
| `computeRange(def, ctx)` | Validate bounds; update scope; diagnostics only |
| `computeHaunchResults(input)` | Main entry — **no React, no IO, no mutation** |

### 6.2 algorithmVersion

- Constant: `HAUNCH_ALGORITHM_VERSION = "haunch-0.1.0"`
- Copied to every `HaunchResultRow.algorithmVersion`
- Bump only with extraction record amendment + O1 fixture update

### 6.3 Dependencies（read-only）

- `buildIntermediateResult` output: `sections`, `grid`, `stations`, `spans`, profile samples
- `core/ldist/sectionLineIntersection.ts` — **read-only import** for \(P(G,\Sigma)\) helpers (do not change LDIST behavior)
- `numerical_accuracy.md`: coordinate/elevation 1e-6 m; R8-13 **COMBINED** elevation register for assertions

### 6.4 MVP variants（必須）

| Family | Variant | JIP | MVP |
| --- | --- | --- | --- |
| `two_point` | `two_support_points` | Type 1 | ✅ |
| `two_point` | `one_point_longitudinal_gradient` | Type 2 | ✅ |
| `three_point` | `affine_plane_three_points` | Type 6 | ✅ |
| `three_point` | `parabola_three_points` | Type 9 | ✅ (S9) |
| `plane` | `one_point_two_gradients` | Type 7 | ✅ |
| `plane` | `two_points_normal_gradient` | Type 14 | ❌ → `LINER_HAUNCH_UNSUPPORTED_TYPE` (S14) |
| `range` | `section_range_modifier` | Type 8 | ✅ (scope only) |

### 6.5 Explicit non-goals in calculator

- No HOSO / pavement thickness
- No W/WG LINER height pipeline (type 12 → `LINER_HAUNCH_LINER_HEIGHT_REQUIRED`)
- No reference-girder chain (types 4/5/10/15)
- No CSV/string formatting (export module only)
- No persistence reads/writes
- No LDIST Mode B changes (K2)

---

## 7. Validation / diagnostics（`LINER_HAUNCH_*`）

Register in `frontend/src/liner/core/haunch/diagnostics.ts` (extraction §7):

| Code | Level | When |
| --- | --- | --- |
| `LINER_HAUNCH_UNSUPPORTED_TYPE` | error | Variant not in MVP; JIP types 3–5,10–13,15–17; Type 14 in D03 |
| `LINER_HAUNCH_INVALID_REFERENCE` | error | Unknown `alignmentId` / `lineId` / `deckRefId` / `supportSectionId` |
| `LINER_HAUNCH_PROFILE_UNAVAILABLE` | error | No profile elevation at station |
| `LINER_HAUNCH_STATION_OUT_OF_RANGE` | error | Station outside alignment or definition `stationRange` |
| `LINER_HAUNCH_RANGE_INVALID` | error | `fromM > toM` on range modifier |
| `LINER_HAUNCH_OVERLAPPING_RANGE` | error | Incompatible overlapping range modifiers (scope abnormal) |
| `LINER_HAUNCH_DEGENERATE_GEOMETRY` | error | Collinear anchors; zero divisor; missing \(P(G,\Sigma)\) |
| `LINER_HAUNCH_NEGATIVE_THICKNESS` | error | Forbidden negative haunch (R8-13 pattern) |
| `LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED` | error | Types 4/5/10/15 semantics detected / future import |
| `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` | error | Type 12 / W−WG without pipeline |
| `LINER_HAUNCH_COLLINEAR_ANCHORS` | error | Optional explicit three-point degenerate (may alias DEGENERATE) |

Each code maps to `messageKey` under `liner.haunch.diagnostics.*` in `ja.ts`.

**Policy:** error-level → no silent row omission; export blocked when `hasHaunchErrors(diagnostics)` (mirror `hasLdistErrors`).

---

## 8. Persistence / hydrate（D02 pattern）

### 8.1 Write path

1. `withProjectLinerDraft` → `domainDraftFromLinerDraft` includes `haunchDefinitions` from draft (preserve order)
2. `domainDraftToRoadDesignDocument`:
   - `buildGeometryPayload` serializes full `domainDraft` (includes `haunchDefinitions` sibling to `ldistJobs`)
   - `haunchCapability: { state: definitions.length > 0 ? "supported" : "absent" }`
   - `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` remains **`0.1.0`**
   - Geometry extension `payloadVersion` remains **`0.2.0`** (`LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2`)
3. `project.liner.roadDesignDocument` only — no top-level `domainDraft` in saved JSON

### 8.2 Read path

1. `roadDesignDocumentToDomainDraft` → `normalizeLinerDomainDraft` preserves `haunchDefinitions` array order
2. `buildIntermediateInputFromDomainDraft` sets `haunchDefinitions` on returned draft
3. Missing field → `undefined`; capability `absent`

### 8.3 Constraints

| Rule | Enforcement |
| --- | --- |
| Geometry extension v0.2.0 only | No dedicated `spacer.liner/haunch` key (D07 candidate) |
| RDD `schemaVersion` 0.1.0 | No bump; assert in mapper test |
| No result cache | `HaunchResultRow[]` never written to extension/RDD |
| Ordered list | Do not sort definitions on persist (S17) |
| `git add` explicit paths | Per AGENTS.md |

### 8.4 Mapper changes detail

`linerDomainDraftRoadDesignMapper.ts`:

- Replace hardcoded `haunchCapability: { state: "absent" }` with dynamic state from `normalized.haunchDefinitions?.length`
- `normalizeLinerDomainDraft`: accept optional `haunchDefinitions` array; validate plain objects (shallow)
- No new migration registry entry in D03 (D07)

### 8.5 Hydrate scenarios

| Scenario | D03 behavior | D07 |
| --- | --- | --- |
| Pre-D03 projects | No field; `haunchCapability: absent` | — |
| First save with definitions | Field in extension; capability → `supported` | — |
| v0.1.0 → v0.2.0 geometry | Use existing D01/D02 migration path | Extra step if needed |
| Legacy pre-P4 | Load OK (no definitions) | `legacyRoadAdapter` |
| Invalid definitions on hydrate | Diagnostics in UI; fail-closed on export | Quarantine in D07 |

---

## 9. State / adapter / pipeline

### 9.1 Ownership

| Slice | Owner | HAUNCH data |
| --- | --- | --- |
| `draft` (`BuildIntermediateInput`) | UI | `haunchDefinitions` edited here |
| `domain` (`LinerDomainDraftVNext`) | project / RDD | `haunchDefinitions` persisted |
| `intermediate` | linerCore | Input to calculator; **not** stored |
| HAUNCH results | UI session / `useMemo` | Recomputed on tab open or definition change; **never persisted** |

### 9.2 Adapter functions (`linerUiAdapter.ts`)

| Function | Behavior |
| --- | --- |
| `updateLinerHaunchDefinitions(draft, definitions)` | Replace full ordered array |
| `addHaunchDefinition(draft, partial)` | Append with stable id (`haunch-def-${n}` or `deriveStableUuid`) |
| `updateHaunchDefinition(draft, definitionId, patch)` | Immutable update one definition |
| `removeHaunchDefinition(draft, definitionId)` | Remove by id |

Default new definition: `alignmentId = draft.activeAlignmentId`, `family = "two_point"`, `variant = "two_support_points"`, placeholder anchors, `stationRange` from alignment extent or `{0,0}` pending user edit, `enabled = true`.

### 9.3 Pipeline (`pipeline.ts`)

- Add optional `haunchDefinitions` to `BuildIntermediateInput` only
- **Do not** invoke `computeHaunchResults` inside `buildIntermediateResult` — UI-layer recompute (D02 pattern)
- Pipeline signature remains backward compatible for Phase 0–3 callers

### 9.4 UI recompute trigger (`LinerEditPage.tsx`)

1. Existing `useMemo` → `buildIntermediateResult(draft)`
2. New `useMemo` → `computeHaunchResults({ definitions: draft.haunchDefinitions ?? [], intermediate, ... })`
3. Display in `HaunchResultsPanel` / `HaunchDiagnosticsPanel` below LDIST panels
4. On save: definitions flow to RDD via existing save path

---

## 10. UI（utilities tab — HAUNCH section）

### 10.1 Placement（scope §22 S5）

| Item | Value |
| --- | --- |
| Tab | Existing `"utilities"` — **no new tab** |
| Section order | LDIST block → **HAUNCH block** (same scroll) |
| `data-testid` | `haunch-definition-editor`, `haunch-results-panel`, `haunch-diagnostics-panel` |
| Review tab | **Unchanged** (Bridge Layout only) |
| CSV download button | **Not added** (D06) |

### 10.2 Components

| Component | Responsibility |
| --- | --- |
| `HaunchDefinitionEditor` | CRUD; family selector (`two_point` / `three_point` / `plane` / `range`); variant sub-form; anchor editors; `side`; `stationRange`; optional `lineIds` / `spanId` |
| `HaunchResultsPanel` | Table: definitionId, type, station, `haunchTopElevationM`, `haunchThicknessM`, side |
| `HaunchDiagnosticsPanel` | Filter `LINER_HAUNCH_*` from compute output |

Reuse list+form layout from `LdistJobEditor` / `BridgeLayoutEditor`; family switch resets variant-specific fields immutably.

### 10.3 i18n (`ja.ts`)

New group `liner.haunch`: `title`, `addDefinition`, `family`, `variant`, `anchors`, `stationRange`, `side`, `results`, `diagnostics`, field labels per variant. Diagnostic keys mirror §7 table.

---

## 11. Export（`haunchReportExport` — DL UI は D06）

| Item | Value |
| --- | --- |
| Report section key | `haunchResults` |
| CSV filename (builder only) | `haunch_results.csv` |
| Column keys | `definitionId`, `type`, `stationPhysicalDistance`, `haunchTopElevationM`, `haunchThicknessM`, `side` |
| Fail-closed | `hasHaunchErrors` → empty CSV / `null` section |

```typescript
export const HAUNCH_RESULTS_CSV_COLUMNS = [
  "definitionId",
  "type",
  "stationPhysicalDistance",
  "haunchTopElevationM",
  "haunchThicknessM",
  "side",
] as const;

export function buildHaunchResultsCsv(rows, diagnostics): string;
export function buildHaunchReportSection(rows, diagnostics): { key: "haunchResults"; rows } | null;
```

Mirror `ldistReportExport.ts` structure; unit test asserts column order and error block.

---

## 12. Unit / O1 fixtures（extraction §8 必須分）

| Fixture ID | Family | Required for D03-C03 | Notes |
| --- | --- | --- | --- |
| `gc-haunch-two-point-linear` | two_point | ✅ | Type 1 — linear \(z(s)\) |
| `gc-haunch-two-point-gradient` | two_point | ✅ | Type 2 — \(z_0 + g(s-s_0)\) |
| `gc-haunch-three-point-plane` | three_point | ✅ | Type 6 — \(ax+by+c=z\) |
| `gc-haunch-three-point-parabola` | three_point | ✅ **必須** | Type 9 — S9 |
| `gc-haunch-plane-gradients` | plane | ✅ | Type 7 — Plane MVP minimum |
| `gc-haunch-range-filter` | range | ✅ | Type 8 — inner two-point rows only inside range |
| `gc-haunch-degenerate-collinear` | three_point | ✅ (fail-closed) | Expect `LINER_HAUNCH_DEGENERATE_GEOMETRY` |
| `gc-haunch-unsupported-type-12` | — | ✅ (fail-closed) | Expect `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` |
| `gc-haunch-plane-normal` | plane | ❌ optional | S14 defer — **not in D03** |

**Tolerance:** elevation 1e-6 m (numerical_accuracy + R8-13 COMBINED).

**Fixture shape:** Follow `gc-ldist-*.json` — `description`, minimal `draft`/`intermediate` stub or inline builder in test, `definitions[]`, `expected.rows` / `expected.diagnostics`.

---

## 13. Regression

After each logical commit batch:

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration
cd frontend && npm run test:regression
```

Must not break:

- P1–P3 E2E
- P4-D01 `p4-d01-multi-alignment.spec.ts`
- P4-D02 `p4-d02-ldist.spec.ts`
- Golden fixtures GC-01..07
- `App.linerSaveLoad.test.tsx` save shape (no top-level `domainDraft`)

**Evidence wording:** **local validation only** — do not claim CI PASS (K1).

---

## 14. E2E

| Spec | D03 scope | D08 scope |
| --- | --- | --- |
| `p4-d03-haunch.spec.ts` | **Minimal smoke:** open utilities tab → HAUNCH section visible → add definition → save → assert `haunchDefinitions` in geometry extension + `haunchCapability.state === "supported"` | — |
| P4-E2E-03 | Partial evidence only | **Final** HAUNCH/HOSO save/reload round-trip + results recompute |

Pattern: `p4-d02-ldist.spec.ts` (extension key assert, save JSON to `/tmp/p4-d03-haunch`).

**D03 does not require:** full numeric result assertion in Playwright; O1 coverage is Vitest responsibility.

---

## 15. Implementation order（小さく段階化）

| Step | Work | Delivers |
| --- | --- | --- |
| **S1** | Schema discriminated union + `core/haunch/types.ts` + `pipeline.ts` passthrough | Contracts frozen |
| **S2** | `diagnostics.ts`, `validateHaunchDefinitions.ts` + tests | D03-C05 partial |
| **S3** | `anchorResolution.ts`, `resolveHaunchScope.ts` | Shared primitives |
| **S4** | `computeTwoPoint.ts` + two O1 fixtures/tests | two_point family |
| **S5** | `computeThreePoint.ts` + plane + parabola fixtures/tests | three_point family |
| **S6** | `computePlane.ts` + gradients fixture/test | plane MVP (Type 7 only) |
| **S7** | `computeRange.ts` + range fixture; wire `computeHaunchResults.ts` orchestrator | range + full orchestrator — D03-C02 |
| **S8** | Mapper + `linerProjectDraft` + `projectLinerMigration` round-trip + tests | D03-C04/C05 |
| **S9** | `linerUiAdapter` mutators | State API |
| **S10** | `haunchReportExport.ts` + test | D03-C06 export hooks |
| **S11** | HAUNCH UI components + `LinerEditPage` wire-up + `ja.ts` + component tests | D03-C06 UI |
| **S12** | `p4-d03-haunch.spec.ts` minimal smoke | D03 E2E evidence |
| **S13** | Degenerate + unsupported fixtures; full regression pass | D03-C03/C05 complete |

**Dependency rule:** S4–S7 before S11 (UI needs calculator); S8 before S12 (E2E needs save); S10 can parallel S9 after S7.

---

## 16. Logical commit / PR split（GitHub: 1 PR）

Single PR on `feat/phase4-p4-d03-haunch-equivalent`; **commits must be logical** for rollback:

| Commit | Paths (explicit `git add`) |
| --- | --- |
| C1 `feat(haunch): add schema types and diagnostic codes` | `schema/types.ts`, `core/haunch/types.ts`, `core/haunch/diagnostics.ts`, `pipeline.ts` |
| C2 `feat(haunch): add definition validation` | `validateHaunchDefinitions.ts`, `__tests__/validateHaunchDefinitions.test.ts` |
| C3 `feat(haunch): add scope and anchor resolution` | `anchorResolution.ts`, `resolveHaunchScope.ts` |
| C4 `feat(haunch): implement two-point and three-point families` | `computeTwoPoint.ts`, `computeThreePoint.ts`, fixtures, partial tests |
| C5 `feat(haunch): implement plane and range families haunch-0.1.0` | `computePlane.ts`, `computeRange.ts`, `computeHaunchResults.ts`, `index.ts`, remaining fixtures/tests |
| C6 `feat(haunch): persist haunchDefinitions in geometry extension` | `linerDomainDraftRoadDesignMapper.ts`, `linerProjectDraft.ts`, `projectLinerMigration.ts`, mapper tests |
| C7 `feat(haunch): add UI adapter helpers` | `linerUiAdapter.ts` |
| C8 `feat(haunch): add report/csv export builder` | `exports/haunchReportExport.ts`, test |
| C9 `feat(haunch): add utilities tab HAUNCH section UI` | `Haunch*.tsx`, `LinerEditPage.tsx`, `ja.ts`, page/component tests |
| C10 `test(haunch): add E2E smoke save extension` | `tests/e2e/p4-d03-haunch.spec.ts` |

**PR title:** `feat(liner): implement P4-D03 HAUNCH equivalent`

---

## 17. Rollback policy

| Rollback unit | Action | User impact |
| --- | --- | --- |
| C10 only | Remove E2E spec | None in prod |
| C9 | Remove HAUNCH UI section | Definitions still in JSON if saved — hidden until restored |
| C8 | Remove export builder | No CSV section; calculator unaffected |
| C6 | Revert mapper to `haunchCapability: absent`; strip read/write `haunchDefinitions` | Saved definitions in extension become inert (data preserved) |
| C5–C4 | Remove calculator modules | UI shows empty / diagnostic-only |
| Full revert | Reverse C1–C10 | Projects saved during D03 retain extension field (inert); no schema bump simplifies rollback |

**Stop condition:** If `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` bump appears necessary → stop per planning freeze S1.

---

## 18. Backward compatibility

### 18.1 P4-D01 / P4-D02

- Multi-alignment IDs unchanged; definitions reference `alignmentId` per bundle
- `ldistJobs` / `ldistCapability` logic untouched
- `core/ldist/**` behavior unchanged (read-only helper import allowed)
- Utilities tab remains single tab; LDIST section unchanged above HAUNCH

### 18.2 Phase 0–3

- `buildIntermediateResult` ignores `haunchDefinitions` on input
- Bridge Layout on review tab unchanged
- Formal drawing builders unchanged
- Golden fixtures GC-01..07 unchanged

### 18.3 Forward compatibility

- `haunchDefinitions` optional — old clients ignore
- `two_points_normal_gradient` in union but MVP-rejected — forward schema room for S14 post-D03
- Dedicated extension key deferred to D07
- Export download UI deferred to D06

---

## 19. Non-targets（D04–D08、defer、unsupported）

| Item | Handling |
| --- | --- |
| **P4-D04 HOSO** | No `hosoDefinitions` / calculator |
| **P4-D05 diagrams** | No HAUNCH overlay (D05-C07 N/A) |
| **P4-D06 download UI** | Builder only; no button |
| **P4-D07 migration** | No legacy `.lin` import; no dedicated extension key decision |
| **P4-D08 E2E** | P4-E2E-03 final gate — D03 smoke only |
| **Type 14** `two_points_normal_gradient` | `LINER_HAUNCH_UNSUPPORTED_TYPE` (S14) |
| **JIP types 3,4,5,10,11,12,13,15,16,17** | `UNSUPPORTED_TYPE` or specific codes per extraction §4.2 |
| **Result cache** | Forbidden |
| **RDD schema bump** | Forbidden |
| **LDIST Mode B strict JIP** | Frozen N1 — no extension |

---

## 20. D04+ overscope prevention checklist

実装各コミット前に確認:

- [ ] **No** `hosoCapability` / `hosoDefinitions` beyond existing stub
- [ ] **No** confirmation diagram HAUNCH overlays
- [ ] **No** CSV/HTML **download button**
- [ ] **No** dedicated `spacer.liner/haunch` extension key
- [ ] **No** `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` bump
- [ ] **No** persisting `HaunchResultRow[]`
- [ ] **No** `domainDraft` / `DrawingDocument` canonical write
- [ ] **No** Type 14 numeric implementation (S14)
- [ ] **No** W/WG type 12 numeric path
- [ ] **No** changes to `core/ldist` computation behavior
- [ ] **No** unrelated refactor

---

## 21. Completion gate traceability

| Gate | Implementation plan section |
| --- | --- |
| D03-C01 | Extraction record APPROVED (pre-requisite met) |
| D03-C02 | §6 calculator, four families, `HAUNCH_ALGORITHM_VERSION` |
| D03-C03 | §12 O1 fixtures (≥4 scenarios, per-family ≥1) |
| D03-C04 | §8 persistence, mapper tests |
| D03-C05 | §7 validation, fail-closed, capability state |
| D03-C06 | §10 UI, §11 export, §14 E2E smoke |

---

## 22. Open items (plan level only)

| Item | Owner | Notes |
| --- | --- | --- |
| HAUNCH sub-panel visual separator vs LDIST | Implementer | Scope S5 default: same tab, stacked sections |
| `lineIds` default when omitted | Implementer | Document in C5 PR: all offset lines on active cross-section template |
| Station sampling density for results table | Implementer | Default: generated station table entries intersecting `stationRange` + active scope |
| E2E numeric assertion depth | Supervisor | D03 smoke vs D08 full P4-E2E-03 |

---

## 23. Worker verdict recommendation

| Field | Value |
| --- | --- |
| **Recommended `P4_D03_PLAN_VERDICT`** | **APPROVED** |
| **Rationale** | D02 mirror plan is complete: discriminated union covers four families + MVP variants; persistence follows geometry v0.2.0 sibling pattern; O1 fixtures map 1:1 to extraction §8; fail-closed diagnostics enumerated; single PR with logical commits; backward compatibility and D04–D08 boundaries explicit. All modified paths verified at baseline `2e2931f`. |
| **NOGO would apply if** | Supervisor requires Type 14 in MVP, shrinks below four families, or mandates dedicated extension key in D03 |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-07-21 | Initial plan — STEP C; PROPOSED awaiting `P4_D03_PLAN_VERDICT` |
