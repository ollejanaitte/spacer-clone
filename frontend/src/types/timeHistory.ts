export type TimeHistoryDampingType =
  | "rayleigh"
  | "modal"
  | "constant"
  | "userMatrix";

export type TimeHistoryDamping = {
  type: TimeHistoryDampingType;
  mode1Frequency?: number | null;
  mode2Frequency?: number | null;
  targetDampingRatio1?: number;
  targetDampingRatio2?: number;
};

export type TimeHistoryInitialConditions = {
  displacement?: "zero" | "fromStatic";
  velocity?: "zero" | "fromStatic";
};

export type TimeHistoryMethod = "newmark-beta";

export type TimeHistoryAnalysisSettings = {
  enabled?: boolean;
  method: TimeHistoryMethod;
  timeStep: number;
  duration: number;
  beta: number;
  gamma: number;
  damping?: TimeHistoryDamping;
  initialConditions?: TimeHistoryInitialConditions;
};

export type GroundMotionDirection = "X" | "Y" | "Z";
export type GroundMotionUnit = "m/s2" | "gal";

export type GroundMotion = {
  id: string;
  name: string;
  direction: GroundMotionDirection;
  timeStep: number;
  duration: number;
  unit: GroundMotionUnit;
  samples: number[];
};

export type EnvelopeExtremum = {
  value: number;
  time: number;
};

export type EnvelopePair = {
  max: EnvelopeExtremum;
  min: EnvelopeExtremum;
};

export type TimeHistoryResultMemberForces = {
  N?: number[];
  Vy?: number[];
  Vz?: number[];
  Mx?: number[];
  My?: number[];
  Mz?: number[];
};

export type TimeHistoryResultMeta = {
  analysisId: string;
  status: "success" | "warning" | "failed";
  method: string;
  timeStep: number;
  duration: number;
  beta: number;
  gamma: number;
  damping: Record<string, unknown>;
  groundMotions: Array<Record<string, string>>;
  sampleCount: number;
};

export type TimeHistoryResult = {
  meta?: TimeHistoryResultMeta;
  time?: number[];
  displacements?: Record<string, number[]>;
  velocities?: Record<string, number[]>;
  accelerations?: Record<string, number[]>;
  memberForces?: Record<string, TimeHistoryResultMemberForces>;
  reactions?: Record<string, number[]>;
  envelopes?: Record<string, unknown>;
};

export type TimeHistoryAnalysisResults = {
  timeHistory?: TimeHistoryResult;
};