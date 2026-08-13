/**
 * Integrated 3D Scene Contract (Phase 8-01 FROZEN / Phase 8-02 WP-A).
 *
 * The CIM / 統合3D scene is DERIVED deterministically from each module's
 * canonical source (never a second source of truth). Every rendered entity
 * carries a CimEntityMetadata so selection can trace back to the source
 * module / source entity / stable id / coordinate context.
 */

import type * as THREE from "three";

/** The 18 scene layers (Phase 8-01 FROZEN). */
export type CimLayerId =
  | "terrain"
  | "existing"
  | "roadPavement"
  | "bridgeLayout"
  | "superstructure"
  | "substructure"
  | "foundation"
  | "bearing"
  | "femNodes"
  | "femMembers"
  | "supports"
  | "springs"
  | "loads"
  | "deformed"
  | "reaction"
  | "result"
  | "labels"
  | "reference";

export const CIM_LAYER_IDS: readonly CimLayerId[] = [
  "terrain",
  "existing",
  "roadPavement",
  "bridgeLayout",
  "superstructure",
  "substructure",
  "foundation",
  "bearing",
  "femNodes",
  "femMembers",
  "supports",
  "springs",
  "loads",
  "deformed",
  "reaction",
  "result",
  "labels",
  "reference",
];

export const CIM_LAYER_LABELS: Record<CimLayerId, string> = {
  terrain: "地形",
  existing: "既設構造物",
  roadPavement: "道路面（Road CIM）",
  bridgeLayout: "橋梁配置",
  superstructure: "上部工",
  substructure: "下部工",
  foundation: "基礎",
  bearing: "支承",
  femNodes: "FEM節点",
  femMembers: "FEM部材",
  supports: "支持",
  springs: "ばね",
  loads: "荷重",
  deformed: "変形",
  reaction: "反力",
  result: "断面力（N/Q/M/T）",
  labels: "ラベル",
  reference: "参考",
};

export type CimLayerState = Record<CimLayerId, boolean>;

export function defaultCimLayerState(): CimLayerState {
  return {
    terrain: true,
    existing: true,
    roadPavement: true,
    bridgeLayout: true,
    superstructure: true,
    substructure: true,
    foundation: true,
    bearing: true,
    femNodes: false,
    femMembers: true,
    supports: true,
    springs: false,
    loads: false,
    deformed: false,
    reaction: false,
    result: false,
    labels: true,
    reference: true,
  };
}

export interface CimEntityMetadata {
  /** The source module / layer that owns this entity. */
  readonly sourceModule: CimLayerId;
  /** Id inside the source document (supportId / spanId / partId / entityId / nodeId ...). */
  readonly sourceEntityId: string;
  /** Scene-unique stable id (e.g. sub:{supportId}-{PART}-NN). */
  readonly stableId: string;
  /** Coordinate context, e.g. "world" or "world/road:{alignmentId}". */
  readonly coordinateContext: string;
  readonly label?: string;
  readonly meta?: Record<string, unknown>;
}

export interface CimLayerBuildResult {
  readonly group: THREE.Group;
  readonly metadata: CimEntityMetadata[];
}

export interface Integrated3DScene {
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
  readonly layers: Partial<Record<CimLayerId, THREE.Group>>;
  readonly metadata: readonly CimEntityMetadata[];
  readonly bounds: THREE.Box3 | null;
  readonly regeneratedFrom: readonly { module: string; checksum?: string }[];
}

/** Attach CIM metadata to a Three object for selection tracing. */
export function attachCimMetadata(
  object: THREE.Object3D,
  metadata: CimEntityMetadata,
): THREE.Object3D {
  object.userData.cimMetadata = metadata;
  object.userData.stableId = metadata.stableId;
  return object;
}

/** Read the CIM metadata attached to an object (or any of its parents). */
export function resolveCimMetadata(object: THREE.Object3D | null): CimEntityMetadata | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const meta = current.userData?.cimMetadata as CimEntityMetadata | undefined;
    if (meta) {
      return meta;
    }
    current = current.parent;
  }
  return null;
}

export function collectLayerMetadata(
  layers: Partial<Record<CimLayerId, THREE.Group>>,
  metadata: readonly CimEntityMetadata[],
): readonly CimEntityMetadata[] {
  return metadata;
}

export function mergeBounds(...boxes: (THREE.Box3 | null)[]): THREE.Box3 | null {
  const valid = boxes.filter((box): box is THREE.Box3 => box !== null && !box.isEmpty());
  if (valid.length === 0) {
    return null;
  }
  const merged = valid[0].clone();
  for (let i = 1; i < valid.length; i += 1) {
    merged.union(valid[i]);
  }
  return merged;
}
