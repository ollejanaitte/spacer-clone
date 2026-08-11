import type { TerrainMesh } from "./terrain/terrainSurface";
import type { ExistingConditionsDocument, ExistingConditionEntity } from "./existingConditions";
import type { TerrainDocument } from "./terrainModule";

export const TERRAIN_CIM_VERSION = "1.0.0" as const;
export const EXISTING_CIM_VERSION = "1.0.0" as const;

export interface TerrainCimGeometry {
  readonly version: string;
  readonly coordinateContext: {
    readonly coordinateSystem: string;
    readonly projectOrigin: { readonly x: number; readonly y: number; readonly z: number };
    readonly localOrigin: { readonly x: number; readonly y: number; readonly z: number } | null;
    readonly unitSystem: "metric";
    readonly axisConvention: "x-along/y-transverse/z-up";
  };
  readonly surface: {
    readonly vertexCount: number;
    readonly triangleCount: number;
    readonly bounds: { minX: number; minY: number; maxX: number; maxY: number; minZ: number; maxZ: number };
    readonly surfaceReference: string | null;
  };
  readonly source: {
    readonly sourceType: string;
    readonly sourceName: string;
    readonly importedAt: string | null;
  };
}

export function buildTerrainCimGeometry(
  terrainDoc: TerrainDocument,
  mesh: TerrainMesh | null,
  surfaceReference: string | null,
): TerrainCimGeometry {
  return {
    version: TERRAIN_CIM_VERSION,
    coordinateContext: {
      coordinateSystem: terrainDoc.coordinateContext.coordinateSystem,
      projectOrigin: { ...terrainDoc.coordinateContext.projectOrigin },
      localOrigin: terrainDoc.coordinateContext.localOrigin
        ? { ...terrainDoc.coordinateContext.localOrigin }
        : null,
      unitSystem: terrainDoc.coordinateContext.unitSystem,
      axisConvention: terrainDoc.coordinateContext.axisConvention,
    },
    surface: {
      vertexCount: mesh?.vertexCount ?? 0,
      triangleCount: mesh?.triangleCount ?? 0,
      bounds: mesh
        ? { ...mesh.bounds }
        : { minX: 0, minY: 0, maxX: 0, maxY: 0, minZ: 0, maxZ: 0 },
      surfaceReference,
    },
    source: {
      sourceType: terrainDoc.source.sourceType,
      sourceName: terrainDoc.source.sourceName,
      importedAt: terrainDoc.source.importedAt,
    },
  };
}

export interface ExistingCimEntity {
  readonly entityId: string;
  readonly type: string;
  readonly label: string;
  readonly layer: string;
  readonly geometry: { readonly kind: string; readonly pointCount: number };
  readonly coordinateContextId: string;
  readonly metadata: Record<string, unknown>;
}

export interface ExistingConditionsCimGeometry {
  readonly version: string;
  readonly entities: readonly ExistingCimEntity[];
  readonly entityCount: number;
}

export function buildExistingConditionsCimGeometry(
  document: ExistingConditionsDocument,
): ExistingConditionsCimGeometry {
  const entities: ExistingCimEntity[] = document.entities.map((e) => ({
    entityId: e.entityId,
    type: e.type,
    label: e.label,
    layer: e.layer,
    geometry: { kind: e.geometry.kind, pointCount: e.geometry.points.length },
    coordinateContextId: e.coordinateContextId,
    metadata: { ...e.metadata },
  }));
  return {
    version: EXISTING_CIM_VERSION,
    entities,
    entityCount: entities.length,
  };
}

export type { ExistingConditionEntity };
