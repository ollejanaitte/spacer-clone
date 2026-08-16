/**
 * Unified 3D Viewer — Viewer Layer Contract (Wave 1 Lane V-2).
 *
 * The contract that decouples the unified 3D viewer from every data source
 * (ProjectModel, module documents, site-context imports). The viewer consumes
 * only this render model; producers feed it through a viewer-facing adapter
 * (mock for Wave 1, Lane T / Lane B adapters in later waves).
 *
 * Coordinate rule (shared canonical world frame):
 *   X = along (road / bridge axis), Y = transverse, Z = elevation (up), unit = meter.
 * Each layer carries its data in this frame. The viewer applies the single
 * canonical -> render transform owned by Lane V (see renderCoordinate.ts,
 * default = domainToThree convention). CRS conversion is NOT performed here
 * (Lane T territory); a horizontal CRS identifier is carried as metadata only.
 */

// ---------------------------------------------------------------------------
// Layer kinds (Wave 1 minimum)
// ---------------------------------------------------------------------------

export type UnifiedLayerKind =
  | "terrain"
  | "road"
  | "superstructure"
  | "bearing"
  | "substructure"
  | "existingConditions";

export const UNIFIED_LAYER_KINDS: readonly UnifiedLayerKind[] = [
  "terrain",
  "road",
  "superstructure",
  "bearing",
  "substructure",
  "existingConditions",
];

export const UNIFIED_LAYER_LABELS: Record<UnifiedLayerKind, string> = {
  terrain: "Terrain",
  road: "Road",
  superstructure: "Superstructure",
  bearing: "Bearings",
  substructure: "Substructure",
  existingConditions: "Existing Conditions",
};

/** Lane V-2 contract version. Bump on breaking contract changes. */
export const LAYER_CONTRACT_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Geometry primitives (canonical world frame)
// ---------------------------------------------------------------------------

