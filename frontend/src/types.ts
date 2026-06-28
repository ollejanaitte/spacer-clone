import type { PersistedLinerTraceEntry, ProjectLinerMetadata } from "./liner/schema/types";

export type ProjectInfo = {
  id: string;
  name: string;
  schemaVersion: "1.0.0";
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type NodeItem = {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
};

export type Material = {
  id: string;
  name: string;
  elasticModulus: number;
  shearModulus: number;
  poissonRatio: number;
  density: number;
};

export type Section = {
  id: string;
  name: string;
  area: number;
  iy: number;
  iz: number;
  j: number;
};

export type Member = {
  id: string;
  nodeI: string;
  nodeJ: string;
  materialId: string;
  sectionId: string;
  orientationVector?: { x: number; y: number; z: number };
  orientationNode?: string;
  label?: string;
};

export type Support = {
  nodeId: string;
  ux: boolean;
  uy: boolean;
  uz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
};

export type LoadCase = {
  id: string;
  name: string;
  type: "static";
};

export type NodalLoad = {
  id: string;
  loadCaseId: string;
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
};

export type MemberLoad = {
  id: string;
  loadCaseId: string;
  memberId: string;
  coordinateSystem: "local" | "global";
  type: "uniform";
  wx: number;
  wy: number;
  wz: number;
};

export type MassItem = {
  nodeId: string;
  mx: number;
  my: number;
  mz: number;
  irx: number;
  iry: number;
  irz: number;
};

export type MassCase = {
  id: string;
  name: string;
  method: "lumped";
  source: "manual";
  items: MassItem[];
};

export type AnalysisSettings = {
  analysisType: "linear_static";
  solver?: "scipy_sparse";
  includeShearDeformation: false;
  largeDisplacement: false;
  tolerance: number;
  eigen?: {
    massCaseId: string;
    modeCount: number;
  };
  responseSpectrum?: {
    massCaseId?: string;
    modeCount: number;
    spectrumCaseId: string;
    direction: "X" | "Y" | "Z";
    dampingRatio: number;
    combinationMethod?: ResponseSpectrumCombinationMethod;
    interpolationMethod?: ResponseSpectrumInterpolationMethod;
    targetCumulativeMassRatio: number;
    spectrumPoints: Array<{ period: number; value: number }>;
  };
  influence?: {
    caseId: string;
    line: {
      id: string;
      memberId: string;
      stationCount: number;
      direction: { x: number; y: number; z: number };
      magnitude: number;
    };
    targets: InfluenceTarget[];
  };
  timeHistory?: {
    schemaVersion?: 2;
    enabled?: boolean;
    method: "newmark-beta";
    timeStep: number;
    duration: number;
    beta: number;
    gamma: number;
    damping?: { type: "rayleigh"; alpha: number; beta: number };
    massCaseId?: string;
    groundMotionId?: string;
    direction?: "X" | "Y" | "Z";
    groundMotions?: {
      x: { enabled: boolean; groundMotionId: string | null };
      y: { enabled: boolean; groundMotionId: string | null };
      z: { enabled: boolean; groundMotionId: string | null };
    };
  };
};

export type ProjectModel = {
  schemaVersion: number;
  project: ProjectInfo;
  units: {
    length: string;
    force: string;
    moment: string;
    modulus: string;
    area: string;
    inertia: string;
  };
  nodes: NodeItem[];
  materials: Material[];
  sections: Section[];
  members: Member[];
  supports: Support[];
  loadCases: LoadCase[];
  nodalLoads: NodalLoad[];
  memberLoads: MemberLoad[];
  massCases?: MassCase[];
  groundMotions?: Array<{
    id: string;
    name?: string;
    direction: "X" | "Y" | "Z";
    timeStep: number;
    duration?: number;
    unit: "m/s2" | "gal";
    samples: number[];
  }>;
  analysisSettings: AnalysisSettings;
  /** Persisted latest results. The MVP only persists the time history result. */
  analysisResults?: {
    timeHistory?: TimeHistoryResult | null;
  };
  /** Optional liner integration metadata from intermediate result / frame mapper output. */
  liner?: ProjectLinerMetadata;
  /** Optional trace table linking generated frame entities to liner grid sources. */
  linerTrace?: PersistedLinerTraceEntry[];
};

export type StructuredMessage = {
  code: string;
  message: string;
  path: string | null;
  entityType: string | null;
  entityId: string | null;
};

export type ValidationResponse = {
  valid: boolean;
  warnings: StructuredMessage[];
  errors: StructuredMessage[];
};

export type AnalysisResult = {
  projectId: string;
  schemaVersion: "1.0.0";
  analysisSummary: {
    analysisType: "linear_static" | "eigen" | "response_spectrum" | "responseSpectrum" | "influence_line" | "time_history" | "moving_load";
    status: "success" | "warning" | "failed";
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    nodeCount: number;
    memberCount: number;
    loadCaseCount: number;
    totalDof: number;
    freeDof: number;
    constrainedDof: number;
    solver: "scipy_sparse" | "scipy_eigh" | "newmark_beta" | "influence_line_reuse";
  };
  displacements: Array<{
    loadCaseId: string;
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
  }>;
  reactions: Array<{
    loadCaseId: string;
    nodeId: string;
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
    constrainedDofs: string[];
  }>;
  memberEndForces: Array<{
    loadCaseId: string;
    memberId: string;
    coordinateSystem: "local";
    i: EndForce;
    j: EndForce;
  }>;
  eigenResult?: EigenResult;
  responseSpectrumResult?: ResponseSpectrumResult;
  influenceResult?: InfluenceResult;
  movingLoadResult?: MovingLoadResult;
  timeHistoryResult?: TimeHistoryResult | null;
  warnings: StructuredMessage[];
  errors: StructuredMessage[];
};

export type DirectionalValue = {
  direction: string;
  value: number;
};

export type EigenModeShape = {
  nodeId: string;
  ux: number;
  uy: number;
  uz: number;
  rx: number;
  ry: number;
  rz: number;
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
  effectiveMasses?: DirectionalValue[];
  cumulativeEffectiveMassRatios?: DirectionalValue[];
  shape: EigenModeShape[];
};

export type EigenResult = {
  massCaseId: string;
  normalization: "mass";
  totalMassByDirection?: DirectionalValue[];
  modes: EigenModeResult[];
};

export type ResponseSpectrumCombinationMethod = "SRSS" | "CQC";
export type ResponseSpectrumInterpolationMethod = "linear" | "logLog";

export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type NodeDisplacementResult = {
  nodeId: string;
  ux: number;
  uy: number;
  uz: number;
  rx: number;
  ry: number;
  rz: number;
};

export type NodeReactionResult = {
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
  constrainedDofs?: string[];
};

export type MemberSectionForceResult = {
  memberId: string;
  station: number;
  component: MemberSectionForceComponent;
  value: number;
};

export type ResponseSpectrumModalResult = {
  modeNo: number;
  spectralAcceleration: number;
  displacements: NodeDisplacementResult[];
  reactions?: NodeReactionResult[];
  memberSectionForces?: MemberSectionForceResult[];
};

export type ResponseSpectrumCombinedResult = {
  method: ResponseSpectrumCombinationMethod;
  displacements: NodeDisplacementResult[];
  reactions?: NodeReactionResult[];
  memberSectionForces?: MemberSectionForceResult[];
};

export type ResponseSpectrumResult = {
  spectrumCaseId: string;
  direction: string;
  dampingRatio: number;
  combinationMethod: ResponseSpectrumCombinationMethod;
  interpolationMethod?: ResponseSpectrumInterpolationMethod;
  targetCumulativeMassRatio?: number;
  usedModes?: number[];
  modalResults: ResponseSpectrumModalResult[];
  combinedResult: ResponseSpectrumCombinedResult;
  directionResults?: ResponseSpectrumDirectionResult[];
};

export type ResponseSpectrumDirectionResult = {
  direction: "X" | "Y" | "Z";
  combinationMethod: ResponseSpectrumCombinationMethod;
  interpolationMethod?: ResponseSpectrumInterpolationMethod;
  dampingRatio?: number;
  usedModes?: number[];
  modalResults: ResponseSpectrumModalResult[];
  combinedResult: ResponseSpectrumCombinedResult;
};

export type InfluenceTarget = {
  id: string;
  type: "displacement" | "reaction" | "memberEndForce";
  nodeId?: string;
  memberId?: string;
  component: string;
  end?: "i" | "j";
};

export type InfluenceResult = {
  caseId: string;
  line: {
    id: string;
    memberId: string;
    stationCount: number;
    loadDirection: { x: number; y: number; z: number };
    loadMagnitude: number;
  };
  stations: Array<{
    station: number;
    ratio: number;
    position: { x: number; y: number; z: number };
    stationIndex: number;
  }>;
  targets: InfluenceTarget[];
  targetResults: Array<{
    targetId: string;
    values: number[];
  }>;
};

export type Vector3 = { x: number; y: number; z: number };

export type MovingLoadLine = {
  id: string;
  memberId: string;
  stationCount: number;
  direction: Vector3;
};

export type SinglePointLiveLoad = {
  id: string;
  type: "singlePoint";
  name?: string;
  magnitude: number;
  unit: "kN";
  direction: Vector3;
};

export type MovingLoadCase = {
  id: string;
  name?: string;
  influenceCaseId?: string;
  line: MovingLoadLine;
  liveLoad: SinglePointLiveLoad;
  targets: InfluenceTarget[];
  options?: {
    includeInfluenceResult?: boolean;
    includeHistory?: boolean;
    returnCsv?: boolean;
  };
};

export type MovingLoadPosition = {
  loadId: string;
  station: number;
  ratio: number;
  position: Vector3;
  magnitude: number;
  unit: "kN";
};

export type MovingLoadHistoryItem = {
  station: number;
  ratio: number;
  position: Vector3;
  loadPositions: MovingLoadPosition[];
  responses: Array<{ targetId: string; value: number }>;
};

export type EnvelopeExtreme = {
  value: number;
  station: number;
  ratio: number;
  position: Vector3;
  stationIndex: number;
  loadPositions: MovingLoadPosition[];
};

export type EnvelopeItem = {
  targetId: string;
  target: InfluenceTarget;
  max: EnvelopeExtreme;
  min: EnvelopeExtreme;
  absMax: EnvelopeExtreme;
};

export type EnvelopeResult = {
  caseId: string;
  items: EnvelopeItem[];
};

export type WorstCaseLoadingPosition = {
  targetId: string;
  criterion: "max" | "min" | "absMax";
  value: number;
  station: number;
  ratio: number;
  position: Vector3;
  stationIndex: number;
  loadPositions: MovingLoadPosition[];
  influenceValue: number;
};

export type MovingLoadResult = {
  caseId: string;
  caseName?: string;
  liveLoad: SinglePointLiveLoad | null;
  line: {
    id: string;
    memberId: string;
    stationCount: number;
    loadDirection: Vector3;
  };
  influenceResult?: InfluenceResult | null;
  movingLoadHistory?: MovingLoadHistoryItem[] | null;
  envelopeResult: EnvelopeResult;
  worstCaseLoadingPositions: WorstCaseLoadingPosition[];
};

export type TimeHistoryResultMeta = {
  analysisId: string;
  status: "success" | "failed";
  method: string;
  timeStep: number;
  duration: number;
  beta?: number;
  gamma?: number;
  damping?: Record<string, unknown>;
  groundMotions?: Array<Record<string, unknown>>;
  sampleCount: number;
};

export type TimeHistoryResult = {
  meta: TimeHistoryResultMeta;
  time: number[];
  displacements: Record<string, number[]>;
  velocities: Record<string, number[]>;
  accelerations: Record<string, number[]>;
};

export type ResultExports = {
  "result.json": string;
  "displacements.csv": string;
  "reactions.csv": string;
  "member_section_forces.csv": string;
  "eigen_modes.csv": string;
  "influence_lines.csv": string;
  "moving_load.csv"?: string;
};

export type EndForce = {
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
};

export type SectionKey =
  | "project"
  | "nodes"
  | "members"
  | "materials"
  | "sections"
  | "supports"
  | "loadCases"
  | "nodalLoads"
  | "memberLoads"
  | "massCases"
  | "analysisSettings"
  | "results";

export type BottomTab = "results" | "howToRead" | "timeHistory" | "errors" | "warnings" | "logs";
