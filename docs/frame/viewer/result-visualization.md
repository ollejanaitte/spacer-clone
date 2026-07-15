# Result Display Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE VIEWER REFERENCE
> Viewer behavior is presentation/session behavior, not Frame domain or result truth, and Viewer is not formal Frame.DRAFT. Current facts and target gaps are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

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

`Result` is the analysis result defined in [result-schema.md](../contracts/result-schema.md). `ViewModel` is derived data shaped for the display target. `Viewer` is responsible for rendering on the screen.

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

## 6. Static Member Force Diagrams

Static member force diagrams are a Viewer concern. The solver, result schema,
API response, frontend store, and ViewModel already carry member section force
components as `N`, `Qy`, `Qz`, `Mx`, `My`, and `Mz`. The Viewer chooses which
components are drawn for the currently selected load case.

### 6.1 Existing Behavior

- `N` is drawn when static analysis results are available, a load case is
  selected, the axial force diagram toggle is enabled, and the 3D Viewer is
  active.
- `My` and `Mz` are drawn independently when their diagram toggles are enabled.
- The existing result diagram scale is applied to all member force diagrams.
- Moment components are drawn with the existing line and ribbon conventions.
- Component sign, value, and local member force convention are not changed by
  Viewer display settings.

### 6.2 Qy and Qz Support

`Qy` and `Qz` are added as independent static shear force diagram components.
They use the same selected static load case, result scale, colors, member
stations, and local member force values that are already used by `N`, `My`, and
`Mz`. The implementation connects the existing ViewModel items for `Qy` and
`Qz` to the Viewer rendering path; it does not change solver output or analysis
post-processing.

The default visibility for both shear diagrams is off. This keeps existing
projects and saved UI states compatible, and missing visibility flags from older
runtime state are interpreted as `false`.

### 6.3 UI Behavior

The Viewer result diagram controls expose separate toggles for:

- axial force diagram (`N`)
- shear force diagram (`Qy`)
- shear force diagram (`Qz`)
- bending moment diagram (`My`)
- bending moment diagram (`Mz`)

The labels are user-facing Japanese strings defined in `frontend/src/i18n/ja.ts`.
No Japanese strings are hard-coded in React components.

When a visible member force diagram has no meaningful value for the selected
load case, the Viewer shows concise feedback in the controls panel. This is a
display hint only; it does not create an analysis warning or alter result data.

### 6.4 Local-Axis Behavior and Limitations

`My` and `Mz` are displayed separately, and `Qy` and `Qz` are displayed
separately. Depending on the load direction and member local axes, one component
may be non-zero while the paired component is zero. A zero or near-zero component
collapses onto the member baseline and may appear invisible even when its toggle
is enabled.

The current diagram geometry follows the existing Viewer convention for member
force offsets. It is intended for visual inspection of component distribution,
not for changing local-axis definitions or force sign conventions.

### 6.5 Compatibility Notes

- No solver formulas, numerical constants, force signs, or result schemas are
  changed.
- API response fields remain unchanged.
- Existing `N`, `My`, and `Mz` diagram behavior is preserved.
- Time-history, dynamic, response spectrum, and color-map behavior are not
  changed except that the already available `Qy`/`Qz` values can now be drawn as
  static diagrams.

## 7. Related Documents

- [result-schema.md](../contracts/result-schema.md)
- [report-drawing-output.md](../output/report-drawing-output.md)
- [../history/frame/investigations/visualization-study.md](../../history/frame/investigations/visualization-study.md)
