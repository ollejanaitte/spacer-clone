// 下部工計画・3Dモデリングツール プロトタイプ データモデル
// 区分: PROPOSED（今回提案）。座標系規約は spacer-clone に合わせ x-longitudinal-y-transverse-z-up。

export const SCHEMA_VERSION = "0.1.0";
export const COORDINATE_SYSTEM = "x-longitudinal-y-transverse-z-up";
export const UNIT_SYSTEM = "si"; // length m, angle deg, force kN

export type SupportType = "pier" | "abutment";
export type PierFormType = "single_column_rect";
export type AbutmentFormType = "inverted_t";
export type BearingType = "elastomeric" | "pot" | "fixed" | "custom";
export type PileType = "bored_pile";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BearingSeat {
  seatId: string;
  position: Vec3;
  dimensions: { w: number; d: number; h: number };
  bearing: {
    id: string;
    height: number;
    type: BearingType;
  };
}

export interface PierColumn {
  id: string;
  width: number; // 橋軸直角幅 m
  depth: number; // 橋軸方向奥行 m
  height: number; // 柱高 m
}

export interface PierCap {
  id: string;
  width: number; // 橋軸方向梁幅 m
  depth: number; // 橋軸直角奥行 m
  height: number; // 梁高 m
  overhangL: number;
  overhangR: number;
}

export interface Footing {
  id: string;
  length: number; // 橋軸方向長 m
  width: number; // 橋軸直角幅 m
  thickness: number;
  topElevation: number;
}

export interface PileGroup {
  id: string;
  pileType: PileType;
  diameter: number;
  length: number;
  pileCount: number;
  spacing: { x: number; y: number };
}

export interface Pier {
  id: string;
  formType: PierFormType;
  column: PierColumn;
  cap: PierCap;
  footing: Footing;
  piles: PileGroup | null;
}

export interface WingWall {
  id: string;
  length: number;
  height: number;
  thickness: number;
}

export interface Abutment {
  id: string;
  formType: AbutmentFormType;
  backwall: {
    id: string;
    height: number;
    thickness: number;
    width: number;
    seatElevation: number;
  };
  wingWallL: WingWall;
  wingWallR: WingWall;
}

export interface Support {
  supportId: string;
  supportType: SupportType;
  longitudinalAxis: Vec3;
  transverseAxis: Vec3;
  verticalAxis: Vec3;
  skewAngle: number; // deg, +Z軸回り CCW 正
  position: Vec3;
  bearingSeats: BearingSeat[];
  pier?: Pier;
  abutment?: Abutment;
}

export interface AlignmentRef {
  alignmentId: string;
  originStation: number;
  totalLength: number;
}

export interface Project {
  schemaVersion: string;
  projectId: string;
  bridgeId?: string;
  name: string;
  source: string;
  coordinateSystem: string;
  unitSystem: string;
  origin: Vec3;
  alignmentRefs: AlignmentRef[];
  supports: Support[];
  metadata: {
    sourceApplication: string;
    sourceVersion: string;
    sourceRevision: string;
    createdAt: string;
    updatedAt: string;
  };
}
