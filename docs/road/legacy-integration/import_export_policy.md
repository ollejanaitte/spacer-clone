# Import and Export Policy

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY REFERENCE
> This document is retained as current/compatibility evidence. Direct `project.json` generation, frame numbering, and `BridgeDefinition` write-authority claims are superseded for the target design by `RoadDesignDocument` and the versioned `RoadToFrameTransferPackage`; see [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## Purpose

Define supported import/export channels for liner data and derived artifacts. Explicit non-goals prevent copying proprietary third-party formats.

## Scope

- Native liner project save/load.
- Export to frame model (`project.json` subset).
- Export to CAD and report formats.
- Clipboard or CSV interchange for grid tables (optional).

## Out of Scope

- Third-party linear software file import (see non-goals below).
- Generic DXF/LandXML import in MVP.
- Analysis result export.

## Assumptions

- Export always reflects latest valid intermediate results (`ready` state).
- Import validates against liner JSON Schema before domain hydration.

## Design Topics

### 1. Supported formats (MVP)

| Direction | Format | Extension / location |
| --- | --- | --- |
| Save liner domain | JSON liner project | `.liner-project.json` or embedded `project.liner` section |
| Load liner domain | Same | Same |
| Export frame model | `project.json` subset | Via merge into app project |
| Export CAD | SVG | `.liner-plan.svg`, `.liner-profile.svg` |
| Export report | HTML + CSV | `.html`, `.csv` |
| Export grid table | CSV | From [report_output_spec.md](../output/report_output_spec.md) |

### 2. Explicit non-goals

Do **not** implement import/export for proprietary or third-party linear product formats, including but not limited to:

- `.LIN`, `.OL2`, `.MDO`, or similar vendor-specific extensions
- Binary alignment interchange formats from commercial linear software
- Copied title blocks, report templates, or screen-export macros from third-party tools

Functional equivalence is achieved through original JSON schemas and pipelines ([legal_originality_policy.md](../design/legal_originality_policy.md)).

### 3. Embedded vs sidecar

Primary: liner domain embedded in application project bundle ([integration_with_frame_model.md](integration_with_frame_model.md) Mode B).

Secondary: standalone `.liner-project.json` for interchange between projects.

### 4. Version mismatch

Import runs [schema_migration_policy.md](schema_migration_policy.md) transforms; failure → `LINER_IO_VERSION_MISMATCH`.

## Open Questions

- Export bundle: liner file + generated project.json in zip?

## Related Documents

- [project_file_format.md](project_file_format.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [cad_output_spec.md](../output/cad_output_spec.md)
- [report_output_spec.md](../output/report_output_spec.md)
- [legal_originality_policy.md](../design/legal_originality_policy.md)
- [file_io_edge_cases.md](file_io_edge_cases.md)

## Pre-Implementation Checklist

- [x] MVP import/export list finalized.
- [x] Non-goals for third-party formats documented.
- [ ] File dialog filters defined for Electron.
