# Phase 5 JIP-LINER Formal Drawing Extraction

**Date:** 2026-07-22
**Status:** SUPPORTING / APPROVED EXTRACTION RECORD
**Source:** `マニュアル/JIP-LINER_マニュアル.pdf`
**Extraction method:** `pdftotext` read-only extraction, summarized as topic facts. Proprietary UI wording, examples, command names, and file formats are not copied into product requirements.

## Extraction Policy

JIP-LINER is semantic reference only. Phase 5 adopts drawing concepts where they fit the current road product architecture and rejects product-specific workflows. Unknown or unimplemented details must fail closed or remain deferred; no implementation may claim full JIP parity without this document and the completion gate.

## Primary §8 Findings

| Section | Topic | Extracted fact | Phase 5 decision |
| --- | --- | --- | --- |
| §8 overview | Drawing data | Multiple drawing records can exist and be enabled/disabled; drawing data is separate from LINER/HAUNCH/HOSO calculation data. | Partial adoption: support runtime multi-sheet output; do not persist `DrawingDocument`. |
| §8.1 | Drawing list | Drawing records have title and enable/disable behavior; multiple enabled records may combine into a drawing file. | Future extension. P5 supports fixed plan/profile/cross pages from current project. |
| §8.2 | Basic data | Plan drawing and coordinate table can be toggled; scale, paper, text size, frame, drawing coordinate axis, and dimension formatting are drawing settings. | Adopt as `DrawingSettings` / sheet preset policy. |
| §8.3 | Span composition | Lane/span composition names reference baseline, left/right edge lines, section leaders, and span names. | Partial adoption. P5 uses current bridge/span data and active alignment; full lane composition editor is deferred. |
| §8.4 | Line drawing | Line drawing controls include element-change marks, line-label direction, arc/polyline choice, hide lines, style overrides, and line extension lengths. | Partial adoption. P5-D02 covers supported line labels, curve visibility, hide/style gate if existing primitives support it; wildcard/product syntax is rejected. |
| §8.5 | Section drawing | Section drawing controls include label direction, hide sections, style overrides, section extension, and leader extension. | Partial adoption. P5-D02 covers visible section lines/labels and supported extension/leader behavior; product syntax rejected. |
| §8.6 | Skew angle drawing | Skew/intersection angle drawing is configured by radius and section/line point selection, defaulting line omission to baseline line. | Adopt MVP. P5-D02 must add or verify skew angle drawing at selected section-line intersections. |
| §8.7 | Coordinate table | Coordinate table controls precision, coordinate type, item labels, blank values, item count per line, and cell size. More columns depend on height/haunch/hoso availability. | Adopt supported subset. P5 supports world XY and available Z/HOSO/HAUNCH-derived columns only when already computed; no small-coordinate transform unless implemented elsewhere. |
| §8.8 | Line dimension | Line-to-line dimensions can be auto-created at lead sections and manually configured; measured direction may be baseline-normal or along section; leaders have length/angle/stage. | Adopt MVP. P5-D02 implements/validates active span line dimensions with deterministic ordering. |
| §8.9 | Section dimension | Section-to-section dimensions can be auto-created and manually configured per line; repeated equal values may be compressed. | Adopt MVP. P5-D02 implements/validates active span section dimensions with deterministic ordering. |

## Supporting Sections

| Section | Use in Phase 5 | Decision |
| --- | --- | --- |
| §3.5 Calculation / GDRAW | Clarifies LINER/LDIST/HAUNCH/HOSO/GDRAW separation and PV/DXF output boundary. | Adopt boundary only; no file workflow cloning. |
| §3.6 OUTLINE / GCONVA | CAD conversion is a downstream/export concern. | UI reference only; current DXF exporter remains independent. |
| §5.2 Lines | Line symbols, names, plan/section confirmation diagrams, and line draw selection inform plan/section rendering. | Partial adoption. |
| §5.3 Stations | Station data, ranges, direction, and overlapping precedence inform station labels and fail-closed range behavior. | Adopt where already represented by current station model. |
| §5.4 Height | Vertical/crossfall/section-height dependencies inform profile/cross-section Z composition. | Adopt current P4/P5 redline Z policy; do not copy old data-entry workflow. |
| §5.5 Pier | Piers and line intersections inform bridge/span drawing references. | Reuse current bridge layout data only. |
| §5.6 Span | Span and girder output order inform formal drawing ordering. | Reuse current span model; full lane/span drawing editor deferred. |
| §5.7 Output | Output names and ordering inform labels/tables. | Adopt stable label ordering where current data exists. |

## Explicit Non-Adoption

- Product-specific menu hierarchy, command labels, file names, and manual examples.
- GPLOT/GVIEW/GCROSS/FOOTING option-program behavior.
- SXF formal delivery.
- Small-coordinate conversion unless a current implemented coordinate transform is available.
- Any synthetic ground profile.
- Any compatibility claim for branch/merge, quartic widening, or full importer target workflow.

## Supervisor Verdict

```
PHASE5_EXTRACTION_VERDICT: APPROVED
```
