# Phase 3.9 - LINER UI Cleanup and Frame-Model Target Lines

Status: implemented
Date: 2026-07-06

## Scope

Phase 3.8 verified the LINER list -> input -> Preview -> Mapping -> Project flow,
MeasuredGridDraft, the PDF built-in sample, Preview / Mapping / 3D Viewer, SPACER
Axis Swap default ON, and the Y-sign correction.

Phase 3.9 keeps that flow and adds cleanup for:

- the empty `height` tab
- the empty `review` tab
- the documented decision on multiple vertical alignments
- per-line inclusion in the generated SPACER frame model

## Height Tab Decision

Keep the `height` tab, but do not leave it blank.

For Phase 3.9, structural height is managed by the single `verticalAlignment`
edited in the vertical tab. Per-line elevations from the PDF coordinate table are
kept in `MeasuredGridPointDraft.z`; they do not need an additional height-tab
editor in this phase.

The tab now displays placeholder copy explaining that height is currently managed
in the vertical tab and that independent height editing is a Phase 4+ candidate.

## Review Tab Decision

Keep the `review` tab, but do not leave it blank.

For Phase 3.9, the Preview page is the working equivalent of the JIP-LINER
confirmation drawing. The review tab now explains that 2D confirmation happens
in Preview and 3D confirmation happens from the Mapping Review page.

Rebuilding a JIP-LINER-compatible confirmation drawing with plan, profile,
section, and dimensions remains a Phase 4+ TODO.

## Multiple Vertical Alignments

Decision: Phase 3.9 uses a single vertical alignment.

Rationale:

- PDF coordinate-table and cross-section measured values already preserve
  line-by-line elevations as `MeasuredGridPointDraft.z`.
- HCL or the representative centerline vertical profile is sufficient for the
  current LINER -> SPACER frame-model generation path.
- G1/G2/HL/HR independent vertical profiles may be useful for future specialized
  workflows, but they are not required for the current built-in sample flow.

Future extension point: add `verticalAlignments?: VerticalAlignmentDraft[]` and a
line-to-profile mapping in Phase 4+ if a real project requires independent
profiles per structural line.

## Frame-Model Target Lines

Phase 3.9 separates PDF / preview lines from structural frame-model lines.

Data flags:

- `CrossSectionOffsetLineDraft.frameModelEnabled?: boolean`
- `MeasuredGridLineDraft.frameModelEnabled?: boolean`

Default behavior:

- `HCL`, `CL`, and `ECL`: false
- other labels such as `G1`, `G2`, `HL1`, `HL2`, `HR1`, `HR2`: true
- unknown custom labels: true

Responsibility split:

- Preview and MeasuredGrid storage keep all lines.
- Grid / MeasuredGrid generation filters out `frameModelEnabled === false`
  before building frame-model grid points.
- Mapping and Project merge receive only the filtered frame-model nodes,
  members, and supports, so members connected to disabled lines are not created.

UI:

- The cross-section offset-line table has a `frameModelEnabled` checkbox column.
- Users can turn CL/ECL/HCL or any custom line on or off before Mapping.

## Built-In Sample

The built-in sample defaults HCL, CL, and ECL to `frameModelEnabled=false`.

The structural frame model is generated from the six structural lines:

- HL1
- HL2
- G1
- G2
- HR2
- HR1

CL/ECL/HCL remain available for measured-grid reproduction and preview, but they
are not inserted into the SPACER frame model by default.