export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Axis-aligned bounds in the canonical world frame. */
export interface LayerBounds {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

/**
 * Oriented box in the canonical world frame. `size` follows the world axes
 * (x=along, y=transverse, z=height). `yawDeg` rotates around the elevation
 * axis (canonical Z, rendered as three Y). Mock fixtures use yaw = 0.
 */
export interface OrientedBox3D {
  readonly id: string;
  readonly center: Point3D;
  readonly size: { readonly x: number; readonly y: number; readonly z: number };
  readonly yawDeg?: number;
  readonly color?: string;
}

// ---------------------------------------------------------------------------
// Coordinate basis
// ---------------------------------------------------------------------------

export type WorldFrame = "canonical-project" | "site-context-import" | "local-engineering";

export type ElevationConvention = "z-up-tp" | "z-up-ellipsoidal" | "z-up-local";

/**
 * Shared canonical world basis for a unified viewer scene. All layers must be
 * expressed in this frame. CRS identifiers are metadata only; no conversion is
 * performed in the viewer (Lane T owns conversion).
 */
export interface WorldBasis {
  readonly id: string;
  readonly frame: WorldFrame;
  readonly axes: { readonly x: "along"; readonly y: "transverse"; readonly z: "elevation" };
  readonly handedness: "right-handed";
  readonly unit: "m";
  readonly elevationConvention: ElevationConvention;
  /** Optional horizontal CRS identifier (metadata only; e.g. EPSG:6674). */
  readonly horizontalCrs?: { readonly authority: string; readonly identifier: string } | null;
  readonly verticalDatum?: string | null;
  /** Optional world offset to subtract before render (render local origin). */
  readonly renderOrigin?: Point3D | null;
  readonly note?: string;
}

// ---------------------------------------------------------------------------
// Layer metadata
// ---------------------------------------------------------------------------

/** Lane that owns the canonical source of this layer (Conflict Ownership). */
export type OwnerLane = "A" | "B" | "T" | "V" | "U" | "S";

export interface LayerSource {
  readonly lane: OwnerLane;
  readonly moduleId?: string;
  readonly referenceId?: string;
  readonly format?: string;
  readonly revision?: string;
}

export type LayerStatusState = "loading" | "ready" | "empty" | "error";

export interface LayerStatus {
  readonly state: LayerStatusState;
  readonly message?: string;
}

// ---------------------------------------------------------------------------
// Concrete layer payloads (producer -> viewer data shape)
// ---------------------------------------------------------------------------

/** Terrain heightfield in the canonical world frame (row-major heights). */
export interface TerrainLayerData {
  readonly kind: "terrain";
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  /** Canonical world x of the grid origin (column 0). */
  readonly originX: number;
  /** Canonical world y of the grid origin (row 0). */
  readonly originY: number;
  /** heights[row * width + col] — canonical elevation z (m). */
  readonly heights: Float32Array;
  readonly noDataValue?: number;
}

/** Road / alignment surface strip in the canonical world frame. */
export interface RoadLayerData {
  readonly kind: "road";
  /** Centerline samples (canonical frame), ordered by station. */
  readonly alignment: readonly Point3D[];
  /** Full carriageway width (m). */
  readonly width: number;
  readonly halfWidth?: { readonly left: number; readonly right: number };
  readonly surfaceColor?: string;
}

/** Bridge superstructure solids (girders / deck / cross beams). */
export interface SuperstructureLayerData {
  readonly kind: "superstructure";
  readonly girders: readonly OrientedBox3D[];
  readonly deck?: OrientedBox3D | null;
  readonly crossBeams?: readonly OrientedBox3D[];
}

/** Bearings, one oriented box per bearing seat. */
export interface BearingLayerData {
  readonly kind: "bearing";
  readonly bearings: readonly OrientedBox3D[];
}

/** Substructure support (abutment / pier) with column, cap and foundation. */
export interface SubstructureSupport3D {
  readonly id: string;
  readonly supportId: string;
  readonly kind: "abutment" | "pier";
  readonly column: OrientedBox3D;
  readonly cap?: OrientedBox3D | null;
  readonly foundation?: OrientedBox3D | null;
}

export interface SubstructureLayerData {
  readonly kind: "substructure";
  readonly supports: readonly SubstructureSupport3D[];
}

export type ExistingEntityType =
  | "river"
  | "road"
  | "railway"
  | "existingBridge"
  | "building"
  | "pipe"
  | "tunnel";

export type ExistingEntityGeometry =
  | { readonly geometryKind: "polyline"; readonly points: readonly Point3D[] }
  | { readonly geometryKind: "polygon"; readonly points: readonly Point3D[] }
  | { readonly geometryKind: "point"; readonly point: Point3D };

export interface ExistingEntity3D {
  readonly id: string;
  readonly type: ExistingEntityType;
  readonly geometry: ExistingEntityGeometry;
  readonly color?: string;
}

export interface ExistingConditionsLayerData {
  readonly kind: "existingConditions";
  readonly entities: readonly ExistingEntity3D[];
}

export type LayerData =
  | TerrainLayerData
  | RoadLayerData
  | SuperstructureLayerData
  | BearingLayerData
  | SubstructureLayerData
  | ExistingConditionsLayerData;

// ---------------------------------------------------------------------------
// ViewerLayer — the layer contract entry point
// ---------------------------------------------------------------------------

/**
 * A single drawable layer. `kind` is derived from the data payload so the
 * discriminator always agrees. `bounds` is the layer footprint in the
 * canonical world frame (never render-space).
 */
export interface ViewerLayerBase<TData extends LayerData> {
  readonly id: string;
  readonly kind: TData["kind"];
  readonly visible: boolean;
  readonly selectable: boolean;
  readonly bounds: LayerBounds;
  readonly data: TData;
  readonly metadata: Record<string, unknown>;
  readonly properties?: Record<string, unknown>;
  readonly status: LayerStatus;
  readonly source: LayerSource;
}

export type ViewerLayer =
  | ViewerLayerBase<TerrainLayerData>
  | ViewerLayerBase<RoadLayerData>
  | ViewerLayerBase<SuperstructureLayerData>
  | ViewerLayerBase<BearingLayerData>
  | ViewerLayerBase<SubstructureLayerData>
  | ViewerLayerBase<ExistingConditionsLayerData>;

// ---------------------------------------------------------------------------
// Render coordinate transform
// ---------------------------------------------------------------------------

/**
 * Canonical world -> Three.js render transform. Lane V owns the display
 * transform; CRS conversion is explicitly out of scope. The default
 * implementation follows the shared domainToThree convention.
 */
export interface RenderCoordinateTransform {
  readonly name: string;
  readonly apply: (point: Point3D, origin?: Point3D | null) => [number, number, number];
  readonly applyVertices: (
    vertices: Float32Array | readonly number[],
    origin?: Point3D | null,
  ) => Float32Array;
}

// ---------------------------------------------------------------------------
// Unified viewer model
// ---------------------------------------------------------------------------

export type LayerSelection = {
  readonly layerId: string;
  readonly entityId: string;
  readonly label?: string;
} | null;

/** The complete, viewer-facing render model handed to the unified viewer. */
export interface UnifiedViewerModel {
  readonly contractVersion: number;
  readonly id: string;
  readonly worldBasis: WorldBasis;
  readonly renderTransform: RenderCoordinateTransform;
  readonly layers: readonly ViewerLayer[];
  readonly selection?: LayerSelection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Discriminator: extract the layer kind from a concrete data payload. */
export function layerKindOf(data: LayerData): UnifiedLayerKind {
  return data.kind;
}

/** True when the layer is visible AND its data is renderable. */
export function isLayerRenderable(layer: ViewerLayer): boolean {
  return layer.visible && layer.status.state === "ready";
}

/** Derive the canonical-world bounds of a terrain heightfield. */
export function computeTerrainLayerBounds(data: TerrainLayerData): LayerBounds {
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < data.heights.length; i += 1) {
    const z = data.heights[i];
    if (data.noDataValue !== undefined && z === data.noDataValue) continue;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (minZ === Infinity) {
    minZ = 0;
    maxZ = 0;
  }
  return {
    minX: data.originX,
    minY: data.originY,
    maxX: data.originX + (data.width - 1) * data.cellSize,
    maxY: data.originY + (data.height - 1) * data.cellSize,
    minZ,
    maxZ,
  };
}

/** Derive the canonical-world bounds of a road alignment. */
export function computeRoadLayerBounds(data: RoadLayerData): LayerBounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  const leftHalf = data.halfWidth?.left ?? data.width / 2;
  const rightHalf = data.halfWidth?.right ?? data.width / 2;
  for (const p of data.alignment) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y - leftHalf);
    maxY = Math.max(maxY, p.y + rightHalf);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  if (minX === Infinity) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Derive bounds of a set of oriented boxes (superstructure / bearings). */
export function computeBoxListBounds(boxes: readonly OrientedBox3D[]): LayerBounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const box of boxes) {
    const hx = box.size.x / 2;
    const hy = box.size.y / 2;
    const hz = box.size.z / 2;
    minX = Math.min(minX, box.center.x - hx);
    maxX = Math.max(maxX, box.center.x + hx);
    minY = Math.min(minY, box.center.y - hy);
    maxY = Math.max(maxY, box.center.y + hy);
    minZ = Math.min(minZ, box.center.z - hz);
    maxZ = Math.max(maxZ, box.center.z + hz);
  }
  if (minX === Infinity) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Derive bounds of existing-condition entities from their geometry. */
