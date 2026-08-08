import type { BridgeSuperstructureDesignDocument } from "./contracts/bridgeSuperstructureDesignDocument";
import type { PersistedLinerTraceEntry, ProjectLinerMetadata } from "./liner/schema/types";
import type { ApolloBridgeStructureInputDraft } from "./apollo/bridgeStructure/types";

export type ProjectInfo = {
  id: string;
  name: string;
  schemaVersion: "1.0.0";
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type ApolloPhase1Unit2SourceStatus =
  | "licensed_source_pending"
  | "reference_only"
  | "blocked_by_numeric_evidence";

export type ApolloPhase1Unit2ProvisionalStatus = "provisional" | "unverified";

export type ApolloPhase1Unit2Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  active: boolean;
  comment: string;
};

export type ApolloPhase1Unit2MaterialReference = {
  id: string;
  displayName: string;
  category: string;
  sourceStatus: ApolloPhase1Unit2SourceStatus;
  provisionalStatus: ApolloPhase1Unit2ProvisionalStatus;
  active: boolean;
  comment: string;
};

export type ApolloPhase1Unit2Member = {
  id: string;
  label: string;
  nodeI: string;
  nodeJ: string;
  materialRefId: string;
  active: boolean;
  comment: string;
};

export type ApolloPhase1Unit2SupportState = "FREE" | "FIXED" | "UNDEFINED";

export type ApolloPhase1Unit2Support = {
  id: string;
  nodeId: string;
  label: string;
  ux: ApolloPhase1Unit2SupportState;
  uy: ApolloPhase1Unit2SupportState;
  uz: ApolloPhase1Unit2SupportState;
  rx: ApolloPhase1Unit2SupportState;
  ry: ApolloPhase1Unit2SupportState;
  rz: ApolloPhase1Unit2SupportState;
  active: boolean;
  comment: string;
};

export type ApolloPhase1Unit2AuditRecord = {
  id: string;
  timestamp: string;
  action: string;
  entityType: "project" | "node" | "member" | "support" | "material";
  entityId: string | null;
  message: string;
};

export type ApolloPhase1Unit2ProjectMetadata = {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  provisionalStatus: ApolloPhase1Unit2ProvisionalStatus;
  localDraftStatus: "saved" | "dirty";
};

export type ApolloPhase1Unit2Draft = {
  schemaVersion: "2.0.0";
  metadata: ApolloPhase1Unit2ProjectMetadata;
  nodes: ApolloPhase1Unit2Node[];
  materialReferences: ApolloPhase1Unit2MaterialReference[];
  members: ApolloPhase1Unit2Member[];
  supports: ApolloPhase1Unit2Support[];
  audit: ApolloPhase1Unit2AuditRecord[];
};

export type NodeItem = {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
  active?: boolean;
  comment?: string;
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
  active?: boolean;
  comment?: string;
};

export type Support = {
  id?: string;
  nodeId: string;
  label?: string;
  ux: boolean;
  uy: boolean;
  uz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
  active?: boolean;
  comment?: string;
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
  /** Optional Apollo Phase 1-NN unit 2 non-numeric draft payload. */
  apolloPhase1Unit2?: ApolloPhase1Unit2Draft;
  /** Optional AP-DX-01 bridge superstructure design document sidecar (schema 0.1.0). */
  apolloBsdd?: BridgeSuperstructureDesignDocument;
  /** Optional persisted bridge structure input for Visible Vertical Slice 01. */
  apolloBridgeStructureInput?: ApolloBridgeStructureInputDraft;
  /** Optional Phase 3-4 shared superstructure facts sidecar (schema 0.1.0). */
  apolloBridgeProjectSuperstructure?: import("./bridgeProject/types").BridgeProjectSuperstructure;
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
