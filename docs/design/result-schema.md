# Result Schema Design

## 1. Purpose

This document defines the common schema for the analysis results returned by the solver. The Result Schema holds only the fact of the analysis result. It does not hold states that depend on display, drawing, reporting, or UI operations.

This design is a schema design document. It does not perform implementation, API changes, or schema implementation.

## 2. Basic Structure

The Result Schema is used in the following relations.

```text
Solver
  |
  v
Result Schema
  |
  v
ViewModel

Report Model

Drawing Model
```

`ViewModel` is defined in [result-visualization.md](result-visualization.md). `Report Model` and `Drawing Model` are defined in [report-drawing-output.md](report-drawing-output.md).

## 3. What is Not Included in the Result Schema

The Result Schema does not include the following:

- Display scale
- Display color
- Line width
- Font size
- Camera state
- UI state

These are handled in the Viewer, ViewModel, Drawing Model, Report Model, and Export settings.

## 4. Common Types

```ts
export type AnalysisType =
  | "linearStatic"
  | "eigen"
  | "responseSpectrum"
  | "influenceLine"
  | "movingLoad";

export type AnalysisStatus = "success" | "warning" | "failed";

export type ResultSchema = {
  schemaVersion: string;
  resultId: string;
  projectId: string;
  analysisType: AnalysisType;
  status: AnalysisStatus;
  summary: ResultSummary;
  linearStaticResults?: LinearStaticResult[];
  eigenResult?: EigenResult;
  responseSpectrumResult?: ResponseSpectrumResult;
  influenceLineResult?: InfluenceLineResult;
  warnings: ResultMessage[];
  errors: ResultMessage[];
};

export type ResultSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  solverName: string;
  nodeCount: number;
  memberCount: number;
  loadCaseCount?: number;
};

export type ResultMessage = {
  code: string;
  message: string;
  path?: string;
  entityType?: string;
  entityId?: string;
};
```

## 5. Linear Static Analysis Result

The linear static analysis result holds nodal displacements, reactions, and member section forces per load case.

```ts
export type LinearStaticResult = {
  loadCaseId: string;
  displacements: NodeDisplacement[];
  reactions: NodeReaction[];
  memberSectionForces: MemberSectionForce[];
};

export type NodeDisplacement = {
  nodeId: string;
  ux: number;
  uy: number;
  uz: number;
  rx: number;
  ry: number;
  rz: number;
};

export type NodeReaction = {
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
};

export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type MemberSectionForce = {
  memberId: string;
  station: number;
  component: MemberSectionForceComponent;
  value: number;
};
```

Member section force components are unified as follows:

```text
N
Qy
Qz
Mx
My
Mz
```

## 6. Eigenvalue Analysis Result

The eigenvalue analysis result holds the eigenvalue, natural period, frequency, modal participation factors, and effective mass ratios.

```ts
export type EigenResult = {
  massCaseId: string;
  normalization: "mass" | "max";
  modes: EigenModeResult[];
};

export type EigenModeResult = {
  modeNo: number;
  eigenvalue: number;
  circularFrequency: number;
  frequency: number;
  period: number;
  modalMass: number;
  participationFactors: DirectionalValue[];
  effectiveMassRatios: DirectionalValue[];
  shape: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
  }>;
};

export type DirectionalValue = {
  direction: "X" | "Y" | "Z" | string;
  value: number;
};
```

The term mapping is as follows.

| Term | Field |
| --- | --- |
| Eigenvalue | `eigenvalue` |
| Period | `period` |
| Frequency | `frequency` |
| Modal participation factor | `participationFactors` |
| Effective mass ratio | `effectiveMassRatios` |

## 7. Response Spectrum Analysis Result

The response spectrum analysis result handles modal combination by SRSS or CQC. The per-mode results and the combined result are kept separate.

