// Phase C1 (I01) 下部工 データモデル
// P01 Freeze（構造形式）と P02 Freeze（配置方式）に準拠。
// 座標系: x-longitudinal-y-transverse-z-up（右手系 Z-up）。

export const SUBSTRUCTURE_SCHEMA_VERSION = "0.2.0";
export const SUBSTRUCTURE_COORDINATE_SYSTEM = "x-longitudinal-y-transverse-z-up";
export const SUBSTRUCTURE_UNIT_SYSTEM = "si"; // length m, angle rad, force kN

export type SupportType = "pier" | "abutment";
export type PierFormType = "single_column_rect" | "wall" | "portal_frame";
export type AbutmentFormType = "inverted_t" | "cantilever_frame";
export type FoundationFormType = "spread" | "piled";
export type PileType = "bored_pile" | "steel_pipe";
export type PlacementSource = "liner" | "direct_xyz";
export type BearingType = "elastomeric" | "pot" | "fixed" | "custom";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** P02 Freeze: 配置方式。PRIMARY=liner, EXCEPTION=direct_xyz。 */
export interface SupportPlacement {
  source: PlacementSource;
  /** PRIMARY: LINER線形+測点 */
  alignmentId?: string;
  station?: number; // m, 線形起点基準
  offset?: number; // m, + = 線形進行方向右側
  /** EXCEPTION: XYZ直接指定 */
  position?: Vec3;
  azimuthRad?: number;
}

/** P02 Freeze: 支点配置スナップショット（LINER算出値・読取専用）。 */
export interface SupportPlacementSnapshot {
  source: PlacementSource;
  position: Vec3;
  tangent: Vec3; // 橋軸方向
  transverse: Vec3; // 橋軸直角方向（skew適用後）
  vertical: Vec3;
  azimuthRad: number;
  skewRad: number;
}

export interface BearingSeat {
  seatId: string;
  position: Vec3;
  dimensions: { w: number; d: number; h: number };
  bearing: { id: string; height: number; type: BearingType };
}

export interface PierColumn {
  id: string;
  width: number; // 橋軸直角幅 m
  depth: number; // 橋軸方向深さ m
  height: number; // 柱高 m
  transverseOffset?: number; // 門型時 柱位置（省略時=0=中心）
}

export interface PortalPierBeam {
  id: string;
  width: number; // 橋軸方向梁幅 m
  depth: number; // 橋軸直角奥行 m
  height: number; // 梁高 m
  spanDirection?: "longitudinal" | "transverse";
}

export interface PierCap {
  id: string;
  width: number; // 橋軸方向梁幅 m
  depth: number; // 橋軸直角奥行 m
  height: number; // 梁高 m
  overhangL: number;
  overhangR: number;
  spanDirection?: "longitudinal" | "transverse";
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

export interface PierData {
  id: string;
  formType: PierFormType;
  /** 単柱矩形 / 壁式: 柱 */
  column?: PierColumn;
  /** 単柱矩形 / 壁式: 梁 */
  cap?: PierCap;
  /** 門型: 2本柱 */
  columns?: PierColumn[];
  /** 門型: 横梁 */
  beam?: PortalPierBeam;
  footing: Footing;
  pileGroup?: PileGroup | null;
}

export interface WingWall {
  id: string;
  length: number;
  height: number;
  thickness: number;
}

export interface AbutmentData {
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
  footing: Footing;
  pileGroup?: PileGroup | null;
}

export interface Support {
  supportId: string;
  supportType: SupportType;
  placement: SupportPlacement;
  skewRad: number; // rad, +Z軸回り CCW 正（P02: normal→transverse）
  zOverride?: number; // Z 手動 override（P02: 縦断優先、override可）
  placementSnapshot?: SupportPlacementSnapshot; // LINER算出値（読取専用）
  bearingSeats: BearingSeat[];
  pier?: PierData;
  abutment?: AbutmentData;
}

export interface AlignmentRef {
  alignmentId: string;
  originStation: number;
  totalLength: number;
}

export interface SubstructureProject {
  schemaVersion: string;
  projectId: string;
  bridgeId?: string;
  source: string;
  coordinateSystem: string;
  unitSystem: string;
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