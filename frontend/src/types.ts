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

export type AnalysisSettings = {
  analysisType: "linear_static";
  includeShearDeformation: false;
  largeDisplacement: false;
  tolerance: number;
};

export type ProjectModel = {
  project: ProjectInfo;
  nodes: NodeItem[];
  materials: Material[];
  sections: Section[];
  members: Member[];
  supports: Support[];
  loadCases: LoadCase[];
  nodalLoads: NodalLoad[];
  memberLoads: MemberLoad[];
  analysisSettings: AnalysisSettings;
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
    analysisType: "linear_static";
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
    solver: "scipy_sparse";
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
  warnings: StructuredMessage[];
  errors: StructuredMessage[];
};

export type ResultExports = {
  "result.json": string;
  "displacements.csv": string;
  "reactions.csv": string;
  "member_end_forces.csv": string;
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
  | "analysisSettings"
  | "results";

export type BottomTab = "results" | "errors" | "warnings" | "logs";