```ts
export type ResponseSpectrumCombinationMethod = "SRSS" | "CQC";

export type ResponseSpectrumResult = {
  spectrumCaseId: string;
  direction: "X" | "Y" | "Z" | string;
  dampingRatio: number;
  combinationMethod: ResponseSpectrumCombinationMethod;
  modalResults: ResponseSpectrumModalResult[];
  combinedResult: ResponseSpectrumCombinedResult;
};

export type ResponseSpectrumModalResult = {
  modeNo: number;
  spectralAcceleration: number;
  displacements: NodeDisplacement[];
  reactions?: NodeReaction[];
  memberSectionForces?: MemberSectionForce[];
};

export type ResponseSpectrumCombinedResult = {
  method: ResponseSpectrumCombinationMethod;
  displacements: NodeDisplacement[];
  reactions?: NodeReaction[];
  memberSectionForces?: MemberSectionForce[];
};
```

Required terms are:

- SRSS
- CQC
- Per-mode result
- Combined result

## 8. Influence Line Analysis Result

The influence line analysis result holds the target response when a unit load is placed at each station on the load line. Influence line targets are nodal displacement, reaction, and section force.

```ts
export type InfluenceLineResult = {
  caseId: string;
  lineId: string;
  unitLoad: {
    magnitude: number;
    direction: { x: number; y: number; z: number };
  };
  stations: InfluenceStation[];
  targets: InfluenceTarget[];
  targetResults: InfluenceTargetResult[];
};

export type InfluenceStation = {
  station: number;
  x: number;
  y: number;
  z: number;
};

export type InfluenceTarget =
  | {
      id: string;
      type: "nodeDisplacement";
      nodeId: string;
      component: "ux" | "uy" | "uz" | "rx" | "ry" | "rz";
    }
  | {
      id: string;
      type: "reaction";
      nodeId: string;
      component: "fx" | "fy" | "fz" | "mx" | "my" | "mz";
    }
  | {
      id: string;
      type: "memberSectionForce";
      memberId: string;
      component: MemberSectionForceComponent;
      station?: number;
    };

export type InfluenceTargetResult = {
  targetId: string;
  values: Array<{
    station: number;
    value: number;
  }>;
};
```

The mapping of influence line targets is as follows.

| Target | `type` |
| --- | --- |
| Nodal displacement | `nodeDisplacement` |
| Reaction | `reaction` |
| Section force | `memberSectionForce` |

## 9. Connection to ViewModel, Report, and Drawing

The Result Schema does not hold the final shape of the display or the report. The conversion to each use is done as follows.

- Display: generate the `ViewModel` from the `Result Schema`.
- Drawing: generate the `Drawing Model` from the `Result Schema`.
- Report: generate the `Report Model` from the `Drawing Model` and the `Result Schema`.
- Export: run `Export` from the `Report Model` or the `Drawing Model`.

## 10. Related Documents

- [result-visualization.md](result-visualization.md)
- [report-drawing-output.md](report-drawing-output.md)
- [../investigation/visualization-study.md](../investigation/visualization-study.md)
- [eigen-analysis.md](eigen-analysis.md)
- [response-spectrum-analysis.md](response-spectrum-analysis.md)
- [influence-engine.md](influence-engine.md)

## Phase E-1b: eigenResult Extension

The following new fields are added as optional to preserve backward compatibility.

- `eigenResult.totalMassByDirection`: the total mass per direction, in the form `[{ direction: "X", value: ... }, ...]`.
- `eigenResult.modes[].effectiveMasses`: the absolute effective mass of each mode.
- `eigenResult.modes[].cumulativeEffectiveMassRatios`: the cumulative effective mass ratio up to and including each mode.

The existing `participationFactors`, `effectiveMassRatios`, and `modalMass` do not change in meaning. The CSV output `eigen_modes.csv` includes the basic eigenvalue quantities, modal participation factors, effective masses, effective mass ratios, cumulative effective mass ratios, and total mass per direction.
