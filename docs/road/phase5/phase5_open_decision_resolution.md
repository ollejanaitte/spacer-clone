# Phase 5 Open Decision Resolution

**Date:** 2026-07-22
**Status:** SUPPORTING / APPROVED DECISION RECORD
**Scope:** AC-RD and OD-01..19 for Road Phase 5 Planning Freeze.

## AC-RD Resolution

`docs/road/output/redline_ui_and_drawing_remediation_design.md` AC-RD-01..20 are adopted as supporting acceptance criteria and lifted into the Phase 5 completion gate with these adjustments:

| AC range | Decision |
| --- | --- |
| AC-RD-01..06 | Adopt for crossfall/template persistence and migration behavior. |
| AC-RD-07..10 | Adopt for DrawingDocument source boundary and workspace layout. |
| AC-RD-11..15 | Adopt for plan/profile/band/cross-section geometry and text constraints. |
| AC-RD-16..20 | Adopt as visual E2E screenshot/manual evidence gates at 1366x768 and 1920x1080. |

AC-RD does not by itself prove full JIP parity. P5-D01 must map each AC to code/test evidence or an approved P5-D gap.

## OD-01..19 Resolution

| ID | Historical topic | Phase 5 decision | Classification |
| --- | --- | --- | --- |
| OD-01 | Customer/issuer | Do not encode a customer. Use project metadata only when present. | Phase 5 non-target |
| OD-02 | Contract timing | Do not block implementation. Contract metadata is outside product behavior. | Phase 5 non-target |
| OD-03 | CAD standard version | Use `common` preset as the only release target. Do not claim MLIT/NEXCO compliance. | Adopt with restriction |
| OD-04 | NEXCO/regional variants | Out of scope. No regional preset claim. | Deferred |
| OD-05 | DXF version | Use current exporter default `AC1021`; changes require P5-D03 approval. | Adopt |
| OD-06 | Model-paper scale | Model coordinates in meters, paper/text in millimeters, screen in pixels. | Adopt |
| OD-07 | Title / band rows | Adopt current minimal title/sheet decoration and supported band rows; no client title block. | Partial adoption |
| OD-08 | Scale | Use current sheet preset defaults; visual tests gate readability, not legal submission scale. | Partial adoption |
| OD-09 | Font | Use current SVG/DXF text defaults and fallback; no formal font compliance claim. | Partial adoption |
| OD-10 | UTF-8 / CP932 | Use current exporter path; no CP932 compatibility claim unless P5-D03 adds evidence. | Partial adoption |
| OD-11 | Crossfall pivot | Centerline/active baseline pivot as implemented; measured grid bypass remains explicit warning. | Adopt |
| OD-12 | Design standard | MVP supports `common` drawing preset only. | Adopt with restriction |
| OD-13 | Measured precedence | Measured grid takes precedence over interval crossfall and emits warning. | Adopt |
| OD-14 | Multiple line branch/merge | Active alignment/line only. Branch/merge is out of scope and must not silently draw as complete. | Adopt exclusion |
| OD-15 | SXF timing | SXF is out of Phase 5. | Deferred |
| OD-16 | sourceRevision | Include formal drawing-affecting inputs through existing sourceRevision/drawingSettings behavior; stale exports fail closed where diagnostics are error-level. | Adopt |
| OD-17 | Scale by view | View-specific defaults are supported through sheet presets and builders. | Adopt |
| OD-18 | Band row density | Use current deterministic minimum band rows; no full client density claim. | Partial adoption |
| OD-19 | sourceRevision granularity | Use deterministic rebuild from RDD/domain draft; do not persist stale results. | Adopt |

## Remaining Unknowns

No unresolved OD blocks Planning Freeze. Unimplemented or partially implemented behavior is represented as P5-D ledger work or explicit deferred scope.

## Supervisor Verdict

```
PHASE5_OPEN_DECISIONS_VERDICT: APPROVED
```
