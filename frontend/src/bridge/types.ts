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


/**
 * Step4 で UI に表示する名称。
 *  - traffic  : 走行ライン(活荷重が実際に走るライン。主桁上に設定する)
 *  - load     : 荷重ライン(任意の位置に追加荷重を置くためのライン)
 *  - reference: 参照ライン(寸法・位置確認用の補助ライン)
 */
export const BRIDGE_LINE_TYPE_LABELS: Record<BridgeLineType, string> = {
  traffic: "走行ライン",
  load: "荷重ライン",
  reference: "参照ライン",
};

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



/**
 * Step1: 道路中心線形 (optional、後方互換)。
 *  - inputMode = 'simple' : 橋長一本の直線。
 *  - inputMode = 'csv'    : CSV から読み込んだ折れ線中心線。
 * points は station, x, y, z を持つ。station は累加距離で自動計算してもよい。
 */
export type RoadAlignmentPoint = {
  station: number;
  x: number;
  y: number;
  z: number;
};
export type RoadAlignmentInputMode = "simple" | "csv";
export type RoadAlignment = {
  inputMode: RoadAlignmentInputMode;
  bridgeLength: number;
  points: RoadAlignmentPoint[];
};

/**
 * Step2: 支点・橋脚位置 (optional、後方互換)。
 *  - inputMode = 'simple'  : 支間長から A1 / P1.. / A2 を自動生成。
 *  - inputMode = 'station' : 中心線形 station 位置で A1 / P1.. / A2 を指定。
 * supports は station 昇順。
 * spans は supports から自動算出(length は隣接 station 差)。
 */
export type SupportPointKind = "abutment" | "pier";
export type SupportPoint = {
  name: string;
  type: SupportPointKind;
  station: number;
};
export type SpanLayoutSegment = {
  from: string;
  to: string;
  length: number;
};
export type SpanLayoutInputMode = "simple" | "station";
export type SpanLayout = {
  inputMode: SpanLayoutInputMode;
  supports: SupportPoint[];
  spans: SpanLayoutSegment[];
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
  /** Step1 道路中心線形 (optional, 既存データの後方互換) */
  roadAlignment?: RoadAlignment;
  /** Step2 支点・橋脚位置 (optional, 既存データの後方互換) */
  spanLayout?: SpanLayout;
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