export function computeExistingBounds(entities: readonly ExistingEntity3D[]): LayerBounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  const visit = (p: Point3D) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  };
  for (const entity of entities) {
    const g = entity.geometry;
    if (g.geometryKind === "point") {
      visit(g.point);
    } else {
      for (const p of g.points) visit(p);
    }
  }
  if (minX === Infinity) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Merge bounds; returns the first bounds when only one is provided. */
export function mergeLayerBounds(...bounds: readonly LayerBounds[]): LayerBounds {
  const valid = bounds.filter((b) => b.minX <= b.maxX && b.minY <= b.maxY);
  if (valid.length === 0) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const b of valid) {
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    minZ = Math.min(minZ, b.minZ);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
    maxZ = Math.max(maxZ, b.maxZ);
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Layer bounds for any concrete data payload. */
export function computeLayerBounds(data: LayerData): LayerBounds {
  switch (data.kind) {
    case "terrain":
      return computeTerrainLayerBounds(data);
    case "road":
      return computeRoadLayerBounds(data);
    case "superstructure": {
      const boxes = [...data.girders, ...(data.deck ? [data.deck] : []), ...(data.crossBeams ?? [])];
      return computeBoxListBounds(boxes);
    }
    case "bearing":
      return computeBoxListBounds(data.bearings);
    case "substructure": {
      const boxes: OrientedBox3D[] = [];
      for (const support of data.supports) {
        boxes.push(support.column);
        if (support.cap) boxes.push(support.cap);
        if (support.foundation) boxes.push(support.foundation);
      }
      return computeBoxListBounds(boxes);
    }
    case "existingConditions":
      return computeExistingBounds(data.entities);
  }
}

/** Basic layer factory: derives kind + bounds from the payload. */
export function createViewerLayer<TData extends LayerData>(params: {
  readonly id: string;
  readonly data: TData;
  readonly visible?: boolean;
  readonly selectable?: boolean;
  readonly bounds?: LayerBounds;
  readonly metadata?: Record<string, unknown>;
  readonly properties?: Record<string, unknown>;
  readonly status?: LayerStatus;
  readonly source: LayerSource;
}): ViewerLayerBase<TData> {
  return {
    id: params.id,
    kind: params.data.kind,
    visible: params.visible ?? true,
    selectable: params.selectable ?? true,
    bounds: params.bounds ?? computeLayerBounds(params.data),
    data: params.data,
    metadata: params.metadata ?? {},
    properties: params.properties,
    status: params.status ?? { state: "ready" },
    source: params.source,
  };
}

/** Default canonical world basis used by Wave 1 mock fixtures. */
export function createDefaultWorldBasis(): WorldBasis {
  return {
    id: "mock-canonical-project",
    frame: "local-engineering",
    axes: { x: "along", y: "transverse", z: "elevation" },
    handedness: "right-handed",
    unit: "m",
    elevationConvention: "z-up-local",
    renderOrigin: null,
    note: "Wave 1 mock fixture basis. Real CRS is supplied by Lane T / Lane B.",
  };
}