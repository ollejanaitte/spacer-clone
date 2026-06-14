// Bridge Domain Model — frontend types (mirror backend/engine/bridge_model.py)
export type CrossSection = {
  lane_count: number;
  lane_width: number;
  median_width: number;
  sidewalk_width: number;
  barrier_width: number;
};

export type Span = {
  index: number;
  length: number;
  offset: number;
};

export type ImpactFactor = {
  value: number;
  auto: boolean;
  formula?: string;
};

export type BridgeLineType = "traffic" | "load" | "reference";

export type BridgeLine = {
  id: string;
  type: BridgeLineType;
  name: string;
  points: [number, number, number][];
};

export type BridgeLoad = {
  id: string;
  type: "self_weight" | "distributed" | "vehicle";
  name: string;
  magnitude: number;
  direction: "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";
  line_id?: string;
  loadCaseId?: string;
};

export type BridgeGenerationSettings = {
  mesh_division: number;
  mesh_density: "coarse" | "standard" | "fine";
  girder_spacing_override?: number;
  materialId?: string;
  sectionId?: string;
};

export type BridgeProject = {
  id: string;
  name: string;
  schemaVersion: "0.1.0";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  crossSection: CrossSection;
  spans: Span[];
  impactFactor: ImpactFactor;
  lines: BridgeLine[];
  loads: BridgeLoad[];
  generationSettings: BridgeGenerationSettings;
  generatedFem?: GeneratedFemModel;
};

export type GeneratedFemModel = {
  source_bridge_id: string;
  generatedAt: string;
  xCount: number;
  yCount: number;
  nodeCount: number;
  memberCount: number;
  supportCount: number;
  loadCount: number;
  summary: {
    totalLength: number;
    girderPositions: number[];
    supports: Array<{ x: number; y: number; nodeId: string }>;
  };
};

export type BridgeFemResponse = {
  summary: GeneratedFemModel;
  fem: import("../types").ProjectModel;
  analysis?: import("../types").AnalysisResult | null;
};

export type ViewerModelPayload = {
  bridge: BridgeProject;
  summary: GeneratedFemModel;
  nodes: number[][];
  edges: number[][];
  lines: number[][][];
  loads: Array<{ nodeIndex: number; fx: number; fy: number; fz: number }>;
};

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
