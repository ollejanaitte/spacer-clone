# Result Display Design

## 1. Purpose

This document defines the responsibility split for displaying analysis results in the 3D view, tables, graphs, and the result review screen.

This design defines the display architecture. It does not perform implementation, UI changes, or API changes.

## 2. Basic Structure

Result display follows the flow below.

```text
Result
  |
  v
ViewModel
  |
  v
Viewer
```

`Result` is the analysis result defined in [result-schema.md](result-schema.md). `ViewModel` is derived data shaped for the display target. `Viewer` is responsible for rendering on the screen.

## 3. Responsibility Split

| Layer | Responsibility | Includes | Excludes |
| --- | --- | --- | --- |
| Result | The fact of the analysis result | Displacements, reactions, member section forces, eigenvalue analysis result, response spectrum result, influence line result | Display scale, display colors, line width, font size, camera state, UI state |
| ViewModel | Derived data for display | Display target, filtered values, plotting series, legend labels, normalized values | Solver-specific calculation |
| Viewer | Screen rendering and interaction | 3D display, tables, graphs, selection state, camera, display settings | Persistent schema of the analysis result |

## 4. ViewModel Types

### 4.1 Displacement ViewModel

Derived model that hands nodal displacements to the table, deformed shape, and displacement graph.

```ts
export type DisplacementViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
    magnitude: number;
  }>;
};
```

### 4.2 Reaction ViewModel

Derived model that hands support reactions to the table, reaction diagram, and report preview.

```ts
export type ReactionViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  }>;
};
```

### 4.3 Member Section Force ViewModel

Member section forces are unified into `N`, `Qy`, `Qz`, `Mx`, `My`, `Mz`.

```ts
export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type MemberSectionForceViewModel = {
  resultId: string;
  loadCaseId: string;
  component: MemberSectionForceComponent;
  items: Array<{
    memberId: string;
    station: number;
    value: number;
  }>;
};
```

### 4.4 Eigenvalue Analysis ViewModel

The eigenvalue analysis result is handed to the mode list, mode shape, and dynamic analysis result table.

```ts
export type EigenModeViewModel = {
  resultId: string;
  modes: Array<{
    modeNo: number;
    eigenvalue: number;
    period: number;
    frequency: number;
    participationFactor: number;
    effectiveMassRatio: number;
  }>;
};
```

### 4.5 Response Spectrum Analysis ViewModel

The response spectrum analysis result is shown by separating the per-mode results from the combined result.

```ts
export type ResponseSpectrumViewModel = {
  resultId: string;
  combinationMethod: "SRSS" | "CQC";
  modalResults: Array<{
    modeNo: number;
    displacements: DisplacementViewModel["items"];
  }>;
  combinedResult: {
    displacements: DisplacementViewModel["items"];
    reactions?: ReactionViewModel["items"];
    memberSectionForces?: MemberSectionForceViewModel["items"];
  };
};
```

### 4.6 Influence Line ViewModel

Influence line targets are nodal displacement, reaction, and section force.

```ts
export type InfluenceTargetViewModel =
  | { type: "nodeDisplacement"; nodeId: string; component: "ux" | "uy" | "uz" | "rx" | "ry" | "rz" }
  | { type: "reaction"; nodeId: string; component: "fx" | "fy" | "fz" | "mx" | "my" | "mz" }
  | { type: "memberSectionForce"; memberId: string; component: MemberSectionForceComponent; station?: number };

export type InfluenceLineViewModel = {
  resultId: string;
  lineId: string;
  target: InfluenceTargetViewModel;
  values: Array<{
    station: number;
    value: number;
  }>;
};
```

## 5. Relationship with the Viewer

The Viewer receives the ViewModel and manages the screen state and rendering. Display scale, display colors, line width, font size, camera state, and UI state live on the Viewer side or in Viewer-side settings. They are not written back to the `Result Schema`.

## 6. Related Documents

- [result-schema.md](result-schema.md)
- [report-drawing-output.md](report-drawing-output.md)
- [../investigation/visualization-study.md](../investigation/visualization-study.md)
