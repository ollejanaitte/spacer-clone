# Phase 3.9 - LINER UI Cleanup and Frame-Model Target Lines

Status: implemented

Date: 2026-07-06

## Background

Phase 3.8 verified the LINER list -> input -> Preview -> Mapping -> Project flow,

MeasuredGridDraft, the PDF built-in sample, Preview / Mapping / 3D Viewer, SPACER

Axis Swap default ON, and the Y-sign correction.

Phase 3.9 keeps that flow and adds cleanup for:

- the empty `height` tab
- the empty `review` tab
- the documented decision on multiple vertical alignments
- per-line inclusion in the generated SPACER frame model

## Scope

### Height tab

For Phase 3.9, structural height is managed by the single `verticalAlignment`

edited in the vertical tab. Per-line elevations from the PDF coordinate table are

kept in `MeasuredGridPointDraft.z`; they are read by the geometry pipeline but

are not editable through the height tab in Phase 3.9.

The tab now displays placeholder copy explaining that height is currently managed

in the vertical tab and that independent height editing is a Phase 4+ candidate.

### Review tab

The review tab previously showed nothing usable. Phase 3.9 replaces the empty

panel with a placeholder that summarises the current review workflow

(preview + mapping + built-in sample verification) and lists what a future

review workspace should include.

Rebuilding a JIP-LINER-compatible confirmation drawing with plan, profile,

section, and dimensions remains a Phase 4+ TODO.

### Multiple vertical alignments

Decision: Phase 3.9 uses a single vertical alignment.

A single `verticalAlignment` per LINER project is sufficient for the built-in

sample and the current importer scope. All structural lines share the same

profile in Phase 3.9.

Future extension point: add `verticalAlignments?: VerticalAlignmentDraft[]` and a

line-to-profile mapping in Phase 4+ if a real project requires independent

profiles per structural line.

## Frame-model target lines

Phase 3.9 separates PDF / preview lines from structural frame-model lines.

### Schema additions

- `CrossSectionOffsetLineDraft.frameModelEnabled?: boolean`
- `MeasuredGridLineDraft.frameModelEnabled?: boolean`

### Default policy

Frame-model inclusion defaults are decided by line label:

- `HCL`, `CL`, and `ECL`: false
- other labels such as `G1`, `G2`, `HL1`, `HL2`, `HR1`, `HR2`: true

Explicit `frameModelEnabled` values on a draft always override the default.

### Pipeline behaviour

- Preview and MeasuredGrid storage keep all lines.
- Grid / MeasuredGrid generation filters out `frameModelEnabled === false`

lines before producing frame nodes, members, and supports.

- Diagnostics still reference the original line ids so that skipped lines

remain traceable in the mapping review.

## Built-in sample

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

## Phase 4+ follow-ups

- Independent height editing per structural line
- Multiple vertical alignments with line-to-profile mapping
- JIP-LINER-compatible confirmation drawing (plan / profile / section / dimensions)
- Road drawing system (Phase 4.0)
- Bridge Definition intermediate layer between LINER and SPACER (Phase 4.5)
