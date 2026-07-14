# Formal Drawing Japanese Standard Remediation

> Status: `IMPLEMENTED`
> Date: 2026-07-14
> Phase: Phase 5 remediation
> Related: [step3_complete_dxf_implementation.md](step3_complete_dxf_implementation.md), [drawing_model_design.md](drawing_model_design.md), [formal_drawing_ui_design.md](formal_drawing_ui_design.md)

## 1. Purpose

Improve Phase 5 LINER UX and formal drawings toward common Japanese road/bridge drafting practice, without breaking Plan Type A / existing DXF / Step 3 exports.

## 2. Confirmed facts (current repo)

- Offset lines: `CrossSectionOffsetLineDraft { id, offset, elevation, role?, label? }` in array order; UI supports insert before/after, append, ↑/↓, delete (`CrossSectionTemplateEditor` + `offsetLineOrdering.ts`).
- Grid generation **sorts offsetLines by signed offset** for transverse indexing (`gridGeneration.ts`).
- Plan builders: Type A keeps road-shape plan; Type B adds centerline-only with `DrawingCircle` → DXF `CIRCLE`.
- Station display: Type B uses compact `No.1` / `No.1+40` via `formatStationPlanNotation`.
- Profile bands: vertical PVC/PVI/PVT populated for parabolic elements; band draws BVC/EVC slash marks when present.
- Manuals under `/mnt/data` are read-only references; not copied into the repo.

## 3. Design decisions

### 3.1 Offset ordering (DD-OFF-01)

| Concern | Decision |
| --- | --- |
| Array order | Authoring / structural order. Preserved on save/load. Future girder/node generation may consume this order. |
| Signed `offset` | Geometric position (m, right-positive). Independent of array index. |
| Duplicate offsets | **Allowed** with UI warning. Same offset + different elevation/role is valid. |
| Centerline | Any line with `\|offset\| < 1e-9` is centerline-protected: **no delete, no move up/down**. Insert before/after around it is allowed. |
| Insert | Before / after selected index; new stable `OL-*` id; does not renumber existing ids. |
| Move | Swap adjacent non-centerline rows (skips over centerline); ids and field values preserved. |
| Migration | Existing projects keep array order as-is; no schema version bump required if fields unchanged. |
| Grid generation | Continues to sort by signed offset for spatial grid (geometry). Authoring order remains the persisted template order. |
| Undo | Liner edit page has no project-level undo stack; section-editor undo is unrelated. No fabricated undo wiring. |

### 3.2 UI layout (DD-UI-01)

| Zone | Actions moved / clarified |
| --- | --- |
| Page header (setup) | Close / back / preview / formal drawings / mapping — primary bar, larger hit targets (`.liner-action-btn` height 36px) |
| Section header (line / station / vertical / cross) | Add actions only in `.liner-section-actions` (直線追加・円弧追加・クロソイド追加 / 行追加 / 前に追加・後に追加・末尾に追加) |
| Row actions | ↑ ↓ 削除 in `.liner-row-actions` near each offset row; icon + text |
| Formal workspace | Plan type radio (`平面図（道路形状）` / `平面線形図（中心線のみ）`) + Type A/B/legacy plan + profile + cross DXF buttons |
| Tokens | `.liner-action-btn` height 36px, padding 8×12, gap 8px; 1366 no clip; 1920 not sparse |
| Removed misuse | Section headers no longer use `.liner-edit-inline-row` (was `1fr + 36px` grid that crushed multi-button toolbars) |

### 3.3 Plan types (DD-PLAN-01)

| Id | Label | Geometry | Coordinates |
| --- | --- | --- | --- |
| `road_shape` (Type A) | 平面図（道路形状） | Centerline + offsets/edges + existing annotations | Existing world/model meters (unchanged) |
| `centerline_only` (Type B) | 平面線形図（中心線のみ） | Centerline only (no road edges) | **Station 0 sample translated to local origin `(0,0)`** in the builder. Same transform for preview and DXF. Canonical intermediate result is never mutated. |

Station policy Type B:

- Major: every 100 m → double circle + `No.N` (omit `+0`)
- Minor: every 20 m (not multiple of 100) → single circle + `No.N+R`
- Circles: `DrawingCircle` → DXF `CIRCLE`
- Curve points: BC/EC (arc), KA/KE (clothoid), SP = arc mid-station sample, IP from `piPoints`, R/A from available segment data
- Missing data: omit annotation (no dummy)
- Filenames: `plan-type-a`, `plan-type-b-centerline`

### 3.4 Bands (DD-BAND-01)

- Profile main + band share StationAxis / physicalDistance X.
- Vertical curve band: boundary ticks + slash marks at BVC/EVC when PVC/PVT present; PVI label; length only from real data; else `—`.
- Plan curve band: straight / arc / clothoid spans with BC/SP/EC/KA/KE/R/A.
- Crossfall band: modes + slopes from interval data; missing → `—`.
- Terminology: 「横断勾配／片勾配」= crossfall transition (not a geometric “横断曲線”).

### 3.5 Reference notes

- Route-survey practice: centerline stations commonly at 20 m; No. labeling often at 100 m. Adopted as Type B defaults (user-specified).
- JIP-LINER / SPACER manuals used only for symbol familiarity; no proprietary UI cloning.
- Public CAD製図基準 details not fully retrieved at implementation time; existing domain + user specs preferred where uncertain.

## 4. Acceptance (implementation gate)

1. Offset insert/move/delete with ID stability + persistence
2. Type A regression green
3. Type B preview + DXF with local origin, circles, No. notation, curve labels
4. Profile/plan/crossfall bands improved without fabricated values
5. UI button layout improved at 1366 / 1920
6. Automated tests + Playwright + parser + LibreCAD smoke
7. Squash-merged to main
