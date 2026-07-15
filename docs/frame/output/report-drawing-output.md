# Report and Drawing Output Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE OUTPUT REFERENCE
> This is subordinate current output design evidence. It does not establish complete target PRINT or formal DRAFT; current capability and target gaps are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the responsibility split for expanding the analysis result into reports, drawings, CSV, and future PDF / DXF output.

This design defines the output architecture. It does not perform implementation, UI changes, API changes, or library additions.

## 2. Basic Structure

Report and drawing output follows the flow below.

```text
Result
  |
  v
Drawing Model
  |
  v
Report Model
  |
  v
Export
```

`Result` is the analysis result defined in [result-schema.md](../contracts/result-schema.md). `Drawing Model` is the derived model for drawing, `Report Model` is the derived model for the report layout, and `Export` is the conversion to the output format.

## 3. Responsibility Split

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Result | Holds the fact of the analysis result. | Displacement, reaction, member section force, eigenvalue analysis result, response spectrum analysis result, influence line result |
| Drawing Model | Holds the drawing geometry, annotations, and plotting series. | Deformed shape, section force diagram, mode shape, influence line diagram |
| Report Model | Holds the report chapters, tables, figures, and notes. | Result list table, section force table, eigenvalue table, response spectrum table |
| Export | Converts to the output format. | CSV, PDF, DXF, image, print-ready data |

## 4. Drawing Model

The Drawing Model is a derived model that converts the analysis result into drawing elements. Output style such as line width, color, and font size belongs to the Drawing Model or to the Export settings. It is not included in the Result Schema.

```ts
export type DrawingModel = {
  id: string;
  sourceResultId: string;
  title: string;
  drawings: DrawingItem[];
};

export type DrawingItem =
  | DeformationDrawing
  | MemberSectionForceDrawing
  | EigenModeDrawing
  | InfluenceLineDrawing;

export type DeformationDrawing = {
  type: "deformation";
  loadCaseId: string;
  nodes: Array<{
    nodeId: string;
    x: number;
    y: number;
    z: number;
    dx: number;
    dy: number;
    dz: number;
  }>;
};

export type MemberSectionForceDrawing = {
  type: "memberSectionForce";
  loadCaseId: string;
  component: "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";
  diagrams: Array<{
    memberId: string;
    points: Array<{ station: number; value: number }>;
  }>;
};

export type EigenModeDrawing = {
  type: "eigenMode";
  modeNo: number;
  nodes: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
  }>;
};

export type InfluenceLineDrawing = {
  type: "influenceLine";
  lineId: string;
  targetId: string;
  points: Array<{ station: number; value: number }>;
};
```

## 5. Report Model

The Report Model is a derived model that represents the report chapters, tables, figures, and notes. The report appearance and page layout belong to the Report Model or to the Export settings. They are not included in the Result Schema.

```ts
export type ReportModel = {
  id: string;
  sourceResultId: string;
  title: string;
  sections: ReportSection[];
};

export type ReportSection = {
  id: string;
  title: string;
  blocks: ReportBlock[];
};

export type ReportBlock =
  | { type: "table"; title: string; columns: string[]; rows: Array<Array<string | number>> }
  | { type: "drawing"; title: string; drawingId: string }
  | { type: "note"; text: string };
```

## 6. Export

Export has the responsibility of converting the Report Model or the Drawing Model into the output format.

```ts
export type ExportRequest = {
  reportModelId?: string;
  drawingModelId?: string;
  format: "csv" | "pdf" | "dxf" | "png";
  targetSections?: string[];
};

export type ExportResult = {
  format: ExportRequest["format"];
  fileName: string;
  warnings: string[];
};
```

## 7. Output Targets

Report and drawing output covers:

- Nodal displacement
- Reaction
- Member section force `N`, `Qy`, `Qz`, `Mx`, `My`, `Mz`
- Eigenvalue analysis result
- Response spectrum analysis result
- Influence line result

## 8. Related Documents

- [result-schema.md](../contracts/result-schema.md)
- [result-visualization.md](../viewer/result-visualization.md)
- [../history/frame/investigations/visualization-study.md](../../history/frame/investigations/visualization-study.md)
